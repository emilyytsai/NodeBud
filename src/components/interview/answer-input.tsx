"use client";
import { useEffect, useRef, useState } from "react";
import { createRecognizer } from "@/lib/speech-recognition";

interface AnswerInputProps {
  onSubmit: (transcript: string) => void;
  disabled?: boolean;
}

export function AnswerInput({ onSubmit, disabled }: AnswerInputProps) {
  const [transcript, setTranscript] = useState("");
  const [micActive, setMicActive] = useState(false);
  const [micSupported, setMicSupported] = useState(true);
  const recognizerRef = useRef<any>(null);

  useEffect(() => {
    const SR = (window as any).webkitSpeechRecognition ?? (window as any).SpeechRecognition;
    if (!SR) setMicSupported(false);
  }, []);

  const toggleMic = () => {
    if (micActive) {
      recognizerRef.current?.stop();
      recognizerRef.current = null;
      setMicActive(false);
      return;
    }
    const r = createRecognizer(
      (text) => setTranscript(text),
      () => { setMicActive(false); setMicSupported(false); }
    );
    if (!r) { setMicSupported(false); return; }
    recognizerRef.current = r;
    r.start();
    setMicActive(true);
  };

  const handleSubmit = () => {
    if (micActive) {
      recognizerRef.current?.stop();
      recognizerRef.current = null;
      setMicActive(false);
    }
    onSubmit(transcript);
    setTranscript("");
  };

  return (
    <div className="space-y-3">
      <textarea
        className="glass-input w-full rounded-xl border border-white/20 p-3 text-amber-100 placeholder:text-gray-500 resize-none min-h-[100px] focus:outline-none focus:border-amber-300/50"
        placeholder={micActive ? "Listening… speak your answer" : "Type your answer or use the mic"}
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        disabled={disabled}
      />
      <div className="flex gap-2">
        {micSupported && (
          <button
            onClick={toggleMic}
            disabled={disabled}
            className={`px-4 py-2 rounded-lg text-sm border transition ${
              micActive
                ? "bg-red-500/20 border-red-400/50 text-red-300"
                : "border-white/20 text-amber-100 hover:bg-white/10"
            }`}
          >
            {micActive ? "⏹ Stop mic" : "🎤 Mic"}
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={disabled || !transcript.trim()}
          className="btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Submit Answer
        </button>
      </div>
    </div>
  );
}
