"use client";
import { useEffect, type RefObject } from "react";

interface WebcamViewProps {
  stream: MediaStream;
  videoRef: RefObject<HTMLVideoElement | null>;
}

export function WebcamView({ stream, videoRef }: WebcamViewProps) {
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoRef]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="w-full rounded-lg object-cover aspect-video bg-black"
    />
  );
}
