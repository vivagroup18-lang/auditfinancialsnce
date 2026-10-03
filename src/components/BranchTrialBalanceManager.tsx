import React, { useRef, useState } from 'react';
import {
  Building2,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Layers,
  Sparkles,
  ArrowRight,
  RefreshCw,
  GitMerge,
} from 'lucide-react';
import { BranchTrialBalanceData, EntityConfig } from '../types';
import { syncBranchesWithCount } from '../utils/branchConsolidation';

interface BranchTrialBalanceManagerProps {
  config: EntityConfig;
  period: 'CY' | 'PY';
  onUpdateConfig: (updated: Partial<EntityConfig>) => void;
  onUploadBranchTB: (branchId: string, file: File, period: 'CY' | 'PY') => void;
  onBulkUploadBranchTBs?: (files: File[], period: 'CY' | 'PY') => void;
  onClearBranchTB: (branchId: string, period: 'CY' | 'PY') => void;
  onLoadSampleBranches?: (period: 'CY' | 'PY') => void;
  onUpdateBranchClosingStock?: (branchId: string, stockAmount: number | undefined, period: 'CY' | 'PY') => void;
  onReviewConsolidatedMappings?: () => void;
}

export const BranchTrialBalanceManager: React.FC<BranchTrialBalanceManagerProps> = ({
  config,
  period,
  onUpdateConfig,
  onUploadBranchTB,
  onBulkUploadBranchTBs,
  onClearBranchTB,
  onLoadSampleBranches,
  onUpdateBranchClosingStock,
  onReviewConsolidatedMappings,
}) => {
  const [quickBranchCount, setQuickBranchCount] = useState<number>(2);
  const [dragOverBranchId, setDragOverBranchId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const bulkInputRef = useRef<HTMLInputElement | null>(null);

  const branchCount = config.numberOfBranches ?? (config.branches?.length || 0);
  const branches: BranchTrialBalanceData[] =
    branchCount > 0 ? syncBranchesWithCount(config.branches, branchCount) : [];

  const isCY = period === 'CY';
  const yearLabel = isCY ? config.financialYear || '2025-26' : config.previousFinancialYear || '2024-25';
  const mergeIdentical = config.consolidateIdenticalLedgers !== false;

  const formatINR = (val?: number) => {
    if (val === undefined || isNaN(val)) return '₹ 0.00';
    return '₹ ' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleSetBranchCount = (newCount: number) => {
    const clamped = Math.max(0, Math.min(50, Math.floor(Number(newCount) || 0)));
    const synced = syncBranchesWithCount(config.branches, clamped);
    onUpdateConfig({
      numberOfBranches: clamped,
      branches: synced,
    });
  };

  const handleBranchNameChange = (branchId: string, newName: string) => {
    const updated = branches.map((b) =>
      b.branchId === branchId ? { ...b, branchName: newName } : b
    );
    onUpdateConfig({
      numberOfBranches: updated.length,
      branches: updated,
    });
  };

  const handleRemoveSingleBranch = (branchId: string) => {
    const remaining = branches.filter((b) => b.branchId !== branchId);
    onUpdateConfig({
      numberOfBranches: remaining.length,
      branches: remaining,
    });
  };

  // Summary metrics across branches for current period
  let uploadedCount = 0;
  let sumBranchDebit = 0;
  let sumBranchCredit = 0;
  let totalBranchLedgers = 0;

  branches.forEach((b) => {
    const ledgers = isCY ? b.cyMappedLedgers : b.pyMappedLedgers;
    const dr = isCY ? b.cyTotalDebit || 0 : b.pyTotalDebit || 0;
    const cr = isCY ? b.cyTotalCredit || 0 : b.pyTotalCredit || 0;
    if (ledgers && ledgers.length > 0) {
      uploadedCount++;
      sumBranchDebit += dr;
      sumBranchCredit += cr;
      totalBranchLedgers += ledgers.length;
    }
  });

  const consolidatedDiff = Math.round((sumBranchDebit - sumBranchCredit) * 100) / 100;
  const isConsolidatedTallied = Math.abs(consolidatedDiff) < 1;

  // Compact Enable Banner if company currently has 0 branches configured
  if (branchCount <= 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center shrink-0">
            <GitMerge className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900">
                Multi-Branch Company? Import Trial Balances Branch-wise ({period} • FY {yearLabel})
              </h3>
              <span className="text-xs text-teal-700 font-medium">
                Auto-Consolidated CY &amp; PY Financials
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter the number of branches / units for this company to upload individual branch Trial Balances and automatically generate Consolidated Financial Statements for both Current Year and Previous Year.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <span className="text-xs font-semibold text-slate-600">No. of Branches:</span>
            <input
              type="number"
              min={1}
              max={50}
              value={quickBranchCount}
              onChange={(e) => setQuickBranchCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-14 px-2 py-1 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            type="button"
            onClick={() => handleSetBranchCount(quickBranchCount)}
            className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Enable {quickBranchCount} Branches TB Import</span>
          </button>

          {[2, 3, 4].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handleSetBranchCount(preset)}
              className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
              title={`Configure ${preset} Branches for Branch-wise Trial Balance Consolidation`}
            >
              {preset} Branches
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-emerald-200/90 shadow-xs overflow-hidden">
      {/* Top Consolidation Control Header */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <GitMerge className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white">
                  Branch-wise Trial Balance Import &amp; Consolidation ({isCY ? 'Current Year' : 'Previous Year'} • FY {yearLabel})
                </h3>
                <span className="text-xs text-emerald-300 font-semibold">
                  {uploadedCount} of {branches.length} Branches Imported
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Upload the {isCY ? 'Current Year (CY)' : 'Previous Year (PY)'} Trial Balance for each branch below. All uploaded branches are automatically consolidated into your {isCY ? 'CY' : 'PY'} Balance Sheet, Profit &amp; Loss, and Notes 1–25.
              </p>
            </div>
          </div>

          {/* Controls: Number of Branches, Bulk Upload, Sample Loader */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Number of Branches Adjuster */}
            <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs">
              <span className="text-slate-300 font-medium">No. of Branches:</span>
              <input
                type="number"
                min={0}
                max={50}
                value={branches.length}
                onChange={(e) => handleSetBranchCount(parseInt(e.target.value, 10) || 0)}
                className="w-14 px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-600 text-white font-bold text-center text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
              <button
                type="button"
                onClick={() => handleSetBranchCount(branches.length + 1)}
                className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer"
                title="Add another branch slot"
              >
                + Add
              </button>
            </div>

            {/* Bulk Multi-File Upload */}
            {onBulkUploadBranchTBs && (
              <>
                <input
                  ref={bulkInputRef}
                  type="file"
                  multiple
                  accept=".xlsx,.xls,.csv,.pdf,.txt"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      onBulkUploadBranchTBs(Array.from(e.target.files), period);
                      e.target.value = '';
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => bulkInputRef.current?.click()}
                  className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Select multiple branch Trial Balance files at once to assign across branches"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Bulk Upload {period} Files</span>
                </button>
              </>
            )}

            {/* 1-Click Sample Branch TBs */}
            {onLoadSampleBranches && (
              <button
                type="button"
                onClick={() => onLoadSampleBranches(period)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
                title={`Populate all ${branches.length} branches with sample ${period} Trial Balances to test consolidation`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Load Sample {period} Branches</span>
              </button>
            )}
          </div>
        </div>

        {/* Consolidation Status & Mode Strip */}
        <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <span className="text-slate-400">Branches Uploaded ({period}): </span>
              <strong className="text-white font-mono">
                {uploadedCount} / {branches.length}
              </strong>
            </div>
            <span className="text-slate-600">•</span>
            <div>
              <span className="text-slate-400">Total Branch Ledgers: </span>
              <strong className="text-white font-mono">{totalBranchLedgers}</strong>
            </div>
            <span className="text-slate-600">•</span>
            <div>
              <span className="text-slate-400">Consolidated {period} Debit: </span>
              <strong className="text-emerald-300 font-mono">{formatINR(sumBranchDebit)}</strong>
            </div>
            <span className="text-slate-600">•</span>
            <div>
              <span className="text-slate-400">Consolidated {period} Credit: </span>
              <strong className="text-emerald-300 font-mono">{formatINR(sumBranchCredit)}</strong>
            </div>
            {uploadedCount > 0 && (
              <>
                <span className="text-slate-600">•</span>
                <span
                  className={`font-bold ${
                    isConsolidatedTallied ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {isConsolidatedTallied
                    ? `Consolidated ${period} TB Tallied ✓`
                    : `Consolidated Diff: ${formatINR(Math.abs(consolidatedDiff))}`}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={mergeIdentical}
                onChange={(e) =>
                  onUpdateConfig({ consolidateIdenticalLedgers: e.target.checked })
                }
                className="rounded border-slate-600 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-[11px] font-medium">
                Merge identical ledger heads across branches
              </span>
            </label>

            {uploadedCount > 0 && onReviewConsolidatedMappings && (
              <button
                type="button"
                onClick={onReviewConsolidatedMappings}
                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1 cursor-pointer"
              >
                <span>View Consolidated {period} Mappings</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Branch Upload Cards Grid */}
      <div className="p-4 sm:p-5 bg-slate-50/60 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map((branch, idx) => {
          const branchLedgers = (isCY ? branch.cyMappedLedgers : branch.pyMappedLedgers) || [];
          const branchFileName = isCY ? branch.cyFileName : branch.pyFileName;
          const branchDr = isCY ? branch.cyTotalDebit || 0 : branch.pyTotalDebit || 0;
          const branchCr = isCY ? branch.cyTotalCredit || 0 : branch.pyTotalCredit || 0;
          const branchBalanced = isCY
            ? branch.isCYBalanced !== false
            : branch.isPYBalanced !== false;
          const branchStock = isCY ? branch.cyClosingStock : branch.pyClosingStock;
          const hasBranchTB = branchLedgers.length > 0;
          const isDragging = dragOverBranchId === branch.branchId;

          return (
            <div
              key={branch.branchId}
              className={`rounded-xl border p-4 transition flex flex-col justify-between gap-3 ${
                hasBranchTB
                  ? 'bg-white border-emerald-300 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Card Top: Branch Index, Editable Name & Status */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={branch.branchName}
                      onChange={(e) => handleBranchNameChange(branch.branchId, e.target.value)}
                      placeholder={`Branch ${idx + 1} Name`}
                      className="w-full px-2 py-1 text-xs font-bold text-slate-900 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-transparent hover:border-slate-200 focus:border-emerald-500 rounded-lg focus:outline-none transition truncate"
                      title="Click to rename this branch / unit"
                    />
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {hasBranchTB ? (
                      <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{period} Loaded</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-slate-400">
                        Pending {period}
                      </span>
                    )}
                    {branches.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSingleBranch(branch.branchId)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                        title={`Remove ${branch.branchName}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Hidden File Input for this Branch */}
                <input
                  ref={(el) => {
                    fileInputRefs.current[branch.branchId] = el;
                  }}
                  type="file"
                  accept=".xlsx,.xls,.csv,.pdf,.txt"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      onUploadBranchTB(branch.branchId, e.target.files[0], period);
                      e.target.value = '';
                    }
                  }}
                />

                {/* Uploaded Branch Summary OR Upload Drop Zone */}
                {hasBranchTB ? (
                  <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="font-bold text-emerald-950 truncate"
                        title={branchFileName}
                      >
                        {branchFileName || `${branch.branchName}_${period}.xlsx`}
                      </span>
                      <span className="text-[11px] font-mono font-semibold text-emerald-800 shrink-0">
                        {branchLedgers.length} Ledgers
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-emerald-200/60 text-[11px]">
                      <div>
                        <span className="text-slate-500 block">Branch Debit</span>
                        <strong className="font-mono text-slate-900">{formatINR(branchDr)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Branch Credit</span>
                        <strong className="font-mono text-slate-900">{formatINR(branchCr)}</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <span
                        className={`font-bold ${
                          branchBalanced ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {branchBalanced
                          ? 'Branch TB Tallied ✓'
                          : `Diff: ${formatINR(Math.abs(branchDr - branchCr))}`}
                      </span>
                    </div>

                    {/* Optional Branch-wise Closing Stock Input */}
                    {onUpdateBranchClosingStock && (
                      <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between gap-2">
                        <label className="text-[11px] font-semibold text-slate-700">
                          Branch {period} Closing Stock (₹):
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="any"
                          placeholder="0.00"
                          value={branchStock !== undefined ? branchStock : ''}
                          onChange={(e) => {
                            const val =
                              e.target.value === '' ? undefined : Number(e.target.value);
                            onUpdateBranchClosingStock(branch.branchId, val, period);
                          }}
                          className="w-28 px-2 py-1 text-right font-mono text-xs bg-white border border-emerald-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverBranchId(branch.branchId);
                    }}
                    onDragLeave={() => setDragOverBranchId(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverBranchId(null);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        onUploadBranchTB(branch.branchId, e.dataTransfer.files[0], period);
                      }
                    }}
                    onClick={() => fileInputRefs.current[branch.branchId]?.click()}
                    className={`border-2 border-dashed rounded-xl p-4 text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                      isDragging
                        ? 'border-emerald-500 bg-emerald-50/70'
                        : 'border-slate-300 hover:border-emerald-500 hover:bg-slate-50'
                    }`}
                  >
                    <Upload className="w-5 h-5 text-emerald-600" />
                    <div className="text-xs font-semibold text-slate-800">
                      Upload {period} Trial Balance
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Drop .xlsx, .csv, or .pdf for {branch.branchName}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => fileInputRefs.current[branch.branchId]?.click()}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{hasBranchTB ? `Replace ${period} TB` : `Select ${period} File`}</span>
                </button>

                {hasBranchTB && (
                  <button
                    type="button"
                    onClick={() => onClearBranchTB(branch.branchId, period)}
                    className="py-1.5 px-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition cursor-pointer"
                    title={`Clear ${period} Trial Balance for ${branch.branchName}`}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
