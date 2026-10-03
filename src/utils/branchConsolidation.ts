import {
  BranchLedgerBreakdown,
  BranchTrialBalanceData,
  EntityConfig,
  MappedLedger,
  TrialBalanceRow,
  AuditException,
} from '../types';
import { mapTrialBalanceLedgers, normalizeProfitAndLossLedgers } from './mappingEngine';
import { computePeriodTotals } from './financialCalculations';
import { SAMPLE_DATASETS } from '../data/sampleTrialBalances';

/**
 * Synchronizes the branches array with the requested numberOfBranches count,
 * preserving any existing branch names and uploaded CY/PY trial balance data.
 */
export function syncBranchesWithCount(
  existingBranches: BranchTrialBalanceData[] | undefined,
  count: number
): BranchTrialBalanceData[] {
  const safeCount = Math.max(0, Math.min(50, Math.floor(Number(count) || 0)));
  if (safeCount === 0) return [];

  const current = Array.isArray(existingBranches) ? [...existingBranches] : [];
  const result: BranchTrialBalanceData[] = [];

  for (let i = 0; i < safeCount; i++) {
    if (current[i]) {
      result.push({
        ...current[i],
        branchId: current[i].branchId || `branch-${i + 1}`,
        branchName:
          current[i].branchName ||
          (i === 0 && safeCount > 1 ? 'Branch 1 (Head Office)' : `Branch ${i + 1}`),
        branchCode: current[i].branchCode || `BR-${String(i + 1).padStart(2, '0')}`,
      });
    } else {
      result.push({
        branchId: `branch-${i + 1}`,
        branchName: i === 0 && safeCount > 1 ? 'Branch 1 (Head Office)' : `Branch ${i + 1}`,
        branchCode: `BR-${String(i + 1).padStart(2, '0')}`,
      });
    }
  }

  return result;
}

/**
 * Ensures config.branches is initialized according to config.numberOfBranches.
 */
export function ensureBranchesInitialized(config: EntityConfig): BranchTrialBalanceData[] {
  const count = config.numberOfBranches || (config.branches ? config.branches.length : 0);
  return syncBranchesWithCount(config.branches, count);
}

/**
 * Normalizes an account name for cross-branch consolidation matching.
 */
function normalizeLedgerKey(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Consolidates branch-wise Trial Balances for either Current Year ('CY') or Previous Year ('PY').
 * Combines identical ledger accounts across branches (or keeps them branch-tagged if mergeIdenticalLedgers is false),
 * runs statutory ICAI Note 3-25 classification, preserves manual user overrides, and attaches branchBreakdown.
 */
export function consolidateBranchTrialBalances(
  branches: BranchTrialBalanceData[],
  period: 'CY' | 'PY',
  existingConsolidatedLedgers: MappedLedger[] = [],
  mergeIdenticalLedgers: boolean = true
): {
  rawRows: TrialBalanceRow[];
  mappedLedgers: MappedLedger[];
  exceptions: AuditException[];
  totalDebit: number;
  totalCredit: number;
  isTallyBalanced: boolean;
  tallyDifference: number;
  uploadedBranchesCount: number;
  totalBranchesCount: number;
  consolidatedFileName: string;
  totalClosingStock?: number;
} {
  const safeBranches = Array.isArray(branches) ? branches : [];
  const activeBranches = safeBranches.filter((b) => {
    const rows = period === 'CY' ? b.cyRawRows : b.pyRawRows;
    const ledgers = period === 'CY' ? b.cyMappedLedgers : b.pyMappedLedgers;
    return (rows && rows.length > 0) || (ledgers && ledgers.length > 0);
  });

  if (activeBranches.length === 0) {
    return {
      rawRows: [],
      mappedLedgers: [],
      exceptions: [],
      totalDebit: 0,
      totalCredit: 0,
      isTallyBalanced: true,
      tallyDifference: 0,
      uploadedBranchesCount: 0,
      totalBranchesCount: safeBranches.length,
      consolidatedFileName: '',
    };
  }

  // Build lookup of user-overridden mappings from existing consolidated ledgers
  const overrideMap = new Map<string, MappedLedger>();
  (existingConsolidatedLedgers || []).forEach((l) => {
    if (l && l.isUserOverridden) {
      overrideMap.set(normalizeLedgerKey(l.accountName), l);
    }
  });

  const consolidatedRows: TrialBalanceRow[] = [];
  const breakdownMap = new Map<string, BranchLedgerBreakdown[]>();

  if (mergeIdenticalLedgers) {
    const grouped = new Map<
      string,
      {
        displayName: string;
        accountCode?: string;
        signedSum: number; // sum of (debit - credit)
        grossDebit: number;
        grossCredit: number;
        breakdowns: BranchLedgerBreakdown[];
      }
    >();

    activeBranches.forEach((branch) => {
      const sourceRows: TrialBalanceRow[] =
        (period === 'CY' ? branch.cyRawRows : branch.pyRawRows) ||
        ((period === 'CY' ? branch.cyMappedLedgers : branch.pyMappedLedgers) || []).map((m, idx) => ({
          id: m.id || `br-row-${idx}`,
          accountCode: m.accountCode,
          accountName: m.accountName,
          closingDebit: m.originalDebit || 0,
          closingCredit: m.originalCredit || 0,
          netBalance: m.netBalance || Math.abs((m.originalDebit || 0) - (m.originalCredit || 0)),
        }));

      sourceRows.forEach((row) => {
        const key = normalizeLedgerKey(row.accountName);
        if (!key) return;
        const dr = Math.round((Number(row.closingDebit) || 0) * 100) / 100;
        const cr = Math.round((Number(row.closingCredit) || 0) * 100) / 100;
        if (dr === 0 && cr === 0) return;

        const existing = grouped.get(key);
        const branchEntry: BranchLedgerBreakdown = {
          branchId: branch.branchId,
          branchName: branch.branchName,
          debit: dr,
          credit: cr,
          netBalance: Math.round((dr - cr) * 100) / 100,
        };

        if (existing) {
          existing.signedSum = Math.round((existing.signedSum + (dr - cr)) * 100) / 100;
          existing.grossDebit = Math.round((existing.grossDebit + dr) * 100) / 100;
          existing.grossCredit = Math.round((existing.grossCredit + cr) * 100) / 100;
          if (!existing.accountCode && row.accountCode) {
            existing.accountCode = row.accountCode;
          }
          // Merge if same branch had duplicate lines for the same account
          const existingBr = existing.breakdowns.find((b) => b.branchId === branch.branchId);
          if (existingBr) {
            existingBr.debit = Math.round((existingBr.debit + dr) * 100) / 100;
            existingBr.credit = Math.round((existingBr.credit + cr) * 100) / 100;
            existingBr.netBalance = Math.round((existingBr.debit - existingBr.credit) * 100) / 100;
          } else {
            existing.breakdowns.push(branchEntry);
          }
        } else {
          grouped.set(key, {
            displayName: row.accountName.trim(),
            accountCode: row.accountCode,
            signedSum: Math.round((dr - cr) * 100) / 100,
            grossDebit: dr,
            grossCredit: cr,
            breakdowns: [branchEntry],
          });
        }
      });
    });

    let idx = 0;
    grouped.forEach((entry, key) => {
      // If an inter-branch account completely nets out to 0 across branches, skip adding a zero row
      if (Math.abs(entry.signedSum) < 0.005) {
        return;
      }
      idx++;
      const closingDebit = entry.signedSum > 0 ? Math.round(entry.signedSum * 100) / 100 : 0;
      const closingCredit = entry.signedSum < 0 ? Math.round(Math.abs(entry.signedSum) * 100) / 100 : 0;
      const netBalance = Math.max(closingDebit, closingCredit);
      const rowId = `cons-${period.toLowerCase()}-${idx}`;

      consolidatedRows.push({
        id: rowId,
        accountCode: entry.accountCode || `CON-${String(idx).padStart(3, '0')}`,
        accountName: entry.displayName,
        closingDebit,
        closingCredit,
        netBalance,
        rawLineIndex: idx,
      });

      breakdownMap.set(rowId, entry.breakdowns);
    });
  } else {
    // Keep branch-wise ledger lines separate with [Branch Name] prefix
    let idx = 0;
    activeBranches.forEach((branch) => {
      const sourceRows: TrialBalanceRow[] =
        (period === 'CY' ? branch.cyRawRows : branch.pyRawRows) || [];
      sourceRows.forEach((row) => {
        const dr = Math.round((Number(row.closingDebit) || 0) * 100) / 100;
        const cr = Math.round((Number(row.closingCredit) || 0) * 100) / 100;
        if (dr === 0 && cr === 0) return;
        idx++;
        const rowId = `cons-sep-${period.toLowerCase()}-${branch.branchId}-${idx}`;
        const taggedName = `[${branch.branchName}] ${row.accountName.trim()}`;
        consolidatedRows.push({
          id: rowId,
          accountCode: row.accountCode || `${branch.branchCode || 'BR'}-${idx}`,
          accountName: taggedName,
          closingDebit: dr,
          closingCredit: cr,
          netBalance: Math.abs(dr - cr),
          rawLineIndex: idx,
          branchId: branch.branchId,
          branchName: branch.branchName,
        });
        breakdownMap.set(rowId, [
          {
            branchId: branch.branchId,
            branchName: branch.branchName,
            debit: dr,
            credit: cr,
            netBalance: Math.round((dr - cr) * 100) / 100,
          },
        ]);
      });
    });
  }

  const mappingRes = mapTrialBalanceLedgers(consolidatedRows);
  const normalizedLedgers = normalizeProfitAndLossLedgers(mappingRes.mappedLedgers).map((l) => {
    const bd = l.id ? breakdownMap.get(l.id) : undefined;
    const prevOverride = overrideMap.get(normalizeLedgerKey(l.accountName));
    if (prevOverride) {
      return {
        ...l,
        noteNumber: prevOverride.noteNumber,
        noteName: prevOverride.noteName,
        subCategory: prevOverride.subCategory,
        statement: prevOverride.statement,
        nature: prevOverride.nature,
        isUserOverridden: true,
        mappingMethod: prevOverride.mappingMethod || 'manual',
        branchBreakdown: bd,
      };
    }
    return {
      ...l,
      branchBreakdown: bd,
    };
  });

  // Calculate total closing stock if entered at branch level
  let hasBranchStock = false;
  let totalStock = 0;
  activeBranches.forEach((b) => {
    const st = period === 'CY' ? b.cyClosingStock : b.pyClosingStock;
    if (st !== undefined && st > 0) {
      hasBranchStock = true;
      totalStock += Number(st);
    }
  });

  const branchNamesSummary = activeBranches.map((b) => b.branchName).join(' + ');
  const consolidatedFileName = `Consolidated ${period} TB (${activeBranches.length}/${safeBranches.length} Branches: ${branchNamesSummary})`;

  return {
    rawRows: consolidatedRows,
    mappedLedgers: normalizedLedgers,
    exceptions: mappingRes.exceptions,
    totalDebit: mappingRes.totalDebit,
    totalCredit: mappingRes.totalCredit,
    isTallyBalanced: mappingRes.isTallyBalanced,
    tallyDifference: mappingRes.tallyDifference,
    uploadedBranchesCount: activeBranches.length,
    totalBranchesCount: safeBranches.length,
    consolidatedFileName,
    totalClosingStock: hasBranchStock ? totalStock : undefined,
  };
}

/**
 * Generates a realistic, balanced sample Trial Balance for a specific branch and period ('CY' or 'PY')
 * so users can test multi-branch consolidation in 1 click.
 */
export function generateSampleBranchTrialBalance(
  branchIndex: number,
  branchName: string,
  period: 'CY' | 'PY',
  entityType: EntityConfig['entityType'] = 'Partnership Firm'
): { rows: TrialBalanceRow[]; fileName: string } {
  const baseDataset =
    entityType === 'Sole Proprietorship' ? SAMPLE_DATASETS[1] : SAMPLE_DATASETS[0];
  const sourceRows =
    period === 'PY' && baseDataset.previousYearRows && baseDataset.previousYearRows.length > 0
      ? baseDataset.previousYearRows
      : baseDataset.rows;

  // Scale factor per branch so each branch has realistic distinct numbers that tally 100%
  const scaleFactors = [0.55, 0.30, 0.15, 0.25, 0.20];
  const factor =
    (scaleFactors[branchIndex % scaleFactors.length] || 0.25) *
    (period === 'PY' && (!baseDataset.previousYearRows || baseDataset.previousYearRows.length === 0)
      ? 0.85
      : 1);

  let totalDr = 0;
  let totalCr = 0;

  const scaledRows: TrialBalanceRow[] = sourceRows.map((r, idx) => {
    const dr = r.closingDebit > 0 ? Math.round(r.closingDebit * factor) : 0;
    const cr = r.closingCredit > 0 ? Math.round(r.closingCredit * factor) : 0;
    totalDr += dr;
    totalCr += cr;
    return {
      ...r,
      id: `sample-br-${branchIndex + 1}-${period.toLowerCase()}-${idx + 1}`,
      closingDebit: dr,
      closingCredit: cr,
      netBalance: Math.abs(dr - cr),
      branchId: `branch-${branchIndex + 1}`,
      branchName,
    };
  });

  // Ensure exact debit === credit after rounding
  const diff = totalDr - totalCr;
  if (diff !== 0 && scaledRows.length > 0) {
    if (diff > 0) {
      // Add diff to first credit row
      const crRow = scaledRows.find((r) => r.closingCredit > 0);
      if (crRow) {
        crRow.closingCredit += diff;
        crRow.netBalance = crRow.closingCredit;
      }
    } else {
      const drRow = scaledRows.find((r) => r.closingDebit > 0);
      if (drRow) {
        drRow.closingDebit += Math.abs(diff);
        drRow.netBalance = drRow.closingDebit;
      }
    }
  }

  const safeName = branchName.replace(/[^a-zA-Z0-9_-]/g, '_');
  return {
    rows: scaledRows,
    fileName: `${safeName}_${period}_Trial_Balance.xlsx`,
  };
}

export interface BranchFinancialSummaryItem {
  branchId: string;
  branchName: string;
  branchCode?: string;
  cyFileName?: string;
  pyFileName?: string;
  hasCY: boolean;
  hasPY: boolean;
  cyLedgerCount: number;
  pyLedgerCount: number;
  cyTotalDebit: number;
  cyTotalCredit: number;
  pyTotalDebit: number;
  pyTotalCredit: number;
  cyDebit: number;
  cyCredit: number;
  cyRevenue: number;
  cyExpenses: number;
  cyNetProfit: number;
  cyTotalAssets: number;
  pyDebit: number;
  pyCredit: number;
  pyRevenue: number;
  pyExpenses: number;
  pyNetProfit: number;
  pyTotalAssets: number;
  cy: {
    revenueFromOperations: number;
    otherIncome: number;
    totalRevenue: number;
    costOfGoodsSold: number;
    employeeBenefitsExpense: number;
    financeCosts: number;
    depreciationExpense: number;
    otherExpenses: number;
    partnersRemuneration: number;
    totalExpenses: number;
    profitAfterTax: number;
    ownersCapital: number;
    reservesAndSurplus: number;
    totalNonCurrentLiabilities: number;
    totalCurrentLiabilities: number;
    totalEquityAndLiabilities: number;
    totalNonCurrentAssets: number;
    totalCurrentAssets: number;
    totalAssets: number;
    isBalanced: boolean;
  };
  py: {
    revenueFromOperations: number;
    otherIncome: number;
    totalRevenue: number;
    costOfGoodsSold: number;
    employeeBenefitsExpense: number;
    financeCosts: number;
    depreciationExpense: number;
    otherExpenses: number;
    partnersRemuneration: number;
    totalExpenses: number;
    profitAfterTax: number;
    ownersCapital: number;
    reservesAndSurplus: number;
    totalNonCurrentLiabilities: number;
    totalCurrentLiabilities: number;
    totalEquityAndLiabilities: number;
    totalNonCurrentAssets: number;
    totalCurrentAssets: number;
    totalAssets: number;
    isBalanced: boolean;
  };
}

const EMPTY_PERIOD_SUMMARY = {
  revenueFromOperations: 0,
  otherIncome: 0,
  totalRevenue: 0,
  costOfGoodsSold: 0,
  employeeBenefitsExpense: 0,
  financeCosts: 0,
  depreciationExpense: 0,
  otherExpenses: 0,
  partnersRemuneration: 0,
  totalExpenses: 0,
  profitAfterTax: 0,
  ownersCapital: 0,
  reservesAndSurplus: 0,
  totalNonCurrentLiabilities: 0,
  totalCurrentLiabilities: 0,
  totalEquityAndLiabilities: 0,
  totalNonCurrentAssets: 0,
  totalCurrentAssets: 0,
  totalAssets: 0,
  isBalanced: true,
};

/**
 * Computes standalone CY and PY financial statement summaries for each configured branch
 * so users can inspect Branch-wise vs Consolidated Financials side-by-side for both CY and PY.
 * Accepts either (config: EntityConfig) or (branches: BranchTrialBalanceData[], config: EntityConfig).
 */
export function computeBranchWiseFinancialSummary(
  branchesOrConfig: BranchTrialBalanceData[] | EntityConfig | undefined,
  maybeConfig?: EntityConfig
): BranchFinancialSummaryItem[] {
  const isConfigObject =
    Boolean(branchesOrConfig) &&
    !Array.isArray(branchesOrConfig) &&
    typeof branchesOrConfig === 'object';

  const config: EntityConfig | undefined = isConfigObject
    ? (branchesOrConfig as EntityConfig)
    : maybeConfig;

  const branches: BranchTrialBalanceData[] = Array.isArray(branchesOrConfig)
    ? branchesOrConfig
    : config
    ? ensureBranchesInitialized(config)
    : [];

  if (!Array.isArray(branches) || branches.length === 0 || !config) return [];

  return branches.map((branch) => {
    const cyLedgers: MappedLedger[] =
      branch.cyMappedLedgers && branch.cyMappedLedgers.length > 0
        ? branch.cyMappedLedgers
        : branch.cyRawRows && branch.cyRawRows.length > 0
        ? normalizeProfitAndLossLedgers(mapTrialBalanceLedgers(branch.cyRawRows).mappedLedgers)
        : [];

    const pyLedgers: MappedLedger[] =
      branch.pyMappedLedgers && branch.pyMappedLedgers.length > 0
        ? branch.pyMappedLedgers
        : branch.pyRawRows && branch.pyRawRows.length > 0
        ? normalizeProfitAndLossLedgers(mapTrialBalanceLedgers(branch.pyRawRows).mappedLedgers)
        : [];

    const hasCY = cyLedgers.length > 0;
    const hasPY = pyLedgers.length > 0;

    // Create branch-scoped config (using branch closing stock if provided, else zero)
    const branchConfig: EntityConfig = {
      ...config,
      yearEndAdjustments: {
        ...config.yearEndAdjustments,
        closingStock: branch.cyClosingStock ?? 0,
        pyClosingStock: branch.pyClosingStock ?? 0,
        closingStockCY: branch.cyClosingStock ?? 0,
        closingStockPY: branch.pyClosingStock ?? 0,
        provisionForTaxCY: 0,
        depreciationCY: 0,
        partnerRemunerationCY: 0,
        customAdjustments: [],
      } as any,
    };

    let cySummary = { ...EMPTY_PERIOD_SUMMARY };
    if (hasCY) {
      const cyRes = computePeriodTotals(cyLedgers, branchConfig, `CY - ${branch.branchName}`);
      cySummary = {
        revenueFromOperations: cyRes.profitAndLoss.revenueFromOperations,
        otherIncome: cyRes.profitAndLoss.otherIncome,
        totalRevenue: cyRes.profitAndLoss.totalRevenue,
        costOfGoodsSold: cyRes.profitAndLoss.costOfGoodsSold,
        employeeBenefitsExpense: cyRes.profitAndLoss.employeeBenefitsExpense,
        financeCosts: cyRes.profitAndLoss.financeCosts,
        depreciationExpense: cyRes.profitAndLoss.depreciationExpense,
        otherExpenses: cyRes.profitAndLoss.otherExpenses,
        partnersRemuneration: cyRes.profitAndLoss.partnersRemuneration,
        totalExpenses: cyRes.profitAndLoss.totalExpenses,
        profitAfterTax: cyRes.profitAndLoss.profitAfterTax,
        ownersCapital: cyRes.balanceSheet.ownersCapital,
        reservesAndSurplus: cyRes.balanceSheet.reservesAndSurplus,
        totalNonCurrentLiabilities: cyRes.balanceSheet.totalNonCurrentLiabilities,
        totalCurrentLiabilities: cyRes.balanceSheet.totalCurrentLiabilities,
        totalEquityAndLiabilities: cyRes.balanceSheet.totalEquityAndLiabilities,
        totalNonCurrentAssets: cyRes.balanceSheet.totalNonCurrentAssets,
        totalCurrentAssets: cyRes.balanceSheet.totalCurrentAssets,
        totalAssets: cyRes.balanceSheet.totalAssets,
        isBalanced: cyRes.balanceSheet.isBalanced,
      };
    }

    let pySummary = { ...EMPTY_PERIOD_SUMMARY };
    if (hasPY) {
      const pyRes = computePeriodTotals(pyLedgers, branchConfig, 'Previous Period');
      pySummary = {
        revenueFromOperations: pyRes.profitAndLoss.revenueFromOperations,
        otherIncome: pyRes.profitAndLoss.otherIncome,
        totalRevenue: pyRes.profitAndLoss.totalRevenue,
        costOfGoodsSold: pyRes.profitAndLoss.costOfGoodsSold,
        employeeBenefitsExpense: pyRes.profitAndLoss.employeeBenefitsExpense,
        financeCosts: pyRes.profitAndLoss.financeCosts,
        depreciationExpense: pyRes.profitAndLoss.depreciationExpense,
        otherExpenses: pyRes.profitAndLoss.otherExpenses,
        partnersRemuneration: pyRes.profitAndLoss.partnersRemuneration,
        totalExpenses: pyRes.profitAndLoss.totalExpenses,
        profitAfterTax: pyRes.profitAndLoss.profitAfterTax,
        ownersCapital: pyRes.balanceSheet.ownersCapital,
        reservesAndSurplus: pyRes.balanceSheet.reservesAndSurplus,
        totalNonCurrentLiabilities: pyRes.balanceSheet.totalNonCurrentLiabilities,
        totalCurrentLiabilities: pyRes.balanceSheet.totalCurrentLiabilities,
        totalEquityAndLiabilities: pyRes.balanceSheet.totalEquityAndLiabilities,
        totalNonCurrentAssets: pyRes.balanceSheet.totalNonCurrentAssets,
        totalCurrentAssets: pyRes.balanceSheet.totalCurrentAssets,
        totalAssets: pyRes.balanceSheet.totalAssets,
        isBalanced: pyRes.balanceSheet.isBalanced,
      };
    }

    const cyDebit =
      branch.cyTotalDebit ??
      cyLedgers.reduce((sum, l) => sum + (l.originalDebit || 0), 0);
    const cyCredit =
      branch.cyTotalCredit ??
      cyLedgers.reduce((sum, l) => sum + (l.originalCredit || 0), 0);
    const pyDebit =
      branch.pyTotalDebit ??
      pyLedgers.reduce((sum, l) => sum + (l.originalDebit || 0), 0);
    const pyCredit =
      branch.pyTotalCredit ??
      pyLedgers.reduce((sum, l) => sum + (l.originalCredit || 0), 0);

    return {
      branchId: branch.branchId,
      branchName: branch.branchName,
      branchCode: branch.branchCode,
      cyFileName: branch.cyFileName,
      pyFileName: branch.pyFileName,
      hasCY,
      hasPY,
      cyLedgerCount: cyLedgers.length,
      pyLedgerCount: pyLedgers.length,
      cyTotalDebit: cyDebit,
      cyTotalCredit: cyCredit,
      pyTotalDebit: pyDebit,
      pyTotalCredit: pyCredit,
      cyDebit,
      cyCredit,
      cyRevenue: cySummary.totalRevenue,
      cyExpenses: cySummary.totalExpenses,
      cyNetProfit: cySummary.profitAfterTax,
      cyTotalAssets: cySummary.totalAssets,
      pyDebit,
      pyCredit,
      pyRevenue: pySummary.totalRevenue,
      pyExpenses: pySummary.totalExpenses,
      pyNetProfit: pySummary.profitAfterTax,
      pyTotalAssets: pySummary.totalAssets,
      cy: cySummary,
      py: pySummary,
    };
  });
}
