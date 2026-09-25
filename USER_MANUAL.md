# AuditFinancials — Complete User Manual & ICAI Non-Corporate Entity (NCE) Guide

## 📖 Executive Summary
**AuditFinancials** is a specialized, client-side, privacy-first financial statement preparation and tax audit compliance platform engineered specifically for Indian Chartered Accountants, tax practitioners, and audit firms.

The platform fully implements the **ICAI Guidance Note on Financial Statements of Non-Corporate Entities** for:
- **Sole Proprietorships** (Retail, Manufacturing, Professionals)
- **Partnership Firms** (Indian Partnership Act, 1932)
- **Limited Liability Partnerships (LLP)** (LLP Act, 2008)
- **Hindu Undivided Families (HUF)**
- **Association of Persons (AOP) / Body of Individuals (BOI)**
- **Trusts & Societies**

---

## 🚀 5-Step End-to-End Operational Workflow

```
[ Step 1: Register/Select Entity & Upload CY Trial Balance ]
                          ⬇️
[ Step 2: Ingest Prior Year Audited Comparatives (PY) ]
                          ⬇️
[ Step 3: Review Comparative Balance Sheet, P&L & Equity ]
                          ⬇️
[ Step 4: Configure Notes 1-28, Partner Capital & Year-End Adjustments ]
                          ⬇️
[ Step 5: Export ICAI Multi-Tab Excel & Standalone Audit Reports ]
```

---

### Step 1: Register/Select Client Entity & Upload Current Year Trial Balance
1. **Create or Select Client Entity**:
   - Provide Entity Name, Constitution (Partnership, Proprietorship, LLP, etc.), Financial Year (`2025-26`), PAN, GSTIN, and Registered Address.
2. **Upload Current Year Trial Balance**:
   - Supported Formats: `.xlsx`, `.xls`, `.csv`, `.tsv`, or direct clipboard copy-paste.
   - Column Mapping: Ledger Name/Particulars, Debit Balance, Credit Balance.
3. **Verify Trial Balance Tally**:
   - Total Debits must equal Total Credits.
   - A green **"Statements Tallied"** indicator confirms mathematically balanced trial balances.
4. **AI Semantic Mapping**:
   - Click **"AI Mapping"** to automatically map ledger accounts to statutory schedules (**Notes 3 to 25**) using Gemini 3.8 and statutory ICAI heuristics.
   - Manual override is always available via the schedule dropdown next to any ledger.

---

### Step 2: Previous Year Audited Comparatives (PY)
1. **Upload Audited Prior Year Data**:
   - Upload the preceding financial year's audited Trial Balance or carry forward saved balances from the previous audit cycle.
2. **Auto-Alignment**:
   - Prior year figures automatically align side-by-side with Current Year figures across Balance Sheet, Statement of Profit & Loss, and Notes.

---

### Step 3: Comparative Financial Statements & Audit Diagnostics
1. **Balance Sheet**:
   - Structured under ICAI Non-Corporate Entity Format:
     - **I. Equity and Liabilities**: Owners' Capital, Reserves & Surplus, Non-Current Liabilities (Borrowings), Current Liabilities (Trade Payables with MSME, Other Current Liabilities, Provisions).
     - **II. Assets**: Non-Current Assets (Property, Plant and Equipment, Non-Current Investments, Long-Term Loans & Advances) and Current Assets (Inventories, Trade Receivables, Cash and Bank Balances, Other Current Assets).
2. **Statement of Profit and Loss**:
   - Operating Revenue, Other Income, Cost of Materials Consumed, Purchases, Changes in Inventories, Employee Benefits Expense, Finance Costs, Depreciation & Amortization, and Other Administrative Expenses.
3. **Statement of Changes in Equity (Partner Capital Account)**:
   - Opening Capital + Fresh Introductions + Interest on Capital + Working Partner Remuneration + Share of Net Profit - Drawings = Closing Capital.
4. **Real-Time Audit Diagnostic Flags**:
   - Detects negative cash balances, unverified debit balances in liabilities, missing depreciation on fixed assets, and rounding differences.

---

### Step 4: Statutory Schedules (Notes 1 to 28) & Year-End Adjustments
1. **Statutory Schedule Breakdown**:
   - **Note 1:** Entity Overview & Significant Accounting Assumptions.
   - **Note 2:** Summary of Significant Accounting Policies (AS-1 Compliance).
   - **Note 3:** Owners' / Partners' Capital & Current Account Reconciliation.
   - **Note 4:** Reserves and Surplus (General Reserve, Revaluation Reserve).
   - **Note 5:** Borrowings (Secured Bank Term Loans, CC/OD Working Capital Limits, Vehicle Loans, Unsecured Loans).
   - **Note 6:** Deferred Tax Liabilities / Assets (Net) under AS-22.
   - **Note 7:** Other Long-Term Liabilities.
   - **Note 8:** Provisions (Employee Benefits Provision, Tax Provisions).
   - **Note 9:** Trade Payables with MSME classification and aging breakdown.
   - **Note 10:** Other Current Liabilities (Statutory dues: GST, TDS, PF, ESI, Advance from Customers).
   - **Note 11:** Property, Plant and Equipment (PPE) & Intangible Assets (AS-10 Schedule).
   - **Note 12:** Investments (Non-Current and Current).
   - **Note 13:** Loans and Advances (GST Input Tax Credit, Security Deposits, Advance Tax & TDS).
   - **Note 14:** Other Non-Current Assets.
   - **Note 15:** Inventories (Raw Materials, Work-in-Progress, Finished Goods, Stock-in-Trade under AS-2).
   - **Note 16:** Trade Receivables (Sundry Debtors with aging analysis).
   - **Note 17:** Cash and Bank Balances (Cash in Hand, Current Accounts, Fixed Deposits).
   - **Note 18:** Other Current Assets (Prepaid Expenses, Accrued Interest).
   - **Note 19:** Revenue from Operations (Gross Sales/Turnover less GST and returns).
   - **Note 20:** Other Income (Interest, Scrap Sales, Forex gains).
   - **Note 21:** Cost of Materials Consumed & Direct Manufacturing Overheads.
   - **Note 22:** Employee Benefits Expense (Salaries, Wages, Staff Welfare, Bonus, PF/ESI).
   - **Note 23:** Finance Costs (Bank Interest, Processing Fees, Interest on Partner Capital).
   - **Note 24:** Depreciation and Amortization Expense (AS-10).
   - **Note 25:** Other Operating & Administrative Expenses (Audit Fees, Legal, Rent, Rates & Taxes, Freight Outward, Repairs).
   - **Notes 26-28:** Contingent Liabilities, Commitments, Capital Contracts, and Other Statutory Disclosures.

2. **Section 40(b) Partner Remuneration & Interest Engine**:
   - Automatic calculation of permissible working partner remuneration based on Book Profit:
     - First ₹3,00,000 of Book Profit (or Loss): Up to ₹1,50,000 or 90% of book profit (whichever is greater).
     - Balance of Book Profit: Up to 60%.
     *(Finance (No. 2) Act, 2024 revision: ₹3,00,000 or 90% up to ₹6,00,000, and 60% thereafter).*
   - Interest on partner capital verified against the statutory 12% simple interest ceiling u/s 40(b)(iv).

3. **MSME Compliance (MSMED Act, 2006 & Form 3CD Clause 22)**:
   - Classification of Trade Payables into Micro, Small, Medium, and Others.
   - Tracking of payments overdue beyond 45 days (or 15 days without agreement).
   - Automatic compound interest with monthly rests calculation at 3x RBI Bank Rate.
   - Section 23 & Section 43B(h) disallowance notifications.

4. **Closing Stock Valuation (AS-2)**:
   - Ingestion of closing physical inventory at lower of cost and net realizable value (NRV).

---

### Step 5: Export & Statutory Audit Deliverables
1. **ICAI-Compliant Multi-Tab Excel Workbook (`.xlsx`)**:
   - Single-click export of the full audit dossier containing Balance Sheet, P&L, Statement of Changes in Equity, Cash Flow Statement (AS-3), and individual Notes 1-28.
   - Pre-formatted with professional borders, accounting font hierarchies, formula linkages, and print setup.
2. **Printable Standalone PDF Financial Reports**:
   - Built-in UDIN block, CA firm registration, partner membership number, and signature blocks.
3. **Form 3CB / Form 3CD Cross-Referencing**:
   - Figures link directly into Tax Audit clauses (Clause 13, 14, 22, 34).

---

## 🏛️ ICAI Classification of Non-Corporate Entities

| Entity Level | Turnover Threshold | Borrowing Threshold | Applicable Standards |
| :--- | :--- | :--- | :--- |
| **Level I (Large)** | > ₹250 Crores | > ₹50 Crores | All Accounting Standards (AS-1 to AS-29) apply in full. |
| **Level II (Medium)**| ₹50 Cr to ₹250 Cr | ₹10 Cr to ₹50 Cr | Partial relaxations (AS-3, AS-17, AS-20, AS-24). |
| **Level III (Small)** | ₹10 Cr to ₹50 Cr | ₹2 Cr to ₹10 Cr | Exemptions in AS-3, AS-17, AS-18, AS-20, AS-24, AS-28. |
| **Level IV (Micro)** | ≤ ₹10 Crores | ≤ ₹2 Crores | **Maximum exemptions**. AS-3 Cash Flow optional, simplified disclosures. |

---

## 🔒 Google Drive Cloud Sync & Data Security Guarantee

1. **100% Client-Side Private Storage**:
   - The application does NOT upload, store, or transmit client accounting records to any external third-party proprietary servers.
2. **Dedicated User Google Drive Folder**:
   - All company profiles, ledger mappings, and financial statements are saved solely to a folder named `CA Financial Statement Backups` inside **your own Google Drive account**.
3. **Handling Expired Workspace Sessions**:
   - Google Workspace OAuth tokens expire after 1 hour by Google security design.
   - When an expired session occurs, simply click the **"Reconnect & Sync Drive"** button to refresh the token and resume real-time backup without data loss.
4. **Total Local Backup (.json)**:
   - Download complete offline snapshots anytime by clicking the backup/download button.

---

## 🤖 Built-in AI Chartered Accountant Copilot
Need immediate help with a client scenario?
- Click the **[🤖 AI Copilot]** button in the header or the floating action button at the bottom-right corner.
- Ask questions regarding:
  - "How do I calculate partner salary u/s 40(b) for ₹8,50,000 book profit?"
  - "Which accounting standards are exempt for a Level IV partnership firm?"
  - "How should GST RCM liability and credit be presented?"
  - "Where do I add closing stock?"
