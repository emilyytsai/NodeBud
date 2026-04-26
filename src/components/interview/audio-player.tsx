"use client";
import { useCallback, useRef, useState } from "react";

function speakBrowser(text: string, onEnd?: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis) { onEnd?.(); return; }
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 1.0;
  if (onEnd) utt.onend = onEnd;
  window.speechSynthesis.speak(utt);
}

export function useTTS(persona: string, mode: "elevenlabs" | "browser") {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    async (text: string, onEnd?: () => void) => {
      setIsSpeaking(true);
      const done = () => { setIsSpeaking(false); onEnd?.(); };

      if (mode === "browser") {
        speakBrowser(text, done);
        return;
      }

      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, persona }),
        });
        if (!res.ok) throw new Error("TTS failed");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => { done(); URL.revokeObjectURL(url); audioRef.current = null; };
        audio.onerror = () => speakBrowser(text, done);
        await audio.play();
      } catch {
        speakBrowser(text, done);
      }
    },
    [persona, mode]
  );

  return { speak, isSpeaking, stop };
}