# Beat Planner — Architecture & Requirements Reference

> **Purpose of this file:** Consolidated reference for the Zoho CRM **Beat Planner** (Field Sales) project, distilled from the 5 PM/Dev architecture PDFs. This is the standing context for what we're building. Requirements **may change** — treat this as a living document, not a frozen spec.
>
> **Source docs:** (1) Data Model & Common Reference, (2) Auto Beat Creation, (3) Beat Distribution, (4) Manual Beat Creation & Approval, (5) CRM-Side Architecture.
> **Phase:** Phase 1 — single planner per app. **Partners:** CRM + RouteIQ. **Prepared:** Aug 2026.

---

## 0. The One Principle — "RouteIQ advises, CRM writes"

Across **every** functionality:

- **RouteIQ decides** *who* visits, on *which day*, and in *what order* (assignment + optimisation).
- **CRM decides** *what work exists* and **writes every record** (Beat, Beat Day, Visit).
- **RouteIQ never writes CRM records.** It returns results via callback (server flows) or in-browser (client library, manual flow).

Why CRM owns writes: single system of record, future-proof without partner dependency, no cross-system write coupling, clean separation of concerns, write-budget control.

---

## 1. The Big Picture — one Planner, three ways to make Beats

A **Planner** (master config) produces **Beats** via three flows:

| Flow | Planner type | Trigger | Optimisation | Approval? |
|------|--------------|---------|--------------|-----------|
| **Auto Beat Creation** | Top-Down only | Scheduler (auto) | RouteIQ server (async + callback) | No |
| **Beat Distribution** | Top-Down & Bottom-Up | Manager (manual, one-off) | RouteIQ server (async + callback) | No (never, even Bottom-Up) |
| **Manual Beat Creation** | Top-Down & Bottom-Up | Manager or Rep (manual) | RouteIQ **client library** (sync, in-browser) | Bottom-Up only, if planner requires |

**Hierarchy:** `Planner → Beat → Beat Day → Visit`

**Top-Down vs Bottom-Up:**
- **Top-Down** — managers plan for reps. Goes live immediately. No approval.
- **Bottom-Up** — reps self-assemble their own beats. If `Requires_Approval` is set, beat waits for the rep's **Reporting To** manager. Approval applies to Bottom-Up manual beats **only**.

---

## 2. Data Model

Four internal config modules, three user-facing custom modules, plus Users additions.

### 2.1 Planner Config (`Planner_Config__s`) — CONFIG, not tabbed
Master orchestrator. One planner per app (Phase 1). Parent of all Beat Distributions.

| Field | Type | Req | Notes |
|-------|------|-----|-------|
| `Name` | SingleLine | Yes | Planner label |
| `Type__s` | PickList | Yes | **Top-Down / Bottom-Up** — planning mode |
| `Requires_Approval__s` | Checkbox | No | **Bottom-Up only.** Rep's self-built beat must be manager-approved before proceeding. No effect on Top-Down/Auto |
| `Description__s` | MultiLine | No | Admin notes |
| `Allow_Adhoc_Visits__s` | Checkbox | No | Permits rep-created unplanned visits (`Is_Adhoc`) |
| `Involved_Reps__s` | Criteria | Yes | Rep pool this planner governs |

**Subforms/sections:**
- **Involved Module Criteria** (≥1 required): `Module_ID`, `Query_ID` (participating records), address field mappings (Street/City/State/Country/Pincode → build geocodable address).
- **Frequency Rules** (≥1 when Top-Down + Auto): `Module_ID`, `Query_ID`, `Meeting_Type_ID`, `Meeting_Frequency` (Daily/Weekly/Bi-weekly/Monthly, evaluated vs last completed visit).
- **Assignment Rules** (Auto only): `Module_Record_Query_ID`, `User_Criteria_Query_ID` (maps records → eligible users).
- **Beat Config:** `Auto_Beat_Creation` (checkbox), `Scheduled_Time` (default 8AM), `Max_Days_Per_Beat` (1–31), `Max_Upcoming_Beats` (1–5, capacity governor), `Max_Meetings_Per_Day` (1–25), `Next_Main_Run_Date`.
- **Route Config:** `Supported_Start_End_Location` (MSPickList: Home/Work/Custom — drives rep's Users picklists), `Max_Mileage_Per_Day` (km), `Buffer_Between_Meetings` (min), `Checkin_Radius` (m), `Checkin_Mode` (Automatic/Manual default).
- **Notification Config:** `In_App_Notification` (default on), `Email_Notification`.

### 2.2 Meeting Type Config (`Meeting_Type_Config__s`) — CONFIG
Meeting categories + completion requirements. Referenced by Frequency Rules, Distribution Source, and every Visit.

| Field | Type | Req | Notes |
|-------|------|-----|-------|
| `Type_Name__s` | SingleLine | Yes | Shown to reps |
| `Duration__s` | Number (min) | Yes | RouteIQ uses to compute planned end times + pack a day |
| `Notes_Required__s` | Checkbox | No | Notes mandatory before Completed |
| `Attachments_Required__s` | Checkbox | No | Attachment mandatory before Completed |
| `Description__s` | MultiLine | No | |

### 2.3 Beat Distribution (`Beat_Distribution__s`) — CONFIG
Manager-triggered one-time spread of hand-picked records across reps. Uses **RouteIQ's default caps** (not planner's). Never edits existing beats. Distribution beats never go through approval.

Key fields: `Name`, `Owner`, `Involved_Users__s` (Multi-User), `Distribution_Method__s` (**Equal** default / Shift / Distance), `Max_Distance__s` (km, Distance only), `Start_Location`/`End_Location` (fallback), `Planner__s` (Yes), `Distribution_Start_Date`/`Distribution_End_Date`, `Status__s` (In-Progress/Completed/Partially Completed/Failed), `Failure_Reason`.
**Result subform** (one row per involved rep): `User`, `Beat`, `Status` (Utilised/Unutilised), `Reason`.

### 2.4 Distribution Source (`Distribution_Source__s`) — CONFIG · CHILD of Beat Distribution
Working set. **Grain: one row per (record × meeting type)** — a record wanted for 2 meeting types = 2 rows = 2 visits.

Fields: `Beat_Distribution` (parent), `Visit_For__s` (MultiModuleLookup → Leads/Contacts), `Visit_Type__s` (→ Meeting_Type_Config, mandatory), `Status__s` (Placed/Unplaced — enables partial completion), `Reason`.

### 2.5 Beat (`Beats__s`) — CUSTOM
Owner = assigned rep. Per-rep block up to `Max_Days_Per_Beat` days.

| Field | Type | Notes |
|-------|------|-------|
| `Name` | SingleLine | Auto-name |
| `Owner` | User | Assigned rep |
| `Planner__s` | Lookup | **Always set** (provenance). Distribution → distribution's planner |
| `Beat_Distribution__s` | Lookup | Set only for Distribution beats; empty for auto |
| `Creation_Source__s` | PickList | **Auto / Manual / Distribution** |
| `Start_Date` / `End_Date` | Date | |
| `Status__s` | PickList | Planned / In-Progress / Completed / Partially Completed |
| `In_Approval_Process__s` | Checkbox | **Bottom-Up only.** True while in approval flow |
| `Approval_Status__s` | PickList | **Bottom-Up only.** Waiting for Approval / Partially Approved / Approved / Rejected |

### 2.6 Beat Day (`Beat_Days__s`) — CUSTOM · HIDDEN IN UI
One record per calendar day within a beat. **No end datetime by design** (a visit can arrive end of day).
Fields incl.: `Beat`, `Date`, `Owner`, planned/actual start datetime, planned/actual check-in/check-out **Location**, deviation distances, planned/actual total distance, `Status` (Planned/In Progress/Partially Completed/Completed/Completed with Different Order/Skipped).
> Note: 4 location fields exceed the 2-address-per-module limit → framework exception pending.

### 2.7 Visit (`Beat_Visits__s`) — CUSTOM
**The atomic unit of work** — produced by all flows. Owner = assigned rep once placed.

| Field | Type | Notes |
|-------|------|-------|
| `Name` | SingleLine | Auto-name |
| `Beat__s` | Lookup | Optional — empty while in Manager Queue, filled on placement |
| `Beat_Day__s` | Lookup | Optional — empty while queued |
| `Visit_For__s` | MultiModuleLookup → Leads/Contacts | Record being visited |
| `Meeting_Type__s` | Lookup | Single, mandatory. Drives completion rules + duration |
| `Is_Adhoc__s` | Checkbox | Rep-created unplanned visit |
| `Owner` | User | Rep once placed; Manager Queue owns while unplaced |
| `Queue_Reason__s` | PickList | Capacity Exhausted / Invalid Location |
| `Visit_Location__s` | Location | Routing target |
| planned/actual start/end datetime, checkedin/checkedout datetime + location + deviation | | |
| `Status__s` | PickList | Planned / In Progress / Completed / Skipped / **Waiting for Approval / Rejected** (last two Bottom-Up only) |

### 2.8 Users (system module additions)
`Preferred_Start_Location__s` (PickList, mirrors planner's Supported Start/End), `Preferred_End_Location__s`, `Custom_Location__s` (Location, added only when Custom selected).
**Start/end precedence:** rep preferred location → distribution Start/End_Location (fallback).

---

## 3. Flow Summaries

### 3.1 Auto Beat Creation (Top-Down, scheduler)
Two timers: **main run** (once per cycle, plans whole window up to Max Days per Beat) + **daily delta run** (weekdays, catches new/changed records; steps aside if it collides with main run). CRM resolves who's due from Frequency Rules vs last completed visit → builds candidate visits → async call to RouteIQ → RouteIQ assigns rep/day/order/times respecting all caps → callback → CRM writes Visits, groups into Beat Days (rep + date), stitches Beats. Unfit visits → **Manager Queue** with reason. In-progress beats are never touched.

### 3.2 Beat Distribution (Top-Down & Bottom-Up, manager one-off)
Manager hand-picks records (each × meeting type = one Distribution Source row), chooses reps + method + window. CRM creates Beat Distribution (status In-Progress) → **concurrency lock (one at a time)** → async to RouteIQ → RouteIQ spreads across **free reps only** (reps already holding a beat in window = skipped/Unutilised), uses **RouteIQ default caps** (buffer from planner), first meeting at rep's shift start → callback → CRM writes new beats only. Records outcome at 3 levels: run Status, per-rep Result (Utilised/Unutilised), per-record Source Status (Placed/Unplaced). Never edits existing beats. No approval ever.

### 3.3 Manual Beat Creation & Approval (Top-Down & Bottom-Up) — **★ NEXT BUILD**
See §4.

### Callback payload shape (same for Auto & Distribution)
Per placed visit: `{ rep, date, planned_start, planned_end, sequence, day_start_location, day_end_location, planned_day_distance }`.
Unassigned/unplaceable list: `{ record, meeting_type, reason_code }`.
**CRM derives Beat Days (rep + date) and stitches Beats itself** — RouteIQ returns no grouping.

### Reason codes (RouteIQ → CRM)
`ALL_USERS_AT_CAP` → Capacity Exhausted · `NO_ELIGIBLE_USER_IN_PROXIMITY` → No rep in proximity · `USER_UNAVAILABLE` → User unavailable.

---

## 4. Manual Beat Creation & Approval — NEXT BUILD TARGET

> **We are building the HTML for: Manual Beat Creation, including the Bottom-Up (self-assembly) approach.**

**In one sentence:** A user hand-picks records for a beat, the RouteIQ **client library optimises the order in the browser**, and CRM writes the whole beat in one composite call. For rep-created Bottom-Up beats that require approval, the beat waits for the reporting manager before it becomes active.

### Who creates / who approves
- **Top-Down:** only **managers** create manual beats (building for a chosen rep). **Go live immediately — no approval.**
- **Bottom-Up:** **reps** build their own beats. If the planner's `Requires_Approval` is set, the beat waits for the rep's **Reporting To** manager.

### Step by step
1. **Creator assembles the beat** — picks source records, a meeting type per record, beat start/end dates, and each record's date. Can span multiple days (up to Max Days per Beat).
2. **RouteIQ optimises in-browser** (sync, before save) — returns optimised sequence + uses each meeting type's Duration for planned times.
3. **CRM checks caps, then writes** — warns if selection exceeds planner caps (per-day meetings, mileage, buffer) but **user can still proceed (warn, don't block)**. Composite API creates Beat + Beat Days + Visits, `Creation_Source = Manual`.
4. **Top-Down → live immediately.**
5. **Bottom-Up w/ approval → waits** — Beat + Visits created in `Waiting for Approval`. Visible to rep, not yet actionable.
6. **Reporting manager reviews** — approves/rejects each visit (via blueprint), or approves all.
7. **CRM rolls up** — `Approval_Status`: Approved (all) / Partially Approved (mixed) / Rejected (all). On full approval, visits → Planned, beat actionable.
8. **Rejected visits go back to rep** — fix + resubmit allowed until beat starts (In-Progress); then no more resubmission.

### RouteIQ's role (Manual)
- **Does:** provide client library that optimises hand-built beat in-browser (sync); return optimised sequence + route detail for planned times; a cap warning.
- **Does NOT:** write records (CRM composite API); check/warn caps (CRM does); run approval (CRM blueprint + rollup); work server-side/async.

### Rules that matter
- Always optimised from the start (never an unoptimised hand-list).
- **CRM warns, doesn't block** on cap breach.
- **Editable until it starts** (re-optimise + update via composite API). After In-Progress, only ad-hoc visits can be added.
- **Approval is Bottom-Up only.**

### Approval state flow (Bottom-Up)
| State | Where | Meaning |
|-------|-------|---------|
| In approval | Beat `In_Approval_Process=true`, `Approval_Status=Waiting for Approval`; Visits `Status=Waiting for Approval` | Created, visible to rep, not actionable |
| Rolled-up | Beat `Approval_Status` | Approved / Partially Approved / Rejected |
| Approved | Visits → Planned | Beat actionable, rep can begin |
| Rejected visit | Visit `Status=Rejected` | Back to rep to fix + resubmit (until beat starts) |

---

## 5. RouteIQ Integration Touchpoints

| Touchpoint | Flow | Mode | CRM sends | CRM expects |
|-----------|------|------|-----------|-------------|
| Geocoding | Config | At config | Records + address mappings | RouteIQ geocodes + stores coords |
| Assign + optimise | Auto | Async + callback | Candidate visits, reps, caps, availability | Per-visit plan + unassigned list |
| Distribute | Distribution | Async + callback | Source records, reps, method, window, caps | Per-visit plan + unplaceable list |
| Beat Day re-optimise | Auto (delta/queue) | Server | The day's visits | Optimised order + times |
| Client library — optimise | **Manual** | **Sync (client)** | Picked records + dates | Optimised sequence |
| Client library — map UI | Distribution / Manual | Client | — | Embeddable map widget (per Figma) |

**Open items awaiting RouteIQ:** client library + its I/O contract (Manual + Distribution map); max batch sizes; default caps for Distribution; endpoint naming; Beat Day re-optimise feasibility at scale; shared reason-code set.

---

## 6. Glossary (quick)

- **Planner** — master config: which customers, how often, which reps, what limits.
- **Beat** — a per-rep block of days holding that rep's scheduled work.
- **Beat Day** — one day inside a beat, for one rep (hidden in UI).
- **Visit** — one planned call on a customer, on a specific day, of a specific meeting type (atomic unit).
- **Meeting Type** — kind of visit; carries Duration + completion rules.
- **Frequency Rule** — "visit these every week/month" — drives who's due (Auto).
- **Assignment Rule** — maps records → eligible reps (Auto).
- **Manager Queue** — where unplaceable auto-visits wait for a manager (Auto only).
- **Free rep** — an involved rep with no existing beat in the window (only these get a distribution beat).
- **Utilised / Unutilised** — per-rep distribution outcome. **Placed / Unplaced** — per-record outcome.
- **Manual beat** — user builds by hand; optimised in-browser by RouteIQ client library; written via CRM composite API.
- **Composite API** — CRM API that creates Beat + Beat Days + Visits together in one call.
- **Creation Source** — Beat field: Auto / Manual / Distribution.
- **Reporting Manager** — rep's Reporting To user; approver for Bottom-Up manual beats.
- **Ad-hoc visit** — visit added to a beat after it starts (only change allowed once In-Progress).

---

## 7. This repo (current prototype)

HTML/CSS/JS prototype of the **Field View** (map) side. Existing files:
- `index.html` — dark-theme Field View (canvas map, pins, V1/V2 NM sheet, address-update modal, pick-on-map mode).
- `index-daymode.html` + `src/style-daymode.css` — light/day-mode variant.
- `src/` — `data.js`, `map.js` (canvas pan/zoom + pins), `app.js` (interactions), `style.css`.

**Next:** build Manual Beat Creation UI (incl. Bottom-Up self-assembly) as new HTML, per §4. *Await user's direction on specifics before creating pages.*
