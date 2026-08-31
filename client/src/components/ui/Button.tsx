import type { ButtonHTMLAttributes } from "react";

/**
 * Shared button — the single source of truth for control styling in the app
 * chrome (header, sidebar, canvas tools).
 *
 * Enterprise-clean by design:
 *  - exactly one loud color (indigo `primary`), used sparingly;
 *  - everything else is quiet neutrals (white / slate);
 *  - consistent heights, radii, and a visible keyboard focus ring.
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "xs" | "sm" | "md";

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-indigo-600 text-white border border-indigo-600 shadow-sm " +
    "hover:bg-indigo-500 hover:border-indigo-500",
  secondary:
    "bg-white text-slate-600 border border-slate-200 shadow-sm " +
    "hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900",
  ghost:
    "bg-transparent text-slate-600 border border-transparent " +
    "hover:bg-slate-100 hover:text-slate-900",
  danger:
    "bg-white text-red-600 border border-red-200 " +
    "hover:bg-red-50 hover:border-red-300",
};

/** Pressed / toggled state (e.g. an open panel or active view). */
const ACTIVE: Record<ButtonVariant, string> = {
  primary: "bg-indigo-700 border-indigo-700 text-white hover:bg-indigo-700",
  secondary:
    "bg-slate-900 border-slate-900 text-white " +
    "hover:bg-slate-800 hover:border-slate-800 hover:text-white",
  ghost: "bg-slate-900 border-slate-900 text-white hover:bg-slate-900",
  danger: "bg-red-600 border-red-600 text-white hover:bg-red-600",
};

const SIZE: Record<ButtonSize, string> = {
  xs: "h-7 px-2.5 text-xs gap-1.5 rounded-lg",
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-9 px-4 text-sm gap-2 rounded-lg",
};

const BASE =
  "inline-flex items-center justify-center font-medium whitespace-nowrap " +
  "transition-colors duration-150 select-none cursor-pointer " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Renders the pressed/toggled state (e.g. an open panel). */
  active?: boolean;
}

export function Button({
  variant = "secondary",
  size = "sm",
  active = false,
  className = "",
  type = "button",
  ...rest
}: ButtonProps) {
  const classes = [
    BASE,
    SIZE[size],
    active ? ACTIVE[variant] : VARIANT[variant],
    className,
  ].join(" ");
  return <button type={type} className={classes} {...rest} />;
}