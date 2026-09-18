# Visit Types — Behaviour Specification

Implementation spec for the **Visit Types** step of Planner Configuration. Scope is this
one screen: the visit-types table, its row actions, and its validation. Nothing else on
the page (sidebar, top bar, stepper, other wizard steps) is covered here.

| | |
|---|---|
| Working prototype | `visit-types.html` |
| Reference code | `src/visit-types.js`, `src/style-visit-types.css` |
| Figma — initial state | `4115:774722` |
| Figma — error state | `4115:775129` |
| Figma — error tooltip | `4145:782695` |

The prototype is plain HTML/CSS/JS and is meant as a reference, not as code to port. Rebuild
it in your own framework; this document is the contract.

---

## 1. Anatomy

A bordered card containing a header row and N data rows.

```
┌──────────────────────────────────────────────────────────────────────┐
│ Visit Type Name    Duration (min)  Image Upload  File Upload  Notes  │  header
├──────────────────────────────────────────────────────────────────────┤
│ [text input     ]  [number  ]         ☑             ☑          ☐   ⊖ │  row
│ [text input     ]  [number  ]         ☐             ☐          ☐  ⊖⊕ │  last row
└──────────────────────────────────────────────────────────────────────┘
```

### Columns

| # | Column | Width | Control | Alignment |
|---|--------|-------|---------|-----------|
| 1 | Visit Type Name | 294px | Text input | left |
| 2 | Duration (min) | 94px | Text input, digits only | left |
| 3 | Image Upload | 92px | Checkbox | centre |
| 4 | File Upload | 92px | Checkbox | centre |
| 5 | Notes | 92px | Checkbox | centre |
| 6 | *(actions)* | 42px | ⊖ remove / ⊕ add | left |

Column gap 15px, row padding `8px 16px`, table width 812px. Header padding `13px 16px`
with a 2px bottom border; rows have a 1px bottom border, removed on the last row.

### Row data model

```js
{
  name:     string,   // visit type name, free text
  duration: string,   // minutes, digits only
  image:    boolean,  // Image Upload mandatory
  file:     boolean,  // File Upload mandatory
  notes:    boolean,  // Notes mandatory
}
```

The three checkboxes mark a field **mandatory for that visit type**. They are independent
of each other and never required — any combination is valid, including none.

---

## 2. Initial state

On load the table has **exactly one row**:

- **Name** — empty, showing placeholder `Visit Type`
- **Duration** — prefilled `15`
- **All three checkboxes** — unchecked
- **Actions** — ⊕ only (see §3)
- The name input receives focus

---

## 3. Row actions

Two rules govern which icons a row shows. They must be re-evaluated after **every** add
and remove.

| Icon | Shown when |
|------|------------|
| ⊕ add | The row is the **last** row. Never on any other row. |
| ⊖ remove | Always — **except** when only one row remains, where it is hidden. |

So a single-row table shows ⊕ only; a four-row table shows ⊖ on rows 1–3 and ⊖⊕ on row 4.

### Add (⊕)

Appends a new row at the end and focuses its name input. The new row is:

- Name empty, **Duration `15`**, all checkboxes unchecked — identical to the initial row.

### Remove (⊖)

Deletes that row immediately. No confirmation. The last remaining row cannot be removed
because its ⊖ is hidden.

---

## 4. Return key

Pressing **Return / Enter** in a **name input**:

1. Validates that row's name (empty and duplicate checks, §5). If it fails, show the
   error and **do not** add a row.
2. Otherwise insert a new row **directly below the current row** — not at the end — and
   focus its name input.

Inserting below matters when editing mid-list: Return on row 1 of four produces a new
row 2. (Clicking ⊕ always appends at the end, but since ⊕ only appears on the last row,
the two agree in practice.)

Return must not submit a form or trigger the Next button.

---

## 5. Validation

### Trigger

Validation runs on **Next**, over all rows at once. Do not validate on blur or while typing.

The one exception is the Return key, which validates only the name of the row it fires in
(§4).

### Rules

| # | Field | Condition | Message |
|---|-------|-----------|---------|
| 1 | Name | Empty, or whitespace only | `Field cannot be empty.` |
| 2 | Name | Matches another row's name, **case-insensitive**, after trimming | `Visit type already exists.` |
| 3 | Duration | Empty | `Field cannot be empty.` |
| 4 | Duration | Equals `0` | `Duration must be above 0.` |

Notes:

- Rules 1 and 2 are mutually exclusive — an empty name reports *empty*, never *duplicate*.
- Duplicate detection compares trimmed, lower-cased values, so `Order Delivery` and
  `order delivery ` collide.
- The duplicate is flagged on the **later** row; the first occurrence stays clean.
- Checkboxes are never validated.

### Duration input constraints

Enforced while typing, not at validation time:

- Non-digit characters are stripped on input. Negative numbers are therefore impossible
  to enter — no minus sign can be typed, so "less than zero" reduces to the `0` case.
- Maximum 3 digits (0–999).

### Outcome

- **Any error** — mark every failing field, show the tooltip on the first (§6), stay on
  the step.
- **No errors** — proceed. The prototype only shows a confirmation toast; wire this to
  your real navigation.

---

## 6. Error presentation

### Field

An invalid field gets a **red 1px border** (`#ff5d5a`) and nothing else. No message is
placed under the field, so **the row height never changes** and the table below does not
shift. The red border persists while focused.

Set `aria-invalid="true"` on the field.

### Tooltip

The message lives in a **single tooltip shared by the whole table** — exactly one is
visible at any moment, never two.

| Event | Behaviour |
|-------|-----------|
| Validation finds errors | Tooltip opens on the **first** invalid field, in DOM order |
| Pointer enters another **invalid** field | Tooltip moves to that field and shows its message |
| Pointer enters a **valid** field, or leaves the table | Tooltip stays where it is — it does not hide |
| The field the tooltip is on becomes valid | Tooltip moves to the next field still invalid |
| The last error clears | Tooltip hides |
| A row containing errors is removed | Tooltip moves to the next field still invalid, or hides |

Because different fields can fail differently, the text changes as the tooltip moves —
hovering an empty duration reads `Field cannot be empty.`, hovering a zero one reads
`Duration must be above 0.`

### Clearing

An error clears the moment its field is **edited** — on input, not on blur. Do not wait
for the next Next click.

### Positioning

- Anchored **below** the field: top = field's bottom edge + 6px, left = field's left edge.
- Arrow points up at the field.
- If the tooltip would overflow the viewport's right edge, shift it left; the arrow keeps
  pointing at the field.
- Reposition on scroll and on resize. Hide it if its field scrolls out of the visible
  table area.
- The tooltip must not be clipped by the table's `overflow: hidden`, and must not
  intercept pointer events.

---

## 7. Footer

| Button | Behaviour |
|--------|-----------|
| Previous | Go to the previous step. No validation. |
| Cancel | Leave the wizard. No validation. |
| Save as Draft | Persist as-is. No validation — a draft may be incomplete. |
| Next | Validate (§5); advance only if clean. |

Only **Next** validates. In the prototype, Previous / Save as Draft / Next show a toast as
a placeholder — replace with real behaviour.

---

## 8. Design tokens

| Element | Property | Value |
|---------|----------|-------|
| Table | border / radius | `#d7e2ed` 1px / 10px |
| Header | bottom border | `#d7e2ed` 2px |
| Header | text | 14px, 500, `#202123`; the `(min)` unit in `#616e88` |
| Row | bottom border | `#edf0f4` 1px |
| Input | size / radius | height 34px, padding `0 10px`, radius 6px |
| Input | border — default | `#c0c8e2` |
| Input | border — focus | `#5464f2` |
| Input | border — invalid | `#ff5d5a` |
| Input | text / placeholder | 14px `#313949` / `#7c8bae` |
| Checkbox | box | 15px, radius 3px, 2px `#c0c8e2` border |
| Checkbox | checked | fill and border `#5464f2`, white tick |
| Action ⊖ | icon | 16px, `#ff5d5a` |
| Action ⊕ | icon | 16px, `#12aa67` |
| Tooltip | surface | white, 1px `#c5c4d3`, radius 6px, padding `8px 12px` |
| Tooltip | shadow | `0 3px 12px rgba(0,0,0,0.15)` |
| Tooltip | text | 13px / 18px, weight 500, `#ff5d5a` |

Font: Zoho Puvi.

---

## 9. Accessibility

- Every input needs a label — visually the column header serves, so use `aria-label` on
  the input itself.
- Invalid fields carry `aria-invalid="true"`.
- The tooltip is `role="tooltip"` and toggles `aria-hidden`.
- ⊖ and ⊕ are icon-only buttons and need `aria-label` (`Remove visit type` / `Add visit
  type`).
- The tooltip is **hover-driven**, which leaves keyboard-only users without the message.
  This matches the approved design, but if you can extend it, showing the tooltip on
  focus as well as hover would close that gap. Raise it with design before deciding.

---

## 10. Acceptance checklist

**Initial state**
- [ ] One row; name empty with `Visit Type` placeholder; duration `15`; no checkboxes ticked
- [ ] ⊕ visible, ⊖ hidden
- [ ] Name input focused

**Rows**
- [ ] ⊕ appends a row (empty name, duration `15`) and focuses its name
- [ ] ⊕ appears on the last row only
- [ ] ⊖ appears on every row while 2+ rows exist
- [ ] Removing down to one row hides that row's ⊖
- [ ] Add then remove returns to exactly the initial state

**Return key**
- [ ] Return in a named row inserts a row *directly below* and focuses it
- [ ] Return in an empty name shows the empty error and adds nothing
- [ ] Return on a duplicate name shows the duplicate error and adds nothing
- [ ] Return does not submit the form or trigger Next

**Duration**
- [ ] Letters and symbols cannot be typed
- [ ] Cannot exceed 3 digits
- [ ] `0` is rejected on Next with `Duration must be above 0.`
- [ ] Cleared field is rejected on Next with `Field cannot be empty.`

**Validation**
- [ ] Next with all rows valid proceeds
- [ ] Next flags *every* failing field at once, not just the first
- [ ] `Order Delivery` and `order delivery` collide as duplicates
- [ ] The duplicate is flagged on the later row
- [ ] An empty name reports *empty*, not *duplicate*
- [ ] Save as Draft, Previous and Cancel skip validation

**Error display**
- [ ] Invalid fields show a red border and no inline message
- [ ] Row heights are unchanged by errors — nothing below shifts
- [ ] Exactly one tooltip is visible at any time
- [ ] It opens on the first invalid field
- [ ] Hovering another invalid field moves it there with that field's message
- [ ] Hovering a valid field leaves it in place
- [ ] Fixing the tooltip's field moves it to the next invalid one
- [ ] Fixing the last error hides it
- [ ] Editing a field clears its error immediately, without waiting for Next
- [ ] The tooltip tracks its field on scroll and resize
