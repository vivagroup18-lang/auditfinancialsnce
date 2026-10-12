import {
  EntityConfig,
  ManagementRepresentationConfig,
  BalanceSheetData,
  ProfitAndLossData,
  NoteScheduleData,
} from '../types';
import { formatINR } from './financialCalculations';

interface FinancialContext {
  balanceSheet?: BalanceSheetData;
  profitAndLoss?: ProfitAndLossData;
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function extractMrlFinancialFigures(
  config: EntityConfig,
  formData: ManagementRepresentationConfig,
  financials: FinancialContext,
  noteSchedules?: Record<number, NoteScheduleData>
) {
  const { balanceSheet, profitAndLoss } = financials;
  const isProprietor = config.entityType === 'Sole Proprietorship';
  const primarySigner =
    formData.signatoryName ||
    (isProprietor
      ? config.proprietorName || 'Proprietor'
      : config.signingPartnerName || config.partners?.[0]?.name || 'Managing Partner');
  const primaryDesignation =
    formData.signatoryDesignation || (isProprietor ? 'Sole Proprietor' : 'Managing Partner');
  const auditorFirm = config.auditorFirmName || config.auditorName || 'Chartered Accountants';

  const hasFinancials = Boolean(balanceSheet || profitAndLoss);
  const embedFigures = formData.includeFinancialFiguresInClauses ?? true;
  const includeSummaryTable = formData.includeFinancialSummaryTable ?? true;

  const bsTotal = balanceSheet?.totalAssets || balanceSheet?.totalEquityAndLiabilities || 0;
  const pyBsTotal =
    balanceSheet?.previousYear?.totalAssets ||
    balanceSheet?.previousYear?.totalEquityAndLiabilities ||
    0;

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

  return {
    isProprietor,
    primarySigner,
    primaryDesignation,
    auditorFirm,
    hasFinancials,
    embedFigures,
    includeSummaryTable,
    bsTotal,
    pyBsTotal,
    revenue,
    pyRevenue,
    otherIncome,
    pyOtherIncome,
    totalRevenue,
    pyTotalRevenue,
    netProfit,
    pyNetProfit,
    closingStock,
    pyClosingStock,
    cashAndBank,
    pyCashAndBank,
    cashInHand,
    bankBalances,
    tradeReceivables,
    pyTradeReceivables,
    loansAndAdvances,
    pyLoansAndAdvances,
    tradePayables,
    pyTradePayables,
    msmeDues,
    otherTradePayables,
    ppeNetBlock,
    pyPpeNetBlock,
    depreciationExpense,
    longTermBorrowings,
    pyLongTermBorrowings,
    shortTermBorrowings,
    pyShortTermBorrowings,
    otherCurrentLiabilities,
    ownersCapital,
    pyOwnersCapital,
    reservesAndSurplus,
    partnersRemuneration,
  };
}

export function generateMrlPlainText(
  config: EntityConfig,
  formData: ManagementRepresentationConfig,
  financials: FinancialContext,
  noteSchedules?: Record<number, NoteScheduleData>
): string {
  const f = extractMrlFinancialFigures(config, formData, financials, noteSchedules);

  let letter = `MANAGEMENT REPRESENTATION LETTER (ICAI SA 580)
Date: ${formData.letterDate || '31-03-2026'}

To,
M/s ${f.auditorFirm}
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
  f.embedFigures && f.hasFinancials
    ? `The prepared financial statements reflect:
   • Total Balance Sheet Size / Assets: ₹${formatINR(f.bsTotal)} (Previous Year: ₹${formatINR(f.pyBsTotal)})
   • Revenue from Operations: ₹${formatINR(f.revenue)} (Previous Year: ₹${formatINR(f.pyRevenue)})
   • Net ${f.netProfit >= 0 ? 'Profit' : 'Loss'} for the Year: ₹${formatINR(Math.abs(f.netProfit))} (Previous Year: ₹${formatINR(Math.abs(f.pyNetProfit))})
   • Total ${f.isProprietor ? "Proprietor's" : "Partners'"} Capital: ₹${formatINR(f.ownersCapital)} (Previous Year: ₹${formatINR(f.pyOwnersCapital)})`
    : ''
}

2. Completeness of Transactions & Access to Records:
We have made available to you all books of account, vouchers, agreements, minute books, bank statements, branch records, and all other relevant documentation. All transactions undertaken by the Entity during the year have been properly recorded in the accounting records and are reflected in the financial statements.

3. Inventory & Physical Verification:
The inventories as at ${config.reportingPeriod || 'March 31, 2026'}${
    f.embedFigures && (f.closingStock > 0 || f.pyClosingStock > 0)
      ? ` amounting to ₹${formatINR(f.closingStock)} (Previous Year: ₹${formatINR(f.pyClosingStock)})`
      : ''
  } were ${formData.inventoryValuationMethod || 'valued at the lower of cost and net realizable value on FIFO basis'}. Complete physical verification of all inventories was carried out by management at the year-end. No obsolete, damaged or unserviceable goods are carried at values exceeding their net realizable value.

4. Cash and Bank Balances:
${
  f.embedFigures && (f.cashAndBank > 0 || f.pyCashAndBank > 0)
    ? `Total Cash and Bank Balances as on the balance sheet date aggregate to ₹${formatINR(f.cashAndBank)} (Previous Year: ₹${formatINR(f.pyCashAndBank)})${
        f.cashInHand > 0
          ? `, comprising physical Cash-in-Hand of ₹${formatINR(f.cashInHand)} and Bank Balances of ₹${formatINR(f.bankBalances)} across active bank accounts`
          : ''
      }. `
    : ''
}Physical verification of cash-in-hand was carried out by management as on the closing date, and the physical count tallied with the cash book balance. All bank accounts operated by the Entity during the year are recorded in the books and have been duly reconciled.

5. Trade Receivables & Loans/Advances:
Trade receivables${
    f.embedFigures && (f.tradeReceivables > 0 || f.pyTradeReceivables > 0)
      ? ` amounting to ₹${formatINR(f.tradeReceivables)} (Previous Year: ₹${formatINR(f.pyTradeReceivables)})`
      : ''
  }${
    f.embedFigures && f.loansAndAdvances > 0
      ? ` and Loans & Advances of ₹${formatINR(f.loansAndAdvances)}`
      : ''
  } are good and recoverable to the best of our knowledge. In our opinion, adequate provision has been made in the accounts for any doubtful debts or unrecoverable advances. No debts are due by partners or relatives other than those disclosed.

6. Trade Payables & MSMED Act Compliance:
Total Trade Payables as at year-end amount to ${
    f.embedFigures && (f.tradePayables > 0 || f.pyTradePayables > 0)
      ? `₹${formatINR(f.tradePayables)} (Previous Year: ₹${formatINR(f.pyTradePayables)})${
          f.msmeDues > 0
            ? `, including ₹${formatINR(f.msmeDues)} due to Micro and Small Enterprises and ₹${formatINR(f.otherTradePayables)} due to other creditors`
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
  f.embedFigures && (f.ppeNetBlock > 0 || f.pyPpeNetBlock > 0)
    ? `The net carrying value of Property, Plant and Equipment as at year-end is ₹${formatINR(f.ppeNetBlock)} (Previous Year: ₹${formatINR(f.pyPpeNetBlock)}). Depreciation charged for the year amounting to ₹${formatINR(f.depreciationExpense)} has been calculated in accordance with the accounting policy adopted. `
    : ''
}All additions to fixed assets represent genuine acquisitions held in the Entity's name, and complete physical verification was performed by management.

8. Borrowings & Statutory Liabilities:
${
  f.embedFigures && (f.longTermBorrowings > 0 || f.shortTermBorrowings > 0 || f.otherCurrentLiabilities > 0)
    ? `Borrowings comprise Long-term Borrowings of ₹${formatINR(f.longTermBorrowings)}, Short-term Borrowings of ₹${formatINR(f.shortTermBorrowings)}, and Other Current Liabilities of ₹${formatINR(f.otherCurrentLiabilities)}. `
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
    !f.isProprietor && f.partnersRemuneration > 0
      ? `partners' remuneration of ₹${formatINR(f.partnersRemuneration)} and `
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

  if (f.includeSummaryTable && f.hasFinancials) {
    letter += `
----------------------------------------------------------------------------------------------------
ANNEXURE: SUMMARY OF FINANCIAL STATEMENT BALANCES CONFIRMED BY MANAGEMENT (ICAI SA 580)
Period Ended: ${config.reportingPeriod || 'March 31, 2026'} | Financial Year: ${config.financialYear || '2025-26'}
----------------------------------------------------------------------------------------------------
1. Owners' / Partners' Capital (Note 3):        ₹${formatINR(f.ownersCapital)} (PY: ₹${formatINR(f.pyOwnersCapital)})
2. Reserves & Surplus (Note 4):                 ₹${formatINR(f.reservesAndSurplus)} (PY: ₹${formatINR(financials.balanceSheet?.previousYear?.reservesAndSurplus || 0)})
3. Long-term Borrowings (Note 5):               ₹${formatINR(f.longTermBorrowings)} (PY: ₹${formatINR(f.pyLongTermBorrowings)})
4. Short-term Borrowings (Note 5):              ₹${formatINR(f.shortTermBorrowings)} (PY: ₹${formatINR(f.pyShortTermBorrowings)})
5. Trade Payables (Note 9):                     ₹${formatINR(f.tradePayables)} (PY: ₹${formatINR(f.pyTradePayables)})
   - Dues to MSMEs:                             ₹${formatINR(f.msmeDues)}
   - Dues to Other Creditors:                   ₹${formatINR(f.otherTradePayables)}
6. Other Current Liabilities (Note 10):         ₹${formatINR(f.otherCurrentLiabilities)} (PY: ₹${formatINR(financials.balanceSheet?.previousYear?.otherCurrentLiabilities || 0)})
7. Total Balance Sheet / Assets:                ₹${formatINR(f.bsTotal)} (PY: ₹${formatINR(f.pyBsTotal)})
8. Property, Plant & Equipment (Net) (Note 11): ₹${formatINR(f.ppeNetBlock)} (PY: ₹${formatINR(f.pyPpeNetBlock)})
9. Closing Inventories (Note 15):               ₹${formatINR(f.closingStock)} (PY: ₹${formatINR(f.pyClosingStock)})
10. Trade Receivables (Note 16):                ₹${formatINR(f.tradeReceivables)} (PY: ₹${formatINR(f.pyTradeReceivables)})
11. Cash & Bank Balances (Note 17):             ₹${formatINR(f.cashAndBank)} (PY: ₹${formatINR(f.pyCashAndBank)})
12. Revenue from Operations (Note 19):          ₹${formatINR(f.revenue)} (PY: ₹${formatINR(f.pyRevenue)})
13. Other Income (Note 20):                     ₹${formatINR(f.otherIncome)} (PY: ₹${formatINR(f.pyOtherIncome)})
14. Total Revenue:                              ₹${formatINR(f.totalRevenue)} (PY: ₹${formatINR(f.pyTotalRevenue)})
15. Depreciation Expense (Note 24):             ₹${formatINR(f.depreciationExpense)} (PY: ₹${formatINR(financials.profitAndLoss?.previousYear?.depreciationExpense || 0)})
${
  !f.isProprietor && f.partnersRemuneration > 0
    ? `16. Partners' Remuneration:                   ₹${formatINR(f.partnersRemuneration)} (Sec 40(b) compliant)\n`
    : ''
}17. Net Profit / (Loss) for the Year:           ₹${formatINR(f.netProfit)} (PY: ₹${formatINR(f.pyNetProfit)})
----------------------------------------------------------------------------------------------------
`;
  }

  letter += `
Yours faithfully,
For ${config.entityName}

__________________________
${f.primarySigner}
${f.primaryDesignation}

${
  formData.coSignatoryName
    ? `__________________________\n${formData.coSignatoryName}\n${formData.coSignatoryDesignation || 'Partner'}`
    : ''
}`;

  return letter;
}

export function generateMrlPrintHtml(
  config: EntityConfig,
  formData: ManagementRepresentationConfig,
  financials: FinancialContext,
  noteSchedules?: Record<number, NoteScheduleData>
): string {
  const f = extractMrlFinancialFigures(config, formData, financials, noteSchedules);

  const entityName = escapeHtml(config.entityName || 'Entity Name');
  const address = escapeHtml(config.registeredAddress || config.address || 'Principal Place of Business');
  const pan = escapeHtml(config.pan || '');
  const gstin = escapeHtml(config.gstin || '');
  const fy = escapeHtml(config.financialYear || '2025-26');
  const period = escapeHtml(config.reportingPeriod || 'March 31, 2026');
  const pyPeriod = escapeHtml(config.previousReportingPeriod || 'March 31, 2025');
  const letterDate = escapeHtml(formData.letterDate || '31-03-2026');
  const auditorFirm = escapeHtml(f.auditorFirm);
  const frn = escapeHtml(config.firmRegistrationNo || '');
  const place = escapeHtml(config.placeOfSigning || '');
  const primarySigner = escapeHtml(f.primarySigner);
  const primaryDesignation = escapeHtml(f.primaryDesignation);
  const coSigner = escapeHtml(formData.coSignatoryName || '');
  const coDesignation = escapeHtml(formData.coSignatoryDesignation || 'Partner');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Management Representation Letter - ${entityName} (${fy})</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 18mm 16mm 18mm 16mm;
    }
    *, *:before, *:after {
      box-sizing: border-box;
    }
    body {
      font-family: 'Times New Roman', Times, Georgia, serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #111827;
      background: #ffffff;
      margin: 0;
      padding: 18mm 16mm;
    }
    .letterhead {
      text-align: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .entity-title {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 15pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 4px 0;
      color: #0f172a;
    }
    .entity-sub {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 8.5pt;
      color: #475569;
      margin: 2px 0;
    }
    .entity-tax {
      font-family: 'Courier New', monospace;
      font-size: 8pt;
      color: #64748b;
      margin: 2px 0;
    }
    .meta-bar {
      display: flex;
      justify-content: space-between;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9pt;
      margin-bottom: 14px;
      color: #334155;
    }
    .auditor-box {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9.5pt;
      margin-bottom: 14px;
      line-height: 1.35;
    }
    .auditor-name {
      font-weight: 700;
      font-size: 10.5pt;
      color: #0f172a;
    }
    .subject-line {
      font-family: Arial, Helvetica, sans-serif;
      font-weight: 700;
      font-size: 10.5pt;
      text-decoration: underline;
      margin: 14px 0 12px 0;
      color: #0f172a;
    }
    p {
      margin: 0 0 10px 0;
      text-align: justify;
    }
    .clause-item {
      margin-bottom: 11px;
      text-align: justify;
    }
    .clause-item strong {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9.5pt;
      color: #0f172a;
    }
    .num {
      font-family: 'Courier New', Courier, monospace;
      font-weight: 700;
    }
    .summary-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 8px 12px;
      margin: 6px 0 10px 0;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 8.5pt;
    }
    .summary-box-title {
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .summary-box-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3px 12px;
    }
    .annexure-header {
      border-top: 2px solid #0f172a;
      border-bottom: 1px solid #0f172a;
      padding: 6px 0;
      text-align: center;
      margin-top: 20px;
      margin-bottom: 10px;
      page-break-before: auto;
    }
    .annexure-title {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0;
      color: #0f172a;
    }
    .annexure-sub {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 8pt;
      color: #64748b;
      margin: 2px 0 0 0;
    }
    table.annexure-table {
      width: 100%;
      border-collapse: collapse;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 8pt;
      page-break-inside: avoid;
      margin-bottom: 16px;
    }
    table.annexure-table th, table.annexure-table td {
      border: 1px solid #94a3b8;
      padding: 4px 6px;
    }
    table.annexure-table th {
      background: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
    }
    table.annexure-table td.text-right {
      text-align: right;
      font-family: 'Courier New', monospace;
    }
    table.annexure-table td.text-center {
      text-align: center;
    }
    table.annexure-table tr.total-row {
      background: #f8fafc;
      font-weight: 700;
    }
    .signatory-section {
      margin-top: 24px;
      page-break-inside: avoid;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9pt;
      text-align: right;
    }
    .signature-block {
      display: inline-block;
      text-align: right;
      margin-left: 30px;
    }
    .sig-line {
      margin-top: 36px;
      border-top: 1px solid #475569;
      padding-top: 3px;
      display: inline-block;
      min-width: 200px;
    }
    @media print {
      body {
        padding: 0;
        background: transparent;
      }
    }
  </style>
</head>
<body>

  <!-- Letterhead -->
  <div class="letterhead">
    <div class="entity-title">${entityName}</div>
    <div class="entity-sub">${address}</div>
    ${pan ? `<div class="entity-tax">PAN: ${pan} ${gstin ? `• GSTIN: ${gstin}` : ''}</div>` : ''}
  </div>

  <!-- Meta Ref and Date -->
  <div class="meta-bar">
    <div><strong>Management Representation Ref:</strong> <span class="num">MRL/${fy}/01</span></div>
    <div><strong>Date:</strong> ${letterDate}</div>
  </div>

  <!-- Auditor Address -->
  <div class="auditor-box">
    <div>To,</div>
    <div class="auditor-name">M/s ${auditorFirm}</div>
    <div>Chartered Accountants</div>
    ${frn ? `<div>Firm Registration No: ${frn}</div>` : ''}
    ${place ? `<div>${place}</div>` : ''}
  </div>

  <!-- Subject -->
  <div class="subject-line">
    Sub: Management Representation Letter for Statutory Audit for the Period Ended ${period}
  </div>

  <p>Dear Sir / Madam,</p>

  <p>
    This representation letter is provided in connection with your audit of the financial statements of
    <strong>${entityName}</strong> ("the Entity") for the year ended ${period}, for the purpose of
    expressing an opinion as to whether the financial statements give a true and fair view in accordance with
    the Guidance Note on Financial Statements of Non-Corporate Entities issued by the Institute of Chartered
    Accountants of India (ICAI).
  </p>

  <p>
    We confirm, to the best of our knowledge and belief, having made appropriate inquiries, the following
    representations:
  </p>

  <div class="clause-item">
    <strong>1. Preparation Responsibility &amp; Financial Statements:</strong> We acknowledge our responsibility
    for the preparation and fair presentation of the financial statements in accordance with the Guidance Note on
    Financial Statements of Non-Corporate Entities issued by the ICAI and applicable deed/statutory provisions.
    ${
      f.embedFigures && f.hasFinancials
        ? `
    <div class="summary-box">
      <div class="summary-box-title">Key Financial Aggregates Confirmed by Management:</div>
      <div class="summary-box-grid">
        <div>• Balance Sheet Total: <span class="num">₹${formatINR(f.bsTotal)}</span> (PY: ₹${formatINR(f.pyBsTotal)})</div>
        <div>• Turnover / Operations: <span class="num">₹${formatINR(f.revenue)}</span> (PY: ₹${formatINR(f.pyRevenue)})</div>
        <div>• Net ${f.netProfit >= 0 ? 'Profit' : 'Loss'}: <span class="num">₹${formatINR(Math.abs(f.netProfit))}</span> (PY: ₹${formatINR(Math.abs(f.pyNetProfit))})</div>
        <div>• ${f.isProprietor ? "Proprietor's" : "Partners'"} Capital: <span class="num">₹${formatINR(f.ownersCapital)}</span> (PY: ₹${formatINR(f.pyOwnersCapital)})</div>
      </div>
    </div>`
        : ''
    }
  </div>

  <div class="clause-item">
    <strong>2. Completeness of Books &amp; Records:</strong> All books of account, registers, branch returns,
    contracts, bank statements, and supporting vouchers have been made available to you without exception. All
    transactions undertaken by the Entity are properly recorded and accurately reflected in the financial statements.
  </div>

  <div class="clause-item">
    <strong>3. Inventory Valuation &amp; Verification:</strong> The inventories as at ${period} ${
      f.embedFigures && (f.closingStock > 0 || f.pyClosingStock > 0)
        ? `amounting to <span class="num">₹${formatINR(f.closingStock)}</span> (Previous Year: ₹${formatINR(f.pyClosingStock)}) were `
        : 'were '
    }${escapeHtml(formData.inventoryValuationMethod || 'valued at lower of cost or net realizable value on FIFO basis')}.
    Complete physical verification of all inventories was carried out by management at the year-end, and no obsolete or
    damaged goods are carried above net realizable value.
  </div>

  <div class="clause-item">
    <strong>4. Cash and Bank Balances:</strong> ${
      f.embedFigures && (f.cashAndBank > 0 || f.pyCashAndBank > 0)
        ? `Total Cash and Bank Balances as on the closing date aggregate to <span class="num">₹${formatINR(f.cashAndBank)}</span> (Previous Year: ₹${formatINR(f.pyCashAndBank)})${
            f.cashInHand > 0
              ? `, comprising physical Cash-in-Hand of <span class="num">₹${formatINR(f.cashInHand)}</span> and Bank Balances of <span class="num">₹${formatINR(f.bankBalances)}</span>`
              : ''
          }. Physical verification of cash was conducted as on year-end and matched with the cash book. `
        : 'Physical verification of cash was conducted as on year-end and matched with the cash book. '
    }All active bank accounts operated by the Entity are duly recorded and reconciled.
  </div>

  <div class="clause-item">
    <strong>5. Trade Receivables &amp; Advances:</strong> Book debts ${
      f.embedFigures && (f.tradeReceivables > 0 || f.pyTradeReceivables > 0)
        ? `amounting to <span class="num">₹${formatINR(f.tradeReceivables)}</span> (Previous Year: ₹${formatINR(f.pyTradeReceivables)}) `
        : ''
    }${
      f.embedFigures && f.loansAndAdvances > 0
        ? `and loans/advances of <span class="num">₹${formatINR(f.loansAndAdvances)}</span> `
        : ''
    }are considered good and recoverable. In our opinion, adequate provision for doubtful debts has been provided in the accounts. No debts are due by partners or related parties other than disclosed.
  </div>

  <div class="clause-item">
    <strong>6. Trade Payables &amp; MSMED Act Section 22:</strong> Trade payables ${
      f.embedFigures && (f.tradePayables > 0 || f.pyTradePayables > 0)
        ? `aggregate to <span class="num">₹${formatINR(f.tradePayables)}</span> (Previous Year: ₹${formatINR(f.pyTradePayables)})${
            f.msmeDues > 0
              ? `, including <span class="num">₹${formatINR(f.msmeDues)}</span> due to Micro & Small Enterprises`
              : ''
          }. `
        : ''
    }Identification of Micro, Small and Medium Enterprises has been carried out based on supplier confirmations. ${
      formData.msmeComplianceConfirmed
        ? 'Disclosures under Section 22 of the MSMED Act, 2006 have been made based on confirmations received and no delayed payment interest liability is outstanding.'
        : 'No interest liability is payable under the MSMED Act.'
    }
  </div>

  <div class="clause-item">
    <strong>7. Property, Plant and Equipment (PPE) &amp; Depreciation:</strong> ${
      f.embedFigures && (f.ppeNetBlock > 0 || f.pyPpeNetBlock > 0)
        ? `Net carrying value of Property, Plant and Equipment as at year-end is <span class="num">₹${formatINR(f.ppeNetBlock)}</span> (Previous Year: ₹${formatINR(f.pyPpeNetBlock)}), with depreciation of <span class="num">₹${formatINR(f.depreciationExpense)}</span> charged for the year. `
        : ''
    }All fixed assets are held in the Entity's name and were physically verified by management.
  </div>

  <div class="clause-item">
    <strong>8. Borrowings &amp; Statutory Dues:</strong> ${
      f.embedFigures && (f.longTermBorrowings > 0 || f.shortTermBorrowings > 0)
        ? `Borrowings comprise long-term facilities of <span class="num">₹${formatINR(f.longTermBorrowings)}</span> and short-term borrowings of <span class="num">₹${formatINR(f.shortTermBorrowings)}</span>. `
        : ''
    }All statutory dues including GST, TDS, PF, and ESIC have been properly provided and deposited.
  </div>

  <div class="clause-item">
    <strong>9. Cash Limits (Sections 269SS &amp; 269T):</strong> ${
      formData.sec269ComplianceConfirmed
        ? 'No loans or deposits in cash exceeding the prescribed threshold of ₹20,000 have been accepted or repaid during the financial year under the Income Tax Act, 1961.'
        : 'All cash transaction compliances have been reviewed.'
    }
  </div>

  <div class="clause-item">
    <strong>10. Related Party Transactions:</strong> Transactions with related parties and partners${
      f.embedFigures && !f.isProprietor && f.partnersRemuneration > 0
        ? `, including partners' remuneration of <span class="num">₹${formatINR(f.partnersRemuneration)}</span> and `
        : ', including '
    }interest on capital, have been made in strict accordance with the Partnership Deed and Section 40(b) of the Income Tax Act.
  </div>

  <div class="clause-item">
    <strong>11. Litigations &amp; Contingent Liabilities:</strong> ${escapeHtml(
      formData.litigationDetails || 'No disputed tax demands or court litigations are outstanding against the entity.'
    )} ${escapeHtml(
      formData.contingentLiabilitiesDetails || 'There are no undisclosed contingent liabilities or capital commitments.'
    )}
  </div>

  <div class="clause-item">
    <strong>12. Fraud &amp; Internal Controls:</strong> We confirm there have been no frauds, suspected frauds, or material regulatory non-compliances affecting the Entity.
  </div>

  <div class="clause-item">
    <strong>13. Subsequent Events:</strong> No events have occurred after the balance sheet date that require adjustments to or disclosure in the financial statements.
  </div>

  ${
    formData.customRepresentations
      ? `<div class="clause-item"><strong>14. Special Representation:</strong> ${escapeHtml(formData.customRepresentations)}</div>`
      : ''
  }

  <!-- Annexure Table -->
  ${
    f.includeSummaryTable && f.hasFinancials
      ? `
  <div class="annexure-header">
    <div class="annexure-title">ANNEXURE: SUMMARY OF FINANCIAL STATEMENT BALANCES CONFIRMED BY MANAGEMENT (ICAI SA 580)</div>
    <div class="annexure-sub">For the Period Ended ${period} | Financial Year ${fy}</div>
  </div>

  <table class="annexure-table">
    <thead>
      <tr>
        <th style="text-align: left; width: 34%;">Statutory Line Item</th>
        <th style="text-align: center; width: 14%;">ICAI Note</th>
        <th style="text-align: right; width: 22%;">CY Ended ${period} (₹)</th>
        <th style="text-align: right; width: 20%;">PY Ended ${pyPeriod} (₹)</th>
        <th style="text-align: center; width: 10%;">Affirmation</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>${f.isProprietor ? "Proprietor's Capital" : "Partners' Capital"}</strong></td>
        <td class="text-center">Note 3</td>
        <td class="text-right"><strong>₹${formatINR(f.ownersCapital)}</strong></td>
        <td class="text-right">₹${formatINR(f.pyOwnersCapital)}</td>
        <td class="text-center">Confirmed</td>
      </tr>
      <tr>
        <td>Long-term Borrowings</td>
        <td class="text-center">Note 5</td>
        <td class="text-right">₹${formatINR(f.longTermBorrowings)}</td>
        <td class="text-right">₹${formatINR(f.pyLongTermBorrowings)}</td>
        <td class="text-center">Confirmed</td>
      </tr>
      <tr>
        <td>Trade Payables (Total)${
          f.msmeDues > 0
            ? `<br><span style="font-size: 7.5pt; color: #64748b;">↳ MSME Dues: ₹${formatINR(f.msmeDues)}</span>`
            : ''
        }</td>
        <td class="text-center">Note 9</td>
        <td class="text-right">₹${formatINR(f.tradePayables)}</td>
        <td class="text-right">₹${formatINR(f.pyTradePayables)}</td>
        <td class="text-center">Confirmed</td>
      </tr>
      <tr>
        <td>Short-term Borrowings &amp; Current Liab.</td>
        <td class="text-center">Note 5 &amp; 10</td>
        <td class="text-right">₹${formatINR(f.shortTermBorrowings + f.otherCurrentLiabilities)}</td>
        <td class="text-right">₹${formatINR(f.pyShortTermBorrowings + (financials.balanceSheet?.previousYear?.otherCurrentLiabilities || 0))}</td>
        <td class="text-center">Confirmed</td>
      </tr>
      <tr class="total-row">
        <td>TOTAL BALANCE SHEET SIZE</td>
        <td class="text-center">ICAI BS</td>
        <td class="text-right">₹${formatINR(f.bsTotal)}</td>
        <td class="text-right">₹${formatINR(f.pyBsTotal)}</td>
        <td class="text-center">Verified</td>
      </tr>
      <tr>
        <td>Property, Plant &amp; Equipment (Net)</td>
        <td class="text-center">Note 11</td>
        <td class="text-right">₹${formatINR(f.ppeNetBlock)}</td>
        <td class="text-right">₹${formatINR(f.pyPpeNetBlock)}</td>
        <td class="text-center">Confirmed</td>
      </tr>
      <tr>
        <td>Inventories / Closing Stock</td>
        <td class="text-center">Note 15</td>
        <td class="text-right"><strong>₹${formatINR(f.closingStock)}</strong></td>
        <td class="text-right">₹${formatINR(f.pyClosingStock)}</td>
        <td class="text-center">Count Tallied</td>
      </tr>
      <tr>
        <td>Trade Receivables</td>
        <td class="text-center">Note 16</td>
        <td class="text-right">₹${formatINR(f.tradeReceivables)}</td>
        <td class="text-right">₹${formatINR(f.pyTradeReceivables)}</td>
        <td class="text-center">Good &amp; Rec.</td>
      </tr>
      <tr>
        <td>Cash and Bank Balances</td>
        <td class="text-center">Note 17</td>
        <td class="text-right"><strong>₹${formatINR(f.cashAndBank)}</strong></td>
        <td class="text-right">₹${formatINR(f.pyCashAndBank)}</td>
        <td class="text-center">Reconciled</td>
      </tr>
      <tr>
        <td>Revenue from Operations</td>
        <td class="text-center">Note 19</td>
        <td class="text-right"><strong>₹${formatINR(f.revenue)}</strong></td>
        <td class="text-right">₹${formatINR(f.pyRevenue)}</td>
        <td class="text-center">Confirmed</td>
      </tr>
      <tr>
        <td>Depreciation Charged</td>
        <td class="text-center">Note 24</td>
        <td class="text-right">₹${formatINR(f.depreciationExpense)}</td>
        <td class="text-right">₹${formatINR(financials.profitAndLoss?.previousYear?.depreciationExpense || 0)}</td>
        <td class="text-center">As per Policy</td>
      </tr>
      ${
        !f.isProprietor && f.partnersRemuneration > 0
          ? `
      <tr>
        <td>Partners' Remuneration</td>
        <td class="text-center">Sec 40(b)</td>
        <td class="text-right"><strong>₹${formatINR(f.partnersRemuneration)}</strong></td>
        <td class="text-right">₹${formatINR(financials.profitAndLoss?.previousYear?.partnersRemuneration || 0)}</td>
        <td class="text-center">Deed Compliant</td>
      </tr>`
          : ''
      }
      <tr class="total-row">
        <td>NET PROFIT / (LOSS) FOR THE YEAR</td>
        <td class="text-center">ICAI P&amp;L</td>
        <td class="text-right">₹${formatINR(f.netProfit)}</td>
        <td class="text-right">₹${formatINR(f.pyNetProfit)}</td>
        <td class="text-center">Agreed</td>
      </tr>
    </tbody>
  </table>`
      : ''
  }

  <!-- Signatures -->
  <div class="signatory-section">
    <div>Yours faithfully,</div>
    <div><strong>For ${entityName}</strong></div>
    
    <div class="signature-block">
      <div class="sig-line">
        <strong>${primarySigner}</strong><br>
        <span style="font-size: 8.5pt; color: #475569;">${primaryDesignation}</span>
      </div>
    </div>

    ${
      coSigner
        ? `
    <div class="signature-block">
      <div class="sig-line">
        <strong>${coSigner}</strong><br>
        <span style="font-size: 8.5pt; color: #475569;">${coDesignation}</span>
      </div>
    </div>`
        : ''
    }
  </div>

</body>
</html>`;
}

export function generateMrlWordHtml(
  config: EntityConfig,
  formData: ManagementRepresentationConfig,
  financials: FinancialContext,
  noteSchedules?: Record<number, NoteScheduleData>
): string {
  const content = generateMrlPrintHtml(config, formData, financials, noteSchedules);
  
  // Wrap into Word Document HTML with Word Section and print margins
  return `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>Management Representation Letter - ${escapeHtml(config.entityName)}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page WordSection1 {
      size: 210mm 297mm;
      margin: 20mm 20mm 20mm 20mm;
      mso-header-margin: 35.4pt;
      mso-footer-margin: 35.4pt;
      mso-paper-source: 0;
    }
    div.WordSection1 { page: WordSection1; }
    body {
      font-family: 'Times New Roman', serif;
      font-size: 11pt;
      line-height: 1.45;
      color: #000000;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    th, td {
      border: 1px solid #333333;
      padding: 5pt 7pt;
      font-size: 9.5pt;
    }
    th {
      background-color: #f2f2f2;
    }
  </style>
</head>
<body>
  <div class="WordSection1">
    ${content.substring(content.indexOf('<body>') + 6, content.indexOf('</body>'))}
  </div>
</body>
</html>`;
}

export function printMrl(
  config: EntityConfig,
  formData: ManagementRepresentationConfig,
  financials: FinancialContext,
  noteSchedules?: Record<number, NoteScheduleData>
): boolean {
  try {
    const html = generateMrlPrintHtml(config, formData, financials, noteSchedules);

    // Create a hidden, isolated iframe so print works without modal clipping or UI clutter
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.warn('[printMrl] Iframe print exception, fallback to window.print():', e);
          window.print();
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 4000);
        }
      }, 350);
      return true;
    }
  } catch (err) {
    console.warn('[printMrl] Error initializing iframe print, fallback to window.print():', err);
  }

  window.print();
  return true;
}

export function downloadMrlWord(
  config: EntityConfig,
  formData: ManagementRepresentationConfig,
  financials: FinancialContext,
  noteSchedules?: Record<number, NoteScheduleData>
): void {
  const html = generateMrlWordHtml(config, formData, financials, noteSchedules);
  const blob = new Blob(['\ufeff' + html], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (config.entityName || 'Entity').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fy = (config.financialYear || '2025-26').replace(/[^a-zA-Z0-9_-]/g, '_');
  a.href = url;
  a.download = `MRL_SA580_${safeName}_${fy}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadMrlHtml(
  config: EntityConfig,
  formData: ManagementRepresentationConfig,
  financials: FinancialContext,
  noteSchedules?: Record<number, NoteScheduleData>
): void {
  const html = generateMrlPrintHtml(config, formData, financials, noteSchedules);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (config.entityName || 'Entity').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fy = (config.financialYear || '2025-26').replace(/[^a-zA-Z0-9_-]/g, '_');
  a.href = url;
  a.download = `MRL_SA580_${safeName}_${fy}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadMrlTxt(
  config: EntityConfig,
  formData: ManagementRepresentationConfig,
  financials: FinancialContext,
  noteSchedules?: Record<number, NoteScheduleData>
): void {
  const text = generateMrlPlainText(config, formData, financials, noteSchedules);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (config.entityName || 'Entity').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fy = (config.financialYear || '2025-26').replace(/[^a-zA-Z0-9_-]/g, '_');
  a.href = url;
  a.download = `MRL_SA580_${safeName}_${fy}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
