"""
Audio Pipeline Test — runs entirely on your laptop (no hardware needed).

Tests the full Jarvis flow using your Mac's microphone:
  1. Listen for voice command (Mac mic)
  2. Speech-to-Text (Deepgram API)
  3. Intent parsing + action decision (Claude API)
  4. Execute action (Slack, GitHub, etc.)
  5. Text-to-Speech response (OpenAI TTS API)
  6. Play response through speaker

This validates the entire cloud pipeline before any hardware exists.

Usage:
    python test_audio_pipeline.py

Required env vars:
    ANTHROPIC_API_KEY  — for Claude (intent parsing)
    DEEPGRAM_API_KEY   — for speech-to-text

Optional env vars:
    OPENAI_API_KEY     — for TTS (text-to-speech)
    SLACK_BOT_TOKEN    — for Slack actions
    GITHUB_TOKEN       — for GitHub actions
"""
import json
import os
import sys
import wave
import tempfile
import subprocess

# Check dependencies before importing
MISSING = []
try:
    import pyaudio
except ImportError:
    MISSING.append("pyaudio")
try:
    import anthropic
except ImportError:
    MISSING.append("anthropic")
try:
    import requests
except ImportError:
    MISSING.append("requests")

if MISSING:
    print(f"Missing dependencies: {', '.join(MISSING)}")
    print(f"Install with: pip install {' '.join(MISSING)}")
    sys.exit(1)


# ─── CONFIG ───────────────────────────────────────────────────────────
SAMPLE_RATE = 16000
CHANNELS = 1
CHUNK_SIZE = 1024
RECORD_SECONDS = 5  # How long to listen for a command
FORMAT = pyaudio.paInt16


# ─── STEP 1: RECORD AUDIO FROM MAC MIC ──────────────────────────────
def record_audio(duration: int = RECORD_SECONDS) -> str:
    """Record audio from the default microphone. Returns path to WAV file."""
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

    # Save to temp WAV file
    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    wf = wave.open(tmp.name, "wb")
    wf.setnchannels(CHANNELS)
    wf.setsampwidth(p.get_sample_size(FORMAT))
    wf.setframerate(SAMPLE_RATE)
    wf.writeframes(b"".join(frames))
    wf.close()

    print(f"  [MIC] Recorded {duration}s → {tmp.name}")
    return tmp.name


# ─── STEP 2: SPEECH-TO-TEXT (DEEPGRAM) ──────────────────────────────
def speech_to_text_deepgram(audio_path: str) -> str:
    """Send audio to Deepgram API for transcription."""
    api_key = os.environ.get("DEEPGRAM_API_KEY")
    if not api_key:
        print("  [STT] No DEEPGRAM_API_KEY set — using fallback (whisper CLI)")
        return speech_to_text_fallback(audio_path)

    print("  [STT] Sending to Deepgram...")

    with open(audio_path, "rb") as f:
        audio_data = f.read()

    response = requests.post(
        "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true",
        headers={
            "Authorization": f"Token {api_key}",
            "Content-Type": "audio/wav",
        },
        data=audio_data,
    )

    if response.status_code != 200:
        print(f"  [STT] Deepgram error: {response.status_code} {response.text[:200]}")
        return ""

    result = response.json()
    transcript = result["results"]["channels"][0]["alternatives"][0]["transcript"]
    print(f"  [STT] Transcript: \"{transcript}\"")
    return transcript


def speech_to_text_fallback(audio_path: str) -> str:
    """Fallback: use macOS built-in speech recognition or manual input."""
    print("  [STT] Fallback — type what you said (or press Enter to skip):")
    text = input("  > ").strip()
    return text


# ─── STEP 3: INTENT PARSING (CLAUDE) ────────────────────────────────
SYSTEM_PROMPT = """You are Jarvis, a voice-activated AI assistant worn on the ear.
The user speaks voice commands. Parse the intent and decide what action to take.

Respond with JSON only:
{
  "intent": "send_slack" | "create_github_issue" | "set_reminder" | "take_note" | "answer_question" | "unknown",
  "confidence": 0.0-1.0,
  "params": {
    // For send_slack: {"channel": "...", "recipient": "...", "message": "..."}
    // For create_github_issue: {"repo": "...", "title": "...", "body": "..."}
    // For set_reminder: {"time": "...", "message": "..."}
    // For take_note: {"content": "..."}
    // For answer_question: {"question": "..."}
  },
  "spoken_response": "Brief confirmation to speak back to the user (1 sentence)"
}"""


def parse_intent(transcript: str) -> dict:
    """Use Claude to parse the voice command into an actionable intent."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("  [LLM] No ANTHROPIC_API_KEY set — cannot parse intent")
        return {"intent": "unknown", "spoken_response": "I need an API key to work."}

    print("  [LLM] Parsing intent with Claude...")

    client = anthropic.Anthropic()
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=300,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": f"Voice command: \"{transcript}\""}],
    )

    text = response.content[0].text

    # Extract JSON from response
    try:
        # Handle case where Claude wraps in markdown code block
        if "```" in text:
            text = text.split("```json")[-1].split("```")[0].strip()
            if not text:
                text = response.content[0].text.split("```")[1].split("```")[0].strip()
        result = json.loads(text)
    except json.JSONDecodeError:
        result = {"intent": "unknown", "spoken_response": "I didn't understand that."}

    print(f"  [LLM] Intent: {result.get('intent')} (confidence: {result.get('confidence', '?')})")
    print(f"  [LLM] Params: {json.dumps(result.get('params', {}), indent=2)}")
    print(f"  [LLM] Response: \"{result.get('spoken_response')}\"")
    return result


# ─── STEP 4: EXECUTE ACTIONS ────────────────────────────────────────
def execute_action(intent_result: dict) -> bool:
    """Execute the parsed intent. Returns True if action succeeded."""
    intent = intent_result.get("intent", "unknown")
    params = intent_result.get("params", {})

    if intent == "send_slack":
        return action_send_slack(params)
    elif intent == "create_github_issue":
        return action_create_github_issue(params)
    elif intent == "take_note":
        return action_take_note(params)
    elif intent == "set_reminder":
        print(f"  [ACTION] Reminder: {params.get('message')} at {params.get('time')}")
        print(f"  [ACTION] (Not implemented yet — would use calendar API)")
        return True
    elif intent == "answer_question":
        print(f"  [ACTION] Answering: {params.get('question')}")
        print(f"  [ACTION] (Response already in spoken_response)")
        return True
    else:
        print(f"  [ACTION] Unknown intent: {intent}")
        return False


def action_send_slack(params: dict) -> bool:
    """Send a Slack message."""
    token = os.environ.get("SLACK_BOT_TOKEN")
    if not token:
        print(f"  [SLACK] Would send to #{params.get('channel', 'general')}: {params.get('message')}")
        print(f"  [SLACK] (No SLACK_BOT_TOKEN set — dry run)")
        return True

    channel = params.get("channel", "general")
    message = params.get("message", "")
    recipient = params.get("recipient", "")
    if recipient:
        message = f"@{recipient}: {message}"

    response = requests.post(
        "https://slack.com/api/chat.postMessage",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={"channel": channel, "text": message},
    )

    if response.json().get("ok"):
        print(f"  [SLACK] Sent to #{channel}: {message}")
        return True
    else:
        print(f"  [SLACK] Error: {response.json().get('error')}")
        return False


def action_create_github_issue(params: dict) -> bool:
    """Create a GitHub issue."""
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        print(f"  [GITHUB] Would create issue in {params.get('repo')}: {params.get('title')}")
        print(f"  [GITHUB] (No GITHUB_TOKEN set — dry run)")
        return True

    repo = params.get("repo", "")
    response = requests.post(
        f"https://api.github.com/repos/{repo}/issues",
        headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github.v3+json"},
        json={"title": params.get("title", ""), "body": params.get("body", "")},
    )

    if response.status_code == 201:
        url = response.json().get("html_url")
        print(f"  [GITHUB] Created: {url}")
        return True
    else:
        print(f"  [GITHUB] Error: {response.status_code} {response.text[:200]}")
        return False


def action_take_note(params: dict) -> bool:
    """Save a note locally."""
    notes_dir = os.path.join(os.path.dirname(__file__), "..", "notes")
    os.makedirs(notes_dir, exist_ok=True)

    from datetime import datetime
    filename = datetime.now().strftime("%Y%m%d_%H%M%S") + ".txt"
    filepath = os.path.join(notes_dir, filename)

    with open(filepath, "w") as f:
        f.write(params.get("content", ""))

    print(f"  [NOTE] Saved: {filepath}")
    return True


# ─── STEP 5: TEXT-TO-SPEECH ─────────────────────────────────────────
def text_to_speech(text: str) -> str:
    """Convert text to speech. Returns path to audio file."""
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
            print(f"  [TTS] Generated: {tmp.name}")
            return tmp.name

    # Fallback: macOS built-in TTS
    print("  [TTS] Using macOS say command...")
    tmp = tempfile.NamedTemporaryFile(suffix=".aiff", delete=False)
    tmp.close()
    subprocess.run(["say", "-o", tmp.name, text], capture_output=True)
    return tmp.name


# ─── STEP 6: PLAY AUDIO ─────────────────────────────────────────────
def play_audio(audio_path: str):
    """Play audio file through speakers."""
    print(f"  [PLAY] Playing response...")
    subprocess.run(["afplay", audio_path], capture_output=True)


# ─── MAIN LOOP ──────────────────────────────────────────────────────
def run_once():
    """Run the pipeline once: listen → understand → act → respond."""
    print("\n" + "=" * 60)
    print("JARVIS EAR — Audio Pipeline Test")
    print("=" * 60)

    # Step 1: Record
    audio_path = record_audio()

    # Step 2: STT
    transcript = speech_to_text_deepgram(audio_path)
    if not transcript:
        print("  [SKIP] No speech detected.")
        os.unlink(audio_path)
        return

    # Step 3: Parse intent
    intent_result = parse_intent(transcript)

    # Step 4: Execute action
    success = execute_action(intent_result)

    # Step 5: TTS
    spoken = intent_result.get("spoken_response", "Done.")
    if not success:
        spoken = "Sorry, I couldn't complete that action."
    tts_path = text_to_speech(spoken)

    # Step 6: Play
    play_audio(tts_path)

    # Cleanup
    os.unlink(audio_path)
    if os.path.exists(tts_path):
        os.unlink(tts_path)

    print("\n  Pipeline complete.")
    print(f"  Flow: Mic → STT → Claude → Action → TTS → Speaker")


def run_loop():
    """Run continuously — press Ctrl+C to stop."""
    print("\nJARVIS EAR — Continuous Mode")
    print("Press Ctrl+C to stop\n")

    while True:
        try:
            input("Press Enter to give a command (or Ctrl+C to quit)...")
            run_once()
        except KeyboardInterrupt:
            print("\n\nGoodbye!")
            break


if __name__ == "__main__":
    if "--loop" in sys.argv:
        run_loop()
    else:
        run_once()
