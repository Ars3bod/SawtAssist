# playht_tts.py
import os
import requests
import time

PLAYHT_USER_ID = os.getenv("PLAYHT_USER_ID")
PLAYHT_API_KEY = os.getenv("PLAYHT_API_KEY")
VOICE_ID = "s3://voice-cloning-zero-shot/d44b758a-f3e7-4a7c-af50-02451c7101f4/original/manifest.json"  # Replace with preferred voice


def synthesize_with_playht(text, output_path="reply.mp3"):

    url = "https://api.play.ht/api/v2/tts/stream"
    payload = {
        "text": text,
        "voice": VOICE_ID,
        "output_format": "wav",
        "language": "arabic",
        "voice_engine": "PlayDialog"
    }
    headers = {
        "accept": "*/*",
        "content-type": "application/json",
        "AUTHORIZATION": PLAYHT_API_KEY,
        "X-USER-ID": PLAYHT_USER_ID
    }
    response = requests.post(url, json=payload, headers=headers)
    if response.status_code != 200:
     print("Play.ht Error:", response.status_code, response.text)  # <== Add this line
     raise Exception("TTS generation failed")

    # Save the audio content directly from response
    output_path = os.path.join(os.getcwd(), output_path)
    if os.path.exists(output_path):
        os.remove(output_path)

    with open(output_path, "wb") as f:
        f.write(response.content)

    return output_path