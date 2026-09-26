import { BOX_TYPES } from "../../types.js";
import type { BoxType } from "../../types.js";
import Reveal from "./Reveal.js";

const ORDER: BoxType[] = [
  "idea",
  "research",
  "summarize",
  "prd",
  "devplan",
  "code",
  "ui",
  "stitch",
  "slides",
  "image",
  "cartoon",
];

const SECURITY_BOXES: { type: BoxType; summary: string }[] = [
  { type: "assetmapper", summary: "Lists the assets actually described in your project." },
  { type: "reqelicitor", summary: "Drafts testable security requirements from that evidence." },
  { type: "nistgap", summary: "Flags NIST CSF areas that need evidence or further review." },
  { type: "securityadvisor", summary: "Suggests the next question or box for a person to choose." },
  { type: "threatModeler", summary: "Explores what could go wrong with the listed assets." },
  { type: "riskScorer", summary: "Helps prioritise the threats as a first-pass risk register." },
  { type: "irPlanner", summary: "Drafts a response plan for an incident or a readiness scenario." },
];

export default function LandingBoxes() {
  return (
    <section id="boxes" className="border-t border-white/5 py-20">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            Security work, box by box
          </h2>
          <p className="mt-3 text-slate-400">
            Start with a project description. Connect the boxes you need, then check
            their outputs with the people who know the system.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECURITY_BOXES.map(({ type, summary }, i) => {
            const meta = BOX_TYPES[type];
            return (
              <Reveal key={type} delay={(i % 3) * 80}>
                <div className="flex h-full items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-5">
                  <span className="text-2xl" aria-hidden="true">{meta.icon}</span>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{meta.label}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">{summary}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal className="mt-16 text-center">
          <h3 className="text-xl font-semibold text-white">More than security boxes</h3>
          <p className="mt-2 text-sm text-slate-400">
            Research, design and development boxes can live on the same shared canvas.
          </p>
        </Reveal>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {ORDER.map((type, i) => {
            const meta = BOX_TYPES[type];
            return (
              <Reveal key={type} delay={(i % 4) * 80}>
                <div
                  className="flex h-full flex-col items-start gap-2 rounded-2xl border p-5 transition hover:-translate-y-0.5"
                  style={{
                    backgroundColor: meta.color + "12",
                    borderColor: meta.color + "40",
                  }}
                >
                  <span className="text-2xl">{meta.icon}</span>
                  <span className="text-sm font-semibold" style={{ color: meta.color }}>
                    {meta.label}
                  </span>
                  <span className="text-xs leading-relaxed text-slate-400">
                    {meta.description}
                  </span>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
