import secureflowLogo from "../../assets/secureflow-logo.png";
import rmitLogo from "../../assets/rmit-logo-white.png";
import microsoftLogo from "../../assets/microsoft-logo-white.png";

const NAV_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#boxes", label: "Boxes" },
  { href: "#for-teams", label: "For teams" },
];

export default function LandingFooter() {
  return (
    <footer className="border-t border-white/10 bg-slate-950/60">
      <div className="mx-auto max-w-7xl px-5 pb-8 pt-10">
        {/* Showcase partners, featured in their own band. White versions of
            the full logos so they read on the dark footer. */}
        <div className="flex flex-col items-center gap-3.5">
          <span className="text-xs uppercase tracking-[0.12em] text-slate-400">
            In partnership with
          </span>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            <img src={rmitLogo} alt="RMIT University" className="h-10 w-auto object-contain" />
            <img src={microsoftLogo} alt="Microsoft" className="h-7 w-auto object-contain" />
          </div>
        </div>

        <div className="mb-6 mt-8 border-t border-white/10" />

        {/* Brand, links and copyright. On wide screens: three columns with
            equal-width sides, so the links sit on the page's centre line
            (under the partner logos) whatever the copyright's width.
            Narrower screens stack and centre. */}
        <div className="flex flex-col items-center gap-4 text-center xl:grid xl:grid-cols-[1fr_auto_1fr] xl:gap-7">
          <img src={secureflowLogo} alt="SecureFlow" className="h-10 w-auto xl:justify-self-start" />

          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-400">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="whitespace-nowrap transition hover:text-white">
                {link.label}
              </a>
            ))}
          </nav>

          <p className="text-xs leading-5 text-slate-400 xl:justify-self-end xl:text-right">
            © {new Date().getFullYear()} SecureFlow · Built with React, Firebase &amp; Ollama
          </p>
        </div>
      </div>
    </footer>
  );
}
