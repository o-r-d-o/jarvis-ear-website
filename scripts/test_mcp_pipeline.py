"""
Jarvis MCP Pipeline Test — connects to our local MCP server
and lets the LLM automatically discover and call tools.

This replaces the manual action router with MCP tool discovery.

Flow:
  Voice/Text → STT → LLM sees MCP tools → LLM picks the right tool →
  MCP server executes → LLM crafts response → TTS → Speaker

Usage:
    python test_mcp_pipeline.py --text     # type commands
    python test_mcp_pipeline.py            # use microphone
"""
import asyncio
import json
import os
import subprocess
import sys
import tempfile

# Load .env
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            if line.strip() and not line.startswith("#") and "=" in line:
                k, _, v = line.strip().partition("=")
                os.environ.setdefault(k, v)

from groq import Groq
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client
import requests


TEXT_MODE = "--text" in sys.argv
MCP_URL = "http://localhost:8000/mcp/"


async def get_mcp_tools(session: ClientSession) -> list[dict]:
    """Fetch available tools from the MCP server."""
    result = await session.list_tools()
    tools = []
    for tool in result.tools:
        # Convert MCP tool schema to Groq/OpenAI function format
        tools.append({
            "type": "function",
            "function": {
                "name": tool.name,
                "description": tool.description or "",
                "parameters": tool.inputSchema if tool.inputSchema else {"type": "object", "properties": {}},
            },
        })
    return tools


async def call_mcp_tool(session: ClientSession, name: str, args: dict) -> str:
    """Call a tool on the MCP server and return the result."""
    result = await session.call_tool(name, args)
    # Extract text from result
    texts = [c.text for c in result.content if hasattr(c, "text")]
    return "\n".join(texts) if texts else str(result)


def record_audio(duration: int = 6) -> str:
    """Record from mic. Returns path to WAV file."""
    if TEXT_MODE:
        return ""
    import pyaudio
    import wave

    print(f"\n  [MIC] Listening for {duration} seconds... Speak now!")
    p = pyaudio.PyAudio()
    stream = p.open(format=pyaudio.paInt16, channels=1, rate=16000, input=True, frames_per_buffer=1024)
    frames = []
    for _ in range(0, int(16000 / 1024 * duration)):
        frames.append(stream.read(1024, exception_on_overflow=False))
    stream.stop_stream()
    stream.close()
    p.terminate()

    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    wf = wave.open(tmp.name, "wb")
    wf.setnchannels(1)
    wf.setsampwidth(p.get_sample_size(pyaudio.paInt16))
    wf.setframerate(16000)
    wf.writeframes(b"".join(frames))
    wf.close()
    return tmp.name


def speech_to_text(audio_path: str) -> str:
    """Transcribe with Groq Whisper."""
    if TEXT_MODE or not audio_path:
        print("  [STT] Type your command:")
        return input("  > ").strip()

    groq = Groq(api_key=os.environ.get("GROQ_API_KEY"))
    print("  [STT] Transcribing with Groq Whisper...")
    with open(audio_path, "rb") as f:
        result = groq.audio.transcriptions.create(
            file=(os.path.basename(audio_path), f.read()),
            model="whisper-large-v3", language="en", response_format="text",
        )
    transcript = result.strip()
    print(f'  [STT] Transcript: "{transcript}"')
    return transcript


def text_to_speech(text: str):
    """TTS + play."""
    api_key = os.environ.get("OPENAI_API_KEY")
    if api_key:
        print("  [TTS] OpenAI TTS...")
        resp = requests.post(
            "https://api.openai.com/v1/audio/speech",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"model": "tts-1", "input": text, "voice": "onyx", "response_format": "mp3"},
        )
        if resp.status_code == 200:
            tmp = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
            tmp.write(resp.content)
            tmp.close()
            subprocess.run(["afplay", tmp.name], capture_output=True)
            os.unlink(tmp.name)
            return

    print("  [TTS] macOS say...")
    subprocess.run(["say", text], capture_output=True)


async def run_pipeline():
    """Main pipeline: connect to MCP server, get tools, process command."""
    print("\n" + "=" * 60)
    print("JARVIS EAR — MCP Pipeline")
    print("=" * 60)

    # Step 1: Connect to MCP server
    print("\n  [MCP] Connecting to Jarvis MCP Server...")

    async with streamablehttp_client(MCP_URL) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()

            # Step 2: Discover tools
            tools = await get_mcp_tools(session)
            tool_names = [t["function"]["name"] for t in tools]
            print(f"  [MCP] Discovered {len(tools)} tools: {tool_names}")

            # Step 3: Record / input
            audio_path = record_audio()
            transcript = speech_to_text(audio_path)
            if not transcript:
                print("  [SKIP] No input.")
                return
            if audio_path and os.path.exists(audio_path):
                os.unlink(audio_path)

            # Step 4: Send to Groq with available tools
            print("  [LLM] Groq Llama 3.3 with MCP tools...")
            groq = Groq(api_key=os.environ.get("GROQ_API_KEY"))

            messages = [
                {"role": "system", "content": (
                    "You are Jarvis, a voice assistant. Use the available tools to help the user. "
                    "The user's default GitHub owner is 'ichetanmittal'. "
                    "Always respond briefly (1-2 sentences) after completing an action."
                )},
                {"role": "user", "content": transcript},
            ]

            response = groq.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                tools=tools,
                tool_choice="auto",
                max_tokens=300,
            )

            choice = response.choices[0]

            # Step 5: If LLM wants to call a tool, execute via MCP
            if choice.message.tool_calls:
                for tool_call in choice.message.tool_calls:
                    fn_name = tool_call.function.name
                    fn_args = json.loads(tool_call.function.arguments)
                    print(f"  [MCP] Calling tool: {fn_name}({json.dumps(fn_args)})")

                    result = await call_mcp_tool(session, fn_name, fn_args)
                    print(f"  [MCP] Result: {result}")

                    # Send result back to LLM for a spoken response
                    messages.append(choice.message)
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": result,
                    })

                # Get final spoken response
                final = groq.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=messages,
                    max_tokens=100,
                )
                spoken = final.choices[0].message.content
            else:
                spoken = choice.message.content

            print(f'  [JARVIS] "{spoken}"')

            # Step 6: TTS
            text_to_speech(spoken)

    print("\n  Pipeline complete (MCP).")


if __name__ == "__main__":
    asyncio.run(run_pipeline())
