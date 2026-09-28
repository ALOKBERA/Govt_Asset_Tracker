# PROMPT FOR AI CODING AGENT: RNB AssetTrail, Asset Registry and Lifecycle Management for the Roads and Buildings (R&B) Department, Government of Gujarat

## 1. Role and goal
You are a senior full-stack engineer. Build **RNB AssetTrail**, a hackathon-ready web app deployed on **Vercel**.

**Official problem statement:** "Building an end-to-end infrastructure asset inventory to track and manage assets across their entire lifecycle."

**Final scope:** the system is for the **Roads and Buildings (R&B) Department, Government of Gujarat**. Design every model, screen and rule around what this department actually owns and does.

**The system must prove four things:**
1. **Every asset is uniquely and permanently identifiable** (structured ID, QR, GPS/geometry, chainage for roads).
2. **The whole life is tracked**: sanction → construction → defect liability → service → maintenance/rehabilitation → closure/decommissioning, with approvals and an audit trail.
3. **Condition is monitored through regular inspections** (pre-monsoon and post-monsoon for roads and bridges) and turned into **priorities**: what is unsafe, what is overdue, what needs money first.
4. **Officers get simple answers** at their own level (sub-division, division, circle, state).

**Priorities:** (1) works end-to-end without bugs, (2) simple mobile-friendly UX for field engineers, (3) clear code, (4) extras. Do not add anything not listed here.

## 2. Domain context (design from this)
**What R&B does:** plans, builds and maintains the state's roads, bridges, and public buildings (offices, hospitals, educational institutions, and buildings for other departments). National Highways are owned by the Government of India but looked after by R&B on an agency basis. Many other roads are owned by the State.

**Organization (operational units are tiered):** Department (Minister and Secretary) → Chief Engineers by wing (State R&B, Panchayat roads, National Highways, Capital projects, Expressway, Special projects) → **Circle** (Superintending Engineer, generally 3-5 divisions) → **Division** (Executive Engineer, roughly one per district) → **Sub-Division** (Deputy Executive Engineer, roughly one per taluka) → Section (Assistant/Junior Engineer). Bridge design sits in special circles, plus a Designs Circle, Quality Control, and Architecture and Town Planning units. *(Names are illustrative; keep everything configurable.)*

**Asset scale (shape the seed data and UI for it):** tens of thousands of km of roads (State Highways, Major District Roads MDR, Other District Roads ODR, Village Roads VR, Panchayat roads, NH on agency basis), thousands of bridges (major, minor, culverts, causeways, ROB/RUB), and a large building stock.

**Existing systems to complement, not replace:** a Works Monitoring System (NIC) tracks works, and MoRTH has the Indian Bridge Management System (IBMS). Keep optional `externalRefs` fields (`wmsWorkId`, `ibmsBridgeId`, `gemOrderNo`) on assets and works so records can be cross-referenced later.

**Stated department direction:** life-cycle management of road assets (asset maintenance programme) and routine structural inspection of bridges. This app is the tool for exactly that.

## 3. Tech stack (fixed)
- Next.js 14+ (App Router) + TypeScript (strict)
- Tailwind CSS + shadcn/ui + lucide-react
- MongoDB Atlas + Mongoose (use GeoJSON + `2dsphere` index)
- NextAuth (Credentials, JWT) + bcrypt
- Zod + react-hook-form
- Recharts, `qrcode`, `html5-qrcode`, `papaparse`
- Map: **Leaflet + OpenStreetMap** via `react-leaflet` (`dynamic(..., { ssr: false })`), marker clustering, polylines for roads
- Vercel Cron (daily) for alerts

**Vercel rules:** cache the Mongoose connection on `globalThis`; no local filesystem writes (photos/documents are URLs, or a small compressed base64 photo capped at about 300 KB, or Vercel Blob if time permits); secure cron with `CRON_SECRET`; secrets from env vars; paginate everything; add indexes on `class`, `status`, `divisionId`, `districtCode`, `nextInspectionDue`, and `geometry` (2dsphere).

## 4. Organization units and roles
`OrgUnit` (one collection, `type: WING | CIRCLE | DIVISION | SUBDIVISION | SECTION`, `parentId`, `code`, `name`, optional `districtCode`, `talukaCode`). Every asset stores its maintaining `subdivisionId`, `divisionId`, `circleId` (denormalized for fast scoped queries).

| Role | Maps to | Can do |
|---|---|---|
| STATE_ADMIN | HQ / Chief Engineer office | Everything, all data, configuration, templates, thresholds |
| CIRCLE_ADMIN | Superintending Engineer | Circle scope; approve higher-value requests; reports |
| DIVISION_ENGINEER | Executive Engineer | Division scope; approve requests; sanction works |
| SUBDIVISION_ENGINEER | Deputy Executive Engineer (custodian) | Register assets, plan works, request approvals, ratify inspections |
| FIELD_ENGINEER | Assistant/Junior Engineer | Inspections, defects, photos, work progress updates |
| AUDITOR | Audit/Vigilance | Read-only across scope, audit trail |
| PUBLIC (no login) | Citizen | QR page and issue reporting only |

Enforce role AND unit scope **on the server** in every query. Never rely on UI checks.

## 5. Asset classes (dynamic templates, seeded and locked, admins can add fields)
Each class = `Category` template with `fields[]` (`key, label, type: text|number|date|select|boolean, required, options, unit`), `geometryType` (POINT | LINE | POLYGON), `inspectionSchedule`, `designLifeYears`, `renewalCycleYears`, `depreciable` (bool), and `lifecycleProfile`.

### 5.1 Roads (linear assets)
Model as **Road (parent) → Road Segment (child, the trackable unit)**. Segments are homogeneous stretches by chainage, because condition and treatment vary along a road. Provide a "Split segment" action.
- **Road fields:** route code (e.g. SH-4, NH-48), name, category (`NH_AGENCY | SH | MDR | ODR | VR | PANCHAYAT | EXPRESSWAY`), ownership (`STATE | NH_AGENCY | PANCHAYAT | OTHER`), from/to places, total length, districts covered.
- **Segment fields:** start chainage and end chainage (km + m), length, carriageway width, lanes, surface type (`BT | CC | WBM | GRAVEL | EARTHEN`), pavement crust notes, construction year, **last resurfacing/renewal date**, terrain, traffic class (or AADT), importance class, drainage/culverts count, ROW width, **`geometry` as GeoJSON LineString**.
- **Segment-level lifecycle data:** last renewal date, next periodic renewal due (`lastRenewal + renewalCycleYears`, default by surface type, configurable), current condition score, open defects, current DLP.
- Linear attributes (road furniture such as crash barriers, signage, KM stones) can be stored as a count/notes on the segment. Do not model them as separate assets.

### 5.2 Bridges and cross-drainage structures
Types: `MAJOR_BRIDGE | MINOR_BRIDGE | CULVERT | CAUSEWAY | ROB | RUB | FLYOVER | UNDERPASS`.
Fields: name, river/obstacle, parent road segment, chainage, number of spans, span length, total length, width, superstructure type (RCC, PSC, steel, arch), foundation type, bearing type, design load class, construction year, `loadRestriction` (tonnes, optional), `operationalStatus` (`OPEN | RESTRICTED | CLOSED`), scour-prone (bool), last detailed inspection date, `externalRefs.ibmsBridgeId`, point geometry.
Bridges get a **risk score** (see 11) and appear on a **Bridge Safety Watchlist**.

### 5.3 Buildings
Types: `OFFICE | HOSPITAL | EDUCATIONAL | RESIDENTIAL_QUARTERS | CIRCUIT_HOUSE | RNB_OFFICE_STORE | OTHER`.
Fields: built-up/plinth area, floors, construction year, structure type, plot/survey number, **`ownerDepartment` and `occupantDepartment`** (R&B builds and maintains buildings for other departments), `handoverDate`, `maintenanceResponsibility` (`RNB | OCCUPANT`), occupancy, fire NOC expiry, structural audit due, electrical/lift inspection due, point (or polygon) geometry.
**Components** (lift, DG set, transformer, water tank) are child assets via `parentAssetId`.

### 5.4 Land and Right of Way (ROW)
Survey/khasra number, area, ownership document, purpose (`ROW | OFFICE_SITE | RESERVED | QUARRY_STORE | OTHER`), encroachment flag and notes, polygon or point geometry.

### 5.5 Machinery, vehicles and lab equipment
Road rollers, pavers, hot-mix or batching plants, inspection vehicles, quality-control lab equipment. Fields: make/model, serial/registration number, capacity, operating hours/odometer, calibration due (lab equipment), AMC vendor and expiry. Straight-line depreciation applies here.

## 6. Identification (core feature)
**Asset ID (immutable):** `GJ-RNB-{CLASS}-{DISTRICT}-{SERIAL6}`, e.g. `GJ-RNB-BRG-VAD-000123`.
- `CLASS` = `RDS` (road), `SEG` (road segment), `BRG`, `BLD`, `LND`, `MCH`; `DISTRICT` = a 3-letter code of the asset's physical district (a stable physical fact, unlike org units that can be reorganized).
- `SERIAL6` from an atomic counter per class + district (`findOneAndUpdate` + `$inc`). Never reused, never edited.
- Segment ID convention: also store `parentAssetId` (the road) and `startChainage`/`endChainage`; show a friendly label such as "SH-4 · Km 12+400 to 18+200".

**Other identifiers:** QR (URL `${APP_URL}/a/{assetId}`), Code128 barcode on labels, GeoJSON geometry (point/line/polygon), chainage, IBMS/WMS references, serial/registration number, photo(s).
**Tag status:** `TAG_PENDING | TAGGED | TAG_DAMAGED`. Where QR plates go: bridge parapet, building entrance, first KM stone of a segment, machinery.
**Duplicate check** on create: same class + name + district, same serial/registration number, or a road segment overlapping an existing segment's chainage range on the same road. Show a warning dialog linking to the existing record.
**Labels:** `/assets/[id]/label` and a bulk sheet `/assets/labels?ids=...` (print CSS): asset ID, name, class, QR, barcode.

## 7. Lifecycle (server-enforced state machine in `lib/lifecycle.ts`, allowed transitions defined per class group)
**Unified statuses:** `SANCTIONED, UNDER_CONSTRUCTION, DEFECT_LIABILITY, IN_SERVICE, UNDER_MAINTENANCE, UPGRADING, RESTRICTED, CLOSED, HANDED_OVER, UNSAFE, CONDEMNATION_PENDING, DECOMMISSIONED, DISPOSED, MISSING`

**Roads and segments:**
`SANCTIONED → UNDER_CONSTRUCTION → DEFECT_LIABILITY → IN_SERVICE ⇄ UNDER_MAINTENANCE`
`IN_SERVICE → UPGRADING (widening/strengthening) → DEFECT_LIABILITY → IN_SERVICE`
`IN_SERVICE → CLOSED (flood/damage) → IN_SERVICE`
`IN_SERVICE → HANDED_OVER (to another agency, e.g. municipality/panchayat/NH authority)*`
`... → DECOMMISSIONED*`

**Bridges:** same, plus `IN_SERVICE → RESTRICTED → IN_SERVICE | CLOSED → (rehabilitation) UNDER_MAINTENANCE | (rebuild) UPGRADING | DECOMMISSIONED*`.

**Buildings:** `SANCTIONED → UNDER_CONSTRUCTION → DEFECT_LIABILITY → HANDED_OVER (to occupant dept) / IN_SERVICE ⇄ UNDER_MAINTENANCE`, `IN_SERVICE → UNSAFE → (repair) IN_SERVICE | CONDEMNATION_PENDING* → DECOMMISSIONED (demolished) → DISPOSED`.

**Land:** `IN_SERVICE → (transfer)* → HANDED_OVER`, `DISPOSED*`.
**Machinery:** `PROCURED(=SANCTIONED) → IN_SERVICE ⇄ UNDER_MAINTENANCE → CONDEMNATION_PENDING* → DECOMMISSIONED → DISPOSED (auction/scrap)*`, and `MISSING → found | write-off*`.

`*` = requires an **ApprovalRequest** (maker-checker, the requester cannot approve their own request). Approval level depends on class and estimated value (configurable table, default: below threshold A → Executive Engineer, below B → Superintending Engineer, else State/Chief Engineer).
**Safety exception:** setting a bridge or road to `RESTRICTED` or `CLOSED`, or a building to `UNSAFE`, is **immediate** by the sub-division engineer or field engineer, with a mandatory reason and photo. It is then **ratified** by the Executive Engineer within the system, and an alert is raised until ratified. Reopening also needs a note.
**Every** transition writes an `AssetEvent` in the same request. Invalid transitions return 400 with a clear message. Legacy import may create assets directly as `IN_SERVICE` (event marked `LEGACY`).

## 8. Works and maintenance
`Work` (a work order on an asset or segment):
- `type`: `ROUTINE` (pothole patching, drain clearing, shoulder repair) | `PERIODIC_RENEWAL` (resurfacing) | `SPECIAL_REPAIR` (e.g. bearing replacement) | `REHABILITATION` | `RECONSTRUCTION` | `EMERGENCY` (flood damage) | `NEW_CONSTRUCTION`
- Administrative Approval no. and date, Technical Sanction no. and date, tender/work order no., contractor, estimated cost, actual cost, start date, scheduled and actual completion, **defect liability period (months) → `dlpEndDate`**, status (`PLANNED → APPROVED → IN_PROGRESS → COMPLETED → CLOSED`), progress %, `externalRefs.wmsWorkId`, documents.
- Completing a `PERIODIC_RENEWAL`/`REHABILITATION` on a segment updates its `lastRenewalDate`, resets the renewal clock, and moves the asset to `DEFECT_LIABILITY`. Completing `NEW_CONSTRUCTION` moves it from `UNDER_CONSTRUCTION` to `DEFECT_LIABILITY`. When `dlpEndDate` passes, the asset can move to `IN_SERVICE`.
- **DLP rule (key domain feature):** while an asset is in DEFECT_LIABILITY, defects recorded in inspections are flagged **"Contractor liable"** and appear on a DLP defect list. An alert fires 60 days before DLP ends if the last inspection is older than 90 days ("inspect before DLP expires").
- Total cost of ownership per asset = construction cost + sum of actual work costs. For roads, also show cost per km per year.

## 9. Inspections (replaces generic "verification", mobile-first)
`InspectionSchedule` per class: `ROUTINE`, `PRE_MONSOON`, `POST_MONSOON`, `DETAILED`, `SAFETY_AUDIT`, `PHYSICAL_VERIFICATION` (for machinery, land, buildings: confirms the asset exists at location). Frequencies are configurable. Defaults: roads and bridges get pre-monsoon (window Apr 1-May 31) and post-monsoon (Oct 1-Nov 30) inspections every year; bridges also get a periodic detailed inspection (default every 3 years); buildings get an annual safety audit; machinery gets an annual physical verification.

`Inspection` record: assetId, type, inspector, date, GPS, **conditionScore 1-5 (5 = Very Good, 1 = Critical; mapped to bands GOOD / FAIR / POOR / CRITICAL; the department can remap to IRC/IBMS scales later)**, `defects[]` (`type`, `severity: LOW|MEDIUM|HIGH|CRITICAL`, `location/chainage`, note, photoUrl, `contractorLiable`), `recommendedAction` (`NONE | ROUTINE_MAINTENANCE | SPECIAL_REPAIR | REHABILITATION | RESTRICT | CLOSE | RECONSTRUCT`), `estimatedCost`, remarks.
Defect type presets: **Roads** (pothole, cracking, rutting, raveling, edge break, waterlogging, shoulder erosion, missing signage), **Bridges** (bearing damage, expansion joint failure, spalling/exposed rebar, cracks, scour at foundation, railing damage, drainage blocked), **Buildings** (seepage, structural crack, plaster/finish, electrical hazard, lift/fire safety).
On save: updates the asset's `conditionScore`, `condition`, `lastInspectionAt`, sets `nextInspectionDue` from the schedule, creates an event, and (for HIGH/CRITICAL defects) suggests "Create work" and "Restrict/Close". Physical verification with `NOT_FOUND` offers "Mark as MISSING".
Inspection **drives/campaigns** (e.g. "Post-monsoon 2026, Vadodara Division") show progress: done vs pending per sub-division and a CSV export.

## 10. Data model summary (Mongoose)
`OrgUnit`, `User`, `Category`, `Asset` (`assetId`, name, `classCode`, `subType`, `attributes`, `geometry` GeoJSON, `linear: {routeCode, startChainageM, endChainageM, lengthM}`, `parentAssetId`, unit refs, district/taluka, `status`, `conditionScore`, `condition`, `operationalStatus`, `tagStatus`, ownership fields, `acquisition/construction: {cost, year, sanctionNo, fundingScheme}`, `finance` (optional), dates (`lastInspectionAt`, `nextInspectionDue`, `lastRenewalDate`, `nextRenewalDue`, `dlpEndDate`), `riskScore`, `priorityScore`, photos, documents, `externalRefs`), `AssetEvent` (append-only, hash-chained), `ApprovalRequest`, `Work`, `Inspection`, `InspectionDrive`, `Alert` (unique `dedupeKey`), `CitizenReport`, `Counter`.

## 11. Lifecycle intelligence (explainable formulas in `lib/`)
- **Age and remaining life** from construction/renewal date and design/renewal cycle.
- **Road segment priority score (0-100):** weighted mix of condition (worse = higher), days past `nextRenewalDue`, traffic/importance class, open HIGH defects, and no open work. Show the breakdown on hover.
- **Bridge risk score (0-100):** condition, age vs design life, days since last inspection (overdue penalty), load restriction, scour-prone flag, open CRITICAL defects. Bands: LOW / MEDIUM / HIGH / SEVERE, driving the **Bridge Safety Watchlist**.
- **Maintenance backlog and budget need:** sum of `estimatedCost` of open recommended actions, grouped by division/class/action, plus renewals falling due in the next 1, 2, 3 years (replacement/renewal forecast).
- **Cost view:** cumulative maintenance spend vs construction cost; cost per km per year for roads.
- **Depreciation:** optional per class (default ON for machinery and buildings, straight-line; OFF for roads, bridges and land, where capital cost, maintenance cost and replacement cost are shown instead). Government accounts are generally cash-based, so treat book value as an analytical indicator, not statutory.

## 12. Alerts (Vercel Cron daily + "Refresh alerts" button, dedupe by `dedupeKey`)
Inspection overdue or due in 15 days · pre/post-monsoon window closing with inspections pending · DLP ending within 60 days without a recent inspection · periodic renewal due within 6 months or overdue · POOR/CRITICAL asset with no open work for 30 days · RESTRICTED/CLOSED not yet ratified, or open beyond a threshold · building fire NOC/lift/structural audit expiry · machinery AMC or calibration expiry · approvals pending over 7 days.

## 13. Audit trail
`AssetEvent` is append-only (no update/delete path). Each event stores `prevHash` and `hash = sha256(prevHash + canonical JSON)`. A "Verify history integrity" button on the asset page recomputes the chain (OK / BROKEN).

## 14. Pages and UX (keep it SIMPLE)
**Principles:** mobile-first for field use, plain language, one primary action per page, large tap targets, clear empty states, at most 6 sidebar items (bottom bar on mobile), toasts, skeletons. Light theme, one accent colour. Colour code condition consistently everywhere: green GOOD, yellow FAIR, orange POOR, red CRITICAL, grey inactive. A visible banner: "Demo data, not official records". Optional stretch: English/Gujarati label toggle (simple dictionary).

**Sidebar:** Dashboard · Assets · Inspections · Works · Approvals · Planning (Settings in the profile menu).

1. `/login`, with demo credentials shown.
2. `/dashboard` (role-aware):
   - Field/sub-division: "My inspections due", "Scan asset", "Report defect".
   - Division/circle/state: stat cards (assets by class, road length km by category, bridges at risk, inspections completed %), **map** (road segments as coloured lines, bridges as risk-coloured pins, buildings as pins, clustered), **Bridge Safety Watchlist** (top 10), **Road Priority list** (top 10), pending approvals, overdue inspections.
3. `/assets`: search (name, asset ID, route code), filters (class, road category, district, division, status, condition, inspection overdue, DLP active), **List / Map** toggle, "+ Add asset", "Import CSV", "Export CSV".
4. `/assets/new`: pick class → class-specific form (template fields) → **location step** (drop a pin, or click points to draw a road line; chainage fields; "use my location") → construction/cost details → success screen with the generated Asset ID and a "Print label" button. Roads: create the road, then add segments.
5. `/assets/import`: CSV with a column-mapping and validation preview (row errors), template CSV per class. Imported legacy assets go in as `IN_SERVICE`.
6. `/assets/[id]` (main screen): header (name, Asset ID, class chip, status badge, condition badge, risk/priority score), **primary action "Next step"** listing only valid transitions (approval ones say "Request..."; safety ones say "Restrict / Close now"). Tabs:
   - **Overview** (class-specific fields, map with geometry, parent/children tree: road → segments → bridges/culverts; building → components)
   - **Inspections** (with a condition trend chart)
   - **Works** (with DLP badge and contractor)
   - **Timeline** (events + integrity check)
   - **Finance/Cost**
   - **Documents**
   - QR card and "Print label".
   Roads additionally show a **segment strip**, a horizontal bar of segments coloured by condition along the chainage.
7. `/a/[assetId]`: **public QR page**: asset ID, name, class, status, operational status (e.g. bridge restricted or closed, with load limit), last inspected date, "Government asset" badge, and a **"Report a problem"** form (photo, note, optional location; honeypot field and simple rate limit), which creates a `CitizenReport` visible to the maintaining sub-division. Logged-in staff also see quick actions (Start inspection, Add note).
8. `/inspections`: tabs (Due / Overdue / Completed / Drives), **"Scan QR"** button, and a fast mobile inspection flow (score, defects with photo, recommended action, GPS auto-captured). Drive creation and progress dashboard.
9. `/works`: list with status columns, DLP tracker, create work (from an asset or from an inspection recommendation), complete work (actual cost, dates, DLP months).
10. `/approvals`: pending cards (asset, type, requester, reason, value, Approve/Reject with a note), history tab, and a list of safety closures awaiting ratification.
11. `/planning`: tabs **Priority list**, **Bridge watchlist**, **Backlog and budget need**, **Renewal forecast (1-3 years)**, **Reports** (below).
12. **Reports:**
   - *Road inventory statement* (Circle → Division wise): road name, category, division, circle, length (km), average width (m), area (m²), surface type
   - Bridge register with last inspection and rating
   - Building register by occupant department
   - Inspection compliance report
   - DLP tracker report
   - Condemned/decommissioned/disposed register
   - all CSV export
13. `/settings` (admin): org units, class templates, inspection schedules and windows, approval thresholds, ID prefixes, users and roles, alert thresholds.

## 15. API (route handlers, JSON, Zod-validated, paginated)
```
/api/auth/[...nextauth]
/api/org-units, /api/users, /api/categories
/api/assets (GET filters incl. bbox, POST)   /api/assets/:id (GET, PUT)
/api/assets/:id/transition   /api/assets/:id/segments (POST split/add)
/api/assets/:id/events   /api/assets/:id/verify-integrity
/api/assets/import   /api/assets/export
/api/inspections (GET, POST)   /api/inspection-drives
/api/works (GET, POST)   /api/works/:id (PUT)   /api/works/:id/complete
/api/approvals (GET, POST)   /api/approvals/:id/decide   /api/ratifications/:eventId
/api/alerts   /api/alerts/:id/resolve
/api/dashboard   /api/planning/*   /api/reports/*
/api/citizen-reports (public POST; staff GET/PUT)
/api/public/assets/:assetId   (safe fields only)
/api/cron/alerts   (CRON_SECRET)
```
Error shape `{ error, details? }`.

## 16. Folder structure
```
/app (auth)/login  (app)/dashboard assets inspections works approvals planning settings  a/[assetId]  api/...
/components ui/ assets/ map/ charts/ inspections/ layout/
/lib db.ts auth.ts rbac.ts ids.ts lifecycle.ts scoring.ts finance.ts alerts.ts hash.ts chainage.ts validators.ts
/models ...
/scripts seed.ts
vercel.json
```
`lib/chainage.ts`: parse/format chainage ("12+400" ↔ 12400 m), overlap detection.

## 17. Seed data (essential; label it DEMO DATA)
`npm run seed`:
- Org tree: 3 wings (State R&B, Panchayat, National Highways agency), 2-3 circles, about 6 divisions using districts **Ahmedabad, Gandhinagar, Vadodara, Surat, Rajkot, Bhavnagar**, 2 sub-divisions each. One user per role (`state@demo.gov / Admin@123`, etc.).
- Roads: about 10 road links across categories (real-sounding routes, such as an SH between Ahmedabad and Gandhinagar or a Vadodara-area MDR, clearly flagged as demo) with about 30 segments; realistic approximate coordinates, chainages, widths and surfaces; mixed conditions; a few segments due for renewal, one in DLP ending in 45 days, one with an open HIGH defect and no work.
- Bridges/culverts: about 15 (major and minor, some river-crossing and scour-prone), with 2 RESTRICTED (load limit), 1 CLOSED awaiting ratification, several with overdue inspections, giving a populated watchlist.
- Buildings: about 12 (offices, a hospital, schools, quarters, a circuit house) with different occupant departments; one UNSAFE; expiring fire NOC or lift licence.
- Land/ROW: about 5. Machinery and vehicles: about 8, including an AMC expiring and a calibration due.
- Inspection histories (pre and post monsoon), works with AA/TS numbers, 2 pending approvals, a few citizen reports, and a valid hash chain per asset.
The map, watchlist, priority list, alerts and planning must be populated on first load.

## 18. Build phases (verify each before moving on)
1. Setup, DB helper, models, auth, RBAC and unit-scoped queries. **Check:** roles and scoping enforced.
2. Org units, class templates (seeded R&B classes), ID generator.
3. Asset CRUD with class forms, geometry capture (pin and line), chainage, duplicate checks, road → segments.
4. Lifecycle engine, approvals, safety-closure ratification, hash-chained events. **Check:** invalid transitions rejected, maker-checker enforced.
5. Asset detail page (segment strip, tree, tabs), labels, QR/barcode, public QR page.
6. Inspections: mobile flow, schedules, defects, condition update, drives.
7. Works with AA/TS, DLP logic and cost tracking.
8. Scoring (priority, bridge risk), alerts engine and cron, dashboard with map.
9. Planning pages and reports (road inventory statement), CSV import/export, citizen reports.
10. Seed, empty/loading states, mobile polish, optional Gujarati toggle.
11. README, `docs/architecture.md`, deploy to Vercel, seed Atlas, smoke-test the live URL.

## 19. Environment variables
```
MONGODB_URI=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
CRON_SECRET=
NEXT_PUBLIC_APP_URL=
```

## 20. Rules for you (the agent)
- Stay within this scope and stack. Ask before adding features or libraries.
- Work phase by phase; after each, state what was built and how to test it.
- Server-side validation (Zod) and server-side authorization and unit scoping everywhere.
- Never edit or delete `AssetEvent` records or change an `assetId`.
- Keep UI copy short and plain. Every list has an empty state; every action gives a toast.
- No hard-coded secrets. No `any` without justification. `npm run build` must pass before you call the deployment ready.
- All thresholds, cycles, windows and approval levels must be **configurable settings with sensible defaults**, not constants, because the department's actual norms must be confirmed.
- At the end, generate `README.md` (setup, demo credentials, features) and `docs/architecture.md` containing: (a) a short **domain understanding** section (R&B structure, asset classes, why linear/segment modelling, DLP, monsoon inspections); (b) Mermaid diagrams: system architecture, ER diagram, lifecycle state diagrams per class group, approval and safety-ratification flow, inspection-to-work flow; (c) key design decisions and **assumptions to confirm with the department** (ID format, approval thresholds, inspection frequencies, condition scale, renewal cycles). Also a 7-step demo script: register a bridge and print its QR → scan it on a phone and run a post-monsoon inspection with a CRITICAL defect → restrict the bridge immediately → EE ratifies and raises a work → complete the work and see DLP start → show the road segment strip, priority list and watchlist on the map → run the timeline integrity check.

**Start with Phase 1 now.**
