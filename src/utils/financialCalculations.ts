import { BalanceSheetData, MappedLedger, NoteScheduleData, ProfitAndLossData, EntityConfig, AuditException, PartnerCapitalRecord } from '../types';
import { NCE_NOTE_DEFINITIONS } from '../data/nceTaxonomy';

interface SinglePeriodResult {
  balanceSheet: Omit<BalanceSheetData, 'previousYear'>;
  profitAndLoss: Omit<ProfitAndLossData, 'previousYear'>;
  noteSchedules: Record<number, NoteScheduleData>;
  computationExceptions: AuditException[];
  difference: number;
  isBalanced: boolean;
}

/**
 * Formats a number into Indian Rupee currency format (e.g. 1,23,456.78)
 */
export function formatINR(val?: number): string {
  if (val === undefined || val === null || isNaN(val)) return '0.00';
  return val.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Helper to identify whether a ledger account is Partners' Remuneration / Salary
 */
export function isPartnersRemunerationItem(item: { accountName?: string; subCategory?: string }): boolean {
  const name = (item.accountName || '').toLowerCase().trim();
  const sub = (item.subCategory || '').toLowerCase().trim();

  if (
    sub.includes('partners\' remuneration') ||
    sub.includes('partners remuneration') ||
    sub.includes('partner remuneration') ||
    sub.includes('salary to partner') ||
    sub.includes('salary to partners')
  ) {
    return true;
  }

  if (
    (name.includes('partner') && (name.includes('remuneration') || name.includes('salary') || name.includes('allowance') || name.includes('bonus'))) ||
    name.includes('remuneration to partner') ||
    name.includes('remuneration paid to partner') ||
    name.includes('remuneration of partner') ||
    name.includes('partners remuneration') ||
    name.includes('partner remuneration') ||
    name.includes('partner\'s remuneration') ||
    name.includes('partners\' remuneration') ||
    name.includes('partner salary') ||
    name.includes('partners salary') ||
    name.includes('salary to partner') ||
    name.includes('salary paid to partner') ||
    (name.startsWith('remuneration') && !name.includes('director') && !name.includes('auditor')) ||
    (name.includes('remuneration') && (name.includes('proprietor') || name.includes('member') || name.includes('partner')))
  ) {
    return true;
  }

  return false;
}

/**
 * Computes the statutory 10-column partner capital account reconciliation table
 * as prescribed on Page 6 of the ICAI Guidance Note on Financial Statements of Non-Corporate Entities:
 * Sr. No. | Name of Partner/ Proprietor/ Owner | Share of profit/ (loss) (%) | As at 1st April 20XX (Opening Balance) | Capital Introduced/contributed during the year | Remuneration for the year | Interest for the year | Withdrawals during the year | Share of Profit / Loss for the year | As at 31st March 20XX (Closing Balance)
 */
export function computeOwnersCapitalTable(
  schedule: NoteScheduleData,
  config: EntityConfig,
  profitAndLoss: Omit<ProfitAndLossData, 'previousYear'>,
  isPY: boolean = false
): PartnerCapitalRecord[] {
  // 1. Priority 1: User explicitly uploaded or configured statutory schedule
  if (!isPY && config.partnerCapitalSchedule && config.partnerCapitalSchedule.length > 0) {
    return config.partnerCapitalSchedule.map((r, idx) => ({
      ...r,
      srNo: idx + 1,
      profitShareRatio: r.profitShareRatio || `${r.profitSharePercent}%`,
    }));
  }
  if (isPY && config.pyPartnerCapitalSchedule && config.pyPartnerCapitalSchedule.length > 0) {
    return config.pyPartnerCapitalSchedule.map((r, idx) => ({
      ...r,
      srNo: idx + 1,
      profitShareRatio: r.profitShareRatio || `${r.profitSharePercent}%`,
    }));
  }

  const isProprietorship = config.entityType === 'Sole Proprietorship';
  const totalClosing = schedule.totalAmount || 0;
  const pat = profitAndLoss.profitAfterTax || 0;
  const remuneration = profitAndLoss.partnersRemuneration || 0;

  // Detect interest on partners capital from schedule or Note 23
  let interestOnCapital = 0;
  schedule.items.forEach((it) => {
    const n = it.accountName.toLowerCase();
    if (n.includes('interest on capital') || n.includes('interest on partner') || n.includes('partner interest')) {
      interestOnCapital += Math.abs(it.displayBalance !== undefined ? it.displayBalance : it.netBalance);
    }
  });

  // Check if configured partners exist
  let partnerConfigs = config.partners && config.partners.length > 0 ? [...config.partners] : [];

  // 2. Priority 2: Configured partners with individual balances
  if (partnerConfigs.length > 0) {
    const records: PartnerCapitalRecord[] = partnerConfigs.map((p, idx) => {
      const ratio = (p.profitSharePercent || (100 / partnerConfigs.length)) / 100;
      const pOpening = isPY ? (p.pyOpeningBalance ?? p.openingBalance) : p.openingBalance;
      const pIntroduced = isPY ? (p.pyCapitalIntroduced ?? p.capitalIntroduced) : p.capitalIntroduced;
      const pRemun = isPY ? (p.pyRemuneration ?? p.remuneration) : p.remuneration;
      const pInterest = isPY ? (p.pyInterestOnCapital ?? p.interestOnCapital) : p.interestOnCapital;
      const pDrawings = isPY ? (p.pyWithdrawals ?? p.withdrawals) : p.withdrawals;
      const pProfitShare = isPY ? (p.pyShareOfProfit ?? p.shareOfProfit) : p.shareOfProfit;
      const pExplicitClosing = isPY ? (p.pyClosingBalance ?? p.closingBalance) : p.closingBalance;

      const effectiveOpening = pOpening !== undefined ? pOpening : 0;
      const effectiveIntroduced = pIntroduced !== undefined ? pIntroduced : 0;
      const effectiveRemun = pRemun !== undefined ? pRemun : Math.round(remuneration * ratio * 100) / 100;
      const effectiveInterest = pInterest !== undefined ? pInterest : Math.round(interestOnCapital * ratio * 100) / 100;
      const effectiveDrawings = pDrawings !== undefined ? pDrawings : 0;
      const effectiveProfitShare = pProfitShare !== undefined ? pProfitShare : Math.round(pat * ratio * 100) / 100;

      const computedClosing = Math.round(
        (effectiveOpening + effectiveIntroduced + effectiveRemun + effectiveInterest - effectiveDrawings + effectiveProfitShare) * 100
      ) / 100;

      const finalClosing = pExplicitClosing !== undefined ? pExplicitClosing : computedClosing;

      return {
        srNo: idx + 1,
        partnerName: p.name,
        profitSharePercent: p.profitSharePercent || Math.round(100 / partnerConfigs.length),
        profitShareRatio: `${p.profitSharePercent || Math.round(100 / partnerConfigs.length)}%`,
        openingBalance: effectiveOpening,
        capitalIntroduced: effectiveIntroduced,
        remuneration: effectiveRemun,
        interestOnCapital: effectiveInterest,
        withdrawals: effectiveDrawings,
        shareOfProfit: effectiveProfitShare,
        closingBalance: finalClosing,
      };
    });

    return records;
  }

  // 3. Priority 3: Intelligent discovery directly from Note 3 Trial Balance Ledgers
  // Map individual partner ledger accounts and their actual balances
  interface DiscoveredPartner {
    name: string;
    capitalBal: number;
    drawingsBal: number;
    introducedBal: number;
    hasExplicitLedger: boolean;
  }
  const discoveredMap = new Map<string, DiscoveredPartner>();

  schedule.items.forEach((it) => {
    const name = it.accountName;
    if (
      it.accountCode?.startsWith('VIRT-') ||
      name.toLowerCase().includes('statutory') ||
      name.toLowerCase().includes('net profit') ||
      name.toLowerCase().includes('net loss') ||
      name.toLowerCase().includes('total') ||
      name.toLowerCase().includes('surplus')
    ) {
      return;
    }

    const cleaned = name
      .replace(/(capital\s*a\/c|capital\s*account|current\s*a\/c|current\s*account|drawings\s*a\/c|drawings|partner)/gi, '')
      .replace(/[-–:_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleaned.length < 2) return;

    if (!discoveredMap.has(cleaned)) {
      discoveredMap.set(cleaned, {
        name: cleaned,
        capitalBal: 0,
        drawingsBal: 0,
        introducedBal: 0,
        hasExplicitLedger: true,
      });
    }

    const partner = discoveredMap.get(cleaned)!;
    const isDebit = ((it.originalDebit || 0) > (it.originalCredit || 0)) || it.accountName.toLowerCase().includes('drawing');
    const bal = Math.abs(it.displayBalance !== undefined ? it.displayBalance : it.netBalance);

    if (isDebit) {
      partner.drawingsBal += bal;
    } else if (it.subCategory?.toLowerCase().includes('introduced') || it.accountName.toLowerCase().includes('introduced')) {
      partner.introducedBal += bal;
    } else {
      partner.capitalBal += bal;
    }
  });

  const discoveredPartners = Array.from(discoveredMap.values());

  if (discoveredPartners.length >= 1 && !isProprietorship) {
    const count = discoveredPartners.length;
    const equalShare = Math.round((100 / count) * 100) / 100;

    const records: PartnerCapitalRecord[] = discoveredPartners.map((dp, idx) => {
      const psr = idx === count - 1 ? Math.round((100 - equalShare * (count - 1)) * 100) / 100 : equalShare;
      const ratio = psr / 100;
      const pRemun = Math.round(remuneration * ratio * 100) / 100;
      const pInterest = Math.round(interestOnCapital * ratio * 100) / 100;
      const pProfit = Math.round(pat * ratio * 100) / 100;
      const pClosing = Math.round(dp.capitalBal * 100) / 100;

      // Deduce opening balance based on the ledger balance
      const pOpening = Math.round((pClosing - dp.introducedBal - pRemun - pInterest + dp.drawingsBal - pProfit) * 100) / 100;

      return {
        srNo: idx + 1,
        partnerName: dp.name,
        profitSharePercent: psr,
        profitShareRatio: `${psr}%`,
        openingBalance: pOpening >= 0 ? pOpening : pClosing,
        capitalIntroduced: dp.introducedBal,
        remuneration: pRemun,
        interestOnCapital: pInterest,
        withdrawals: dp.drawingsBal,
        shareOfProfit: pProfit,
        closingBalance: pClosing,
      };
    });

    // Verify if sum of closing balances matches totalClosing
    const sumClose = records.reduce((s, r) => s + r.closingBalance, 0);
    const variance = Math.round((totalClosing - sumClose) * 100) / 100;
    if (Math.abs(variance) > 0 && records.length > 0) {
      const last = records[records.length - 1];
      last.closingBalance = Math.round((last.closingBalance + variance) * 100) / 100;
      last.openingBalance = Math.round((last.openingBalance + variance) * 100) / 100;
    }

    return records;
  }

  // Sole Proprietorship fallback
  if (isProprietorship) {
    const propName = config.entityName ? `${config.entityName} (Proprietor)` : 'Proprietor';
    const pOpening = Math.round((totalClosing - remuneration - interestOnCapital - pat) * 100) / 100;
    return [
      {
        srNo: 1,
        partnerName: propName,
        profitSharePercent: 100,
        profitShareRatio: '100%',
        openingBalance: pOpening,
        capitalIntroduced: 0,
        remuneration: remuneration,
        interestOnCapital: interestOnCapital,
        withdrawals: 0,
        shareOfProfit: pat,
        closingBalance: totalClosing,
      },
    ];
  }

  // Default fallback for 2 partners
  const halfShare = 50;
  const halfRatio = 0.5;
  const halfClosing = Math.round((totalClosing / 2) * 100) / 100;
  const halfProfit = Math.round((pat / 2) * 100) / 100;
  const halfRemun = Math.round((remuneration / 2) * 100) / 100;
  const halfInterest = Math.round((interestOnCapital / 2) * 100) / 100;
  const halfOpening = Math.round((halfClosing - halfRemun - halfInterest - halfProfit) * 100) / 100;

  return [
    {
      srNo: 1,
      partnerName: 'Partner 1',
      profitSharePercent: halfShare,
      profitShareRatio: '50%',
      openingBalance: halfOpening,
      capitalIntroduced: 0,
      remuneration: halfRemun,
      interestOnCapital: halfInterest,
      withdrawals: 0,
      shareOfProfit: halfProfit,
      closingBalance: halfClosing,
    },
    {
      srNo: 2,
      partnerName: 'Partner 2',
      profitSharePercent: halfShare,
      profitShareRatio: '50%',
      openingBalance: totalClosing - halfClosing - halfRemun - halfInterest - (pat - halfProfit),
      capitalIntroduced: 0,
      remuneration: remuneration - halfRemun,
      interestOnCapital: interestOnCapital - halfInterest,
      withdrawals: 0,
      shareOfProfit: pat - halfProfit,
      closingBalance: totalClosing - halfClosing,
    },
  ];
}

/**
 * Computes statutory statements and note schedules for a single period (CY or PY)
 */
export function computePeriodTotals(
  mappedLedgers: MappedLedger[],
  config: EntityConfig,
  periodLabel: string = 'Current Period'
): SinglePeriodResult {
  const noteSchedules: Record<number, NoteScheduleData> = {};
  const computationExceptions: AuditException[] = [];

  // 1. Prepare effective ledgers array including Year-End Adjustments if present
  const effectiveLedgers: MappedLedger[] = [...mappedLedgers];
  const adjustments = config.yearEndAdjustments;

  if (adjustments) {
    const isCY = periodLabel !== 'Previous Period';
    
    // Closing Stock
    const csVal = isCY ? adjustments.closingStockCY : adjustments.closingStockPY;
    if (csVal !== undefined && csVal > 0) {
      // 1. Add virtual closing stock asset entry in Note 15 (Balance Sheet: Inventories)
      effectiveLedgers.push({
        accountCode: isCY ? 'VIRT-CS-CY' : 'VIRT-CS-PY',
        accountName: 'Closing Stock (Valued as per AS-2)',
        originalDebit: csVal,
        originalCredit: 0,
        netBalance: csVal,
        statement: 'BalanceSheet',
        noteNumber: 15,
        noteName: 'Inventories',
        subCategory: 'Stock-in-trade / Inventories',
        mappingConfidence: 1.0,
        mappingRuleUsed: 'Year-End Stock Adjustment',
      });

      // 2. Add virtual closing stock credit deduction entry in Note 21 (Profit & Loss: Cost of Goods Sold)
      effectiveLedgers.push({
        accountCode: isCY ? 'VIRT-CS-COGS-CY' : 'VIRT-CS-COGS-PY',
        accountName: 'Less: Closing Stock (Valued as per AS-2)',
        originalDebit: 0,
        originalCredit: csVal,
        netBalance: -csVal,
        statement: 'ProfitAndLoss',
        noteNumber: 21,
        noteName: 'Cost of Goods Sold',
        subCategory: '(C) Changes in inventories (Opening less Closing)',
        mappingConfidence: 1.0,
        mappingRuleUsed: 'Year-End Stock Adjustment',
      });
    }

    // Current Year statutory adjustments
    if (isCY) {
      if (adjustments.provisionForTaxCY !== undefined && adjustments.provisionForTaxCY > 0) {
        effectiveLedgers.push({
          accountCode: 'VIRT-TAX-PROV-CY',
          accountName: 'Provision for Income Tax',
          originalDebit: 0,
          originalCredit: adjustments.provisionForTaxCY,
          netBalance: adjustments.provisionForTaxCY,
          statement: 'BalanceSheet',
          noteNumber: 8,
          noteName: 'Short-Term Provisions',
          subCategory: 'Short-Term Provisions',
          mappingConfidence: 1.0,
          mappingRuleUsed: 'Year-End Statutory Adjustment',
        });
      }

      if (adjustments.depreciationCY !== undefined && adjustments.depreciationCY > 0) {
        effectiveLedgers.push({
          accountCode: 'VIRT-DEP-CY',
          accountName: 'Depreciation Charge for Year',
          originalDebit: adjustments.depreciationCY,
          originalCredit: 0,
          netBalance: adjustments.depreciationCY,
          statement: 'ProfitAndLoss',
          noteNumber: 24,
          noteName: 'Depreciation and Amortization Expense',
          subCategory: 'Depreciation and Amortization',
          mappingConfidence: 1.0,
          mappingRuleUsed: 'Year-End Statutory Adjustment',
        });
      }

      if (adjustments.partnerRemunerationCY !== undefined && adjustments.partnerRemunerationCY > 0) {
        effectiveLedgers.push({
          accountCode: 'VIRT-PARTNER-REM-CY',
          accountName: 'Partners Remuneration',
          originalDebit: adjustments.partnerRemunerationCY,
          originalCredit: 0,
          netBalance: adjustments.partnerRemunerationCY,
          statement: 'ProfitAndLoss',
          noteNumber: 22,
          noteName: 'Employee Benefits Expense',
          subCategory: 'Partners Remuneration',
          mappingConfidence: 1.0,
          mappingRuleUsed: 'Year-End Statutory Adjustment',
        });
      }

      if (adjustments.customAdjustments && adjustments.customAdjustments.length > 0) {
        adjustments.customAdjustments.forEach((adj) => {
          if (adj.particulars.trim() && adj.amount > 0) {
            effectiveLedgers.push({
              accountCode: `VIRT-CUSTOM-${adj.id}`,
              accountName: adj.particulars,
              originalDebit: adj.isDebit ? adj.amount : 0,
              originalCredit: adj.isDebit ? 0 : adj.amount,
              netBalance: adj.amount,
              statement: adj.statement,
              noteNumber: adj.noteNumber,
              noteName: NCE_NOTE_DEFINITIONS.find((n) => n.noteNumber === adj.noteNumber)?.name || `Note ${adj.noteNumber}`,
              subCategory: 'Custom Year-End Adjustments',
              mappingConfidence: 1.0,
              mappingRuleUsed: 'User Custom Adjustment',
            });
          }
        });
      }
    }
  }

  // Initialize all 25 notes from taxonomy
  NCE_NOTE_DEFINITIONS.forEach((def) => {
    noteSchedules[def.noteNumber] = {
      noteNumber: def.noteNumber,
      noteName: def.name,
      statement: def.statement,
      totalAmount: 0,
      previousYearAmount: 0,
      items: [],
      subTotals: {},
      statutoryNotes: def.mandatoryDisclosures || [],
    };
  });

  // Group mapped ledgers into their respective notes
  effectiveLedgers.forEach((ledger) => {
    const noteNo = ledger.noteNumber;
    if (!noteSchedules[noteNo]) {
      noteSchedules[noteNo] = {
        noteNumber: noteNo,
        noteName: ledger.noteName || `Note ${noteNo}`,
        statement: ledger.statement,
        totalAmount: 0,
        previousYearAmount: 0,
        items: [],
        subTotals: {},
      };
    }

    // Reset displayBalance before calculation so stale signs from previous mappings do not persist
    ledger.displayBalance = undefined;
    const schedule = noteSchedules[noteNo];
    schedule.items.push(ledger);
  });

  // Compute total per note schedule with double-entry sign awareness
  Object.keys(noteSchedules).forEach((key) => {
    const noteNo = Number(key);
    const schedule = noteSchedules[noteNo];

    if (noteNo === 11) {
      // PPE: Gross tangible minus accumulated depreciation
      let gross = 0;
      let accumDep = 0;
      schedule.items.forEach((item) => {
        const isCredit =
          item.subCategory === 'Accumulated Depreciation' ||
          item.accountName.toLowerCase().includes('accumulated') ||
          (item.originalCredit > 0 && (item.originalDebit === 0 || item.originalCredit > item.originalDebit));

        if (isCredit) {
          item.displayBalance = -Math.abs(item.netBalance);
          accumDep += Math.abs(item.netBalance);
        } else {
          item.displayBalance = Math.abs(item.netBalance);
          gross += Math.abs(item.netBalance);
        }
      });
      schedule.totalAmount = Math.max(0, gross - accumDep);
    } else if (noteNo === 3) {
      // Owners' / Partners' Capital Account (Note 3):
      let totalCapital = 0;
      schedule.items.forEach((item) => {
        const isDebitEntry =
          (item.originalDebit !== undefined && item.originalDebit > 0 && (item.originalCredit === 0 || item.originalDebit > item.originalCredit)) ||
          item.subCategory === 'Drawings Account' ||
          item.accountName.toLowerCase().includes('drawing') ||
          item.accountName.toLowerCase().includes('rent') ||
          item.accountName.toLowerCase().includes('tax') ||
          (item.accountName.toLowerCase().includes('loss') && !item.accountName.toLowerCase().includes('profit'));

        if (isDebitEntry) {
          item.displayBalance = -Math.abs(item.netBalance);
          totalCapital -= Math.abs(item.netBalance);
        } else {
          item.displayBalance = Math.abs(item.netBalance);
          totalCapital += Math.abs(item.netBalance);
        }
      });
      schedule.totalAmount = totalCapital;
    } else if (noteNo === 4) {
      // Reserves and Surplus (Note 4):
      let totalReserves = 0;
      schedule.items.forEach((item) => {
        const isDebitEntry =
          (item.originalDebit !== undefined && item.originalDebit > 0 && (item.originalCredit === 0 || item.originalDebit > item.originalCredit)) ||
          item.accountName.toLowerCase().includes('deficit') ||
          item.accountName.toLowerCase().includes('loss');

        if (isDebitEntry) {
          item.displayBalance = -Math.abs(item.netBalance);
          totalReserves -= Math.abs(item.netBalance);
        } else {
          item.displayBalance = Math.abs(item.netBalance);
          totalReserves += Math.abs(item.netBalance);
        }
      });
      schedule.totalAmount = totalReserves;
    } else if (noteNo >= 5 && noteNo <= 10) {
      // Liability Schedules (Notes 5 to 10):
      // Credit entries (+) increase Liability
      // Debit entries (-) decrease Liability (unless statutory dues)
      let totalLiab = 0;
      schedule.items.forEach((item) => {
        const nameLower = item.accountName.toLowerCase();
        const isDebitEntry =
          (item.originalDebit > 0 && (item.originalCredit === 0 || item.originalDebit > item.originalCredit)) &&
          !nameLower.includes('pf') &&
          !nameLower.includes('esi') &&
          !nameLower.includes('tds') &&
          !nameLower.includes('gst') &&
          !nameLower.includes('statutory') &&
          !nameLower.includes('payable');

        if (isDebitEntry) {
          item.displayBalance = -Math.abs(item.netBalance);
          totalLiab -= Math.abs(item.netBalance);
        } else {
          item.displayBalance = Math.abs(item.netBalance);
          totalLiab += Math.abs(item.netBalance);
        }
      });
      schedule.totalAmount = totalLiab;
    } else if (noteNo >= 12 && noteNo <= 18) {
      // Asset Schedules (Notes 12 to 18):
      // Debit entries (+) increase Asset
      // Credit entries (-) decrease Asset (e.g. provisions, credit bank balance)
      let totalAsset = 0;
      schedule.items.forEach((item) => {
        const nameLower = item.accountName.toLowerCase();
        const isCreditEntry =
          (item.originalCredit > 0 && (item.originalDebit === 0 || item.originalCredit > item.originalDebit)) ||
          nameLower.includes('less:') ||
          nameLower.includes('provision');

        if (isCreditEntry) {
          item.displayBalance = -Math.abs(item.netBalance);
          totalAsset -= Math.abs(item.netBalance);
        } else {
          item.displayBalance = Math.abs(item.netBalance);
          totalAsset += Math.abs(item.netBalance);
        }
      });
      schedule.totalAmount = totalAsset;
    } else if (noteNo >= 21 && noteNo <= 25) {
      // Expense Schedules (Notes 21 to 25):
      // Debit entries (+) increase Expense
      // Credit entries (-) decrease Expense (e.g. Round Off credit, Discount Received, Less: Closing Stock)
      let totalExp = 0;
      schedule.items.forEach((item) => {
        const isCreditEntry =
          (item.originalCredit > 0 && (item.originalDebit === 0 || item.originalCredit > item.originalDebit)) ||
          item.accountCode?.includes('VIRT-CS-COGS') ||
          item.accountName.toLowerCase().includes('less:') ||
          item.accountName.toLowerCase().includes('round off');

        if (isCreditEntry) {
          item.displayBalance = -Math.abs(item.netBalance);
          totalExp -= Math.abs(item.netBalance);
        } else {
          item.displayBalance = Math.abs(item.netBalance);
          totalExp += Math.abs(item.netBalance);
        }
      });
      schedule.totalAmount = totalExp;
    } else if (noteNo >= 19 && noteNo <= 20) {
      // Income Schedules (Notes 19 & 20):
      // Credit entries (+) increase Income
      // Debit entries (-) decrease Income (e.g. Sales Return, Discount Allowed)
      // Provision reversals / return back / written back are CREDIT income additions (+), NOT debit returns (-)
      let totalInc = 0;
      schedule.items.forEach((item) => {
        const nameLower = item.accountName.toLowerCase();
        const isProvisionReturnOrWrittenBack =
          nameLower.includes('written back') ||
          nameLower.includes('return back') ||
          nameLower.includes('provision return') ||
          nameLower.includes('excess provision');

        const isDebitEntry =
          !isProvisionReturnOrWrittenBack &&
          ((item.originalDebit > 0 && (item.originalCredit === 0 || item.originalDebit > item.originalCredit)) ||
            nameLower.includes('sales return') ||
            nameLower.includes('return inward') ||
            nameLower.includes('discount allowed'));

        if (isDebitEntry) {
          item.displayBalance = -Math.abs(item.netBalance);
          totalInc -= Math.abs(item.netBalance);
        } else {
          item.displayBalance = Math.abs(item.netBalance);
          totalInc += Math.abs(item.netBalance);
        }
      });
      schedule.totalAmount = totalInc;
    } else {
      schedule.totalAmount = schedule.items.reduce((sum, it) => {
        it.displayBalance = Math.abs(it.netBalance);
        return sum + it.displayBalance;
      }, 0);
    }

    // Recalculate subTotals with correct signed display balances
    schedule.subTotals = {};
    schedule.items.forEach((item) => {
      const subCat = item.subCategory || 'General';
      const bal = item.displayBalance !== undefined ? item.displayBalance : item.netBalance;
      schedule.subTotals[subCat] = (schedule.subTotals[subCat] || 0) + bal;
    });
  });

  // Compute Statement of Profit and Loss according to ICAI format (Page 5)
  // I. Revenue from operations (Note 19)
  const revenueFromOperations = noteSchedules[19]?.totalAmount || 0;
  // II. Other Income (Note 20)
  const otherIncome = noteSchedules[20]?.totalAmount || 0;
  // III. Total Income (I + II)
  const totalRevenue = revenueFromOperations + otherIncome;

  // IV. Expenses:
  // Note 21: Cost of goods sold (Raw material consumed + Purchases of stock-in-trade + Changes in inventory)
  let costOfRawMaterialsConsumed = 0;
  let purchasesOfStockInTrade = 0;
  let changesInInventories = 0;
  let openingStockVal = 0;

  noteSchedules[21]?.items.forEach((it) => {
    if (it.subCategory.includes('(B)') || it.subCategory.toLowerCase().includes('stock-in-trade')) {
      purchasesOfStockInTrade += it.netBalance;
    } else if (it.subCategory.includes('(C)') || it.subCategory.toLowerCase().includes('changes in')) {
      changesInInventories += it.netBalance;
      if (it.accountName.toLowerCase().includes('opening stock') || it.subCategory.toLowerCase().includes('opening')) {
        openingStockVal += it.netBalance;
      }
    } else {
      if (it.accountName.toLowerCase().includes('opening stock') || it.subCategory.toLowerCase().includes('opening')) {
        openingStockVal += it.netBalance;
      }
      costOfRawMaterialsConsumed += it.netBalance;
    }
  });

  // Calculate net inventory change if Closing Stock is not already explicitly an item in Note 21
  const hasExplicitCOGSClosingStock = noteSchedules[21]?.items.some(
    (it) => it.accountName.toLowerCase().includes('closing stock') || it.accountCode?.includes('VIRT-CS-COGS')
  );

  if (!hasExplicitCOGSClosingStock) {
    const closingStockVal = noteSchedules[15]?.totalAmount || 0;
    if (closingStockVal > 0) {
      if (openingStockVal > 0) {
        changesInInventories = openingStockVal - closingStockVal;
      } else if (changesInInventories > 0) {
        changesInInventories = changesInInventories - closingStockVal;
      } else {
        changesInInventories = -closingStockVal;
      }
    }
  }

  const costOfGoodsSold = noteSchedules[21]?.totalAmount ?? (costOfRawMaterialsConsumed + purchasesOfStockInTrade + changesInInventories);

  // Note 22: Employee benefits expense & Line X: Partners' remuneration
  let employeeBenefitsExpense = 0;
  let partnersRemuneration = 0;
  const partnersRemunerationItems: MappedLedger[] = [];

  // 1. Scan Note 22: Separate Employee Benefits vs Partners' Remuneration
  noteSchedules[22]?.items.forEach((it) => {
    const bal = it.displayBalance !== undefined ? it.displayBalance : it.netBalance;
    if (isPartnersRemunerationItem(it)) {
      partnersRemuneration += Math.abs(bal);
      partnersRemunerationItems.push(it);
    } else {
      employeeBenefitsExpense += bal;
    }
  });

  // 2. Scan Note 25: If user or auto-mapping mapped partners' remuneration to Note 25,
  // extract it cleanly so it is NOT lumped into Other Expenses and NOT deducted before Line IX!
  let otherExpenses = 0;
  noteSchedules[25]?.items.forEach((it) => {
    const bal = it.displayBalance !== undefined ? it.displayBalance : it.netBalance;
    if (isPartnersRemunerationItem(it)) {
      partnersRemuneration += Math.abs(bal);
      partnersRemunerationItems.push(it);
    } else {
      otherExpenses += bal;
    }
  });

  // 3. Scan all remaining schedules (e.g. Note 3, 10, or unmapped) to catch any stray partners' remuneration expense
  Object.keys(noteSchedules).forEach((key) => {
    const n = Number(key);
    if (n !== 22 && n !== 25 && noteSchedules[n]) {
      noteSchedules[n].items.forEach((it) => {
        if (isPartnersRemunerationItem(it) && !partnersRemunerationItems.some((p) => p.id === it.id || p.accountName === it.accountName)) {
          const bal = it.displayBalance !== undefined ? it.displayBalance : it.netBalance;
          if (it.statement === 'ProfitAndLoss' || it.originalDebit > 0) {
            partnersRemuneration += Math.abs(bal);
            partnersRemunerationItems.push(it);
          }
        }
      });
    }
  });

  // Re-align schedule totalAmounts so Note 22 and Note 25 reflect true Operating Expenses
  if (noteSchedules[22]) {
    noteSchedules[22].totalAmount = employeeBenefitsExpense;
  }
  if (noteSchedules[25]) {
    noteSchedules[25].totalAmount = otherExpenses;
  }

  // Note 23: Finance costs
  const financeCosts = noteSchedules[23]?.totalAmount || 0;

  // Note 24: Depreciation and amortization expense
  const depreciationExpense = noteSchedules[24]?.totalAmount || 0;

  // Total expenses (Strictly Operating & Administrative Expenses EXCLUDING Partners' Remuneration)
  const totalExpenses = costOfGoodsSold + employeeBenefitsExpense + financeCosts + depreciationExpense + otherExpenses;

  // Step calculations as per ICAI format
  // Profit before exceptional and extraordinary items, partners' remuneration and tax (III - IV)
  const profitBeforeExceptionalAndTax = totalRevenue - totalExpenses;
  const exceptionalItems = 0;
  const profitBeforeExtraordinaryAndTax = profitBeforeExceptionalAndTax - exceptionalItems;
  const extraordinaryItems = 0;
  const profitBeforePartnersRemunerationAndTax = profitBeforeExtraordinaryAndTax - extraordinaryItems;
  const profitBeforeTax = profitBeforePartnersRemunerationAndTax - partnersRemuneration;

  // Tax expense — for Partnership Firms & Sole Proprietorships where profit is transferred to partners' capital,
  // do not auto-charge corporate tax unless explicitly specified or provided as a tax provision ledger
  const isPassThroughEntity =
    config.entityType === 'Partnership Firm' ||
    config.entityType === 'Sole Proprietorship' ||
    config.transferProfitTo === 'partners_capital' ||
    config.transferProfitTo === 'proprietor_capital';
  const taxRate = isPassThroughEntity ? 0 : (config.taxRatePercent ? config.taxRatePercent / 100 : (profitBeforeTax > 0 ? 0.30 : 0));
  const currentTax = profitBeforeTax > 0 ? Math.round(profitBeforeTax * taxRate) : 0;
  const excessShortTaxEarlierYears = 0;
  const deferredTaxCharge = 0;
  const totalTaxExpense = currentTax + excessShortTaxEarlierYears + deferredTaxCharge;

  const profitFromContinuingOps = profitBeforeTax - totalTaxExpense;
  const profitFromDiscontinuingOps = 0;
  const taxExpenseDiscontinuingOps = 0;
  const profitFromDiscontinuingOpsAfterTax = 0;
  const profitAfterTax = profitFromContinuingOps + profitFromDiscontinuingOpsAfterTax;

  const profitAndLoss: Omit<ProfitAndLossData, 'previousYear'> = {
    revenueFromOperations,
    otherIncome,
    totalRevenue,
    costOfGoodsSold,
    costOfMaterialsConsumed: costOfRawMaterialsConsumed,
    costOfRawMaterialsConsumed,
    purchasesOfStockInTrade,
    changesInInventories,
    employeeBenefitsExpense,
    financeCosts,
    depreciationExpense,
    otherExpenses,
    totalExpenses,
    profitBeforeExceptionalAndTax,
    exceptionalItems,
    profitBeforeExtraordinaryAndTax,
    extraordinaryItems,
    profitBeforePartnersRemunerationAndTax,
    partnersRemuneration,
    partnersRemunerationItems,
    profitBeforeTax,
    currentTax,
    excessShortTaxEarlierYears,
    deferredTaxCharge,
    totalTaxExpense,
    profitFromContinuingOps,
    profitFromDiscontinuingOps,
    taxExpenseDiscontinuingOps,
    profitFromDiscontinuingOpsAfterTax,
    profitAfterTax,
  };

  // Balance Sheet Compilation (ICAI format Page 3)
  // 1. Owners' Funds & Statutory Net Profit / Loss Transfer
  const transferToCapital =
    config.transferProfitTo === 'partners_capital' ||
    config.transferProfitTo === 'proprietor_capital' ||
    (!config.transferProfitTo && (config.entityType === 'Sole Proprietorship' || config.entityType === 'Partnership Firm'));

  // Clean out any stale virtual profit transfer ledgers from both notes first
  if (noteSchedules[3]) {
    noteSchedules[3].items = noteSchedules[3].items.filter((it) => it.accountCode !== 'VIRT-PROFIT-LOSS');
  }
  if (noteSchedules[4]) {
    noteSchedules[4].items = noteSchedules[4].items.filter((it) => it.accountCode !== 'VIRT-PROFIT-LOSS');
  }

  if (transferToCapital) {
    if (noteSchedules[3]) {
      const profitTransferLedger: MappedLedger = {
        id: `virt-profit-transfer-note3`,
        accountCode: 'VIRT-PROFIT-LOSS',
        accountName: profitAfterTax >= 0
          ? 'Add: Net Profit for the Year (transferred from Statement of Profit & Loss)'
          : 'Less: Net Loss for the Year (transferred from Statement of Profit & Loss)',
        originalDebit: profitAfterTax < 0 ? Math.abs(profitAfterTax) : 0,
        originalCredit: profitAfterTax >= 0 ? profitAfterTax : 0,
        netBalance: profitAfterTax,
        statement: 'BalanceSheet',
        noteNumber: 3,
        noteName: "Owners' Capital Account",
        subCategory: profitAfterTax >= 0 ? 'Net Profit for the Year' : 'Net Loss for the Year',
        mappingConfidence: 1.0,
        mappingRuleUsed: 'Statutory Profit Transfer',
      };

      noteSchedules[3].items.push(profitTransferLedger);
    }
  } else {
    if (noteSchedules[4]) {
      const profitTransferLedger: MappedLedger = {
        id: `virt-profit-transfer-note4`,
        accountCode: 'VIRT-PROFIT-LOSS',
        accountName: profitAfterTax >= 0
          ? 'Add: Surplus / Profit for the Year (transferred from Statement of Profit & Loss)'
          : 'Less: Deficit / Loss for the Year (transferred from Statement of Profit & Loss)',
        originalDebit: profitAfterTax < 0 ? Math.abs(profitAfterTax) : 0,
        originalCredit: profitAfterTax >= 0 ? profitAfterTax : 0,
        netBalance: profitAfterTax,
        statement: 'BalanceSheet',
        noteNumber: 4,
        noteName: 'Reserves and Surplus',
        subCategory: '(c) Surplus (Balance in Statement of Profit and Loss)',
        mappingConfidence: 1.0,
        mappingRuleUsed: 'Statutory Profit Transfer',
      };

      noteSchedules[4].items.push(profitTransferLedger);
    }
  }

  // Recompute Note 3 total with correct signed balances
  if (noteSchedules[3]) {
    let totalCapital = 0;
    noteSchedules[3].items.forEach((item) => {
      if (item.accountCode === 'VIRT-PROFIT-LOSS') {
        if (profitAfterTax >= 0) {
          item.displayBalance = Math.abs(item.netBalance);
          totalCapital += Math.abs(item.netBalance);
        } else {
          item.displayBalance = -Math.abs(item.netBalance);
          totalCapital -= Math.abs(item.netBalance);
        }
        return;
      }

      const isDebitEntry =
        ((item.originalDebit || 0) > (item.originalCredit || 0)) ||
        item.subCategory === 'Drawings Account' ||
        item.accountName.toLowerCase().includes('drawing') ||
        item.accountName.toLowerCase().includes('rent') ||
        item.accountName.toLowerCase().includes('tax') ||
        (item.accountName.toLowerCase().includes('loss') && !item.accountName.toLowerCase().includes('profit'));

      if (isDebitEntry) {
        item.displayBalance = -Math.abs(item.netBalance);
        totalCapital -= Math.abs(item.netBalance);
      } else {
        item.displayBalance = Math.abs(item.netBalance);
        totalCapital += Math.abs(item.netBalance);
      }
    });
    noteSchedules[3].totalAmount = totalCapital;
    noteSchedules[3].partnerCapitalTable = computeOwnersCapitalTable(
      noteSchedules[3],
      config,
      profitAndLoss,
      periodLabel === 'Previous Period'
    );
  }

  // Recompute Note 4 total with correct signed balances
  if (noteSchedules[4]) {
    let totalReserves = 0;
    noteSchedules[4].items.forEach((item) => {
      if (item.accountCode === 'VIRT-PROFIT-LOSS') {
        if (profitAfterTax >= 0) {
          item.displayBalance = Math.abs(item.netBalance);
          totalReserves += Math.abs(item.netBalance);
        } else {
          item.displayBalance = -Math.abs(item.netBalance);
          totalReserves -= Math.abs(item.netBalance);
        }
        return;
      }

      const isDebitEntry =
        ((item.originalDebit || 0) > (item.originalCredit || 0)) ||
        item.accountName.toLowerCase().includes('deficit') ||
        (item.accountName.toLowerCase().includes('loss') && !item.accountName.toLowerCase().includes('profit'));

      if (isDebitEntry) {
        item.displayBalance = -Math.abs(item.netBalance);
        totalReserves -= Math.abs(item.netBalance);
      } else {
        item.displayBalance = Math.abs(item.netBalance);
        totalReserves += Math.abs(item.netBalance);
      }
    });
    noteSchedules[4].totalAmount = totalReserves;
  }

  const adjustedCapital = noteSchedules[3]?.totalAmount || 0;
  const adjustedReserves = noteSchedules[4]?.totalAmount || 0;
  const totalOwnersFunds = adjustedCapital + adjustedReserves;

  // 2. Non-current liabilities
  // Note 5: Long-term borrowings (Term loans, partner unsecured loans)
  let longTermBorrowings = 0;
  let shortTermBorrowings = 0;

  noteSchedules[5]?.items.forEach((it) => {
    const isShort = it.subCategory.toLowerCase().includes('demand') ||
      it.subCategory.toLowerCase().includes('cc/od') ||
      it.accountName.toLowerCase().includes('cash credit') ||
      it.accountName.toLowerCase().includes(' cc ') ||
      it.accountName.toLowerCase().includes('overdraft') ||
      it.accountName.toLowerCase().includes('bank od');
    const bal = it.displayBalance !== undefined ? it.displayBalance : it.netBalance;
    if (isShort) {
      shortTermBorrowings += bal;
    } else {
      longTermBorrowings += bal;
    }
  });
  if (longTermBorrowings === 0 && shortTermBorrowings === 0 && noteSchedules[5]?.totalAmount) {
    longTermBorrowings = noteSchedules[5].totalAmount;
  }

  // Note 6: Deferred tax liabilities (Net)
  const deferredTaxLiabilities = noteSchedules[6]?.totalAmount || 0;

  // Note 7: Other long-term liabilities
  const otherLongTermLiabilities = noteSchedules[7]?.totalAmount || 0;

  // Note 8: Provisions (Long Term vs Short Term)
  let longTermProvisions = 0;
  let shortTermProvisions = 0;

  noteSchedules[8]?.items.forEach((it) => {
    const bal = it.displayBalance !== undefined ? it.displayBalance : it.netBalance;
    if (it.subCategory.toLowerCase().includes('long-term') || it.accountName.toLowerCase().includes('gratuity') || it.accountName.toLowerCase().includes('leave encashment')) {
      longTermProvisions += bal;
    } else {
      shortTermProvisions += bal;
    }
  });
  if (longTermProvisions === 0 && shortTermProvisions === 0 && noteSchedules[8]?.totalAmount) {
    longTermProvisions = noteSchedules[8].totalAmount;
  }

  const totalNonCurrentLiabilities = longTermBorrowings + deferredTaxLiabilities + otherLongTermLiabilities + longTermProvisions;

  // 3. Current liabilities
  // Note 9: Trade payables
  const tradePayables = noteSchedules[9]?.totalAmount || 0;

  // Note 10: Other current liabilities (plus income tax provision if computed)
  let otherCurrentLiabilities = noteSchedules[10]?.totalAmount || 0;
  if (currentTax > 0) {
    otherCurrentLiabilities += currentTax;
  }

  const totalCurrentLiabilities = shortTermBorrowings + tradePayables + otherCurrentLiabilities + shortTermProvisions;
  const totalEquityAndLiabilities = totalOwnersFunds + totalNonCurrentLiabilities + totalCurrentLiabilities;

  // 4. Non-current assets
  // Note 11: Property, Plant and Equipment and Intangible assets
  let propertyPlantEquipment = 0;
  let intangibleAssets = 0;
  let capitalWorkInProgress = 0;
  let intangibleAssetUnderDevelopment = 0;

  noteSchedules[11]?.items.forEach((it) => {
    if (it.statement === 'BalanceSheet') {
      const sub = it.subCategory.toLowerCase();
      const bal = it.displayBalance !== undefined ? Math.abs(it.displayBalance) : Math.abs(it.netBalance);
      if (sub.includes('intangible') || sub.includes('software')) {
        intangibleAssets += bal;
      } else if (sub.includes('capital work') || sub.includes('cwip')) {
        capitalWorkInProgress += bal;
      } else if (sub.includes('development')) {
        intangibleAssetUnderDevelopment += bal;
      } else if (!sub.includes('accumulated')) {
        propertyPlantEquipment += bal;
      }
    }
  });

  // Net off accumulated depreciation for tangible PPE
  let accumDep = 0;
  noteSchedules[11]?.items.forEach((it) => {
    if (it.subCategory === 'Accumulated Depreciation' || it.accountName.toLowerCase().includes('accumulated depreciation')) {
      accumDep += (it.displayBalance !== undefined ? Math.abs(it.displayBalance) : Math.abs(it.netBalance));
    }
  });
  propertyPlantEquipment = Math.max(0, propertyPlantEquipment - accumDep);
  if (propertyPlantEquipment === 0 && noteSchedules[11]?.totalAmount) {
    propertyPlantEquipment = noteSchedules[11].totalAmount;
  }

  // Note 12: Investments (Non-current and Current)
  let nonCurrentInvestments = 0;
  let currentInvestments = 0;

  noteSchedules[12]?.items.forEach((it) => {
    const bal = it.displayBalance !== undefined ? it.displayBalance : it.netBalance;
    if (it.subCategory.toLowerCase().includes('current -') || it.accountName.toLowerCase().includes('mutual fund') || it.accountName.toLowerCase().includes('liquid')) {
      currentInvestments += bal;
    } else {
      nonCurrentInvestments += bal;
    }
  });
  if (nonCurrentInvestments === 0 && currentInvestments === 0 && noteSchedules[12]?.totalAmount) {
    nonCurrentInvestments = noteSchedules[12].totalAmount;
  }

  // Note 6: Deferred tax assets (Net)
  const deferredTaxAssets = 0;

  // Note 13: Loans and advances (Long Term vs Short Term)
  let longTermLoansAndAdvances = 0;
  let shortTermLoansAndAdvances = 0;

  noteSchedules[13]?.items.forEach((it) => {
    const bal = it.displayBalance !== undefined ? it.displayBalance : it.netBalance;
    if (it.subCategory.toLowerCase().includes('secured - capital') || it.accountName.toLowerCase().includes('capital advance')) {
      longTermLoansAndAdvances += bal;
    } else {
      shortTermLoansAndAdvances += bal;
    }
  });
  if (longTermLoansAndAdvances === 0 && shortTermLoansAndAdvances === 0 && noteSchedules[13]?.totalAmount) {
    shortTermLoansAndAdvances = noteSchedules[13].totalAmount;
  }

  // Note 14: Other non-current assets
  const otherNonCurrentAssets = noteSchedules[14]?.totalAmount || 0;

  const totalNonCurrentAssets = propertyPlantEquipment + intangibleAssets + capitalWorkInProgress + intangibleAssetUnderDevelopment + nonCurrentInvestments + deferredTaxAssets + longTermLoansAndAdvances + otherNonCurrentAssets;

  // 5. Current assets
  // Note 15: Inventories
  const inventories = noteSchedules[15]?.totalAmount || 0;

  // Note 16: Trade receivables
  const tradeReceivables = noteSchedules[16]?.totalAmount || 0;

  // Note 17: Cash and bank balances
  const cashAndBankBalances = noteSchedules[17]?.totalAmount || 0;

  // Note 18: Other current assets
  const otherCurrentAssets = noteSchedules[18]?.totalAmount || 0;

  const totalCurrentAssets = currentInvestments + inventories + tradeReceivables + cashAndBankBalances + shortTermLoansAndAdvances + otherCurrentAssets;

  const totalAssets = totalNonCurrentAssets + totalCurrentAssets;
  const difference = Math.round((totalEquityAndLiabilities - totalAssets) * 100) / 100;
  const isBalanced = Math.abs(difference) < 1;

  if (!isBalanced) {
    computationExceptions.push({
      id: `exc-bs-out-of-balance-${periodLabel.toLowerCase().replace(/\s+/g, '-')}`,
      type: 'BS_OUT_OF_BALANCE',
      severity: 'high',
      amount: Math.abs(difference),
      message: `[${periodLabel}] Balance Sheet is out of balance by ₹${Math.abs(difference).toLocaleString('en-IN')}. Total Equity & Liabilities: ₹${totalEquityAndLiabilities.toLocaleString('en-IN')} vs Total Assets: ₹${totalAssets.toLocaleString('en-IN')}.`,
      recommendation: 'Check whether opening stock vs closing stock entries are accounted properly or if unmapped ledgers exist between P&L and Balance Sheet.',
    });
  }

  const balanceSheet: Omit<BalanceSheetData, 'previousYear'> = {
    ownersCapital: adjustedCapital,
    reservesAndSurplus: adjustedReserves,
    totalOwnersFunds,
    longTermBorrowings,
    deferredTaxLiabilities,
    otherLongTermLiabilities,
    longTermProvisions,
    totalNonCurrentLiabilities,
    shortTermBorrowings,
    tradePayables,
    otherCurrentLiabilities,
    shortTermProvisions,
    totalCurrentLiabilities,
    totalEquityAndLiabilities,
    propertyPlantEquipment,
    intangibleAssets,
    capitalWorkInProgress,
    intangibleAssetUnderDevelopment,
    nonCurrentInvestments,
    deferredTaxAssets,
    longTermLoansAndAdvances,
    otherNonCurrentAssets,
    totalNonCurrentAssets,
    currentInvestments,
    inventories,
    tradeReceivables,
    cashAndBankBalances,
    shortTermLoansAndAdvances,
    otherCurrentAssets,
    totalCurrentAssets,
    totalAssets,
    difference,
    isBalanced,
  };

  return {
    balanceSheet,
    profitAndLoss,
    noteSchedules,
    computationExceptions,
    difference,
    isBalanced,
  };
}

export function computeFinancialStatements(
  cyMappedLedgers: MappedLedger[],
  config: EntityConfig,
  pyMappedLedgers?: MappedLedger[],
  pyFileName?: string,
  importedPriorStatements?: {
    balanceSheet?: Partial<BalanceSheetData['previousYear']>;
    profitAndLoss?: Partial<ProfitAndLossData['previousYear']>;
    noteTotals?: Record<number, number>;
  }
): {
  balanceSheet: BalanceSheetData;
  profitAndLoss: ProfitAndLossData;
  noteSchedules: Record<number, NoteScheduleData>;
  computationExceptions: AuditException[];
} {
  // 1. Compute Current Year
  const cy = computePeriodTotals(cyMappedLedgers, config, 'Current Period');

  let pyBS: BalanceSheetData['previousYear'];
  let pyPL: ProfitAndLossData['previousYear'];
  const allExceptions = [...cy.computationExceptions];
  const isPYProvided = Boolean(pyMappedLedgers && pyMappedLedgers.length > 0);
  const hasImportedPrior = Boolean(
    importedPriorStatements &&
      (importedPriorStatements.balanceSheet || importedPriorStatements.profitAndLoss)
  );

  if (isPYProvided && pyMappedLedgers) {
    // 2. Compute Previous Year directly from uploaded / provided PY Trial Balance
    const py = computePeriodTotals(pyMappedLedgers, config, 'Previous Period');

    pyBS = {
      ownersCapital: py.balanceSheet.ownersCapital,
      reservesAndSurplus: py.balanceSheet.reservesAndSurplus,
      totalOwnersFunds: py.balanceSheet.totalOwnersFunds,
      longTermBorrowings: py.balanceSheet.longTermBorrowings,
      deferredTaxLiabilities: py.balanceSheet.deferredTaxLiabilities,
      otherLongTermLiabilities: py.balanceSheet.otherLongTermLiabilities,
      longTermProvisions: py.balanceSheet.longTermProvisions,
      totalNonCurrentLiabilities: py.balanceSheet.totalNonCurrentLiabilities,
      shortTermBorrowings: py.balanceSheet.shortTermBorrowings,
      tradePayables: py.balanceSheet.tradePayables,
      otherCurrentLiabilities: py.balanceSheet.otherCurrentLiabilities,
      shortTermProvisions: py.balanceSheet.shortTermProvisions,
      totalCurrentLiabilities: py.balanceSheet.totalCurrentLiabilities,
      totalEquityAndLiabilities: py.balanceSheet.totalEquityAndLiabilities,
      propertyPlantEquipment: py.balanceSheet.propertyPlantEquipment,
      intangibleAssets: py.balanceSheet.intangibleAssets,
      capitalWorkInProgress: py.balanceSheet.capitalWorkInProgress,
      intangibleAssetUnderDevelopment: py.balanceSheet.intangibleAssetUnderDevelopment,
      nonCurrentInvestments: py.balanceSheet.nonCurrentInvestments,
      deferredTaxAssets: py.balanceSheet.deferredTaxAssets,
      longTermLoansAndAdvances: py.balanceSheet.longTermLoansAndAdvances,
      otherNonCurrentAssets: py.balanceSheet.otherNonCurrentAssets,
      totalNonCurrentAssets: py.balanceSheet.totalNonCurrentAssets,
      currentInvestments: py.balanceSheet.currentInvestments,
      inventories: py.balanceSheet.inventories,
      tradeReceivables: py.balanceSheet.tradeReceivables,
      cashAndBankBalances: py.balanceSheet.cashAndBankBalances,
      shortTermLoansAndAdvances: py.balanceSheet.shortTermLoansAndAdvances,
      otherCurrentAssets: py.balanceSheet.otherCurrentAssets,
      totalCurrentAssets: py.balanceSheet.totalCurrentAssets,
      totalAssets: py.balanceSheet.totalAssets,
    };

    pyPL = {
      revenueFromOperations: py.profitAndLoss.revenueFromOperations,
      otherIncome: py.profitAndLoss.otherIncome,
      totalRevenue: py.profitAndLoss.totalRevenue,
      costOfGoodsSold: py.profitAndLoss.costOfGoodsSold,
      costOfMaterialsConsumed: py.profitAndLoss.costOfMaterialsConsumed || py.profitAndLoss.costOfRawMaterialsConsumed || py.profitAndLoss.costOfGoodsSold,
      costOfRawMaterialsConsumed: py.profitAndLoss.costOfRawMaterialsConsumed || py.profitAndLoss.costOfGoodsSold,
      purchasesOfStockInTrade: py.profitAndLoss.purchasesOfStockInTrade || 0,
      changesInInventories: py.profitAndLoss.changesInInventories || 0,
      employeeBenefitsExpense: py.profitAndLoss.employeeBenefitsExpense,
      financeCosts: py.profitAndLoss.financeCosts,
      depreciationExpense: py.profitAndLoss.depreciationExpense,
      otherExpenses: py.profitAndLoss.otherExpenses,
      totalExpenses: py.profitAndLoss.totalExpenses,
      profitBeforeExceptionalAndTax: py.profitAndLoss.profitBeforeExceptionalAndTax,
      exceptionalItems: py.profitAndLoss.exceptionalItems,
      profitBeforeExtraordinaryAndTax: py.profitAndLoss.profitBeforeExtraordinaryAndTax,
      extraordinaryItems: py.profitAndLoss.extraordinaryItems,
      profitBeforePartnersRemunerationAndTax: py.profitAndLoss.profitBeforePartnersRemunerationAndTax,
      partnersRemuneration: py.profitAndLoss.partnersRemuneration,
      partnersRemunerationItems: py.profitAndLoss.partnersRemunerationItems || [],
      profitBeforeTax: py.profitAndLoss.profitBeforeTax,
      currentTax: py.profitAndLoss.currentTax,
      excessShortTaxEarlierYears: py.profitAndLoss.excessShortTaxEarlierYears,
      deferredTaxCharge: py.profitAndLoss.deferredTaxCharge,
      profitAfterTax: py.profitAndLoss.profitAfterTax,
    };

    // Populate Previous Year Amount and item-level comparative balances in each Note Schedule
    Object.keys(cy.noteSchedules).forEach((key) => {
      const noteNo = Number(key);
      const cySched = cy.noteSchedules[noteNo];
      const pySched = py.noteSchedules[noteNo];

      if (pySched) {
        cySched.previousYearAmount = pySched.totalAmount || 0;
        cySched.pySubTotals = pySched.subTotals || {};

        const matchedPyIds = new Set<string>();

        // 1. Attach PY amounts to existing CY items
        cySched.items.forEach((cyItem) => {
          const cyCode = (cyItem.accountCode || '').toLowerCase().trim();
          const cyName = cyItem.accountName.toLowerCase().trim();

          const pyItem = pySched.items.find((it) => {
            const pyCode = (it.accountCode || '').toLowerCase().trim();
            const pyName = it.accountName.toLowerCase().trim();
            if (cyCode && pyCode && cyCode === pyCode) return true;
            return cyName === pyName;
          });

          if (pyItem) {
            matchedPyIds.add(pyItem.id);
            const pyBal = pyItem.displayBalance !== undefined ? pyItem.displayBalance : pyItem.netBalance;
            cyItem.previousYearBalance = pyBal;
            cyItem.pyDebit = pyItem.originalDebit;
            cyItem.pyCredit = pyItem.originalCredit;
          } else {
            cyItem.previousYearBalance = 0;
            cyItem.pyDebit = 0;
            cyItem.pyCredit = 0;
          }
        });

        // 2. Include PY items that had transactions in PY but 0 in CY
        pySched.items.forEach((pyItem) => {
          if (!matchedPyIds.has(pyItem.id)) {
            const pyBal = pyItem.displayBalance !== undefined ? pyItem.displayBalance : pyItem.netBalance;
            cySched.items.push({
              ...pyItem,
              id: `py-nil-cy-${pyItem.id}`,
              accountName: `${pyItem.accountName}`,
              displayBalance: 0,
              netBalance: 0,
              originalDebit: 0,
              originalCredit: 0,
              previousYearBalance: pyBal,
              pyDebit: pyItem.originalDebit,
              pyCredit: pyItem.originalCredit,
            });
          }
        });

        if (noteNo === 3 && pySched) {
          cySched.pyPartnerCapitalTable = pySched.partnerCapitalTable;
        }
      } else {
        cySched.previousYearAmount = 0;
      }
    });

    if (py.computationExceptions.length > 0) {
      allExceptions.push(...py.computationExceptions);
    }
  } else if (hasImportedPrior && importedPriorStatements) {
    // 2b. Use ONLY the actual values extracted from uploaded financial statements.
    // Do NOT fabricate estimates for missing fields — use 0 for absent data.
    const impBS = importedPriorStatements.balanceSheet || {};
    const impPL = importedPriorStatements.profitAndLoss || {};

    const ownersCap = impBS.ownersCapital ?? 0;
    const resSurp = impBS.reservesAndSurplus ?? 0;
    const totOwners = ownersCap + resSurp;

    const ltBorrow = impBS.longTermBorrowings ?? 0;
    const defTaxL = impBS.deferredTaxLiabilities ?? 0;
    const othLtL = impBS.otherLongTermLiabilities ?? 0;
    const ltProv = impBS.longTermProvisions ?? 0;
    const totNonCurrL = ltBorrow + defTaxL + othLtL + ltProv;

    const stBorrow = impBS.shortTermBorrowings ?? 0;
    const trdPay = impBS.tradePayables ?? 0;
    const othCurL = impBS.otherCurrentLiabilities ?? 0;
    const stProv = impBS.shortTermProvisions ?? 0;
    const totCurL = stBorrow + trdPay + othCurL + stProv;

    const totEqLiab = totOwners + totNonCurrL + totCurL;

    const ppe = impBS.propertyPlantEquipment ?? 0;
    const intang = impBS.intangibleAssets ?? 0;
    const cwip = impBS.capitalWorkInProgress ?? 0;
    const nonCurInv = impBS.nonCurrentInvestments ?? 0;
    const defTaxA = impBS.deferredTaxAssets ?? 0;
    const ltLoans = impBS.longTermLoansAndAdvances ?? 0;
    const othNonCurA = impBS.otherNonCurrentAssets ?? 0;
    const totNonCurA = ppe + intang + cwip + nonCurInv + defTaxA + ltLoans + othNonCurA;

    const curInv = impBS.currentInvestments ?? 0;
    const inv = impBS.inventories ?? 0;
    const trdRec = impBS.tradeReceivables ?? 0;
    const cashBank = impBS.cashAndBankBalances ?? 0;
    const stLoans = impBS.shortTermLoansAndAdvances ?? 0;
    const othCurA = impBS.otherCurrentAssets ?? 0;
    const totCurA = curInv + inv + trdRec + cashBank + stLoans + othCurA;

    pyBS = {
      ownersCapital: ownersCap,
      reservesAndSurplus: resSurp,
      totalOwnersFunds: totOwners,
      longTermBorrowings: ltBorrow,
      deferredTaxLiabilities: defTaxL,
      otherLongTermLiabilities: othLtL,
      longTermProvisions: ltProv,
      totalNonCurrentLiabilities: totNonCurrL,
      shortTermBorrowings: stBorrow,
      tradePayables: trdPay,
      otherCurrentLiabilities: othCurL,
      shortTermProvisions: stProv,
      totalCurrentLiabilities: totCurL,
      totalEquityAndLiabilities: totEqLiab,
      propertyPlantEquipment: ppe,
      intangibleAssets: intang,
      capitalWorkInProgress: cwip,
      intangibleAssetUnderDevelopment: 0,
      nonCurrentInvestments: nonCurInv,
      deferredTaxAssets: defTaxA,
      longTermLoansAndAdvances: ltLoans,
      otherNonCurrentAssets: othNonCurA,
      totalNonCurrentAssets: totNonCurA,
      currentInvestments: curInv,
      inventories: inv,
      tradeReceivables: trdRec,
      cashAndBankBalances: cashBank,
      shortTermLoansAndAdvances: stLoans,
      otherCurrentAssets: othCurA,
      totalCurrentAssets: totCurA,
      totalAssets: totNonCurA + totCurA,
    };

    const revOps = impPL.revenueFromOperations ?? 0;
    const othInc = impPL.otherIncome ?? 0;
    const totRev = revOps + othInc;
    const cogs = impPL.costOfGoodsSold ?? 0;
    const empExp = impPL.employeeBenefitsExpense ?? 0;
    const finCost = impPL.financeCosts ?? 0;
    const depExp = impPL.depreciationExpense ?? 0;
    const othExp = impPL.otherExpenses ?? 0;
    const totExp = cogs + empExp + finCost + depExp + othExp;
    const pbt = totRev - totExp;
    const curTax = impPL.currentTax ?? 0;
    const pat = pbt - curTax;

    pyPL = {
      revenueFromOperations: revOps,
      otherIncome: othInc,
      totalRevenue: totRev,
      costOfGoodsSold: cogs,
      costOfMaterialsConsumed: impPL.costOfMaterialsConsumed ?? cogs,
      costOfRawMaterialsConsumed: impPL.costOfRawMaterialsConsumed ?? cogs,
      purchasesOfStockInTrade: impPL.purchasesOfStockInTrade ?? 0,
      changesInInventories: impPL.changesInInventories ?? 0,
      employeeBenefitsExpense: empExp,
      financeCosts: finCost,
      depreciationExpense: depExp,
      otherExpenses: othExp,
      totalExpenses: totExp,
      profitBeforeExceptionalAndTax: pbt,
      exceptionalItems: 0,
      profitBeforeExtraordinaryAndTax: pbt,
      extraordinaryItems: 0,
      profitBeforePartnersRemunerationAndTax: pbt,
      partnersRemuneration: impPL.partnersRemuneration ?? 0,
      profitBeforeTax: pbt,
      currentTax: curTax,
      excessShortTaxEarlierYears: 0,
      deferredTaxCharge: 0,
      profitAfterTax: pat,
    };

    Object.keys(cy.noteSchedules).forEach((key) => {
      const noteNo = Number(key);
      if (importedPriorStatements.noteTotals && importedPriorStatements.noteTotals[noteNo] !== undefined) {
        cy.noteSchedules[noteNo].previousYearAmount = importedPriorStatements.noteTotals[noteNo];
      } else {
        cy.noteSchedules[noteNo].previousYearAmount = 0;
      }
    });
  } else {
    // No PY Trial Balance and no uploaded PY statements provided.
    // Show zeros — do NOT fabricate estimates from CY figures.
    pyBS = {
      ownersCapital: 0,
      reservesAndSurplus: 0,
      totalOwnersFunds: 0,
      longTermBorrowings: 0,
      deferredTaxLiabilities: 0,
      otherLongTermLiabilities: 0,
      longTermProvisions: 0,
      totalNonCurrentLiabilities: 0,
      shortTermBorrowings: 0,
      tradePayables: 0,
      otherCurrentLiabilities: 0,
      shortTermProvisions: 0,
      totalCurrentLiabilities: 0,
      totalEquityAndLiabilities: 0,
      propertyPlantEquipment: 0,
      intangibleAssets: 0,
      capitalWorkInProgress: 0,
      intangibleAssetUnderDevelopment: 0,
      nonCurrentInvestments: 0,
      deferredTaxAssets: 0,
      longTermLoansAndAdvances: 0,
      otherNonCurrentAssets: 0,
      totalNonCurrentAssets: 0,
      currentInvestments: 0,
      inventories: 0,
      tradeReceivables: 0,
      cashAndBankBalances: 0,
      shortTermLoansAndAdvances: 0,
      otherCurrentAssets: 0,
      totalCurrentAssets: 0,
      totalAssets: 0,
    };

    pyPL = {
      revenueFromOperations: 0,
      otherIncome: 0,
      totalRevenue: 0,
      costOfGoodsSold: 0,
      costOfMaterialsConsumed: 0,
      costOfRawMaterialsConsumed: 0,
      purchasesOfStockInTrade: 0,
      changesInInventories: 0,
      employeeBenefitsExpense: 0,
      financeCosts: 0,
      depreciationExpense: 0,
      otherExpenses: 0,
      totalExpenses: 0,
      profitBeforeExceptionalAndTax: 0,
      exceptionalItems: 0,
      profitBeforeExtraordinaryAndTax: 0,
      extraordinaryItems: 0,
      profitBeforePartnersRemunerationAndTax: 0,
      partnersRemuneration: 0,
      profitBeforeTax: 0,
      currentTax: 0,
      excessShortTaxEarlierYears: 0,
      deferredTaxCharge: 0,
      profitAfterTax: 0,
    };

    Object.keys(cy.noteSchedules).forEach((key) => {
      cy.noteSchedules[Number(key)].previousYearAmount = 0;
    });
  }

  const finalBS: BalanceSheetData = {
    ...cy.balanceSheet,
    isPreviousYearUploaded: isPYProvided || hasImportedPrior,
    previousYearFileName: isPYProvided ? pyFileName : (hasImportedPrior ? 'Imported Audited Statements (BS / P&L)' : undefined),
    previousYear: pyBS,
  };

  const finalPL: ProfitAndLossData = {
    ...cy.profitAndLoss,
    isPreviousYearUploaded: isPYProvided || hasImportedPrior,
    previousYearFileName: isPYProvided ? pyFileName : (hasImportedPrior ? 'Imported Audited Statements (BS / P&L)' : undefined),
    previousYear: pyPL,
  };

  return {
    balanceSheet: finalBS,
    profitAndLoss: finalPL,
    noteSchedules: cy.noteSchedules,
    computationExceptions: allExceptions,
  };
}
