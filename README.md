# 🎙️ SawtAssist - Arabic Voice Assistant

A browser-based voice assistant that specializes in Saudi Arabic dialect conversations, providing a natural and intuitive chat experience.

## 🧠 Project Overview

SawtAssist is designed specifically for Arabic speakers, with a focus on the Saudi dialect. It provides a seamless voice-based interaction through a clean, modern chat-style interface.

## 🔁 Application Flow

### 1. 🟢 Home Screen

- Clean, minimalist interface with SawtAssist branding
- Simple voice input interface
- Intuitive start conversation button

### 2. 💬 Conversation Mode

- **Input**: One-click voice recording with visual feedback
- **Processing**:
  - Converts speech to Arabic text (Saudi dialect)
  - Processes through AI for contextual understanding
  - Generates natural Arabic responses
- **Output**:
  - Real-time conversation display
  - Natural Arabic speech synthesis
  - Clear visual feedback during recording

### 3. 🛑 Session Control

- Simple "New Chat" option
- Clear session management

## ✨ Core Features

| Feature              | Description                     | Technology                |
| -------------------- | ------------------------------- | ------------------------- |
| 🎤 Voice Input       | Saudi Arabic speech recognition | Google Speech-to-Text     |
| 🧠 AI Processing     | Context-aware Arabic responses  | OpenAI GPT-3.5 Turbo      |
| 🗣️ Voice Output      | Natural Arabic speech synthesis | ElevenLabs TTS            |
| 🧾 Real-time Display | Modern chat interface           | React + Tailwind CSS      |
| 🎯 Language Focus    | Specialized in Saudi dialect    | Custom prompt engineering |
| 🎨 Modern UI         | Clean, responsive design        | Custom dark theme         |

## 🛠️ Technical Stack

### Frontend

- React.js for UI components
- Tailwind CSS for styling
- TypeWriter effect for dynamic text
- Responsive dark theme design

### Backend

- FastAPI (Python)
- RESTful API architecture
- Async request handling

### AI Services

- **ASR**: Google Speech-to-Text
- **NLP**: GPT-3.5-turbo
- **TTS**: ElevenLabs

## 🚀 Getting Started

1. Clone the repository

```bash
git clone [repository-url]
```

2. Start the services using Docker Compose

```bash
docker-compose up --build
```

3. Access the application

```
Frontend: http://localhost:3000
Backend API: http://localhost:8000
```

## 🔑 Environment Variables

Required environment variables for the backend:

```
OPENAI_API_KEY=your_openai_key
ELEVENLABS_API_KEY=your_elevenlabs_key
ELEVENLABS_VOICE_ID=your_voice_id
GOOGLE_APPLICATION_CREDENTIALS=path_to_google_credentials
```

## 📝 License

[Your chosen license]

---

Made with ❤️ for Arabic speakers
