"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteHeader() {
  const pathname = usePathname();
  if (pathname?.startsWith("/interview/")) return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-30 backdrop-blur-md bg-black/30 border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between">
        <Link
          href="/"
          className="text-amber-100 text-sm font-semibold tracking-wide hover:text-white transition-colors"
        >
          NodeBud
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link
            href="/dashboard"
            className="text-gray-300 hover:text-amber-100 transition-colors"
          >
            Sessions
          </Link>
          <Link
            href="/setup"
            className="text-gray-300 hover:text-amber-100 transition-colors"
          >
            New interview
          </Link>
        </nav>
      </div>
    </header>
  );
}
