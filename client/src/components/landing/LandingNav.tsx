interface LandingNavProps {
  onSignIn: () => void;
  signingIn: boolean;
}

const LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#boxes", label: "Boxes" },
  { href: "#for-teams", label: "For teams" },
];

export default function LandingNav({ onSignIn, signingIn }: LandingNavProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <a href="#top" className="flex items-center gap-2.5">
          <span className="text-2xl">🎨</span>
          <span className="text-lg font-bold tracking-tight text-white">AI Canva</span>
        </a>

        <nav className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-slate-300 transition hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={onSignIn}
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-300 transition hover:text-white"
          >
            Sign in
          </button>
          <button
            onClick={onSignIn}
            disabled={signingIn}
            className="rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:opacity-90 disabled:opacity-60"
          >
            {signingIn ? "Connecting…" : "Get started"}
          </button>
        </div>
      </div>
    </header>
  );
}
