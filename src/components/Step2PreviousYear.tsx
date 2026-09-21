import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Building2,
  Layers,
  Box,
  Eye,
  Check,
  FileText,
  SkipForward,
} from 'lucide-react';
import {
  EntityConfig,
  MappedLedger,
  BalanceSheetData,
  ProfitAndLossData,
  NoteScheduleData,
  AuditException,
} from '../types';
import { SAMPLE_DATASETS } from '../data/sampleTrialBalances';
import { TrialBalanceMapping } from './TrialBalanceMapping';
import { BalanceSheetView } from './BalanceSheetView';
import { ProfitLossView } from './ProfitLossView';
import { NotesView } from './NotesView';

interface Step2PreviousYearProps {
  config: EntityConfig;
  pyMappedLedgers: MappedLedger[];
  pyTotalDebit: number;
  pyTotalCredit: number;
  isPYTallyBalanced: boolean;
  pyTallyDifference: number;
  pyFileName?: string;
  onUploadPYTB: (file: File) => void;
  onClearPYTB: () => void;
  onUpdatePyLedgerNote: (ledgerId: string, newNoteNumber: number) => void;
  onUpdateLedgerDetails?: (ledgerId: string, updatedFields: Partial<MappedLedger>, isPY?: boolean) => void;
  onAddLedger?: (newLedger: Partial<MappedLedger>, isPY?: boolean) => void;
  onDeleteLedger?: (ledgerId: string, isPY?: boolean) => void;
  onTriggerAIMap: () => void;
  isAIMapping: boolean;
  pyComputedFinancials?: {
    balanceSheet: Omit<BalanceSheetData, 'previousYear'>;
    profitAndLoss: Omit<ProfitAndLossData, 'previousYear'>;
    noteSchedules: Record<number, NoteScheduleData>;
    computationExceptions: AuditException[];
  } | null;
  onBackToStep1: () => void;
  onProceedToStep3: () => void;
  onSelectNote?: (noteNumber: number) => void;
  onUpdateConfig?: (updated: Partial<EntityConfig>) => void;
}

export const Step2PreviousYear: React.FC<Step2PreviousYearProps> = ({
  config,
  onUpdateConfig,
  pyMappedLedgers,
  pyTotalDebit,
  pyTotalCredit,
  isPYTallyBalanced,
  pyTallyDifference,
  pyFileName,
  onUploadPYTB,
  onClearPYTB,
  onUpdatePyLedgerNote,
  onUpdateLedgerDetails,
  onAddLedger,
  onDeleteLedger,
  onTriggerAIMap,
  isAIMapping,
  pyComputedFinancials,
  onBackToStep1,
  onProceedToStep3,
  onSelectNote = () => {},
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'upload' | 'mapping' | 'statements'>(() => {
    return pyMappedLedgers && pyMappedLedgers.length > 0 ? 'mapping' : 'upload';
  });
  const [statementSubView, setStatementSubView] = useState<'bs' | 'pl' | 'notes'>('bs');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDataAvailable = pyMappedLedgers && pyMappedLedgers.length > 0;
  const pyYearLabel = config.previousFinancialYear || '2023-24';

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUploadPYTB(e.dataTransfer.files[0]);
      setActiveSubTab('mapping');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadPYTB(e.target.files[0]);
      setActiveSubTab('mapping');
    }
  };

  const handleLoadSamplePY = () => {
    // Pick the sample partnership dataset for comparative testing
    const sample = SAMPLE_DATASETS[0];
    if (sample) {
      // Simulate file or parse directly
      const mockBlob = new Blob(['Account,Debit,Credit\n'], { type: 'text/csv' });
      const mockFile = new File([mockBlob], `Sample_Comparative_${pyYearLabel}.csv`, { type: 'text/csv' });
      onUploadPYTB(mockFile);
      setActiveSubTab('mapping');
    }
  };

  const formatINR = (val?: number) => {
    if (val === undefined || isNaN(val)) return '₹ 0.00';
    return '₹ ' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                Step 2 of 5
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Comparative Prior Year • FY {pyYearLabel}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Previous Year Trial Balance & Draft Statements
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Upload your prior year comparative trial balance, review classifications, and preview prior year financial statements.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
            <button
              type="button"
              onClick={onBackToStep1}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Step 1</span>
            </button>

            <button
              type="button"
              onClick={onProceedToStep3}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <span>{isDataAvailable ? 'Proceed to Step 3: Comparative Statements' : 'Skip to Step 3 (First Year / No PY)'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step 2 Inner Navigation */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-100 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('upload')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
              activeSubTab === 'upload'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>1. Ingest PY Trial Balance</span>
            {isDataAvailable && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('mapping')}
            disabled={!isDataAvailable}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              activeSubTab === 'mapping'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>2. PY Ledger Mapping</span>
            {isDataAvailable && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-700 font-bold">
                {pyMappedLedgers.length} Ledgers
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('statements')}
            disabled={!isDataAvailable}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              activeSubTab === 'statements'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>3. PY Draft Statements & Notes</span>
            {pyComputedFinancials && (
              <span
                className={`w-2 h-2 rounded-full ${
                  pyComputedFinancials.balanceSheet.isBalanced
                    ? 'bg-emerald-500'
                    : 'bg-amber-500'
                }`}
              />
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-VIEW 1: UPLOAD & INGEST PREVIOUS YEAR TB                             */}
      {/* ========================================================================= */}
      {activeSubTab === 'upload' && (
        <div className="space-y-5">
          {/* Active PY File Card if loaded */}
          {isDataAvailable && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-indigo-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-900 truncate">
                      {pyFileName || 'Previous_Year_Trial_Balance.xlsx'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-900 font-bold">
                      Active PY File
                    </span>
                  </div>
                  <div className="text-xs text-indigo-800 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>{pyMappedLedgers.length} Ledgers parsed</span>
                    <span>•</span>
                    <span>Debit: {formatINR(pyTotalDebit)}</span>
                    <span>•</span>
                    <span>Credit: {formatINR(pyTotalCredit)}</span>
                    <span>•</span>
                    <span className={`font-bold ${isPYTallyBalanced ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {isPYTallyBalanced ? 'Tallied ✅' : `Difference: ${formatINR(pyTallyDifference)} ⚠️`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('mapping')}
                  className="px-3.5 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Review PY Mappings →</span>
                </button>
                <button
                  type="button"
                  onClick={onClearPYTB}
                  className="p-2 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs transition cursor-pointer"
                  title="Remove Previous Year Trial Balance"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Upload Drop Zone & First Year / Skip Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Primary Upload Drop Zone */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Upload Prior Year Comparative File</h3>
                  <p className="text-xs text-slate-500">
                    Upload the audited trial balance from the previous financial year ({pyYearLabel}).
                  </p>
                </div>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md">
                  FY {pyYearLabel}
                </span>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition cursor-pointer flex flex-col items-center justify-center gap-3 ${
                  dragOver
                    ? 'border-indigo-500 bg-indigo-50/60'
                    : 'border-slate-300 hover:border-indigo-500 hover:bg-slate-50/60 bg-slate-50/30'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Click to browse or drag and drop Previous Year Trial Balance here
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Supports Excel (.xlsx, .xls), PDF (.pdf), and CSV/TXT (.csv, .txt) with Account Name, Debit, and Credit columns
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.pdf,.txt"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:border-indigo-500 text-xs font-semibold text-slate-700 shadow-2xs transition"
                >
                  Select File from Computer
                </button>
              </div>
            </div>

            {/* First Year of Business / Skip Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-indigo-700 mb-1">
                  <SkipForward className="w-4 h-4" />
                  <h3 className="text-sm font-bold text-slate-900">First Year of Business?</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  If this entity was incorporated or formed during the current financial year ({config.financialYear}), comparative figures are not required under statutory guidelines.
                </p>

                <div className="pt-4">
                  <button
                    type="button"
                    onClick={onProceedToStep3}
                    className="w-full p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition flex items-center justify-between group cursor-pointer text-left"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-900">
                        No Previous Year Data
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Proceed directly to Consolidated Statements
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-emerald-700 opacity-0 group-hover:opacity-100 transition shrink-0" />
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                You can always return to this step later if prior year audit records become available.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 2: PY TRIAL BALANCE LEDGER MAPPING                              */}
      {/* ========================================================================= */}
      {activeSubTab === 'mapping' && (
        <div className="space-y-4">
          <TrialBalanceMapping
            mappedLedgers={pyMappedLedgers}
            totalDebit={pyTotalDebit}
            totalCredit={pyTotalCredit}
            isTallyBalanced={isPYTallyBalanced}
            tallyDifference={pyTallyDifference}
            tbFileName={pyFileName}
            onClearTB={onClearPYTB}
            onUpdateLedgerNote={onUpdatePyLedgerNote}
            onUpdateLedgerDetails={(id, fields) => onUpdateLedgerDetails && onUpdateLedgerDetails(id, fields, true)}
            onAddLedger={(ledger) => onAddLedger && onAddLedger(ledger, true)}
            onDeleteLedger={(id) => onDeleteLedger && onDeleteLedger(id, true)}
            onTriggerAIMap={onTriggerAIMap}
            isAIMapping={isAIMapping}
            cyYearLabel={pyYearLabel}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 3: PY DRAFT STATEMENTS & NOTES PREVIEW                          */}
      {/* ========================================================================= */}
      {activeSubTab === 'statements' && pyComputedFinancials && (
        <div className="space-y-5">
          {/* Statement Type Switcher */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-2 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStatementSubView('bs')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                  statementSubView === 'bs'
                    ? 'bg-indigo-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Previous Year Balance Sheet ({pyYearLabel})</span>
              </button>

              <button
                type="button"
                onClick={() => setStatementSubView('pl')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                  statementSubView === 'pl'
                    ? 'bg-indigo-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Previous Year Profit & Loss ({pyYearLabel})</span>
              </button>

              <button
                type="button"
                onClick={() => setStatementSubView('notes')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                  statementSubView === 'notes'
                    ? 'bg-indigo-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>PY Statutory Notes</span>
              </button>
            </div>
          </div>

          {/* Statement Content */}
          {statementSubView === 'bs' && (
            <BalanceSheetView
              balanceSheet={pyComputedFinancials.balanceSheet as any}
              config={{
                ...config,
                financialYear: pyYearLabel,
                reportingPeriod: config.previousReportingPeriod || 'March 31, 2024',
              }}
              onSelectNote={(note) => {
                onSelectNote(note);
                setStatementSubView('notes');
              }}
            />
          )}

          {statementSubView === 'pl' && (
            <ProfitLossView
              profitAndLoss={pyComputedFinancials.profitAndLoss as any}
              config={{
                ...config,
                financialYear: pyYearLabel,
                reportingPeriod: config.previousReportingPeriod || 'March 31, 2024',
              }}
              onSelectNote={(note) => {
                onSelectNote(note);
                setStatementSubView('notes');
              }}
            />
          )}

          {statementSubView === 'notes' && (
            <NotesView
              noteSchedules={pyComputedFinancials.noteSchedules}
              config={{
                ...config,
                financialYear: pyYearLabel,
                reportingPeriod: config.previousReportingPeriod || 'March 31, 2024',
              }}
              onUpdateConfig={onUpdateConfig}
              profitAndLoss={pyComputedFinancials.profitAndLoss}
            />
          )}
        </div>
      )}

      {/* Bottom Step Navigation Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToStep1}
          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Step 1: Current Year</span>
        </button>

        <div className="text-xs text-slate-500">
          Step 2 of 5 • Previous Year Comparative Data
        </div>

        <button
          type="button"
          onClick={onProceedToStep3}
          className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer"
        >
          <span>Proceed to Step 3: Comparative Statements</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
