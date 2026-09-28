export default function LandingFooter() {
  return (
    <footer className="border-t border-white/10 bg-slate-950/60 py-8">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-6 px-5 md:grid-cols-[1.2fr_1.5fr_1.5fr_1.3fr] md:gap-8">

        {/* SecureFlow */}
        <div className="flex items-center">
  <img
    src="/src/assets/secureflow-logo.png"
    alt="SecureFlow"
    className="h-20 w-32 object-contain"
  />
</div>

        {/* Navigation */}
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-slate-400">
          <a
            href="#how-it-works"
            className="whitespace-nowrap transition hover:text-white"
          >
            How it works
          </a>

          <a
            href="#features"
            className="whitespace-nowrap transition hover:text-white"
          >
            Features
          </a>

          <a
            href="#boxes"
            className="whitespace-nowrap transition hover:text-white"
          >
            Boxes
          </a>

          <a
            href="#for-teams"
            className="whitespace-nowrap transition hover:text-white"
          >
            For teams
          </a>
        </nav>

        {/* Secured by RMIT & Microsoft */}
        <div className="flex items-center justify-center gap-3 whitespace-nowrap">
          <span className="text-sm text-slate-400">
            Secured by
          </span>

          <img
            src="/src/assets/RMIT-logo.png"
            alt="RMIT"
            className="h-9 w-auto object-contain"
          />

          <span className="text-sm text-slate-400">
            &
          </span>

          <img
            src="/src/assets/microsoft-logo.png"
            alt="Microsoft"
            className="h-9 w-auto object-contain"
          />
        </div>

        {/* Copyright */}
        <p className="text-center text-xs leading-5 text-slate-500 md:text-left">
          © {new Date().getFullYear()} SecureFlow · Built with React,
          Firebase & Ollama
        </p>

      </div>
    </footer>
  );
}