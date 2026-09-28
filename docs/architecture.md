# RNB AssetTrail · Architecture & Domain Design Document
**Roads & Buildings (R&B) Department, Government of Gujarat**

---

## 1. Domain Understanding & Operational Context

The **Roads and Buildings (R&B) Department, Government of Gujarat** oversees critical public assets spanning tens of thousands of kilometers of state roadways, thousands of river bridges and cross-drainage structures, and a vast portfolio of institutional and administrative buildings.

### Key Domain Principles:
1. **Hierarchical Governance Structure:**
   $$\text{State HQ (Chief Engineer)} \rightarrow \text{Circle (Superintending Engineer)} \rightarrow \text{Division (Executive Engineer)} \rightarrow \text{Sub-division (DEE)} \rightarrow \text{Section (JE/AE)}$$
2. **Linear Homogeneous Road Modeling:**
   A long corridor (e.g. SH-4) cannot be treated as a single monolith because pavement type, width, traffic load, and deterioration vary by stretch. Modeling as **Parent Road $\rightarrow$ Child Segments by Chainage ($0+000$ to $12+500$)** allows granular condition monitoring and independent resurfacing cycles.
3. **Defect Liability Period (DLP) Warranty Enforcement:**
   Following new construction or periodic bituminous renewals, a mandatory **36-month DLP warranty** is activated. During this period, all inspection defects are legally flagged **"Contractor Liable"** for free contractor rectification.
4. **Monsoon Surveillance Cycles:**
   Gujarat roads and scour-vulnerable bridge structures undergo statutory **Pre-monsoon (April 1 – May 31)** and **Post-monsoon (October 1 – November 30)** inspection drives to prevent flood damage and bridge failures.

---

## 2. System Architecture Diagram

```mermaid
graph TD
    subgraph ClientLayer["Client & Field Tier"]
        Desktop[Web Dashboard / Admin Portal]
        Mobile[Mobile Field Inspection / QR Scanner]
        Public[Public Citizen QR Portal /a/:assetId]
    end

    subgraph AppLayer["Next.js 14 App Router (Vercel Serverless)"]
        AuthMiddleware[NextAuth JWT & RBAC Engine]
        API_Assets["/api/assets (CRUD & Chainage Splitting)"]
        API_Lifecycle["/api/assets/:id/transition (State Machine)"]
        API_Inspections["/api/inspections (Scoring & Defects)"]
        API_Works["/api/works (AA/TS & DLP Clocks)"]
        API_Approvals["/api/approvals (Maker-Checker & Ratifications)"]
        API_Alerts["/api/alerts (Dedupe Engine)"]
        CronAlerts["/api/cron/alerts (Daily Vercel Cron)"]
    end

    subgraph IntelligenceLayer["Domain & Intelligence Libs"]
        HashLib["lib/hash.ts (SHA-256 Event Chain)"]
        ScoringLib["lib/scoring.ts (Priority & Bridge Risk)"]
        FinanceLib["lib/finance.ts (TCO & Depreciation)"]
        LifecycleLib["lib/lifecycle.ts (Allowed Transitions)"]
    end

    subgraph DataLayer["Persistence & Storage (MongoDB Atlas)"]
        M_Assets[(Assets & GeoJSON 2dsphere)]
        M_Events[(AssetEvents - Append Only Hash Chain)]
        M_Inspections[(Inspections & Defect Sub-schemas)]
        M_Works[(Work Orders & Sanctions)]
        M_Approvals[(Approval Requests)]
        M_Alerts[(Alerts & Dedupe Keys)]
        M_Org[(OrgUnits & Roles)]
    end

    ClientLayer --> AuthMiddleware
    AuthMiddleware --> API_Assets
    AuthMiddleware --> API_Lifecycle
    AuthMiddleware --> API_Inspections
    AuthMiddleware --> API_Works
    AuthMiddleware --> API_Approvals
    CronAlerts --> API_Alerts

    API_Lifecycle --> LifecycleLib
    API_Lifecycle --> HashLib
    API_Inspections --> ScoringLib
    API_Works --> FinanceLib

    API_Assets --> M_Assets
    API_Lifecycle --> M_Events
    API_Inspections --> M_Inspections
    API_Works --> M_Works
    API_Approvals --> M_Approvals
    API_Alerts --> M_Alerts
```

---

## 3. Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    OrgUnit ||--o{ OrgUnit : "parent unit"
    OrgUnit ||--o{ User : "jurisdiction"
    OrgUnit ||--o{ Asset : "maintaining unit"
    
    Category ||--o{ Asset : "class template"
    
    Asset ||--o{ Asset : "parent corridor / children"
    Asset ||--o{ AssetEvent : "audit ledger (SHA-256)"
    Asset ||--o{ Inspection : "condition logs"
    Asset ||--o{ Work : "work orders"
    Asset ||--o{ ApprovalRequest : "authorization"
    Asset ||--o{ Alert : "deduped notifications"
    Asset ||--o{ CitizenReport : "public grievances"

    Asset {
        string assetId PK "GJ-RNB-CLASS-DIST-SERIAL"
        string name
        string classCode "RDS | SEG | BRG | BLD | LND | MCH"
        string status "SANCTIONED..DISPOSED"
        number conditionScore "1 to 5"
        string condition "CRITICAL..VERY_GOOD"
        string operationalStatus "OPEN | RESTRICTED | CLOSED"
        geometry geometry "GeoJSON Point/Line/Polygon"
        object linear "startM, endM, lengthM, routeCode"
        date lastInspectionAt
        date nextInspectionDue
        date lastRenewalDate
        date nextRenewalDue
        date dlpEndDate
        number riskScore "0 to 100"
        number priorityScore "0 to 100"
    }

    AssetEvent {
        objectId _id PK
        objectId assetId FK
        string assetCode
        string type "STATUS_CHANGE | INSPECTION | WORK.."
        string fromStatus
        string toStatus
        string prevHash "SHA-256 link"
        string hash "SHA-256 digest"
        date createdAt
    }

    Inspection {
        objectId _id PK
        objectId assetId FK
        string type "PRE_MONSOON | POST_MONSOON.."
        number conditionScore
        array defects "severity, contractorLiable"
        string recommendedAction
        number estimatedCost
        number gpsLat
        number gpsLng
    }

    Work {
        objectId _id PK
        objectId assetId FK
        string type "PERIODIC_RENEWAL | ROUTINE.."
        string aaNo "Administrative Approval"
        string tsNo "Technical Sanction"
        string contractor
        number estimatedCost
        number actualCost
        number dlpMonths "default 36"
        date dlpEndDate
        string status "PLANNED..COMPLETED"
    }
```

---

## 4. Lifecycle State Machine Diagrams

### A. Roads & Homogeneous Segments
```mermaid
stateDiagram-v2
    [*] --> SANCTIONED
    SANCTIONED --> UNDER_CONSTRUCTION : Work Awarded
    UNDER_CONSTRUCTION --> DEFECT_LIABILITY : Work Completed
    DEFECT_LIABILITY --> IN_SERVICE : DLP Expiry
    IN_SERVICE --> UNDER_MAINTENANCE : Routine/Special Repair
    UNDER_MAINTENANCE --> IN_SERVICE : Repair Done
    IN_SERVICE --> UPGRADING : Widening Sanctioned
    UPGRADING --> DEFECT_LIABILITY : Widening Completed
    IN_SERVICE --> CLOSED : Flood / Washaway (Immediate)
    CLOSED --> UNDER_MAINTENANCE : Emergency Repairs
    CLOSED --> IN_SERVICE : Reopened
    IN_SERVICE --> HANDED_OVER : Transfer to NHAI/Municipality (Approval Req)
    IN_SERVICE --> DECOMMISSIONED : Realignment Bypass (Approval Req)
```

### B. Bridges & Cross-Drainage Structures
```mermaid
stateDiagram-v2
    [*] --> SANCTIONED
    SANCTIONED --> UNDER_CONSTRUCTION
    UNDER_CONSTRUCTION --> DEFECT_LIABILITY
    DEFECT_LIABILITY --> IN_SERVICE
    IN_SERVICE --> UNDER_MAINTENANCE : Special Structural Repair
    UNDER_MAINTENANCE --> IN_SERVICE : Repairs Finished
    IN_SERVICE --> RESTRICTED : Load / Speed Limit (Immediate Safety)
    RESTRICTED --> IN_SERVICE : Certified Safe
    IN_SERVICE --> CLOSED : Severe Scour / Distress (Immediate Safety)
    RESTRICTED --> CLOSED : Deterioration (Immediate Safety)
    CLOSED --> UNDER_MAINTENANCE : Structural Rehabilitation
    CLOSED --> UPGRADING : Complete Reconstruction
    CLOSED --> DECOMMISSIONED : Permanent Condemnation (Approval Req)
```

---

## 5. Maker-Checker & Emergency Safety Ratification Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Field as Field / Sub-Division Engineer (Maker)
    actor EE as Executive Engineer (Checker)
    participant Engine as Lifecycle & Alert Engine
    participant DB as MongoDB & SHA-256 Ledger

    alt Case 1: High-Value Proposal (Maker-Checker)
        Field->>Engine: Propose Asset Handover / Decommissioning
        Engine->>DB: Create ApprovalRequest (Status: PENDING)
        Engine-->>Field: Request Submitted (Approval Required)
        Note over Field,EE: Requesters cannot approve own requests
        EE->>Engine: Review & Approve Request (with Official Note)
        Engine->>DB: Execute State Transition & Append SHA-256 Event
        Engine-->>EE: Transition Confirmed
    else Case 2: Immediate Emergency Safety Action
        Field->>Engine: Immediately RESTRICT / CLOSE Bridge
        Engine->>DB: Update Asset to RESTRICTED immediately
        Engine->>DB: Append SAFETY_CLOSURE Event (requiresRatification: true)
        Engine->>DB: Raise Alert (CLOSURE_NOT_RATIFIED)
        Engine-->>Field: Safety Restriction Live on Network
        EE->>Engine: Review Field Photos & Click "Ratify Order"
        Engine->>DB: Resolve Alert & Append SAFETY_RATIFIED Event
        Engine-->>EE: Formal Executive Engineer Order Issued
    end
```

---

## 6. Assumptions to Confirm with Department Norms
1. **Approval Delegation Limits:** Configured as defaults ($\le ₹50\text{ Lakh}$ for EE, $\le ₹2.5\text{ Crore}$ for SE, $> ₹2.5\text{ Crore}$ for Chief Engineer).
2. **Defect Liability Duration:** Default set to 36 months for bituminous renewals and new structures.
3. **Monsoon Inspection Windows:** Pre-monsoon defined as April 1 – May 31; Post-monsoon defined as October 1 – November 30.
4. **Condition Scoring Scale:** Standard 1-5 scale implemented, mapped to bands (`CRITICAL`, `POOR`, `FAIR`, `GOOD`, `VERY_GOOD`), prepared for direct IRC/IBMS conversion.
