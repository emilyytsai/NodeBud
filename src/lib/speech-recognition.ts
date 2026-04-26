export function createRecognizer(
  onResult: (text: string) => void,
  onError: () => void
) {
  const SR =
    (window as any).webkitSpeechRecognition ?? (window as any).SpeechRecognition;
  if (!SR) { onError(); return null; }

  const r = new SR();
  r.continuous = true;
  r.interimResults = true;
  r.onresult = (e: any) => {
    const text = Array.from(e.results)
      .map((res: any) => res[0].transcript)
      .join(" ");
    onResult(text);
  };
  r.onerror = onError;
  return r;
}
