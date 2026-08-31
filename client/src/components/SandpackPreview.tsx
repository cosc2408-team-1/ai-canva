import { memo, useMemo } from "react";
import { SandpackProvider, SandpackPreview as SandpackPreviewView } from "@codesandbox/sandpack-react";
import { toSandpackFiles } from "../lib/project.js";

interface SandpackPreviewProps {
  code: string;
  height?: string;
}

/**
 * Runs the generated code as a real React project in the browser using
 * Sandpack (CodeSandbox's in-browser bundler). Supports real imports and npm
 * dependencies, with a live preview that updates as the code changes.
 *
 * Stability contract (IMPORTANT): this component renders inside React Flow
 * nodes, whose parents re-render on every store update — presence heartbeats,
 * live-cursor moves (~5/s while the mouse moves), remote board snapshots and
 * token badges. SandpackProvider restarts its bundler whenever the `files` /
 * `options` object *identities* change, even when the content is identical, so
 * re-creating those objects per render made the bundler restart in an endless
 * loop that never finished ("preview forever loading"). Therefore:
 *  - the component is memoized (props are just two strings, so unrelated
 *    parent re-renders are fully blocked), and
 *  - files/options are derived with useMemo keyed on the code string.
 * Do not inline toSandpackFiles(code) or an options literal in the JSX.
 */
function SandpackPreviewInner({ code, height = "100%" }: SandpackPreviewProps) {
  const files = useMemo(() => toSandpackFiles(code), [code]);
  const options = useMemo(
    () => ({ autoReload: true, externalResources: [] as string[] }),
    []
  );

  return (
    <SandpackProvider
      // StrictMode (dev) breaks Sandpack's in-place update-on-files-change:
      // after the double effect mount, later files updates never reach the
      // live sandbox and the preview goes stale. Remounting the provider on
      // actual code changes sidesteps that — a fresh sandbox always runs the
      // new code. Combined with the memo above, this only remounts when the
      // code really changed, never on unrelated re-renders.
      key={code}
      template="react"
      files={files}
      theme="dark"
      options={options}
      // Sandpack only sizes the inner preview to 100% of its wrapper; without
      // giving the provider root a height it collapses to a small default and
      // the app is clipped to the top of the box. Propagate the requested height.
      style={{ height }}
    >
      <SandpackPreviewView
        style={{ height }}
        showOpenInCodeSandbox={false}
        showRefreshButton={false}
      />
    </SandpackProvider>
  );
}

export default memo(SandpackPreviewInner);