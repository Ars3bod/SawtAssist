import os
from elevenlabs import ElevenLabs

# Initializes ElevenLabs SDK client
client = ElevenLabs(
    api_key=os.getenv("ELEVENLABS_API_KEY")
)

def synthesize_with_elevenlabs(text, output_path="reply.mp3"):
    voice_id = os.getenv("ELEVENLABS_VOICE_ID", "TxGEqnHWrfWFTfGW9XjX")  # Default to "Rachel"
    model_id = "eleven_multilingual_v2"  # Using Eleven Multilingual v2 model

    try:
        audio = client.text_to_speech.convert(
            voice_id=voice_id,
            text=text,
            model_id=model_id
        )
        
        # Convert generator to bytes
        audio_bytes = b''.join(audio)

        with open(output_path, "wb") as f:
            f.write(audio_bytes)

        return output_path
    except Exception as e:
        print("ElevenLabs SDK Error:", str(e))
        raise Exception("TTS generation with ElevenLabs SDK failed")
