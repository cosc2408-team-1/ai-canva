interface LandingCTAProps {
  onSignIn: () => void;
  signingIn: boolean;
}

export default function LandingCTA({ onSignIn, signingIn }: LandingCTAProps) {
  return (
    <section className="border-t border-white/5 py-20">
      <div className="mx-auto max-w-4xl px-5">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-600/20 via-fuchsia-600/10 to-cyan-600/20 p-10 text-center md:p-14">
          <div className="pointer-events-none absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-indigo-500/30 blur-3xl" />
          <h2 className="relative text-3xl font-bold tracking-tight text-white md:text-4xl">
            Start building your first AI pipeline
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-slate-300">
            Sign in free and go from an idea to a working prototype in minutes.
            No setup, no code required to start.
          </p>
          <button
            onClick={onSignIn}
            disabled={signingIn}
            className="relative mt-8 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-slate-900 shadow-xl transition hover:scale-105 disabled:opacity-60"
          >
            {signingIn ? "Connecting…" : "Get started free"}
          </button>
        </div>
      </div>
    </section>
  );
}
