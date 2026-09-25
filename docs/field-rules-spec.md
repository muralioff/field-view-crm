# Field Rules — Behaviour Specification

Implementation spec for the **Field Rules** step of Planner Configuration (step 4). Scope is this
one screen: its four sections, their controls, validation and footer. The stepper, sidebar, top bar
and the other wizard steps are not covered here.

| | |
|---|---|
| Figma file | `3FbwQVGxTF4rwT3iE9NlNC` |
| Figma — default state | `136:7242` |
| Figma — filled state | `140:11943` |
| Companion audit | `field-rules-deviation-report.docx` (23 issues: F1–F8, A1–A8, V1–V7) |

This document is the contract. Section 10 maps every issue in the deviation report to the clause
that defines the correct behaviour, so the two can be read side by side.

---

## 1. Anatomy

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Route Limits                                                                  │
│ Configure how rep check-ins are validated at outlet locations.                │
│        Max mileage per day  [ 0            ] [ km ▾ ]                         │
│       Buffer between visits [ 0            ] [ min ]                          │
│                                                                               │
│ Ad-Hoc Visits  ( ●——)                                                         │
│ Allow the Field Sales Representative to create ad-hoc visits in their…        │
│ ┌ Note: The Ad-Hoc visits can be created for existing records… ─────────────┐ │
│                                                                               │
│ Allow Users to set preferred Start and End Location  ( ●——)                    │
│ Allows users to save address locations in the Address Book section…           │
│ ┌ Note: If enabled, users will be able to set their own preferred… ─────────┐ │
│                                                                               │
│ Check-in settings                                                             │
│ Allowed range is between 25 metres to 200 metres.                             │
│     Allowed check-in radius [ 25           ] [ m ]                            │
│              Check-in mode  ┌ Manual ──────┐ ┌ Automatic ───┐                 │
│                             │ Rep taps…    │ │ System auto…│                  │
│                             └──────────────┘ └─────────────┘                  │
├───────────────────────────────────────────────────────────────────────────────┤
│ [Previous]                          [Cancel] [Save as Draft] [Next]           │
└───────────────────────────────────────────────────────────────────────────────┘
```

Four sections, stacked, **30px apart**. Within a section: title, description, then controls.

| Section | Height in frame |
|---|---|
| Route Limits | 147 |
| Ad-Hoc Visits | 93 |
| Allow Users to set preferred Start and End Location | 93 |
| Check-in settings | 193 |

The body is **1160 × 616** at `x:20, y:70` inside a **1200 × 822** content container.

> **The body must render at its natural height.** No ancestor may impose a fixed height that
> clips it. See 9.1.

---

## 2. Copy

Every string below is fixed. No abbreviation, no rewording.

| Element | Text |
|---|---|
| Section 1 title | `Route Limits` |
| Section 1 description | `Configure how rep check-ins are validated at outlet locations.` |
| Field 1 label | `Max mileage per day` |
| Field 2 label | `Buffer between visits` |
| Section 2 title | `Ad-Hoc Visits` |
| Section 2 description | `Allow the Field Sales Representative to create ad-hoc visits in their active beats.` |
| Section 2 note | `Note: The Ad-Hoc visits can be created for existing records of the concerned Field Sales Representative only.` |
| Section 3 title | `Allow Users to set preferred Start and End Location` |
| Section 3 description | `Allows users to save address locations in the Address Book section and mark the required location as Start and End locations.` |
| Section 3 note | `Note: If enabled, users will be able to set their own preferred Start and End Location. If not, the Office location will be considered as Start and End location for all` |
| Section 4 title | `Check-in settings` |
| Section 4 description | `Allowed range is between 25 metres to 200 metres.` |
| Field 3 label | `Allowed check-in radius` |
| Field 4 label | `Check-in mode` |
| Card 1 title / description | `Manual` / `Rep taps check-in button upon arrival at the outlet` |
| Card 2 title / description | `Automatic` / `System auto-checks-in when rep enters the geo-fence radius` |

Two points the audit found wrong:

- **Section 3's description is not the note.** They are different sentences and both appear. The
  description explains the Address Book; the note explains the fallback to the Office location.
- **`Note:` is followed by a space** in both banners.

---

## 3. Measurements

| Element | Size |
|---|---|
| Input group (field + unit) | **200 × 34** |
| Label column offset — Route Limits | **159px** |
| Label column offset — Check-in settings | **175px** |
| Note banner — Ad-Hoc | **679 × 34**, radius 6 |
| Note banner — Start/End Location | **983 × 34**, radius 6 |
| Toggle switch | **30 × 18** |
| Check-in mode card | **300 × 80**, gap **15px** between the two |
| Previous | 85 × 32 |
| Cancel | 75 × 32 |
| Save as Draft | 113 × 32 |
| Next | 59 × 32 |

All four section titles use **one** type style — 15px. None is 14px.

All four footer buttons are **32px tall**. None is 34.

The unit dropdown must be wide enough to show **`mile` in full**. Do not clip it.

---

## 4. Route Limits

### 4.1 Max mileage per day

| | |
|---|---|
| Control | Numeric input + unit dropdown |
| Default | `0`, unit `km` |
| Unit options | `km`, `mile` |
| Accepts | Digits, and at most one decimal point |
| Rejects | Letters, symbols, a second decimal point, a leading `-` |
| Range | `0`–`999` |

| # | Case | Expected |
|---|---|---|
| 4.1.1 | Type `ab-12.5xy` | Only `12.5` is accepted. Letters, the `-` and the trailing characters never enter the field |
| 4.1.2 | Paste an invalid string | Same filtering applies to paste, not just keystrokes |
| 4.1.3 | Leave empty and press Next | Blocked with a visible, announced error (see 7) |
| 4.1.4 | Enter a value above the range and press Next | Blocked with a visible, announced error |
| 4.1.5 | Switch unit `km` → `mile` | The number **is not** silently reinterpreted. Either convert the value and show the converted number, or keep the number and re-validate against the mile range — pick one and apply it consistently. Do not relabel and leave the number untouched |

> The frames do not state the numeric bounds or the unit-switch behaviour. `0`–`999` and the
> conversion rule above are the intended behaviour — confirm before building.

### 4.2 Buffer between visits

| | |
|---|---|
| Control | Numeric input + static `min` suffix |
| Default | `0` |
| Accepts | Whole digits only |
| Rejects | Letters, symbols, decimal point, `-` |
| Range | `0`–`240` |

| # | Case | Expected |
|---|---|---|
| 4.2.1 | Type `-9.75abc` | Only `975` is accepted — no sign, no decimal, no letters |
| 4.2.2 | Leave empty and press Next | Blocked with a visible, announced error |
| 4.2.3 | Value above the range and press Next | Blocked with a visible, announced error |
| 4.2.4 | The `min` suffix | Static text. Not a dropdown, not editable |

> The `0`–`240` bound is intended behaviour, not shown in the frames — confirm before building.

---

## 5. Toggles

Two independent switches. Neither depends on the other, and neither hides or reveals anything.

| Section | Default |
|---|---|
| Ad-Hoc Visits | **Off** |
| Allow Users to set preferred Start and End Location | **Off** |

| # | Case | Expected |
|---|---|---|
| 5.1 | Toggle on | The switch shows its on state; nothing else on the step changes |
| 5.2 | Toggle off again | Returns to the off state |
| 5.3 | Note banner | Always visible, regardless of the toggle's state |
| 5.4 | Either toggle's state | Never blocks Next |

---

## 6. Check-in settings

### 6.1 Allowed check-in radius

| | |
|---|---|
| Control | Numeric input + static `m` suffix |
| Default | `25` |
| Accepts | Whole digits only |
| Range | **25–200**, inclusive — stated in the section description |

| # | Case | Expected |
|---|---|---|
| 6.1.1 | Enter `25` or `200`, press Next | Accepted — the bounds are inclusive |
| 6.1.2 | Enter `5`, press Next | Blocked, **with a visible error on the field and focus moved to it** |
| 6.1.3 | Enter `500`, press Next | Blocked, same treatment |
| 6.1.4 | Empty, press Next | Blocked, same treatment |
| 6.1.5 | Correct the value | The error clears as the field is edited, without pressing Next again |

> **Next must never do nothing.** A blocked Next that gives no border, no message, no focus move
> and no announcement is the single worst failure on this step — the user has no way to learn why
> the wizard has stopped.

### 6.2 Check-in mode

Two cards, **single choice**, exactly one always selected.

| | |
|---|---|
| Default | **Manual** |

| # | Case | Expected |
|---|---|---|
| 6.2.1 | Click `Automatic` | It becomes selected and `Manual` deselects. Never both, never neither |
| 6.2.2 | Selected card | Shows the accent border and the check marker at its top-right corner |
| 6.2.3 | Enter or Space on a focused card | Selects it |
| 6.2.4 | Space on a focused card | Selects it **and does not scroll the panel** — the default scroll must be prevented |
| 6.2.5 | Arrow keys within the group | Move between the two options |

---

## 7. Validation and feedback

One rule governs the whole step: **a blocked Next always says why.**

When Next is pressed and any field is invalid:

1. The field takes an **error border**.
2. An **error message** appears with the field.
3. **Focus moves** to the first invalid field.
4. The message is **announced** — `role="alert"` or an equivalent live region.
5. The wizard **stays on Field Rules**.

Every field on this step is validated on Next: Max mileage per day, Buffer between visits and
Allowed check-in radius. Next must not advance while any of them is empty or out of range.

---

## 8. Persistence and footer

| # | Case | Expected |
|---|---|---|
| 8.1 | Enter values, go to another step, come back | **Every value is retained** — both numbers, the unit, the radius, both toggles and the check-in mode. Nothing resets to its default |
| 8.2 | Footer buttons | `Previous` on the left; `Cancel`, `Save as Draft`, `Next` on the right, in that order |
| 8.3 | Save as Draft | Present in the footer. Confirms, and stays on the step |
| 8.4 | Previous | Returns to Beat Engine, retaining this step's values |
| 8.5 | Next, all valid | Advances to Notifications |

---

## 9. Layout and accessibility

### 9.1 Layout

| # | Case | Expected |
|---|---|---|
| 9.1.1 | The step's container | Sized to its content. No ancestor imposes a fixed height that collapses the body |
| 9.1.2 | Navigate away and back (Field Rules → Beat Engine → Field Rules) | The step renders at full height both times. No clipped window, no hidden content behind a scrollbar |
| 9.1.3 | Window resize | Height recalculates |

### 9.2 Accessibility

| # | Requirement |
|---|---|
| 9.2.1 | **Each toggle has an accessible name** tied to its visible label — `Ad-Hoc Visits`, `Allow Users to set preferred Start and End Location`. An `aria-labelledby` pointing at an empty element does not count |
| 9.2.2 | **Each toggle exposes its state.** If `role="switch"` is used, `aria-checked` must be present and must track the control, on and off. The native `checked` property no longer maps once the role is overridden |
| 9.2.3 | **Every control has a visible focus indicator** — the three inputs, the unit dropdown, both toggles, both cards and all four footer buttons. WCAG 2.4.7. A visually hidden input must put the indicator on its visible wrapper |
| 9.2.4 | **Each of the three numeric inputs has a programmatic label** — a real `<label for>`, or `aria-label`/`aria-labelledby`. A plain text node beside the field is not a label |
| 9.2.5 | **Check-in mode is a radio group** — `role="radiogroup"` on the container, `aria-checked`/`aria-pressed` on each option, arrow-key navigation between them |
| 9.2.6 | **The unit dropdown has an accessible name** tying it to `Max mileage per day` |
| 9.2.7 | **The four section titles are real headings**, at one consistent level |
| 9.2.8 | **A blocked Next is announced**, not only shown |
| 9.2.9 | Tab order follows visual order |

---

## 10. Deviation report cross-reference

Every issue in `field-rules-deviation-report.docx`, and the clause that defines the fix.

### Functional

| ID | Issue | Clause |
|---|---|---|
| F1 | Wizard body collapses to 58px — step unreachable | **9.1.1, 9.1.2, 9.1.3** |
| F2 | No input filtering on the numeric fields | **4.1 (Accepts/Rejects), 4.1.1, 4.1.2, 4.2 , 4.2.1** |
| F3 | Next advances with invalid Max mileage / Buffer | **7**, 4.1.3, 4.1.4, 4.2.2, 4.2.3 |
| F4 | Check-in radius blocks Next silently | **7**, 6.1.2, 6.1.3, 6.1.4 |
| F5 | Values lost on navigation | **8.1** |
| F6 | Save as Draft missing from the footer | **8.2, 8.3** |
| F7 | Space on a card also scrolls the panel | **6.2.4** |
| F8 | Unit switch relabels without converting or re-validating | **4.1.5** |

### Accessibility

| ID | Issue | Clause |
|---|---|---|
| A1 | Toggles have no accessible name | **9.2.1** |
| A2 | Toggles never expose their state | **9.2.2** |
| A3 | No visible focus indicator anywhere | **9.2.3** |
| A4 | The three number inputs have no label | **9.2.4** |
| A5 | The silent Next block is not announced | **9.2.8**, 7 |
| A6 | Check-in mode built as two independent buttons | **9.2.5**, 6.2 |
| A7 | Unit dropdown has no accessible name | **9.2.6** |
| A8 | No heading structure | **9.2.7** |

### Visual

| ID | Issue | Clause |
|---|---|---|
| V1 | `mile` truncates to `m…` | **3** (unit control must fit `mile`) |
| V2 | Wrong description under Start/End Location | **2** (Section 3 description) |
| V3 | Check-in mode cards oversized | **3** (300 × 80, gap 15) |
| V4 | Section titles inconsistent (15px vs 14px) | **3** (one style for all four) |
| V5 | Missing space in `Note:If enabled…` | **2** (`Note:` + space) |
| V6 | Input groups 220 wide | **3** (200 × 34) |
| V7 | Cancel 34 tall against 32 | **3** (all four buttons 32) |

---

## 11. Acceptance checklist

Run in order. The step is done when every line passes.

**Layout**
- [ ] The step renders at full height on first visit
- [ ] It still does after Field Rules → Beat Engine → Field Rules
- [ ] Height recalculates on window resize

**Route Limits**
- [ ] `ab-12.5xy` into Max mileage leaves `12.5`
- [ ] The same filtering applies on paste
- [ ] `-9.75abc` into Buffer leaves `975`
- [ ] Empty Max mileage blocks Next, with a visible and announced error
- [ ] Empty Buffer blocks Next, with a visible and announced error
- [ ] The unit dropdown shows `mile` in full, not `m…`
- [ ] Switching to `mile` converts or re-validates — it does not just relabel

**Toggles**
- [ ] Both default to off
- [ ] Both note banners show regardless of state
- [ ] Section 3's description and its note are different sentences, both present
- [ ] Both banners read `Note: ` with a space

**Check-in settings**
- [ ] `25` and `200` are accepted
- [ ] `5`, `500` and empty each block Next **with an error border, a message and focus on the field**
- [ ] The error clears when the value is corrected
- [ ] Manual is selected by default
- [ ] Choosing Automatic deselects Manual
- [ ] Space on a focused card selects it without scrolling the panel

**Persistence and footer**
- [ ] All six values survive leaving and returning to the step
- [ ] The footer reads Previous | Cancel · Save as Draft · Next
- [ ] All four footer buttons are 32px tall

**Accessibility**
- [ ] Both toggles are named by their visible labels
- [ ] Both toggles report `aria-checked`, on and off
- [ ] Every control shows a visible focus ring
- [ ] All three numeric inputs have programmatic labels
- [ ] Check-in mode is a radiogroup with arrow-key navigation
- [ ] The unit dropdown is named
- [ ] The four section titles are headings
- [ ] A blocked Next is announced to a screen reader

**Measurements**
- [ ] Input groups 200 × 34
- [ ] Check-in mode cards 300 × 80, 15px apart
- [ ] Note banners 679 × 34 and 983 × 34
- [ ] All four section titles at one size
- [ ] Toggles 30 × 18

---

## 12. Open questions

These are not defined by the frames. Confirm before building.

1. **Numeric bounds** for Max mileage per day and Buffer between visits. This document proposes
   `0`–`999` and `0`–`240`.
2. **Unit switch behaviour** — convert the entered number, or keep it and re-validate? This
   document requires one or the other, not the current silent relabel.
3. **Are `0` values meaningful?** `0` is the default for both Route Limits fields. If `0` means
   "no limit", say so; if it is invalid, the defaults must change.
