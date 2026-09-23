import { createContext } from "react";

export interface SecurityTraceContextValue {
  traceableEntityIds: ReadonlySet<string>;
  selectEntity: (id: string) => void;
}

export const SecurityTraceContext = createContext<SecurityTraceContextValue | null>(null);
