import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import {
  TrialBalanceRow,
  UploadedFinancialLineItem,
  UploadedStatementDoc,
  BalanceSheetData,
  ProfitAndLossData,
  PartnerCapitalRecord,
} from '../types';
import { generateAttractiveExcelReport } from './excelExporter';

// Configure pdfjs worker for browser/client-side execution
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/build/pdf.worker.min.mjs`;
  }
}

export const KNOWN_TALLY_GROUP_NAMES = new Set([
  'capital account', 'capital accounts',
  'loans (liability)', 'loans (liabilities)', 'loan (liability)', 'loans liability',
  'secured loans', 'unsecured loans',
  'current liabilities',
  'sundry creditors',
  'duties & taxes', 'duties and taxes',
  'provisions',
  'fixed assets',
  'investments',
  'current assets',
  'sundry debtors',
  'stock-in-hand', 'opening stock',
  'bank accounts',
  'cash-in-hand',
  'loans & advances (asset)', 'loans and advances (asset)', 'deposits (asset)',
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

export const isPotentialGroup = (name: string): boolean => {
  const lower = name.toLowerCase().trim();
  if (KNOWN_TALLY_GROUP_NAMES.has(lower)) return true;
  if (
    lower.endsWith(' accounts') ||
    lower.endsWith(' liabilities') ||
    lower.endsWith(' assets') ||
    lower.endsWith(' expenses') ||
    lower.endsWith(' incomes')
  ) {
    if (!lower.endsWith(' account')) return true;
  }
  return false;
};

export function parseNumStrict(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const str = String(val).trim();
  // If string contains words with 3 or more letters (e.g. "Apr", "Mar", "Clinic", "Particulars"), it is text, not a balance
  if (/[a-zA-Z]{3,}/.test(str)) return 0;
  // Clean currency symbols, commas, spaces
  let clean = str.replace(/,/g, '').replace(/[₹$]/g, '').trim();
  let isNegative = false;
  if (clean.startsWith('(') && clean.endsWith(')')) {
    isNegative = true;
    clean = clean.slice(1, -1).trim();
  }
  // Strip trailing or leading Dr / Cr / Debit / Credit indicators
  clean = clean.replace(/\s*(dr|cr|debit|credit)\.?$/i, '').trim();
  clean = clean.replace(/^(dr|cr|debit|credit)\.?\s*/i, '').trim();
  if (/^[-+]?\d+(\.\d+)?$/.test(clean)) {
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : (isNegative ? -Math.abs(num) : num);
  }
  return 0;
}

export async function parseTrialBalancePdf(data: ArrayBuffer | Uint8Array): Promise<TrialBalanceRow[]> {
  const uint8 = data instanceof Uint8Array ? data : new Uint8Array(data);
  const loadingTask = pdfjsLib.getDocument({ data: uint8 });
  const doc = await loadingTask.promise;

  let drColThreshold = 310;
  let fileGrandTotalDr = 0;
  let fileGrandTotalCr = 0;

  interface RawPdfLine {
    page: number;
    y: number;
    name: string;
    indentX: number;
    debit: number;
    credit: number;
  }

  const rawLines: RawPdfLine[] = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items = content.items as any[];
    const rowMap = new Map<number, { x: number; text: string }[]>();

    for (const it of items) {
      const text = (it.str || '').trim();
      if (!text) continue;
      const x = Math.round(it.transform[4] * 10) / 10;
      const y = Math.round(it.transform[5] * 10) / 10;

      let matchedY: number | null = null;
      for (const existingY of rowMap.keys()) {
        if (Math.abs(existingY - y) <= 4) {
          matchedY = existingY;
          break;
        }
      }

      if (matchedY !== null) {
        rowMap.get(matchedY)!.push({ x, text });
      } else {
        rowMap.set(y, [{ x, text }]);
      }
    }

    const sortedYs = Array.from(rowMap.keys()).sort((a, b) => b - a);

    for (const y of sortedYs) {
      const lineItems = rowMap.get(y)!.sort((a, b) => a.x - b.x);
      const fullText = lineItems.map((it) => it.text).join(' ').trim();
      const lowerText = fullText.toLowerCase();

      // Check header row for Debit and Credit column anchors
      const debitItem = lineItems.find((it) => {
        const t = it.text.toLowerCase().trim();
        return t === 'debit' || t === 'dr' || t === 'dr.' || t === 'debit amount' || t === 'closing debit';
      });
      const creditItem = lineItems.find((it) => {
        const t = it.text.toLowerCase().trim();
        return t === 'credit' || t === 'cr' || t === 'cr.' || t === 'credit amount' || t === 'closing credit';
      });
      if (debitItem && creditItem) {
        drColThreshold = (debitItem.x + creditItem.x) / 2;
        continue;
      }

      // Check Grand Total row
      if (lowerText.startsWith('grand total') || lowerText === 'total' || lowerText === 'total:') {
        const numItems = lineItems.filter((it) => {
          const clean = it.text.replace(/,/g, '').trim();
          return /^[-+]?\d+(\.\d+)?$/.test(clean);
        });
        if (numItems.length >= 2) {
          fileGrandTotalDr = parseFloat(numItems[0].text.replace(/,/g, '')) || 0;
          fileGrandTotalCr = parseFloat(numItems[1].text.replace(/,/g, '')) || 0;
        }
        continue;
      }

      // Metadata / non-financial rows
      const isMeta =
        lowerText.includes('trial balance') ||
        lowerText.includes('particulars') ||
        lowerText.includes('closing balance') ||
        lowerText.includes('opening balance') ||
        lowerText.includes('page ') ||
        lowerText.includes('dr.gajanan') ||
        lowerText.includes('clinic') ||
        lowerText.includes('hospital') ||
        /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z-]*[\s\-\/]*\d{2,4}.*\bto\b/i.test(fullText) ||
        /^\d{1,2}[-\/]\w{3,}[-\/]\d{2,4}\s+to\s+\d{1,2}[-\/]\w{3,}[-\/]\d{2,4}/i.test(fullText) ||
        fullText.startsWith('1-Apr-') ||
        lowerText.includes('for the period') ||
        lowerText.includes('for the year');

      if (isMeta) continue;

      // Extract account name (text items before number columns)
      const nameItems = lineItems.filter((it) => it.x < Math.min(drColThreshold - 30, 240));
      if (nameItems.length === 0) continue;

      const name = nameItems.map((it) => it.text).join(' ').trim();
      const indentX = nameItems[0].x;

      let dr = 0;
      let cr = 0;

      const numItems = lineItems.filter((it) => {
        if (it.x < Math.min(drColThreshold - 30, 240)) return false;
        const clean = it.text.replace(/,/g, '').trim();
        return /^[-+]?\d+(\.\d+)?$/.test(clean);
      });

      for (const numIt of numItems) {
        const val = parseFloat(numIt.text.replace(/,/g, '')) || 0;
        if (numIt.x < drColThreshold) {
          dr = val;
        } else {
          cr = val;
        }
      }

      if (dr > 0 || cr > 0) {
        rawLines.push({
          page: p,
          y,
          name,
          indentX,
          debit: dr,
          credit: cr,
        });
      }
    }
  }

  // Pass 2: Parent Group Filtering
  const excludedGroupIndices = new Set<number>();

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const lower = line.name.toLowerCase().trim();

    // Check Proof 1: immediate duplicate next line
    if (i + 1 < rawLines.length) {
      const next = rawLines[i + 1];
      if (
        Math.abs(line.debit - next.debit) < 0.01 &&
        Math.abs(line.credit - next.credit) < 0.01 &&
        (KNOWN_TALLY_GROUP_NAMES.has(lower) || line.indentX < next.indentX)
      ) {
        excludedGroupIndices.add(i);
        continue;
      }
    }

    // Check Proof 2: subsequent lines summing up to parent
    let sumDr = 0;
    let sumCr = 0;
    let count = 0;

    for (let j = i + 1; j < rawLines.length; j++) {
      const child = rawLines[j];
      if (excludedGroupIndices.has(j)) continue;

      sumDr += child.debit;
      sumCr += child.credit;
      count++;

      const drMatch = Math.abs(line.debit - sumDr) < 0.05;
      const crMatch = Math.abs(line.credit - sumCr) < 0.05;

      if (drMatch && crMatch && count >= 1) {
        excludedGroupIndices.add(i);
        break;
      }

      if ((line.debit > 0 && sumDr > line.debit + 0.05) || (line.credit > 0 && sumCr > line.credit + 0.05)) {
        break;
      }
    }

    // Check Proof 3: Top-level indentation rule for known Tally groups
    if (!excludedGroupIndices.has(i) && line.indentX < 60 && KNOWN_TALLY_GROUP_NAMES.has(lower)) {
      const hasIndentedChildren = i + 1 < rawLines.length && rawLines[i + 1].indentX > line.indentX + 5;
      if (hasIndentedChildren) {
        excludedGroupIndices.add(i);
      }
    }
  }

  let finalLines = rawLines.filter((_, idx) => !excludedGroupIndices.has(idx));

  // Reconcile against Grand Total if stated in file
  let currentDr = Math.round(finalLines.reduce((s, r) => s + r.debit, 0) * 100) / 100;
  let currentCr = Math.round(finalLines.reduce((s, r) => s + r.credit, 0) * 100) / 100;

  if (fileGrandTotalDr > 0 && Math.abs(currentDr - fileGrandTotalDr) > 0.05) {
    for (let i = 0; i < finalLines.length; i++) {
      const candidate = finalLines[i];
      if (KNOWN_TALLY_GROUP_NAMES.has(candidate.name.toLowerCase().trim())) {
        if (Math.abs(currentDr - candidate.debit - fileGrandTotalDr) < 0.05) {
          finalLines.splice(i, 1);
          currentDr -= candidate.debit;
          currentCr -= candidate.credit;
          break;
        }
      }
    }
  }

  return finalLines.map((line, idx) => {
    const net = Math.abs(line.debit - line.credit) || (line.debit > 0 ? line.debit : line.credit);
    return {
      id: `tb-pdf-${idx}-${line.page}`,
      accountName: line.name,
      closingDebit: line.debit,
      closingCredit: line.credit,
      netBalance: net,
      rawLineIndex: idx,
    };
  });
}

export function parseTrialBalanceExcelOrCsv(data: ArrayBuffer | string): TrialBalanceRow[] {
  const workbook = XLSX.read(data, { type: typeof data === 'string' ? 'string' : 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert to 2D array
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (!rawRows || rawRows.length === 0) {
    throw new Error('The uploaded file is empty or could not be parsed.');
  }

  let headerIndex = -1;
  let colAccountName = -1;
  let colAccountCode = -1;
  let colDebit = -1;
  let colCredit = -1;
  let colNetBalance = -1;

  // Scan up to 40 rows for header
  for (let r = 0; r < Math.min(rawRows.length, 40); r++) {
    const row = rawRows[r].map((cell: any) => String(cell || '').trim().toLowerCase());

    const drIndices: number[] = [];
    const crIndices: number[] = [];

    row.forEach((c: string, idx: number) => {
      // Strict regex matching: ensure "Dr.Gajanan Gaude Clinic", "Dr. Ambedkar Road" are not treated as Debit column!
      const isDebitHeader =
        (c === 'debit' || c === 'dr' || c === 'dr.' || c === 'debits' ||
         c === 'dr amount' || c === 'debit amount' || c === 'closing debit' ||
         c === 'amount (dr)' || c === 'debit balance' ||
         /^(closing\s+)?(debit|dr\.?|dr\s+amount|debit\s+balance|amount\s*\(dr\))\b/i.test(c)) &&
        !c.includes('clinic') && !c.includes('hospital') && !c.includes('road') && !c.includes('street');

      const isCreditHeader =
        (c === 'credit' || c === 'cr' || c === 'cr.' || c === 'credits' ||
         c === 'cr amount' || c === 'credit amount' || c === 'closing credit' ||
         c === 'amount (cr)' || c === 'credit balance' ||
         /^(closing\s+)?(credit|cr\.?|cr\s+amount|credit\s+balance|amount\s*\(cr\))\b/i.test(c));

      if (isDebitHeader) drIndices.push(idx);
      if (isCreditHeader) crIndices.push(idx);
    });

    if (drIndices.length > 0 && crIndices.length > 0) {
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

      // If not on this row, look up up to 5 rows above
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

      // Select closing debit / credit or last debit / credit column
      let chosenDr = drIndices.find((idx) => {
        const text = row[idx];
        const parentText = r > 0 ? String(rawRows[r - 1]?.[idx] || '').toLowerCase() : '';
        return text.includes('closing') || parentText.includes('closing');
      });
      if (chosenDr === undefined && drIndices.length > 0) {
        chosenDr = drIndices[drIndices.length - 1];
      }
      colDebit = chosenDr !== undefined ? chosenDr : -1;

      let chosenCr = crIndices.find((idx) => {
        const text = row[idx];
        const parentText = r > 0 ? String(rawRows[r - 1]?.[idx] || '').toLowerCase() : '';
        return text.includes('closing') || parentText.includes('closing');
      });
      if (chosenCr === undefined && crIndices.length > 0) {
        chosenCr = crIndices[crIndices.length - 1];
      }
      colCredit = chosenCr !== undefined ? chosenCr : -1;

      colAccountCode = row.findIndex((c: string) =>
        c.includes('code') || c.includes('acc no') || c.includes('gl') ||
        c.includes('a/c no') || c.includes('ledger code') || c.includes('acct no')
      );

      colNetBalance = row.findIndex((c: string) =>
        c.includes('closing') || c.includes('net balance') ||
        (c.includes('balance') && !c.includes('opening'))
      );

      break;
    }
  }

  // Fallback heuristic if standard header row isn't found
  if (headerIndex === -1) {
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

    // 1. Extract ledger name
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

    // 2. Filter metadata / date ranges / sheet headers first BEFORE balance checks
    const isHeaderOrMeta =
      lowerName.includes('trial balance') ||
      lowerName.includes('closing balance') ||
      lowerName.includes('opening balance') ||
      lowerName.includes('page ') ||
      lowerName.includes('dr.gajanan') ||
      lowerName.includes('clinic') ||
      lowerName.includes('hospital') ||
      /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z-]*[\s\-\/]*\d{2,4}.*\bto\b/i.test(nameCell) ||
      /^\d{1,2}[-\/]\w{3,}[-\/]\d{2,4}\s+to\s+\d{1,2}[-\/]\w{3,}[-\/]\d{2,4}/i.test(nameCell) ||
      nameCell.startsWith('1-Apr-') ||
      /^\d+$/.test(nameCell);

    if (isHeaderOrMeta) continue;

    // 3. Extract Debit and Credit balances using strict number parsing
    let dr = colDebit !== -1 ? parseNumStrict(row[colDebit]) : 0;
    let cr = colCredit !== -1 ? parseNumStrict(row[colCredit]) : 0;

    // If single net balance column with Dr/Cr text
    if (colNetBalance !== -1 && dr === 0 && cr === 0) {
      const netValStr = String(row[colNetBalance] || '').toLowerCase();
      const num = parseNumStrict(netValStr);
      if (netValStr.includes('dr') || netValStr.includes('debit')) {
        dr = Math.abs(num);
      } else if (netValStr.includes('cr') || netValStr.includes('credit')) {
        cr = Math.abs(num);
      } else {
        if (num >= 0) dr = num;
        else cr = Math.abs(num);
      }
    }

    // Column-aware Fallback: If both colDebit & colCredit are 0, check other numeric cells in row
    if (dr === 0 && cr === 0) {
      const numsInRow: { colIdx: number; val: number }[] = [];
      row.forEach((cell: any, cIdx: number) => {
        if (cIdx !== colAccountName && cell !== undefined && cell !== null && cell !== '') {
          const n = parseNumStrict(cell);
          if (n > 0) numsInRow.push({ colIdx: cIdx, val: n });
        }
      });

      if (numsInRow.length === 1) {
        const single = numsInRow[0];
        // If the number's column is at or after colCredit, or past colDebit, treat as credit!
        if (colCredit !== -1 && (single.colIdx === colCredit || (colDebit !== -1 && single.colIdx > colDebit))) {
          cr = single.val;
        } else {
          dr = single.val;
        }
      } else if (numsInRow.length >= 2) {
        dr = numsInRow[numsInRow.length - 2].val;
        cr = numsInRow[numsInRow.length - 1].val;
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

    // Standard column header words
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

    if (isStandardHeaderWord) continue;

    const hasBalance = dr > 0 || cr > 0;
    if (!hasBalance) continue;

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
  const isParentGroup = new Set<number>();

  for (let i = 0; i < rawCandidates.length; i++) {
    const curr = rawCandidates[i];
    if (!isPotentialGroup(curr.lowerName)) continue;

    // Check Proof 1: Immediate duplicate child with identical non-zero balance
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

      if (drMatch && crMatch && childCount >= 1) {
        isParentGroup.add(i);
        break;
      }

      if ((curr.debit > 0 && accDr > curr.debit + 0.05) || (curr.credit > 0 && accCr > curr.credit + 0.05)) {
        break;
      }
    }
  }

  // Stated Grand Total safety check:
  let kept = rawCandidates.filter((_, idx) => !isParentGroup.has(idx));
  let currentDrTotal = kept.reduce((sum, r) => sum + r.debit, 0);
  let currentCrTotal = kept.reduce((sum, r) => sum + r.credit, 0);

  if (fileGrandTotalDr > 0 && Math.abs(currentDrTotal - fileGrandTotalDr) > 0.05) {
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

export async function parseTrialBalanceFile(
  file: File | { name: string; data: ArrayBuffer | Uint8Array | string }
): Promise<TrialBalanceRow[]> {
  const fileName = 'name' in file ? file.name.toLowerCase() : '';
  const isPdf = fileName.endsWith('.pdf');

  if (isPdf) {
    let buffer: ArrayBuffer | Uint8Array;
    if ('arrayBuffer' in file && typeof file.arrayBuffer === 'function') {
      buffer = await file.arrayBuffer();
    } else {
      buffer = (file as any).data;
    }
    return parseTrialBalancePdf(buffer);
  }

  let buffer: ArrayBuffer | string;
  if ('arrayBuffer' in file && typeof file.arrayBuffer === 'function') {
    buffer = await file.arrayBuffer();
  } else {
    buffer = (file as any).data;
  }
  return parseTrialBalanceExcelOrCsv(buffer);
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

/**
 * Result of parsing partner ledgers or capital schedule
 */
export interface PartnerParseResult {
  partners: PartnerCapitalRecord[];
  format: 'schedule' | 'ledger' | 'unknown';
  detectedSheetCount: number;
  warnings: string[];
}

/**
 * Parses partner capital statements or detailed Tally/Busy ledger account exports
 * Supports both multi-partner summary schedules and individual partner ledger statements.
 */
export function parsePartnerLedgerOrScheduleFile(
  data: ArrayBuffer | string,
  fileName: string = ''
): PartnerParseResult {
  const workbook = XLSX.read(data, { type: typeof data === 'string' ? 'string' : 'array' });
  const warnings: string[] = [];
  const partnersMap = new Map<string, PartnerCapitalRecord>();

  let detectedFormat: 'schedule' | 'ledger' | 'unknown' = 'unknown';

  // Helper to parse numeric cell safely
  const parseNum = (val: any): number => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const str = String(val).replace(/[, ₹]/g, '').trim();
    const isNegative = str.startsWith('(') && str.endsWith(')');
    const cleaned = str.replace(/[()]/g, '');
    const num = parseFloat(cleaned);
    if (isNaN(num)) return 0;
    return isNegative ? -num : num;
  };

  // Process all sheets in the uploaded workbook
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    if (!rawRows || rawRows.length === 0) continue;

    // Check if this sheet is a Summary Schedule format
    let scheduleHeaderIdx = -1;
    let colName = -1;
    let colPsr = -1;
    let colOpening = -1;
    let colIntroduced = -1;
    let colRemun = -1;
    let colInterest = -1;
    let colDrawings = -1;
    let colProfit = -1;
    let colClosing = -1;

    for (let r = 0; r < Math.min(rawRows.length, 25); r++) {
      const row = rawRows[r].map((cell: any) => String(cell || '').toLowerCase().trim());
      const hasName = row.some((c) => c.includes('partner') || c.includes('proprietor') || c === 'name' || c.includes('partner name'));
      const hasOpeningOrClosing = row.some((c) => c.includes('opening') || c.includes('closing') || c.includes('01.04') || c.includes('31.03') || c.includes('capital'));

      if (hasName && hasOpeningOrClosing) {
        scheduleHeaderIdx = r;
        row.forEach((cell, cIdx) => {
          if ((cell.includes('partner') || cell.includes('proprietor') || cell === 'name') && !cell.includes('share') && !cell.includes('remun') && !cell.includes('interest')) {
            if (colName === -1) colName = cIdx;
          }
          if (cell.includes('share') || cell.includes('psr') || cell.includes('ratio') || cell.includes('%') || cell.includes('percent')) {
            if (colPsr === -1) colPsr = cIdx;
          }
          if (cell.includes('opening') || cell.includes('01.04') || cell.includes('1st april') || cell.includes('op bal') || cell.includes('b/f') || cell.includes('op.')) {
            if (colOpening === -1) colOpening = cIdx;
          }
          if (cell.includes('introduced') || cell.includes('addition') || cell.includes('fresh') || cell.includes('contributed') || cell.includes('intro')) {
            if (colIntroduced === -1) colIntroduced = cIdx;
          }
          if (cell.includes('remuneration') || cell.includes('salary') || cell.includes('remun')) {
            if (colRemun === -1) colRemun = cIdx;
          }
          if (cell.includes('interest') || cell.includes('ioc')) {
            if (colInterest === -1) colInterest = cIdx;
          }
          if (cell.includes('drawing') || cell.includes('withdrawal') || cell.includes('drawings')) {
            if (colDrawings === -1) colDrawings = cIdx;
          }
          if (cell.includes('profit') || cell.includes('loss') || cell.includes('share of profit') || cell.includes('pat')) {
            if (colProfit === -1 && !cell.includes('share (%)') && !cell.includes('ratio')) colProfit = cIdx;
          }
          if (cell.includes('closing') || cell.includes('31.03') || cell.includes('31st march') || cell.includes('cl bal') || cell.includes('c/f') || cell.includes('cl.')) {
            if (colClosing === -1) colClosing = cIdx;
          }
        });
        break;
      }
    }

    if (scheduleHeaderIdx !== -1 && colName !== -1) {
      detectedFormat = 'schedule';
      for (let r = scheduleHeaderIdx + 1; r < rawRows.length; r++) {
        const row = rawRows[r];
        const rawName = String(row[colName] || '').trim();
        if (!rawName) continue;
        const lowerName = rawName.toLowerCase();
        if (
          lowerName.includes('total') ||
          lowerName.includes('sub-total') ||
          lowerName.includes('previous year') ||
          lowerName.startsWith('note') ||
          lowerName.startsWith('sr.')
        ) {
          continue;
        }

        const psrVal = colPsr !== -1 ? parseNum(row[colPsr]) : 0;
        const openingVal = colOpening !== -1 ? parseNum(row[colOpening]) : 0;
        const introVal = colIntroduced !== -1 ? parseNum(row[colIntroduced]) : 0;
        const remunVal = colRemun !== -1 ? parseNum(row[colRemun]) : 0;
        const interestVal = colInterest !== -1 ? parseNum(row[colInterest]) : 0;
        const drawingsVal = colDrawings !== -1 ? Math.abs(parseNum(row[colDrawings])) : 0;
        const profitVal = colProfit !== -1 ? parseNum(row[colProfit]) : 0;
        let closingVal = colClosing !== -1 ? parseNum(row[colClosing]) : 0;

        if (closingVal === 0 && (openingVal !== 0 || profitVal !== 0 || introVal !== 0)) {
          closingVal = Math.round((openingVal + introVal + remunVal + interestVal - drawingsVal + profitVal) * 100) / 100;
        }

        const cleanedName = rawName.replace(/^(\d+[\.\s\-]+)/, '').trim();

        partnersMap.set(cleanedName, {
          srNo: partnersMap.size + 1,
          partnerName: cleanedName,
          profitSharePercent: psrVal || (100 / Math.max(1, partnersMap.size + 1)),
          profitShareRatio: `${psrVal || 0}%`,
          openingBalance: openingVal,
          capitalIntroduced: introVal,
          remuneration: remunVal,
          interestOnCapital: interestVal,
          withdrawals: drawingsVal,
          shareOfProfit: profitVal,
          closingBalance: closingVal,
        });
      }
      continue;
    }

    // Check if this sheet is a Ledger Account Statement format (Tally / Busy)
    let ledgerHeaderIdx = -1;
    let colParticulars = -1;
    let colDebit = -1;
    let colCredit = -1;

    for (let r = 0; r < Math.min(rawRows.length, 25); r++) {
      const row = rawRows[r].map((cell: any) => String(cell || '').toLowerCase().trim());
      const partIdx = row.findIndex((c) => c.includes('particular') || c.includes('narration') || c.includes('description') || c === 'account');
      const drIdx = row.findIndex((c) => c.includes('debit') || c.includes('dr.') || c === 'dr');
      const crIdx = row.findIndex((c) => c.includes('credit') || c.includes('cr.') || c === 'cr');

      if (partIdx !== -1 && (drIdx !== -1 || crIdx !== -1)) {
        ledgerHeaderIdx = r;
        colParticulars = partIdx;
        colDebit = drIdx;
        colCredit = crIdx;
        break;
      }
    }

    if (ledgerHeaderIdx !== -1 && colParticulars !== -1) {
      detectedFormat = 'ledger';
      // Identify Partner Name from sheet name, file name, or top header lines
      let partnerName = sheetName;
      if (partnerName.toLowerCase().startsWith('sheet') || partnerName.toLowerCase().includes('ledger')) {
        for (let r = 0; r < ledgerHeaderIdx; r++) {
          const rowText = rawRows[r].map((c) => String(c || '').trim()).join(' ');
          if (rowText.toLowerCase().includes('ledger:') || rowText.toLowerCase().includes('account:')) {
            partnerName = rowText.replace(/ledger:|account:/gi, '').trim();
            break;
          }
        }
      }
      if (!partnerName || partnerName.toLowerCase().startsWith('sheet')) {
        partnerName = fileName.replace(/\.(xlsx?|csv)$/i, '').replace(/[-_]/g, ' ').trim();
      }

      partnerName = partnerName
        .replace(/(capital\s*a\/c|capital\s*account|current\s*a\/c|current\s*account|drawings\s*a\/c|partner)/gi, '')
        .replace(/[-–:_]/g, ' ')
        .trim();

      if (!partnerName) partnerName = `Partner ${partnersMap.size + 1}`;

      let opBal = 0;
      let intro = 0;
      let remun = 0;
      let interest = 0;
      let draw = 0;
      let profit = 0;
      let closeBal = 0;

      for (let r = ledgerHeaderIdx + 1; r < rawRows.length; r++) {
        const row = rawRows[r];
        const particulars = String(row[colParticulars] || '').trim().toLowerCase();
        if (!particulars) continue;

        const dr = colDebit !== -1 ? parseNum(row[colDebit]) : 0;
        const cr = colCredit !== -1 ? parseNum(row[colCredit]) : 0;

        if (particulars.includes('opening balance') || particulars.includes('op. bal') || particulars.includes('balance b/f') || particulars.includes('b/d')) {
          opBal = cr > 0 ? cr : -dr;
        } else if (particulars.includes('salary') || particulars.includes('remuneration')) {
          remun += cr > 0 ? cr : 0;
        } else if (particulars.includes('interest on capital') || particulars.includes('interest')) {
          interest += cr > 0 ? cr : 0;
        } else if (particulars.includes('cash') || particulars.includes('bank') || particulars.includes('capital introduced') || particulars.includes('addition')) {
          if (cr > 0) intro += cr;
        } else if (particulars.includes('drawing') || particulars.includes('withdrawal') || particulars.includes('income tax') || particulars.includes('lic') || particulars.includes('self')) {
          draw += dr > 0 ? dr : 0;
        } else if (particulars.includes('profit') || particulars.includes('p&l') || particulars.includes('share of')) {
          profit += cr > 0 ? cr : -dr;
        } else if (particulars.includes('closing balance') || particulars.includes('bal c/f') || particulars.includes('c/d')) {
          closeBal = cr > 0 ? cr : dr;
        }
      }

      if (closeBal === 0 && (opBal !== 0 || intro !== 0 || profit !== 0)) {
        closeBal = Math.round((opBal + intro + remun + interest - draw + profit) * 100) / 100;
      }

      partnersMap.set(partnerName, {
        srNo: partnersMap.size + 1,
        partnerName: partnerName,
        profitSharePercent: 0, // will recompute equally if 0
        profitShareRatio: '0%',
        openingBalance: opBal,
        capitalIntroduced: intro,
        remuneration: remun,
        interestOnCapital: interest,
        withdrawals: draw,
        shareOfProfit: profit,
        closingBalance: closeBal,
      });
    }
  }

  const partners = Array.from(partnersMap.values());

  // If PSR percentages sum to 0 or are empty, distribute equally
  const totalPsr = partners.reduce((s, p) => s + (p.profitSharePercent || 0), 0);
  if (totalPsr <= 0 && partners.length > 0) {
    const eq = Math.round((100 / partners.length) * 100) / 100;
    partners.forEach((p, idx) => {
      const psr = idx === partners.length - 1 ? Math.round((100 - eq * (partners.length - 1)) * 100) / 100 : eq;
      p.profitSharePercent = psr;
      p.profitShareRatio = `${psr}%`;
    });
  }

  if (partners.length === 0) {
    warnings.push('Could not detect any partner records. Please ensure your file contains partner names, opening balance, and capital movements.');
  }

  return {
    partners,
    format: detectedFormat,
    detectedSheetCount: workbook.SheetNames.length,
    warnings,
  };
}

/**
 * Generates and downloads a clean, statutory Excel (.xlsx) template for Note 3 Partner Capital Schedule
 */
export function downloadPartnerCapitalTemplate(
  entityName: string = 'Entity',
  existingPartners?: Array<{ name: string; profitSharePercent?: number; openingBalance?: number }>
): void {
  const wb = XLSX.utils.book_new();

  const headers = [
    'Sr. No.',
    'Name of Partner/ Proprietor/ Owner',
    'Share of Profit (%)',
    'As at 1st April (Opening Balance)',
    'Capital Introduced / Contributed',
    'Remuneration for the year',
    'Interest for the year',
    'Withdrawals / Drawings during the year',
    'Share of Profit / Loss for the year',
    'As at 31st March (Closing Balance)',
  ];

  const rows: any[][] = [headers];

  if (existingPartners && existingPartners.length > 0) {
    existingPartners.forEach((p, idx) => {
      rows.push([
        idx + 1,
        p.name,
        p.profitSharePercent || Math.round(100 / existingPartners.length),
        p.openingBalance || 0,
        0,
        0,
        0,
        0,
        0,
        p.openingBalance || 0,
      ]);
    });
  } else {
    rows.push(
      [1, 'Partner A', 50, 500000, 0, 120000, 30000, 60000, 150000, 740000],
      [2, 'Partner B', 50, 500000, 0, 120000, 30000, 60000, 150000, 740000]
    );
  }

  // Add Total Row
  rows.push([
    '',
    'TOTAL',
    100,
    '=SUM(D2:D' + (rows.length) + ')',
    '=SUM(E2:E' + (rows.length) + ')',
    '=SUM(F2:F' + (rows.length) + ')',
    '=SUM(G2:G' + (rows.length) + ')',
    '=SUM(H2:H' + (rows.length) + ')',
    '=SUM(I2:I' + (rows.length) + ')',
    '=SUM(J2:J' + (rows.length) + ')',
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws['!cols'] = [
    { wch: 8 },  // Sr
    { wch: 32 }, // Name
    { wch: 18 }, // Share %
    { wch: 24 }, // Opening
    { wch: 24 }, // Introduced
    { wch: 22 }, // Remun
    { wch: 20 }, // Interest
    { wch: 26 }, // Withdrawals
    { wch: 24 }, // Share of Profit
    { wch: 24 }, // Closing
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Partner_Capital_Schedule');

  // Instructions Sheet
  const instructions = [
    ['ICAI GUIDANCE NOTE ON FINANCIAL STATEMENTS OF NON-CORPORATE ENTITIES'],
    ['STATUTORY SCHEDULE: OWNERS\' / PARTNERS\' CAPITAL ACCOUNT RECONCILIATION (PAGE 6)'],
    [''],
    ['HOW TO USE THIS TEMPLATE:'],
    ['1. Enter the full legal name of each partner or proprietor in Column B.'],
    ['2. Enter the agreed Profit Sharing Ratio (PSR %) in Column C (total must equal 100%).'],
    ['3. Fill in Opening Capital Balance as on 1st April in Column D.'],
    ['4. Record fresh capital introduced in Column E, partners\' remuneration in Column F, and interest in Column G.'],
    ['5. Record partner withdrawals or personal drawings in Column H.'],
    ['6. Enter share of Net Profit or Loss allocated to each partner in Column I.'],
    ['7. Closing Balance in Column J should satisfy: Opening + Introduced + Remuneration + Interest - Withdrawals + Share of Profit.'],
    ['8. Save the file and upload it directly in the CA Financial Statement application under Note 3.'],
    [''],
    ['NOTE: You can also upload exported ledger statements directly from Tally, Busy, or Excel.'],
  ];

  const wsInst = XLSX.utils.aoa_to_sheet(instructions);
  wsInst['!cols'] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsInst, 'Instructions');

  const cleanName = entityName.replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(wb, `${cleanName}_Partner_Capital_Schedule_Template.xlsx`);
}
