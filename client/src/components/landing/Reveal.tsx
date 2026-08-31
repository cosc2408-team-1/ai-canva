import type { ReactNode } from "react";
import { useReveal } from "./useReveal.js";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Stagger delay in ms. */
  delay?: number;
}

/** Wraps a section in a scroll-triggered fade/slide-in. */
export default function Reveal({ children, className = "", delay = 0 }: RevealProps) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={"reveal " + (visible ? "reveal-visible" : "") + " " + className}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
