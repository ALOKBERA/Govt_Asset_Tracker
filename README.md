# RNB AssetTrail · Government of Gujarat
### End-to-End Infrastructure Asset Registry & Lifecycle Management Platform
**Roads & Buildings (R&B) Department, Government of Gujarat**

---

## 🏛️ 1. Overview & Problem Statement
State and National highway networks, river bridges, culverts, and public building infrastructure require rigorous life-cycle governance. **RNB AssetTrail** addresses the official mandate:
> *"Building an end-to-end infrastructure asset inventory to track and manage assets across their entire lifecycle."*

### The Core Four Guarantees:
1. **Permanent Unique Identification:** Structured, immutable Asset IDs (`GJ-RNB-{CLASS}-{DISTRICT}-{SERIAL6}`), physical QR tags, Code128 barcodes, GeoJSON geometries, and road chainage linear segments (`0+000` to `12+500`).
2. **Full Lifecycle Governance:** State machine enforcing `SANCTIONED → UNDER_CONSTRUCTION → DEFECT_LIABILITY → IN_SERVICE ⇄ UNDER_MAINTENANCE → CONDEMNATION → DECOMMISSIONED/DISPOSED`.
3. **Condition Intelligence & Surveillance:** Pre-monsoon (Apr-May) and Post-monsoon (Oct-Nov) campaigns, condition scores (1-5), and automated **Bridge Safety Watchlists** and **Road Renewal Priorities**.
4. **Jurisdictional Scoping:** Strict server-side RBAC scoping queries across **Wing → Circle (SE) → Division (EE) → Sub-division (DEE) → Section (JE/AE)**.

---

## 🛠️ 2. Tech Stack
- **Framework:** Next.js 14+ (App Router) + TypeScript (strict)
- **Styling & Components:** Tailwind CSS + Radix UI Primitives + Lucide Icons
- **Database & Geospatial:** MongoDB Atlas + Mongoose (`2dsphere` GeoJSON indexes)
- **Authentication & RBAC:** NextAuth (Credentials, JWT session) + bcrypt
- **Auditing & Cryptography:** SHA-256 Hash Chaining on `AssetEvent` ledger
- **GIS Mapping:** Leaflet + OpenStreetMap via `react-leaflet` (`ssr: false`)
- **Data & Charts:** Recharts, `qrcode`, `papaparse`, `zod`, `react-hook-form`
- **Automation:** Vercel Cron daily automated alerts scanner

---

## 👥 3. Demo Credentials (Pre-Seeded)

| Role | Officer Persona | Jurisdiction Scope | Email | Password |
|---|---|---|---|---|
| **STATE_ADMIN** | Er. Rajesh Patel (Chief Engineer) | State HQ Gandhinagar (All Gujarat) | `state@demo.gov` | `Password@123` |
| **CIRCLE_ADMIN** | Er. Suresh Joshi (Superintending Engineer) | Vadodara R&B Circle | `circle@demo.gov` | `Password@123` |
| **DIVISION_ENGINEER** | Er. Amit Shah (Executive Engineer) | Vadodara Division | `division@demo.gov` | `Password@123` |
| **SUBDIVISION_ENGINEER** | Er. Nilesh Desai (Deputy Executive Engineer) | Padra Sub-division | `subdivision@demo.gov` | `Password@123` |
| **FIELD_ENGINEER** | Er. Bhavin Mehta (Junior Engineer) | Section Field Office | `field@demo.gov` | `Password@123` |
| **AUDITOR** | Shri K. L. Varma (Vigilance Auditor) | State Audit Wing (Read-Only) | `auditor@demo.gov` | `Password@123` |
| **PUBLIC** | Citizen | Any physical QR tag scan (`/a/[id]`) | *(No login required)* | — |

---

## 🚀 4. Quick Start & Setup

### Prerequisites
- Node.js 18+ and npm
- MongoDB Atlas connection string or local MongoDB instance

### Step 1: Clone & Install Dependencies
```bash
git clone <repo-url>
cd Govt-Asset-Track-and-Manage
npm install
```

### Step 2: Configure Environment
Copy `.env.example` to `.env.local` and set your MongoDB URI:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/rnb_asset_trail_db
NEXTAUTH_SECRET=rnb-gujarat-asset-trail-demo-secret-key-32chars
NEXTAUTH_URL=http://localhost:3000
CRON_SECRET=rnb-asset-cron-secret-demo
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 3: Seed Demo Gujarat Data
```bash
npm run seed
```
*Seeds 6 administrative tiers, road links, chainage segments, severe-risk bridges, public buildings, works with DLP, pre/post-monsoon inspections, and valid SHA-256 event chains.*

### Step 4: Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗺️ 5. Key System Features

### A. Road Linear Modeling & Chainage Strip
- Roads modeled as **Corridor (Parent)** $\rightarrow$ **Segments (Homogeneous Children by Chainage)**.
- **Visual Segment Strip:** Continuous horizontal bar colored by condition (Green Good, Amber Fair, Orange Poor, Red Critical).
- **Segment Splitting:** Split segment action at specified chainage without disrupting parent road history.

### B. Bridge Safety Watchlist & Scoring
- Explainable risk formula (0-100) combining structural score, age vs design life, inspection overdue penalty, load limit, and scour vulnerability.
- Automated rankings driving the top **Bridge Safety Watchlist**.

### C. 3-Year Defect Liability Period (DLP) Warranty Enforcement
- Completing capital resurfacing automatically activates DLP.
- Defects recorded during active DLP are legally flagged **"Contractor Liable"**.
- Automated alert triggers 60 days before DLP expiry for mandatory joint inspection.

### D. Emergency Safety Closures & EE Ratification
- Field engineers can **immediately restrict or close** unsafe bridges/roads or declare buildings **UNSAFE**.
- Immediate order generates an active alert requiring formal ratification by the **Executive Engineer (DIVISION_ENGINEER)**.

### E. Cryptographic Audit Trail (SHA-256)
- Every lifecycle change appends an immutable `AssetEvent` linked to `prevHash`.
- One-click **"Verify History Integrity"** recomputes the SHA-256 chain from genesis to prove zero tampering.

### F. Official Reports & Instant CSV Downloads
- **Road Inventory Statement** (Circle $\rightarrow$ Division wise length km, width m, area m², surface type)
- **Bridge Register & IBMS Cross-References**
- **Building Stock by Occupant Department**
- **Inspection Compliance Audit**
- **DLP Warranty Liability Tracker**
- **Decommissioned / Disposed Register**

---

## 🎬 6. 7-Step Hackathon Demo Flow
1. **Register a Bridge:** Navigate to `/assets/new`, select **Bridge**, pick district `Vadodara (VAD)`, click GIS map to set coordinates, and submit $\rightarrow$ see generated ID `GJ-RNB-BRG-VAD-000003`.
2. **Print Label:** Click **Print Label** $\rightarrow$ see official barcode plate & QR code formatted for field attachment.
3. **Public QR Scan & Citizen Report:** Open `/a/GJ-RNB-BRG-VAD-000003` in a new tab $\rightarrow$ verify Government Asset badge and submit a citizen hazard report.
4. **Field Monsoon Inspection:** Open `/inspections`, enter the bridge code, score condition `2/5 (Poor)`, log a **CRITICAL** defect *"Scour at Pier 2"*, and submit $\rightarrow$ see bridge risk score recalculate.
5. **Immediate Safety Restriction:** On the bridge detail page, click **Next Step** $\rightarrow$ execute **Impose Load Restriction (16 Tonnes)** $\rightarrow$ observe instant operational status change and active EE ratification alert.
6. **Executive Engineer Ratification & Sanction Work:** Switch login to `division@demo.gov`, go to `/approvals`, and click **Ratify Order**. Then go to `/works`, sanction a **SPECIAL_REPAIR** order for ₹35 Lakh.
7. **Complete Work, DLP Activation & Audit Verification:** Complete the work order $\rightarrow$ verify DLP active clock starts $\rightarrow$ open **Timeline** tab and click **Verify History Integrity** $\rightarrow$ see full SHA-256 cryptographic chain validated `OK (UNBROKEN)`.
