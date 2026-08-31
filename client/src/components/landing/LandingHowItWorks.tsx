import Reveal from "./Reveal.js";

const STEPS = [
  {
    icon: "🧩",
    title: "Place boxes",
    body: "Drop Idea, Research, PRD, Code and more onto a canvas. Each box is one focused AI step with a clear input and output.",
  },
  {
    icon: "🔗",
    title: "Connect them",
    body: "Draw edges to chain boxes into a pipeline. Content flows box-to-box, and prompts reference upstream outputs by name.",
  },
  {
    icon: "⚡",
    title: "Run the AI",
    body: "Hit run and watch research become a PRD, then a dev plan, then a working React prototype — previewed right in the box.",
  },
];

export default function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-white/5 py-20">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            How it works
          </h2>
          <p className="mt-3 text-slate-400">
            No code required to start. Build a visual pipeline in three steps.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 120}>
              <div className="h-full rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-white/20 hover:bg-white/[0.07]">
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{step.icon}</span>
                  <span className="text-sm font-bold text-slate-500">0{i + 1}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
