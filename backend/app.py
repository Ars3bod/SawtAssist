from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from openai import OpenAI
import uuid
import os
from datetime import datetime
from elevenlabs import generate, set_api_key
import json
from google.cloud import speech_v1
from pydub import AudioSegment
import io
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI()

# Constants for storage paths
STORAGE_DIR = os.path.join(os.getcwd(), "storage")
AUDIO_DIR = os.path.join(STORAGE_DIR, "audio")
TRANSCRIPT_DIR = os.path.join(STORAGE_DIR, "transcripts")

# Create directories if they don't exist
for dir_path in [
    os.path.join(AUDIO_DIR, "temp"),
    os.path.join(AUDIO_DIR, "user_messages"),
    os.path.join(AUDIO_DIR, "assistant_responses"),
    os.path.join(TRANSCRIPT_DIR, "temp"),
    os.path.join(TRANSCRIPT_DIR, "user_messages"),
    os.path.join(TRANSCRIPT_DIR, "assistant_responses"),
]:
    os.makedirs(dir_path, exist_ok=True)

# Allow frontend connection (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Google Cloud Speech client
speech_client = speech_v1.SpeechClient()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Set ElevenLabs API key
set_api_key(os.getenv("ELEVENLABS_API_KEY"))

def get_timestamp():
    """Generate a formatted timestamp for file names"""
    return datetime.now().strftime("%Y%m%d_%H%M%S")

def save_file_with_metadata(content, directory, prefix, metadata=None):
    """Save a file with its metadata"""
    timestamp = get_timestamp()
    file_id = str(uuid.uuid4())[:8]
    base_name = f"{prefix}_{timestamp}_{file_id}"
    
    # Save the main file
    file_path = os.path.join(directory, f"{base_name}.txt")
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    
    # Save metadata if provided
    if metadata:
        metadata_path = os.path.join(directory, f"{base_name}_metadata.json")
        with open(metadata_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
    
    return base_name

def cleanup_old_files(directory, max_age_days=7):
    """Clean up files older than max_age_days"""
    current_time = datetime.now()
    for root, _, files in os.walk(directory):
        for file in files:
            file_path = os.path.join(root, file)
            file_age = datetime.fromtimestamp(os.path.getctime(file_path))
            if (current_time - file_age).days > max_age_days:
                os.remove(file_path)

def convert_audio_to_wav(audio_content):
    """Convert audio content to WAV format with required settings"""
    audio = AudioSegment.from_file(io.BytesIO(audio_content))
    audio = audio.set_channels(1)  # Mono
    audio = audio.set_frame_rate(16000)  # 16kHz
    audio = audio.set_sample_width(2)  # 16-bit
    
    output = io.BytesIO()
    audio.export(output, format="wav", parameters=["-acodec", "pcm_s16le"])
    return output.getvalue()

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/ask")
async def ask(file: UploadFile = File(...)):
    timestamp = get_timestamp()
    session_id = str(uuid.uuid4())[:8]
    
    # Temporary paths for processing
    temp_audio_path = os.path.join(AUDIO_DIR, "temp", f"input_{timestamp}_{session_id}.wav")
    
    try:
        # Read and convert audio file
        audio_content = await file.read()
        wav_content = convert_audio_to_wav(audio_content)
        
        # Save user's audio
        with open(temp_audio_path, "wb") as f:
            f.write(wav_content)

        # Configure audio and recognition settings
        audio = speech_v1.RecognitionAudio(content=wav_content)
        config = speech_v1.RecognitionConfig(
            encoding=speech_v1.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=16000,
            language_code="ar-SA",  # Arabic (Saudi Arabia)
            model="default",
            enable_automatic_punctuation=True,
        )

        # Perform the transcription
        response = speech_client.recognize(config=config, audio=audio)
        
        # Extract the transcribed text
        user_input = ""
        for result in response.results:
            user_input += result.alternatives[0].transcript + " "
        
        user_input = user_input.strip()
        
        # Save user's audio and transcript with metadata
        user_audio_path = os.path.join(AUDIO_DIR, "user_messages", f"user_{timestamp}_{session_id}.wav")
        os.rename(temp_audio_path, user_audio_path)
        
        user_metadata = {
            "timestamp": timestamp,
            "session_id": session_id,
            "language": "ar-SA",
            "audio_path": user_audio_path
        }
        
        save_file_with_metadata(
            user_input,
            os.path.join(TRANSCRIPT_DIR, "user_messages"),
            "user",
            user_metadata
        )

        # Generate assistant response
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": """You are an Arabic-speaking assistant, specifically using Saudi dialect.
                    Always respond in Arabic using Saudi dialect and expressions.
                    Keep responses natural, friendly, and culturally appropriate for Saudi Arabia.
                    Use common Saudi phrases and expressions when suitable."""
                },
                {"role": "user", "content": user_input}
            ]
        )
        assistant_reply = response.choices[0].message.content
        
        # Save assistant's response with metadata
        assistant_base_name = save_file_with_metadata(
            assistant_reply,
            os.path.join(TRANSCRIPT_DIR, "assistant_responses"),
            "assistant",
            {
                "timestamp": timestamp,
                "session_id": session_id,
                "model": "gpt-3.5-turbo"
            }
        )
        
        # Generate and save assistant's audio response
        reply_audio_path = os.path.join(
            AUDIO_DIR,
            "assistant_responses",
            f"{assistant_base_name}.mp3"
        )
        
        # Generate audio using ElevenLabs
        audio = generate(
            text=assistant_reply,
            voice=os.getenv("ELEVENLABS_VOICE_ID"),
            model="eleven_multilingual_v2",
        )
        
        # Save the audio file
        with open(reply_audio_path, "wb") as f:
            f.write(audio)

        # Clean up old files (files older than 7 days)
        cleanup_old_files(os.path.join(AUDIO_DIR, "temp"))
        cleanup_old_files(os.path.join(TRANSCRIPT_DIR, "temp"))

        # Return response with relative audio URL
        return JSONResponse({
            "user_text": user_input,
            "assistant_text": assistant_reply,
            "audio_url": f"http://localhost:8000/audio/assistant_responses/{os.path.basename(reply_audio_path)}"
        })

    except Exception as e:
        # Clean up temporary files in case of error
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
        raise e

# Mount static file directories
app.mount("/audio", StaticFiles(directory=AUDIO_DIR), name="audio")
