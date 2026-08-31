import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: string;
}

/**
 * A lightweight, embeddable code editor (CodeMirror 6) with JSX syntax
 * highlighting and a VS Code dark theme. Used by the Code / UI / Stitch boxes
 * to let users edit generated code in place.
 */
export default function CodeEditor({
  value,
  onChange,
  readOnly = false,
  height = "100%",
}: CodeEditorProps) {
  return (
    <div className="h-full overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
      <CodeMirror
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        height={height}
        theme={vscodeDark}
        extensions={[javascript({ jsx: true })]}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: !readOnly,
          highlightActiveLineGutter: !readOnly,
        }}
        style={{ fontSize: "12px", height: "100%" }}
      />
    </div>
  );
}
