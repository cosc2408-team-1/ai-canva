// Headless validation of the session-monitor client bundle.
//
// Mirrors what the browser module loader does: register the factory via
// window.__ModuleLoader__.load, materialize it with stubbed externals, run the
// plugin apply() against a fake client ctx, then server-render the window with
// the real React from the dsh install.
//
// Usage: node scripts/smoke.mjs

import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(here, "..");
const globalRoot = execSync("npm root -g").toString().trim();
const dshRoot = join(globalRoot, "@deepseek-ai", "dsh");
const requireFromDsh = createRequire(join(dshRoot, "package.json"));

let failures = 0;
const check = (label, condition) => {
	if (condition) {
		console.log(`  ok  ${label}`);
	} else {
		failures++;
		console.error(`FAIL  ${label}`);
	}
};

// ── 1. Register the factory like the browser module table does ─────────────
const registered = new Map();
globalThis.window = {
	__ModuleLoader__: {
		load: (record) => {
			registered.set(record.id, record.factory);
		}
	},
	AudioContext: undefined,
	addEventListener: () => {},
	removeEventListener: () => {}
};
globalThis.document = undefined; // force the style-tag guard to skip

const bundle = readFileSync(join(pkgRoot, "lib", "client.js"), "utf8");
(0, eval)(bundle);
check("bundle registers exactly one factory", registered.size === 1);
check("factory id is the package name", registered.has("dsh-plugin-session-monitor"));
const factory = registered.get("dsh-plugin-session-monitor");
check("factory is a function", typeof factory === "function");

// ── 2. Materialize with stubbed externals ──────────────────────────────────
const react = requireFromDsh("react");
const runtimeStub = {
	// same semantics as the real workspaceTitleOf: last non-empty path segment
	workspaceTitleOf(cwd) {
		const parts = String(cwd).split(/[/\\]/).filter((part) => part !== "");
		return parts.length > 0 ? parts[parts.length - 1] : "";
	}
};
const seenSpecs = new Set();
const fakeRequire = (spec) => {
	seenSpecs.add(spec);
	if (spec === "react") return react;
	if (spec === "react/jsx-runtime") return requireFromDsh("react/jsx-runtime");
	if (spec === "@deepseek-ai/dsh-client-runtime/client") return runtimeStub;
	throw new Error(`smoke: unexpected external require: ${spec}`);
};
const pluginExports = factory(fakeRequire);
check("externals are only react + runtime/client", [...seenSpecs].sort().join(",") === "@deepseek-ai/dsh-client-runtime/client,react");
check("exports.inject lists the services", JSON.stringify(pluginExports.inject) === JSON.stringify(["sessions", "slots", "locale"]));
check("exports.apply is a function", typeof pluginExports.apply === "function");

// ── 3. Run apply() against a fake client ctx ───────────────────────────────
const captured = {};
const ctx = {
	effect(fn) {
		fn();
		return () => {};
	},
	locale: {
		register(ns, dicts) {
			captured.locale = { ns, dicts };
			return () => {};
		}
	},
	slots: {
		inject(name, callback) {
			captured.injectedSlot = name;
			callback();
		},
		register(options, component) {
			captured.registration = { options, component };
			return () => {};
		}
	},
	sessions: {
		open(id) {
			captured.opened = id;
		},
		subagentAddress() {
			return undefined;
		},
		openSubagent(address) {
			captured.openedSubagent = address;
		}
	}
};
pluginExports.apply(ctx);
check("registers the sessionMonitor locale namespace", captured.locale?.ns === "sessionMonitor");
check("zh dictionary present", Boolean(captured.locale?.dicts?.zh?.title));
check("en dictionary key-identical to zh", Object.keys(captured.locale.dicts.zh).every((key) => key in captured.locale.dicts.en));
check("targets the shell.overlay slot", captured.injectedSlot === "shell.overlay");
check("register id is session-monitor", captured.registration?.options?.id === "session-monitor");
check("register declares the locale option", captured.registration?.options?.locale === "sessionMonitor");
const Monitor = captured.registration?.component;
check("a component was registered", typeof Monitor === "function");
const openSession = captured.registration?.options?.inject?.();
check("inject factory returns an openSession action", typeof openSession?.openSession === "function");
openSession.openSession({ id: "child", origin: "subagent", parentId: "root" });
check("subagent row without address falls back to its parent", captured.opened === "root");

// ── 4. Server-render the window with a realistic session list ──────────────
const { renderToString } = requireFromDsh("react-dom/server");
const en = captured.locale.dicts.en;
const t = (key, params) => {
	let template = en[key] ?? key;
	if (params) {
		for (const [name, value] of Object.entries(params)) template = template.replaceAll(`{${name}}`, String(value));
	}
	return template;
};
const listSnapshot = {
	ids: ["root", "child", "waiting", "finished", "blank"],
	byId: {
		root: { id: "root", displayTitle: "Build landing page", cwd: "/Users/me/dev/ai-canva", running: true, blank: false, updatedAt: Date.now() - 5_000, projectionValues: { todos: [{ content: "Write copy", status: "completed" }, { content: "Polish hero", status: "in_progress" }] } },
		child: { id: "child", displayTitle: "Research competitor set", origin: "subagent", parentId: "root", running: true, blank: false, updatedAt: Date.now() - 2_000 },
		waiting: { id: "waiting", displayTitle: "PRD draft", cwd: "/Users/me/dev/ai-canva", running: true, pendingInteraction: "approval", blank: false, updatedAt: Date.now() - 60_000 },
		finished: { id: "finished", displayTitle: "Summarize notes", completed: true, blank: false, updatedAt: Date.now() - 600_000 },
		blank: { id: "blank", displayTitle: "New Session", blank: true, updatedAt: Date.now() }
	},
	current: "root",
	phase: "ready"
};
const useSessions = (selector) => selector(listSnapshot);
let html = renderToString(react.createElement(Monitor, { useSessions, t, openSession: openSession.openSession }));
check("renders the window title", html.includes("Sessions Monitor"));
check("hides the blank session", !html.includes("New Session"));
check("shows the running root row", html.includes("Build landing page"));
check("running row carries the sweep marker", /data-status="running"/.test(html));
check("shows the subagent row grouped under its parent", html.includes("Research competitor set"));
check("subagent row is indented (branch marker present)", html.includes("dsm-branch"));
check("shows the approval-waiting row as attention", /data-status="attention"/.test(html) && html.includes("Waiting for approval"));
check("shows the finished row", /data-status="done"/.test(html) && html.includes("Summarize notes"));
check("shows the workspace chip", html.includes("dsm-chip") && html.includes("ai-canva"));
check("shows the todo progress bar", html.includes("dsm-todo-fill") && html.includes("1/2 tasks"));
check("shows the in-progress task text", html.includes("Polish hero"));
check("current session row is marked", /data-current="1"/.test(html));
check("header summary counts working sessions", html.includes("2 working"));
check("audio hint is visible while unarmed", html.includes("Sounds start after"));
check("window is marked complementary", html.includes('role="complementary"'));

// ── 5. Collapsed pill state via localStorage ────────────────────────────────
const store = new Map([["dsh.session-monitor.state", "collapsed"]]);
globalThis.localStorage = {
	getItem: (key) => (store.has(key) ? store.get(key) : null),
	setItem: (key, value) => store.set(key, value)
};
html = renderToString(react.createElement(Monitor, { useSessions, t, openSession: openSession.openSession }));
check("collapsed state renders the pill", html.includes("dsm-pill"));
check("pill hides the row list", !html.includes("Build landing page"));
check("pill shows the attention count first", html.includes(">1<"));

// ── 6. Empty + loading states ──────────────────────────────────────────────
store.set("dsh.session-monitor.state", "open"); // back to the open window
const emptyList = { ids: [], byId: {}, current: undefined, phase: "ready" };
html = renderToString(react.createElement(Monitor, { useSessions: (sel) => sel(emptyList), t, openSession: openSession.openSession }));
check("empty list renders the empty state", html.includes("No sessions yet"));
const pendingList = { ids: [], byId: {}, current: undefined, phase: "pending" };
html = renderToString(react.createElement(Monitor, { useSessions: (sel) => sel(pendingList), t, openSession: openSession.openSession }));
check("pending phase renders the loading state", html.includes("Loading sessions"));

console.log(failures === 0 ? "\nsmoke: all checks passed" : `\nsmoke: ${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);