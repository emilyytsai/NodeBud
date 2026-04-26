export function ThinkingIndicator() {
  return (
    <span className="inline-flex gap-1 items-center">
      <span className="animate-bounce w-1.5 h-1.5 bg-amber-300 rounded-full" style={{ animationDelay: "0ms" }} />
      <span className="animate-bounce w-1.5 h-1.5 bg-amber-300 rounded-full" style={{ animationDelay: "150ms" }} />
      <span className="animate-bounce w-1.5 h-1.5 bg-amber-300 rounded-full" style={{ animationDelay: "300ms" }} />
    </span>
  );
}
