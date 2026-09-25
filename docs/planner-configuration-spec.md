# Planner Configuration — functionality & test cases

Step 1 of the Beat Planner setup wizard. This document covers **Planner Configuration only** — the planner name, the operating model, and the modules & address mapping table with its Add/Edit dialog. Visit Types, Beat Engine, Field Rules and Notifications are out of scope.

Visual reference (spacing, type, colour) is supplied separately as Figma frames. This document is about **behaviour**: what the screen does, and what a correct build must do in each case.

---

## 1. Reference data

A build must offer exactly these values. Cases below refer to them by name.

**Modules** — `Contacts`, `Accounts`, `Deals`, `Leads`

**Single-line address fields** (used by Map Address Fields)
`Billing Street`, `Billing City`, `Billing State`, `Billing Country`, `Billing Code`, `Shipping Street`, `Shipping City`, `Shipping State`, `Shipping Country`, `Shipping Code`, `Mailing Address`, `Office Address`

**Multiline address fields** (used by Map Address Section)
`Billing Address`, `Shipping Address`, `Mailing Address`, `Other Address`, `Address Description`

**Criteria fields** — `Division`, `Status`, `Contact Owner`, `Account Owner`, `Priority`, `Lead Status`

**Operators** — `is`, `is not`, `contains`, `starts with`, `is empty`, `is not empty`
The last two are *valueless*: they take no value.

**Address parts**

| Address type | Parts, in order | Mandatory |
|---|---|---|
| Map Address Section | Full Address | Full Address |
| Map Address Fields | Street, City, State, Pincode, Country | Street, City, State, Pincode — **Country is optional** |

**Standard error message** — `Field cannot be empty.`

---

## 2. Page layout

Top to bottom:

1. **Stepper** — Planner Configuration (active), Visit Types, Beat Engine, Field Rules, Notifications. Steps 2–5 are not reachable from here.
2. **Planner Name** — a text input, mandatory.
3. **Operating Model** — two cards: Top Down, Bottom Up.
4. **Modules & Address Mapping** — a heading, an explanatory line, the Add Module control, and the table once rows exist.
5. **Footer** — Cancel, Save as Draft, Next.

---

## 3. Planner Name

| # | Case | Expected |
|---|---|---|
| 3.1 | Field is mandatory | Carries the mandatory marker |
| 3.2 | Page loads | Pre-filled with `Food Export` (sample data) |
| 3.3 | Clear the name, press Next | Blocked. Focus moves to the name field and a toast reads `Planner name cannot be empty.` |
| 3.4 | Whitespace-only name, press Next | Treated as empty — same as 3.3 |
| 3.5 | Valid name, at least one module mapped, press Next | Navigates to the Visit Types step |

---

## 4. Operating Model

| # | Case | Expected |
|---|---|---|
| 4.1 | Page loads | **Top Down** is selected |
| 4.2 | Selection is single-choice | Clicking Bottom Up selects it and deselects Top Down. Never both, never neither |
| 4.3 | Selected card | Shows the selected treatment (accent border/background and a check marker) |
| 4.4 | Either model may be chosen | Neither choice blocks Next, nor changes anything else on this step |

---

## 5. Modules & Address Mapping — the table

### 5.1 Add Module control placement

| # | Case | Expected |
|---|---|---|
| 5.1.1 | No modules mapped yet | A full **Add Module** button sits below the description. The table is not shown |
| 5.1.2 | One or more modules mapped | The button is replaced by an **Add Module** link beside the "Modules & Address Mapping" heading, and the table appears |
| 5.1.3 | All four modules mapped | The link is hidden. There is no way to open the dialog for a fifth row |
| 5.1.4 | A row is deleted, taking the count below four | The link reappears |

### 5.2 Table columns

Four columns: row actions, **Module**, **Address Field**, **Filter by**.

| # | Case | Expected |
|---|---|---|
| 5.2.1 | Module column | The module name |
| 5.2.2 | Address Field column | **The mapped CRM field names only**, comma-separated, in part order. No part labels, no address type. E.g. mapping Street→`Billing Street`, City→`Billing City`, State→`Billing State`, Pincode→`Billing Code` shows `Billing Street, Billing City, Billing State, Billing Code` |
| 5.2.3 | Address Field, single-field mapping | Just the one field, e.g. `Mailing Address` |
| 5.2.4 | Address Field, optional part left empty | Omitted entirely — no blank entry, no trailing comma |
| 5.2.5 | Filter by, scope = All records | Reads `All Records` |
| 5.2.6 | Filter by, scope = matching criteria | One numbered line per criterion — index, field, operator **in upper case**, value — followed by a `Criteria Pattern` line with the pattern |
| 5.2.7 | Filter by, single criterion | The pattern line is **not** shown (nothing to combine) |

### 5.3 Row actions

| # | Case | Expected |
|---|---|---|
| 5.3.1 | Actions visibility | Delete and Edit appear on row hover or keyboard focus; hidden otherwise |
| 5.3.2 | Delete | Removes that row immediately. No confirmation |
| 5.3.3 | Edit | Opens the dialog pre-filled with that row's values |
| 5.3.4 | Delete the last remaining row | Table hides, the full Add Module button returns, Next goes back to disabled |

---

## 6. Add / Edit Module and Address Mapping dialog

### 6.1 Opening and closing

| # | Case | Expected |
|---|---|---|
| 6.1.1 | Title when adding | `Add Module and Address Mapping` |
| 6.1.2 | Title when editing | `Edit Module and Address Mapping` |
| 6.1.3 | Primary button | Reads `Done` in **both** modes |
| 6.1.4 | On open | Body scrolled to top; focus on the Module select |
| 6.1.5 | Cancel | Closes with no change to the table |
| 6.1.6 | Escape key | Closes with no change |
| 6.1.7 | Click the backdrop | Closes with no change. Clicking **inside** the dialog must not close it |
| 6.1.8 | Reopen after cancelling | Previous unsaved input is gone — the dialog starts clean |
| 6.1.9 | Header / footer | Stay fixed; only the body scrolls. A shadow appears under the header only when content is scrolled behind it, and above the footer only when more content lies below |

### 6.2 Progressive reveal

| # | Case | Expected |
|---|---|---|
| 6.2.1 | Dialog opens (adding) | **Only** the Module field is shown. Address Type and Record Scope are absent, not greyed |
| 6.2.2 | A module is chosen | Address Type and Record Scope appear |
| 6.2.3 | Module changed to another value | The rest stays visible; any errors clear |

### 6.3 Module select

| # | Case | Expected |
|---|---|---|
| 6.3.1 | Placeholder | `Select Module`, shown in placeholder colour, and not re-selectable once a real value is chosen |
| 6.3.2 | Options when nothing is mapped | All four modules |
| 6.3.3 | A module already mapped by another row | **Not listed at all** — not listed-and-disabled |
| 6.3.4 | Editing a row | That row's own module **is** listed, so it can be kept |
| 6.3.5 | Mandatory | Carries the red strip |

### 6.4 Address Type

| # | Case | Expected |
|---|---|---|
| 6.4.1 | Two options | `Map Address Section` and `Map Address Fields`, as radio buttons under an **Address Type** heading |
| 6.4.2 | Default | **Map Address Section** (the single-field option) |
| 6.4.3 | Map Address Section | Shows one row: **Full Address** |
| 6.4.4 | Map Address Fields | Shows five rows: Street, City, State, **Pincode, Country** — in that order |
| 6.4.5 | Switching type | All previously chosen address fields are **cleared**, because the two types draw on different field lists |
| 6.4.6 | Full Address options | Only the five **multiline** fields |
| 6.4.7 | Street/City/State/Pincode/Country options | Only the twelve **single-line** fields |
| 6.4.8 | Full Address hint | A single line under the field: `Whole address in one field, e.g. 6800 Burleson Rd, Austin` |
| 6.4.9 | Mandatory markers | Full Address; and Street, City, State, Pincode. **Country carries none** |

### 6.5 One CRM field per address part

| # | Case | Expected |
|---|---|---|
| 6.5.1 | Choose `Billing City` for City | `Billing City` disappears from the Street, State, Pincode and Country lists |
| 6.5.2 | Change City to something else | `Billing City` returns to the other lists |
| 6.5.3 | A part's own current value | Always remains in its own list, so the field can display what it is set to |

### 6.6 Record Scope

| # | Case | Expected |
|---|---|---|
| 6.6.1 | Two options | `All records` and `Records matching criteria`, under a **Record Scope** heading |
| 6.6.2 | Default | **All records** |
| 6.6.3 | All records | No criteria builder is shown |
| 6.6.4 | Records matching criteria | The criteria builder appears with **one** empty row |
| 6.6.5 | Switching back to All records | The builder is hidden and its rows are not saved |

### 6.7 Criteria builder

| # | Case | Expected |
|---|---|---|
| 6.7.1 | A row | Number badge, field select, operator select, value input, and row actions |
| 6.7.2 | Default operator | `is` |
| 6.7.3 | Add (+) | Appears on the **last row only**. Adds a new empty row below |
| 6.7.4 | Remove (−) | Hidden when only one row remains; shown otherwise. Removes that row |
| 6.7.5 | Numbering | Rows renumber 1..n after add or remove |
| 6.7.6 | AND connector | Drawn between rows. **No dangling connector below the last row** |
| 6.7.7 | Operator set to `is empty` / `is not empty` | The value input is **disabled and cleared** |
| 6.7.8 | Operator changed back to a value-taking one | The value input is enabled again |
| 6.7.9 | Criteria Pattern | Read-only, auto-generated as `(1 and 2 and 3 …)` for n rows |
| 6.7.10 | Edit Pattern | Makes the pattern input editable and focuses it |
| 6.7.11 | Edit Pattern toggled off | Reverts to the auto-generated pattern |
| 6.7.12 | Add or remove a row after editing the pattern | The pattern regenerates for the new row count |

### 6.8 Validation — on pressing Done

The primary button is **never disabled**. It validates on click and reports what is missing.

| # | Case | Expected |
|---|---|---|
| 6.8.1 | Error presentation | An 11px message in error red **directly under the field**, above any hint that field carries. The field itself takes an error border |
| 6.8.2 | Error text | `Field cannot be empty.` |
| 6.8.3 | Focus | Moves to the **first** invalid field |
| 6.8.4 | Dialog stays open | Nothing is written to the table while any error stands |
| 6.8.5 | No module chosen | Module is flagged. Nothing else is validated, since nothing else is shown |
| 6.8.6 | Map Address Section, Full Address empty | Full Address flagged |
| 6.8.7 | Map Address Fields, Street/City/State/Pincode empty | **All four** flagged at once |
| 6.8.8 | Map Address Fields, only Country empty | **Valid** — saves |
| 6.8.9 | Scope = matching criteria, criteria field empty | That row's field select flagged |
| 6.8.10 | Scope = matching criteria, value empty with a value-taking operator | That row's value input flagged |
| 6.8.11 | Scope = matching criteria, value empty with `is empty` / `is not empty` | **Valid** — that operator takes no value |
| 6.8.12 | Scope = All records, criteria left half-filled earlier | Not validated — criteria are ignored entirely |
| 6.8.13 | Correcting a flagged field | Its error clears as soon as the field is edited, without pressing Done again |
| 6.8.14 | Changing module, address type or scope | All standing errors clear |

### 6.9 Saving

| # | Case | Expected |
|---|---|---|
| 6.9.1 | Done while adding | A new table row is appended; dialog closes; toast reads `<Module> added.` |
| 6.9.2 | Done while editing | That row is updated in place, not appended; toast reads `<Module> updated.` |
| 6.9.3 | Empty optional parts | Not stored — they must not appear in the Address Field column |
| 6.9.4 | Scope = All records | Criteria are stored empty, whatever was typed before switching |
| 6.9.5 | Pattern when none was edited | Stored as the auto-generated `(1 and 2 …)` |

---

## 7. Footer

| # | Case | Expected |
|---|---|---|
| 7.1 | Next, no modules mapped | **Disabled** |
| 7.2 | Next, at least one module mapped | Enabled |
| 7.3 | Next, valid name + at least one module | Navigates to Visit Types |
| 7.4 | Next, empty name | Blocked — see 3.3 |
| 7.5 | Save as Draft | Toast `Saved as draft.` Stays on the page |
| 7.6 | Cancel | Returns to the home/index page |

---

## 8. End-to-end walkthroughs

### 8.1 Single-field mapping, all records

1. Name is `Food Export`; Top Down selected. Next is disabled.
2. Add Module → dialog shows the Module field only.
3. Module = `Contacts` → Address Type and Record Scope appear.
4. Address Type is already `Map Address Section`; Full Address = `Mailing Address`.
5. Record Scope is already `All records`.
6. Done.

**Expect:** toast `Contacts added.` · table row `Contacts` / `Mailing Address` / `All Records` · Add Module is now a link beside the heading · Next enabled.

### 8.2 Multi-field mapping with criteria

1. Add Module → Module = `Accounts`.
2. Address Type = `Map Address Fields`.
3. Street = `Billing Street`, City = `Billing City`, State = `Billing State`, Pincode = `Billing Code`. Leave Country empty.
4. Record Scope = `Records matching criteria`.
5. Row 1: `Division` / `is` / `West`. Add a row. Row 2: `Status` / `is not empty` — leave the value alone; it must be disabled.
6. Done.

**Expect:** toast `Accounts updated`/`added` as applicable · Address Field reads `Billing Street, Billing City, Billing State, Billing Code` (no Country) · Filter by shows two numbered lines with `IS` and `IS NOT EMPTY` in upper case, plus `Criteria Pattern (1 and 2)`.

### 8.3 Validation sweep

1. Add Module → press **Done** immediately. → Module flagged, focused.
2. Module = `Deals`. → error clears; Address Type and Record Scope appear.
3. Address Type = `Map Address Fields`. Press **Done**. → Street, City, State, Pincode all flagged; Country not.
4. Fill Street, City, State, Pincode. Record Scope = `Records matching criteria`. Press **Done**. → criteria field and value flagged.
5. Set the operator to `is empty`. → the value input disables and clears.
6. Set the criteria field. Press **Done**. → saves.

### 8.4 Uniqueness rules

1. Map `Contacts`, `Accounts`, `Deals`.
2. Open Add Module. → the Module list offers **`Leads` only**.
3. Map `Leads`. → the Add Module link disappears.
4. Edit the `Deals` row. → its Module list offers `Deals` (its own) and nothing else.
5. Delete the `Leads` row. → the Add Module link returns.

### 8.5 Field uniqueness within one mapping

1. Add Module → `Contacts` → `Map Address Fields`.
2. Street = `Billing Street`. → `Billing Street` is gone from City, State, Pincode, Country.
3. City = `Billing City`. → `Billing City` gone from the others; `Billing Street` still gone.
4. Change Street to `Shipping Street`. → `Billing Street` returns to the other lists.

---

## 9. Accessibility

| # | Case | Expected |
|---|---|---|
| 9.1 | Dialog | `role="dialog"`, `aria-modal="true"`, labelled by its title |
| 9.2 | Dialog closed | `aria-hidden="true"` on the overlay |
| 9.3 | Invalid field | `aria-invalid="true"`; the message is announced (`role="alert"`) |
| 9.4 | Toast | Announced politely (`role="status"`, `aria-live="polite"`) |
| 9.5 | Operating model cards | Expose their selected state (`aria-pressed`) |
| 9.6 | Icon-only controls | Carry accessible names — row Delete/Edit, criteria Add/Remove |
| 9.7 | Keyboard | Every control is reachable and operable by keyboard; Escape closes the dialog |

---

## 10. Known non-goals

These are **not** expected of the build and should not be raised as defects:

- Steps 2–5 of the stepper are not navigable from this screen.
- Nothing persists across a page reload — the table is in-memory.
- Save as Draft only confirms with a toast; it stores nothing.
- The module and field lists are fixed sample data, not fetched from a CRM.
- Criteria Pattern accepts free text when unlocked; the expression is not parsed or validated.
