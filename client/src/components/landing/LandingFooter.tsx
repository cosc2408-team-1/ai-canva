export default function LandingFooter() {
  return (
    <footer className="border-t border-white/10 bg-slate-950/60 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-5 md:flex-row">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">🎨</span>
          <span className="text-base font-bold text-white">AI Canva</span>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
          <a href="#how-it-works" className="transition hover:text-white">How it works</a>
          <a href="#features" className="transition hover:text-white">Features</a>
          <a href="#boxes" className="transition hover:text-white">Boxes</a>
          <a href="#for-teams" className="transition hover:text-white">For teams</a>
        </nav>

        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} AI Canva · Built with React, Firebase & Ollama
        </p>
      </div>
    </footer>
  );
}
