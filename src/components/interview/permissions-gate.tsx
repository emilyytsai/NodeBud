"use client";
import { useState } from "react";

export function PermissionsGate({ onGranted }: { onGranted: (s: MediaStream) => void }) {
  const [error, setError] = useState<string | null>(null);

  const requestAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true,
      });
      onGranted(stream);
    } catch {
      setError(
        "Camera/mic access denied. You can still type your answers — click 'Skip CV' below."
      );
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <h2 className="text-2xl font-semibold">Ready your camera</h2>
      <p className="max-w-md text-center text-sm text-muted-foreground">
        We use your webcam in-browser to score your posture and eye contact. Nothing is
        uploaded or recorded.
      </p>
      <button
        onClick={requestAccess}
        className="rounded-md bg-black px-6 py-3 text-white hover:bg-gray-800"
      >
        Enable camera and mic
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <a href="?cv=off" className="text-sm underline text-muted-foreground">
        Skip CV — type my answers instead
      </a>
    </div>
  );
}
