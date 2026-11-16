# Create Beat — Visual, Interaction & Behaviour Specification

Implementation spec for the **Create Beat** page: choosing the rep and the beat's dates, building
each day's visits from the map, the selection panel, the Add / Edit Visit dialog, reordering visits
by drag and by keyboard, the rep's unassigned visits, and Save / Cancel. It covers every state and
every case the prototype handles, with the exact visual values a build needs.

The **map toolbar** (module menu, Filter, pagination, Records per Page) is specified separately in
`record-filter-pagination-spec.md` and is not repeated here.

Anything marked **▸ Assumed** is a decision taken to keep the spec complete; anything marked
**▸ Open** is not decided yet. Both are listed again in §20.

Reference build: `create-beat.html`; logic in `src/create-beat-visits.js`; styles in
`src/style-create-beat.css` (the "Visits" section); the day chevron in `src/day-chevron.css`;
shared components `src/cb-menu.js` (dropdown menu), `src/record-picker.js` (Module & Record
lookup) and `src/time-picker.js` (time component). All copy is in content keys (§19).

---

## 1. At a glance

| Area | Behaviour |
|---|---|
| Page | Header (title · Cancel · Save) over a 440px left panel and the map |
| First state | Only **Assign Rep** works. Beat Duration is locked. The map is dimmed, shows no pins and its controls are off |
| Dates | Browser date pickers. No past start; at most **30 days** counting the start. A first start date fills the end with the same date |
| Days | One card per calendar date. One day is always **selected**; any number can be **open** |
| Adding visits | Click a pin, lasso pins, or **Add Visit**. Picks go to a selection panel first, then to the selected day |
| A visit row | Number · name • module · visit type • minutes box · edit · remove. Drag handle on hover |
| Reordering | Drag (within a day or across days) or ↑ / ↓ on the handle. A moved visit lands with a yellow fade |
| Order flag | **Maintain Visit order** checkbox on days with 2+ visits. Ticked = the route isn't optimized on save |
| Date changes later | Days stay on their calendar dates. A change that would drop a day with visits is refused |
| Rep change | Instant, no dialog; every visit stays. The rep's availability is checked on save (server) |
| Save | Refused while any day is empty. Otherwise "Beat saved successfully" and the page resets |
| Cancel | Leave-page dialog when there is anything to lose |

---

## 2. Page layout and base tokens

### 2.1 Colour and type tokens used throughout

| Token | Value | Use |
|---|---|---|
| Base text | `#313949` | Body text, names, values |
| Label | `#616e88` | Field labels, secondary text, dates, module names |
| Heading | `#202123` | Panel and dialog titles |
| Paragraph | `#434d5e` | Meta lines, tooltip lines |
| Link / focus blue | `#5464f2` | Links, focus borders, selected day border, checkbox fill |
| Primary button | gradient `#124dc3` (bottom) → `#5767f6` (top) | Primary buttons |
| Disabled primary | `#adb3ee` | Save while it can't be used |
| Input outline | `#c0c8e2` | Every input and small dropdown at rest |
| Placeholder | `#8c91ab` | Placeholders |
| Card border | `#dcdbee` | Day cards, sheet header rules, list rules |
| Bullet | `#9c9ca6` (headers), `#8b9bb8` (visit rows) | The "•" between parts of a line |
| Menu outline / hover | `#ced0e1` / `#f2f5fe` | Dropdown menus |
| Font | Zoho Puvi (fallback Puvi, system sans) | Everything |

### 2.2 Header

| Part | Spec |
|---|---|
| Bar | White, `padding 8px 15px`, bottom border `1px #d7e2ed` |
| Title "Create Beat" | 18px / 600, base text |
| Cancel | Default button (§2.4) |
| Save | Primary button; disabled look (`#adb3ee`, not-allowed cursor) until enabled (§17.1) |
| Gap between buttons | 10px |

### 2.3 Left panel

- Width **440px**, white, shadow `0 2px 8px rgba(0,0,0,0.15)`, scrolls vertically.
- Holds **three views**, one at a time (§4): Beats Information · Records selected · Unassigned visits.
- Beats Information view padding: `15px 15px 70px`. The other two views fill the panel edge to edge.

### 2.4 Buttons

| Button | Height | Padding | Look |
|---|---|---|---|
| Default (Cancel, Stay Here…) | 32px | `7px 11px 7px 13px` | Gradient `#ffffff` (1.4%) → `#f1f0f7`, border `1px #d5d8e9`, radius 6, 14px / 500 base text |
| Primary (Add Visits, Add, Done) | 32px | `8px 12px 8px 14px` | Primary gradient, radius 6, 14px / 500 white |
| Danger (Yes, Leave Page) | 32px | `8px 12px 8px 14px` | Gradient `#f0003a` (bottom) → `#ff3a60` (top), white |
| Outline blue (Assign) | 32px | `7px 11px 7px 13px` | `#f0f1ff` fill, border `1px #5464f2`, 14px / 500 blue; hover fill `#e4e7ff` |
| Blue ghost (Preview) | 32px | `8px 12px 8px 14px` | No fill, 14px / 500 blue; hover fill `#f0f1ff` |
| Small blue ghost (Apply to all) | 27px | `6px 10px 6px 12px` | 13px / 500 blue + 10×5 blue caret; hover/open fill `#f0f1ff`, radius 4 |

Hover on default / primary / danger: brightness 0.98. Disabled primary: `#adb3ee`, no shadow, not-allowed cursor.

---

## 3. Order of setup (first state)

The page opens in this state and unlocks step by step:

| Step | Assign Rep | Beat Duration | Visits Information | Map |
|---|---|---|---|---|
| Nothing chosen | Enabled, "Select" | **Disabled** (§5.2) | Hidden | Dimmed, pill message, no pins, controls off |
| Rep chosen | Shows the rep | **Enabled** | Hidden | Same as above |
| Rep + both dates valid | — | — | Shown with day cards | Pins shown, controls on, pill gone |

**Map empty state** (until the rep and both dates are valid):

- An overlay over the whole map: `rgba(244,245,250,0.55)`. It blocks panning and wheel zoom.
- Centred pill: white, border `1px #e2e4ee`, radius 100px, `padding 7px 16px`, 13px / 18px, label
  colour, text "Choose a rep and dates to see records".
- Map pins are **not drawn**.
- Map controls — lasso, locate, zoom in, zoom out, Layers — are **disabled**: opacity 0.45,
  not-allowed cursor, no clicks.
- The toolbar (module, Filter, pagination) stays usable.

---

## 4. Left-panel views

| View | When it shows | Header | Footer |
|---|---|---|---|
| Beats Information | Default | — | — |
| Records selected | After a pin click or a lasso adds records (§9) | "4 records to [Day ▾]" · Apply to all | Cancel · Add Visits |
| Unassigned visits | "View & Assign" in the yellow note (§13) | ← back · "Unassigned visits" | — |

Sheet header (both sheet views): height 50px, `padding 10px 10px 10px 15px`, bottom border
`1px #dcdbee`, title 15px / 600 heading colour. Sheet footer: `padding 11px 15px 11px 10px`,
top border `1px #d7e2ed`, buttons right-aligned, 12px apart. The list between them scrolls.

---

## 5. Beats Information: rep and dates

### 5.1 Assign Rep

- Field row: label column 90px, right-aligned, 14px label colour; 9px gap; control fills the rest.
- Control: 34px high, border `1px #c0c8e2`, radius 6, `padding 0 10px 0 13px`, 14px text,
  10×5 caret (rotates 180° while open; border turns blue while open).
- Placeholder "Select" in placeholder colour until a rep is picked.
- Menu: the shared dropdown menu, full field width, a tick on the current rep.
- Changing the rep: §16.

### 5.2 Beat Duration

- Two joined boxes (start · end), each `flex: 1`, 34px high, `padding 0 8px 0 13px`; the left
  box has radius `6px 0 0 6px`, the right `0 6px 6px 0`, overlapping by 1px.
- Each box holds the **browser's own date input**. Its calendar icon is hidden; **a click anywhere
  in the box opens the calendar**, and the date can still be typed while it is open.
- Empty: the browser's dd/mm/yyyy prompt in `#7c8bae`.
- Disabled (no rep yet): fill `#f5f6f8`, border `#d2d9f1`, text `#a4abc7`, not-allowed cursor.
- Focus: border blue. Invalid: border `#ff5d5a`.

### 5.3 Date rules

| Rule | Behaviour |
|---|---|
| Start in the past | Blocked by the picker's minimum (today). If typed: message "The start date can't be in the past" |
| End before start | Picker minimum is the start. If typed: "The end date can't be before the start date" |
| More than 30 days | Picker maximum is start + 29 days. If typed: "A beat can run for up to 30 days" |
| First start date, end empty | The end fills with **the same date** (a one-day beat) |
| Message style | 11px / 13px `#ff5d5a`, 4px under the boxes; the offending box gets a red border |
| Holidays, weekends | Included — one day card per calendar date |

**While the dates are invalid or half-filled** and day cards already exist, the cards stay on
screen at **50% opacity**, locked (no pointer events), until both dates are valid again.

Changing the dates once visits exist: §15.

### 5.4 Unassigned visits note

- Shows only when the rep and dates are valid **and** the rep has unassigned visits.
- Yellow note: fill `#ffffea`, border `1px #e5dec5`, radius 6, `padding 7px 14px`, 20px under the
  dates. Warning icon 16px at 70% opacity; text 13px / 18px `#56564d`
  ("3 unassigned visits for this rep" / "1 unassigned visit for this rep"); link "View & Assign"
  14px / 500 blue, underline on hover.

---

## 6. Day cards

### 6.1 Structure and states

One card per date, 15px apart, under the heading "Visits Information" (14px / 600 heading colour,
10px above the cards).

| State | Look |
|---|---|
| Card at rest | White, border `1px #dcdbee`, radius 15, padding `10px 15px 12px` |
| Selected | Border `2px #5464f2`; padding `9px 14px 11px` so the card keeps its size |
| Folded | Only the header row; pointer cursor over the whole card |
| Open | Header + body (§6.3) |
| Waiting for a drop | Border `#5464f2`, fill `#f7f8ff` (§11.4) |

### 6.2 Header row

`Chevron · Day 1 • 4 May · [sort icon] · 4 visits`, min-height 32px, items 10px apart.

| Part | Spec |
|---|---|
| Chevron | Shared day chevron: 12×6 triangle, 24×24 hit area (6px padding, −6px margin), radius 4. Points right when folded, down when open; rotates in 0.18s. Hover fill `rgba(97,110,136,0.12)`. Focus ring `2px #5464f2` |
| Alignment | The chevron's centre sits on the **timeline rail** (§6.4): 14px into the card's content. The title starts 16px after that centre |
| Title | "Day 1" 14px / 600 base · " • " `#9c9ca6` · "4 May" label colour |
| Sort icon | Only on a **folded** day with Maintain Visit order ticked: 15px sort icon, blue, hint "Visit order maintained — route won't be optimized" |
| Count | Right edge, 14px / 400 base: "1 visit" / "4 visits"; nothing when the day is empty |

### 6.3 Open / fold / select rules

| Click | Folded day | Open day, not selected | Open day, selected |
|---|---|---|---|
| Anywhere on the card | Opens **and** selects it | Selects it (stays open) | Nothing |
| The chevron | Opens and selects it | Folds it | Folds it; **it stays selected** |
| A control inside (dropdown, minutes, edit, remove, time) | — | Does only that control's action; does not select | Same |
| Add Visit | — | Selects the day, then opens the dialog | Opens the dialog |

- A day is **always** selected (Day 1 at first). Folding never removes the selection.
- Several days may be open at once (no accordion).
- On an open card only the chevron shows the pointer cursor.

### 6.4 Open body: the route

```
◉  [Home ▾]  at  [9:00 AM ▾]                 ← start
   789 Pine Road, Hillcrest, CA 92040
①  Vikram Reddy Visit • Contacts             ← visits (§7)
   Order Delivery • [ 10 ]
②  …
⊕  Add Visit
◉  [Office ▾]                      Preview   ← end
   123 Maple Street, Springfield, IL 62…
☑  Maintain Visit order ⓘ                    ← order strip (§8), 2+ visits only
```

- **Timeline rail**: 1px `#d6d6e3`, 13.5px from the content's left edge, from the start icon's
  centre to the end icon's centre. Icons, numbers and the Add Visit circle sit **above** it.
- **Start / end icons**: 28px circles, white, border `1px #edf0f4`, 16px location icon
  (green start, red end). Icon to text: 14px.
- **Start row**: `padding-top 8px`; address dropdown (93px) · "at" (14px label colour) · start
  time; address line under it, 14px / 20px label colour, 6px gap, 6px bottom padding.
- **End row**: `padding 14px 0 6px`; address dropdown (93px); address line on one line with
  ellipsis; Preview at the right, bottom-aligned, 81px wide (§6.7).
- **Add Visit row**: `padding 8px 0`; 28px circle, dashed `1px #abb3ff`, 12px blue plus; 16px gap;
  "Add Visit" 14px / 500 blue, underline on hover. Opens the Add Visit dialog for that day.
- **Empty open day** (no visits): 72px high, centred, 14px label colour:
  "Pick records on the map or" + link "Add Visit".

### 6.5 Address dropdowns (start / end)

- Small dropdown: 25px high, border `1px #c0c8e2`, radius 5, 3px marker slot, 13px value,
  10×5 caret 8px from the right. Open: blue border, caret rotated.
- Menu (min-width 275px): each option shows the name (13px, base; **semibold when selected**, with
  a tick) over its address (11px label colour, ellipsis). Options: Home, Office, Event Location,
  Warehouse — from the rep's Address Book. A rule above **New Address** (13px blue), which does
  nothing yet (**▸ Open**).
- Defaults: start **Home**, end **Office**.

### 6.6 Start time

- Beat Detail's time component **without its box**: 96px wide, 27px high, no border, 13px text,
  caret 8px from the right. Hover / focus: fill `#f5f6fb` only.
- Behaviour is the shared time component's: segments (hour · minute · AM/PM), typed or picked
  from a list of half-hour times. Default **9:00 AM**.
- Each day keeps its own time; it survives re-renders and date changes.

### 6.7 Preview

- Not built yet. Shown greyed (`#a4abc7`), default cursor, no hover fill.
- Hover or focus shows a dark hint above it (`#313949`, white 12px, radius 4, `padding 6px 10px`):
  "Coming soon". Screen readers hear "Preview, Coming soon"; `aria-disabled="true"`.

---

## 7. A visit row

### 7.1 Layout and typography

```
[⋮⋮] (1)  Vikram Reddy Visit • Contacts           [✎] [✕]
          Order Delivery • [ 10 ]
```

| Part | Spec |
|---|---|
| Row | `padding 10px 0` (first row `2px` top), items centred, 5px gap, grab cursor |
| Number | 28px circle, white, border `1px #c3c9d6`, 13px / 500 base text; fits two digits |
| Details | `padding 4px 11px`; two lines 4px apart |
| Line 1 | Name **15px / 600** base (ellipsis when long) · " • " 14px `#8b9bb8` · module 14px / 400 label colour (never truncated) |
| Line 2 | Visit type 14px label colour (ellipsis if needed) · " • " `#8b9bb8` (6px each side) · minutes box |
| Edit / remove | 24px round buttons, 12px pencil / 9.5px close; hover fill `#f1f0f7`. Hidden until the row is hovered or has focus |
| Visit name | "{record} Visit" (content key) |

### 7.2 Hover

- A tint `#f7f8fb` across the card's full inner width behind the row.
- The drag handle (§10.1) and edit / remove appear.
- **No hover tint while a landing highlight is showing** (§10.5).

### 7.3 Minutes box

- 72 × 25px, border `1px #c0c8e2`, radius 5, `padding 0 8px`, 13px, no unit label.
- Hover: border `#a6b0d6`, glow `0 0 6px rgba(84,100,242,0.12)`. Focus: border `#5464f2`, glow
  `0 0 6px rgba(84,100,242,0.25)`. Transitions 0.2s.
- Starts at the **visit type's default minutes**.
- Digits only, 3 characters max (letters are stripped as typed). Enter commits (blurs).
- Validated when it loses focus:

| Value | Result |
|---|---|
| 1–480 | Saved |
| Empty | Red border + "Enter the visit time in minutes" |
| 0 | Red border + "Visit time must be at least 1 min" |
| Over 480 | Red border + "Visit time can't be more than 480 mins" |

  The message sits under line 2 (11px / 13px `#ff5d5a`). The visit **keeps its last valid value**
  until the box is fixed. Clicking into the box never starts a drag.

### 7.4 Edit and remove

- **Edit** opens the Edit Visit dialog (§12).
- **Remove** takes the visit off at once and shows a success message "{name} removed" with
  **Undo**, which puts it back in the same position (unless the same record was re-added to that
  day meanwhile).

---

## 8. Maintain Visit order

### 8.1 What it means

Each day has an **order flag**. Visits are numbered in the order they are added. Route
optimization happens **only on save**, and skips days whose flag is on: those keep the order shown.

| Event | Flag |
|---|---|
| Visits added (map, dialog, unassigned) | Unchanged; new visits always join the **end** |
| Ticking the checkbox | On — the order shown is kept, no dragging needed |
| Unticking | Off — the order on screen stays; save will optimize it |
| Drag within the day that changes the order | On (ticks the box) |
| Keyboard ↑ / ↓ | On |
| Drop into another day between its visits | On for that day |
| Drop at the end of another day (or onto a folded / empty day) | Unchanged for that day |
| The day it was dragged from | Unchanged |
| Remove a visit | Unchanged |
| Day falls below 2 visits | **Cleared** (and the checkbox disappears) |
| Dragging back to the original order | Stays on |

### 8.2 The strip

- Shown on **open days with 2 or more visits**. Not shown on empty days, folded days, or days with
  one visit.
- A strip across the card's foot, edge to edge inside the border: fill `#f3f5ff`, top border
  `1px #d9defc`, radius `0 0 13px 13px`, 12px above it; `padding 8px 15px 8px (pad + 6.5px)`.
- The **whole strip is the click target** (a label); hover fill `#e9ecfe` (0.15s).
- Checkbox 15px, **centred on the timeline rail**: unticked white with `2px #c0c8e2` border,
  radius 3; ticked blue fill with white tick. Focus ring `2px #5464f2`, offset 2px.
- Label "Maintain Visit order", **14px / 500** base text, 10px from the box.
- Info icon 15px, **label grey**, 6px after the label. Hover / focus shows the dark hint
  "Route won't be optimized for this day" above it. **Clicking the icon does not toggle** the box.

---

## 9. Picking records from the map

### 9.1 Pins

- Pins appear only once the rep and dates are valid (§3). One colour for every module.
- Size 24 × 34.29px at every zoom level; the tip marks the location. Hit area 28px wide.

| State | When | Look |
|---|---|---|
| Unselected | Not on any day, not picked | White pin, `#5464F2` outline, 12px `#5464f2` dot |
| Selected | Ticked in the Records selected panel (only while it is open) | `#C35BF4` pin, 14px white ring (2px) |
| Selected, current day | On the **selected** day | `#C35BF4` pin, 18px white ring (1.5px), the visit's number in white 14px / 600 (11px when 10+) |
| Selected, other day | On another day only | As Selected, at 80% opacity |

Priority when several apply: Selected (panel) → current day → other day → unselected.

### 9.2 Hover card on a pin

- Only for pins that are already visits. Shows the selected day's visit if the record is there,
  otherwise the first day that has it.
- White, border `1px #cacaca`, radius 6, padding 15px, shadow `0 2px 4px rgba(0,0,0,0.3)`,
  lines 8px apart:
  - "Day 1 “Jordan Smith Visit”" 14px / 600 `#313949`
  - "Gate Approval • 10 mins" 14px / 20px `#434d5e` (bullet `#9c9ca6`, 6px each side)
  - "Contacts"
- Placed above the pin: left edge 39px left of the pin's tip, bottom 10px above the pin's top; a
  12px arrow at 32px from the left points down at the pin.
- Hidden when the pointer leaves the map, while dragging the map, in lasso mode, and on any
  re-render. Pointer cursor over a pin.

### 9.3 Clicking a pin

| Pin | Panel closed | Panel open |
|---|---|---|
| Already on the **selected** day | Nothing (skipped quietly) | Nothing |
| Not in the panel | Opens the panel with this record ticked | Adds it to the list, ticked |
| Already in the panel | — | Toggles its tick |
| Dragging the map | A click after a pan is ignored | Same |

A record **can** be on several days, but **never twice on the same day**.

### 9.4 Lasso

- The lasso button is a **toggle with two icons**: off → lasso icon, label "Lasso select";
  on → **cursor icon**, label "Back to cursor", active fill `#eef0fe`, blue icon.
- While on: crosshair cursor; a press on the map **draws** instead of panning; a dark pill at the
  bottom centre of the map says "Draw around pins to select them" (`rgba(32,33,35,0.86)`,
  12.5px white, radius 100px, `padding 7px 14px`).
- The drawn shape: dashed `1.5px #5464f2` (4 / 4 dashes), fill `rgba(84,100,242,0.08)`.
- On release, every visible pin inside the shape is added to the panel (same rules as §9.3: pins
  on the selected day are skipped). The shape then clears.
- The lasso **stays on** for more drawing until the button is clicked again or **Esc** is pressed
  (Esc is not advertised in the hint). It also turns off when the map locks (§3).

### 9.5 Records selected panel

- Header: **"4 records to [Day 1 • 15 Nov ▾]"** — the count (15px / 600, ellipsis) reads straight
  into a day dropdown (small dropdown, 128px), 8px apart; **Apply to all ▾** on the right.
  "1 record to" for one.
- The **day dropdown** starts on the selected day. Changing it **changes the selected day** (and
  opens it), so the pins and the skip rule follow.
- Rows: `padding 10px 12px 10px 10px`, rule `0.5px #dcdbee`:
  - checkbox in a 24px hit area (unticked: white, `2px #c0c8e2`, radius 3; ticked: blue)
  - name ("{record} Visit") 14px / 500 base + module 13px label colour, both ellipsis
  - visit type small dropdown, 160px, defaulting to the **first visit type**
- **Unticking** a row frees its pin but keeps the row until Add Visits or Cancel.
- **Apply to all** sets the chosen visit type on **every row, ticked or not**. Its menu lists the
  visit types (min-width 160px, right-aligned).
- More pin clicks or lassos, even after switching module in the toolbar, **add to the same list**.
- The count counts **ticked** rows only. **Add Visits** is disabled when none are ticked.
- **Add Visits**: ticked rows become visits at the end of the selected day (records already on that
  day are skipped), with their visit type and its default minutes. The day opens; the panel closes.
- **Cancel**: discards the whole list and returns to Beats Information.

---

## 10. Reordering visits

### 10.1 Drag handle

- A ⋮⋮ grip (5 × 10px icon) in the card's left padding, vertically centred on the row: a 16 × 24px
  hit area at −13px, shown on row hover or keyboard focus, grab cursor, focus ring `2px #5464f2`.
- The handle is a real button (Tab-focusable) with the label
  "Reorder {name}. Use the up and down arrow keys to move it."

### 10.2 Starting a drag

- Press on the row (or the handle) and move **4px** — then the drag starts. Presses on inputs,
  buttons (other than the handle) and the time picker never start a drag.
- Open menus close.
- The **floating chip** follows the pointer: white, border `1px #dcdbee`, radius 7,
  `padding 7px 8px 7px 3px`, shadow `0 4px 9px rgba(49,57,73,0.6)`, holding the ⋮⋮ icon and the
  row's line 1 (name • module). The point grabbed keeps its place under the pointer.
- The row stays behind as an **empty slot**: its number stays; its details area becomes an empty
  box (`#f3f5ff`, radius 6, inset `1px #b9c3fa`); edit / remove and the handle hide.
- Everything shows the grabbing cursor; text selection is off; row hover effects are off.

### 10.3 Moving

- The slot moves live to where the visit would land (before the first row whose middle is below
  the pointer).
- **Numbers are positions**: while the slot moves they stay 1, 2, 3… down each list; they don't
  travel with the dragged visit.
- Near the panel's top or bottom edge (within 40px) the panel scrolls 12px per move.
- **Blocked target**: a day that already has this record refuses it — the chip fades to 55% and a
  drop does nothing.

### 10.4 Over a folded day

| Action | Result |
|---|---|
| Passing over quickly | Nothing opens |
| Over it | The card shows the drop look (blue border, `#f7f8ff`) |
| Released quickly | The visit is added as that day's **last visit**; the day opens |
| Held **600 ms** | The day opens and the slot moves into its list, so the visit can be placed anywhere |
| Over an empty open day | Drop look; a drop adds the visit to it |

### 10.5 Dropping

- The visit moves; the target day opens; flags follow §8.1.
- **Landing highlight**: the moved row shows `rgba(239,202,9,0.2)` (`#EFCA09` at 20%) across the
  card's full inner width. It **appears at once, holds for the first 20% of 1.6s, then fades out**
  (ease-out, 1.6s total). No blinking.
- **While the highlight shows, the row's hover tint is suppressed**; it returns after the fade.
- The click that follows a drop is ignored (it never folds or selects a day).
- **Esc** during a drag cancels it; the visit returns to where it was.
- Releasing outside any day cancels the drag.

### 10.6 Keyboard

- Focus the handle (Tab), then **↑ / ↓** moves the visit one place within its day (no wrap at the
  ends). Sets the day's flag. Focus stays on the handle in the new place.
- Screen readers hear "{name} moved to position {n} of {total}" (polite live region).
- The landing highlight shows after each move.

---

## 11. Map picks vs. day targets — summary

| Source | Goes to | Order |
|---|---|---|
| Pin click / lasso → Add Visits | The selected day (or the day chosen in the panel's dropdown) | End |
| Add Visit (day card) | That day | End |
| Unassigned → Assign | The day chosen on the card (default: selected day) | End |
| Drag | Wherever it is dropped | Chosen |

---

## 12. Add Visit and Edit Visit dialog

### 12.1 Shell

- Overlay `rgba(32,33,35,0.45)`, fades in 0.16s. The dialog **drops from the top edge**
  (translateY −16px → 0, 0.2s), 582px wide, radius `0 0 15px 15px`, shadow
  `0 4px 18px rgba(49,57,73,0.6)`.
- Header `padding 25px 30px 15px`; title 20px / 600 heading (the "•" in the title 18px / 400).
- Body `padding 0 30px`, rows 20px apart. Each row: label 112px, right-aligned, 14px label colour,
  9px top padding; 20px gap; control 390px.
- Footer `padding 30px`: Cancel (default) · Add / Done (primary), 10px apart.
- Esc or a click on the overlay closes it without saving.

### 12.2 Fields

| Field | Add | Edit | Spec |
|---|---|---|---|
| Title | "Add Visit for “Day 2 • 5 May”" | "Edit “{name}”" | |
| Module & Record | ✓ mandatory | hidden | The shared record lookup: module switcher + search, searches **across modules**. Records **already on this day are left out**. Red mandatory strip |
| Visit Type | ✓ mandatory | ✓ | Select, 34px, the visit type list; placeholder "Select Visit Type". Red strip in Add |
| Visit Time | ✓ | ✓ | Minutes box with unit: 200 × 34px, input + divider + "min" (14px / 500 label). **Disabled until a type is chosen**, then fills with the type's default minutes; changing the type resets it to the new default. Digits only, 3 max |
| Description | ✓ | ✓ | Textarea 76px high, resizable vertically |
| Visit Location Pic | ✓ | ✓ | Read-only box "Upload your file" + 32px icon cell `#f4f4f6`. **Dummy** — does nothing yet |
| Location Status | ✓ | ✓ | Select "Select Status". **Dummy** — no options yet |

### 12.3 Validation (on Add / Done)

| Case | Message (11px `#ff5d5a` under the field; field border red) |
|---|---|
| No record (Add) | "Select a record" |
| No visit type | "Select a visit type" |
| Visit Time empty | "Enter the visit time in minutes" |
| Visit Time 0 | "Visit time must be at least 1 min" |
| Visit Time > 480 | "Visit time can't be more than 480 mins" |

A message clears as soon as its field is changed. On success: Add appends the visit to the end of
the day; Done updates the visit in place.

---

## 13. Unassigned visits

- Opened from the yellow note's **View & Assign**. Header: back arrow (16px) + "Unassigned visits".
- Each card: `padding 16px 4px 20px`, 16px side margins, rule `1px #dcdbee` under it, 15px gaps:
  - name 14px / 600 heading + due date at the right 13px / 500 label colour
  - "{type} • {frequency}" 13px / 18px label colour (e.g. "Product Sales • Weekly")
  - "Assign" label (14px label colour) · day dropdown (34px, fills the row, shows
    "Day 1  •  4 May") · **Assign** outline-blue button, 20px apart
- The day dropdown **defaults to the selected day**.
- **Assign**: the visit joins the end of that day with its own visit type and that type's default
  minutes; the card leaves the list; the note's count drops (the note disappears at 0); success
  message "{name} assigned to Day 1 • 4 May" with **Undo** (puts the card back in its place and
  removes the visit).
- Empty list: "No Unassigned visit records", centred, 14px placeholder colour.
- No capacity or distance warnings.

---

## 14. Messages (toasts)

- Top centre, 60px from the top, above everything; slides down 8px and fades in (0.18s).
- `padding 9px 14px`, radius 6, shadow `0 2px 3px rgba(0,0,0,0.3)`, 14px / 500 text, close ✕
  (16px hit area) at the right. Stays **8 seconds** or until closed; a new message replaces the
  current one.

| Kind | Fill / border | Icon | Text colour | Used for |
|---|---|---|---|---|
| Success | `#f5faf5` / `#a9d3ab` | Green tick 22px | `#132c14` | Saved, assigned, removed |
| Warning | `#fffbeb` / `#f1d48b` | Amber triangle 16px | `#56430b` | A refused date change |
| Error | `#fff4f4` / `#f5b3b3` | Red triangle 18px | `#8a1c1c` | Save with empty days |

- **Undo** (where offered): 14px / 500 blue, 20px after the text, underline on hover. The close
  button sits 48px after it.
- Warning and error text may wrap; success text stays on one line.
- Error messages are announced as alerts; the others as status.

---

## 15. Changing the dates after visits exist

Days are bound to their **calendar date**: a visit stays on its date whatever the range becomes.
Day numbers follow the dates.

| Change | Result |
|---|---|
| Earlier start | Empty days are added at the front; later days renumber (21 Nov stays 21 Nov, now "Day 4") |
| Later end | Empty days are added at the end |
| Later start / earlier end that drops **empty** days | Those days are removed |
| …that would drop a day **with visits** | **Refused.** The old date goes straight back into the box, and a **warning** message says "Some of these days have visits. Move the visits to other days, then change the dates." No inline error |
| The selected day is dropped | The **nearest** remaining day becomes selected (and opens) |
| Open / folded state, start times, order flags | Kept for every day that remains |

The browser picker cannot grey out single days, so blocked dates can still be clicked; they just
never apply.

---

## 16. Changing the rep

- **No dialog.** Records and modules are shared by every rep, so the beat stays exactly as planned:
  days, visits, minutes, order, flags, start / end and start times.
- The Unassigned visits list switches to the new rep's own list.
- Picking the same rep again does nothing.
- **▸ Server-side, not in the prototype:** on Save, if the new rep can't take some of the beat's
  dates (leave, another beat), Save is refused with an error naming those dates.

---

## 17. Save and Cancel

### 17.1 Save

| State | Save |
|---|---|
| No rep, invalid dates, or no visit on any day | Disabled |
| At least one day has a visit | Enabled |
| Clicked while **any day is empty** | Nothing is saved; **error** message "Some days have no visits. Add visits to every day, or change the dates to leave the empty days out." |
| Clicked with every day filled | **Success** message "Beat saved successfully"; the page resets to its first state (§3) — rep cleared, dates cleared and locked, days, picks and unassigned list reset, panel scrolled to the top |

On save the server optimizes the route of every day whose Maintain Visit order is off.

### 17.2 Cancel

- Nothing planned (no visits, no picked records): goes straight to the beat list.
- Otherwise a dialog (same shell as §12.1, 480px wide):
  - title "You have not saved your changes."
  - text "Are you sure you want to move away from this page?"
  - **Stay Here** (default button, gets focus) · **Yes, Leave Page** (danger button → beat list)
- Esc or a click outside = Stay Here.

---

## 18. Accessibility

- Every icon-only control has a label: chevron ("Show / Hide Day 1 visits"), edit / remove
  ("Edit / Remove {name}"), drag handle, lasso ("Lasso select" / "Back to cursor"), date boxes
  ("Start date" / "End date"), minutes box ("Visit time for {name}: 10 mins"), picked-row
  checkbox ("Include {name}") and type ("Visit type for {name}: {type}"), panel day dropdown
  ("Add to: {day}"), unassigned day ("Day for {name}: {day}"), back arrow, toast close.
- The chevron, menus and checkboxes expose `aria-expanded` / `aria-checked`.
- Keyboard reorder announces its result (§10.6).
- Focus rings: `2px #5464f2` on the chevron, handle and checkboxes; blue borders on inputs.
- `prefers-reduced-motion`: no chevron rotation, no dialog or toast motion.

---

## 19. Content keys

All copy is a content key in `content/strings.json`, edited by the PM in the Create Beat page of
the strings sheet (`content/create_beat_strings.csv`). Placeholders in `{braces}` are filled by the
page and must be kept. Plural pairs use `.one` / `.other`. Keys are prefixed `createBeat.`:

| Area | Keys |
|---|---|
| Header | `header.title`, `header.cancel`, `header.save` |
| Rep and dates | `info.title`, `info.rep.label`, `info.rep.placeholder`, `info.duration.label`, `info.startDate.ariaLabel`, `info.endDate.ariaLabel`, `info.error.pastStart`, `info.error.endBeforeStart`, `info.error.tooLong` |
| Unassigned note | `unassigned.banner.one/.other`, `unassigned.banner.link` |
| Day card | `visits.title`, `day.title`, `day.count.one/.other`, `day.expandAriaLabel`, `day.collapseAriaLabel`, `day.empty`, `day.addVisit`, `day.at`, `day.start.ariaLabel`, `day.startTime.ariaLabel`, `day.end.ariaLabel`, `day.preview`, `day.previewSoon`, `day.maintainOrder`, `day.maintainOrderTip`, `day.customOrder`, `address.new` |
| Visit row | `visit.name`, `visit.duration.mins`, `visit.duration.ariaLabel`, `visit.edit.ariaLabel`, `visit.remove.ariaLabel`, `visit.move.ariaLabel`, `visit.moved` |
| Records selected | `picked.countTo.one/.other`, `picked.day.ariaLabel`, `picked.applyAll`, `picked.check.ariaLabel`, `picked.type.ariaLabel`, `picked.cancel`, `picked.add` |
| Unassigned visits | `unassigned.title`, `unassigned.back.ariaLabel`, `unassigned.repeat`, `unassigned.assign.label`, `unassigned.day.ariaLabel`, `unassigned.assign.button`, `unassigned.empty` |
| Map | `map.empty`, `tooltip.title`, `lasso.ariaLabel`, `lasso.offAriaLabel`, `lasso.hint` |
| Dialog | `modal.add.title`, `modal.edit.title`, `modal.record.label/.placeholder`, `modal.type.label/.placeholder`, `modal.time.label`, `modal.time.unit`, `modal.desc.label`, `modal.pic.label/.placeholder`, `modal.status.label/.placeholder`, `modal.error.record`, `modal.error.type`, `modal.error.time`, `modal.error.timeMin`, `modal.error.timeMax`, `modal.cancel`, `modal.add.submit`, `modal.edit.submit` |
| Leave dialog | `confirm.leave.title`, `confirm.leave.body`, `confirm.leave.stay`, `confirm.leave.submit` |
| Messages | `toast.saved`, `toast.assigned`, `toast.visitRemoved`, `toast.visitsOnDays`, `toast.emptyDays`, `toast.undo`, `toast.dismiss.ariaLabel` |

---

## 20. Data sources, limits and open items

### 20.1 Prototype data to replace

| Data | Prototype | Real source |
|---|---|---|
| Reps | Five hard-coded names | Users who can take beats |
| Modules | Leads, Contacts, Deals, Vendors | Modules chosen in Planner Configuration |
| Visit types + default minutes | Order Delivery 10, Gate Approval 10, Shop Delivery 10, Order Approval 15, Quality Check 30, Client Meeting 30, Product Sales 30, Product Demo 45 | Planner Configuration (one list for every module) |
| Addresses | Home, Office, Event Location, Warehouse | The rep's Address Book |
| Unassigned visits | Three examples per rep | The rep's visits not on any beat |
| Records / pins | Generated per module | Module records with a location |

### 20.2 Limits

| Limit | Value |
|---|---|
| Beat length | 30 days, counting the start |
| Visit time | 1–480 minutes, whole numbers |
| Visits per day | No cap in manual creation |
| Records per map page | 50 (toolbar spec) |
| Fold-open delay while dragging | 600 ms |
| Drag start distance | 4px |
| Landing highlight | 1.6s |
| Message display | 8s |

### 20.3 Not built yet

- **Preview** (the day's route on the map).
- **New Address** in the address menus.
- **Visit Location Pic** and **Location Status** in the dialog (dummy fields).
- **Rep availability check on Save** (server, §16).
- **Route optimization on Save** (server, §17.1).

### 20.4 Open questions

- **▸ Open** Days a rep can't take: what makes a day unavailable (leave, another beat, holiday,
  weekly off), what reason each shows, and whether a beat may span such a day. Showing the reason
  needs a custom calendar in place of the browser's picker.
- **▸ Open** The rep-availability error on Save: name the dates only, or offer a way to them?
- **▸ Open** Visits assigned from the old rep's unassigned list stay on the beat after a rep
  change. Should they go back to that rep's list instead?
- **▸ Open** Location Status options.
- **▸ Assumed** The first visit type in the list is each picked row's default type.
- **▸ Assumed** Start Home → End Office at 9:00 AM is the default for every new day.
