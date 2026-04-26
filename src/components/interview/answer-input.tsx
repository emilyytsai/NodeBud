"use client";
import { useEffect, useRef, useState } from "react";
import { createRecognizer } from "@/lib/speech-recognition";
import { VerbalStats } from "@/lib/scoring/verbal-stats";
import type { VerbalStatsResult } from "@/lib/scoring/verbal-stats";

interface AnswerInputProps {
  onSubmit: (transcript: string, verbalStats: VerbalStatsResult) => void;
  disabled?: boolean;
}

export function AnswerInput({ onSubmit, disabled }: AnswerInputProps) {
  const [transcript, setTranscript] = useState("");
  const [micActive, setMicActive] = useState(false);
  const [micSupported, setMicSupported] = useState(true);
  const [focused, setFocused] = useState(false);

  const recognizerRef = useRef<any>(null);
  const verbalStatsRef = useRef(new VerbalStats());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const SR = (window as any).webkitSpeechRecognition ?? (window as any).SpeechRecognition;
    if (!SR) setMicSupported(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognizerRef.current?.stop();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const stopAudio = () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
    audioContextRef.current = null;
    analyserRef.current = null;
    rafRef.current = null;
  };

  const startAudio = async () => {
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(micStream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioContextRef.current = ctx;
      analyserRef.current = analyser;

      let frameCount = 0;
      const loop = () => {
        rafRef.current = requestAnimationFrame(loop);
        frameCount++;
        if (frameCount % 3 !== 0) return; // throttle to ~10fps
        if (analyserRef.current) {
          verbalStatsRef.current.sampleAudio(analyserRef.current);
        }
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      // AudioContext unavailable — filler words + WPM still work via transcript
    }
  };

  const toggleMic = async () => {
    if (micActive) {
      recognizerRef.current?.stop();
      recognizerRef.current = null;
      setMicActive(false);
      stopAudio();
      return;
    }
    const r = createRecognizer(
      (text) => {
        setTranscript(text);
        verbalStatsRef.current.addInterimResult(text);
      },
      () => {
        setMicActive(false);
        setMicSupported(false);
        stopAudio();
      }
    );
    if (!r) { setMicSupported(false); return; }
    recognizerRef.current = r;
    r.start();
    setMicActive(true);
    await startAudio();
  };

  const handleSubmit = () => {
    if (micActive) {
      recognizerRef.current?.stop();
      recognizerRef.current = null;
      setMicActive(false);
      stopAudio();
    }
    const verbalResult = verbalStatsRef.current.finalize(transcript);
    onSubmit(transcript, verbalResult);
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