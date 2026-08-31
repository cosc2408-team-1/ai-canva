/// <reference types="vite/client" />
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.js";
import { useBoardStore } from "./store/boardStore.js";
import { useAuthStore } from "./store/authStore.js";
import "./index.css";

// Dev-only test hooks: expose the stores on window so E2E scripts can drive
// the real app (seed auth/board state, read store assertions) without a real
// Google login. Stripped from production builds by the env guard.
if (import.meta.env.DEV) {
  (window as any).__dsh = { useBoardStore, useAuthStore };
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);