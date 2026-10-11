import React, { useState } from 'react';
import {
  FileText,
  Printer,
  Copy,
  Check,
  Save,
  Building2,
  Calendar,
  ShieldCheck,
  Award,
  Sparkles,
  HelpCircle,
  FileCheck,
  ArrowRight,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Package,
  Layers,
  CheckCircle2,
  Table,
} from 'lucide-react';
import {
  EntityConfig,
  ManagementRepresentationConfig,
  BalanceSheetData,
  ProfitAndLossData,
  NoteScheduleData,
} from '../types';
import { getDefaultManagementRepresentation } from '../utils/auditDossierDefaults';
import { formatINR } from '../utils/financialCalculations';

interface ManagementRepresentationViewProps {
  config: EntityConfig;
  balanceSheet?: BalanceSheetData;
  profitAndLoss?: ProfitAndLossData;
  noteSchedules?: Record<number, NoteScheduleData>;
  onUpdateConfig?: (updated: Partial<EntityConfig>) => void;
}

export const ManagementRepresentationView: React.FC<ManagementRepresentationViewProps> = ({
  config,
  balanceSheet,
  profitAndLoss,
  noteSchedules,
  onUpdateConfig,
}) => {
  const currentData = getDefaultManagementRepresentation(config);
  const [formData, setFormData] = useState<ManagementRepresentationConfig>(currentData);
  const [activeTab, setActiveTab] = useState<'fields' | 'preview'>('fields');
  const [isCopied, setIsCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const isProprietor = config.entityType === 'Sole Proprietorship';
  const primarySigner =
    formData.signatoryName ||
    (isProprietor
      ? config.proprietorName || 'Proprietor'
      : config.signingPartnerName || config.partners?.[0]?.name || 'Managing Partner');
  const primaryDesignation =
    formData.signatoryDesignation || (isProprietor ? 'Sole Proprietor' : 'Managing Partner');
  const auditorFirm = config.auditorFirmName || config.auditorName || 'Chartered Accountants';

  // Extract Actual Financial Data Prepared
  const hasFinancials = Boolean(balanceSheet || profitAndLoss);
  const embedFigures = formData.includeFinancialFiguresInClauses ?? true;
  const includeSummaryTable = formData.includeFinancialSummaryTable ?? true;

  const bsTotal = balanceSheet?.totalAssets || balanceSheet?.totalEquityAndLiabilities || 0;
  const pyBsTotal =
    balanceSheet?.previousYear?.totalAssets || balanceSheet?.previousYear?.totalEquityAndLiabilities || 0;

  const revenue = profitAndLoss?.revenueFromOperations || 0;
  const pyRevenue = profitAndLoss?.previousYear?.revenueFromOperations || 0;

  const otherIncome = profitAndLoss?.otherIncome || 0;
  const pyOtherIncome = profitAndLoss?.previousYear?.otherIncome || 0;

  const totalRevenue = profitAndLoss?.totalRevenue || (revenue + otherIncome);
  const pyTotalRevenue = profitAndLoss?.previousYear?.totalRevenue || (pyRevenue + pyOtherIncome);

  const netProfit = profitAndLoss?.profitAfterTax || 0;
  const pyNetProfit = profitAndLoss?.previousYear?.profitAfterTax || 0;

  const closingStock = balanceSheet?.inventories || 0;
  const pyClosingStock = balanceSheet?.previousYear?.inventories || 0;

  const cashAndBank = balanceSheet?.cashAndBankBalances || 0;
  const pyCashAndBank = balanceSheet?.previousYear?.cashAndBankBalances || 0;

  // Distinguish physical cash-in-hand vs bank balances from Note 17 if available
  let cashInHand = 0;
  let bankBalances = 0;
  if (noteSchedules?.[17]?.items?.length) {
    noteSchedules[17].items.forEach((item) => {
      const name = (item.accountName || '').toLowerCase();
      const cat = (item.subCategory || '').toLowerCase();
      const bal = Math.abs(item.displayBalance !== undefined ? item.displayBalance : item.netBalance);
      if (
        name.includes('cash in hand') ||
        cat.includes('cash on hand') ||
        (name.startsWith('cash') && !name.includes('credit'))
      ) {
        cashInHand += bal;
      } else {
        bankBalances += bal;
      }
    });
  }
  if (cashInHand === 0 && bankBalances === 0 && cashAndBank > 0) {
    bankBalances = cashAndBank;
  }

  const tradeReceivables = balanceSheet?.tradeReceivables || 0;
  const pyTradeReceivables = balanceSheet?.previousYear?.tradeReceivables || 0;

  const loansAndAdvances =
    (balanceSheet?.shortTermLoansAndAdvances || 0) + (balanceSheet?.longTermLoansAndAdvances || 0);
  const pyLoansAndAdvances =
    (balanceSheet?.previousYear?.shortTermLoansAndAdvances || 0) +
    (balanceSheet?.previousYear?.longTermLoansAndAdvances || 0);

  const tradePayables = balanceSheet?.tradePayables || 0;
  const pyTradePayables = balanceSheet?.previousYear?.tradePayables || 0;
  const msmeDues = balanceSheet?.tradePayablesMsme || 0;
  const otherTradePayables =
    balanceSheet?.tradePayablesOther || Math.max(0, tradePayables - msmeDues);

  const ppeNetBlock = balanceSheet?.propertyPlantEquipment || 0;
  const pyPpeNetBlock = balanceSheet?.previousYear?.propertyPlantEquipment || 0;
  const depreciationExpense = profitAndLoss?.depreciationExpense || 0;

  const longTermBorrowings = balanceSheet?.longTermBorrowings || 0;
  const pyLongTermBorrowings = balanceSheet?.previousYear?.longTermBorrowings || 0;
  const shortTermBorrowings = balanceSheet?.shortTermBorrowings || 0;
  const pyShortTermBorrowings = balanceSheet?.previousYear?.shortTermBorrowings || 0;
  const otherCurrentLiabilities = balanceSheet?.otherCurrentLiabilities || 0;

  const ownersCapital = balanceSheet?.ownersCapital || 0;
  const pyOwnersCapital = balanceSheet?.previousYear?.ownersCapital || 0;
  const reservesAndSurplus = balanceSheet?.reservesAndSurplus || 0;

  const partnersRemuneration = profitAndLoss?.partnersRemuneration || 0;

  const handleFieldChange = (field: keyof ManagementRepresentationConfig, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    setIsSaved(false);
  };

  const handleSave = () => {
    if (onUpdateConfig) {
      onUpdateConfig({ managementRepresentation: formData });
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  // Build the complete plaintext representation letter
  const getFullLetterText = () => {
    let letter = `MANAGEMENT REPRESENTATION LETTER (ICAI SA 580)
Date: ${formData.letterDate || '31-03-2026'}

To,
M/s ${auditorFirm}
Chartered Accountants
${config.registeredAddress ? `Address: ${config.registeredAddress}` : ''}
${config.firmRegistrationNo ? `Firm Reg. No: ${config.firmRegistrationNo}` : ''}

Dear Sir / Madam,

Sub: Management Representation Letter for Statutory Audit for the Year Ended ${config.reportingPeriod || 'March 31, 2026'}

This representation letter is provided in connection with your audit of the financial statements of ${config.entityName} ("the Entity") for the year ended ${config.reportingPeriod || 'March 31, 2026'}, for the purpose of expressing an opinion as to whether the financial statements give a true and fair view in accordance with the Guidance Note on Financial Statements of Non-Corporate Entities issued by the Institute of Chartered Accountants of India (ICAI).

We confirm, to the best of our knowledge and belief, having made appropriate inquiries, the following representations:

1. Financial Statements & Preparation Responsibility:
We acknowledge our responsibility for the preparation and fair presentation of the financial statements in accordance with the Guidance Note on Financial Statements of Non-Corporate Entities issued by the ICAI, relevant accounting standards, and applicable legal/deed provisions.
${
  embedFigures && hasFinancials
    ? `The prepared financial statements reflect:
   • Total Balance Sheet Size / Assets: ₹${formatINR(bsTotal)} (Previous Year: ₹${formatINR(pyBsTotal)})
   • Revenue from Operations: ₹${formatINR(revenue)} (Previous Year: ₹${formatINR(pyRevenue)})
   • Net ${netProfit >= 0 ? 'Profit' : 'Loss'} for the Year: ₹${formatINR(Math.abs(netProfit))} (Previous Year: ₹${formatINR(Math.abs(pyNetProfit))})
   • Total ${isProprietor ? "Proprietor's" : "Partners'"} Capital: ₹${formatINR(ownersCapital)} (Previous Year: ₹${formatINR(pyOwnersCapital)})`
    : ''
}

2. Completeness of Transactions & Access to Records:
We have made available to you all books of account, vouchers, agreements, minute books, bank statements, branch records, and all other relevant documentation. All transactions undertaken by the Entity during the year have been properly recorded in the accounting records and are reflected in the financial statements.

3. Inventory & Physical Verification:
The inventories as at ${config.reportingPeriod || 'March 31, 2026'}${
      embedFigures && (closingStock > 0 || pyClosingStock > 0)
        ? ` amounting to ₹${formatINR(closingStock)} (Previous Year: ₹${formatINR(pyClosingStock)})`
        : ''
    } were ${formData.inventoryValuationMethod || 'valued at the lower of cost and net realizable value on FIFO basis'}. Complete physical verification of all inventories was carried out by management at the year-end. No obsolete, damaged or unserviceable goods are carried at values exceeding their net realizable value.

4. Cash and Bank Balances:
${
  embedFigures && (cashAndBank > 0 || pyCashAndBank > 0)
    ? `Total Cash and Bank Balances as on the balance sheet date aggregate to ₹${formatINR(cashAndBank)} (Previous Year: ₹${formatINR(pyCashAndBank)})${
        cashInHand > 0
          ? `, comprising physical Cash-in-Hand of ₹${formatINR(cashInHand)} and Bank Balances of ₹${formatINR(bankBalances)} across active bank accounts`
          : ''
      }. `
    : ''
}Physical verification of cash-in-hand was carried out by management as on the closing date, and the physical count tallied with the cash book balance. All bank accounts operated by the Entity during the year are recorded in the books and have been duly reconciled.

5. Trade Receivables & Loans/Advances:
Trade receivables${
      embedFigures && (tradeReceivables > 0 || pyTradeReceivables > 0)
        ? ` amounting to ₹${formatINR(tradeReceivables)} (Previous Year: ₹${formatINR(pyTradeReceivables)})`
        : ''
    }${
      embedFigures && loansAndAdvances > 0
        ? ` and Loans & Advances of ₹${formatINR(loansAndAdvances)}`
        : ''
    } are good and recoverable to the best of our knowledge. In our opinion, adequate provision has been made in the accounts for any doubtful debts or unrecoverable advances. No debts are due by partners or relatives other than those disclosed.

6. Trade Payables & MSMED Act Compliance:
Total Trade Payables as at year-end amount to ${
      embedFigures && (tradePayables > 0 || pyTradePayables > 0)
        ? `₹${formatINR(tradePayables)} (Previous Year: ₹${formatINR(pyTradePayables)})${
            msmeDues > 0
              ? `, including ₹${formatINR(msmeDues)} due to Micro and Small Enterprises and ₹${formatINR(otherTradePayables)} due to other creditors`
              : ''
          }. `
        : 'the amounts stated in Note 9. '
}The Entity has identified Micro, Small and Medium Enterprises based on available supplier information. ${
      formData.msmeComplianceConfirmed
        ? 'Disclosures under Section 22 of the MSMED Act, 2006 have been made based on confirmations received and no delayed payment interest liability is outstanding.'
        : 'No interest liability is payable under the MSMED Act.'
    }

7. Property, Plant and Equipment (PPE) & Depreciation:
${
  embedFigures && (ppeNetBlock > 0 || pyPpeNetBlock > 0)
    ? `The net carrying value of Property, Plant and Equipment as at year-end is ₹${formatINR(ppeNetBlock)} (Previous Year: ₹${formatINR(pyPpeNetBlock)}). Depreciation charged for the year amounting to ₹${formatINR(depreciationExpense)} has been calculated in accordance with the accounting policy adopted. `
    : ''
}All additions to fixed assets represent genuine acquisitions held in the Entity's name, and complete physical verification was performed by management.

8. Borrowings & Statutory Liabilities:
${
  embedFigures && (longTermBorrowings > 0 || shortTermBorrowings > 0 || otherCurrentLiabilities > 0)
    ? `Borrowings comprise Long-term Borrowings of ₹${formatINR(longTermBorrowings)}, Short-term Borrowings of ₹${formatINR(shortTermBorrowings)}, and Other Current Liabilities of ₹${formatINR(otherCurrentLiabilities)}. `
    : ''
}All loans, facilities, and statutory dues (GST, TDS, PF, ESIC) have been appropriately recognized in the financial records.

9. Cash Transactions under Section 269SS & 269T:
${
  formData.sec269ComplianceConfirmed
    ? 'No loan or deposit or specified sum has been accepted or repaid in cash exceeding the prescribed limits of Section 269SS and Section 269T of the Income Tax Act, 1961 (₹20,000 threshold).'
    : 'All cash transaction compliances have been reviewed.'
}

10. Related Party Transactions & Partner Remuneration:
All transactions with related parties and partners, including ${
      !isProprietor && partnersRemuneration > 0
        ? `partners' remuneration of ₹${formatINR(partnersRemuneration)} and `
        : ''
    }interest on capital, have been made in strict adherence to the Partnership Deed / constitution and the permissible limits of Section 40(b) of the Income Tax Act, 1961.

11. Litigations, Claims & Contingent Liabilities:
${
  formData.litigationDetails ||
  'There are no pending litigations, disputes with tax authorities (Income Tax, GST, PF, ESIC) or claims against the Entity other than those disclosed.'
}
${
  formData.contingentLiabilitiesDetails ||
  'There are no material contingent liabilities or capital commitments that require disclosure.'
}

12. Fraud & Irregularities:
We acknowledge our responsibility for the design and implementation of internal controls to prevent and detect fraud. We have disclosed to you that there are no known frauds, suspected frauds, or allegations of fraud affecting the Entity.

13. Subsequent Events:
There have been no events subsequent to the balance sheet date that require adjustments to or disclosure in the financial statements.

14. Specific Representations:
${formData.customRepresentations || 'All transactions have been recorded in the normal course of business.'}
`;

    if (includeSummaryTable && hasFinancials) {
      letter += `
----------------------------------------------------------------------------------------------------
ANNEXURE: SUMMARY OF FINANCIAL STATEMENT BALANCES CONFIRMED BY MANAGEMENT (ICAI SA 580)
Period Ended: ${config.reportingPeriod || 'March 31, 2026'} | Financial Year: ${config.financialYear || '2025-26'}
----------------------------------------------------------------------------------------------------
1. Owners' / Partners' Capital (Note 3):        ₹${formatINR(ownersCapital)} (PY: ₹${formatINR(pyOwnersCapital)})
2. Reserves & Surplus (Note 4):                 ₹${formatINR(reservesAndSurplus)} (PY: ₹${formatINR(balanceSheet?.previousYear?.reservesAndSurplus || 0)})
3. Long-term Borrowings (Note 5):               ₹${formatINR(longTermBorrowings)} (PY: ₹${formatINR(pyLongTermBorrowings)})
4. Short-term Borrowings (Note 5):              ₹${formatINR(shortTermBorrowings)} (PY: ₹${formatINR(pyShortTermBorrowings)})
5. Trade Payables (Note 9):                     ₹${formatINR(tradePayables)} (PY: ₹${formatINR(pyTradePayables)})
   - Dues to MSMEs:                             ₹${formatINR(msmeDues)}
   - Dues to Other Creditors:                   ₹${formatINR(otherTradePayables)}
6. Other Current Liabilities (Note 10):         ₹${formatINR(otherCurrentLiabilities)} (PY: ₹${formatINR(balanceSheet?.previousYear?.otherCurrentLiabilities || 0)})
7. Total Balance Sheet / Assets:                ₹${formatINR(bsTotal)} (PY: ₹${formatINR(pyBsTotal)})
8. Property, Plant & Equipment (Net) (Note 11): ₹${formatINR(ppeNetBlock)} (PY: ₹${formatINR(pyPpeNetBlock)})
9. Closing Inventories (Note 15):               ₹${formatINR(closingStock)} (PY: ₹${formatINR(pyClosingStock)})
10. Trade Receivables (Note 16):                ₹${formatINR(tradeReceivables)} (PY: ₹${formatINR(pyTradeReceivables)})
11. Cash & Bank Balances (Note 17):             ₹${formatINR(cashAndBank)} (PY: ₹${formatINR(pyCashAndBank)})
12. Revenue from Operations (Note 19):          ₹${formatINR(revenue)} (PY: ₹${formatINR(pyRevenue)})
13. Other Income (Note 20):                     ₹${formatINR(otherIncome)} (PY: ₹${formatINR(pyOtherIncome)})
14. Total Revenue:                              ₹${formatINR(totalRevenue)} (PY: ₹${formatINR(pyTotalRevenue)})
15. Depreciation Expense (Note 24):             ₹${formatINR(depreciationExpense)} (PY: ₹${formatINR(profitAndLoss?.previousYear?.depreciationExpense || 0)})
${
  !isProprietor && partnersRemuneration > 0
    ? `16. Partners' Remuneration:                   ₹${formatINR(partnersRemuneration)} (Sec 40(b) compliant)\n`
    : ''
}17. Net Profit / (Loss) for the Year:           ₹${formatINR(netProfit)} (PY: ₹${formatINR(pyNetProfit)})
----------------------------------------------------------------------------------------------------
`;
    }

    letter += `
Yours faithfully,
For ${config.entityName}

__________________________
${primarySigner}
${primaryDesignation}

${
  formData.coSignatoryName
    ? `__________________________\n${formData.coSignatoryName}\n${formData.coSignatoryDesignation || 'Partner'}`
    : ''
}`;

    return letter;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getFullLetterText());
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                ICAI SA 580
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Written Representations from Management
              </span>
              {hasFinancials && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  Live Prepared Financials Carried In
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Management Representation Letter (MRL) Generator
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Draft and generate statutory Management Representation Letters conforming to ICAI Standard on
              Auditing (SA) 580 carrying in actual prepared figures for inventories, cash, receivables,
              payables, turnover, and statutory disclosures.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onUpdateConfig && (
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                {isSaved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
                <span>{isSaved ? 'Saved to Entity!' : 'Save Parameters'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Letter</span>
            </button>
          </div>
        </div>

        {/* Live Financial Balances Carried In Banner */}
        {hasFinancials && (
          <div className="mt-4 p-3.5 rounded-xl bg-gradient-to-r from-indigo-50/70 via-slate-50 to-emerald-50/50 border border-indigo-100/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-indigo-100/60">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-900">
                  Actual Prepared Financial Data Carried into SA 580 Representations
                </span>
                <span className="text-[10px] text-slate-500 font-mono">FY {config.financialYear}</span>
              </div>
              <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                <span>Period: <strong>{config.reportingPeriod || 'March 31, 2026'}</strong></span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-2.5 text-xs">
              <div className="p-2 rounded-lg bg-white border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">B/S Total</span>
                <span className="font-mono font-bold text-slate-900 text-xs">₹{formatINR(bsTotal)}</span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Turnover</span>
                <span className="font-mono font-bold text-slate-900 text-xs">₹{formatINR(revenue)}</span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Closing Stock</span>
                <span className="font-mono font-bold text-emerald-700 text-xs">₹{formatINR(closingStock)}</span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Cash &amp; Bank</span>
                <span className="font-mono font-bold text-emerald-700 text-xs">₹{formatINR(cashAndBank)}</span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Receivables</span>
                <span className="font-mono font-bold text-slate-900 text-xs">₹{formatINR(tradeReceivables)}</span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Payables</span>
                <span className="font-mono font-bold text-slate-900 text-xs">₹{formatINR(tradePayables)}</span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Net Profit</span>
                <span
                  className={`font-mono font-bold text-xs ${
                    netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  ₹{formatINR(netProfit)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Sub-Tabs */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-100 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('fields')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'fields'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>1. MRL Creation Fields &amp; Statutory Data Points</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'preview'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FileCheck className="w-4 h-4 text-indigo-400" />
            <span>2. Formatted Letterhead Preview &amp; Print</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. CREATION FIELDS TAB                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'fields' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-6">
          {/* Inclusion Toggles for Live Financial Figures */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Prepared Financials Integration Options (SA 580)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 cursor-pointer shadow-2xs">
                <input
                  type="checkbox"
                  checked={embedFigures}
                  onChange={(e) => handleFieldChange('includeFinancialFiguresInClauses', e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded mt-0.5"
                />
                <div>
                  <span className="font-bold text-slate-900 block">
                    Carry Prepared Figures in MRL Clauses
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Automatically carries closing stock (₹{formatINR(closingStock)}), cash &amp; bank (₹{formatINR(cashAndBank)}), receivables, payables, and turnover into clauses.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 cursor-pointer shadow-2xs">
                <input
                  type="checkbox"
                  checked={includeSummaryTable}
                  onChange={(e) => handleFieldChange('includeFinancialSummaryTable', e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded mt-0.5"
                />
                <div>
                  <span className="font-bold text-slate-900 block">
                    Attach Statutory Financial Balances Annexure
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Appends a formal ICAI schedule table of CY vs PY balances confirmed by management at the end of the representation letter.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Signatory and Date */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>Date &amp; Authorized Management Signatories</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Date of Representation Letter
                </label>
                <input
                  type="text"
                  value={formData.letterDate || ''}
                  onChange={(e) => handleFieldChange('letterDate', e.target.value)}
                  placeholder="e.g. 31-03-2026"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Should match or precede audit report signing date
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Primary Signatory Name
                </label>
                <input
                  type="text"
                  value={formData.signatoryName || ''}
                  onChange={(e) => handleFieldChange('signatoryName', e.target.value)}
                  placeholder="e.g. Managing Partner / Proprietor"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Primary Designation
                </label>
                <input
                  type="text"
                  value={formData.signatoryDesignation || ''}
                  onChange={(e) => handleFieldChange('signatoryDesignation', e.target.value)}
                  placeholder="Managing Partner / Sole Proprietor"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Co-Signatory Name (Optional)
                </label>
                <input
                  type="text"
                  value={formData.coSignatoryName || ''}
                  onChange={(e) => handleFieldChange('coSignatoryName', e.target.value)}
                  placeholder="e.g. Second Partner / Director"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Co-Signatory Designation
                </label>
                <input
                  type="text"
                  value={formData.coSignatoryDesignation || ''}
                  onChange={(e) => handleFieldChange('coSignatoryDesignation', e.target.value)}
                  placeholder="Partner"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Statutory Management Confirmations */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Mandatory ICAI SA 580 Statutory Confirmations</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.physicalVerificationConfirmed ?? true}
                  onChange={(e) => handleFieldChange('physicalVerificationConfirmed', e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded mt-0.5"
                />
                <div>
                  <span className="font-bold text-slate-900 block">Inventory Physical Verification</span>
                  <span className="text-[10px] text-slate-500">
                    Confirmed physical count at year-end {closingStock > 0 ? `(₹${formatINR(closingStock)})` : ''}
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.cashInHandVerified ?? true}
                  onChange={(e) => handleFieldChange('cashInHandVerified', e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded mt-0.5"
                />
                <div>
                  <span className="font-bold text-slate-900 block">Cash Count &amp; Reconciliation</span>
                  <span className="text-[10px] text-slate-500">
                    Physical cash tallied with cash book {cashAndBank > 0 ? `(₹${formatINR(cashAndBank)})` : ''}
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.receivablesRecoverableConfirmed ?? true}
                  onChange={(e) => handleFieldChange('receivablesRecoverableConfirmed', e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded mt-0.5"
                />
                <div>
                  <span className="font-bold text-slate-900 block">Receivables Recoverability</span>
                  <span className="text-[10px] text-slate-500">
                    Debts good &amp; adequate provision {tradeReceivables > 0 ? `(₹${formatINR(tradeReceivables)})` : ''}
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.msmeComplianceConfirmed ?? true}
                  onChange={(e) => handleFieldChange('msmeComplianceConfirmed', e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded mt-0.5"
                />
                <div>
                  <span className="font-bold text-slate-900 block">MSMED Act Section 22 Compliance</span>
                  <span className="text-[10px] text-slate-500">
                    Supplier classification &amp; delay interest {msmeDues > 0 ? `(MSME: ₹${formatINR(msmeDues)})` : ''}
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.sec269ComplianceConfirmed ?? true}
                  onChange={(e) => handleFieldChange('sec269ComplianceConfirmed', e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded mt-0.5"
                />
                <div>
                  <span className="font-bold text-slate-900 block">Sec 269SS &amp; 269T Cash Limits</span>
                  <span className="text-[10px] text-slate-500">No cash loans accepted/repaid &gt; ₹20k</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.fraudDeclarationConfirmed ?? true}
                  onChange={(e) => handleFieldChange('fraudDeclarationConfirmed', e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded mt-0.5"
                />
                <div>
                  <span className="font-bold text-slate-900 block">Fraud &amp; Irregularity Declaration</span>
                  <span className="text-[10px] text-slate-500">No fraud or material non-compliance detected</span>
                </div>
              </label>
            </div>
          </div>

          {/* Detailed Customizations */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileText className="w-4 h-4 text-amber-600" />
              <span>Specific Valuation, Litigation &amp; Custom Representation Fields</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Inventory Valuation &amp; Stock Verification Method
                </label>
                <input
                  type="text"
                  value={formData.inventoryValuationMethod || ''}
                  onChange={(e) => handleFieldChange('inventoryValuationMethod', e.target.value)}
                  placeholder="Valued at lower of cost or net realizable value on FIFO basis, physically verified by management as on year-end."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Litigations &amp; Disputed Tax Demands
                </label>
                <textarea
                  rows={2}
                  value={formData.litigationDetails || ''}
                  onChange={(e) => handleFieldChange('litigationDetails', e.target.value)}
                  placeholder="No disputed tax demands or court litigations outstanding against the entity."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Contingent Liabilities &amp; Guarantees
                </label>
                <textarea
                  rows={2}
                  value={formData.contingentLiabilitiesDetails || ''}
                  onChange={(e) => handleFieldChange('contingentLiabilitiesDetails', e.target.value)}
                  placeholder="There are no contingent liabilities or capital commitments that require disclosure."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Custom Entity-Specific Management Representations
                </label>
                <textarea
                  rows={3}
                  value={formData.customRepresentations || ''}
                  onChange={(e) => handleFieldChange('customRepresentations', e.target.value)}
                  placeholder="All transactions have been recorded in the normal course of business and are reflected in the financial statements in accordance with applicable deed and regulations."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none leading-relaxed"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            {onUpdateConfig ? (
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4 text-emerald-400" />
                <span>Save Representation Parameters</span>
              </button>
            ) : <div />}

            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>View &amp; Print Letterhead</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PREVIEW & PRINT TAB                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-100 p-3 rounded-xl text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">
                Official Management Representation Letter (ICAI SA 580)
              </span>
              {hasFinancials && embedFigures && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium text-[10px]">
                  ✓ Financial Balances Integrated
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Copied!' : 'Copy Letter'}</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span>Print Document</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 shadow-sm font-serif text-slate-900 space-y-5 text-sm leading-relaxed max-w-3xl mx-auto print:p-0 print:border-none print:shadow-none">
            {/* Letterhead */}
            <div className="text-center border-b border-slate-300 pb-5">
              <h1 className="text-xl font-bold uppercase tracking-wide font-sans">{config.entityName}</h1>
              <p className="text-xs text-slate-600 font-sans mt-0.5">
                {config.registeredAddress || config.address || 'Principal Place of Business'}
              </p>
              {config.pan && (
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  PAN: {config.pan} • GSTIN: {config.gstin || 'N/A'}
                </p>
              )}
            </div>

            <div className="flex justify-between items-baseline font-sans text-xs text-slate-700">
              <div>
                <strong>Management Representation Ref:</strong>{' '}
                <span className="font-mono">MRL/{config.financialYear}/01</span>
              </div>
              <div>
                <strong>Date:</strong> {formData.letterDate || '31-03-2026'}
              </div>
            </div>

            <div className="text-xs font-sans leading-normal">
              <div>To,</div>
              <div className="font-bold text-slate-900 text-sm">M/s {auditorFirm}</div>
              <div>Chartered Accountants</div>
              {config.firmRegistrationNo && <div>Firm Registration No: {config.firmRegistrationNo}</div>}
              {config.placeOfSigning && <div>{config.placeOfSigning}</div>}
            </div>

            <div className="font-sans font-bold text-sm text-slate-900 underline">
              Sub: Management Representation Letter for Statutory Audit for the Period Ended{' '}
              {config.reportingPeriod || 'March 31, 2026'}
            </div>

            <p>Dear Sir / Madam,</p>

            <p>
              This representation letter is provided in connection with your audit of the financial
              statements of <strong>{config.entityName}</strong> ("the Entity") for the year ended{' '}
              {config.reportingPeriod || 'March 31, 2026'}, for the purpose of expressing an opinion as
              to whether the financial statements give a true and fair view in accordance with the
              Guidance Note on Financial Statements of Non-Corporate Entities issued by the Institute of
              Chartered Accountants of India (ICAI).
            </p>

            <p>
              We confirm, to the best of our knowledge and belief, having made appropriate inquiries, the
              following representations:
            </p>

            <div className="space-y-3.5 pl-2">
              <div>
                <p>
                  <strong>1. Preparation Responsibility &amp; Financial Statements:</strong> We acknowledge
                  our responsibility for the preparation and fair presentation of the financial statements in
                  accordance with the Guidance Note on Financial Statements of Non-Corporate Entities issued by
                  the ICAI and applicable deed/statutory provisions.
                </p>
                {embedFigures && hasFinancials && (
                  <div className="mt-1.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-sans text-xs text-slate-800">
                    <div className="font-semibold text-slate-900 mb-1">
                      Key Financial Aggregates Confirmed by Management:
                    </div>
                    <ul className="grid grid-cols-2 gap-x-4 gap-y-1 list-disc pl-4 text-[11px]">
                      <li>
                        Balance Sheet Total: <strong className="font-mono">₹{formatINR(bsTotal)}</strong> (PY: ₹{formatINR(pyBsTotal)})
                      </li>
                      <li>
                        Turnover / Operations: <strong className="font-mono">₹{formatINR(revenue)}</strong> (PY: ₹{formatINR(pyRevenue)})
                      </li>
                      <li>
                        Net {netProfit >= 0 ? 'Profit' : 'Loss'}:{' '}
                        <strong className="font-mono">₹{formatINR(Math.abs(netProfit))}</strong> (PY: ₹{formatINR(Math.abs(pyNetProfit))})
                      </li>
                      <li>
                        {isProprietor ? "Proprietor's" : "Partners'"} Capital:{' '}
                        <strong className="font-mono">₹{formatINR(ownersCapital)}</strong> (PY: ₹{formatINR(pyOwnersCapital)})
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              <p>
                <strong>2. Completeness of Books &amp; Records:</strong> All books of account, registers,
                branch returns, contracts, bank statements, and supporting vouchers have been made available
                to you without exception. All transactions undertaken by the Entity are properly recorded and
                accurately reflected in the financial statements.
              </p>

              <p>
                <strong>3. Inventory Valuation &amp; Verification:</strong> The inventories as at{' '}
                {config.reportingPeriod || 'March 31, 2026'}{' '}
                {embedFigures && (closingStock > 0 || pyClosingStock > 0) ? (
                  <span>
                    amounting to <strong className="font-mono">₹{formatINR(closingStock)}</strong> (Previous
                    Year: ₹{formatINR(pyClosingStock)}) were{' '}
                  </span>
                ) : (
                  'were '
                )}
                {formData.inventoryValuationMethod ||
                  'valued at lower of cost or net realizable value on FIFO basis'}. Complete physical
                verification of all inventories was carried out by management at the year-end, and no
                obsolete or damaged goods are carried above net realizable value.
              </p>

              <p>
                <strong>4. Cash and Bank Balances:</strong>{' '}
                {embedFigures && (cashAndBank > 0 || pyCashAndBank > 0) ? (
                  <span>
                    Total Cash and Bank Balances as on the closing date aggregate to{' '}
                    <strong className="font-mono">₹{formatINR(cashAndBank)}</strong> (Previous Year:
                    ₹{formatINR(pyCashAndBank)})
                    {cashInHand > 0
                      ? `, comprising physical Cash-in-Hand of ₹${formatINR(cashInHand)} and Bank Balances of ₹${formatINR(bankBalances)}`
                      : ''}
                    . Physical verification of cash was conducted as on year-end and matched with the cash book.
                  </span>
                ) : (
                  'Physical verification of cash was conducted as on year-end and matched with the cash book.'
                )}{' '}
                All active bank accounts operated by the Entity are duly recorded and reconciled.
              </p>

              <p>
                <strong>5. Trade Receivables &amp; Advances:</strong> Book debts{' '}
                {embedFigures && (tradeReceivables > 0 || pyTradeReceivables > 0) ? (
                  <span>
                    amounting to <strong className="font-mono">₹{formatINR(tradeReceivables)}</strong>{' '}
                    (Previous Year: ₹{formatINR(pyTradeReceivables)}){' '}
                  </span>
                ) : (
                  ''
                )}
                {embedFigures && loansAndAdvances > 0 ? (
                  <span>
                    and loans/advances of <strong className="font-mono">₹{formatINR(loansAndAdvances)}</strong>{' '}
                  </span>
                ) : (
                  ''
                )}
                are considered good and recoverable. In our opinion, adequate provision for doubtful debts has
                been provided in the accounts. No debts are due by partners or related parties other than
                disclosed.
              </p>

              <p>
                <strong>6. Trade Payables &amp; MSMED Act Section 22:</strong> Trade payables{' '}
                {embedFigures && (tradePayables > 0 || pyTradePayables > 0) ? (
                  <span>
                    aggregate to <strong className="font-mono">₹{formatINR(tradePayables)}</strong>{' '}
                    (Previous Year: ₹{formatINR(pyTradePayables)})
                    {msmeDues > 0
                      ? `, including ₹${formatINR(msmeDues)} due to Micro & Small Enterprises`
                      : ''}
                    .{' '}
                  </span>
                ) : (
                  ''
                )}
                Identification of Micro, Small and Medium Enterprises has been carried out based on supplier
                confirmations. No delayed payment interest liability is outstanding under the MSMED Act, 2006.
              </p>

              <p>
                <strong>7. Property, Plant and Equipment (PPE) &amp; Depreciation:</strong>{' '}
                {embedFigures && (ppeNetBlock > 0 || pyPpeNetBlock > 0) ? (
                  <span>
                    Net carrying value of Property, Plant and Equipment as at year-end is{' '}
                    <strong className="font-mono">₹{formatINR(ppeNetBlock)}</strong> (Previous Year:
                    ₹{formatINR(pyPpeNetBlock)}), with depreciation of{' '}
                    <strong className="font-mono">₹{formatINR(depreciationExpense)}</strong> charged for the
                    year.{' '}
                  </span>
                ) : (
                  ''
                )}
                All fixed assets are held in the Entity's name and were physically verified by management.
              </p>

              <p>
                <strong>8. Borrowings &amp; Statutory Dues:</strong>{' '}
                {embedFigures && (longTermBorrowings > 0 || shortTermBorrowings > 0) ? (
                  <span>
                    Borrowings comprise long-term facilities of{' '}
                    <strong className="font-mono">₹{formatINR(longTermBorrowings)}</strong> and short-term
                    borrowings of{' '}
                    <strong className="font-mono">₹{formatINR(shortTermBorrowings)}</strong>.{' '}
                  </span>
                ) : (
                  ''
                )}
                All statutory dues including GST, TDS, PF, and ESIC have been properly provided and
                deposited.
              </p>

              <p>
                <strong>9. Cash Limits (Sections 269SS &amp; 269T):</strong> No loans or deposits in cash
                exceeding the prescribed threshold of ₹20,000 have been accepted or repaid during the
                financial year under the Income Tax Act, 1961.
              </p>

              <p>
                <strong>10. Related Party Transactions:</strong> Transactions with related parties and partners
                {embedFigures && !isProprietor && partnersRemuneration > 0 ? (
                  <span>
                    , including partners' remuneration of{' '}
                    <strong className="font-mono">₹{formatINR(partnersRemuneration)}</strong> and{' '}
                  </span>
                ) : (
                  ', including '
                )}
                interest on capital, have been made in strict accordance with the Partnership Deed and Section
                40(b) of the Income Tax Act.
              </p>

              <p>
                <strong>11. Litigations &amp; Contingent Liabilities:</strong>{' '}
                {formData.litigationDetails ||
                  'No disputed tax demands or court litigations are outstanding against the entity.'}{' '}
                {formData.contingentLiabilitiesDetails ||
                  'There are no undisclosed contingent liabilities or capital commitments.'}
              </p>

              <p>
                <strong>12. Fraud &amp; Internal Controls:</strong> We confirm there have been no frauds,
                suspected frauds, or material regulatory non-compliances affecting the Entity.
              </p>

              <p>
                <strong>13. Subsequent Events:</strong> No events have occurred after the balance sheet date
                that require adjustments to or disclosure in the financial statements.
              </p>

              {formData.customRepresentations && (
                <p>
                  <strong>14. Special Representation:</strong> {formData.customRepresentations}
                </p>
              )}
            </div>

            {/* Statutory Balances Annexure Table */}
            {includeSummaryTable && hasFinancials && (
              <div className="pt-6 font-sans">
                <div className="border-t-2 border-b border-slate-900 py-2 text-center mb-3">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                    ANNEXURE: SUMMARY OF FINANCIAL STATEMENT BALANCES CONFIRMED BY MANAGEMENT (ICAI SA 580)
                  </h3>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    For the Period Ended {config.reportingPeriod || 'March 31, 2026'} | Financial Year {config.financialYear}
                  </p>
                </div>

                <table className="w-full text-xs border border-slate-300">
                  <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-[11px]">
                    <tr>
                      <th className="py-2 px-3 text-left">Statutory Line Item</th>
                      <th className="py-2 px-2 text-center w-20">ICAI Note</th>
                      <th className="py-2 px-3 text-right">CY Ended {config.reportingPeriod || '31-03-2026'} (₹)</th>
                      <th className="py-2 px-3 text-right">PY Ended {config.previousReportingPeriod || '31-03-2025'} (₹)</th>
                      <th className="py-2 px-2 text-center w-24">Management Affirmation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                    <tr>
                      <td className="py-1.5 px-3 font-sans text-slate-900 font-medium">
                        {isProprietor ? "Proprietor's Capital" : "Partners' Capital"}
                      </td>
                      <td className="py-1.5 px-2 text-center font-sans text-slate-500">Note 3</td>
                      <td className="py-1.5 px-3 text-right font-bold text-slate-900">₹{formatINR(ownersCapital)}</td>
                      <td className="py-1.5 px-3 text-right text-slate-600">₹{formatINR(pyOwnersCapital)}</td>
                      <td className="py-1.5 px-2 text-center font-sans text-emerald-800 text-[10px] font-semibold">Confirmed</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-sans text-slate-900">Long-term Borrowings</td>
                      <td className="py-1.5 px-2 text-center font-sans text-slate-500">Note 5</td>
                      <td className="py-1.5 px-3 text-right text-slate-900">₹{formatINR(longTermBorrowings)}</td>
                      <td className="py-1.5 px-3 text-right text-slate-600">₹{formatINR(pyLongTermBorrowings)}</td>
                      <td className="py-1.5 px-2 text-center font-sans text-emerald-800 text-[10px] font-semibold">Confirmed</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-sans text-slate-900">
                        Trade Payables (Total)
                        {msmeDues > 0 && <span className="block text-[10px] text-slate-500 font-sans">↳ MSME Dues: ₹{formatINR(msmeDues)}</span>}
                      </td>
                      <td className="py-1.5 px-2 text-center font-sans text-slate-500">Note 9</td>
                      <td className="py-1.5 px-3 text-right text-slate-900">₹{formatINR(tradePayables)}</td>
                      <td className="py-1.5 px-3 text-right text-slate-600">₹{formatINR(pyTradePayables)}</td>
                      <td className="py-1.5 px-2 text-center font-sans text-emerald-800 text-[10px] font-semibold">Confirmed</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-sans text-slate-900">Short-term Borrowings &amp; Current Liab.</td>
                      <td className="py-1.5 px-2 text-center font-sans text-slate-500">Note 5 &amp; 10</td>
                      <td className="py-1.5 px-3 text-right text-slate-900">₹{formatINR(shortTermBorrowings + otherCurrentLiabilities)}</td>
                      <td className="py-1.5 px-3 text-right text-slate-600">
                        ₹{formatINR(pyShortTermBorrowings + (balanceSheet?.previousYear?.otherCurrentLiabilities || 0))}
                      </td>
                      <td className="py-1.5 px-2 text-center font-sans text-emerald-800 text-[10px] font-semibold">Confirmed</td>
                    </tr>
                    <tr className="bg-slate-50 font-bold">
                      <td className="py-1.5 px-3 font-sans text-slate-900 uppercase">Total Balance Sheet Size</td>
                      <td className="py-1.5 px-2 text-center font-sans text-slate-700">ICAI BS</td>
                      <td className="py-1.5 px-3 text-right text-slate-900">₹{formatINR(bsTotal)}</td>
                      <td className="py-1.5 px-3 text-right text-slate-700">₹{formatINR(pyBsTotal)}</td>
                      <td className="py-1.5 px-2 text-center font-sans text-emerald-800 text-[10px]">Verified</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-sans text-slate-900">Property, Plant &amp; Equipment (Net)</td>
                      <td className="py-1.5 px-2 text-center font-sans text-slate-500">Note 11</td>
                      <td className="py-1.5 px-3 text-right text-slate-900">₹{formatINR(ppeNetBlock)}</td>
                      <td className="py-1.5 px-3 text-right text-slate-600">₹{formatINR(pyPpeNetBlock)}</td>
                      <td className="py-1.5 px-2 text-center font-sans text-emerald-800 text-[10px] font-semibold">Confirmed</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-sans text-slate-900">Inventories / Closing Stock</td>
                      <td className="py-1.5 px-2 text-center font-sans text-slate-500">Note 15</td>
                      <td className="py-1.5 px-3 text-right font-bold text-slate-900">₹{formatINR(closingStock)}</td>
                      <td className="py-1.5 px-3 text-right text-slate-600">₹{formatINR(pyClosingStock)}</td>
                      <td className="py-1.5 px-2 text-center font-sans text-emerald-800 text-[10px] font-semibold">Count Tallied</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-sans text-slate-900">Trade Receivables</td>
                      <td className="py-1.5 px-2 text-center font-sans text-slate-500">Note 16</td>
                      <td className="py-1.5 px-3 text-right text-slate-900">₹{formatINR(tradeReceivables)}</td>
                      <td className="py-1.5 px-3 text-right text-slate-600">₹{formatINR(pyTradeReceivables)}</td>
                      <td className="py-1.5 px-2 text-center font-sans text-emerald-800 text-[10px] font-semibold">Good &amp; Rec.</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-sans text-slate-900">Cash and Bank Balances</td>
                      <td className="py-1.5 px-2 text-center font-sans text-slate-500">Note 17</td>
                      <td className="py-1.5 px-3 text-right font-bold text-slate-900">₹{formatINR(cashAndBank)}</td>
                      <td className="py-1.5 px-3 text-right text-slate-600">₹{formatINR(pyCashAndBank)}</td>
                      <td className="py-1.5 px-2 text-center font-sans text-emerald-800 text-[10px] font-semibold">Reconciled</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-sans text-slate-900 font-medium">Revenue from Operations</td>
                      <td className="py-1.5 px-2 text-center font-sans text-slate-500">Note 19</td>
                      <td className="py-1.5 px-3 text-right font-bold text-slate-900">₹{formatINR(revenue)}</td>
                      <td className="py-1.5 px-3 text-right text-slate-600">₹{formatINR(pyRevenue)}</td>
                      <td className="py-1.5 px-2 text-center font-sans text-emerald-800 text-[10px] font-semibold">Confirmed</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-sans text-slate-900">Depreciation Charged</td>
                      <td className="py-1.5 px-2 text-center font-sans text-slate-500">Note 24</td>
                      <td className="py-1.5 px-3 text-right text-slate-900">₹{formatINR(depreciationExpense)}</td>
                      <td className="py-1.5 px-3 text-right text-slate-600">
                        ₹{formatINR(profitAndLoss?.previousYear?.depreciationExpense || 0)}
                      </td>
                      <td className="py-1.5 px-2 text-center font-sans text-emerald-800 text-[10px] font-semibold">As per Policy</td>
                    </tr>
                    {!isProprietor && partnersRemuneration > 0 && (
                      <tr>
                        <td className="py-1.5 px-3 font-sans text-slate-900">Partners' Remuneration</td>
                        <td className="py-1.5 px-2 text-center font-sans text-slate-500">Sec 40(b)</td>
                        <td className="py-1.5 px-3 text-right font-bold text-slate-900">₹{formatINR(partnersRemuneration)}</td>
                        <td className="py-1.5 px-3 text-right text-slate-600">
                          ₹{formatINR(profitAndLoss?.previousYear?.partnersRemuneration || 0)}
                        </td>
                        <td className="py-1.5 px-2 text-center font-sans text-emerald-800 text-[10px] font-semibold">Deed Compliant</td>
                      </tr>
                    )}
                    <tr className="bg-slate-50 font-bold border-t border-slate-300">
                      <td className="py-1.5 px-3 font-sans text-slate-900 uppercase">Net Profit / (Loss) for Year</td>
                      <td className="py-1.5 px-2 text-center font-sans text-slate-700">ICAI P&amp;L</td>
                      <td
                        className={`py-1.5 px-3 text-right ${
                          netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        ₹{formatINR(netProfit)}
                      </td>
                      <td className="py-1.5 px-3 text-right text-slate-700">₹{formatINR(pyNetProfit)}</td>
                      <td className="py-1.5 px-2 text-center font-sans text-emerald-800 text-[10px]">Agreed</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            <div className="pt-8 text-right font-sans text-xs">
              <p>Yours faithfully,</p>
              <p className="font-bold text-slate-900">For {config.entityName}</p>
              <div className="mt-8 border-t border-slate-400 pt-1 inline-block text-right">
                <strong>{primarySigner}</strong>
                <br />
                <span className="text-slate-600">{primaryDesignation}</span>
              </div>
              {formData.coSignatoryName && (
                <div className="mt-6 border-t border-slate-400 pt-1 inline-block text-right ml-8">
                  <strong>{formData.coSignatoryName}</strong>
                  <br />
                  <span className="text-slate-600">{formData.coSignatoryDesignation || 'Partner'}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
