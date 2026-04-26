"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteHeader() {
  const pathname = usePathname();
  if (pathname?.startsWith("/interview/")) return null;

  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 z-30 w-auto">
      <div
        className="flex items-center gap-6 px-5 py-2.5 rounded-full text-sm"
        style={{
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          background: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
        }}
      >
        <Link
          href="/"
          className="text-amber-100 hover:text-white transition-colors hover:-translate-y-0.5 transition-transform flex items-center"
          aria-label="Home"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </Link>

        <div className="w-px h-4 bg-white/20" />

        <nav className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-gray-300 hover:text-amber-100 transition-colors hover:-translate-y-0.5 transition-transform"
          >
            Sessions
          </Link>
          <Link
            href="/setup"
            className="text-gray-300 hover:text-amber-100 transition-colors hover:-translate-y-0.5 transition-transform"
          >
            New interview
          </Link>
        </nav>
      </div>
    </header>
  );
}