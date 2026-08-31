window.__ModuleLoader__.load({
	id: "dsh-plugin-session-monitor",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _runtime_client = require("@deepseek-ai/dsh-client-runtime/client");
		//#region styles
		const css = [
			".dsm-root{position:absolute;right:16px;bottom:16px;width:min(340px,calc(100vw - 32px));display:flex;flex-direction:column;pointer-events:auto;background:var(--dsw-specific-menu,var(--dsw-alias-bg-base));border:1px solid var(--dsw-alias-border-l2);border-radius:12px;box-shadow:var(--dsw-shadow-lv3);overflow:hidden;animation:dsm-pop .22s ease-out}",
			".dsm-pill{position:absolute;right:16px;bottom:16px;pointer-events:auto;display:inline-flex;align-items:center;gap:7px;height:34px;padding:0 12px;border-radius:17px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-specific-menu,var(--dsw-alias-bg-base));box-shadow:var(--dsw-shadow-lv3);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:16px;cursor:pointer;animation:dsm-pop .22s ease-out}",
			".dsm-pill:hover{color:var(--dsw-alias-label-primary)}",
			".dsm-pill:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}",
			".dsm-pill .dsm-dot{margin-top:0}",
			".dsm-pill-count{font-variant-numeric:tabular-nums}",
			".dsm-header{display:flex;align-items:center;gap:8px;padding:10px 10px 6px 12px}",
			".dsm-title{flex:1;min-width:0}",
			".dsm-title-text{font-size:13px;font-weight:600;line-height:18px;color:var(--dsw-alias-label-primary)}",
			".dsm-sub{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
			".dsm-btn{flex:none;width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;border:0;background:0 0;color:var(--dsw-alias-label-tertiary);border-radius:6px;cursor:pointer;padding:0}",
			".dsm-btn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}",
			".dsm-btn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}",
			".dsm-btn svg{display:block}",
			".dsm-list{max-height:min(360px,44vh);overflow-y:auto;padding:0 6px 6px;--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2)}",
			".dsm-empty{padding:16px 12px;font-size:12px;color:var(--dsw-alias-label-tertiary);text-align:center}",
			".dsm-row{display:flex;gap:8px;align-items:flex-start;width:100%;text-align:left;border:0;background:0 0;border-radius:8px;padding:6px 8px;cursor:pointer;position:relative;overflow:hidden;animation:dsm-pop .18s ease-out}",
			".dsm-row:hover{background:var(--dsw-alias-interactive-bg-hover)}",
			".dsm-row:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}",
			".dsm-row[data-current=\"1\"]::before{content:\"\";position:absolute;left:0;top:6px;bottom:6px;width:2px;border-radius:1px;background:var(--dsw-alias-state-business-primary)}",
			".dsm-row[data-status=\"running\"]::after{content:\"\";position:absolute;left:0;right:0;bottom:0;height:2px;background:linear-gradient(90deg,transparent,var(--dsw-alias-state-business-primary),transparent);transform:translateX(-100%);animation:dsm-sweep 1.8s ease-in-out infinite;opacity:.4}",
			".dsm-row-main{flex:1;min-width:0}",
			".dsm-row-title-line{display:flex;align-items:center;gap:5px;min-width:0}",
			".dsm-row-title{font-size:13px;line-height:18px;color:var(--dsw-alias-label-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:1}",
			".dsm-branch{flex:none;color:var(--dsw-alias-label-dimmed,var(--dsw-alias-label-tertiary));font-size:11px;line-height:18px}",
			".dsm-row-meta{display:flex;align-items:center;gap:5px;margin-top:1px;overflow:hidden}",
			".dsm-chip{flex:none;background:var(--dsw-alias-fill-l2);color:var(--dsw-alias-label-secondary);border-radius:5px;padding:0 5px;font-size:10px;line-height:15px;font-family:var(--dsw-font-mono);max-width:38%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
			".dsm-status-word{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11px;line-height:15px;color:var(--dsw-alias-label-tertiary)}",
			".dsm-status-word[data-s=\"attention\"]{color:var(--dsw-alias-state-warn-primary)}",
			".dsm-status-word[data-s=\"running\"]{color:var(--dsw-alias-state-business-primary)}",
			".dsm-status-word[data-s=\"done\"]{color:var(--dsw-alias-state-success-primary)}",
			".dsm-time{flex:none;font-size:11px;line-height:15px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}",
			".dsm-todos{margin-top:4px}",
			".dsm-todo-bar{height:3px;border-radius:2px;background:var(--dsw-alias-fill-l2);overflow:hidden}",
			".dsm-todo-fill{height:100%;border-radius:2px;background:var(--dsw-alias-state-success-primary);transition:width .3s ease}",
			".dsm-todo-line{display:flex;gap:5px;margin-top:2px;font-size:11px;line-height:15px;color:var(--dsw-alias-label-tertiary)}",
			".dsm-todo-count{flex:none;font-variant-numeric:tabular-nums}",
			".dsm-todo-current{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
			".dsm-dot{position:relative;flex:none;width:10px;height:10px;margin-top:4px;border-radius:50%}",
			".dsm-dot[data-dot=\"idle\"]{background:var(--dsw-alias-label-dimmed,var(--dsw-alias-label-tertiary));opacity:.55}",
			".dsm-dot[data-dot=\"running\"]{background:var(--dsw-alias-state-business-primary)}",
			".dsm-dot[data-dot=\"running\"]::after{content:\"\";position:absolute;inset:-2px;border-radius:50%;border:1px solid var(--dsw-alias-state-business-primary);animation:dsm-ripple 1.5s cubic-bezier(.2,.6,.4,1) infinite;animation-delay:var(--dsm-delay,0s)}",
			".dsm-dot[data-dot=\"attention\"]{background:var(--dsw-alias-state-warn-primary);animation:dsm-pulse 1.1s ease-in-out infinite}",
			".dsm-dot[data-dot=\"done\"]{background:var(--dsw-alias-state-success-primary);animation:dsm-pop-in .3s cubic-bezier(.34,1.56,.64,1)}",
			".dsm-foot{padding:2px 12px 8px;font-size:10px;line-height:14px;color:var(--dsw-alias-label-dimmed,var(--dsw-alias-label-tertiary))}",
			"@keyframes dsm-pop{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}",
			"@keyframes dsm-sweep{to{transform:translateX(100%)}}",
			"@keyframes dsm-ripple{0%{transform:scale(.6);opacity:.9}70%{transform:scale(1.9);opacity:0}100%{transform:scale(1.9);opacity:0}}",
			"@keyframes dsm-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.3)}}",
			"@keyframes dsm-pop-in{from{transform:scale(.3)}to{transform:scale(1)}}",
			"@media (prefers-reduced-motion:reduce){[class*=\"dsm-\"]{animation:none !important;transition:none !important}}"
		].join("");
		const styleTagId = "dsh-plugin-session-monitor/styles.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(styleTagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-plugin-session-monitor";
			tag.dataset.pluginCss = styleTagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		//#endregion
		//#region audio
		/** Web Audio engine: synthesized chimes, armed lazily by the first user gesture. */
		let audioCtx = null;
		let audioArmed = false;
		const armedListeners = new Set();
		function ensureAudio() {
			try {
				if (typeof window === "undefined") return null;
				if (!audioCtx) {
					const AC = window.AudioContext ?? window.webkitAudioContext;
					if (!AC) return null;
					audioCtx = new AC();
				}
				if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
				return audioCtx;
			} catch {
				return null;
			}
		}
		function armAudio() {
			if (audioArmed) return;
			audioArmed = true;
			ensureAudio();
			for (const notify of [...armedListeners]) {
				try {
					notify();
				} catch { /* listener noise never blocks arming */ }
			}
		}
		function onArmed(listener) {
			armedListeners.add(listener);
			return () => {
				armedListeners.delete(listener);
			};
		}
		/**
		 * Write one synthesized chime into a running AudioContext.
		 * @param ctx - a running AudioContext.
		 * @param kind - "done" (session finished) or "attention" (needs the user).
		 */
		function emitChime(ctx, kind) {
			const t0 = ctx.currentTime;
			const master = ctx.createGain();
			master.gain.value = 1;
			master.connect(ctx.destination);
			const tone = (freq, at, dur, vol, type) => {
				const osc = ctx.createOscillator();
				const gain = ctx.createGain();
				osc.type = type ?? "sine";
				osc.frequency.value = freq;
				gain.gain.setValueAtTime(0.0001, t0 + at);
				gain.gain.exponentialRampToValueAtTime(vol, t0 + at + 0.012);
				gain.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
				osc.connect(gain);
				gain.connect(master);
				osc.start(t0 + at);
				osc.stop(t0 + at + dur + 0.05);
			};
			if (kind === "done") {
				/* Two-note descending chime (G5 -> D5) with a soft sparkle. */
				tone(783.99, 0, 0.35, 0.1);
				tone(1567.98, 0, 0.18, 0.02);
				tone(587.33, 0.18, 0.5, 0.1);
				tone(1174.66, 0.18, 0.22, 0.018);
			} else {
				/* Attention: two urgent blips then a higher resolve. */
				tone(987.77, 0, 0.09, 0.09, "triangle");
				tone(987.77, 0.14, 0.09, 0.09, "triangle");
				tone(1318.51, 0.28, 0.16, 0.1, "triangle");
			}
			window.setTimeout(() => {
				try {
					master.disconnect();
				} catch { /* already gone */ }
			}, 1400);
		}
		/**
		 * Play one synthesized chime. Returns whether sound played right away
		 * (false when the browser still blocks audio or no Web Audio exists).
		 * A just-gestured but still-resuming context gets one short retry on
		 * resume completion, so the unmute test chime survives the async
		 * `resume()`; a genuinely blocked context never plays late.
		 * @param kind - "done" (session finished) or "attention" (needs the user).
		 */
		function playSound(kind) {
			const ctx = ensureAudio();
			if (!ctx) return false;
			if (ctx.state === "running") {
				emitChime(ctx, kind);
				return true;
			}
			let cancelled = false;
			const giveUp = window.setTimeout(() => {
				cancelled = true;
			}, 1000);
			ctx.resume().then(() => {
				if (!cancelled && ctx.state === "running") emitChime(ctx, kind);
			}).catch(() => {}).finally(() => {
				window.clearTimeout(giveUp);
			});
			return false;
		}
		//#endregion
		//#region derivation
		const { workspaceTitleOf } = _runtime_client;
		/** Coarse row state: attention outranks running outranks done outranks idle. */
		function rowState(summary) {
			if (summary.pendingInteraction !== undefined) return "attention";
			if (summary.running) return "running";
			if (summary.completed === true) return "done";
			return "idle";
		}
		const STATE_RANK = { attention: 0, running: 1, done: 2, idle: 3 };
		/** Todo progress for one session, or null when it has no todo list. */
		function todoProgress(summary) {
			const todos = summary.projectionValues?.todos;
			if (!Array.isArray(todos) || todos.length === 0) return null;
			let done = 0;
			let current = null;
			for (const item of todos) {
				if (item?.status === "completed") done++;
				else if (current === null && item?.status === "in_progress" && typeof item.content === "string") current = item.content;
			}
			return { done, total: todos.length, current };
		}
		/**
		 * Sessions -> display rows. Subagent-origin sessions (hidden in the
		 * sidebar) stay visible here and are grouped under their parent; a
		 * group orders by the most interesting state inside it.
		 * @param list - the `useSessions` snapshot.
		 * @returns ordered rows, each carrying display fields and a depth.
		 */
		function buildRows(list) {
			const byId = list.byId ?? {};
			const visible = [];
			for (const id of list.ids ?? []) {
				const summary = byId[id];
				if (summary === undefined || summary.blank === true) continue;
				visible.push(summary);
			}
			const childrenOf = new Map();
			const roots = [];
			const visibleIds = new Set(visible.map((s) => s.id));
			for (const summary of visible) {
				if (summary.origin === "subagent" && summary.parentId !== undefined && visibleIds.has(summary.parentId)) {
					const bucket = childrenOf.get(summary.parentId);
					if (bucket === undefined) childrenOf.set(summary.parentId, [summary]);
					else bucket.push(summary);
					continue;
				}
				roots.push(summary);
			}
			/** Subtree order key: the best (lowest) rank and freshest timestamp inside it. */
			const subtree = (summary, depth, out) => {
				const row = {
					id: summary.id,
					title: summary.displayTitle || summary.id,
					workspace: summary.cwd !== undefined ? workspaceTitleOf(summary.cwd) : "",
					state: rowState(summary),
					attention: summary.pendingInteraction,
					running: summary.running === true,
					completed: summary.completed === true,
					origin: summary.origin,
					parentId: summary.parentId,
					updatedAt: summary.updatedAt ?? 0,
					todos: todoProgress(summary),
					depth: Math.min(depth, 3)
				};
				const kids = childrenOf.get(summary.id) ?? [];
				const childRows = [];
				let bestRank = STATE_RANK[row.state];
				let freshest = row.updatedAt;
				for (const child of kids) {
					const info = subtree(child, depth + 1, childRows);
					if (info.rank < bestRank) bestRank = info.rank;
					if (info.fresh > freshest) freshest = info.fresh;
				}
				out.push(row, ...childRows);
				return { rank: bestRank, fresh: freshest };
			};
			const orderedRoots = [];
			for (const root of roots) {
				const childRows = [];
				const info = subtree(root, 0, childRows);
				orderedRoots.push({ rows: childRows, rank: info.rank, fresh: info.fresh });
			}
			orderedRoots.sort((left, right) => {
				if (left.rank !== right.rank) return left.rank - right.rank;
				return right.fresh - left.fresh;
			});
			const rows = [];
			for (const group of orderedRoots) rows.push(...group.rows);
			return rows;
		}
		/** Aggregate counts for the header summary and the collapsed pill. */
		function countStates(rows) {
			let running = 0;
			let attention = 0;
			let done = 0;
			for (const row of rows) {
				if (row.state === "running") running++;
				else if (row.state === "attention") attention++;
				else if (row.state === "done") done++;
			}
			return { running, attention, done, total: rows.length };
		}
		/** Localized short relative time ("just now", "3m ago", …). */
		function relativeTime(at, now, t) {
			const seconds = Math.floor(Math.max(0, now - at) / 1000);
			if (seconds < 45) return t("rel.now");
			const minutes = Math.floor(seconds / 60);
			if (minutes < 60) return t("rel.minutes", { n: minutes });
			const hours = Math.floor(minutes / 60);
			if (hours < 24) return t("rel.hours", { n: hours });
			return t("rel.days", { n: Math.floor(hours / 24) });
		}
		//#endregion
		//#region icons
		const iconSize = { width: 14, height: 14, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round", strokeLinejoin: "round" };
		function IconSoundOn() {
			return react.createElement("svg", iconSize, react.createElement("path", { key: "b", d: "M3 6.5v3h2.2L9 12.5v-9L5.2 6.5H3z", fill: "currentColor", stroke: "none" }), react.createElement("path", { key: "w1", d: "M11 6a3.2 3.2 0 0 1 0 4" }), react.createElement("path", { key: "w2", d: "M12.7 4.2a5.6 5.6 0 0 1 0 7.6" }));
		}
		function IconSoundOff() {
			return react.createElement("svg", iconSize, react.createElement("path", { key: "b", d: "M3 6.5v3h2.2L9 12.5v-9L5.2 6.5H3z", fill: "currentColor", stroke: "none" }), react.createElement("path", { key: "x1", d: "M11 6l4 4" }), react.createElement("path", { key: "x2", d: "M15 6l-4 4" }));
		}
		function IconChevronDown() {
			return react.createElement("svg", iconSize, react.createElement("path", { d: "M4 6l4 4 4-4" }));
		}
		//#endregion
		//#region component
		const LS_STATE = "dsh.session-monitor.state";
		const LS_MUTED = "dsh.session-monitor.muted";
		function lsGet(key) {
			try {
				if (typeof localStorage === "undefined") return null;
				return localStorage.getItem(key);
			} catch {
				return null;
			}
		}
		function lsSet(key, value) {
			try {
				if (typeof localStorage === "undefined") return;
				localStorage.setItem(key, value);
			} catch { /* private mode etc. */ }
		}
		/**
		 * The floating Sessions Monitor: every open session as a live row —
		 * pulsing blue while it works, amber when it needs the user, green
		 * for an unopened finish — plus chimes on completion/attention.
		 * @param props - standard root-slot kit (`useSessions`) plus the
		 *   namespace translator `t` and the injected `openSession` action.
		 */
		function SessionMonitorWindow({ useSessions, t, openSession }) {
			const list = useSessions((state) => state);
			const rows = react.useMemo(() => buildRows(list), [list]);
			const counts = react.useMemo(() => countStates(rows), [rows]);
			const [collapsed, setCollapsed] = react.useState(() => lsGet(LS_STATE) === "collapsed");
			const [muted, setMuted] = react.useState(() => lsGet(LS_MUTED) === "1");
			const [now, setNow] = react.useState(() => Date.now());
			const [armedUI, setArmedUI] = react.useState(audioArmed);
			const mutedRef = react.useRef(muted);
			const pendingKinds = react.useRef(new Set());
			const flushTimer = react.useRef(0);
			const prevStates = react.useRef(null);
			mutedRef.current = muted;
			/* Audio arming mirrors into state for the footer hint. */
			react.useEffect(() => onArmed(() => setArmedUI(true)), []);
			/* Keep relative times fresh while the window is visible. */
			react.useEffect(() => {
				const timer = setInterval(() => {
					setNow(Date.now());
				}, 30000);
				return () => {
					clearInterval(timer);
				};
			}, []);
			/* Sound triggers: watch session list transitions, not renders. */
			react.useEffect(() => {
				if (list.phase !== "ready") return;
				const next = new Map();
				for (const id of list.ids ?? []) {
					const summary = list.byId?.[id];
					if (summary === undefined || summary.blank === true) continue;
					next.set(id, {
						attention: summary.pendingInteraction !== undefined,
						completed: summary.completed === true
					});
				}
				const prev = prevStates.current;
				if (prev !== null) {
					for (const [id, cur] of next) {
						const old = prev.get(id);
						if (old === undefined) continue;
						if (cur.attention && !old.attention && id !== list.current) pendingKinds.current.add("attention");
						if (cur.completed && !old.completed) pendingKinds.current.add("done");
					}
					if (pendingKinds.current.size > 0 && flushTimer.current === 0) {
						flushTimer.current = window.setTimeout(() => {
							flushTimer.current = 0;
							if (!mutedRef.current) {
								for (const kind of [...pendingKinds.current]) playSound(kind);
							}
							pendingKinds.current.clear();
						}, 200);
					}
				}
				prevStates.current = next;
				return () => {
					if (flushTimer.current !== 0) {
						window.clearTimeout(flushTimer.current);
						flushTimer.current = 0;
					}
				};
			}, [list, list.current]);
			const toggleCollapsed = () => {
				setCollapsed(!collapsed);
			};
			const toggleMuted = () => {
				armAudio();
				const next = !muted;
				setMuted(next);
				if (!next) playSound("done");
			};
			/* Persist the two view preferences declaratively. */
			react.useEffect(() => {
				lsSet(LS_STATE, collapsed ? "collapsed" : "open");
			}, [collapsed]);
			react.useEffect(() => {
				lsSet(LS_MUTED, muted ? "1" : "0");
			}, [muted]);
			const statusWord = (row) => {
				if (row.state === "attention") {
					if (row.attention === "approval") return t("status.approval");
					if (row.attention === "plan-review") return t("status.plan-review");
					return t("status.question");
				}
				if (row.state === "running") return t("status.running");
				if (row.state === "done") return t("status.done");
				return t("status.idle");
			};
			const summaryParts = [];
			if (counts.attention > 0) summaryParts.push(t("summary.attention", { count: counts.attention }));
			if (counts.running > 0) summaryParts.push(t("summary.running", { count: counts.running }));
			if (counts.done > 0) summaryParts.push(t("summary.done", { count: counts.done }));
			const idleCount = counts.total - counts.attention - counts.running - counts.done;
			if (idleCount > 0 || summaryParts.length === 0) summaryParts.push(t("summary.idle", { count: idleCount }));
			const summaryText = summaryParts.join(" · ");
			const headerDot = counts.attention > 0 ? "attention" : counts.running > 0 ? "running" : counts.done > 0 ? "done" : "idle";
			const renderRow = (row, index) => {
				const isCurrent = row.id === list.current;
				const dot = row.state;
				const metaBits = [];
				if (row.workspace !== "") metaBits.push(react.createElement("span", { key: "ws", className: "dsm-chip", title: row.workspace }, row.workspace));
				metaBits.push(react.createElement("span", { key: "st", className: "dsm-status-word", "data-s": row.state }, statusWord(row)));
				metaBits.push(react.createElement("span", { key: "tm", className: "dsm-time" }, relativeTime(row.updatedAt, now, t)));
				return react.createElement("button", {
					key: row.id,
					type: "button",
					className: "dsm-row",
					"data-status": row.state,
					"data-current": isCurrent ? "1" : undefined,
					style: { paddingLeft: 8 + row.depth * 14 },
					"aria-label": `${row.title} — ${statusWord(row)}`,
					onClick: () => {
						if (openSession !== undefined && !isCurrent) openSession(row);
					}
				}, react.createElement("span", { key: "dot", className: "dsm-dot", "data-dot": dot, style: { "--dsm-delay": `${(index % 5) * 0.12}s` } }), react.createElement("span", { key: "main", className: "dsm-row-main" }, react.createElement("span", { key: "tl", className: "dsm-row-title-line" }, row.depth > 0 ? react.createElement("span", { key: "br", className: "dsm-branch", title: t("sub.badge") }, "↳") : null, react.createElement("span", { key: "tt", className: "dsm-row-title", title: row.title }, row.title)), react.createElement("span", { key: "mt", className: "dsm-row-meta" }, metaBits), row.todos !== null ? react.createElement("span", { key: "td", className: "dsm-todos" }, react.createElement("span", { key: "bar", className: "dsm-todo-bar" }, react.createElement("span", { key: "fill", className: "dsm-todo-fill", style: { width: `${(row.todos.done / row.todos.total) * 100}%` } })), react.createElement("span", { key: "line", className: "dsm-todo-line" }, react.createElement("span", { key: "cnt", className: "dsm-todo-count" }, t("todos", { done: row.todos.done, total: row.todos.total })), row.todos.current !== null ? react.createElement("span", { key: "cur", className: "dsm-todo-current", title: row.todos.current }, row.todos.current) : null)) : null));
			};
			if (collapsed) {
				const pillDot = counts.attention > 0 ? "attention" : counts.running > 0 ? "running" : counts.done > 0 ? "done" : "idle";
				const pillCount = counts.attention > 0 ? counts.attention : counts.running > 0 ? counts.running : counts.done > 0 ? counts.done : counts.total;
				return react.createElement("button", { type: "button", className: "dsm-pill", onClick: toggleCollapsed, "aria-label": `${t("btn.expand")} — ${summaryText}`, title: summaryText }, react.createElement("span", { className: "dsm-dot", "data-dot": pillDot }), react.createElement("span", { className: "dsm-pill-count" }, String(pillCount)));
			}
			return react.createElement("div", { className: "dsm-root", role: "complementary", "aria-label": t("aria.window") }, react.createElement("div", { className: "dsm-header" }, react.createElement("span", { className: "dsm-dot", "data-dot": headerDot }), react.createElement("div", { className: "dsm-title" }, react.createElement("div", { className: "dsm-title-text" }, t("title")), react.createElement("div", { className: "dsm-sub", title: summaryText }, summaryText)), react.createElement("button", { type: "button", className: "dsm-btn", onClick: toggleMuted, "aria-label": muted ? t("btn.unmute") : t("btn.mute"), title: muted ? t("btn.unmute") : t("btn.mute") }, muted ? react.createElement(IconSoundOff, null) : react.createElement(IconSoundOn, null)), react.createElement("button", { type: "button", className: "dsm-btn", onClick: toggleCollapsed, "aria-label": t("btn.minimize"), title: t("btn.minimize") }, react.createElement(IconChevronDown, null))), list.phase !== "ready" ? react.createElement("div", { className: "dsm-empty" }, t("loading")) : rows.length === 0 ? react.createElement("div", { className: "dsm-empty" }, t("empty")) : react.createElement("div", { className: "dsm-list" }, rows.map(renderRow)), !armedUI && !muted ? react.createElement("div", { className: "dsm-foot" }, t("hint.audio")) : null);
		}
		//#endregion
		//#region locales
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"title": "会话监视器",
			"aria.window": "会话监视器",
			"summary.attention": "{count} 个待处理",
			"summary.running": "{count} 个进行中",
			"summary.done": "{count} 个已完成",
			"summary.idle": "{count} 个会话",
			"status.running": "进行中…",
			"status.approval": "等待批准",
			"status.plan-review": "方案待审阅",
			"status.question": "等待回答",
			"status.done": "已完成",
			"status.idle": "空闲",
			"sub.badge": "子代理",
			"rel.now": "刚刚",
			"rel.minutes": "{n} 分钟前",
			"rel.hours": "{n} 小时前",
			"rel.days": "{n} 天前",
			"todos": "任务 {done}/{total}",
			"btn.mute": "静音提示音",
			"btn.unmute": "开启提示音（点击试听）",
			"btn.minimize": "收起监视器",
			"btn.expand": "会话监视器",
			"hint.audio": "在应用内任意点击一次后，提示音才会生效",
			"loading": "正在加载会话…",
			"empty": "还没有会话"
		};
		/** English dictionary, key-identical to the Chinese source of truth. */
		const en = {
			"title": "Sessions Monitor",
			"aria.window": "Sessions monitor",
			"summary.attention": "{count} need you",
			"summary.running": "{count} working",
			"summary.done": "{count} finished",
			"summary.idle": "{count} sessions",
			"status.running": "Working…",
			"status.approval": "Waiting for approval",
			"status.plan-review": "Plan awaiting review",
			"status.question": "Waiting for answer",
			"status.done": "Completed",
			"status.idle": "Idle",
			"sub.badge": "subagent",
			"rel.now": "just now",
			"rel.minutes": "{n}m ago",
			"rel.hours": "{n}h ago",
			"rel.days": "{n}d ago",
			"todos": "{done}/{total} tasks",
			"btn.mute": "Mute sounds",
			"btn.unmute": "Unmute sounds (click to test)",
			"btn.minimize": "Minimize monitor",
			"btn.expand": "Sessions monitor",
			"hint.audio": "Sounds start after your first click anywhere in the app",
			"loading": "Loading sessions…",
			"empty": "No sessions yet"
		};
		//#endregion
		//#region plugin-body
		/** Required services: the session list + slots + locale registration. */
		const inject = [
			"sessions",
			"slots",
			"locale"
		];
		/**
		 * Client plugin body: register the dictionaries, arm audio on the
		 * first user gesture, and contribute the monitor window into the
		 * additive `shell.overlay` list slot (frame-wide floating layer).
		 * @param ctx - client root context.
		 */
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register("sessionMonitor", { zh, en }), "session-monitor: dictionaries");
			ctx.effect(() => {
				const arm = () => {
					armAudio();
				};
				window.addEventListener("pointerdown", arm, { capture: true, once: true });
				window.addEventListener("keydown", arm, { capture: true, once: true });
				return () => {
					window.removeEventListener("pointerdown", arm, { capture: true });
					window.removeEventListener("keydown", arm, { capture: true });
				};
			}, "session-monitor: audio arming");
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "session-monitor",
				order: 100,
				locale: "sessionMonitor",
				inject: () => ({
					openSession: (row) => {
						try {
							if (row.origin === "subagent") {
								const address = ctx.sessions.subagentAddress(row.id);
								if (address !== undefined) {
									ctx.sessions.openSubagent(address);
									return;
								}
								if (row.parentId !== undefined) {
									ctx.sessions.open(row.parentId);
									return;
								}
							}
							ctx.sessions.open(row.id);
						} catch { /* selection failures must never break the monitor */ }
					}
				})
			}, SessionMonitorWindow));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});