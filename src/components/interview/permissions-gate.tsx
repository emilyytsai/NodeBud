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
        "Camera/mic access denied. You can still type your answers - click Skip CV below."
      );
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 p-8">
    <h2 className="text-2xl font-bold text-amber-100">Ready your camera</h2>
    <p className="max-w-md text-center text-sm text-gray-300">
      We use your webcam in-browser to score your posture and eye contact. Nothing is
      uploaded or recorded.
    </p>
      <div className="btn-wrapper">
        <button onClick={requestAccess} className="btn-primary">
          Enable camera and mic
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-300 rounded-md border border-red-400/30 bg-red-500/10 px-4 py-3 text-center max-w-md">
          {error}
        </p>
      )}

      <a href="?cv=off" className="text-sm text-gray-400 hover:text-amber-100 hover:-translate-y-1 transition underline">
        Skip CV - type my answers instead
      </a>
    </div>
  );
}