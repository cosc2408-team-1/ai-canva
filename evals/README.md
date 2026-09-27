# Local prompt evaluations

Three independent prompts, four fictional scenarios, ten checks per output.
VAL generates the outputs and judges their meaning. The report is a standalone
HTML file: open it directly in a browser, without a server.

This is a small starting suite, not a security audit or exhaustive benchmark.
Each box is scored against its own job. Their scores are useful side by side,
but the boxes are not interchangeable competitors.

## Compare all versions, three times each

**`prompt-versions.yaml`** is the single file containing all nine distinct saved
prompt sets. Their original system and user text is preserved; repeated runs of
identical sets were deduplicated. Each version contains all three boxes.

| Version | Description |
| --- | --- |
| v01 | Full reference prompts |
| v02 | Minimal task |
| v03 | Role wording added |
| v04 | Output structure |
| v05 | Identifiers and traceability |
| v06 | Useful content requirements |
| v07 | Evidence discipline |
| v08 | Uncertainty handling |
| v09 | Untrusted input and assurances |

From any folder, run:

```bash
node /home/rayan/Documents/aicanva/ai-canva/evals/run.mjs --all
```

Or, from the repository root:

```bash
node evals/run.mjs --all --check       # Validate and show call count; no VAL calls
node evals/run.mjs --all               # All versions, three repeats each
node evals/run.mjs --version v04       # Just v04, three repeats
node evals/run.mjs --all --repeats 1   # Optional quick pass
```

With the current cases, the full batch is **27 runs / 324 outputs / normally 648
VAL calls**, plus any judge retries. Each repeat visits all versions in file order.
Calls run sequentially and may take a long time. Every version/repeat saves its own
history file and refreshes `report.html`. The report shows per-prompt averages,
lowest–highest scores, usable run counts, and failed/unfinished attempts. Averages
use only attempts with all cases successfully scored for that box; always inspect
the excluded count as well. Three runs help expose variation but are not proof of
statistical significance.

To add a version, duplicate a version entry in `prompt-versions.yaml`, give it a
new `id` and description, then edit its prompt text and stage labels. The runner
loads this file once per batch; edits during a batch apply to the next invocation.
The existing `prompts.yaml` remains an independent scratch file: running without
`--all` or `--version` evaluates that file once (or use `--repeats 3`). Editing the
scratch file does not automatically update the version archive.

The corrected evaluator is **version 2**. It recognizes IDs after newlines and
supplies the judge with the fixed output contract and trusted assessment date.
It does not grade exact NIST identifier accuracy without an authoritative catalogue.
Old runs remain unchanged under their original comparison group, marked evaluator
1. New results form a separate group; do not interpret their difference from old
scores as a prompt improvement. No automatic historical rescoring occurs.

## First use

Use Node 22 or newer. From the repository root:

```bash
npm ci --prefix evals --ignore-scripts
cp evals/.env.example evals/.env
```

Edit `evals/.env` and set your `VAL_API_KEY`. The file is ignored by Git. You can
also set the key in your shell. The runner never reads `server/.env`, production
prompts, application APIs or Firebase. Both model settings default to
`openai-gpt-4.1`; change `EVAL_MODEL` or `EVAL_JUDGE_MODEL` in `evals/.env` if needed.

```bash
node evals/run.mjs --check   # Validate files; no model calls
node evals/run.mjs           # Run all three boxes and save a report
```

Double-click **`evals/report.html`**. It works using a `file://` URL. Refresh it
after a new run. To regenerate the report from saved history, without VAL calls:

```bash
node evals/report.mjs
```

An ordinary run makes 24 VAL requests: one generation and one judgment for each
of 12 outputs. An invalid judgment gets one retry. Calls are sequential; each has
a two-minute timeout. Running sends the fictional case inputs and generated
outputs to VAL. History and reporting stay on your computer. Nothing runs in CI,
default tests, builds, pre-commit hooks, or the application.

## The three editable files

### Building up from a basic prompt

The active `prompts.yaml` now starts at **01-basic**: one role sentence, one task,
and a request for YAML. The previous full evaluation prompts are saved in
`prompts-production-reference.yaml` as a frozen reference. The runner does not
read that reference file, and neither file is connected to production.

1. Run `node evals/run.mjs` to measure the basic prompts.
2. Open `report.html` to see each box's score history and reasons for lost points.
3. Improve one box's prompt at a time. Update its `stage` label to describe the
   change, for example `02-output-fields`, then run the same command again.
4. Add one measured improvement at a time: output fields/statuses, evidence and
   reference rules, uncertainty handling, then role boundaries. Use the saved full
   prompts as a reference, not an assumption that every added sentence helps.

Keep cases, judge rules and model settings fixed during this experiment. The
report charts show runs chronologically on a fixed 0–100 scale and the table
shows changes in points from the previous run. Click any dot or row to inspect
that run's prompt snapshot and results. Old runs without a stage are shown as
`Unlabeled`; their original snapshots remain intact. Stage labels are descriptive;
the content hash is the actual prompt version.

Basic prompts do not specify the full output contract, so they may lose structural
points even if their prose is reasonable. Compare the automatic and VAL subscores
to distinguish formatting improvements from improvements in meaning. Repeating
the same prompt can help reveal judging/model variation; a small increase in one
run is not proof that an edit helped. Existing history is never deleted or relabeled.

**`prompts.yaml`** contains exactly three entries: `reqelicitor`, `nistgap`, and
`securityadvisor`. Each has a label, system prompt, and user template with one
`{{input}}` placeholder. Initial text is an independent copy of the current box
prompts, now retained in the reference file. The active file contains the basic
starting versions. Edit this file to experiment. There is no automatic synchronization or
import from production. Inserted input is never interpreted as template code.

**`cases.yaml`** contains shared scenarios with one fixed input per box. A case
declares allowed output statuses and plain-language expectations. Text inputs
are sent as written; structured inputs are serialized as YAML. The NIST checker
gets a fixed RequirementsPackage, never another evaluated box's output. This
prevents an upstream failure from changing another box's test. A fixed assessment
date (`2026-09-26`) is appended to NIST inputs for reproducibility.

Start by editing or adding a scenario in the existing format. Include all three
boxes, their inputs, expected statuses and specific expectations. Keep IDs unique.
The starting cases cover stated requirements without implementation evidence,
missing context, conflicting reports, and instructions embedded in untrusted data.

**`judge.yaml`** defines role boundaries, six criteria, and full/partial/fail
anchors. The judge sees the output, input, case expectations and these rules. It
does not see the prompt wording being evaluated. It must supply a reason and
output evidence (or a specific missing item) for every rating.

## How to read a score

There are **100 available points per case**:

| Automatic check | Points |
| --- | --- |
| Output parses as one YAML object, without duplicate keys | 10 or 0 |
| Required fields, types and selected role-specific rules are met | 10 or 0 |
| Status matches the case's permitted outcomes | 10 or 0 |
| Checked identifiers/references and upstream package preservation are valid | 10 or 0 |

The six VAL checks are grounding, expected coverage, uncertainty, preservation of
meaning, usefulness, and role boundaries. Each earns **10** for fully meeting the
requirement, **5** for partly meeting it, or **0** for failing it. Detailed anchors
are in `judge.yaml`; case expectations supply the concrete target.

Add the ten scores to get a case score. Average all case scores to get a box's
score. For example, cases scoring 80, 90, 70 and 100 give **85/100**. All cases have
equal weight. Only displayed averages are rounded, to one decimal place.

The automatic checks are deliberately small, not a complete schema validator.
For example, Elicitor requirements need evidence references that resolve in its
register; NIST must preserve the complete input object; Advisor may cite only
supplied identifiers. They do not prove that a framework mapping is correct.
The initial suite has no authoritative NIST/ASVS identifier catalogue and does
not certify reference validity. Inspect those judgments yourself when relevant.

A formatting failure loses the automatic points it prevents checking; semantic
points can still be awarded. There are no hidden caps or special score multipliers.
An empty, failed or explicitly truncated generation is **Incomplete**, with an execution
error label. A failed judge call after its retry also makes the box score **Incomplete**,
not zero and not an average over only its successful cases. Execution/judge errors
also make the command exit unsuccessfully, while retaining results and the report.

VAL judgments are estimates, not facts. Review reasons, particularly around
close scores. The default uses the same model for generation and judgment; this
can introduce shared blind spots. A temperature of zero reduces variation but
does not guarantee identical results, especially if a hosted model changes.

## History and comparison

`evals/.runs/` contains one JSON file per run. Each holds the exact prompt, case
and rubric snapshot; prompt content hashes; model configuration and returned model
names; available token usage; rendered inputs; raw outputs and judge attempts;
per-check reasons; and scores. Credentials and request headers are never saved.

A run is checkpointed after each case. Completed runs are never overwritten by
later runs. An interrupted run remains marked `running`; rebuild the report to
view saved results, then start a new run (there is no resume machinery).

The report groups runs by case/rubric content, configured models/settings and
evaluator source hash. Prompt changes create a new prompt version within a group.
Changes to evaluation conditions create a new group, avoiding misleading trend
comparisons. Hosted model aliases may change behind the same name; VAL does not
provide a model digest here.

The report embeds its data, CSS and scripts. It fetches nothing, escapes embedded
data, and renders model text as text. It has history tables with score bars, box
filters, per-case details, prompt snapshots, raw outputs and score explanations.
The generated report and history are ignored by Git. They include all test inputs
and outputs: sharing the HTML shares those contents too.

## Code map and manual checks

| File | What it does |
| --- | --- |
| `run.mjs` | Loads files, makes calls, checkpoints history, builds the report |
| `val.mjs` | Makes one independent VAL request |
| `score.mjs` | Four automatic checks, judge-response validation, simple addition/averaging |
| `report.mjs` | Embeds saved runs in the HTML template |
| `dashboard.html` | Plain HTML/CSS/JavaScript for browsing results |
| `self-check.mjs` | Offline checks using mocked VAL responses |

Run the eval's own tests explicitly:

```bash
node evals/self-check.mjs
```

These tests include a complete mocked run and a judge-failure run in temporary
directories. They do not call VAL or change your actual history. The eval folder
has only one external dependency: `yaml`. No application code or root scripts
are changed to make this suite run.
