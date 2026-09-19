import * as XLSX from 'xlsx-js-style';
import JSZip from 'jszip';
import {
  BalanceSheetData,
  EntityConfig,
  MappedLedger,
  NoteScheduleData,
  ProfitAndLossData,
  AuditException,
  TrialBalanceRow,
} from '../types';
import { NCE_NOTE_DEFINITIONS } from '../data/nceTaxonomy';

interface ExportExcelParams {
  entityConfig: EntityConfig;
  balanceSheet: BalanceSheetData;
  profitAndLoss: ProfitAndLossData;
  noteSchedules: Record<number, NoteScheduleData>;
  exceptions: AuditException[];
  rawRows?: TrialBalanceRow[];
  mappedLedgers?: MappedLedger[];
}

// ==========================================
// COLOR PALETTE & STYLING CONSTANTS (ICAI AUDIT THEME)
// ==========================================
const PALETTE = {
  navyDark: '0F172A',         // Slate 900
  navyPrimary: '1E3A8A',      // Blue 900 (Main Table Headers)
  navyMedium: '1E40AF',       // Blue 800
  navyAccent: '2563EB',       // Blue 600
  navyLight: 'DBEAFE',        // Blue 100
  navyTint: 'EFF6FF',         // Blue 50

  sectionBg: 'E0E7FF',        // Soft Indigo (Roman numeral sections)
  sectionText: '1E3A8A',      // Bold Navy
  subSectionBg: 'F1F5F9',     // Soft Slate (1), (2), (3)
  subSectionText: '1E293B',   // Dark Slate

  grandTotalBg: 'FEF3C7',     // Warm Amber Accounting Accent
  grandTotalText: '0F172A',   // Slate 900 Bold
  subTotalBg: 'F8FAFC',       // Off-white slate

  zebraEven: 'FFFFFF',
  zebraOdd: 'F8FAFC',

  // Status & Validation Fills
  successBg: 'DCFCE7',        // Green 100
  successText: '166534',      // Green 800
  dangerBg: 'FEE2E2',         // Red 100
  dangerText: '991B1B',       // Red 800
  warningBg: 'FEF3C7',        // Amber 100
  warningText: '92400E',      // Amber 800
  infoBg: 'E0F2FE',           // Sky 100
  infoText: '075985',         // Sky 800

  // Borders
  borderDark: '0F172A',
  borderNavy: '1E3A8A',
  borderMedium: '94A3B8',
  borderLight: 'E2E8F0',
  borderUltraLight: 'F1F5F9',
  white: 'FFFFFF',
};

const FONT_FAMILY = 'Calibri';
const CURRENCY_FMT = '"₹" #,##,##0.00;[Red]("-₹" #,##,##0.00);"-"';
const PCT_FMT = '+0.0%;-0.0%;"-"';

// ==========================================
// CELL GENERATOR UTILITIES
// ==========================================

/**
 * Creates a numeric cell with Indian Currency formatting and optional total borders.
 */
function numCell(
  val: number | undefined | null,
  options?: {
    isGrandTotal?: boolean;
    isSubtotal?: boolean;
    bg?: string;
    bold?: boolean;
  }
) {
  const isGrand = !!options?.isGrandTotal;
  const isSub = !!options?.isSubtotal;
  const bg = options?.bg || (isGrand ? PALETTE.grandTotalBg : isSub ? PALETTE.subTotalBg : undefined);

  if (val === undefined || val === null) {
    return {
      t: 's',
      v: '-',
      s: {
        font: { name: FONT_FAMILY, sz: 10, bold: isGrand || isSub || !!options?.bold, color: { rgb: '64748B' } },
        alignment: { horizontal: 'right', vertical: 'center' },
        fill: bg ? { fgColor: { rgb: bg }, patternType: 'solid' } : undefined,
        border: isGrand
          ? {
              top: { style: 'thin', color: { rgb: PALETTE.borderDark } },
              bottom: { style: 'double', color: { rgb: PALETTE.borderDark } },
              left: { style: 'thin', color: { rgb: PALETTE.borderMedium } },
              right: { style: 'thin', color: { rgb: PALETTE.borderMedium } },
            }
          : isSub
          ? {
              top: { style: 'thin', color: { rgb: PALETTE.borderMedium } },
              bottom: { style: 'thin', color: { rgb: PALETTE.borderLight } },
              left: { style: 'thin', color: { rgb: PALETTE.borderLight } },
              right: { style: 'thin', color: { rgb: PALETTE.borderLight } },
            }
          : {
              top: { style: 'thin', color: { rgb: PALETTE.borderUltraLight } },
              bottom: { style: 'thin', color: { rgb: PALETTE.borderUltraLight } },
              left: { style: 'thin', color: { rgb: PALETTE.borderUltraLight } },
              right: { style: 'thin', color: { rgb: PALETTE.borderUltraLight } },
            },
      },
    };
  }

  return {
    t: 'n',
    v: Math.round(val * 100) / 100,
    s: {
      numFmt: CURRENCY_FMT,
      font: {
        name: FONT_FAMILY,
        sz: isGrand ? 11 : isSub ? 10.5 : 10,
        bold: isGrand || isSub || !!options?.bold,
        color: { rgb: isGrand ? PALETTE.grandTotalText : '0F172A' },
      },
      alignment: { horizontal: 'right', vertical: 'center' },
      fill: bg ? { fgColor: { rgb: bg }, patternType: 'solid' } : undefined,
      border: isGrand
        ? {
            top: { style: 'thin', color: { rgb: PALETTE.borderDark } },
            bottom: { style: 'double', color: { rgb: PALETTE.borderDark } },
            left: { style: 'thin', color: { rgb: PALETTE.borderMedium } },
            right: { style: 'thin', color: { rgb: PALETTE.borderMedium } },
          }
        : isSub
        ? {
            top: { style: 'thin', color: { rgb: PALETTE.borderMedium } },
            bottom: { style: 'thin', color: { rgb: PALETTE.borderLight } },
            left: { style: 'thin', color: { rgb: PALETTE.borderLight } },
            right: { style: 'thin', color: { rgb: PALETTE.borderLight } },
          }
        : {
            top: { style: 'thin', color: { rgb: PALETTE.borderUltraLight } },
            bottom: { style: 'thin', color: { rgb: PALETTE.borderUltraLight } },
            left: { style: 'thin', color: { rgb: PALETTE.borderUltraLight } },
            right: { style: 'thin', color: { rgb: PALETTE.borderUltraLight } },
          },
    },
  };
}

/**
 * Creates a percentage variance cell.
 */
function pctCell(valCY: number | undefined | null, valPY: number | undefined | null, isGrand?: boolean) {
  if (!valPY || valPY === 0 || !valCY) {
    return {
      t: 's',
      v: '-',
      s: {
        font: { name: FONT_FAMILY, sz: 9.5, color: { rgb: '94A3B8' } },
        alignment: { horizontal: 'right', vertical: 'center' },
        fill: isGrand ? { fgColor: { rgb: PALETTE.grandTotalBg }, patternType: 'solid' } : undefined,
        border: isGrand
          ? {
              top: { style: 'thin', color: { rgb: PALETTE.borderDark } },
              bottom: { style: 'double', color: { rgb: PALETTE.borderDark } },
              left: { style: 'thin', color: { rgb: PALETTE.borderMedium } },
              right: { style: 'thin', color: { rgb: PALETTE.borderMedium } },
            }
          : {
              top: { style: 'thin', color: { rgb: PALETTE.borderUltraLight } },
              bottom: { style: 'thin', color: { rgb: PALETTE.borderUltraLight } },
              left: { style: 'thin', color: { rgb: PALETTE.borderUltraLight } },
              right: { style: 'thin', color: { rgb: PALETTE.borderUltraLight } },
            },
      },
    };
  }

  const pct = (valCY - valPY) / Math.abs(valPY);
  return {
    t: 'n',
    v: Math.round(pct * 1000) / 1000,
    s: {
      numFmt: PCT_FMT,
      font: {
        name: FONT_FAMILY,
        sz: 9.5,
        bold: isGrand,
        color: { rgb: pct >= 0 ? '166534' : '991B1B' },
      },
      alignment: { horizontal: 'right', vertical: 'center' },
      fill: isGrand ? { fgColor: { rgb: PALETTE.grandTotalBg }, patternType: 'solid' } : undefined,
      border: isGrand
        ? {
            top: { style: 'thin', color: { rgb: PALETTE.borderDark } },
            bottom: { style: 'double', color: { rgb: PALETTE.borderDark } },
            left: { style: 'thin', color: { rgb: PALETTE.borderMedium } },
            right: { style: 'thin', color: { rgb: PALETTE.borderMedium } },
          }
        : {
            top: { style: 'thin', color: { rgb: PALETTE.borderUltraLight } },
            bottom: { style: 'thin', color: { rgb: PALETTE.borderUltraLight } },
            left: { style: 'thin', color: { rgb: PALETTE.borderUltraLight } },
            right: { style: 'thin', color: { rgb: PALETTE.borderUltraLight } },
          },
    },
  };
}

/**
 * Creates a text cell with custom font, background, alignment, and border.
 */
function textCell(
  text: string | number,
  options?: {
    bold?: boolean;
    italic?: boolean;
    sz?: number;
    color?: string;
    bg?: string;
    align?: 'left' | 'center' | 'right';
    valign?: 'top' | 'center' | 'bottom';
    wrapText?: boolean;
    border?: any;
  }
) {
  return {
    t: typeof text === 'number' ? 'n' : 's',
    v: text,
    s: {
      font: {
        name: FONT_FAMILY,
        sz: options?.sz || 10,
        bold: !!options?.bold,
        italic: !!options?.italic,
        color: { rgb: options?.color || '1E293B' },
      },
      alignment: {
        horizontal: options?.align || 'left',
        vertical: options?.valign || 'center',
        wrapText: options?.wrapText ?? true,
      },
      fill: options?.bg ? { fgColor: { rgb: options?.bg }, patternType: 'solid' } : undefined,
      border: options?.border || {
        top: { style: 'thin', color: { rgb: PALETTE.borderUltraLight } },
        bottom: { style: 'thin', color: { rgb: PALETTE.borderUltraLight } },
        left: { style: 'thin', color: { rgb: PALETTE.borderUltraLight } },
        right: { style: 'thin', color: { rgb: PALETTE.borderUltraLight } },
      },
    },
  };
}

/**
 * Creates a table header cell with high-contrast executive styling.
 */
function thCell(text: string, align: 'left' | 'center' | 'right' = 'left', bg: string = PALETTE.navyPrimary) {
  return {
    t: 's',
    v: text,
    s: {
      font: {
        name: FONT_FAMILY,
        sz: 10,
        bold: true,
        color: { rgb: PALETTE.white },
      },
      alignment: {
        horizontal: align,
        vertical: 'center',
        wrapText: true,
      },
      fill: { fgColor: { rgb: bg }, patternType: 'solid' },
      border: {
        top: { style: 'thin', color: { rgb: bg } },
        bottom: { style: 'medium', color: { rgb: PALETTE.borderDark } },
        left: { style: 'thin', color: { rgb: '3B82F6' } },
        right: { style: 'thin', color: { rgb: '3B82F6' } },
      },
    },
  };
}

export interface PrintSetupOptions {
  orientation?: 'portrait' | 'landscape';
  entityName?: string;
  reportTitle?: string;
  financialYear?: string;
  headerRowsToFreeze?: number;
  tabColor?: string;
}

/**
 * Formats a print-ready worksheet with A4 page setup, 1-page wide scaling,
 * standard print margins, running headers/footers, freeze panes, and visible gridlines.
 */
function applyPrintSetup(
  ws: XLSX.WorkSheet,
  optionsOrOrientation: 'portrait' | 'landscape' | PrintSetupOptions = 'portrait'
) {
  const options: PrintSetupOptions =
    typeof optionsOrOrientation === 'string'
      ? { orientation: optionsOrOrientation }
      : optionsOrOrientation;

  const orientation = options.orientation || 'portrait';
  const entityName = options.entityName || 'NON-CORPORATE ENTITY';
  const reportTitle = options.reportTitle || 'FINANCIAL STATEMENTS';
  const fy = options.financialYear || '';

  // 1. Page Setup for A4, Fit to 1 page wide (prevents awkward column spillover onto extra pages)
  ws['!pageSetup'] = {
    orientation,
    paperSize: 9, // A4 (210 x 297 mm) - ICAI statutory format
    fitToWidth: 1, // Fit all columns onto 1 page width
    fitToHeight: 0, // Unconstrained height allows natural multi-page flow
    scale: 100,
    fitToPage: true,
    blackAndWhite: false,
    draft: false,
    horizontalCentered: true, // Centers printed tables horizontally on page
    verticalCentered: false,
  };

  // 2. Enable fitToPage in worksheet properties & tab color
  ws['!properties'] = {
    pageSetUpPr: { fitToPage: true },
    tabColor: options.tabColor ? { rgb: options.tabColor } : undefined,
  };

  // 3. Print Margins (0.5 inch left/right provides maximum usable width on A4 while leaving room for filing/binding)
  ws['!margins'] = {
    left: 0.5,
    right: 0.5,
    top: 0.75,
    bottom: 0.75,
    header: 0.35,
    footer: 0.35,
  };

  // 4. Running Header & Footer for Print / PDF Generation
  // &L = Left, &C = Center, &R = Right
  // &B = Bold, &P = Page Number, &N = Total Pages, &D = Date
  const safeEntity = entityName.replace(/&/g, '&&');
  const safeTitle = reportTitle.replace(/&/g, '&&');
  ws['!headerFooter'] = {
    oddHeader: `&L&B&9${safeEntity}&B&C&B&10${safeTitle}&B&R&B&9${fy ? `FY ${fy}` : ''}&B`,
    oddFooter: `&L&8Statutory Audit Copy - ICAI NCE Format&C&9Page &P of &N&R&8Printed: &D`,
    evenHeader: `&L&B&9${safeEntity}&B&C&B&10${safeTitle}&B&R&B&9${fy ? `FY ${fy}` : ''}&B`,
    evenFooter: `&L&8Statutory Audit Copy - ICAI NCE Format&C&9Page &P of &N&R&8Printed: &D`,
  };

  // 5. Freeze Panes & Show Gridlines
  const freezeRow = options.headerRowsToFreeze || 6;
  ws['!views'] = [
    {
      showGridLines: true,
      state: 'frozen',
      ySplit: freezeRow,
      xSplit: 0,
      activeCell: `A${freezeRow + 1}`,
      sqref: `A${freezeRow + 1}`,
    },
  ];
}

/**
 * Generates an executive header banner row (Company Name, Title, Subtitle, Currency notice).
 */
function appendExecutiveHeaderBanner(
  rows: any[][],
  entityName: string,
  reportTitle: string,
  currentPeriod: string,
  previousPeriod: string,
  colCount: number,
  rowHeights?: Array<{ hpt?: number; hidden?: boolean }>
) {
  // Row 0: Entity Legal Name Banner
  const titleRow: any[] = [];
  for (let c = 0; c < colCount; c++) {
    titleRow.push(
      textCell(c === 0 ? entityName.toUpperCase() : '', {
        bold: true,
        sz: 14,
        color: PALETTE.white,
        bg: PALETTE.navyPrimary,
        align: 'center',
        border: {
          top: { style: 'medium', color: { rgb: PALETTE.navyPrimary } },
          bottom: { style: 'thin', color: { rgb: PALETTE.navyAccent } },
          left: { style: 'thin', color: { rgb: PALETTE.navyPrimary } },
          right: { style: 'thin', color: { rgb: PALETTE.navyPrimary } },
        },
      })
    );
  }
  rows.push(titleRow);
  if (rowHeights) rowHeights.push({ hpt: 34 });

  // Row 1: Report Title Sub-banner
  const subTitleRow: any[] = [];
  for (let c = 0; c < colCount; c++) {
    subTitleRow.push(
      textCell(c === 0 ? reportTitle : '', {
        bold: true,
        sz: 11.5,
        color: PALETTE.navyDark,
        bg: PALETTE.navyTint,
        align: 'center',
        border: {
          bottom: { style: 'thin', color: { rgb: PALETTE.borderMedium } },
          left: { style: 'thin', color: { rgb: PALETTE.navyTint } },
          right: { style: 'thin', color: { rgb: PALETTE.navyTint } },
        },
      })
    );
  }
  rows.push(subTitleRow);
  if (rowHeights) rowHeights.push({ hpt: 24 });

  // Row 2: ICAI Guidance Note Subtitle
  const noteRow: any[] = [];
  for (let c = 0; c < colCount; c++) {
    noteRow.push(
      textCell(
        c === 0
          ? '(Formulated strictly as per ICAI Guidance Note on Financial Statements of Non-Corporate Entities)'
          : '',
        {
          italic: true,
          sz: 9,
          color: '64748B',
          align: 'center',
          border: { bottom: { style: 'thin', color: { rgb: PALETTE.borderUltraLight } } },
        }
      )
    );
  }
  rows.push(noteRow);
  if (rowHeights) rowHeights.push({ hpt: 18 });

  // Row 3: Meta & Currency Bar
  const metaRow: any[] = [];
  for (let c = 0; c < colCount; c++) {
    let content = '';
    if (c === 0) content = `Reporting Period: As at ${currentPeriod} (Comparative: As at ${previousPeriod})`;
    if (c === colCount - 1) content = 'Amounts in Indian Rupees (₹)';
    metaRow.push(
      textCell(content, {
        bold: c === colCount - 1,
        sz: 9,
        color: '475569',
        align: c === colCount - 1 ? 'right' : 'left',
        border: { bottom: { style: 'thin', color: { rgb: PALETTE.borderLight } } },
      })
    );
  }
  rows.push(metaRow);
  if (rowHeights) rowHeights.push({ hpt: 20 });

  // Row 4: Empty spacer
  rows.push(new Array(colCount).fill(textCell('', { border: {} })));
  if (rowHeights) rowHeights.push({ hpt: 10 });
}

/**
 * Generates an ICAI CA Audit Sign-off Block at the bottom of financial statements with
 * designated signature lines for printout and physical stamping.
 */
function appendSignOffBlock(
  rows: any[][],
  entityConfig: EntityConfig,
  currentPeriod: string,
  colCount: number,
  rowHeights?: Array<{ hpt?: number; hidden?: boolean }>
) {
  rows.push(new Array(colCount).fill(textCell('', { border: {} })));
  if (rowHeights) rowHeights.push({ hpt: 14 });
  rows.push(new Array(colCount).fill(textCell('', { border: {} })));
  if (rowHeights) rowHeights.push({ hpt: 10 });

  const bannerRow: any[] = [];
  for (let c = 0; c < colCount; c++) {
    bannerRow.push(
      textCell(c === 0 ? 'STATUTORY AUDIT & MANAGEMENT SIGN-OFF BLOCK' : '', {
        bold: true,
        sz: 10,
        color: PALETTE.white,
        bg: PALETTE.navyMedium,
        align: 'left',
        border: {
          top: { style: 'thin', color: { rgb: PALETTE.navyMedium } },
          bottom: { style: 'thin', color: { rgb: PALETTE.borderDark } },
        },
      })
    );
  }
  rows.push(bannerRow);
  if (rowHeights) rowHeights.push({ hpt: 22 });

  // Split into Management (Left) and Auditor (Right)
  const halfCol = Math.floor(colCount / 2);
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const blockLines = [
    {
      left: 'For and on behalf of the Entity / Management:',
      right: 'In terms of our Statutory Audit Report of even date attached:',
      bold: true,
      hpt: 22,
    },
    {
      left: `For ${entityConfig.entityName || 'NON-CORPORATE ENTITY'}`,
      right: `For ${entityConfig.auditorName || 'Chartered Accountants'}`,
      bold: true,
      hpt: 22,
    },
    {
      left: 'Constitution: ' + (entityConfig.entityType || 'Partnership Firm'),
      right: 'Chartered Accountants / Statutory Auditors',
      bold: false,
      hpt: 20,
    },
    {
      left: '',
      right: `Firm Registration No. (FRN): ${entityConfig.firmRegistrationNo || 'N/A'}`,
      bold: false,
      hpt: 20,
    },
    {
      left: '_____________________________________',
      right: '_____________________________________',
      bold: true,
      hpt: 34, // Designated signature line with vertical space for physical signing & seal
    },
    {
      left: 'Partner / Proprietor / Authorized Signatory',
      right: `Partner / Proprietor (M. No.: ${entityConfig.auditorMembershipNo || 'N/A'})`,
      bold: true,
      hpt: 20,
    },
    {
      left: `Place: India`,
      right: `UDIN: ${entityConfig.udin || 'Applicable at signing'}`,
      bold: false,
      hpt: 20,
    },
    {
      left: `Date: ${dateStr}`,
      right: `Date: ${dateStr}`,
      bold: false,
      hpt: 20,
    },
  ];

  blockLines.forEach((line) => {
    const row: any[] = [];
    for (let c = 0; c < colCount; c++) {
      if (c === 0) {
        row.push(textCell(line.left, { bold: line.bold, sz: 9.5, color: '1E293B' }));
      } else if (c === halfCol) {
        row.push(textCell(line.right, { bold: line.bold, sz: 9.5, color: '1E293B' }));
      } else {
        row.push(textCell('', {}));
      }
    }
    rows.push(row);
    if (rowHeights) rowHeights.push({ hpt: line.hpt });
  });
}

// ==========================================
// MAIN EXPORT FUNCTION
// ==========================================

/**
 * Generates an exceptionally attractive, print-ready, CA-audit compliant Excel workbook (.xlsx)
 * with executive headers, rich typography, cell borders, Indian currency formatting,
 * variance analysis, and ICAI statutory compliance validation.
 */
export function buildAttractiveExcelWorkbook({
  entityConfig,
  balanceSheet,
  profitAndLoss,
  noteSchedules,
  exceptions,
  rawRows = [],
  mappedLedgers = [],
}: ExportExcelParams): { wb: XLSX.WorkBook; cleanFileName: string; sheetConfigs: SheetPrintConfig[] } {
  const wb = XLSX.utils.book_new();

  const entityName = entityConfig.entityName || 'NON-CORPORATE ENTITY';
  const entityType = entityConfig.entityType || 'Partnership Firm';
  const currentPeriod = entityConfig.reportingPeriod || 'March 31, 2025';
  const previousPeriod = entityConfig.previousReportingPeriod || 'March 31, 2024';
  const fyCY = entityConfig.financialYear || '2024-25';
  const fyPY = entityConfig.previousFinancialYear || '2023-24';

  // ==========================================
  // SHEET 1: EXECUTIVE SUMMARY & AUDIT DASHBOARD
  // ==========================================
  const summaryRows: any[][] = [];
  const summaryRowHeights: Array<{ hpt?: number; hidden?: boolean }> = [];
  appendExecutiveHeaderBanner(
    summaryRows,
    entityName,
    'EXECUTIVE SUMMARY & STATUTORY AUDIT COMPLIANCE REPORT',
    currentPeriod,
    previousPeriod,
    4,
    summaryRowHeights
  );

  // Section 1: Entity & Auditor Profile Card
  summaryRows.push([
    thCell('1. ENTITY IDENTIFICATION & CONFIGURATION', 'left', PALETTE.navyMedium),
    thCell('', 'left', PALETTE.navyMedium),
    thCell('2. STATUTORY AUDITOR & ENGAGEMENT DETAILS', 'left', PALETTE.navyMedium),
    thCell('', 'left', PALETTE.navyMedium),
  ]);
  summaryRowHeights.push({ hpt: 26 });

  const profileData = [
    [
      'Legal Entity Name:',
      entityName,
      'Auditor / CA Firm Name:',
      entityConfig.auditorName || 'Chartered Accountant',
    ],
    [
      'Constitution / Form of Business:',
      entityType,
      'ICAI Membership Number:',
      entityConfig.auditorMembershipNo || 'N/A',
    ],
    [
      'Current Financial Year:',
      `FY ${fyCY} (As on ${currentPeriod})`,
      'Firm Registration Number (FRN):',
      entityConfig.firmRegistrationNo || 'N/A',
    ],
    [
      'Previous Financial Year:',
      `FY ${fyPY} (As on ${previousPeriod})`,
      'Document Identification (UDIN):',
      entityConfig.udin || 'Generated at Sign-off',
    ],
    [
      'Reporting Currency Unit:',
      entityConfig.currencyUnit || 'INR (₹)',
      'Statutory Audit Standards:',
      'ICAI Guidance Note for NCEs',
    ],
    [
      'Profit Allocation Policy:',
      entityConfig.transferProfitTo === 'reserves'
        ? 'Reserves & Surplus (Note 4)'
        : "Partners' Capital Account (Note 3)",
      'Engagement Status:',
      exceptions.length === 0 ? 'CLEAN AUDIT REPORT' : `${exceptions.length} AUDIT FLAGS UNDER REVIEW`,
    ],
    [
      'Income Tax Rate Applied:',
      `${entityConfig.taxRatePercent || 0}%`,
      'Audit Report Date:',
      new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }),
    ],
  ];

  profileData.forEach((r, idx) => {
    const bg = idx % 2 === 1 ? PALETTE.zebraOdd : PALETTE.white;
    summaryRows.push([
      textCell(r[0], { bold: true, sz: 9.5, color: '475569', bg }),
      textCell(r[1], { bold: true, sz: 10, color: '0F172A', bg }),
      textCell(r[2], { bold: true, sz: 9.5, color: '475569', bg }),
      textCell(r[3], {
        bold: true,
        sz: 10,
        color: r[3].includes('CLEAN') ? PALETTE.successText : '0F172A',
        bg: r[3].includes('CLEAN') ? PALETTE.successBg : bg,
      }),
    ]);
    summaryRowHeights.push({ hpt: 21 });
  });

  summaryRows.push(new Array(4).fill(textCell('', { border: {} })));
  summaryRowHeights.push({ hpt: 10 });

  // Section 2: Statutory Audit Tally Status Banner
  const isBalanced = balanceSheet.isBalanced;
  const tallyStatusText = isBalanced
    ? '✓ STATUTORY TALLY VALIDATED: Balance Sheet is fully in balance (Assets = Liabilities; Difference: ₹ 0.00)'
    : `⚠ STATUTORY MISMATCH DETECTED: Balance Sheet Difference = ₹ ${balanceSheet.difference.toLocaleString('en-IN')}`;

  const tallyBannerRow: any[] = [];
  for (let c = 0; c < 4; c++) {
    tallyBannerRow.push(
      textCell(c === 0 ? tallyStatusText : '', {
        bold: true,
        sz: 11,
        color: isBalanced ? PALETTE.successText : PALETTE.dangerText,
        bg: isBalanced ? PALETTE.successBg : PALETTE.dangerBg,
        align: 'center',
        border: {
          top: { style: 'medium', color: { rgb: isBalanced ? PALETTE.successText : PALETTE.dangerText } },
          bottom: { style: 'medium', color: { rgb: isBalanced ? PALETTE.successText : PALETTE.dangerText } },
        },
      })
    );
  }
  const summaryTallyIdx = summaryRows.length;
  summaryRows.push(tallyBannerRow);
  summaryRowHeights.push({ hpt: 26 });

  summaryRows.push(new Array(4).fill(textCell('', { border: {} })));
  summaryRowHeights.push({ hpt: 10 });

  // Section 3: Key Financial Indicators Snapshot
  summaryRows.push([
    thCell('3. FINANCIAL HIGHLIGHTS & KEY RATIOS', 'left', PALETTE.navyPrimary),
    thCell(`Current Period (${fyCY}) (₹)`, 'right', PALETTE.navyPrimary),
    thCell(`Previous Period (${fyPY}) (₹)`, 'right', PALETTE.navyPrimary),
    thCell('Variance / YoY Change', 'right', PALETTE.navyPrimary),
  ]);
  summaryRowHeights.push({ hpt: 28 });

  const kpis: Array<[string, number | undefined, number | undefined, boolean]> = [
    ['Revenue from Operations (Gross)', profitAndLoss.revenueFromOperations, profitAndLoss.previousYear?.revenueFromOperations, false],
    ['Other Income', profitAndLoss.otherIncome, profitAndLoss.previousYear?.otherIncome, false],
    ['Total Income (I + II)', profitAndLoss.totalRevenue, profitAndLoss.previousYear?.totalRevenue, true],
    ['Cost of Goods Sold (COGS)', profitAndLoss.costOfGoodsSold, profitAndLoss.previousYear?.costOfGoodsSold, false],
    ['Gross Profit', (profitAndLoss.totalRevenue || 0) - (profitAndLoss.costOfGoodsSold || 0), (profitAndLoss.previousYear?.totalRevenue || 0) - (profitAndLoss.previousYear?.costOfGoodsSold || 0), true],
    ['Employee Benefits Expense', profitAndLoss.employeeBenefitsExpense, profitAndLoss.previousYear?.employeeBenefitsExpense, false],
    ['Finance Costs / Interest', profitAndLoss.financeCosts, profitAndLoss.previousYear?.financeCosts, false],
    ['Depreciation & Amortization', profitAndLoss.depreciationExpense, profitAndLoss.previousYear?.depreciationExpense, false],
    ['Other Expenses', profitAndLoss.otherExpenses, profitAndLoss.previousYear?.otherExpenses, false],
    ['Total Expenses (IV)', profitAndLoss.totalExpenses, profitAndLoss.previousYear?.totalExpenses, true],
    ['Profit Before Tax (PBT)', profitAndLoss.profitBeforeTax, profitAndLoss.previousYear?.profitBeforeTax, true],
    ['Total Tax Expense (Current + Deferred)', profitAndLoss.totalTaxExpense, profitAndLoss.previousYear?.currentTax, false],
    ['Net Profit / Surplus After Tax (PAT)', profitAndLoss.profitAfterTax, profitAndLoss.previousYear?.profitAfterTax, true],
    ['Total Owners Funds (Capital + Reserves)', balanceSheet.totalOwnersFunds, balanceSheet.previousYear?.totalOwnersFunds, true],
    ['Total Non-Current Assets', balanceSheet.totalNonCurrentAssets, balanceSheet.previousYear?.totalNonCurrentAssets, false],
    ['Total Current Assets', balanceSheet.totalCurrentAssets, balanceSheet.previousYear?.totalCurrentAssets, false],
    ['Total Current Liabilities', balanceSheet.totalCurrentLiabilities, balanceSheet.previousYear?.totalCurrentLiabilities, false],
    ['Net Working Capital (CA - CL)', (balanceSheet.totalCurrentAssets || 0) - (balanceSheet.totalCurrentLiabilities || 0), (balanceSheet.previousYear?.totalCurrentAssets || 0) - (balanceSheet.previousYear?.totalCurrentLiabilities || 0), true],
    ['TOTAL BALANCE SHEET SIZE (ASSETS / LIABILITIES)', balanceSheet.totalAssets, balanceSheet.previousYear?.totalAssets, true],
  ];

  kpis.forEach(([label, valCY, valPY, isKey]) => {
    const bg = isKey ? PALETTE.grandTotalBg : undefined;
    const diff = (valCY || 0) - (valPY || 0);
    summaryRows.push([
      textCell(label, { bold: isKey, sz: isKey ? 10.5 : 10, bg, color: isKey ? '0F172A' : '334155' }),
      numCell(valCY, { isGrandTotal: isKey, isSubtotal: !isKey && !!bg }),
      numCell(valPY, { isGrandTotal: isKey, isSubtotal: !isKey && !!bg }),
      isKey ? numCell(diff, { isGrandTotal: true }) : pctCell(valCY, valPY),
    ]);
    summaryRowHeights.push({ hpt: isKey ? 24 : 20 });
  });

  // Section 4: Workbook Navigation Index
  summaryRows.push(new Array(4).fill(textCell('', { border: {} })));
  summaryRowHeights.push({ hpt: 10 });
  summaryRows.push([
    thCell('4. REPORT NAVIGATION & WORKBOOK INDEX', 'left', PALETTE.navyMedium),
    thCell('Target Sheet Tab', 'center', PALETTE.navyMedium),
    thCell('ICAI Statutory Standard', 'left', PALETTE.navyMedium),
    thCell('Audit Scope / Content Description', 'left', PALETTE.navyMedium),
  ]);
  summaryRowHeights.push({ hpt: 26 });

  const navItems = [
    ['Executive Summary', 'Sheet 1: Executive Summary', 'ICAI General Disclosure', 'High-level executive dashboard, key ratios, and tally validation status.'],
    ['Balance Sheet', 'Sheet 2: Balance Sheet', 'ICAI NCE Schedule III', 'Statutory comparative Balance Sheet with Notes 3 to 18 disclosures.'],
    ['Profit & Loss Statement', 'Sheet 3: Profit and Loss', 'ICAI NCE Parts I - XVII', 'Operational performance, Gross profit, PBT, Tax provisioning, and PAT.'],
    ['Notes to Accounts', 'Sheet 4: Notes 1 to 25', 'ICAI Notes 1 - 25', 'Complete granular schedules, policy notes, and individual ledger balances.'],
    ['Trial Balance Master', 'Sheet 5: Trial Balance Master', 'SA 500 / SA 505 Audit Trail', 'Complete audited ledger master, Debit/Credit tallies, and note mappings.'],
    ['Audit Exceptions', 'Sheet 6: Audit Exceptions', 'CA Quality Control / Peer Review', 'Statutory validation exception register, severity ratings, and CA guidance.'],
  ];

  navItems.forEach((n, idx) => {
    const bg = idx % 2 === 1 ? PALETTE.zebraOdd : PALETTE.white;
    summaryRows.push([
      textCell(n[0], { bold: true, sz: 10, bg }),
      textCell(n[1], { bold: true, sz: 10, color: PALETTE.navyAccent, bg, align: 'center' }),
      textCell(n[2], { italic: true, sz: 9.5, bg }),
      textCell(n[3], { sz: 9.5, color: '475569', bg }),
    ]);
    summaryRowHeights.push({ hpt: 21 });
  });

  appendSignOffBlock(summaryRows, entityConfig, currentPeriod, 4, summaryRowHeights);

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 32 }, { wch: 16 }, { wch: 28 }, { wch: 16 }];
  wsSummary['!rows'] = summaryRowHeights;
  wsSummary['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, // Title
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }, // Subtitle
    { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } }, // ICAI note
    { s: { r: 5, c: 0 }, e: { r: 5, c: 1 } }, // Section 1 header
    { s: { r: 5, c: 2 }, e: { r: 5, c: 3 } }, // Section 2 header
    { s: { r: summaryTallyIdx, c: 0 }, e: { r: summaryTallyIdx, c: 3 } }, // Tally banner
  ];
  applyPrintSetup(wsSummary, {
    orientation: 'portrait',
    entityName,
    reportTitle: 'EXECUTIVE SUMMARY',
    financialYear: fyCY,
    headerRowsToFreeze: 5,
    tabColor: '1E3A8A',
  });
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive Summary');

  // ==========================================
  // SHEET 2: BALANCE SHEET (ICAI NON-CORPORATE ENTITY)
  // ==========================================
  const bsRows: any[][] = [];
  const bsRowHeights: Array<{ hpt?: number; hidden?: boolean }> = [];
  const bsColCount = 4;
  const bsMerges: any[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: bsColCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: bsColCount - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: bsColCount - 1 } },
  ];

  appendExecutiveHeaderBanner(
    bsRows,
    entityName,
    `BALANCE SHEET AS AT ${currentPeriod.toUpperCase()}`,
    currentPeriod,
    previousPeriod,
    bsColCount,
    bsRowHeights
  );

  // Column Headers - Pure Statutory 4-Column Presentation with balanced print widths
  bsRows.push([
    thCell('Particulars', 'left'),
    thCell('Note No.', 'center'),
    thCell(`Current Period\n(${currentPeriod}) (₹)`, 'right'),
    thCell(`Previous Period\n(${previousPeriod}) (₹)`, 'right'),
  ]);
  bsRowHeights.push({ hpt: 34 });

  // Section Helper with explicit row heights and cross-column merges
  const addBsLine = (
    label: string,
    noteNo: string | number,
    valCY: number | undefined | null,
    valPY: number | undefined | null,
    options?: { isSection?: boolean; isSubSection?: boolean; isSubTotal?: boolean; isGrandTotal?: boolean }
  ) => {
    const rowIdx = bsRows.length;
    if (options?.isSection) {
      const row: any[] = [];
      for (let c = 0; c < bsColCount; c++) {
        row.push(
          textCell(c === 0 ? label : '', {
            bold: true,
            sz: 11,
            color: PALETTE.sectionText,
            bg: PALETTE.sectionBg,
            border: {
              top: { style: 'thin', color: { rgb: PALETTE.borderMedium } },
              bottom: { style: 'thin', color: { rgb: PALETTE.borderMedium } },
              left: { style: 'thin', color: { rgb: PALETTE.sectionBg } },
              right: { style: 'thin', color: { rgb: PALETTE.sectionBg } },
            },
          })
        );
      }
      bsRows.push(row);
      bsRowHeights.push({ hpt: 26 });
      bsMerges.push({ s: { r: rowIdx, c: 0 }, e: { r: rowIdx, c: bsColCount - 1 } });
      return;
    }

    if (options?.isSubSection) {
      const row: any[] = [];
      for (let c = 0; c < bsColCount; c++) {
        row.push(
          textCell(c === 0 ? label : '', {
            bold: true,
            sz: 10.5,
            color: PALETTE.subSectionText,
            bg: PALETTE.subSectionBg,
            border: {
              top: { style: 'thin', color: { rgb: PALETTE.subSectionBg } },
              bottom: { style: 'thin', color: { rgb: PALETTE.borderLight } },
              left: { style: 'thin', color: { rgb: PALETTE.subSectionBg } },
              right: { style: 'thin', color: { rgb: PALETTE.subSectionBg } },
            },
          })
        );
      }
      bsRows.push(row);
      bsRowHeights.push({ hpt: 22 });
      bsMerges.push({ s: { r: rowIdx, c: 0 }, e: { r: rowIdx, c: bsColCount - 1 } });
      return;
    }

    const isGrand = !!options?.isGrandTotal;
    const isSub = !!options?.isSubTotal;
    const bg = isGrand ? PALETTE.grandTotalBg : isSub ? PALETTE.subTotalBg : undefined;

    bsRows.push([
      textCell(label, {
        bold: isGrand || isSub,
        sz: isGrand ? 11 : isSub ? 10 : 9.5,
        color: isGrand ? PALETTE.grandTotalText : '1E293B',
        bg,
      }),
      textCell(noteNo ? `${noteNo}` : '', {
        align: 'center',
        bold: !!noteNo,
        sz: 9.5,
        color: '475569',
        bg,
      }),
      numCell(valCY, { isGrandTotal: isGrand, isSubtotal: isSub }),
      numCell(valPY, { isGrandTotal: isGrand, isSubtotal: isSub }),
    ]);
    bsRowHeights.push({ hpt: isGrand ? 26 : isSub ? 22 : 20 });
  };

  // Section I: Equity & Liabilities
  addBsLine('I. EQUITY AND LIABILITIES', '', null, null, { isSection: true });

  addBsLine("(1) Owners' Funds", '', null, null, { isSubSection: true });
  addBsLine("  (a) Owners' Capital Account", 3, balanceSheet.ownersCapital, balanceSheet.previousYear?.ownersCapital);
  addBsLine('  (b) Reserves and Surplus', 4, balanceSheet.reservesAndSurplus, balanceSheet.previousYear?.reservesAndSurplus);
  addBsLine("Sub-total: Owners' Funds", '', balanceSheet.totalOwnersFunds, balanceSheet.previousYear?.totalOwnersFunds, { isSubTotal: true });

  addBsLine('(2) Non-current Liabilities', '', null, null, { isSubSection: true });
  addBsLine('  (a) Long-term borrowings', 5, balanceSheet.longTermBorrowings, balanceSheet.previousYear?.longTermBorrowings);
  addBsLine('  (b) Deferred tax liabilities (Net)', 6, balanceSheet.deferredTaxLiabilities, balanceSheet.previousYear?.deferredTaxLiabilities);
  addBsLine('  (c) Other long-term liabilities', 7, balanceSheet.otherLongTermLiabilities, balanceSheet.previousYear?.otherLongTermLiabilities);
  addBsLine('  (d) Long-term provisions', 8, balanceSheet.longTermProvisions, balanceSheet.previousYear?.longTermProvisions);
  addBsLine('Sub-total: Non-current Liabilities', '', balanceSheet.totalNonCurrentLiabilities, balanceSheet.previousYear?.totalNonCurrentLiabilities, { isSubTotal: true });

  addBsLine('(3) Current Liabilities', '', null, null, { isSubSection: true });
  addBsLine('  (a) Short-term borrowings', 5, balanceSheet.shortTermBorrowings, balanceSheet.previousYear?.shortTermBorrowings);
  addBsLine('  (b) Trade payables', 9, balanceSheet.tradePayables, balanceSheet.previousYear?.tradePayables);
  addBsLine('      (i) Total outstanding dues of MSME enterprises', 9, (balanceSheet as any).tradePayablesMsme || 0, (balanceSheet.previousYear as any)?.tradePayablesMsme || 0);
  addBsLine('      (ii) Total outstanding dues of creditors other than MSME', 9, (balanceSheet as any).tradePayablesOther || balanceSheet.tradePayables, (balanceSheet.previousYear as any)?.tradePayablesOther || balanceSheet.previousYear?.tradePayables);
  addBsLine('  (c) Other current liabilities', 10, balanceSheet.otherCurrentLiabilities, balanceSheet.previousYear?.otherCurrentLiabilities);
  addBsLine('  (d) Short-term provisions', 8, balanceSheet.shortTermProvisions, balanceSheet.previousYear?.shortTermProvisions);
  addBsLine('Sub-total: Current Liabilities', '', balanceSheet.totalCurrentLiabilities, balanceSheet.previousYear?.totalCurrentLiabilities, { isSubTotal: true });

  addBsLine('TOTAL EQUITY AND LIABILITIES', '', balanceSheet.totalEquityAndLiabilities, balanceSheet.previousYear?.totalEquityAndLiabilities, { isGrandTotal: true });

  bsRows.push(new Array(bsColCount).fill(textCell('', { border: {} })));
  bsRowHeights.push({ hpt: 12 });

  // Section II: Assets
  addBsLine('II. ASSETS', '', null, null, { isSection: true });

  addBsLine('(1) Non-current Assets', '', null, null, { isSubSection: true });
  addBsLine('  (a) Property, Plant and Equipment and Intangible assets', '', null, null);
  addBsLine('      (i) Property, Plant and Equipment', 11, balanceSheet.propertyPlantEquipment, balanceSheet.previousYear?.propertyPlantEquipment);
  addBsLine('      (ii) Intangible assets', 11, balanceSheet.intangibleAssets, balanceSheet.previousYear?.intangibleAssets);
  addBsLine('      (iii) Capital work-in-progress (CWIP)', 11, balanceSheet.capitalWorkInProgress, balanceSheet.previousYear?.capitalWorkInProgress);
  addBsLine('      (iv) Intangible assets under development', 11, balanceSheet.intangibleAssetUnderDevelopment, 0);
  addBsLine('  (b) Non-current investments', 12, balanceSheet.nonCurrentInvestments, balanceSheet.previousYear?.nonCurrentInvestments);
  addBsLine('  (c) Deferred tax assets (Net)', 6, balanceSheet.deferredTaxAssets, balanceSheet.previousYear?.deferredTaxAssets);
  addBsLine('  (d) Long-term loans and advances', 13, balanceSheet.longTermLoansAndAdvances, balanceSheet.previousYear?.longTermLoansAndAdvances);
  addBsLine('  (e) Other non-current assets', 14, balanceSheet.otherNonCurrentAssets, balanceSheet.previousYear?.otherNonCurrentAssets);
  addBsLine('Sub-total: Non-current Assets', '', balanceSheet.totalNonCurrentAssets, balanceSheet.previousYear?.totalNonCurrentAssets, { isSubTotal: true });

  addBsLine('(2) Current Assets', '', null, null, { isSubSection: true });
  addBsLine('  (a) Current investments', 12, balanceSheet.currentInvestments, balanceSheet.previousYear?.currentInvestments);
  addBsLine('  (b) Inventories', 15, balanceSheet.inventories, balanceSheet.previousYear?.inventories);
  addBsLine('  (c) Trade receivables', 16, balanceSheet.tradeReceivables, balanceSheet.previousYear?.tradeReceivables);
  addBsLine('  (d) Cash and bank balances', 17, balanceSheet.cashAndBankBalances, balanceSheet.previousYear?.cashAndBankBalances);
  addBsLine('  (e) Short-term loans and advances', 13, balanceSheet.shortTermLoansAndAdvances, balanceSheet.previousYear?.shortTermLoansAndAdvances);
  addBsLine('  (f) Other current assets', 18, balanceSheet.otherCurrentAssets, balanceSheet.previousYear?.otherCurrentAssets);
  addBsLine('Sub-total: Current Assets', '', balanceSheet.totalCurrentAssets, balanceSheet.previousYear?.totalCurrentAssets, { isSubTotal: true });

  addBsLine('TOTAL ASSETS', '', balanceSheet.totalAssets, balanceSheet.previousYear?.totalAssets, { isGrandTotal: true });

  // Tally Banner Row
  bsRows.push(new Array(bsColCount).fill(textCell('', { border: {} })));
  bsRowHeights.push({ hpt: 12 });
  const bsTallyRow: any[] = [];
  const bsStatusMsg = balanceSheet.isBalanced
    ? '✓ STATUTORY TALLY CONFIRMED: Total Assets equal Total Equity and Liabilities (Variance: ₹ 0.00)'
    : `⚠ ATTENTION AUDITOR: Balance Sheet Difference of ₹ ${balanceSheet.difference.toLocaleString('en-IN')}`;

  for (let c = 0; c < bsColCount; c++) {
    bsTallyRow.push(
      textCell(c === 0 ? bsStatusMsg : '', {
        bold: true,
        sz: 10.5,
        color: balanceSheet.isBalanced ? PALETTE.successText : PALETTE.dangerText,
        bg: balanceSheet.isBalanced ? PALETTE.successBg : PALETTE.dangerBg,
        align: 'center',
        border: {
          top: { style: 'medium', color: { rgb: balanceSheet.isBalanced ? PALETTE.successText : PALETTE.dangerText } },
          bottom: { style: 'medium', color: { rgb: balanceSheet.isBalanced ? PALETTE.successText : PALETTE.dangerText } },
        },
      })
    );
  }
  const bsTallyRowIdx = bsRows.length;
  bsRows.push(bsTallyRow);
  bsRowHeights.push({ hpt: 26 });
  bsMerges.push({ s: { r: bsTallyRowIdx, c: 0 }, e: { r: bsTallyRowIdx, c: bsColCount - 1 } });

  appendSignOffBlock(bsRows, entityConfig, currentPeriod, bsColCount, bsRowHeights);

  const wsBS = XLSX.utils.aoa_to_sheet(bsRows);
  wsBS['!cols'] = [{ wch: 44 }, { wch: 10 }, { wch: 18 }, { wch: 18 }];
  wsBS['!rows'] = bsRowHeights;
  wsBS['!merges'] = bsMerges;
  applyPrintSetup(wsBS, {
    orientation: 'portrait',
    entityName,
    reportTitle: 'BALANCE SHEET',
    financialYear: fyCY,
    headerRowsToFreeze: 6,
    tabColor: '047857',
  });
  XLSX.utils.book_append_sheet(wb, wsBS, 'Balance Sheet');

  // ==========================================
  // SHEET 3: STATEMENT OF PROFIT AND LOSS
  // ==========================================
  const plRows: any[][] = [];
  const plRowHeights: Array<{ hpt?: number; hidden?: boolean }> = [];
  const plColCount = 4;
  const plMerges: any[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: plColCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: plColCount - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: plColCount - 1 } },
  ];

  appendExecutiveHeaderBanner(
    plRows,
    entityName,
    `STATEMENT OF PROFIT AND LOSS FOR THE PERIOD ENDED ${currentPeriod.toUpperCase()}`,
    currentPeriod,
    previousPeriod,
    plColCount,
    plRowHeights
  );

  plRows.push([
    thCell('Particulars', 'left'),
    thCell('Note No.', 'center'),
    thCell(`Current Period\n(${currentPeriod}) (₹)`, 'right'),
    thCell(`Previous Period\n(${previousPeriod}) (₹)`, 'right'),
  ]);
  plRowHeights.push({ hpt: 34 });

  const addPlLine = (
    label: string,
    noteNo: string | number,
    valCY: number | undefined | null,
    valPY: number | undefined | null,
    options?: { isSection?: boolean; isSubTotal?: boolean; isGrandTotal?: boolean }
  ) => {
    const rowIdx = plRows.length;
    if (options?.isSection) {
      const row: any[] = [];
      for (let c = 0; c < plColCount; c++) {
        row.push(
          textCell(c === 0 ? label : '', {
            bold: true,
            sz: 11,
            color: PALETTE.sectionText,
            bg: PALETTE.sectionBg,
            border: {
              top: { style: 'thin', color: { rgb: PALETTE.borderMedium } },
              bottom: { style: 'thin', color: { rgb: PALETTE.borderMedium } },
              left: { style: 'thin', color: { rgb: PALETTE.sectionBg } },
              right: { style: 'thin', color: { rgb: PALETTE.sectionBg } },
            },
          })
        );
      }
      plRows.push(row);
      plRowHeights.push({ hpt: 26 });
      plMerges.push({ s: { r: rowIdx, c: 0 }, e: { r: rowIdx, c: plColCount - 1 } });
      return;
    }

    const isGrand = !!options?.isGrandTotal;
    const isSub = !!options?.isSubTotal;
    const bg = isGrand ? PALETTE.grandTotalBg : isSub ? PALETTE.subTotalBg : undefined;

    plRows.push([
      textCell(label, {
        bold: isGrand || isSub,
        sz: isGrand ? 11 : isSub ? 10 : 9.5,
        color: isGrand ? PALETTE.grandTotalText : '1E293B',
        bg,
      }),
      textCell(noteNo ? `${noteNo}` : '', {
        align: 'center',
        bold: !!noteNo,
        sz: 9.5,
        color: '475569',
        bg,
      }),
      numCell(valCY, { isGrandTotal: isGrand, isSubtotal: isSub }),
      numCell(valPY, { isGrandTotal: isGrand, isSubtotal: isSub }),
    ]);
    plRowHeights.push({ hpt: isGrand ? 26 : isSub ? 22 : 20 });
  };

  // P&L Parts I to XVII (Strict ICAI Format)
  addPlLine('I. Revenue from Operations', 19, profitAndLoss.revenueFromOperations, profitAndLoss.previousYear?.revenueFromOperations);
  addPlLine('II. Other Income', 20, profitAndLoss.otherIncome, profitAndLoss.previousYear?.otherIncome);
  addPlLine('III. TOTAL REVENUE (I + II)', '', profitAndLoss.totalRevenue, profitAndLoss.previousYear?.totalRevenue, { isSubTotal: true });

  plRows.push(new Array(plColCount).fill(textCell('', { border: {} })));
  plRowHeights.push({ hpt: 10 });
  addPlLine('IV. EXPENSES:', '', null, null, { isSection: true });

  addPlLine('  Cost of Goods Sold (COGS)', 21, profitAndLoss.costOfGoodsSold, profitAndLoss.previousYear?.costOfGoodsSold);
  addPlLine('    (a) Cost of materials consumed', 21, profitAndLoss.costOfRawMaterialsConsumed, profitAndLoss.previousYear?.costOfRawMaterialsConsumed);
  addPlLine('    (b) Purchases of Stock-in-Trade', 21, profitAndLoss.purchasesOfStockInTrade, profitAndLoss.previousYear?.purchasesOfStockInTrade);
  addPlLine('    (c) Changes in inventories of Finished Goods, WIP & Stock', 21, profitAndLoss.changesInInventories, profitAndLoss.previousYear?.changesInInventories);
  addPlLine('  Employee benefits expense', 22, profitAndLoss.employeeBenefitsExpense, profitAndLoss.previousYear?.employeeBenefitsExpense);
  addPlLine('  Finance costs / Interest expense', 23, profitAndLoss.financeCosts, profitAndLoss.previousYear?.financeCosts);
  addPlLine('  Depreciation and amortization expense', 24, profitAndLoss.depreciationExpense, profitAndLoss.previousYear?.depreciationExpense);
  addPlLine('  Other expenses', 25, profitAndLoss.otherExpenses, profitAndLoss.previousYear?.otherExpenses);
  addPlLine('TOTAL EXPENSES (IV)', '', profitAndLoss.totalExpenses, profitAndLoss.previousYear?.totalExpenses, { isSubTotal: true });

  plRows.push(new Array(plColCount).fill(textCell('', { border: {} })));
  plRowHeights.push({ hpt: 10 });

  addPlLine(
    "V. Profit / (loss) before exceptional items, partners' remuneration and tax (III - IV)",
    '',
    profitAndLoss.profitBeforeExceptionalAndTax,
    profitAndLoss.previousYear?.profitBeforeExceptionalAndTax,
    { isSubTotal: true }
  );
  addPlLine('VI. Exceptional items', '', profitAndLoss.exceptionalItems, 0);
  addPlLine(
    "VII. Profit / (loss) before extraordinary items, partners' remuneration and tax (V - VI)",
    '',
    profitAndLoss.profitBeforeExtraordinaryAndTax,
    profitAndLoss.previousYear?.profitBeforeExtraordinaryAndTax
  );
  addPlLine('VIII. Extraordinary items', '', profitAndLoss.extraordinaryItems, 0);
  addPlLine(
    "IX. Profit before partners' remuneration and tax (VII - VIII)",
    '',
    profitAndLoss.profitBeforePartnersRemunerationAndTax,
    profitAndLoss.previousYear?.profitBeforePartnersRemunerationAndTax,
    { isSubTotal: true }
  );
  addPlLine("X. Partners' remuneration*", '', profitAndLoss.partnersRemuneration, profitAndLoss.previousYear?.partnersRemuneration);
  addPlLine('XI. Profit Before Tax (PBT) (IX - X)', '', profitAndLoss.profitBeforeTax, profitAndLoss.previousYear?.profitBeforeTax, { isSubTotal: true });

  addPlLine('XII. Tax Expense:', '', null, null, { isSection: true });
  addPlLine('  (1) Current tax provision', '', profitAndLoss.currentTax, profitAndLoss.previousYear?.currentTax);
  addPlLine('  (2) Excess / Short provision of tax of earlier years', '', profitAndLoss.excessShortTaxEarlierYears, 0);
  addPlLine('  (3) Deferred tax charge / (benefit)', 6, profitAndLoss.deferredTaxCharge, 0);

  addPlLine(
    'XIII. Profit / (Loss) for the period from continuing operations (XI - XII)',
    '',
    profitAndLoss.profitFromContinuingOps,
    profitAndLoss.previousYear?.profitAfterTax
  );
  addPlLine('XIV. Profit / (loss) from discontinuing operations', '', profitAndLoss.profitFromDiscontinuingOps, 0);
  addPlLine('XV. Tax expense of discontinuing operations', '', profitAndLoss.taxExpenseDiscontinuingOps, 0);
  addPlLine('XVI. Profit / (Loss) from discontinuing operations (after tax) (XIV - XV)', '', profitAndLoss.profitFromDiscontinuingOpsAfterTax, 0);

  addPlLine(
    'XVII. PROFIT / (LOSS) FOR THE YEAR (PAT) (XIII + XVI)',
    '',
    profitAndLoss.profitAfterTax,
    profitAndLoss.previousYear?.profitAfterTax,
    { isGrandTotal: true }
  );

  appendSignOffBlock(plRows, entityConfig, currentPeriod, plColCount, plRowHeights);

  const wsPL = XLSX.utils.aoa_to_sheet(plRows);
  wsPL['!cols'] = [{ wch: 44 }, { wch: 10 }, { wch: 18 }, { wch: 18 }];
  wsPL['!rows'] = plRowHeights;
  wsPL['!merges'] = plMerges;
  applyPrintSetup(wsPL, {
    orientation: 'portrait',
    entityName,
    reportTitle: 'PROFIT & LOSS',
    financialYear: fyCY,
    headerRowsToFreeze: 6,
    tabColor: '4338CA',
  });
  XLSX.utils.book_append_sheet(wb, wsPL, 'Profit and Loss');

  // ==========================================
  // SHEET 4: NOTES TO ACCOUNTS (NOTES 1 TO 25)
  // ==========================================
  const notesRows: any[][] = [];
  const notesColCount = 6;
  const notesRowHeights: Array<{ hpt?: number; hidden?: boolean }> = [];

  const addNotesRow = (row: any[], hpt?: number) => {
    const rowIdx = notesRows.length;
    notesRows.push(row);
    if (hpt !== undefined) {
      notesRowHeights[rowIdx] = { hpt };
    }
    return rowIdx;
  };

  appendExecutiveHeaderBanner(
    notesRows,
    entityName,
    'NOTES FORMING PART OF THE FINANCIAL STATEMENTS (NOTES 1 TO 25)',
    currentPeriod,
    previousPeriod,
    notesColCount
  );

  // Explicit row heights for executive header banner rows (rows 0 to 4)
  notesRowHeights[0] = { hpt: 30 };
  notesRowHeights[1] = { hpt: 24 };
  notesRowHeights[2] = { hpt: 18 };
  notesRowHeights[3] = { hpt: 20 };
  notesRowHeights[4] = { hpt: 12 };

  addNotesRow([
    thCell('Note No.', 'center', PALETTE.navyMedium),
    thCell('Account Code', 'center', PALETTE.navyMedium),
    thCell('Statutory Schedule Head / Ledger Account Name', 'left', PALETTE.navyMedium),
    thCell('ICAI Sub-Category / AS Standard', 'left', PALETTE.navyMedium),
    thCell(`Current Period (${currentPeriod}) (₹)`, 'right', PALETTE.navyMedium),
    thCell(`Previous Period (${previousPeriod}) (₹)`, 'right', PALETTE.navyMedium),
  ], 26);

  const notesMerges: any[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: notesColCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: notesColCount - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: notesColCount - 1 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: notesColCount - 2 } },
    { s: { r: 3, c: notesColCount - 1 }, e: { r: 3, c: notesColCount - 1 } },
  ];

  for (let i = 1; i <= 25; i++) {
    const sched = noteSchedules[i];
    if (!sched) continue;

    // Note Ribbon Header (Merged across columns so the title never wraps/squashes in Column A)
    const ribbonRowIdx = notesRows.length;
    const ribbonRow: any[] = [];
    for (let c = 0; c < notesColCount; c++) {
      let content = '';
      if (c === 0) content = `NOTE ${i}: ${sched.noteName.toUpperCase()}`;
      if (c === notesColCount - 1) content = `Statement: ${sched.statement}`;
      ribbonRow.push(
        textCell(content, {
          bold: true,
          sz: 11,
          color: PALETTE.white,
          bg: PALETTE.navyPrimary,
          align: c === notesColCount - 1 ? 'right' : 'left',
          border: {
            top: { style: 'medium', color: { rgb: PALETTE.navyPrimary } },
            bottom: { style: 'thin', color: { rgb: PALETTE.borderDark } },
          },
        })
      );
    }
    addNotesRow(ribbonRow, 28);
    // Merge Note Ribbon columns 0..4 for title, and column 5 for Statement
    notesMerges.push({ s: { r: ribbonRowIdx, c: 0 }, e: { r: ribbonRowIdx, c: notesColCount - 2 } });
    notesMerges.push({ s: { r: ribbonRowIdx, c: notesColCount - 1 }, e: { r: ribbonRowIdx, c: notesColCount - 1 } });

    // ========================================================
    // SPECIAL HANDLING FOR NOTE 2: SIGNIFICANT ACCOUNTING POLICIES
    // ========================================================
    if (i === 2) {
      // Intro Banner
      const introRowIdx = notesRows.length;
      const introRow: any[] = [];
      const introText =
        'The significant accounting policies applied in the preparation and presentation of these financial statements are set out below. These policies have been consistently applied to all reporting periods in accordance with applicable Accounting Standards (AS) issued by the Institute of Chartered Accountants of India (ICAI) and the ICAI Guidance Note on Financial Statements of Non-Corporate Entities:';
      for (let c = 0; c < notesColCount; c++) {
        introRow.push(
          textCell(c === 0 ? introText : '', {
            italic: true,
            sz: 9.5,
            color: '334155',
            bg: PALETTE.subSectionBg,
            wrapText: true,
            valign: 'center',
            border: {
              top: { style: 'thin', color: { rgb: PALETTE.borderMedium } },
              bottom: { style: 'thin', color: { rgb: PALETTE.borderMedium } },
              left: { style: 'thin', color: { rgb: PALETTE.borderMedium } },
              right: { style: 'thin', color: { rgb: PALETTE.borderMedium } },
            },
          })
        );
      }
      addNotesRow(introRow, 46);
      notesMerges.push({ s: { r: introRowIdx, c: 0 }, e: { r: introRowIdx, c: notesColCount - 1 } });

      // List of Accounting Policies
      const policies =
        sched.statutoryNotes && sched.statutoryNotes.length > 0
          ? sched.statutoryNotes
          : NCE_NOTE_DEFINITIONS.find((d) => d.noteNumber === 2)?.mandatoryDisclosures || [];

      policies.forEach((policyStr: string, pIdx: number) => {
        const colonIdx = policyStr.indexOf(':');
        const titlePart = colonIdx > -1 ? policyStr.substring(0, colonIdx).trim() : `2.${pIdx + 1} Accounting Policy`;
        const bodyPart = colonIdx > -1 ? policyStr.substring(colonIdx + 1).trim() : policyStr;

        // Extract AS standard tag
        const asMatch = titlePart.match(/\((AS\s*\d+|Sec[^)]+)\)/i);
        const asStandard = asMatch ? asMatch[1] : titlePart.includes('2.1') ? 'AS 1 / Indian GAAP' : 'ICAI Guidance Note';

        // Code and Clean Title
        const codeMatch = titlePart.match(/^2\.\d+/);
        const policyCode = codeMatch ? codeMatch[0] : `2.${pIdx + 1}`;
        const cleanTitle = titlePart.replace(/^2\.\d+\s*/, '').replace(/\s*\([^)]*\)/, '').trim();

        // Policy Title Row:
        // Col 0: "Note 2"
        // Col 1: "2.1", "2.2", ...
        // Col 2..4 (Merged across Columns C, D, E with width 104): cleanTitle so it never wraps
        // Col 5: AS Standard tag aligned right
        const titleRowIdx = notesRows.length;
        const titleRow: any[] = [
          textCell(`Note 2`, { align: 'center', sz: 9, bold: true, color: '475569', bg: PALETTE.zebraOdd }),
          textCell(policyCode, { align: 'center', sz: 9.5, bold: true, color: PALETTE.navyAccent, bg: PALETTE.zebraOdd }),
          textCell(cleanTitle, { bold: true, sz: 10, color: '0F172A', bg: PALETTE.zebraOdd }),
          textCell('', { bg: PALETTE.zebraOdd }),
          textCell('', { bg: PALETTE.zebraOdd }),
          textCell(asStandard, { sz: 9.5, bold: true, color: '1D4ED8', bg: PALETTE.zebraOdd, align: 'right' }),
        ];
        addNotesRow(titleRow, 24);
        notesMerges.push({ s: { r: titleRowIdx, c: 2 }, e: { r: titleRowIdx, c: 4 } });

        // Policy Body Narrative Row:
        // Merged across columns A to F (all 6 columns, width 160 characters)
        // With explicit, dynamically computed height in points so wrapped lines NEVER clip or overlap!
        const bodyRowIdx = notesRows.length;
        const bodyRow: any[] = [];
        for (let c = 0; c < notesColCount; c++) {
          bodyRow.push(
            textCell(c === 0 ? bodyPart : '', {
              sz: 9.5,
              color: '334155',
              wrapText: true,
              valign: 'top',
              bg: PALETTE.white,
              border: {
                bottom: { style: 'thin', color: { rgb: PALETTE.borderLight } },
                left: { style: 'thin', color: { rgb: PALETTE.borderLight } },
                right: { style: 'thin', color: { rgb: PALETTE.borderLight } },
              },
            })
          );
        }
        
        // Calculated height: 160 chars width, ~115 effective wrapped chars per line
        const estimatedLines = Math.max(2, Math.ceil(bodyPart.length / 115));
        const bodyHpt = Math.max(36, estimatedLines * 16 + 14);
        addNotesRow(bodyRow, bodyHpt);
        notesMerges.push({ s: { r: bodyRowIdx, c: 0 }, e: { r: bodyRowIdx, c: notesColCount - 1 } });
      });

      // Note 2 Summary (Qualitative Disclosure - No zero amounts)
      addNotesRow([
        textCell('Note 2', { align: 'center', sz: 9.5, bold: true, bg: PALETTE.grandTotalBg }),
        textCell('AS-Compliant', { align: 'center', sz: 9.5, bold: true, bg: PALETTE.grandTotalBg }),
        textCell('Total: 17 Mandatory Accounting Policies Formally Disclosed & Adopted', {
          bold: true,
          sz: 10,
          bg: PALETTE.grandTotalBg,
          color: PALETTE.grandTotalText,
        }),
        textCell('Qualitative Disclosure', { italic: true, sz: 9.5, bg: PALETTE.grandTotalBg, color: '475569' }),
        textCell('-', { align: 'center', bold: true, bg: PALETTE.grandTotalBg }),
        textCell('-', { align: 'center', bold: true, bg: PALETTE.grandTotalBg }),
      ], 24);

      // Spacer
      addNotesRow(new Array(notesColCount).fill(textCell('', { border: {} })), 12);
      continue;
    }

    // ========================================================
    // SPECIAL HANDLING FOR NOTE 1: BRIEF ABOUT THE ENTITY
    // ========================================================
    if (i === 1) {
      const entityInfoRows = [
        ['Constitution / Legal Status', entityConfig.entityType || 'Partnership Firm'],
        ['Principal Business Activities', entityConfig.natureOfBusiness || 'Commercial Business Operations'],
        ['Permanent Account Number (PAN)', entityConfig.pan || 'N/A'],
        ['Goods & Services Tax (GSTIN)', entityConfig.gstin || 'N/A'],
        ['Registered Principal Place of Business', entityConfig.address || 'India'],
        ['Reporting Currency', 'Indian Rupee (₹) rounded to nearest rupee'],
      ];

      entityInfoRows.forEach(([head, val]) => {
        addNotesRow([
          textCell('Note 1', { align: 'center', sz: 9, color: '64748B' }),
          textCell('-', { align: 'center', sz: 9.5 }),
          textCell(head, { bold: true, sz: 10 }),
          textCell(val, { sz: 9.5, color: '334155' }),
          textCell('-', { align: 'center' }),
          textCell('-', { align: 'center' }),
        ], 22);
      });

      // Note 1 Summary
      addNotesRow([
        textCell('Note 1', { align: 'center', sz: 9.5, bold: true, bg: PALETTE.grandTotalBg }),
        textCell('Profile', { align: 'center', sz: 9.5, bold: true, bg: PALETTE.grandTotalBg }),
        textCell('Entity Corporate Profile & Statutory Disclosures Confirmed', {
          bold: true,
          sz: 10,
          bg: PALETTE.grandTotalBg,
          color: PALETTE.grandTotalText,
        }),
        textCell('Qualitative Disclosure', { italic: true, sz: 9.5, bg: PALETTE.grandTotalBg, color: '475569' }),
        textCell('-', { align: 'center', bold: true, bg: PALETTE.grandTotalBg }),
        textCell('-', { align: 'center', bold: true, bg: PALETTE.grandTotalBg }),
      ], 24);

      // Spacer
      addNotesRow(new Array(notesColCount).fill(textCell('', { border: {} })), 12);
      continue;
    }

    // ========================================================
    // NOTES 3 TO 25: QUANTITATIVE FINANCIAL SCHEDULES
    // ========================================================
    // Statutory Note / Accounting Policy text
    if (sched.statutoryNotes && sched.statutoryNotes.length > 0) {
      sched.statutoryNotes.forEach((disc: string) => {
        const discRowIdx = notesRows.length;
        const discRow: any[] = [];
        for (let c = 0; c < notesColCount; c++) {
          discRow.push(
            textCell(c === 0 ? `[Statutory Disclosure]: ${disc}` : '', {
              italic: true,
              sz: 9.5,
              color: '475569',
              bg: PALETTE.subSectionBg,
              wrapText: true,
              valign: 'top',
            })
          );
        }
        const discLines = Math.max(1, Math.ceil(disc.length / 115));
        addNotesRow(discRow, Math.max(26, discLines * 16 + 12));
        notesMerges.push({ s: { r: discRowIdx, c: 0 }, e: { r: discRowIdx, c: notesColCount - 1 } });
      });
    }

    // Schedule Line Items
    if (sched.items && sched.items.length > 0) {
      sched.items.forEach((it: MappedLedger, itIdx: number) => {
        const balCY = it.displayBalance !== undefined ? it.displayBalance : it.netBalance;
        const balPY = it.previousYearBalance || 0;
        const bg = itIdx % 2 === 1 ? PALETTE.zebraOdd : PALETTE.white;

        addNotesRow([
          textCell(`Note ${i}`, { align: 'center', sz: 9, color: '64748B', bg }),
          textCell(it.accountCode || '-', { align: 'center', sz: 9.5, color: '64748B', bg }),
          textCell(it.accountName, { bold: false, sz: 10, bg }),
          textCell(it.subCategory || 'General', { sz: 9.5, color: '475569', bg }),
          numCell(balCY),
          numCell(balPY),
        ], 20);
      });
    } else {
      addNotesRow([
        textCell(`Note ${i}`, { align: 'center', sz: 9, color: '64748B' }),
        textCell('-', { align: 'center', sz: 9.5 }),
        textCell('Nil / No individual ledgers transacted during the period', { italic: true, color: '94A3B8' }),
        textCell('Unutilized Schedule', { italic: true, color: '94A3B8' }),
        numCell(0),
        numCell(0),
      ], 20);
    }

    // Note Total Row
    addNotesRow([
      textCell('', { bg: PALETTE.grandTotalBg }),
      textCell('', { bg: PALETTE.grandTotalBg }),
      textCell(`Total of Note ${i}: ${sched.noteName}`, { bold: true, sz: 10.5, bg: PALETTE.grandTotalBg, color: PALETTE.grandTotalText }),
      textCell('Schedule Total', { bold: true, sz: 9.5, bg: PALETTE.grandTotalBg, color: '475569' }),
      numCell(sched.totalAmount, { isGrandTotal: true }),
      numCell(sched.previousYearAmount, { isGrandTotal: true }),
    ], 24);

    // Spacer
    addNotesRow(new Array(notesColCount).fill(textCell('', { border: {} })), 12);
  }

  const wsMasterNotes = XLSX.utils.aoa_to_sheet(notesRows);
  wsMasterNotes['!cols'] = [{ wch: 10 }, { wch: 14 }, { wch: 42 }, { wch: 22 }, { wch: 18 }, { wch: 18 }];
  wsMasterNotes['!rows'] = notesRowHeights;
  wsMasterNotes['!merges'] = notesMerges;
  applyPrintSetup(wsMasterNotes, {
    orientation: 'landscape',
    entityName,
    reportTitle: 'NOTES TO ACCOUNTS (1 TO 25)',
    financialYear: fyCY,
    headerRowsToFreeze: 6,
    tabColor: 'D97706',
  });
  XLSX.utils.book_append_sheet(wb, wsMasterNotes, 'Notes 1 to 25');

  // ==========================================
  // SHEET 5: MASTER TRIAL BALANCE & MAPPINGS
  // ==========================================
  const tbRows: any[][] = [];
  const tbRowHeights: Array<{ hpt?: number; hidden?: boolean }> = [];
  const tbColCount = 11;
  appendExecutiveHeaderBanner(
    tbRows,
    entityName,
    'MASTER AUDITED TRIAL BALANCE & ICAI SCHEDULE MAPPING REGISTER',
    currentPeriod,
    previousPeriod,
    tbColCount,
    tbRowHeights
  );

  tbRows.push([
    thCell('Code', 'center', PALETTE.navyPrimary),
    thCell('Ledger Account Name', 'left', PALETTE.navyPrimary),
    thCell('Closing Debit (₹)', 'right', PALETTE.navyPrimary),
    thCell('Closing Credit (₹)', 'right', PALETTE.navyPrimary),
    thCell('Net Balance (₹)', 'right', PALETTE.navyPrimary),
    thCell('Type', 'center', PALETTE.navyPrimary),
    thCell('Assigned Note', 'center', PALETTE.navyPrimary),
    thCell('Statutory Schedule Name', 'left', PALETTE.navyPrimary),
    thCell('Financial Statement', 'left', PALETTE.navyPrimary),
    thCell('Accounting Nature', 'center', PALETTE.navyPrimary),
    thCell('Mapping Confidence', 'center', PALETTE.navyPrimary),
  ]);
  tbRowHeights.push({ hpt: 30 });

  const sourceLedgers = mappedLedgers.length > 0 ? mappedLedgers : (rawRows as any[]);
  let totalDebit = 0;
  let totalCredit = 0;

  sourceLedgers.forEach((l: any, idx: number) => {
    const dr = Number(l.originalDebit || l.closingDebit || 0);
    const cr = Number(l.originalCredit || l.closingCredit || 0);
    totalDebit += dr;
    totalCredit += cr;
    const net = l.netBalance !== undefined ? l.netBalance : dr - cr;
    const bg = idx % 2 === 1 ? PALETTE.zebraOdd : PALETTE.white;

    tbRows.push([
      textCell(l.accountCode || '-', { align: 'center', sz: 9.5, color: '64748B', bg }),
      textCell(l.accountName, { bold: false, sz: 10, bg }),
      numCell(dr, { bg }),
      numCell(cr, { bg }),
      numCell(net, { bg }),
      textCell(net >= 0 ? 'Dr' : 'Cr', {
        align: 'center',
        bold: true,
        sz: 9.5,
        color: net >= 0 ? '1D4ED8' : '047857',
        bg,
      }),
      textCell(l.noteNumber ? `Note ${l.noteNumber}` : 'Unmapped', {
        align: 'center',
        bold: !!l.noteNumber,
        sz: 9.5,
        color: l.noteNumber ? PALETTE.navyPrimary : PALETTE.dangerText,
        bg,
      }),
      textCell(l.noteName || '-', { sz: 9.5, bg }),
      textCell(l.statement || '-', { sz: 9.5, bg }),
      textCell(l.nature || '-', { align: 'center', sz: 9.5, bg }),
      textCell(l.confidence ? `${Math.round(l.confidence * 100)}%` : 'Rule Engine', {
        align: 'center',
        bold: true,
        sz: 9,
        color: PALETTE.navyAccent,
        bg,
      }),
    ]);
    tbRowHeights.push({ hpt: 21 });
  });

  // Trial Balance Grand Total
  const tbDiff = Math.abs(totalDebit - totalCredit);
  const isTbTallied = tbDiff < 0.05;

  tbRows.push([
    textCell('', { bg: PALETTE.grandTotalBg }),
    textCell('TOTAL AUDITED TRIAL BALANCE', { bold: true, sz: 11, bg: PALETTE.grandTotalBg, color: PALETTE.grandTotalText }),
    numCell(totalDebit, { isGrandTotal: true }),
    numCell(totalCredit, { isGrandTotal: true }),
    numCell(totalDebit - totalCredit, { isGrandTotal: true }),
    textCell(isTbTallied ? 'Tallied' : 'Diff', {
      align: 'center',
      bold: true,
      sz: 10,
      color: isTbTallied ? PALETTE.successText : PALETTE.dangerText,
      bg: PALETTE.grandTotalBg,
    }),
    textCell('', { bg: PALETTE.grandTotalBg }),
    textCell(
      isTbTallied
        ? '✓ TRIAL BALANCE TALLIED'
        : `⚠ MISMATCH OF ₹ ${tbDiff.toFixed(2)}`,
      {
        bold: true,
        sz: 10,
        color: isTbTallied ? PALETTE.successText : PALETTE.dangerText,
        bg: PALETTE.grandTotalBg,
      }
    ),
    textCell('', { bg: PALETTE.grandTotalBg }),
    textCell('', { bg: PALETTE.grandTotalBg }),
    textCell('', { bg: PALETTE.grandTotalBg }),
  ]);
  tbRowHeights.push({ hpt: 26 });

  const wsTB = XLSX.utils.aoa_to_sheet(tbRows);
  wsTB['!cols'] = [
    { wch: 10 },
    { wch: 34 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 8 },
    { wch: 12 },
    { wch: 26 },
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
  ];
  wsTB['!rows'] = tbRowHeights;
  wsTB['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: tbColCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: tbColCount - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: tbColCount - 1 } },
  ];
  applyPrintSetup(wsTB, {
    orientation: 'landscape',
    entityName,
    reportTitle: 'TRIAL BALANCE MASTER',
    financialYear: fyCY,
    headerRowsToFreeze: 6,
    tabColor: '0284C7',
  });
  XLSX.utils.book_append_sheet(wb, wsTB, 'Trial Balance Master');

  // ==========================================
  // SHEET 6: CA AUDIT EXCEPTIONS & VALIDATION REPORT
  // ==========================================
  const excRows: any[][] = [];
  const excRowHeights: Array<{ hpt?: number; hidden?: boolean }> = [];
  const excColCount = 5;
  appendExecutiveHeaderBanner(
    excRows,
    entityName,
    'CA STATUTORY AUDIT VALIDATION & EXCEPTION REPORT',
    currentPeriod,
    previousPeriod,
    excColCount,
    excRowHeights
  );

  excRows.push([
    thCell('Severity Rating', 'center', PALETTE.navyPrimary),
    thCell('Discrepancy Category', 'left', PALETTE.navyPrimary),
    thCell('Account / Schedule Under Review', 'left', PALETTE.navyPrimary),
    thCell('Discrepancy Amount (₹)', 'right', PALETTE.navyPrimary),
    thCell('Auditor Findings & ICAI Statutory Recommendation', 'left', PALETTE.navyPrimary),
  ]);
  excRowHeights.push({ hpt: 28 });

  if (exceptions.length === 0) {
    excRows.push([
      textCell('PASS', {
        bold: true,
        sz: 10,
        align: 'center',
        color: PALETTE.successText,
        bg: PALETTE.successBg,
      }),
      textCell('All Statutory Checks Passed', { bold: true, color: PALETTE.successText }),
      textCell('Financial Statements, Balance Sheet & P&L', { color: '475569' }),
      numCell(0),
      textCell(
        'Clean statutory audit opinion. No classification errors, missing groupings, or mathematical imbalances detected under ICAI Guidance Notes.',
        { wrapText: true }
      ),
    ]);
    excRowHeights.push({ hpt: 32 });
  } else {
    exceptions.forEach((e) => {
      const sev = (e.severity || 'low').toLowerCase();
      const sevBg =
        sev === 'high'
          ? PALETTE.dangerBg
          : sev === 'medium'
          ? PALETTE.warningBg
          : PALETTE.infoBg;
      const sevText =
        sev === 'high'
          ? PALETTE.dangerText
          : sev === 'medium'
          ? PALETTE.warningText
          : PALETTE.infoText;

      const recText = `${e.message} \n[CA Recommendation]: ${e.recommendation}`;
      const estimatedLines = Math.max(2, Math.ceil(recText.length / 80));
      const excHpt = Math.max(34, estimatedLines * 16 + 12);

      excRows.push([
        textCell(sev.toUpperCase(), {
          bold: true,
          sz: 10,
          align: 'center',
          color: sevText,
          bg: sevBg,
        }),
        textCell(e.type || 'Audit Check', { bold: true, sz: 10 }),
        textCell(e.accountName || 'Financial Statements', { sz: 9.5 }),
        numCell(e.amount),
        textCell(recText, {
          wrapText: true,
          sz: 9.5,
          color: '334155',
        }),
      ]);
      excRowHeights.push({ hpt: excHpt });
    });
  }

  appendSignOffBlock(excRows, entityConfig, currentPeriod, excColCount, excRowHeights);

  const wsExc = XLSX.utils.aoa_to_sheet(excRows);
  wsExc['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 26 }, { wch: 18 }, { wch: 54 }];
  wsExc['!rows'] = excRowHeights;
  wsExc['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: excColCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: excColCount - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: excColCount - 1 } },
  ];
  applyPrintSetup(wsExc, {
    orientation: 'landscape',
    entityName,
    reportTitle: 'AUDIT EXCEPTIONS REPORT',
    financialYear: fyCY,
    headerRowsToFreeze: 6,
    tabColor: 'DC2626',
  });
  XLSX.utils.book_append_sheet(wb, wsExc, 'Audit Exceptions');

  // Setup print titles (repeating header rows 1 to 6 on every printed page)
  wb.Workbook = wb.Workbook || {};
  wb.Workbook.Names = [
    { Name: '_xlnm.Print_Titles', Ref: "'Executive Summary'!$1:$6", Sheet: 0 },
    { Name: '_xlnm.Print_Titles', Ref: "'Balance Sheet'!$1:$6", Sheet: 1 },
    { Name: '_xlnm.Print_Titles', Ref: "'Profit and Loss'!$1:$6", Sheet: 2 },
    { Name: '_xlnm.Print_Titles', Ref: "'Notes 1 to 25'!$1:$6", Sheet: 3 },
    { Name: '_xlnm.Print_Titles', Ref: "'Trial Balance Master'!$1:$6", Sheet: 4 },
    { Name: '_xlnm.Print_Titles', Ref: "'Audit Exceptions'!$1:$6", Sheet: 5 },
  ];

  const sheetConfigs: SheetPrintConfig[] = [
    { sheetName: 'Executive Summary', orientation: 'portrait', reportTitle: 'EXECUTIVE SUMMARY', entityName, financialYear: fyCY },
    { sheetName: 'Balance Sheet', orientation: 'portrait', reportTitle: 'BALANCE SHEET', entityName, financialYear: fyCY },
    { sheetName: 'Profit and Loss', orientation: 'portrait', reportTitle: 'STATEMENT OF PROFIT AND LOSS', entityName, financialYear: fyCY },
    { sheetName: 'Notes 1 to 25', orientation: 'landscape', reportTitle: 'NOTES FORMING PART OF ACCOUNTS', entityName, financialYear: fyCY },
    { sheetName: 'Trial Balance Master', orientation: 'landscape', reportTitle: 'MASTER TRIAL BALANCE REGISTER', entityName, financialYear: fyCY },
    { sheetName: 'Audit Exceptions', orientation: 'landscape', reportTitle: 'STATUTORY AUDIT VALIDATION REPORT', entityName, financialYear: fyCY },
  ];

  // Return Workbook and Target File Name
  const cleanFileName = `${entityName.replace(/[^a-zA-Z0-9_-]/g, '_')}_Financial_Statements_${fyCY}.xlsx`;
  return { wb, cleanFileName, sheetConfigs };
}

export interface SheetPrintConfig {
  sheetName: string;
  orientation: 'portrait' | 'landscape';
  reportTitle: string;
  entityName: string;
  financialYear: string;
}

/**
 * Post-processes the raw XLSX zip archive to inject native OpenXML print setup
 * tags (<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>, <pageSetUp fitToWidth="1" fitToHeight="0" .../>,
 * margins, printOptions, and running headers/footers).
 * 
 * This guarantees that when Microsoft Excel or any spreadsheet application opens the file,
 * the Print Setup / Page Setup is automatically configured with:
 * - "Fit All Columns on One Page" (Scaling: fitToWidth="1", fitToHeight="0")
 * - A4 Paper size (paperSize="9")
 * - Correct Orientation (Portrait for financial statements, Landscape for notes & master registers)
 * - Standardized 0.4" print margins and horizontal centering
 * - Repeating running headers and footers with dynamic page numbers (&P of &N)
 */
async function postProcessXlsxPrintSettings(
  rawBuffer: ArrayBuffer | Uint8Array,
  sheetConfigs: SheetPrintConfig[]
): Promise<Uint8Array> {
  try {
    const zip = await JSZip.loadAsync(rawBuffer);
    const wbXmlStr = await zip.file('xl/workbook.xml')?.async('string');
    const wbRelsStr = await zip.file('xl/_rels/workbook.xml.rels')?.async('string');

    if (!wbXmlStr || !wbRelsStr) {
      return rawBuffer instanceof Uint8Array ? rawBuffer : new Uint8Array(rawBuffer);
    }

    const sheetMatches = Array.from(wbXmlStr.matchAll(/<sheet\s+[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"[^>]*\/>/g));
    const relMatches = Array.from(wbRelsStr.matchAll(/<Relationship\s+[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*\/>/g));
    const relMap = new Map<string, string>();
    for (const rm of relMatches) {
      relMap.set(rm[1], rm[2]);
    }

    for (const sm of sheetMatches) {
      const sheetName = sm[1];
      const rId = sm[2];
      let target = relMap.get(rId);
      if (!target) continue;
      if (!target.startsWith('xl/')) {
        target = 'xl/' + target.replace(/^\//, '');
      }

      const sheetFile = zip.file(target);
      if (!sheetFile) continue;

      let xml = await sheetFile.async('string');
      const cfg = sheetConfigs.find((c) => c.sheetName === sheetName) || {
        sheetName,
        orientation: 'portrait' as const,
        reportTitle: sheetName.toUpperCase(),
        entityName: sheetConfigs[0]?.entityName || 'FINANCIAL REPORT',
        financialYear: sheetConfigs[0]?.financialYear || '',
      };

      // 1. Ensure <sheetPr> with <pageSetUpPr fitToPage="1"/> is present at top
      if (!xml.includes('<pageSetUpPr')) {
        if (xml.includes('<sheetPr>')) {
          xml = xml.replace('<sheetPr>', '<sheetPr><pageSetUpPr fitToPage="1"/>');
        } else if (xml.includes('<sheetPr/>')) {
          xml = xml.replace('<sheetPr/>', '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>');
        } else {
          xml = xml.replace(/(<worksheet[^>]*>)/, '$1<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>');
        }
      } else if (!xml.includes('fitToPage="1"')) {
        xml = xml.replace(/<pageSetUpPr([^>]*)\/>/, '<pageSetUpPr$1 fitToPage="1"/>');
      }

      // 2. Remove any existing print tags to avoid invalid schema duplicates
      xml = xml.replace(/<printOptions[^>]*\/>/g, '');
      xml = xml.replace(/<pageMargins[^>]*\/>/g, '');
      xml = xml.replace(/<pageSetUp[^>]*\/>/g, '');
      xml = xml.replace(/<headerFooter[^>]*>[\s\S]*?<\/headerFooter>/g, '');

      // XML escape
      const esc = (s: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const cleanEntity = esc(cfg.entityName);
      const cleanTitle = esc(cfg.reportTitle);
      const cleanFY = esc(cfg.financialYear);

      // 3. Assemble exact OpenXML print tags in strict schema order
      const printXml = [
        '<printOptions gridLines="1" gridLinesSet="1" horizontalCentered="1"/>',
        '<pageMargins left="0.4" right="0.4" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>',
        `<pageSetUp paperSize="9" orientation="${cfg.orientation}" fitToWidth="1" fitToHeight="0" useFirstPageNumber="1" horizontalDpi="300" verticalDpi="300"/>`,
        '<headerFooter>',
        `  <oddHeader>&amp;L&amp;&quot;-,Bold&quot;${cleanEntity}&amp;C&amp;&quot;-,Bold&quot;${cleanTitle}&amp;R&amp;&quot;-,Regular&quot;${cleanFY}</oddHeader>`,
        '  <oddFooter>&amp;L&amp;&quot;-,Italic&quot;Strictly Private &amp;amp; Confidential | ICAI NCE Standard&amp;C&amp;&quot;-,Regular&quot;Page &amp;P of &amp;N&amp;R&amp;&quot;-,Regular&quot;&amp;D</oddFooter>',
        '</headerFooter>',
      ].join('');

      // 4. Insert before trailing elements according to SpreadsheetML schema
      const insertMarkers = [
        '<rowBreaks',
        '<colBreaks',
        '<customProperties',
        '<cellWatches',
        '<ignoredErrors',
        '<smartTags',
        '<drawing',
        '<legacyDrawing',
        '<picture',
        '</worksheet>',
      ];

      let inserted = false;
      for (const marker of insertMarkers) {
        if (xml.includes(marker)) {
          xml = xml.replace(marker, printXml + marker);
          inserted = true;
          break;
        }
      }
      if (!inserted) {
        xml = xml.replace('</worksheet>', printXml + '</worksheet>');
      }

      zip.file(target, xml);
    }

    return await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  } catch (e) {
    console.warn('Failed to post-process OpenXML print settings, falling back to raw buffer:', e);
    return rawBuffer instanceof Uint8Array ? rawBuffer : new Uint8Array(rawBuffer);
  }
}

/**
 * Downloads a binary Uint8Array as an .xlsx file in the browser
 */
function downloadXlsxBuffer(buffer: Uint8Array, fileName: string): void {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Triggers standard browser download for the formatted, print-ready Excel workbook
 */
export async function generateAttractiveExcelReport(params: ExportExcelParams): Promise<void> {
  const { data, fileName } = await generateAttractiveExcelBuffer(params);
  downloadXlsxBuffer(data, fileName);
}

/**
 * Generates raw print-ready Uint8Array buffer and file name for Google Drive upload or email attachments
 */
export async function generateAttractiveExcelBuffer(params: ExportExcelParams): Promise<{ data: Uint8Array; fileName: string }> {
  const { wb, cleanFileName, sheetConfigs } = buildAttractiveExcelWorkbook(params);
  const rawArray = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const finalBuffer = await postProcessXlsxPrintSettings(rawArray, sheetConfigs);
  return { data: finalBuffer, fileName: cleanFileName };
}
