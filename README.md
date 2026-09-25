# NCE Audit Financials — Statutory Financial Statements & Audit Management System

An intelligent, full-stack Chartered Accountant (CA) workflow application for automated Trial Balance ingestion, AI-driven ledger classification into ICAI Schedule Notes (1–25), comparative statement compilation (Balance Sheet, Profit & Loss), statutory audit diagnostics, and multi-format report delivery.

---

## 🌟 Key Highlights

- **5-Step Progressive Engagement Workflow**: Eliminates screen clutter with a step-by-step guided experience:
  1. **Step 1: Current Year (CY) Trial Balance & Statements**: Ingest CY data (.xlsx, .xls, .csv), auto-map ledgers to Notes 3–25, apply year-end adjustments, and preview draft statements.
  2. **Step 2: Previous Year (PY) Trial Balance & Statements**: Upload prior year data for symmetrical comparative mapping, or skip with 1 click for first-year entities.
  3. **Step 3: Comparative Financial Statements**: Consolidated side-by-side Balance Sheet, Profit & Loss, and 25 Notes with variance (₹) and YoY growth (%).
  4. **Step 4: Statutory Notes (1–25) & Audit Diagnostics**: In-depth review of ICAI disclosures (AS-1 to AS-29) and automated forensic/tax audit flags (negative cash, MSME dues, abnormal balances).
  5. **Step 5: Statutory Report Generation & Transmittal**: 1-click formatted statutory Excel export (.xlsx), print-ready PDF, client email transmittal via Gmail, and Google Drive archival.

- **Claude-Style Credit Subscription & Top-Up Model**:
  - Transparent usage costs: AI mapping (5 credits), Forensic audit scan (10 credits), Statutory Excel generation (5 credits).
  - Monthly subscription tiers: Starter (100 free credits), CA Professional (2,500 credits), Firm Enterprise (10,000 credits).
  - Instant pay-as-you-go credit packs (500 to 5,000 credits).

- **500-Credit Referral Program**:
  - "Give 500 Credits, Get 500 Credits" referral model.
  - Unique shareable invite links and 1-click WhatsApp/Email sharing.

- **Authentication & Multi-Credential Sign-In**:
  - Google OAuth 1-click SSO (`auditfinancialsnce` Firebase integration).
  - Sign in via Email, Mobile Number, or User ID handle (`@handle`).

---

## 🏗️ Architecture & Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Canvas Confetti
- **Backend / Services**: Node.js, Express, Firebase Authentication & Firestore & Analytics, Google Drive API, Gmail API
- **Parsers & Engines**: SheetJS (`xlsx`), Custom Accounting Taxonomies (Schedule III / Non-Corporate Entities)
- **Build Tool**: Vite 6, ESBuild

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- npm or bun

### 1. Clone the Repository
```bash
git clone https://github.com/vishalsutar7-bot/nceauditfinancials.git
cd nceauditfinancials
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` or `.env.local`:
```bash
cp .env.example .env.local
```
Add your Firebase, Gemini, and Google API keys:
```env
VITE_FIREBASE_API_KEY=AIzaSyDxbAFBA8j14-27hPPt94JFPp5gMQdVbtM
VITE_FIREBASE_AUTH_DOMAIN=auditfinancialsnce.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=auditfinancialsnce
VITE_FIREBASE_STORAGE_BUCKET=auditfinancialsnce.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=640754559890
VITE_FIREBASE_APP_ID=1:640754559890:web:4994516e4eff23601faf4b
VITE_FIREBASE_MEASUREMENT_ID=G-N3BQHGREBQ
```

### 4. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Build
```bash
npm run build
```

---

## 🐳 Docker & Google Cloud Deployment

The repository includes a production-grade multi-stage `Dockerfile` configured for Google Cloud Run:

### Run Locally with Docker
```bash
docker build -t nceauditfinancials:latest .
docker run -p 8080:8080 nceauditfinancials:latest
```

### Deploy to Google Cloud Run
See detailed instructions in [GCP_DEPLOYMENT.md](GCP_DEPLOYMENT.md).
```bash
# 1-command deployment via Google Cloud SDK
gcloud run deploy nceauditfinancials \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --port 8080
```

---

## 📋 Repository Structure

```
nceauditfinancials/
├── src/
│   ├── components/
│   │   ├── Step1CurrentYear.tsx             # Step 1: CY Ingestion & Mapping
│   │   ├── Step2PreviousYear.tsx            # Step 2: PY Ingestion & Comparative Mapping
│   │   ├── Step3ComparativeStatements.tsx   # Step 3: Side-by-side BS, P&L & 25 Notes
│   │   ├── Step4NotesAndAudit.tsx           # Step 4: Notes 1–25 & Audit Flags
│   │   ├── Step5ReportGeneration.tsx        # Step 5: Excel, PDF, Gmail & Drive
│   │   ├── StepByStepWorkspace.tsx          # Master 5-Step Workflow Coordinator
│   │   ├── CompaniesWindow.tsx              # Saved Companies Directory
│   │   ├── AuthModal.tsx                    # Google SSO & Multi-Credential Login
│   │   ├── OnboardingModal.tsx              # User ID & Mobile Registration
│   │   ├── ReferralModal.tsx                # 500-Credit Referral Hub
│   │   ├── SubscriptionModal.tsx            # Credit Top-Ups & Subscription Tiers
│   │   └── ...
│   ├── data/
│   │   ├── nceTaxonomy.ts                   # Schedule III / NCE Accounting Taxonomy
│   │   ├── sampleTrialBalances.ts           # Partnership & Proprietorship Datasets
│   │   └── subscriptionPlans.ts             # Pricing & Credit Rules
│   ├── services/
│   │   ├── driveService.ts                  # Google Drive API Client
│   │   └── gmailService.ts                  # Gmail API Transmittal Client
│   ├── utils/
│   │   ├── excelExporter.ts                 # Statutory Formatted Excel Generator
│   │   ├── financialCalculations.ts         # BS / P&L Aggregator & Balancer
│   │   └── mappingEngine.ts                 # AI Classification Algorithm
│   ├── firebase.ts                          # Firebase Authentication & App Config
│   ├── types.ts                             # Core TypeScript Interfaces
│   └── main.tsx                             # Application Entrypoint
├── Dockerfile                               # Production multi-stage Dockerfile for Cloud Run
├── GCP_DEPLOYMENT.md                        # Google Cloud Run deployment guide
├── cloudbuild.yaml                          # Google Cloud Build pipeline
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 📄 License

Proprietary — All rights reserved.
