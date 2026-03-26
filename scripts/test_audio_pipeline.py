"""
Audio Pipeline Test — runs entirely on your laptop (no hardware needed).

Tests the full Jarvis flow using your Mac's microphone:
  1. Listen for voice command (Mac mic)
  2. Speech-to-Text (Groq Whisper — free)
  3. Intent parsing + action decision (Groq Llama 3.3 — free)
  4. Execute action (Slack, GitHub, etc.)
  5. Text-to-Speech response (macOS say — free)
  6. Play response through speaker

Usage:
    python test_audio_pipeline.py              # single command
    python test_audio_pipeline.py --loop       # continuous mode
    python test_audio_pipeline.py --text       # type commands instead of mic

Required env vars:
    GROQ_API_KEY  — for STT (Whisper) + LLM (Llama 3.3). Free at console.groq.com

Optional env vars:
    ANTHROPIC_API_KEY  — use Claude instead of Llama for intent parsing
    OPENAI_API_KEY     — use OpenAI TTS instead of macOS say
    DEEPGRAM_API_KEY   — use Deepgram instead of Groq Whisper for STT
    SLACK_BOT_TOKEN    — for real Slack actions
    GITHUB_TOKEN       — for real GitHub actions (auto-detected from gh CLI)
"""
import json
import os
import sys
import wave
import tempfile
import subprocess

# ─── .env LOADER ─────────────────────────────────────────────────────
def load_env():
    """Load .env file if it exists."""
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, _, value = line.partition("=")
                    os.environ.setdefault(key.strip(), value.strip())

load_env()

# ─── DEPENDENCY CHECK ────────────────────────────────────────────────
MISSING = []
try:
    import pyaudio
except ImportError:
    MISSING.append("pyaudio")
try:
    import requests
except ImportError:
    MISSING.append("requests")

if MISSING:
    print(f"Missing dependencies: {', '.join(MISSING)}")
    print(f"Install with: pip install {' '.join(MISSING)}")
    sys.exit(1)

# Optional imports
try:
    from groq import Groq
    HAS_GROQ = True
except ImportError:
    HAS_GROQ = False

try:
    import anthropic
    HAS_ANTHROPIC = True
except ImportError:
    HAS_ANTHROPIC = False


# ─── CONFIG ───────────────────────────────────────────────────────────
SAMPLE_RATE = 16000
CHANNELS = 1
CHUNK_SIZE = 1024
RECORD_SECONDS = 6
FORMAT = pyaudio.paInt16
TEXT_MODE = "--text" in sys.argv


# ─── STEP 1: RECORD AUDIO FROM MAC MIC ──────────────────────────────
def record_audio(duration: int = RECORD_SECONDS) -> str:
    """Record audio from the default microphone. Returns path to WAV file."""
    if TEXT_MODE:
        return ""

    print(f"\n  [MIC] Listening for {duration} seconds... Speak now!")

    p = pyaudio.PyAudio()
    stream = p.open(
        format=FORMAT,
        channels=CHANNELS,
        rate=SAMPLE_RATE,
        input=True,
        frames_per_buffer=CHUNK_SIZE,
    )

    frames = []
    for _ in range(0, int(SAMPLE_RATE / CHUNK_SIZE * duration)):
        data = stream.read(CHUNK_SIZE, exception_on_overflow=False)
        frames.append(data)

    stream.stop_stream()
    stream.close()
    p.terminate()

    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    wf = wave.open(tmp.name, "wb")
    wf.setnchannels(CHANNELS)
    wf.setsampwidth(p.get_sample_size(FORMAT))
    wf.setframerate(SAMPLE_RATE)
    wf.writeframes(b"".join(frames))
    wf.close()

    print(f"  [MIC] Recorded {duration}s → {tmp.name}")
    return tmp.name


# ─── STEP 2: SPEECH-TO-TEXT ──────────────────────────────────────────
def speech_to_text(audio_path: str) -> str:
    """Convert audio to text. Tries Groq Whisper → Deepgram → manual input."""
    if TEXT_MODE or not audio_path:
        print("  [STT] Text mode — type your command:")
        return input("  > ").strip()

    # Try Groq Whisper (free)
    groq_key = os.environ.get("GROQ_API_KEY")
    if groq_key and HAS_GROQ:
        return _stt_groq(audio_path, groq_key)

    # Try Deepgram
    deepgram_key = os.environ.get("DEEPGRAM_API_KEY")
    if deepgram_key:
        return _stt_deepgram(audio_path, deepgram_key)

    # Fallback: manual input
    print("  [STT] No STT API key found — type what you said:")
    return input("  > ").strip()


def _stt_groq(audio_path: str, api_key: str) -> str:
    """Speech-to-text using Groq's Whisper (free)."""
    print("  [STT] Transcribing with Groq Whisper...")
    client = Groq(api_key=api_key)

    with open(audio_path, "rb") as f:
        transcription = client.audio.transcriptions.create(
            file=(os.path.basename(audio_path), f.read()),
            model="whisper-large-v3",
            language="en",
            response_format="text",
        )

    transcript = transcription.strip()
    print(f'  [STT] Transcript: "{transcript}"')
    return transcript


def _stt_deepgram(audio_path: str, api_key: str) -> str:
    """Speech-to-text using Deepgram."""
    print("  [STT] Transcribing with Deepgram...")

    with open(audio_path, "rb") as f:
        audio_data = f.read()

    response = requests.post(
        "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true",
        headers={"Authorization": f"Token {api_key}", "Content-Type": "audio/wav"},
        data=audio_data,
    )

    if response.status_code != 200:
        print(f"  [STT] Deepgram error: {response.status_code}")
        return ""

    transcript = response.json()["results"]["channels"][0]["alternatives"][0]["transcript"]
    print(f'  [STT] Transcript: "{transcript}"')
    return transcript


# ─── STEP 3: INTENT PARSING (LLM) ───────────────────────────────────
SYSTEM_PROMPT = """You are Jarvis, a voice-activated AI assistant worn on the ear.
The user speaks voice commands. Parse the intent and decide what action to take.

The user's default GitHub owner is "ichetanmittal".

Respond with JSON only (no markdown, no code blocks, just raw JSON):
{
  "intent": "send_slack" | "create_github_issue" | "set_reminder" | "create_event" | "take_note" | "remember" | "search_notes" | "list_github_issues" | "list_github_prs" | "read_slack" | "answer_question" | "unknown",
  "confidence": 0.0-1.0,
  "params": {
    // For send_slack: {"channel": "...", "recipient": "...", "message": "..."}
    // For create_github_issue: {"repo": "owner/repo", "title": "...", "body": "..."}
    // For set_reminder/create_event: {"title": "...", "date": "...", "time": "...", "duration_minutes": 30}
    // For take_note/remember: {"content": "..."}
    // For search_notes: {"query": "..."}
    // For list_github_issues/list_github_prs: {"repo": "owner/repo"}
    // For read_slack: {"channel": "..."}
    // For answer_question: {"question": "..."}
  },
  "spoken_response": "Brief response to speak back to the user (1 sentence). For answer_question: ACTUALLY ANSWER the question here with the real answer, don't say 'I'm checking' or 'let me look that up'. For actions: confirm what was done."
}

IMPORTANT rules for spoken_response:
- For answer_question: ANSWER the question directly. Example: "The weather in Delhi today is likely around 35 degrees celsius and sunny." If you don't know real-time data, say so honestly: "I don't have access to real-time weather data, but Delhi is typically warm this time of year."
- For actions (send_slack, create_github_issue, etc.): Confirm what you're about to do. Example: "Sending a message to John on Slack."
- Keep it to 1-2 sentences max."""


def parse_intent(transcript: str) -> dict:
    """Parse voice command into an actionable intent. Tries Groq → Anthropic."""
    # Try Groq (free)
    groq_key = os.environ.get("GROQ_API_KEY")
    if groq_key and HAS_GROQ:
        return _parse_groq(transcript, groq_key)

    # Try Anthropic
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
    if anthropic_key and HAS_ANTHROPIC:
        return _parse_anthropic(transcript)

    print("  [LLM] No LLM API key found (set GROQ_API_KEY or ANTHROPIC_API_KEY)")
    return {"intent": "unknown", "spoken_response": "I need an API key to understand commands."}


def _parse_groq(transcript: str, api_key: str) -> dict:
    """Parse intent using Groq's Llama 3.3 70B (free)."""
    print("  [LLM] Parsing intent with Groq Llama 3.3...")
    client = Groq(api_key=api_key)

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f'Voice command: "{transcript}"'},
        ],
        max_tokens=300,
        temperature=0.1,
    )

    text = response.choices[0].message.content.strip()
    return _extract_json(text)


def _parse_anthropic(transcript: str) -> dict:
    """Parse intent using Claude."""
    print("  [LLM] Parsing intent with Claude...")
    client = anthropic.Anthropic()

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=300,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": f'Voice command: "{transcript}"'}],
    )

    text = response.content[0].text
    return _extract_json(text)


def _extract_json(text: str) -> dict:
    """Extract JSON from LLM response (handles markdown code blocks)."""
    try:
        if "```" in text:
            # Extract from code block
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            else:
                text = text.split("```")[1].split("```")[0].strip()
        result = json.loads(text)
    except (json.JSONDecodeError, IndexError):
        result = {"intent": "unknown", "spoken_response": "I didn't understand that."}

    print(f"  [LLM] Intent: {result.get('intent')} (confidence: {result.get('confidence', '?')})")
    print(f"  [LLM] Params: {json.dumps(result.get('params', {}), indent=2)}")
    print(f'  [LLM] Response: "{result.get("spoken_response")}"')
    return result


# ─── STEP 4: EXECUTE ACTIONS ────────────────────────────────────────
def execute_action(intent_result: dict) -> bool:
    """Execute the parsed intent via the action router. Returns True if succeeded."""
    from actions.router import route

    intent = intent_result.get("intent", "unknown")
    params = intent_result.get("params", {})

    print(f"  [ACTION] Routing: {intent}")
    result = route(intent, params)

    if result.get("success"):
        print(f"  [ACTION] OK: {result.get('detail', 'Done')}")
        if result.get("dry_run"):
            print(f"  [ACTION] (Dry run — set API token for real execution)")
        return True
    else:
        print(f"  [ACTION] FAILED: {result.get('detail', 'Unknown error')}")
        return False


# ─── STEP 5: TEXT-TO-SPEECH ─────────────────────────────────────────
def text_to_speech(text: str) -> str:
    """Convert text to speech. Uses OpenAI TTS or macOS say."""
    api_key = os.environ.get("OPENAI_API_KEY")

    if api_key:
        print("  [TTS] Generating speech with OpenAI...")
        response = requests.post(
            "https://api.openai.com/v1/audio/speech",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"model": "tts-1", "input": text, "voice": "onyx", "response_format": "mp3"},
        )
        if response.status_code == 200:
            tmp = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
            tmp.write(response.content)
            tmp.close()
            return tmp.name

    # Fallback: macOS built-in TTS (free, no API needed)
    print("  [TTS] Using macOS say...")
    tmp = tempfile.NamedTemporaryFile(suffix=".aiff", delete=False)
    tmp.close()
    subprocess.run(["say", "-o", tmp.name, text], capture_output=True)
    return tmp.name


# ─── STEP 6: PLAY AUDIO ─────────────────────────────────────────────
def play_audio(audio_path: str):
    """Play audio file through speakers."""
    print(f"  [PLAY] Playing response...")
    subprocess.run(["afplay", audio_path], capture_output=True)


# ─── MAIN ────────────────────────────────────────────────────────────
def run_once():
    """Run the pipeline once: listen → understand → act → respond."""
    print("\n" + "=" * 60)
    print("JARVIS EAR — Voice Command Pipeline")
    print("=" * 60)

    # Detect available services
    has_stt = bool(os.environ.get("GROQ_API_KEY") or os.environ.get("DEEPGRAM_API_KEY"))
    has_llm = bool(os.environ.get("GROQ_API_KEY") or os.environ.get("ANTHROPIC_API_KEY"))

    if not has_llm:
        print("\n  ERROR: No LLM API key found.")
        print("  Set GROQ_API_KEY (free at console.groq.com) or ANTHROPIC_API_KEY")
        return

    print(f"  STT:    {'Groq Whisper' if os.environ.get('GROQ_API_KEY') else 'Deepgram' if os.environ.get('DEEPGRAM_API_KEY') else 'Text input'}")
    print(f"  LLM:    {'Groq Llama 3.3' if os.environ.get('GROQ_API_KEY') else 'Claude'}")
    print(f"  TTS:    {'OpenAI' if os.environ.get('OPENAI_API_KEY') else 'macOS say'}")
    print(f"  GitHub: {'Connected' if os.environ.get('GITHUB_TOKEN') or _check_gh_cli() else 'Dry run'}")
    print(f"  Slack:  {'Connected' if os.environ.get('SLACK_BOT_TOKEN') else 'Dry run'}")

    # Step 1: Record
    audio_path = record_audio()

    # Step 2: STT
    transcript = speech_to_text(audio_path)
    if not transcript:
        print("  [SKIP] No speech detected.")
        if audio_path and os.path.exists(audio_path):
            os.unlink(audio_path)
        return

    # Step 3: Parse intent
    intent_result = parse_intent(transcript)

    # Step 4: Execute action
    success = execute_action(intent_result)

    # Step 5 + 6: TTS + Play
    spoken = intent_result.get("spoken_response", "Done.")
    if not success:
        spoken = "Sorry, I couldn't complete that action."
    tts_path = text_to_speech(spoken)
    play_audio(tts_path)

    # Cleanup
    if audio_path and os.path.exists(audio_path):
        os.unlink(audio_path)
    if os.path.exists(tts_path):
        os.unlink(tts_path)

    print(f"\n  Pipeline complete.")


def run_loop():
    """Run continuously — press Ctrl+C to stop."""
    print("\nJARVIS EAR — Continuous Mode (Ctrl+C to stop)\n")
    while True:
        try:
            input("Press Enter to give a command...")
            run_once()
        except KeyboardInterrupt:
            print("\n\nGoodbye!")
            break


def _check_gh_cli() -> bool:
    """Check if gh CLI is authenticated."""
    try:
        result = subprocess.run(["gh", "auth", "token"], capture_output=True, text=True)
        return result.returncode == 0
    except FileNotFoundError:
        return False


if __name__ == "__main__":
    if "--loop" in sys.argv:
        run_loop()
    else:
        run_once()
