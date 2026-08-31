# dsh-plugin-session-monitor

A floating **Sessions Monitor** window for the dsh Web GUI, contributed into the
additive `shell.overlay` slot. It answers one question at a glance — *what is
currently being built, and by which session?* — even when the interesting work
is happening in subagent sessions the sidebar hides.

## What it shows

- **Every open session** (blank ones excepted) as a compact row: title, workspace
  chip, live status word, and a short relative time.
- **Subagent sessions stay visible** and are grouped under their parent with a
  `↳` marker — the sidebar hides them, the monitor does not.
- **Todo progress**: sessions using the todo tool show a progress bar, a
  `done/total` count, and the task currently being worked.
- **Working animations**: a pulsing blue dot with an expanding ripple plus a
  sweeping underline for running sessions; an amber pulsing dot for sessions
  blocked on you; a green pop-in dot for a finished-but-unopened session.
  All animations respect `prefers-reduced-motion`.
- **Sounds** (Web Audio, no assets):
  - a two-note descending **completion chime** when a session finishes while you
    were not looking at it (the same transition that lights the sidebar's green
    "done" dot), and
  - a triple-blip **attention sound** when a session starts waiting on you
    (approval, plan review, or a question) — skipped for the session you have
    open, since you are already there.
  - Browsers block audio until a user gesture, so sounds arm on the first click
    anywhere in the app; the window shows a hint until then. The header speaker
  button mutes/unmutes (unmuting plays a test chime). Mute and collapse state
    persist in `localStorage`.
- **Click a row** to jump to that session (subagent rows open through the
  discovered subagent address, or fall back to their parent).
- **Collapse** to a small pill that pulses with the most important count.

## Install (web profile)

The package must be resolvable from the profile and appear in its Loader tree:

1. Link the package into the profile's `node_modules` (symlink keeps this
   directory the source of truth):

   ```sh
   ln -s ~/dev/ai-canva/dsh-plugins/session-monitor \
      ~/.dsh/profiles/web/node_modules/dsh-plugin-session-monitor
   ```

2. Add the row to `~/.dsh/profiles/web/cordis.patch.yml`:

   ```yaml
   - insert:
       - id: ui-session-monitor
         name: dsh-plugin-session-monitor
   ```

3. Restart `dsh web` — the client-modules scan caches package verdicts, so a
   new plugin only joins the boot graph on restart. Bundle *content* edits are
   different: the always-on client-plugin reload chain hot-reloads
   `lib/client.js` into open browsers without a restart.

## Verify without booting

```sh
node scripts/smoke.mjs
```

The smoke script executes the client bundle the way the browser module loader
does (registers the factory, materializes it with stubbed externals), runs the
plugin `apply` against a fake `ctx`, and server-renders the window with the real
React.

## Layout

| File | Purpose |
|------|---------|
| `lib/index.js` | Node half — empty `apply()` so the row exists in the host Loader. |
| `lib/client.js` | The browser bundle (hand-written in the `window.__ModuleLoader__.load` factory format): CSS, Web Audio engine, row derivation, the window component, zh/en locales, `apply`/`inject`. |
| `scripts/smoke.mjs` | Headless validation of the bundle + component. |

## Data sources

Everything is read from the standard client runtime kit — no new RPCs:

- `useSessions` snapshot (`SessionListState`): `ids`, `byId` summaries with
  `running`, `pendingInteraction`, `completed`, `blank`, `origin`, `parentId`,
  `updatedAt`, and `projectionValues.todos`.
- `workspaceTitleOf` from `@deepseek-ai/dsh-client-runtime/client` for the
  workspace chip (the repo-wide basename derivation).
- `ctx.sessions.open` / `openSubagent` / `subagentAddress` for navigation.
- `ctx.locale.register("sessionMonitor", …)` for the zh/en dictionaries; the
  `locale` register option hands the component its bound `t`.