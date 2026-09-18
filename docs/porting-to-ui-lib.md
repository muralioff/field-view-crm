# Porting Visit Types to the Lit + TypeScript design system

Target: [`zoho-crm-design-system`](https://github.com/kathiravan-n-22060/zoho-crm-design-system)
→ `ui-lib/`. Source: the Visit Types step in this repo, specified in
[`visit-types-spec.md`](visit-types-spec.md).

This is a **guide**, not a migration. `field-view-crm` stays exactly as it is; the port is
additive in the other repo.

---

## The headline

**The library already implements the Type 2 error behaviour.** `ui-input` has
`error` + `error-message` + `error-style="tooltip"`, and
`src/components/input/error-presentation.ts` renders a red-bordered field with an
`<ui-tooltip variant="error">` and no inline copy — the row never grows. It reveals on
`:hover` **and** `:focus-within`, which also closes the keyboard gap flagged in §9 of the
spec.

So the hard part of the port is not the error UI. It is **the shift from imperative DOM to
declarative state**. The current code mutates the DOM directly — `innerHTML` strings,
`classList.add('invalid')`, `field.dataset.error`, `tr.remove()`. None of that survives.
In Lit, a `rows` array is the truth and the template is a function of it.

Get that one thing right and the rest is assembly.

---

## Inventory: what you get, what you build

| Piece | Status | Element / note |
|---|---|---|
| Text inputs | **free** | `ui-input` — `value`, `placeholder`, `error`, `error-message`, `error-style` |
| Error tooltip | **free** | built into the input family; `error-style="tooltip"` |
| Checkboxes | **free** | `ui-checkbox` — `checked`, fires `change` |
| ⊖ / ⊕ row actions | **free** | `ui-icon-button` |
| Footer buttons | **free** | `ui-button` |
| Info banner | **free** | `ui-message-box` |
| Table header / rows / cells | **free** | `ui-table-header-cell`, `ui-table-row`, `ui-table-cell` |
| Sidebar, top bar | **free** | `ui-left-menu`, `ui-top-bar` |
| All colours, spacing, type | **free** | `ui-lib/tokens.css` — do not re-declare hexes |
| Icons | **free** | `dist/icons/figma-icons.json` manifest |
| Input cell with a **tooltip** error | **needs a slot** | see step 6 |
| Tooltip open *before* any hover | **decision** | see Decisions |
| Multi-colour stepper | **must build** | no component exists — see step 8 |

### The one gap worth knowing early

`ui-table-cell variant="input"` renders its own `ui-input` but passes only `?error` and
`error-message` — **not `error-style`**. It therefore defaults to `single-line`, the inline
message that grows the cell. That is Type 1, the behaviour you removed.

You do **not** need to change the library. The cell exposes
`<slot name="control">`, so supply your own field:

```html
<ui-table-cell variant="input">
  <ui-input slot="control" fluid error-style="tooltip" ...></ui-input>
</ui-table-cell>
```

---

## Steps, easiest first

### 1. Get the library running

```bash
git clone https://github.com/kathiravan-n-22060/zoho-crm-design-system.git
cd zoho-crm-design-system/ui-lib
npm install
npm run build      # tokens → tsc → vite → contracts
npm run dev        # playground.html — every component, every variant
```

Open the playground and find `input.html`, `choice.html`, `table-cell.html`,
`tooltip.html`, `button.html`. Confirm with your own eyes that
`error-style="tooltip"` behaves the way our page does before writing anything.

**Why first:** if the build is broken or the behaviour differs from what you expect, every
later step rests on a wrong assumption.

### 2. Read the house rules

Non-optional in this repo, and they will reject work that ignores them:

- `CLAUDE.md` — standing instructions. Note: *"`ui-lib/` is where components live. Build
  screens FROM it, not beside it."*
- `zoho-crm/04-rules.md` — the approval log and the numbered non-negotiables
- `.claude/skills/crm-ui-design/SKILL.md` — the operating procedure and deliverable checklist
- `ui-lib/docs/variables.md` — token naming (names are **verbatim Figma paths**, including
  the misspellings; they are reproduced, not corrected)

Two rules that will bite:

- `zoho-crm/tokens.css` and `core.css` are **generated**. Never hand-edit. Run
  `npm run tokens:build`.
- Shared registries (`src/index.ts`, `package.json` exports, `playground.ts` NAV_ITEMS,
  `build-contracts.mjs`) must be edited by **one session at a time**.

### 3. Feed the spec and the contracts to your LLM

The library ships machine-readable component contracts — `dist/ai/input.json`,
`ai/dropdown.json`, `ai/button.json`, and a `component-contract.schema.json`. They list
every attribute, type, default, slot and accessibility note.

Give your LLM, together:

1. `docs/visit-types-spec.md` (raw URL) — the behaviour contract
2. The `ai/*.json` contracts for input, button, checkbox, table-cell — the component API
3. `ui-lib/src/components/input/error-presentation.ts` — how errors are already handled

That combination is what stops it inventing components that don't exist or re-implementing
the error tooltip by hand.

### 4. Stand up the screen shell

New page inside `ui-lib` following the demo pattern (`visit-types.html` +
`src/visit-types.ts`), so `npm run dev` serves it:

```ts
import './components/input/register'
import './components/choice/register'
import './components/button/register'
import './components/table-cell/register'
import './components/message-box/register'
import './components/left-menu/register'
import './components/top-bar/register'
```

Then place `ui-left-menu`, `ui-top-bar`, the description text, and `ui-message-box` for the
Info banner. **No table, no state yet** — just prove tokens load and chrome renders.

**Why here:** it is pure composition. If the shell looks wrong, it is a token or import
problem, diagnosed in isolation rather than tangled with row logic.

### 5. Port the state model — the real work

Before touching a template, write the model as **pure TypeScript with no DOM**:

```ts
export type VisitTypeRow = {
  id: string          // stable key for Lit's repeat() — do NOT use the array index
  name: string
  duration: string
  image: boolean
  file: boolean
  notes: boolean
}

export type FieldKey = 'name' | 'duration'
export type RowErrors = Partial<Record<FieldKey, string>>

export const MESSAGES = {
  emptyName:     'Field cannot be empty.',
  emptyDuration: 'Field cannot be empty.',
  duplicateName: 'Visit type already exists.',
  zeroDuration:  'Duration must be above 0.',
} as const

export const newRow = (): VisitTypeRow => ({ /* duration: '15', rest empty/false */ })

/** Pure. Returns one RowErrors per row, index-aligned. §5 of the spec. */
export const validate = (rows: VisitTypeRow[]): RowErrors[] => { /* ... */ }

/** Digits only, max 3. Called on input. §5 of the spec. */
export const sanitiseDuration = (raw: string): string =>
  raw.replace(/\D/g, '').slice(0, 3)
```

Then **unit-test it with vitest** — the repo already has `vitest` and a `tests/` folder.
Every §5 rule and every §10 checklist item about validation is testable here with no
rendering at all:

- empty vs whitespace-only name
- duplicates are case-insensitive and trimmed
- the **later** row is the one flagged
- empty name reports *empty*, never *duplicate*
- `0` duration rejected, empty duration rejected
- `sanitiseDuration('12abc9')` → `'129'`

**Why this is the pivot:** these rules are the part a developer gets wrong. Locking them
into tested pure functions means the rendering layer cannot silently break them. Do this
before any Lit template exists.

### 6. Render the table from state

```ts
@state() private rows: VisitTypeRow[] = [newRow()]
@state() private errors: RowErrors[] = []
```

Render with `repeat(this.rows, r => r.id, ...)` — **keyed**, so Lit reuses row DOM instead
of re-creating it. With index keys, focus and cursor position jump when you insert a row
mid-list, which breaks the Return-key flow in step 7.

Per row: two `ui-input` in `slot="control"` of `ui-table-cell variant="input"` (per the gap
above), three `ui-checkbox`, two `ui-icon-button`.

Wire the two action rules from §3 as **derived values, not stored state**:

```ts
const showAdd    = i === this.rows.length - 1
const showRemove = this.rows.length > 1
```

`ui-input` re-dispatches native `input` and `change` as `bubbles: true, composed: true`, so
they cross the shadow boundary and one delegated listener still works — but prefer
per-row `@input` bindings in Lit; they are clearer and equally cheap.

### 7. Wire the interactions

In dependency order:

1. **⊕ add** — append `newRow()`, focus the new name field
2. **⊖ remove** — splice by `id`, never by index
3. **Duration sanitising** — `sanitiseDuration` on input
4. **Clear-on-edit** — drop that field's error the moment it changes (§6)
5. **Next** — run `validate()`, store the result, proceed only if clean
6. **Return key** — validate that row's name only; if clean, **insert directly below**
   (`splice(i + 1, 0, newRow())`), then focus it (§4)

Focusing a freshly rendered row needs `await this.updateComplete` before the query — the
element does not exist until Lit has rendered. This is the single most common Lit mistake
in this kind of port.

`ui-input` sets `delegatesFocus: true`, so `.focus()` on the host reaches the inner
`<input>`.

### 8. Build the missing Stepper — hardest

There is **no stepper component** in `ui-lib`. The design system record documents it but
the Lit element does not exist. From `zoho-crm/02-components.md` §7:

> **Stepper (horizontal):** `Multi color Stepper` (`374:40397`) … default bg `#F2F3FA` /
> circle `#CCCEDF`; active bg `#FFFAF2`, border `#F7A973`, circle `#F9C6A1`; completed bg
> `#F1FFF4`, border `#89D69C`

Those match what this prototype uses, so the visual target is settled. But adding a
component to this repo is a **full family workflow**, not a one-file drop:

```
src/components/stepper/ui-stepper.ts        + index.ts + register.ts
src/components/stepper/stepper.contract.json
src/tokens/components/stepper.tokens.json
audit/harvest/stepper.json                  ← get_variable_defs ground truth
audit/stepper.md                            ← the audit record
tests/ui-stepper.test.ts
stepper.html + src/stepper-demo.ts
```

Plus the shared registries: `src/index.ts`, `package.json` exports, `playground.ts`
NAV_ITEMS, `build-contracts.mjs` contracts[], `audit/README.md`.

**Two ways through:**

- **Fast, to unblock the screen:** render the stepper as local markup in the screen file,
  using tokens from `tokens.css`. Ship the screen, raise the component separately. Copy the
  chevron technique from `src/style-visit-types.css` — the two-layer `clip-path` with
  `clip-path: inherit` on `::before` is what draws the 1px outline on the angled edges.
- **Correct, and what the repo wants:** harvest the Figma variables for `374:40397`, author
  the tokens, then the component. Coordinate first — the token files are shared mutable
  state.

**Do this last** regardless. It is the only piece with no existing implementation, so it is
the only one where you are designing rather than assembling.

### 9. Diff and sign off

`screens/` convention is that each screen is diffed against its Figma node — see
`figma-vs-code.png` and `render-lg.png` next to `leads-list-view.html`.

- Screenshot the ported screen against Figma `4115:774722` (initial) and `4115:775129` (errors)
- Walk the **32-item acceptance checklist** in §10 of the spec
- Keep the live prototype open beside it for the interactions a screenshot cannot show:
  tooltip hand-off on hover, Return inserting below, ⊖ vanishing at one row

---

## Two decisions to confirm before coding

**1. Does the tooltip open before any hover?**

Our spec (§6) says: after Next, the tooltip opens on the **first** invalid field
immediately, then follows the pointer. The library's tooltip is pure CSS — `:hover` and
`:focus-within` only — so out of the box **nothing shows until the user hovers or focuses**.

Three options:

| Option | Cost | Trade-off |
|---|---|---|
| Accept the library behaviour | none | Loses "one tooltip always visible". Arguably better: no tooltip covering a row unprompted |
| Focus the first invalid field after Next | ~1 line | `:focus-within` reveals its tooltip, which reproduces the effect almost exactly, using existing behaviour |
| Add a `tooltip-open` attribute to the input family | full family workflow | Exact spec match, but it is a library change |

**Recommendation: the middle one.** Focusing the first invalid field is what the page
already does for a different reason, it costs nothing, and it gets you spec behaviour out
of a mechanism the library already supports.

**2. Where does the screen live?**

`CLAUDE.md` says build screens FROM `ui-lib`. But the one existing screen,
`screens/leads-list-view.html`, is standalone hand-written HTML with tokens inlined — it
imports no components at all. Either it predates the library or `screens/` serves a
different purpose (Figma-diff references).

Ask Kathiravan before choosing. A demo page inside `ui-lib` is the safe default, since that
is demonstrably how every component is exercised today.

---

## Order of difficulty, at a glance

```
easy   1. build the library, open the playground
       2. read CLAUDE.md + 04-rules.md + the skill
       3. hand the spec + ai/*.json contracts to your LLM
       4. screen shell — left menu, top bar, message box
       5. state model + vitest tests          ← the pivot
       6. keyed repeat() rendering
       7. interactions, Return key last
       8. the Stepper component               ← the only real build
hard   9. Figma diff + 32-item checklist
```

The port is ~80% assembly. Steps 5 and 8 are the only ones that need design thinking, and
step 5 is where correctness is won or lost.
