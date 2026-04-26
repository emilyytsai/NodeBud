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
  const [focused, setFocused] = useState(false);
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
        className="glass-input w-full rounded-xl p-3 text-amber-100 placeholder:text-gray-500 resize-none min-h-[100px] focus:outline-none transition-all duration-200"
        style={{
          border: focused
            ? '2.5px solid rgba(255, 255, 255, 0.8)'
            : '1px solid rgba(255, 255, 255, 0.7)',
        }}
        placeholder={micActive ? "Listening… speak your answer" : "Type your answer or use the mic"}
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled}
      />
      <div className="flex gap-2">
        {micSupported && (
          <button
            onClick={toggleMic}
            disabled={disabled}
            className={`shrink-0 w-16 py-2 rounded-lg text-xs border transition-all duration-200 text-center hover:-translate-y-1 ${
              micActive
                ? "bg-red-500/30 border-red-400/70 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.3)]"
                : "border-white/60 text-amber-100 bg-amber-100/5 hover:bg-amber-100/15 hover:border-amber-100/70 hover:shadow-[0_0_12px_rgba(251,191,36,0.2)]"
            }`}
          >
            {micActive ? (
              <span>⏹ Stop<br />mic</span>
            ) : "🎤 Mic"}
          </button>
        )}
        <div className="btn-wrapper flex-1">
          <button
            onClick={handleSubmit}
            disabled={disabled || !transcript.trim()}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ border: '1px solid rgba(255, 255, 255, 0.4)' }}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}