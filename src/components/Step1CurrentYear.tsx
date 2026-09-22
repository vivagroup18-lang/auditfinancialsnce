import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Trash2,
  Building2,
  Layers,
  Box,
  Eye,
  Check,
  FileText,
  HelpCircle,
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

interface Step1CurrentYearProps {
  config: EntityConfig;
  mappedLedgers: MappedLedger[];
  totalDebit: number;
  totalCredit: number;
  isTallyBalanced: boolean;
  tallyDifference: number;
  tbFileName?: string;
  onUploadTB: (file: File) => void;
  onClearTB: () => void;
  onLoadSample: (datasetId: string) => void;
  onUpdateLedgerNote: (ledgerId: string, newNoteNumber: number) => void;
  onUpdateLedgerDetails?: (ledgerId: string, updatedFields: Partial<MappedLedger>, isPY?: boolean) => void;
  onAddLedger?: (newLedger: Partial<MappedLedger>, isPY?: boolean) => void;
  onDeleteLedger?: (ledgerId: string, isPY?: boolean) => void;
  onTriggerAIMap: (target?: 'CY' | 'PY') => void;
  isAIMapping: boolean;
  onOpenYearEndAdjustments: (target?: 'CY' | 'PY', onProceed?: () => void) => void;
  computedFinancials?: {
    balanceSheet: BalanceSheetData;
    profitAndLoss: ProfitAndLossData;
    noteSchedules: Record<number, NoteScheduleData>;
    computationExceptions: AuditException[];
  } | null;
  onProceedToStep2: () => void;
  onSelectNote?: (noteNumber: number) => void;
  onOpenTradePayables?: () => void;
  onUpdateConfig?: (updated: Partial<EntityConfig>) => void;
}

export const Step1CurrentYear: React.FC<Step1CurrentYearProps> = ({
  config,
  mappedLedgers,
  totalDebit,
  totalCredit,
  isTallyBalanced,
  tallyDifference,
  tbFileName,
  onUploadTB,
  onClearTB,
  onLoadSample,
  onUpdateLedgerNote,
  onUpdateLedgerDetails,
  onAddLedger,
  onDeleteLedger,
  onTriggerAIMap,
  isAIMapping,
  onOpenYearEndAdjustments,
  computedFinancials,
  onProceedToStep2,
  onSelectNote = () => {},
  onOpenTradePayables = () => {},
  onUpdateConfig,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'upload' | 'mapping' | 'statements'>(() => {
    return mappedLedgers && mappedLedgers.length > 0 ? 'mapping' : 'upload';
  });
  const [statementSubView, setStatementSubView] = useState<'bs' | 'pl' | 'notes'>('bs');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDataAvailable = mappedLedgers && mappedLedgers.length > 0;

  const handleProceedWithAdjustmentsCheck = () => {
    if (isDataAvailable && config.yearEndAdjustments?.closingStockCY === undefined && onOpenYearEndAdjustments) {
      onOpenYearEndAdjustments('CY', onProceedToStep2);
    } else {
      onProceedToStep2();
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUploadTB(e.dataTransfer.files[0]);
      setActiveSubTab('mapping');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadTB(e.target.files[0]);
      setActiveSubTab('mapping');
    }
  };

  const handleSampleClick = (id: string) => {
    onLoadSample(id);
    setActiveSubTab('mapping');
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
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Step 1 of 5
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Current Year Engagement • FY {config.financialYear}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Current Year Trial Balance & Draft Statements
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Upload your CY trial balance, review ledger classifications under ICAI Schedules (Notes 3–25), and preview the resulting Balance Sheet & Profit and Loss.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            {isDataAvailable && (
              <button
                type="button"
                onClick={handleProceedWithAdjustmentsCheck}
                className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer"
              >
                <span>Proceed to Step 2: Previous Year</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Step 1 Inner Navigation */}
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
            <span>1. Ingest CY Trial Balance</span>
            {isDataAvailable && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('mapping')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
              activeSubTab === 'mapping'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>2. Ledger Mapping & AI</span>
            {isDataAvailable && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-700 font-bold">
                {mappedLedgers.length} Ledgers
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
            <span>3. Draft Statements & Notes Preview</span>
            {computedFinancials && (
              <span
                className={`w-2 h-2 rounded-full ${
                  computedFinancials.balanceSheet.isBalanced ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-VIEW 1: UPLOAD & INGEST TRIAL BALANCE                                */}
      {/* ========================================================================= */}
      {activeSubTab === 'upload' && (
        <div className="space-y-5">
          {/* Active File Card if loaded */}
          {isDataAvailable && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-900 truncate">
                      {tbFileName || 'Current_Year_Trial_Balance.xlsx'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold">
                      Active CY File
                    </span>
                  </div>
                  <div className="text-xs text-emerald-800 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>{mappedLedgers.length} Ledgers parsed</span>
                    <span>•</span>
                    <span>Debit: {formatINR(totalDebit)}</span>
                    <span>•</span>
                    <span>Credit: {formatINR(totalCredit)}</span>
                    <span>•</span>
                    <span className={`font-bold ${isTallyBalanced ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {isTallyBalanced ? 'Tallied ✅' : `Difference: ${formatINR(tallyDifference)} ⚠️`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('mapping')}
                  className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Review Mappings →</span>
                </button>
                <button
                  type="button"
                  onClick={onClearTB}
                  className="p-2 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs transition cursor-pointer"
                  title="Remove Current Year Trial Balance"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Upload Drop Zone & Sample Starter Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Primary Upload Drop Zone */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Upload Current Year File</h3>
                  <p className="text-xs text-slate-500">
                    Supports Excel (.xlsx, .xls) and CSV exported from Tally, Busy, SAP, or QuickBooks.
                  </p>
                </div>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md">
                  FY {config.financialYear}
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
                    ? 'border-emerald-500 bg-emerald-50/60'
                    : 'border-slate-300 hover:border-emerald-500 hover:bg-slate-50/60 bg-slate-50/30'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Click to browse or drag and drop your Trial Balance here
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Supports Excel (.xlsx, .xls), PDF (.pdf), and CSV/TXT (.csv, .txt) with automatic group reconciliation
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
                  className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:border-emerald-500 text-xs font-semibold text-slate-700 shadow-2xs transition"
                >
                  Select File from Computer
                </button>
              </div>
            </div>

            {/* Quick 1-Click Sample Starters */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-amber-600 mb-1">
                  <Sparkles className="w-4 h-4" />
                  <h3 className="text-sm font-bold text-slate-900">Don't have a file ready?</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Load a verified sample statutory trial balance to immediately test mapping, balance sheets, and audit reports:
                </p>

                <div className="space-y-3 mt-4">
                  {SAMPLE_DATASETS.map((dataset) => (
                    <button
                      key={dataset.id}
                      type="button"
                      onClick={() => handleSampleClick(dataset.id)}
                      className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition flex items-center justify-between group cursor-pointer"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-900">
                          {dataset.name}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {dataset.entityType} • {dataset.financialYear} • {dataset.rows.length} Ledgers
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-emerald-700 opacity-0 group-hover:opacity-100 transition">
                        Load →
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                Statutory ICAI Non-Corporate Entity schedule classifications (Notes 1 to 25) are applied automatically.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 2: TRIAL BALANCE LEDGER MAPPING & AI CLASSIFICATION              */}
      {/* ========================================================================= */}
      {activeSubTab === 'mapping' && (
        <div className="space-y-4">
          <TrialBalanceMapping
            mappedLedgers={mappedLedgers}
            totalDebit={totalDebit}
            totalCredit={totalCredit}
            isTallyBalanced={isTallyBalanced}
            tallyDifference={tallyDifference}
            tbFileName={tbFileName}
            onClearTB={onClearTB}
            onUpdateLedgerNote={onUpdateLedgerNote}
            onUpdateLedgerDetails={onUpdateLedgerDetails}
            onAddLedger={onAddLedger}
            onDeleteLedger={onDeleteLedger}
            onTriggerAIMap={onTriggerAIMap}
            isAIMapping={isAIMapping}
            onOpenYearEndAdjustments={onOpenYearEndAdjustments}
            cyYearLabel={config.financialYear}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 3: DRAFT STATEMENTS & NOTES PREVIEW                              */}
      {/* ========================================================================= */}
      {activeSubTab === 'statements' && computedFinancials && (
        <div className="space-y-5">
          {/* Statement Type Switcher */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-2 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStatementSubView('bs')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                  statementSubView === 'bs'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Current Year Balance Sheet</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    computedFinancials.balanceSheet.isBalanced
                      ? 'bg-emerald-500 text-white'
                      : 'bg-amber-400 text-slate-950'
                  }`}
                >
                  {computedFinancials.balanceSheet.isBalanced ? 'Balanced' : 'Diff'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStatementSubView('pl')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                  statementSubView === 'pl'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Current Year Statement of Profit & Loss</span>
              </button>

              <button
                type="button"
                onClick={() => setStatementSubView('notes')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                  statementSubView === 'notes'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Statutory Notes (1–25)</span>
              </button>
            </div>
          </div>

          {/* Statement Content */}
          {statementSubView === 'bs' && (
            <BalanceSheetView
              balanceSheet={computedFinancials.balanceSheet}
              config={config}
              onSelectNote={(note) => {
                onSelectNote(note);
                setStatementSubView('notes');
              }}
              onOpenTradePayables={onOpenTradePayables}
            />
          )}

          {statementSubView === 'pl' && (
            <ProfitLossView
              profitAndLoss={computedFinancials.profitAndLoss}
              config={config}
              onSelectNote={(note) => {
                onSelectNote(note);
                setStatementSubView('notes');
              }}
            />
          )}

          {statementSubView === 'notes' && (
            <NotesView
              noteSchedules={computedFinancials.noteSchedules}
              config={config}
              onOpenYearEndAdjustments={onOpenYearEndAdjustments}
              onOpenTradePayables={onOpenTradePayables}
              onUpdateConfig={onUpdateConfig}
              profitAndLoss={computedFinancials?.profitAndLoss}
            />
          )}
        </div>
      )}

      {/* Bottom Step Navigation Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex items-center justify-between">
        <div className="text-xs text-slate-500">
          Step 1 of 5 • Current Year Trial Balance & Draft Statements
        </div>
        <button
          type="button"
          onClick={handleProceedWithAdjustmentsCheck}
          className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer"
        >
          <span>Proceed to Step 2: Previous Year Trial Balance & Statements</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
