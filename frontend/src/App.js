import { useState, useRef, useEffect } from "react";
import TypewriterComponent from "typewriter-effect";
import logo from "./assets/sawtassist-logo.png";

// Helper function to format timestamps
const formatTime = (date) => {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
};

export default function VoiceAssistant() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [recording, setRecording] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const messagesEndRef = useRef(null);

  // Auto scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startSession = () => {
    setIsSessionActive(true);
    setMessages([
      {
        role: "assistant",
        content: "مرحباً! كيف يمكنني مساعدتك اليوم؟",
        timestamp: new Date(),
        typing: true,
      },
    ]);
  };

  const endSession = () => {
    if (recording) {
      stopRecording();
    }
    setIsSessionActive(false);
    setMessages([]);
    setIsProcessing(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });
        const formData = new FormData();
        formData.append("file", audioBlob, "audio.wav");

        // Prepare conversation history (only user and assistant messages)
        const historyToSend = messages.filter(
          (msg) => msg.role === "user" || msg.role === "assistant"
        );
        formData.append("messages", JSON.stringify(historyToSend));

        // Add user message immediately with timestamp
        setMessages((prev) => [
          ...prev,
          {
            role: "user",
            content: "🎤 جاري معالجة الرسالة...",
            pending: true,
            timestamp: new Date(),
          },
        ]);

        try {
          const response = await fetch("http://localhost:8000/ask", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          // Update user message with transcription and add assistant response
          const transcriptionResponse = await response.json();
          const currentTime = new Date();
          setMessages((prev) => [
            ...prev.slice(0, -1), // Remove pending message
            {
              role: "user",
              content: transcriptionResponse.user_text,
              timestamp: currentTime,
            },
            {
              role: "assistant",
              content: transcriptionResponse.assistant_text,
              timestamp: currentTime,
            },
          ]);

          // Play audio response
          try {
            const audioResponse = await fetch(transcriptionResponse.audio_url);
            if (!audioResponse.ok) {
              throw new Error(`Failed to fetch audio: ${audioResponse.status}`);
            }

            const audioBlob = await audioResponse.blob();
            if (audioBlob.size === 0) {
              throw new Error("Received empty audio blob");
            }

            const audio = new Audio();
            audio.onerror = (e) => {
              console.error("Audio playback error:", e);
              throw new Error("Failed to play audio");
            };

            const audioUrl = URL.createObjectURL(audioBlob);
            audio.src = audioUrl;

            await audio.play();

            // Clean up the URL after playback
            audio.onended = () => {
              URL.revokeObjectURL(audioUrl);
            };
          } catch (audioError) {
            console.error("Audio playback error:", audioError);
            setMessages((prev) => [
              ...prev,
              {
                role: "error",
                content:
                  "عذراً، حدث خطأ في تشغيل الصوت. الرجاء المحاولة مرة أخرى.",
                timestamp: new Date(),
              },
            ]);
          }
        } catch (error) {
          console.error("Error:", error);
          setMessages((prev) => [
            ...prev,
            {
              role: "error",
              content: "عذراً، حدث خطأ. الرجاء المحاولة مرة أخرى.",
              timestamp: new Date(),
            },
          ]);
        }
        setIsProcessing(false);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "error",
          content:
            "Sorry, couldn't access the microphone. Please check permissions.",
          timestamp: new Date(),
        },
      ]);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      // Stop all audio tracks
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
    }
  };

  if (!isSessionActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0D0D0D]">
        <div className="w-full max-w-3xl px-6 text-center space-y-6">
          <div className="flex flex-col items-center justify-center mb-8">
            <img src={logo} alt="SawtAssist Logo" className="h-16 mb-4" />
            <h1 className="text-2xl font-semibold text-white">SawtAssist</h1>
          </div>

          <div className="text-4xl text-white font-light mb-16">
            <TypewriterComponent
              options={{
                strings: ["Hey how can I help ?"],
                autoStart: true,
                loop: false,
              }}
            />
          </div>

          <div className="flex flex-col items-center space-y-8">
            <div className="w-full max-w-2xl bg-[#1A1A1A] rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={startSession}
                  className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-all"
                >
                  <svg
                    className="w-6 h-6 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                </button>
                <span className="text-gray-400">Ex: How to cook pasta</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0D0D0D]">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-800">
        <div className="flex items-center space-x-4">
          <img src={logo} alt="SawtAssist Logo" className="h-8" />
          <h1 className="text-xl font-medium text-white">SawtAssist</h1>
        </div>
        <button onClick={endSession} className="text-gray-400 hover:text-white">
          New Chat
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto pt-6">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`px-4 py-6 ${
                  message.role === "assistant" ? "bg-[#1A1A1A]" : ""
                }`}
              >
                <div className="max-w-3xl mx-auto flex space-x-6">
                  <div className="flex-1 text-white">
                    {message.typing ? (
                      <TypewriterComponent
                        options={{
                          strings: [message.content],
                          autoStart: true,
                          loop: false,
                          delay: 50,
                        }}
                      />
                    ) : (
                      message.content
                    )}
                    <div className="text-xs text-gray-400 mt-2">
                      {message.timestamp && formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Recording Controls */}
        <div className="border-t border-gray-800">
          <div className="max-w-3xl mx-auto p-6">
            <div className="relative">
              {recording && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24">
                    <div className="absolute w-full h-full border-4 border-white rounded-full animate-ping opacity-25"></div>
                    <div className="relative w-full h-full flex items-center justify-center">
                      <div className="w-4 h-4 bg-white rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <div className="absolute bottom-[-2rem] text-white">
                    Speaking...
                  </div>
                </div>
              )}

              <div className="flex justify-center items-center gap-4">
                {!recording ? (
                  <button
                    onClick={startRecording}
                    disabled={isProcessing}
                    className={`p-4 rounded-full transition-all ${
                      isProcessing
                        ? "bg-gray-700 cursor-not-allowed"
                        : "bg-[#2A2A2A] hover:bg-[#3A3A3A]"
                    }`}
                  >
                    <svg
                      className="w-6 h-6 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="22" />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="p-4 rounded-full transition-all bg-red-500 hover:bg-red-600 relative z-100"
                  >
                    <svg
                      className="w-6 h-6 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <rect x="6" y="6" width="12" height="12" rx="1" />
                    </svg>
                  </button>
                )}
              </div>

              {!recording && !isProcessing && (
                <div className="text-center mt-4 text-sm text-gray-400">
                  Click to start speaking
                </div>
              )}
              {isProcessing && (
                <div className="text-center mt-4 text-sm text-gray-400">
                  Processing...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
