import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { classifyLedgerAccount } from "./src/utils/mappingEngine";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || (process.env.NODE_ENV === "production" ? 8080 : 3000);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Initialize Gemini Client safely
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Supported Candidate Models in priority order
const CANDIDATE_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
];

// Robust Gemini invoker with multi-model fallback and transient error retries (503 / 429)
async function generateContentWithFallbackAndRetry(
  ai: GoogleGenAI,
  prompt: string,
  options: { responseMimeType?: string } = { responseMimeType: "application/json" }
): Promise<{ text: string; modelUsed: string }> {
  let lastError: any = null;

  for (const model of CANDIDATE_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: options.responseMimeType || "application/json",
          },
        });
        const text = response.text || "";
        if (text) {
          return { text, modelUsed: model };
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err);
        const is503OrUnavailable = errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("high demand");
        const is429OrRateLimit = errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota");

        console.warn(`[Gemini API] Model ${model} (attempt ${attempt + 1}) returned error: ${errMsg.slice(0, 140)}`);

        // If high demand spike (503), immediately switch to next fallback model
        if (is503OrUnavailable) {
          break;
        }

        // If rate limited (429), pause briefly before retry
        if (is429OrRateLimit && attempt === 0) {
          await new Promise((res) => setTimeout(res, 1200));
        } else {
          break;
        }
      }
    }
  }

  throw lastError || new Error("All candidate Gemini models were unavailable or returned errors.");
}

// API Health
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Gemini API Configuration & Status Diagnostic Endpoint
app.get("/api/gemini/status", (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY || "";
  const configured = !!apiKey.trim();
  const isValidFormat = apiKey.trim().startsWith("AIzaSy");
  const keyPreview = configured
    ? `${apiKey.substring(0, 6)}...${apiKey.slice(-4)}`
    : "NOT_SET";

  res.json({
    status: configured ? "configured" : "missing",
    configured,
    isValidFormat,
    keyPreview,
    primaryModel: "gemini-3.8-flash",
    fallbackModel: "gemini-3.1-flash-lite",
    message: configured
      ? (isValidFormat
          ? "GEMINI_API_KEY is configured and properly formatted."
          : "GEMINI_API_KEY is set, but Google AI Studio keys typically start with 'AIzaSy'. Please verify your key.")
      : "GEMINI_API_KEY environment variable is missing on Cloud Run. Set GEMINI_API_KEY in GCP Cloud Run service settings.",
    gcpInstruction: "To configure in GCP Cloud Run: Go to Cloud Run -> Edit & Deploy New Revision -> Variables & Secrets -> Add Environment Variable GEMINI_API_KEY=<Your_Google_AI_Studio_Key>.",
  });
});

// Helper for mapping a batch of ledgers using resilient multi-model fallback and statutory engine
async function callGeminiForBatch(ai: GoogleGenAI, batchLedgers: any[], promptContext: string): Promise<any[]> {
  const prompt = `You are an expert Indian Chartered Accountant (CA) specializing in ICAI Non-Corporate Entity (NCE) Financial Statements and Tax Audits (Form 3CB/3CD).
Given the following list of Trial Balance ledger accounts, map each one to its correct statutory schedule/note number (Notes 3 to 25) under the ICAI Guidance Note for Non-Corporate Entities:

Statutory Note Categories:
- Note 3: Owners' Capital Account (Capital introduced, partner fixed/current capital, drawings)
- Note 4: Reserves and Surplus (General reserve, retained earnings, capital reserve)
- Note 5: Borrowings (Long Term & Short Term) (Bank term loans, CC/OD limits, working capital loans, unsecured loans, vehicle loans)
- Note 6: Deferred Tax Liabilities/(Asset) (Net) (AS-22 timing differences)
- Note 7: Other Long-Term Liabilities (Trade deposits received, long-term retention money)
- Note 8: Provisions (Long Term & Short Term) (Provision for gratuity, leave encashment, provision for income tax)
- Note 9: Trade Payables (Sundry Creditors for goods & services, MSME dues)
- Note 10: Other Current Liabilities (GST payable, TDS payable, PF/ESI payable, salaries payable, audit fees payable, advance from customers, duties and taxes payable)
- Note 11: Property, Plant and Equipment and Intangible Assets (Land, buildings, plant & machinery, furniture, computers, vehicles, accumulated depreciation)
- Note 12: Investments - Non Current and Current (Equity shares, mutual funds, government bonds, NSC, KVP)
- Note 13: Loans and Advances (Long Term & Short Term) (GST ITC receivable, advance tax, TDS receivable, security deposits, prepaid expenses, advances to suppliers)
- Note 14: Other Non-Current Assets (Bank deposits maturing after 12 months)
- Note 15: Inventories (Raw materials, work-in-progress, finished goods, stock-in-trade, stores & spares)
- Note 16: Trade Receivables (Sundry Debtors, trade claims)
- Note 17: Cash and Bank Balances (Cash on hand, petty cash, bank current/savings accounts, short-term fixed deposits)
- Note 18: Other Current Assets (Interest accrued on deposits)
- Note 19: Revenue from Operations (Sale of manufactured goods, sale of services, turnover, job work)
- Note 20: Other Income (Interest income on FDs, miscellaneous operating income, scrap sale, discounts received)
- Note 21: Cost of Goods Sold (Raw materials consumed, direct factory costs, purchases of stock-in-trade, changes in inventory, freight inward, job work charges)
- Note 22: Employee Benefits Expense (Salaries, wages, bonus, PF/ESI contributions, staff welfare, gratuity expense) and Partners' Remuneration. CRITICAL: If a ledger represents Partners' Remuneration, Partner Salary, or Remuneration to Partners, assign noteNumber: 22 with subCategory: "(e) Partners' remuneration / Salary to partners (Disclosed at Line X of P&L)" and linkedStatementItem: "X. Partners' remuneration*".
- Note 23: Finance Cost (Bank term loan interest, CC interest, bank charges, borrowing costs, loan processing charges, interest on partners capital)
- Note 24: Depreciation and Amortization Expense (Depreciation on tangible assets, amortization of software/intangibles)
- Note 25: Other Expenses (Auditor remuneration, rent, power & fuel, repairs, insurance, travelling, communication, legal & professional fees, printing & stationery, miscellaneous expenses - NOTE: DO NOT place Partners Remuneration here; Partners Remuneration must be under Note 22 for Line X disclosure)

${promptContext}

Trial Balance Ledgers to map:
${JSON.stringify(batchLedgers, null, 2)}

INSTRUCTIONS:
1. If uploaded Balance Sheet or P&L items are provided, cross-reference each ledger with the uploaded financial statement line items.
2. Link each ledger to the matching schedule/Note (Notes 3 to 25) that correctly prepares the financial statements according to ICAI Guidance Note.
3. In "linkedStatementItem", specify the exact line item from the uploaded Balance Sheet or P&L that this ledger correlates to, or "Derived from statutory classification" if not explicitly mentioned in uploaded statements.
4. In "reasoning", provide a clear, concise 1-sentence CA justification referencing the accounting nature and relevant ICAI schedule.

Respond with a valid JSON array of objects with the exact schema:
[
  {
    "accountName": string,
    "accountCode": string,
    "noteNumber": number,
    "noteName": string,
    "subCategory": string,
    "financialStatement": "BalanceSheet" | "ProfitAndLoss",
    "accountingNature": "Asset" | "Liability" | "Equity" | "Income" | "Expense",
    "confidence": number,
    "reasoning": string,
    "linkedStatementItem": string
  }
]
`;

  try {
    const { text, modelUsed } = await generateContentWithFallbackAndRetry(ai, prompt);
    let cleanText = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanText);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err: any) {
    console.warn(`[Gemini API] Remote AI mapping batch call failed: ${err.message}. Seamlessly applying ICAI statutory classification engine.`);
  }

  // Resilient Statutory ICAI Rule Engine Fallback (ensures 100% uptime even during Google API 503 outages)
  return batchLedgers.map((item: any) => {
    const dr = Number(item.debit || item.originalDebit || item.closingDebit || 0);
    const cr = Number(item.credit || item.originalCredit || item.closingCredit || 0);
    const match = classifyLedgerAccount(item.accountName || item.ledgerName || "", dr, cr);
    return {
      accountName: item.accountName || item.ledgerName || "",
      accountCode: item.accountCode || "",
      noteNumber: match.noteNumber,
      noteName: match.noteName,
      subCategory: match.subCategory,
      financialStatement: match.statement,
      accountingNature: match.nature,
      confidence: match.confidence || 0.92,
      reasoning: `Classified via Statutory ICAI Rule Engine: ${match.reasoning}`,
      linkedStatementItem: "Statutory ICAI NCE taxonomy schedule",
    };
  });
}

// API endpoint for AI-assisted semantic ledger mapping
app.post("/api/gemini/map-ledgers", async (req, res) => {
  try {
    const {
      unmappedLedgers,
      ledgers,
      balanceSheetItems,
      profitAndLossItems,
      pyBalanceSheetItems,
      pyProfitAndLossItems,
    } = req.body;
    const targetLedgers = Array.isArray(unmappedLedgers) && unmappedLedgers.length > 0 
      ? unmappedLedgers 
      : (Array.isArray(ledgers) ? ledgers : []);

    if (targetLedgers.length === 0) {
      return res.status(400).json({ error: "No ledgers provided for mapping" });
    }

    const ai = getGeminiClient();
    if (!ai) {
      console.warn("[Gemini API] GEMINI_API_KEY is not configured; executing statutory ICAI classification engine.");
      const fallbackMapped = targetLedgers.map((item: any) => {
        const dr = Number(item.debit || item.originalDebit || item.closingDebit || 0);
        const cr = Number(item.credit || item.originalCredit || item.closingCredit || 0);
        const match = classifyLedgerAccount(item.accountName || item.ledgerName || "", dr, cr);
        return {
          accountName: item.accountName || item.ledgerName || "",
          accountCode: item.accountCode || "",
          ledgerName: item.accountName || item.ledgerName || "",
          noteNumber: match.noteNumber,
          noteName: match.noteName,
          subCategory: match.subCategory,
          financialStatement: match.statement,
          accountingNature: match.nature,
          confidence: match.confidence || 0.92,
          reasoning: `Classified via Statutory ICAI Rule Engine: ${match.reasoning}`,
          linkedStatementItem: "Statutory ICAI NCE taxonomy schedule",
        };
      });

      return res.json({
        mappings: fallbackMapped,
        mapped: fallbackMapped,
        isFallback: true,
        source: "statutory-rule-engine",
        message: "Applied statutory ICAI classification engine (API key not configured).",
      });
    }

    const bsContext = Array.isArray(balanceSheetItems) && balanceSheetItems.length > 0
      ? `\nUPLOADED CURRENT YEAR BALANCE SHEET CONTEXT (Client's audited or draft Balance Sheet line items & schedules):
${JSON.stringify(balanceSheetItems.slice(0, 45).map((b: any) => ({ particulars: b.particulars, note: b.noteNumber || b.scheduleReference, cyAmount: b.currentPeriodAmount, pyAmount: b.previousPeriodAmount, category: b.rawCategory })), null, 2)}`
      : '';

    const plContext = Array.isArray(profitAndLossItems) && profitAndLossItems.length > 0
      ? `\nUPLOADED CURRENT YEAR PROFIT & LOSS CONTEXT (Client's audited or draft P&L line items & schedules):
${JSON.stringify(profitAndLossItems.slice(0, 45).map((p: any) => ({ particulars: p.particulars, note: p.noteNumber || p.scheduleReference, cyAmount: p.currentPeriodAmount, pyAmount: p.previousPeriodAmount, category: p.rawCategory })), null, 2)}`
      : '';

    const pyBsContext = Array.isArray(pyBalanceSheetItems) && pyBalanceSheetItems.length > 0
      ? `\nUPLOADED PREVIOUS YEAR BALANCE SHEET CONTEXT (Audited prior year balance sheet line items & schedules):
${JSON.stringify(pyBalanceSheetItems.slice(0, 45).map((b: any) => ({ particulars: b.particulars, note: b.noteNumber || b.scheduleReference, pyAmount: b.currentPeriodAmount || b.previousPeriodAmount, category: b.rawCategory })), null, 2)}`
      : '';

    const pyPlContext = Array.isArray(pyProfitAndLossItems) && pyProfitAndLossItems.length > 0
      ? `\nUPLOADED PREVIOUS YEAR PROFIT & LOSS CONTEXT (Audited prior year P&L line items & schedules):
${JSON.stringify(pyProfitAndLossItems.slice(0, 45).map((p: any) => ({ particulars: p.particulars, note: p.noteNumber || p.scheduleReference, pyAmount: p.currentPeriodAmount || p.previousPeriodAmount, category: p.rawCategory })), null, 2)}`
      : '';

    const promptContext = `${bsContext}\n${plContext}\n${pyBsContext}\n${pyPlContext}`;

    // Process in batches of up to 35 ledgers each to prevent token limits on large trial balances
    const BATCH_SIZE = 35;
    const allMapped: any[] = [];

    for (let i = 0; i < targetLedgers.length; i += BATCH_SIZE) {
      const batch = targetLedgers.slice(i, i + BATCH_SIZE);
      const batchResults = await callGeminiForBatch(ai, batch, promptContext);
      allMapped.push(...batchResults);
    }

    const mapped = allMapped.map((m: any) => ({
      accountName: m.accountName || m.ledgerName || "",
      accountCode: m.accountCode || "",
      ledgerName: m.ledgerName || m.accountName || "",
      noteNumber: Number(m.noteNumber) || 25,
      noteName: m.noteName || `Note ${m.noteNumber || 25}`,
      subCategory: m.subCategory || "",
      financialStatement: m.financialStatement || "ProfitAndLoss",
      accountingNature: m.accountingNature || "Expense",
      confidence: typeof m.confidence === "number" ? m.confidence : 0.95,
      reasoning: m.reasoning || "",
      linkedStatementItem: m.linkedStatementItem || "",
    }));

    return res.json({ mappings: mapped, mapped });
  } catch (error: any) {
    console.error("Gemini mapping error:", error);
    // Ultimate safety fallback: Never leave the user stuck on error
    const { targetLedgers = [] } = req.body;
    const emergencyMapped = targetLedgers.map((item: any) => {
      const match = classifyLedgerAccount(item.accountName || item.ledgerName || "", Number(item.debit || 0), Number(item.credit || 0));
      return {
        accountName: item.accountName || item.ledgerName || "",
        accountCode: item.accountCode || "",
        ledgerName: item.accountName || item.ledgerName || "",
        noteNumber: match.noteNumber,
        noteName: match.noteName,
        subCategory: match.subCategory,
        financialStatement: match.statement,
        accountingNature: match.nature,
        confidence: match.confidence || 0.90,
        reasoning: `Classified via Statutory ICAI Rule Engine: ${match.reasoning}`,
        linkedStatementItem: "Statutory ICAI NCE taxonomy schedule",
      };
    });
    return res.json({
      mappings: emergencyMapped,
      mapped: emergencyMapped,
      isFallback: true,
      errorHandled: true,
      message: "AI service was busy; classified using statutory ICAI rule engine.",
    });
  }
});

// API endpoint for Interactive AI CA Schedule Mapping Assistant
app.post("/api/gemini/chat-mapping", async (req, res) => {
  try {
    const { message, ledgers, currentScheduleSummary } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: "Message is required" });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        reply: `### ICAI Non-Corporate Entity Schedule Guidance\n\n*Note: Running in offline CA statutory mode.*\n\nUnder ICAI Non-Corporate Entity guidance norms (AS-1, AS-2, AS-9, AS-10, AS-16, AS-22, AS-29):\n\n1. **Owners' Capital (Note 3)**: Partners' fixed capital, current accounts, and drawings.\n2. **Borrowings (Note 5)**: Secured bank term loans, CC/OD limits, and vehicle/unsecured loans.\n3. **Trade Payables (Note 9)**: Sundry creditors for goods and services.\n4. **Other Current Liabilities (Note 10)**: Duties and taxes payable (GST, TDS, PF, ESI).\n5. **PPE & Intangibles (Note 11)**: Tangible assets recorded at cost less depreciation.\n6. **Current Assets (Notes 15-18)**: Inventories (Note 15), Trade Receivables (Note 16), Cash & Bank (Note 17).\n7. **Operating Statements (Notes 19-25)**: Revenue (Note 19), COGS/Purchases (Note 21), Finance Costs (Note 23), Other Expenses (Note 25).\n\nYou can click **'Map All Ambiguous Ledgers'** to automatically classify your accounts.`,
        suggestedChanges: [],
        isFallback: true,
      });
    }

    const sampleLedgers = Array.isArray(ledgers) ? ledgers.slice(0, 50) : [];

    const prompt = `You are an expert Indian Chartered Accountant (CA) acting as the Senior Financial Statement AI Audit Agent.
You are helping the user map and review Trial Balance ledgers to statutory Notes (Notes 3 to 25) under the ICAI Guidance Note for Non-Corporate Entities (Partnerships, Proprietorships, LLPs, HUFs).

Statutory Note Categories:
- Note 3: Owners' Capital Account
- Note 4: Reserves and Surplus
- Note 5: Borrowings (Long Term & Short Term)
- Note 6: Deferred Tax Liabilities/(Asset) (Net)
- Note 7: Other Long-Term Liabilities
- Note 8: Provisions (Long Term & Short Term)
- Note 9: Trade Payables
- Note 10: Other Current Liabilities (GST/TDS/PF/Salaries payable)
- Note 11: Property, Plant and Equipment and Intangible Assets
- Note 12: Investments (Non-Current and Current)
- Note 13: Loans and Advances (GST ITC, Advance Tax, TDS Receivable, Security Deposits)
- Note 14: Other Non-Current Assets
- Note 15: Inventories
- Note 16: Trade Receivables
- Note 17: Cash and Bank Balances
- Note 18: Other Current Assets
- Note 19: Revenue from Operations
- Note 20: Other Income
- Note 21: Cost of Goods Sold (Raw materials, Purchases, Direct factory expenses, Inward freight)
- Note 22: Employee Benefits Expense (Salaries, Bonus, PF/ESI) & Partners' Remuneration (Face of P&L Line X)
- Note 23: Finance Cost (Bank Interest, Processing Fees, Bank Charges, Interest on Partners' Capital)
- Note 24: Depreciation and Amortization Expense
- Note 25: Other Expenses (Audit Fees, Rent, Legal, Repairs, Outward freight, Admin)

Context of Current Trial Balance:
${JSON.stringify(sampleLedgers.map((l: any) => ({
  name: l.accountName,
  debit: l.originalDebit,
  credit: l.originalCredit,
  noteNumber: l.noteNumber,
  noteName: l.noteName,
  statement: l.statement
})), null, 2)}

User Question / Command:
"${message}"

INSTRUCTIONS:
1. Provide a professional, thorough, authoritative CA response explaining the statutory accounting standard rules (AS-1, AS-2, AS-9, AS-10, AS-16, AS-22, AS-29) and ICAI Guidance Note schedule classifications.
2. If the user asks to reclassify, verify, or suggest changes for one or more specific ledgers, return a list of suggested reclassifications in the "suggestedChanges" array.
3. Keep the tone helpful, precise, and professional.

Respond with a valid JSON object matching:
{
  "reply": string (markdown supported CA explanation),
  "suggestedChanges": [
    {
      "accountName": string,
      "suggestedNoteNumber": number,
      "suggestedNoteName": string,
      "reasoning": string
    }
  ]
}
`;

    try {
      const { text, modelUsed } = await generateContentWithFallbackAndRetry(ai, prompt);
      let cleanText = text.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanText);

      return res.json({
        reply: parsed.reply || "I have analyzed your request under ICAI Non-Corporate Entity guidance norms.",
        suggestedChanges: Array.isArray(parsed.suggestedChanges) ? parsed.suggestedChanges : [],
        modelUsed,
      });
    } catch (apiErr: any) {
      console.warn("[Gemini API] Chat mapping AI service error, returning expert ICAI CA advisory response:", apiErr.message);
      return res.json({
        reply: `### ICAI Non-Corporate Entity Schedule Advisory\n\n*Note: The AI model experienced temporary high demand on Google servers. Running in statutory advisory mode.*\n\nUnder ICAI Non-Corporate Entity guidance norms (AS-1, AS-2, AS-9, AS-10, AS-16, AS-22, AS-29):\n\n1. **Owners' Capital (Note 3)**: Partners' fixed capital, current accounts, and drawings.\n2. **Borrowings (Note 5)**: Secured bank term loans, CC/OD working capital limits, and vehicle/unsecured loans.\n3. **Trade Payables (Note 9)**: Sundry creditors for goods and services, separated into MSME dues where applicable.\n4. **Other Current Liabilities (Note 10)**: Duties and taxes payable including GST, TDS, PF, and statutory provisions.\n5. **Property, Plant and Equipment (Note 11)**: Tangible fixed assets recorded at cost less accumulated depreciation.\n6. **Current Assets (Notes 15-18)**: Inventories (Note 15), Trade Receivables / Debtors (Note 16), Cash & Bank Balances (Note 17).\n7. **Operating Statements (Notes 19-25)**: Revenue from Operations (Note 19), Cost of Goods Sold & Material Purchases (Note 21), Finance Costs (Note 23), and Other Administrative Expenses (Note 25).\n\nYou can click **'Map All Ambiguous Ledgers'** or review individual ledger schedules in the Mapping tab.`,
        suggestedChanges: [],
        isFallback: true,
      });
    }
  } catch (error: any) {
    console.error("Gemini chat error:", error);
    return res.status(500).json({ error: error.message || "Failed to process question with AI Agent" });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Financial Statement Agent server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
