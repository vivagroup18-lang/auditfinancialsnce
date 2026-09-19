import * as XLSX from 'xlsx';
import { TrialBalanceRow, UploadedFinancialLineItem, UploadedStatementDoc, BalanceSheetData, ProfitAndLossData } from '../types';
import { generateAttractiveExcelReport } from './excelExporter';

export function parseTrialBalanceExcelOrCsv(data: ArrayBuffer | string): TrialBalanceRow[] {
  const workbook = XLSX.read(data, { type: typeof data === 'string' ? 'string' : 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert to 2D array
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (!rawRows || rawRows.length === 0) {
    throw new Error('The uploaded file is empty or could not be parsed.');
  }

  // Find header row — scan up to 40 rows to handle Indian TB files with many
  // metadata lines at the top (firm name, address, GSTIN, date range, etc.)
  let headerIndex = -1;
  let colAccountName = -1;
  let colAccountCode = -1;
  let colDebit = -1;
  let colCredit = -1;
  let colNetBalance = -1;

  for (let r = 0; r < Math.min(rawRows.length, 40); r++) {
    const row = rawRows[r].map((cell: any) => String(cell || '').trim().toLowerCase());

    let accIdx = row.findIndex((c: string) =>
      c.includes('particular') ||
      c.includes('account name') ||
      c.includes('ledger') ||
      c.includes('head of account') ||
      c.includes('account description') ||
      c.includes('account head') ||
      c.includes('name of account') ||
      c === 'name' ||
      c === 'account'
    );

    // Find all debit and credit column indices in the row
    const drIndices: number[] = [];
    const crIndices: number[] = [];
    row.forEach((c: string, idx: number) => {
      if (c.includes('debit') || c.includes('dr.') || c.includes('dr amount') || c === 'dr' || c === 'debits') {
        drIndices.push(idx);
      }
      if (c.includes('credit') || c.includes('cr.') || c.includes('cr amount') || c === 'cr' || c === 'credits') {
        crIndices.push(idx);
      }
    });

    // If Dr/Cr found on this row, find particulars on this row or look up to 5 rows above
    if (drIndices.length > 0 || crIndices.length > 0) {
      if (accIdx === -1) {
        for (let back = 1; back <= Math.min(5, r); back++) {
          const prevRow = rawRows[r - back].map((cell: any) => String(cell || '').trim().toLowerCase());
          const found = prevRow.findIndex((c: string) =>
            c.includes('particular') ||
            c.includes('account name') ||
            c.includes('ledger') ||
            c.includes('head of account') ||
            c === 'name' ||
            c === 'account'
          );
          if (found !== -1) {
            accIdx = found;
            break;
          }
        }
      }
      if (accIdx === -1) accIdx = 0;

      headerIndex = r;
      colAccountName = accIdx;

      // Check if any debit index is explicitly labeled "closing" in current row or parent row above
      let chosenDr = drIndices.find((idx) => {
        const text = row[idx];
        const parentText = r > 0 ? String(rawRows[r - 1]?.[idx] || '').toLowerCase() : '';
        return text.includes('closing') || parentText.includes('closing');
      });
      // If not explicitly labeled, pick the LAST debit column (Closing Dr comes after Opening Dr)
      if (chosenDr === undefined && drIndices.length > 0) {
        chosenDr = drIndices[drIndices.length - 1];
      }
      colDebit = chosenDr !== undefined ? chosenDr : -1;

      // Check if any credit index is explicitly labeled "closing" in current row or parent row above
      let chosenCr = crIndices.find((idx) => {
        const text = row[idx];
        const parentText = r > 0 ? String(rawRows[r - 1]?.[idx] || '').toLowerCase() : '';
        return text.includes('closing') || parentText.includes('closing');
      });
      // If not explicitly labeled, pick the LAST credit column (Closing Cr comes after Opening Cr)
      if (chosenCr === undefined && crIndices.length > 0) {
        chosenCr = crIndices[crIndices.length - 1];
      }
      colCredit = chosenCr !== undefined ? chosenCr : -1;

      // Check for code column
      colAccountCode = row.findIndex((c: string) =>
        c.includes('code') || c.includes('acc no') || c.includes('gl') ||
        c.includes('a/c no') || c.includes('ledger code') || c.includes('acct no')
      );

      // Check for net balance column
      colNetBalance = row.findIndex((c: string) =>
        c.includes('closing') || c.includes('net balance') ||
        (c.includes('balance') && !c.includes('opening'))
      );

      break;
    }
  }

  // Fallback heuristic if standard header words aren't found in first 40 rows
  if (headerIndex === -1) {
    // Try column 0 as name, column 1 as debit, column 2 as credit
    headerIndex = 0;
    colAccountName = 0;
    colDebit = 1;
    colCredit = 2;
  }

  const rawCandidates: {
    rawLineIndex: number;
    accountCode?: string;
    accountName: string;
    lowerName: string;
    debit: number;
    credit: number;
  }[] = [];

  let fileGrandTotalDr = 0;
  let fileGrandTotalCr = 0;

  for (let r = headerIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const parseNum = (val: any): number => {
      if (typeof val === 'number') return val;
      if (!val) return 0;
      const cleanStr = String(val).replace(/,/g, '').replace(/[₹$]/g, '').trim();
      const num = parseFloat(cleanStr);
      return isNaN(num) ? 0 : num;
    };

    // 1. First extract ledger name - scan primary column & adjacent non-numeric columns if empty
    let nameCell = String(row[colAccountName] || '').trim();
    if (!nameCell) {
      for (let c = 0; c < (colDebit !== -1 ? colDebit : row.length); c++) {
        const val = String(row[c] || '').trim();
        if (val && isNaN(parseFloat(val.replace(/,/g, '')))) {
          nameCell = val;
          break;
        }
      }
    }

    if (!nameCell) continue;
    const lowerName = nameCell.toLowerCase().trim();

    // 2. Extract Debit and Credit balances first
    let dr = colDebit !== -1 ? parseNum(row[colDebit]) : 0;
    let cr = colCredit !== -1 ? parseNum(row[colCredit]) : 0;

    // If single balance column exists with Dr/Cr sign
    if (colNetBalance !== -1 && dr === 0 && cr === 0) {
      const netValStr = String(row[colNetBalance] || '').toLowerCase();
      const num = parseNum(netValStr);
      if (netValStr.includes('dr') || netValStr.includes('debit')) {
        dr = Math.abs(num);
      } else if (netValStr.includes('cr') || netValStr.includes('credit')) {
        cr = Math.abs(num);
      } else {
        if (num >= 0) dr = num;
        else cr = Math.abs(num);
      }
    }

    // Fallback: If both colDebit & colCredit were 0, scan remaining numeric cells in row
    if (dr === 0 && cr === 0) {
      const numsInRow: number[] = [];
      row.forEach((cell: any, cIdx: number) => {
        if (cIdx !== colAccountName && cell !== undefined && cell !== null && cell !== '') {
          const str = String(cell).replace(/,/g, '').trim();
          if (/^-?\d+(\.\d+)?$/.test(str)) {
            const n = parseFloat(str);
            if (n > 0) numsInRow.push(n);
          }
        }
      });
      if (numsInRow.length === 1) {
        dr = numsInRow[0];
      } else if (numsInRow.length >= 2) {
        dr = numsInRow[numsInRow.length - 2];
        cr = numsInRow[numsInRow.length - 1];
      }
    }

    // Capture explicit Total & Grand Total summary rows
    const isTotalRow =
      lowerName === 'total' ||
      lowerName === 'grand total' ||
      lowerName === 'total:' ||
      lowerName === 'grand total:' ||
      lowerName.startsWith('total debit') ||
      lowerName.startsWith('total credit') ||
      lowerName.startsWith('grand total');

    if (isTotalRow) {
      if (fileGrandTotalDr === 0 && fileGrandTotalCr === 0) {
        fileGrandTotalDr = dr;
        fileGrandTotalCr = cr;
      }
      continue;
    }

    // Standard column header words (skip even if numeric cells exist, as column totals/index headers)
    const isStandardHeaderWord =
      lowerName === 'particulars' ||
      lowerName === 'ledger account name' ||
      lowerName === 'account name' ||
      lowerName === 'ledger name' ||
      lowerName === 'head of account' ||
      lowerName === 'name of the account' ||
      lowerName === 'name of account' ||
      lowerName === 'description' ||
      lowerName === 'dr' || lowerName === 'cr' ||
      lowerName === 'debit' || lowerName === 'credit';

    if (isStandardHeaderWord) {
      continue;
    }

    const hasBalance = dr > 0 || cr > 0;

    // Header metadata, date ranges, pin codes, address headers, and sheet titles
    // Only check these for rows WITHOUT a financial balance (hasBalance === false).
    if (!hasBalance) {
      const isHeaderOrMeta =
        lowerName.includes('trial balance') ||
        lowerName.includes('closing balance') ||
        lowerName.includes('opening balance') ||
        lowerName.includes('debit balance') ||
        lowerName.includes('credit balance') ||
        lowerName.includes('page no') ||
        lowerName.includes('s. no') ||
        lowerName.includes('sr. no') ||
        lowerName.includes('sl. no') ||
        /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z-]*[\s\-\/]*\d{2,4}.*\bto\b/i.test(nameCell) ||
        /\b\d{6}\b/.test(nameCell) ||
        /^(no|plot|flat|door|h\.?no|survey|road|street|nagar|marg)[.\s-]+\d/i.test(nameCell) ||
        /^\d[\d\s,.-]*$/.test(nameCell) ||
        lowerName.includes('kelkar bag') || lowerName.includes('belgaum') ||
        lowerName.includes('rainbow offset') ||
        nameCell.length < 3 ||
        /^\d+$/.test(nameCell) ||
        lowerName.includes('offset') ||
        lowerName.includes('limited') ||
        lowerName.includes('pvt') ||
        lowerName.includes('llp') ||
        lowerName.includes('address') ||
        lowerName.includes('city') ||
        lowerName.includes('state') ||
        lowerName.includes('phone') ||
        lowerName.includes('email') ||
        lowerName.includes('gstin') ||
        lowerName.includes('pan') ||
        lowerName.includes('date') ||
        lowerName.includes('period') ||
        lowerName.includes('firm');

      if (isHeaderOrMeta) {
        continue;
      }
      // If row has no balance and is not header/meta, skip empty group/ledger
      continue;
    }

    const code = colAccountCode !== -1 ? String(row[colAccountCode] || '').trim() : undefined;

    rawCandidates.push({
      rawLineIndex: r,
      accountCode: code,
      accountName: nameCell,
      lowerName,
      debit: dr,
      credit: cr,
    });
  }

  // ── PASS 2: Intelligent Parent-Group Reconciliation ──
  // In Tally and accounting ERPs, trial balances often include top-level parent group summary lines
  // (e.g. "Capital Account", "Current Liabilities", "Sales Accounts", "Fixed Assets") alongside the actual child ledgers.
  // CRITICAL RULES:
  // - Never unconditionally skip names like "Sales Account" or "Purchase Account" (singular), as these are the actual ledgers!
  // - Only mark a candidate as a parent group if it has child rows beneath it whose balances duplicate or sum to it.
  // - If an entity only has "Sales Accounts" or "Capital Account" without child ledgers, it must NEVER be discarded.

  const KNOWN_TALLY_GROUP_NAMES = new Set([
    'capital account', 'capital accounts',
    'loans (liability)', 'loans (liabilities)', 'loan (liability)',
    'current liabilities',
    'fixed assets',
    'investments',
    'current assets',
    'sales accounts', // NOTE: Plural is the Tally group; singular 'sales account' is the ledger
    'purchase accounts', // NOTE: Plural is the Tally group; singular 'purchase account' is the ledger
    'direct incomes', 'direct income',
    'direct expenses', 'direct expense',
    'indirect incomes', 'indirect income',
    'indirect expenses', 'indirect expense',
    'branch / divisions',
    'misc. expenses (asset)',
    'suspense account', 'suspense a/c'
  ]);

  const isPotentialGroup = (name: string): boolean => {
    if (KNOWN_TALLY_GROUP_NAMES.has(name)) return true;
    if (
      name.endsWith(' accounts') ||
      name.endsWith(' liabilities') ||
      name.endsWith(' assets') ||
      name.endsWith(' expenses') ||
      name.endsWith(' incomes')
    ) {
      // Do not treat standard singular ledger names as groups
      if (!name.endsWith(' account')) return true;
    }
    return false;
  };

  const isParentGroup = new Set<number>();

  for (let i = 0; i < rawCandidates.length; i++) {
    const curr = rawCandidates[i];
    if (!isPotentialGroup(curr.lowerName)) continue;

    // Check Proof 1: Immediate duplicate child with identical non-zero balance
    // e.g. "Sales Accounts" (Cr 98,66,104) immediately followed by "Sales Account" (Cr 98,66,104)
    // "Purchase Accounts" (Dr 1,19,60,009.35) immediately followed by "Purchase Account" (Dr 1,19,60,009.35)
    // "Capital Account" (Cr 46,09,149.06) immediately followed by "Parasharam Patil Capital A/C" (Cr 46,09,149.06)
    // "Current Liabilities" immediately followed by "Sundry Creditors" with same amounts
    if (i + 1 < rawCandidates.length) {
      const next = rawCandidates[i + 1];
      const drMatch = Math.abs(curr.debit - next.debit) < 0.01;
      const crMatch = Math.abs(curr.credit - next.credit) < 0.01;
      if (drMatch && crMatch && (curr.debit > 0 || curr.credit > 0)) {
        isParentGroup.add(i);
        continue;
      }
    }

    // Check Proof 2: Consecutive child rows summing up to parent
    // e.g. "Fixed Assets" = Mobile Phone + Vehicle + Weight Machine
    // "Current Assets" = Opening Stock + Sundry Debtors + Cash + Bank + GST + Inputs
    // "Direct Expenses" = Hamali + Loading + Packing
    // "Indirect Incomes" = Discount Received + Interest Received + Interest on IT Refund + Round Off
    // "Indirect Expenses" = Audit Fee + Bank Charges + Interest + Discount + Late Fees
    let accDr = 0;
    let accCr = 0;
    let childCount = 0;

    for (let j = i + 1; j < rawCandidates.length; j++) {
      const child = rawCandidates[j];
      if (isParentGroup.has(j)) continue;

      accDr += child.debit;
      accCr += child.credit;
      childCount++;

      const drMatch = Math.abs(curr.debit - accDr) < 0.05;
      const crMatch = Math.abs(curr.credit - accCr) < 0.05;

      if (drMatch && crMatch && childCount > 1) {
        isParentGroup.add(i);
        break;
      }

      // If sum exceeds parent amount by more than 0.05, stop checking this parent
      if ((curr.debit > 0 && accDr > curr.debit + 0.05) || (curr.credit > 0 && accCr > curr.credit + 0.05)) {
        break;
      }
    }
  }

  // Stated Grand Total safety check:
  // If the file stated a Grand Total and some parent group was missed, or if dropping a group reconciles the total:
  let kept = rawCandidates.filter((_, idx) => !isParentGroup.has(idx));
  let currentDrTotal = kept.reduce((sum, r) => sum + r.debit, 0);
  let currentCrTotal = kept.reduce((sum, r) => sum + r.credit, 0);

  if (fileGrandTotalDr > 0 && Math.abs(currentDrTotal - fileGrandTotalDr) > 0.05) {
    // Check if any remaining candidate that is a known group can be excluded to match fileGrandTotalDr exactly
    for (let i = 0; i < rawCandidates.length; i++) {
      if (!isParentGroup.has(i) && isPotentialGroup(rawCandidates[i].lowerName)) {
        if (Math.abs(currentDrTotal - rawCandidates[i].debit - fileGrandTotalDr) < 0.05) {
          isParentGroup.add(i);
          currentDrTotal -= rawCandidates[i].debit;
          currentCrTotal -= rawCandidates[i].credit;
        }
      }
    }
    kept = rawCandidates.filter((_, idx) => !isParentGroup.has(idx));
  }

  const parsedLedgers: TrialBalanceRow[] = kept.map((row) => {
    const net = Math.abs(row.debit - row.credit) || (row.debit > 0 ? row.debit : row.credit);
    return {
      id: `tb-parsed-${row.rawLineIndex}`,
      accountCode: row.accountCode,
      accountName: row.accountName,
      closingDebit: row.debit,
      closingCredit: row.credit,
      netBalance: net,
      rawLineIndex: row.rawLineIndex,
    };
  });

  return parsedLedgers;
}

export function parseNCEFormatsFile(data: ArrayBuffer): {
  sheetNames: string[];
  detectedSheets: {
    hasBalanceSheet: boolean;
    hasProfitAndLoss: boolean;
    notesFound: string[];
  };
  details: string;
} {
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetNames = workbook.SheetNames;

  const lowerNames = sheetNames.map((n) => n.toLowerCase());

  const hasBalanceSheet = lowerNames.some((n) => n.includes('balance') || n === 'bs');
  const hasProfitAndLoss = lowerNames.some((n) => n.includes('profit') || n.includes('p&l') || n.includes('p and l') || n === 'pl');
  const notesFound = sheetNames.filter((n) => {
    const l = n.toLowerCase();
    return l.includes('note') || l.includes('schedule') || /^\d+$/.test(n.trim());
  });

  return {
    sheetNames,
    detectedSheets: {
      hasBalanceSheet,
      hasProfitAndLoss,
      notesFound,
    },
    details: `Parsed ${sheetNames.length} sheets in NCE template. Balance Sheet: ${hasBalanceSheet ? 'Detected' : 'Not found'}, Profit & Loss: ${hasProfitAndLoss ? 'Detected' : 'Not found'}, Notes identified: ${notesFound.length > 0 ? notesFound.length : 'Generic / Consolidated'}.`,
  };
}

/**
 * Parses a 2D sheet array into structured financial statement line items
 */
export function parseFinancialStatementTable(
  rawRows: any[][],
  statementType: 'BalanceSheet' | 'ProfitAndLoss'
): UploadedFinancialLineItem[] {
  if (!rawRows || rawRows.length === 0) return [];

  let headerIndex = -1;
  let colParticulars = -1;
  let colNoteNo = -1;
  let colCurrentAmount = -1;
  let colPreviousAmount = -1;

  for (let r = 0; r < Math.min(rawRows.length, 25); r++) {
    const row = rawRows[r].map((cell: any) => String(cell || '').trim().toLowerCase());
    const partIdx = row.findIndex((c) =>
      c.includes('particular') ||
      c.includes('line item') ||
      c.includes('head') ||
      c.includes('description') ||
      c.includes('account name') ||
      c.includes('ledger')
    );
    const cyIdx = row.findIndex((c) =>
      c.includes('current') ||
      c.includes('figures as at') ||
      c.includes('amount') ||
      c.includes('31.03.2025') ||
      c.includes('31-03-2025') ||
      c.includes('31.3.2025') ||
      c.includes('cy') ||
      c === 'debit' ||
      c === 'credit'
    );
    const pyIdx = row.findIndex((c) =>
      c.includes('previous') ||
      c.includes('prior') ||
      c.includes('31.03.2024') ||
      c.includes('31-03-2024') ||
      c.includes('31.3.2024') ||
      c.includes('py')
    );
    const noteIdx = row.findIndex((c) =>
      c.includes('note') || c.includes('sch') || c.includes('schedule')
    );

    if (partIdx !== -1 && (cyIdx !== -1 || pyIdx !== -1 || row.length >= 2)) {
      headerIndex = r;
      colParticulars = partIdx;
      colCurrentAmount = cyIdx !== -1 ? cyIdx : (partIdx + 1);
      colPreviousAmount = pyIdx !== -1 ? pyIdx : (colCurrentAmount + 1 < row.length ? colCurrentAmount + 1 : -1);
      colNoteNo = noteIdx;
      break;
    }
  }

  if (headerIndex === -1) {
    headerIndex = 0;
    colParticulars = 0;
    colCurrentAmount = 1;
    colPreviousAmount = 2;
  }

  const parseNum = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const cleanStr = String(val)
      .replace(/,/g, '')
      .replace(/[₹$]/g, '')
      .replace(/\((.*?)\)/, '-$1')
      .trim();
    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : num;
  };

  const items: UploadedFinancialLineItem[] = [];
  let currentCategory = statementType === 'BalanceSheet' ? 'Equity & Liabilities' : 'Operating Items';

  for (let r = headerIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const partCell = String(row[colParticulars] || '').trim();
    if (!partCell) continue;

    const lowerPart = partCell.toLowerCase();
    // Track categories
    if (
      lowerPart.includes('equity and liabilities') ||
      lowerPart.includes("owners' funds") ||
      lowerPart.includes('non-current liabilities') ||
      lowerPart.includes('current liabilities') ||
      lowerPart.includes('non-current assets') ||
      lowerPart.includes('current assets') ||
      lowerPart.includes('revenue') ||
      lowerPart.includes('income') ||
      lowerPart.includes('expenses') ||
      lowerPart.includes('tax expense')
    ) {
      currentCategory = partCell;
    }

    // Skip generic headings without values
    const cyVal = colCurrentAmount !== -1 ? parseNum(row[colCurrentAmount]) : 0;
    const pyVal = colPreviousAmount !== -1 && colPreviousAmount < row.length ? parseNum(row[colPreviousAmount]) : undefined;
    const noteVal = colNoteNo !== -1 ? String(row[colNoteNo] || '').trim() : '';

    if (cyVal === 0 && (!pyVal || pyVal === 0) && (partCell.startsWith('I.') || partCell.startsWith('II.') || lowerPart.includes('total'))) {
      // Heading or major subtotal
      continue;
    }

    let noteNum: number | undefined = undefined;
    const numMatch = noteVal.match(/\d+/);
    if (numMatch) {
      noteNum = parseInt(numMatch[0], 10);
    }

    items.push({
      id: `item-${statementType.toLowerCase()}-${r}`,
      particulars: partCell,
      noteNumber: noteNum,
      currentPeriodAmount: cyVal,
      previousPeriodAmount: pyVal,
      rawCategory: currentCategory,
      scheduleReference: noteVal || (noteNum ? `Note ${noteNum}` : undefined),
    });
  }

  return items;
}

/**
 * Parses an uploaded Excel or CSV file containing Balance Sheet and/or Profit and Loss
 */
export function parseUploadedFinancialWorkbook(
  data: ArrayBuffer | string,
  fileName: string,
  forcedType?: 'BalanceSheet' | 'ProfitAndLoss' | 'PYBalanceSheet' | 'PYProfitAndLoss',
  forcedPeriod?: 'CY' | 'PY'
): {
  balanceSheet?: UploadedStatementDoc;
  profitAndLoss?: UploadedStatementDoc;
  pyBalanceSheet?: UploadedStatementDoc;
  pyProfitAndLoss?: UploadedStatementDoc;
} {
  const workbook = XLSX.read(data, { type: typeof data === 'string' ? 'string' : 'array' });
  const sheetNames = workbook.SheetNames;
  const result: {
    balanceSheet?: UploadedStatementDoc;
    profitAndLoss?: UploadedStatementDoc;
    pyBalanceSheet?: UploadedStatementDoc;
    pyProfitAndLoss?: UploadedStatementDoc;
  } = {};
  const isPY = forcedPeriod === 'PY' || forcedType === 'PYBalanceSheet' || forcedType === 'PYProfitAndLoss';

  if (forcedType === 'BalanceSheet' || forcedType === 'PYBalanceSheet') {
    const ws = workbook.Sheets[sheetNames[0]];
    const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    const items = parseFinancialStatementTable(rawRows, 'BalanceSheet');
    const totalCY = items.reduce((sum, it) => sum + (it.currentPeriodAmount || 0), 0);
    const totalPY = items.reduce((sum, it) => sum + (it.previousPeriodAmount || 0), 0);
    const bsDoc: UploadedStatementDoc = {
      fileName,
      fileType: forcedType === 'PYBalanceSheet' ? 'PYBalanceSheet' : 'BalanceSheet',
      period: isPY ? 'PY' : 'CY',
      uploadedAt: new Date().toISOString(),
      items,
      detectedTotal: totalCY,
      detectedPreviousTotal: totalPY,
      hasPreviousYear: items.some((it) => it.previousPeriodAmount !== undefined && it.previousPeriodAmount !== 0),
    };
    result.balanceSheet = bsDoc;
    if (isPY) {
      result.pyBalanceSheet = bsDoc;
    }
    return result;
  }

  if (forcedType === 'ProfitAndLoss' || forcedType === 'PYProfitAndLoss') {
    const ws = workbook.Sheets[sheetNames[0]];
    const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    const items = parseFinancialStatementTable(rawRows, 'ProfitAndLoss');
    const totalCY = items.reduce((sum, it) => sum + (it.currentPeriodAmount || 0), 0);
    const totalPY = items.reduce((sum, it) => sum + (it.previousPeriodAmount || 0), 0);
    const plDoc: UploadedStatementDoc = {
      fileName,
      fileType: forcedType === 'PYProfitAndLoss' ? 'PYProfitAndLoss' : 'ProfitAndLoss',
      period: isPY ? 'PY' : 'CY',
      uploadedAt: new Date().toISOString(),
      items,
      detectedTotal: totalCY,
      detectedPreviousTotal: totalPY,
      hasPreviousYear: items.some((it) => it.previousPeriodAmount !== undefined && it.previousPeriodAmount !== 0),
    };
    result.profitAndLoss = plDoc;
    if (isPY) {
      result.pyProfitAndLoss = plDoc;
    }
    return result;
  }

  // Auto-detect sheets in workbook
  for (const sheetName of sheetNames) {
    const lower = sheetName.toLowerCase();
    const ws = workbook.Sheets[sheetName];
    const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    if (!result.balanceSheet && (lower.includes('balance') || lower === 'bs' || lower.includes('b_s'))) {
      const items = parseFinancialStatementTable(rawRows, 'BalanceSheet');
      result.balanceSheet = {
        fileName: `${fileName} [${sheetName}]`,
        fileType: isPY ? 'PYBalanceSheet' : 'BalanceSheet',
        period: isPY ? 'PY' : 'CY',
        uploadedAt: new Date().toISOString(),
        items,
        detectedTotal: items.reduce((sum, it) => sum + (it.currentPeriodAmount || 0), 0),
        detectedPreviousTotal: items.reduce((sum, it) => sum + (it.previousPeriodAmount || 0), 0),
        hasPreviousYear: items.some((it) => it.previousPeriodAmount !== undefined && it.previousPeriodAmount !== 0),
      };
    } else if (
      !result.profitAndLoss &&
      (lower.includes('profit') ||
        lower.includes('p&l') ||
        lower.includes('p and l') ||
        lower === 'pl' ||
        lower.includes('income'))
    ) {
      const items = parseFinancialStatementTable(rawRows, 'ProfitAndLoss');
      result.profitAndLoss = {
        fileName: `${fileName} [${sheetName}]`,
        fileType: isPY ? 'PYProfitAndLoss' : 'ProfitAndLoss',
        period: isPY ? 'PY' : 'CY',
        uploadedAt: new Date().toISOString(),
        items,
        detectedTotal: items.reduce((sum, it) => sum + (it.currentPeriodAmount || 0), 0),
        detectedPreviousTotal: items.reduce((sum, it) => sum + (it.previousPeriodAmount || 0), 0),
        hasPreviousYear: items.some((it) => it.previousPeriodAmount !== undefined && it.previousPeriodAmount !== 0),
      };
    }
  }

  // Fallback if no specific tab name matched
  if (!result.balanceSheet && !result.profitAndLoss && sheetNames.length > 0) {
    const ws = workbook.Sheets[sheetNames[0]];
    const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    const textJoined = JSON.stringify(rawRows.slice(0, 15)).toLowerCase();
    if (textJoined.includes('profit') || textJoined.includes('revenue') || textJoined.includes('sales')) {
      const items = parseFinancialStatementTable(rawRows, 'ProfitAndLoss');
      result.profitAndLoss = {
        fileName: `${fileName} [${sheetNames[0]}]`,
        fileType: isPY ? 'PYProfitAndLoss' : 'ProfitAndLoss',
        period: isPY ? 'PY' : 'CY',
        uploadedAt: new Date().toISOString(),
        items,
        detectedTotal: items.reduce((sum, it) => sum + (it.currentPeriodAmount || 0), 0),
        detectedPreviousTotal: items.reduce((sum, it) => sum + (it.previousPeriodAmount || 0), 0),
        hasPreviousYear: items.some((it) => it.previousPeriodAmount !== undefined && it.previousPeriodAmount !== 0),
      };
    } else {
      const items = parseFinancialStatementTable(rawRows, 'BalanceSheet');
      result.balanceSheet = {
        fileName: `${fileName} [${sheetNames[0]}]`,
        fileType: isPY ? 'PYBalanceSheet' : 'BalanceSheet',
        period: isPY ? 'PY' : 'CY',
        uploadedAt: new Date().toISOString(),
        items,
        detectedTotal: items.reduce((sum, it) => sum + (it.currentPeriodAmount || 0), 0),
        detectedPreviousTotal: items.reduce((sum, it) => sum + (it.previousPeriodAmount || 0), 0),
        hasPreviousYear: items.some((it) => it.previousPeriodAmount !== undefined && it.previousPeriodAmount !== 0),
      };
    }
  }

  if (isPY) {
    if (result.balanceSheet) result.pyBalanceSheet = result.balanceSheet;
    if (result.profitAndLoss) result.pyProfitAndLoss = result.profitAndLoss;
  }

  return result;
}

/**
 * Extracts comparative prior year figures from uploaded Balance Sheet and P&L items
 * Supports both CY statements with prior year columns AND dedicated PY Balance Sheet / P&L uploads
 */
export function extractPriorYearFromUploadedStatements(
  bsDoc?: UploadedStatementDoc,
  plDoc?: UploadedStatementDoc,
  pyBsDoc?: UploadedStatementDoc,
  pyPlDoc?: UploadedStatementDoc
): {
  balanceSheet?: Partial<BalanceSheetData['previousYear']>;
  profitAndLoss?: Partial<ProfitAndLossData['previousYear']>;
  noteTotals?: Record<number, number>;
} {
  const result: {
    balanceSheet?: Partial<BalanceSheetData['previousYear']>;
    profitAndLoss?: Partial<ProfitAndLossData['previousYear']>;
    noteTotals: Record<number, number>;
  } = { noteTotals: {} };

  // Helper to process Balance Sheet items for previous year
  const processBSItems = (doc: UploadedStatementDoc, isDedicatedPY: boolean) => {
    if (!result.balanceSheet) {
      result.balanceSheet = {};
    }
    const bsPrev = result.balanceSheet;

    doc.items.forEach((item) => {
      const p = item.particulars.toLowerCase();
      // If it's a dedicated PY doc, currentPeriodAmount is the PY amount!
      let val = 0;
      if (isDedicatedPY) {
        val = item.currentPeriodAmount || item.previousPeriodAmount || 0;
      } else {
        val = item.previousPeriodAmount !== undefined && item.previousPeriodAmount !== 0
          ? item.previousPeriodAmount
          : item.currentPeriodAmount;
      }

      if (!val) return;

      if (item.noteNumber && typeof item.noteNumber === 'number') {
        result.noteTotals[item.noteNumber] = (result.noteTotals[item.noteNumber] || 0) + val;
      }

      if (p.includes('capital')) {
        bsPrev.ownersCapital = (bsPrev.ownersCapital || 0) + val;
      } else if (p.includes('reserve') || p.includes('surplus')) {
        bsPrev.reservesAndSurplus = (bsPrev.reservesAndSurplus || 0) + val;
      } else if (p.includes('long-term borrowing') || p.includes('long term borrowing') || p.includes('term loan')) {
        bsPrev.longTermBorrowings = (bsPrev.longTermBorrowings || 0) + val;
      } else if (p.includes('deferred tax') && (p.includes('liabilit') || item.rawCategory?.toLowerCase().includes('liabilit'))) {
        bsPrev.deferredTaxLiabilities = (bsPrev.deferredTaxLiabilities || 0) + val;
      } else if (p.includes('short-term borrowing') || p.includes('cash credit') || p.includes('working capital')) {
        bsPrev.shortTermBorrowings = (bsPrev.shortTermBorrowings || 0) + val;
      } else if (p.includes('trade payable') || p.includes('creditor')) {
        bsPrev.tradePayables = (bsPrev.tradePayables || 0) + val;
      } else if (p.includes('outstanding exp') || p.includes('other current liab') || p.includes('statutory due')) {
        bsPrev.otherCurrentLiabilities = (bsPrev.otherCurrentLiabilities || 0) + val;
      } else if (p.includes('property, plant') || p.includes('fixed asset') || p.includes('tangible asset')) {
        bsPrev.propertyPlantEquipment = (bsPrev.propertyPlantEquipment || 0) + val;
      } else if (p.includes('inventor') || p.includes('stock in trade') || p.includes('finished goods')) {
        bsPrev.inventories = (bsPrev.inventories || 0) + val;
      } else if (p.includes('trade receivable') || p.includes('debtor')) {
        bsPrev.tradeReceivables = (bsPrev.tradeReceivables || 0) + val;
      } else if (p.includes('cash and bank') || p.includes('bank balance') || p.includes('cash in hand')) {
        bsPrev.cashAndBankBalances = (bsPrev.cashAndBankBalances || 0) + val;
      } else if (p.includes('loan and advance') || p.includes('short term loan')) {
        bsPrev.shortTermLoansAndAdvances = (bsPrev.shortTermLoansAndAdvances || 0) + val;
      }
    });
  };

  // Helper to process Profit & Loss items for previous year
  const processPLItems = (doc: UploadedStatementDoc, isDedicatedPY: boolean) => {
    if (!result.profitAndLoss) {
      result.profitAndLoss = {};
    }
    const plPrev = result.profitAndLoss;

    doc.items.forEach((item) => {
      const p = item.particulars.toLowerCase();
      let val = 0;
      if (isDedicatedPY) {
        val = item.currentPeriodAmount || item.previousPeriodAmount || 0;
      } else {
        val = item.previousPeriodAmount !== undefined && item.previousPeriodAmount !== 0
          ? item.previousPeriodAmount
          : item.currentPeriodAmount;
      }

      if (!val) return;

      if (item.noteNumber && typeof item.noteNumber === 'number') {
        result.noteTotals[item.noteNumber] = (result.noteTotals[item.noteNumber] || 0) + val;
      }

      if (p.includes('revenue from operation') || p.includes('turnover') || p.includes('sales')) {
        plPrev.revenueFromOperations = (plPrev.revenueFromOperations || 0) + val;
      } else if (p.includes('other income')) {
        plPrev.otherIncome = (plPrev.otherIncome || 0) + val;
      } else if (p.includes('raw material') || p.includes('cost of goods') || p.includes('material consumed')) {
        plPrev.costOfGoodsSold = (plPrev.costOfGoodsSold || 0) + val;
        plPrev.costOfRawMaterialsConsumed = (plPrev.costOfRawMaterialsConsumed || 0) + val;
      } else if (p.includes('employee benefit') || p.includes('salaries') || p.includes('wages')) {
        plPrev.employeeBenefitsExpense = (plPrev.employeeBenefitsExpense || 0) + val;
      } else if (p.includes('finance cost') || p.includes('interest paid') || p.includes('bank charge')) {
        plPrev.financeCosts = (plPrev.financeCosts || 0) + val;
      } else if (p.includes('depreciation') || p.includes('amorti')) {
        plPrev.depreciationExpense = (plPrev.depreciationExpense || 0) + val;
      } else if (p.includes('partner') && (p.includes('remuneration') || p.includes('salary'))) {
        plPrev.partnersRemuneration = (plPrev.partnersRemuneration || 0) + val;
      } else if (p.includes('provision for tax') || p.includes('current tax') || p.includes('income tax')) {
        plPrev.currentTax = (plPrev.currentTax || 0) + val;
      } else if (p.includes('other expense') || p.includes('administrative') || p.includes('selling') || p.includes('power') || p.includes('repairs')) {
        plPrev.otherExpenses = (plPrev.otherExpenses || 0) + val;
      }
    });
  };

  // 1. First process comparative column from CY docs (if available)
  if (bsDoc && bsDoc.items.length > 0) {
    processBSItems(bsDoc, false);
  }
  if (plDoc && plDoc.items.length > 0) {
    processPLItems(plDoc, false);
  }

  // 2. Override / enhance with dedicated PY uploads (if provided, as they are specifically audited PY statements)
  if (pyBsDoc && pyBsDoc.items.length > 0) {
    result.balanceSheet = {}; // Dedicated PY Balance Sheet takes precedence
    processBSItems(pyBsDoc, true);
  }
  if (pyPlDoc && pyPlDoc.items.length > 0) {
    result.profitAndLoss = {}; // Dedicated PY P&L takes precedence
    processPLItems(pyPlDoc, true);
  }

  return result;
}

export function exportFinancialStatementsToExcel(
  balanceSheet: any,
  profitAndLoss: any,
  noteSchedules: any,
  exceptions: any[],
  entityConfig: any
) {
  generateAttractiveExcelReport({
    entityConfig,
    balanceSheet,
    profitAndLoss,
    noteSchedules,
    exceptions,
  });
}
