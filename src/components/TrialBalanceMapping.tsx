import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  Filter,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ShieldAlert,
  Calendar,
  Upload,
  FileSpreadsheet,
  Trash2,
  ArrowRight,
  Link2,
  Box,
  Pencil,
  Plus,
  X,
  Save,
  Edit3,
} from 'lucide-react';
import { MappedLedger, StatementType } from '../types';
import { NCE_NOTE_DEFINITIONS } from '../data/nceTaxonomy';

interface TrialBalanceMappingProps {
  mappedLedgers: MappedLedger[];
  totalDebit: number;
  totalCredit: number;
  isTallyBalanced: boolean;
  tallyDifference: number;
  onUpdateLedgerNote: (ledgerId: string, newNoteNumber: number) => void;
  onUpdateLedgerDetails?: (ledgerId: string, updatedFields: Partial<MappedLedger>, isPY?: boolean) => void;
  onAddLedger?: (newLedger: Partial<MappedLedger>, isPY?: boolean) => void;
  onDeleteLedger?: (ledgerId: string, isPY?: boolean) => void;
  onTriggerAIMap: () => void;
  isAIMapping: boolean;
  onOpenYearEndAdjustments?: () => void;

  // Previous Year comparative support
  pyMappedLedgers?: MappedLedger[];
  pyTotalDebit?: number;
  pyTotalCredit?: number;
  isPYTallyBalanced?: boolean;
  pyTallyDifference?: number;
  pyFileName?: string;
  tbFileName?: string;
  onUpdatePyLedgerNote?: (ledgerId: string, newNoteNumber: number) => void;
  onUploadPYTB?: (file: File) => void;
  onClearPYTB?: () => void;
  onClearTB?: () => void;
  cyYearLabel?: string;
  pyYearLabel?: string;
}

// Modal Component for Altering or Adding Trial Balance Ledger Text & Amounts
const EditLedgerModal: React.FC<{
  isOpen: boolean;
  ledger: Partial<MappedLedger> | null;
  isNew?: boolean;
  onClose: () => void;
  onSave: (data: Partial<MappedLedger>) => void;
  selectableNotes: typeof NCE_NOTE_DEFINITIONS;
}> = ({ isOpen, ledger, isNew, onClose, onSave, selectableNotes }) => {
  const [accountName, setAccountName] = useState(ledger?.accountName || '');
  const [accountCode, setAccountCode] = useState(ledger?.accountCode || '');
  const [originalDebit, setOriginalDebit] = useState<string | number>(ledger?.originalDebit ?? 0);
  const [originalCredit, setOriginalCredit] = useState<string | number>(ledger?.originalCredit ?? 0);
  const [noteNumber, setNoteNumber] = useState<number>(ledger?.noteNumber || 20);
  const [subCategory, setSubCategory] = useState<string>(ledger?.subCategory || '');

  React.useEffect(() => {
    if (ledger) {
      setAccountName(ledger.accountName || '');
      setAccountCode(ledger.accountCode || '');
      setOriginalDebit(ledger.originalDebit ?? 0);
      setOriginalCredit(ledger.originalCredit ?? 0);
      setNoteNumber(ledger.noteNumber || 20);
      setSubCategory(ledger.subCategory || '');
    } else {
      setAccountName('');
      setAccountCode('');
      setOriginalDebit(0);
      setOriginalCredit(0);
      setNoteNumber(20);
      setSubCategory('');
    }
  }, [ledger, isOpen]);

  if (!isOpen) return null;

  const currentNoteDef = NCE_NOTE_DEFINITIONS.find((n) => n.noteNumber === noteNumber);
  const availableSubCats = currentNoteDef?.subCategories || ['General Schedule'];

  const drNum = Number(originalDebit) || 0;
  const crNum = Number(originalCredit) || 0;
  const netBal = drNum - crNum;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName.trim()) return;
    onSave({
      accountName: accountName.trim(),
      accountCode: accountCode.trim(),
      originalDebit: drNum,
      originalCredit: crNum,
      noteNumber,
      subCategory: subCategory || availableSubCats[0],
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              {isNew ? '+' : '✏️'}
            </div>
            <div>
              <h3 className="text-sm font-bold">
                {isNew ? 'Add New Trial Balance Ledger Account' : 'Alter Trial Balance Ledger Text & Amounts'}
              </h3>
              <p className="text-[11px] text-slate-300">
                {isNew
                  ? 'Manually enter a new trial balance ledger into the active statement dataset'
                  : `Editing ledger account text: "${ledger?.accountName}"`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Account Name */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Trial Balance Ledger Account Text / Name <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Excess Provision Return Back, Rent Income, Machinery Account"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 font-medium"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              This exact text will be displayed across Notes to Accounts, P&amp;L, Balance Sheet, and Excel exports.
            </p>
          </div>

          {/* Account Code */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Account Code / Ledger Reference (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. 1001, INC-402"
              value={accountCode}
              onChange={(e) => setAccountCode(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono text-slate-900"
            />
          </div>

          {/* Debit & Credit Amounts */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Debit Amount (₹)</label>
              <input
                type="number"
                step="any"
                min="0"
                value={originalDebit}
                onChange={(e) => setOriginalDebit(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono font-semibold text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Credit Amount (₹)</label>
              <input
                type="number"
                step="any"
                min="0"
                value={originalCredit}
                onChange={(e) => setOriginalCredit(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono font-semibold text-slate-900"
              />
            </div>
          </div>

          {/* Net Balance Preview */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
            <span className="font-semibold text-slate-600 text-[11px]">Computed Net Closing Balance:</span>
            <span
              className={`font-mono font-bold ${
                netBal > 0 ? 'text-blue-700' : netBal < 0 ? 'text-emerald-700' : 'text-slate-700'
              }`}
            >
              ₹{Math.abs(netBal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
              {netBal > 0 ? '(Debit)' : netBal < 0 ? '(Credit)' : '(Zero)'}
            </span>
          </div>

          {/* Statutory Note Assignment */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">Statutory ICAI Note Schedule</label>
            <select
              value={noteNumber}
              onChange={(e) => {
                const num = Number(e.target.value);
                setNoteNumber(num);
                const nDef = NCE_NOTE_DEFINITIONS.find((n) => n.noteNumber === num);
                if (nDef && nDef.subCategories?.[0]) {
                  setSubCategory(nDef.subCategories[0]);
                }
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium text-slate-800"
            >
              {selectableNotes.map((n) => (
                <option key={n.noteNumber} value={n.noteNumber}>
                  Note {n.noteNumber}: {n.name} ({n.statement === 'BalanceSheet' ? 'Balance Sheet' : 'P&amp;L'})
                </option>
              ))}
            </select>
          </div>

          {/* Sub-Category Assignment */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Sub-Schedule Classification</label>
            <select
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium text-slate-800"
            >
              {availableSubCats.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-xs transition flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isNew ? 'Add Ledger Account' : 'Save Text Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const TrialBalanceMapping: React.FC<TrialBalanceMappingProps> = ({
  mappedLedgers,
  totalDebit,
  totalCredit,
  isTallyBalanced,
  tallyDifference,
  onUpdateLedgerNote,
  onUpdateLedgerDetails,
  onAddLedger,
  onDeleteLedger,
  onTriggerAIMap,
  isAIMapping,
  onOpenYearEndAdjustments,
  pyMappedLedgers = [],
  pyTotalDebit = 0,
  pyTotalCredit = 0,
  isPYTallyBalanced = true,
  pyTallyDifference = 0,
  pyFileName,
  tbFileName,
  onUpdatePyLedgerNote,
  onUploadPYTB,
  onClearPYTB,
  onClearTB,
  cyYearLabel = '2024-25',
  pyYearLabel = '2023-24',
}) => {
  const [selectedYear, setSelectedYear] = useState<'CY' | 'PY'>('CY');
  const [searchTerm, setSearchTerm] = useState('');
  const [statementFilter, setStatementFilter] = useState<'ALL' | StatementType>('ALL');
  const [noteFilter, setNoteFilter] = useState<string>('ALL');
  const [flagFilter, setFlagFilter] = useState<'ALL' | 'AUDIT_FLAG' | 'LOW_CONFIDENCE'>('ALL');
  const [dragOverPY, setDragOverPY] = useState(false);

  // Modal State for Altering / Adding Ledgers
  const [editingLedger, setEditingLedger] = useState<MappedLedger | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Custom In-App Modal States for Deletion (Bypasses iframe window.confirm blockage)
  const [deletingLedger, setDeletingLedger] = useState<MappedLedger | null>(null);
  const [confirmClearTB, setConfirmClearTB] = useState(false);
  const [confirmClearPYTB, setConfirmClearPYTB] = useState(false);

  const pyFileInputRef = useRef<HTMLInputElement>(null);

  const isViewingCY = selectedYear === 'CY';
  const currentActiveLedgers = isViewingCY ? mappedLedgers : pyMappedLedgers;
  const currentTotalDebit = isViewingCY ? totalDebit : pyTotalDebit;
  const currentTotalCredit = isViewingCY ? totalCredit : pyTotalCredit;
  const currentIsBalanced = isViewingCY ? isTallyBalanced : isPYTallyBalanced;
  const currentDifference = isViewingCY ? tallyDifference : pyTallyDifference;
  const currentUpdateHandler = isViewingCY ? onUpdateLedgerNote : (onUpdatePyLedgerNote || onUpdateLedgerNote);

  // Available notes (Notes 3 to 25)
  const selectableNotes = useMemo(() => {
    return NCE_NOTE_DEFINITIONS.filter((n) => n.noteNumber >= 3);
  }, []);

  const filteredLedgers = useMemo(() => {
    return currentActiveLedgers.filter((l) => {
      // Search
      const searchMatch =
        l.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.accountCode && l.accountCode.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!searchMatch) return false;

      // Statement filter
      if (statementFilter !== 'ALL' && l.statement !== statementFilter) return false;

      // Note filter
      if (noteFilter !== 'ALL' && l.noteNumber !== Number(noteFilter)) return false;

      // Flag filter
      if (flagFilter === 'AUDIT_FLAG' && !l.auditFlag) return false;
      if (flagFilter === 'LOW_CONFIDENCE' && l.confidence >= 0.7) return false;

      return true;
    });
  }, [currentActiveLedgers, searchTerm, statementFilter, noteFilter, flagFilter]);

  const stats = useMemo(() => {
    const totalCount = currentActiveLedgers.length;
    const lowConfCount = currentActiveLedgers.filter((l) => l.confidence < 0.7).length;
    const flaggedCount = currentActiveLedgers.filter((l) => !!l.auditFlag).length;
    const bsCount = currentActiveLedgers.filter((l) => l.statement === 'BalanceSheet').length;
    const plCount = currentActiveLedgers.filter((l) => l.statement === 'ProfitAndLoss').length;

    return { totalCount, lowConfCount, flaggedCount, bsCount, plCount };
  }, [currentActiveLedgers]);

  const handlePYDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverPY(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0] && onUploadPYTB) {
      onUploadPYTB(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-5">
      {/* Year Selection Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedYear('CY')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              isViewingCY
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span>Current Year (FY {cyYearLabel})</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isViewingCY ? 'bg-slate-800 text-emerald-300' : 'bg-slate-200 text-slate-800'
              }`}
            >
              {mappedLedgers.length} Ledgers
            </span>
          </button>

          <button
            onClick={() => setSelectedYear('PY')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              !isViewingCY
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>Previous Year (FY {pyYearLabel})</span>
            {pyMappedLedgers.length > 0 ? (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  !isViewingCY ? 'bg-slate-800 text-indigo-300' : 'bg-indigo-100 text-indigo-800'
                }`}
              >
                {pyMappedLedgers.length} Ledgers
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800">
                Not Uploaded
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {onOpenYearEndAdjustments && (
            <button
              type="button"
              onClick={onOpenYearEndAdjustments}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold text-xs transition"
              title="Enter Closing Stock valuation and missing year-end adjustment items"
            >
              <Box className="w-3.5 h-3.5 text-emerald-700" />
              <span>Closing Stock &amp; Adjustments</span>
            </button>
          )}

          {isViewingCY ? (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 hidden sm:inline truncate max-w-[240px]">
                {tbFileName ? `File: ${tbFileName}` : 'Active: Current reporting period trial balance'}
              </span>
              {mappedLedgers.length > 0 && onClearTB && (
                <button
                  type="button"
                  onClick={() => setConfirmClearTB(true)}
                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                  title="Clear Current Year Trial Balance"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : pyMappedLedgers.length > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 truncate max-w-[240px]">File: {pyFileName}</span>
              {onClearPYTB && (
                <button
                  type="button"
                  onClick={() => setConfirmClearPYTB(true)}
                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                  title="Remove Previous Year TB"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <span className="text-amber-700 font-medium hidden sm:inline">
              Upload PY Trial Balance to populate exact comparative figures
            </span>
          )}
        </div>
      </div>

      {/* When Viewing PY and No PY Uploaded: Show clean upload dropzone */}
      {!isViewingCY && pyMappedLedgers.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Upload Previous Year Trial Balance</h3>
              <p className="text-xs text-slate-500 mt-1">
                Upload your audited trial balance for FY {pyYearLabel}. All ledgers will be automatically mapped to ICAI Notes 1 to 25 to generate statutory comparative columns.
              </p>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverPY(true);
              }}
              onDragLeave={() => setDragOverPY(false)}
              onDrop={handlePYDrop}
              onClick={() => pyFileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 cursor-pointer transition ${
                dragOverPY ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <input
                type="file"
                ref={pyFileInputRef}
                className="hidden"
                accept=".xlsx,.xls,.csv,.pdf,.txt"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0] && onUploadPYTB) {
                    onUploadPYTB(e.target.files[0]);
                  }
                }}
              />
              <FileSpreadsheet className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-800">
                Click to browse or drag &amp; drop Previous Year TB (.xlsx, .pdf, .csv)
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Tally, Busy, SAP, Marg, or custom CA Trial Balance format
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setSelectedYear('CY')}
                className="text-xs text-slate-600 hover:text-slate-900 font-medium"
              >
                ← Return to Current Year Mapping
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Mathematical Tally & Summary Header */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Debit Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium block">
                  {isViewingCY ? 'CY' : 'PY'} Total Debits
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {isViewingCY ? `FY ${cyYearLabel}` : `FY ${pyYearLabel}`}
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-lg font-bold text-slate-900 font-mono">
                  {currentTotalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                  Assets &amp; Expenses
                </span>
              </div>
            </div>

            {/* Total Credit Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium block">
                  {isViewingCY ? 'CY' : 'PY'} Total Credits
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {isViewingCY ? `FY ${cyYearLabel}` : `FY ${pyYearLabel}`}
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-lg font-bold text-slate-900 font-mono">
                  {currentTotalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">
                  Liabilities &amp; Income
                </span>
              </div>
            </div>

            {/* Tally Variance Check */}
            <div
              className={`rounded-xl border p-4 shadow-xs ${
                currentIsBalanced
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                  : 'bg-rose-50/70 border-rose-200 text-rose-950'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Tally Verification</span>
                {currentIsBalanced ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" /> Tallied
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-bold text-rose-700">
                    <AlertTriangle className="w-4 h-4" /> Out of Balance
                  </span>
                )}
              </div>
              <div className="mt-1">
                <span className="text-sm font-bold font-mono">
                  {currentIsBalanced
                    ? '0.00 Variance (Balanced)'
                    : `Difference: ${Math.abs(currentDifference).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </span>
                {!currentIsBalanced && (
                  <p className="text-[10px] text-rose-700 mt-0.5">
                    Debits and Credits must tally before audit sign-off.
                  </p>
                )}
              </div>
            </div>

            {/* Mapping Quality & Classification */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Ledger Classifications</span>
                <span className="text-xs font-bold text-slate-900">{stats.totalCount} Ledgers</span>
              </div>
              <div className="flex items-center gap-2 mt-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                  {stats.bsCount} BS
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                  {stats.plCount} P&amp;L
                </span>
                {stats.flaggedCount > 0 && (
                  <button
                    onClick={() => setFlagFilter('AUDIT_FLAG')}
                    className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium hover:bg-amber-200 transition"
                  >
                    {stats.flaggedCount} Flags
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* AI Schedule Mapping Agent Banner */}
          {isViewingCY && stats.totalCount > 0 && (
            <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-800">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white tracking-tight">AI Schedule Mapping Agent</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Gemini 3.8 Flash
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Evaluate uploaded Trial Balance ledgers against statutory ICAI Non-Corporate Entity schedules (Notes 3 to 25).
                  </p>
                </div>
              </div>
              <button
                onClick={onTriggerAIMap}
                disabled={isAIMapping}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition whitespace-nowrap cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>Launch AI Mapping Agent</span>
              </button>
            </div>
          )}

          {/* Filter and Action Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search Input */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={`Search ${isViewingCY ? 'Current Year' : 'Previous Year'} ledgers by name or code...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {onAddLedger && (
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition"
                    title="Add a new ledger account or alter imported trial balance text"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add / Alter Ledger</span>
                  </button>
                )}

                {isViewingCY && (
                  <button
                    onClick={onTriggerAIMap}
                    disabled={isAIMapping}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer"
                    title="Run Gemini AI to verify or classify ambiguous ledgers"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isAIMapping ? 'animate-spin' : ''}`} />
                    <span>AI Mapping Agent</span>
                  </button>
                )}

                {/* Upload or Replace button */}
                <input
                  type="file"
                  ref={pyFileInputRef}
                  className="hidden"
                  accept=".xlsx,.xls,.csv,.pdf,.txt"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0] && onUploadPYTB) {
                      onUploadPYTB(e.target.files[0]);
                    }
                  }}
                />
                {!isViewingCY && onUploadPYTB && (
                  <button
                    onClick={() => pyFileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Replace PY File</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1 text-slate-400 mr-2 text-xs">
                <Filter className="w-3.5 h-3.5" />
                <span className="font-medium text-slate-600">Filters:</span>
              </div>

              {/* Statement filter */}
              <div className="flex rounded-md shadow-2xs border border-slate-200 overflow-hidden">
                {(['ALL', 'BalanceSheet', 'ProfitAndLoss'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatementFilter(st)}
                    className={`px-2.5 py-1 text-xs font-medium transition ${
                      statementFilter === st
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {st === 'ALL' ? 'All Statements' : st === 'BalanceSheet' ? 'Balance Sheet' : 'P&amp;L'}
                  </button>
                ))}
              </div>

              {/* Note Filter Dropdown */}
              <select
                value={noteFilter}
                onChange={(e) => setNoteFilter(e.target.value)}
                className="px-2.5 py-1 rounded-md border border-slate-200 text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ALL">All Statutory Notes (3-25)</option>
                {selectableNotes.map((n) => (
                  <option key={n.noteNumber} value={n.noteNumber}>
                    Note {n.noteNumber}: {n.name}
                  </option>
                ))}
              </select>

              {/* Flag filter */}
              <div className="flex rounded-md shadow-2xs border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setFlagFilter('ALL')}
                  className={`px-2.5 py-1 text-xs font-medium transition ${
                    flagFilter === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  All Items
                </button>
                <button
                  onClick={() => setFlagFilter('AUDIT_FLAG')}
                  className={`px-2.5 py-1 text-xs font-medium transition ${
                    flagFilter === 'AUDIT_FLAG'
                      ? 'bg-amber-600 text-white'
                      : 'bg-white text-amber-700 hover:bg-amber-50'
                  }`}
                >
                  Audit Flags ({stats.flaggedCount})
                </button>
                <button
                  onClick={() => setFlagFilter('LOW_CONFIDENCE')}
                  className={`px-2.5 py-1 text-xs font-medium transition ${
                    flagFilter === 'LOW_CONFIDENCE'
                      ? 'bg-rose-600 text-white'
                      : 'bg-white text-rose-700 hover:bg-rose-50'
                  }`}
                >
                  Low Confidence ({stats.lowConfCount})
                </button>
              </div>
            </div>
          </div>

          {/* Mapped Ledgers Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-3 px-3 w-16">Code</th>
                    <th className="py-3 px-3 min-w-[240px]">Ledger Account Name</th>
                    <th className="py-3 px-3 text-right">Debit (₹)</th>
                    <th className="py-3 px-3 text-right">Credit (₹)</th>
                    <th className="py-3 px-3 text-right">Net Closing (₹)</th>
                    <th className="py-3 px-3 min-w-[260px]">Statutory ICAI Schedule Assignment</th>
                    <th className="py-3 px-3 text-center">Confidence</th>
                    <th className="py-3 px-3 text-center w-20">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-normal">
                  {filteredLedgers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-slate-400 text-xs">
                        No ledger accounts matching the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredLedgers.map((ledger) => {
                      const hasFlag = !!ledger.auditFlag;
                      return (
                        <tr
                          key={ledger.id}
                          className={`hover:bg-slate-50/70 transition-colors ${
                            hasFlag ? 'bg-amber-50/30' : ''
                          }`}
                        >
                          {/* Code */}
                          <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                            {ledger.accountCode || '-'}
                          </td>

                          {/* Name & Flags */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center justify-between group">
                              <span
                                className="font-semibold text-slate-900 hover:text-emerald-700 cursor-pointer transition"
                                onClick={() => onUpdateLedgerDetails && setEditingLedger(ledger)}
                                title="Click to alter ledger text name or amounts"
                              >
                                {ledger.accountName}
                              </span>
                              {onUpdateLedgerDetails && (
                                <button
                                  type="button"
                                  onClick={() => setEditingLedger(ledger)}
                                  className="opacity-40 group-hover:opacity-100 p-1 hover:bg-emerald-50 rounded text-slate-400 hover:text-emerald-700 transition"
                                  title="Alter ledger account text, code, or amounts"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-[10px] text-slate-500 font-mono">
                                {ledger.nature}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="text-[10px] text-slate-500">
                                {ledger.statement === 'BalanceSheet' ? 'Balance Sheet' : 'Profit &amp; Loss'}
                              </span>

                              {/* Abnormal Sign Badge */}
                              {ledger.auditFlag && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-medium border border-amber-200">
                                  <ShieldAlert className="w-2.5 h-2.5 text-amber-600" />
                                  {ledger.auditFlag === 'ABNORMAL_DEBIT_IN_CREDITORS' && 'Debit in Creditor'}
                                  {ledger.auditFlag === 'ABNORMAL_CREDIT_IN_DEBTORS' && 'Credit in Debtor'}
                                  {ledger.auditFlag === 'SUSPENSE_ACCOUNT' && 'Suspense Account'}
                                  {ledger.auditFlag === 'ZERO_BALANCE' && 'Zero Balance'}
                                </span>
                              )}

                              {ledger.isUserOverridden && (
                                <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 rounded font-medium">
                                  Manual Override
                                </span>
                              )}

                              {ledger.linkedStatementItem && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded font-medium">
                                  <Link2 className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                                  Linked: {ledger.linkedStatementItem}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Original Debit */}
                          <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                            {ledger.originalDebit > 0
                              ? ledger.originalDebit.toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                })
                              : '-'}
                          </td>

                          {/* Original Credit */}
                          <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                            {ledger.originalCredit > 0
                              ? ledger.originalCredit.toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                })
                              : '-'}
                          </td>

                          {/* Net Balance */}
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-950">
                            ₹
                            {ledger.netBalance.toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                            })}
                          </td>

                          {/* Statutory Note Selector (Allows Interactive CA Override) */}
                          <td className="py-2.5 px-3">
                            <select
                              value={ledger.noteNumber}
                              onChange={(e) => currentUpdateHandler(ledger.id, Number(e.target.value))}
                              className="w-full text-xs py-1 px-2 rounded-md border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                            >
                              {selectableNotes.map((n) => (
                                <option key={n.noteNumber} value={n.noteNumber}>
                                  Note {n.noteNumber}: {n.name} ({n.statement === 'BalanceSheet' ? 'BS' : 'P&amp;L'})
                                </option>
                              ))}
                            </select>
                            <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[280px]">
                              {ledger.subCategory || 'General Schedule'}
                            </div>
                          </td>

                          {/* Confidence */}
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  ledger.confidence >= 0.9
                                    ? 'bg-emerald-500'
                                    : ledger.confidence >= 0.7
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}
                              />
                              <span className="font-mono text-[11px] text-slate-600">
                                {Math.round(ledger.confidence * 100)}%
                              </span>
                            </div>
                          </td>

                          {/* Actions Column: Edit / Alter & Delete */}
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {onUpdateLedgerDetails && (
                                <button
                                  type="button"
                                  onClick={() => setEditingLedger(ledger)}
                                  className="p-1.5 hover:bg-emerald-50 rounded-lg text-slate-500 hover:text-emerald-700 transition"
                                  title="Alter ledger text name, code & amounts"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {onDeleteLedger && (
                                <button
                                  type="button"
                                  onClick={() => setDeletingLedger(ledger)}
                                  className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition"
                                  title="Delete ledger account"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div>
                Showing <strong className="text-slate-800">{filteredLedgers.length}</strong> of{' '}
                <strong className="text-slate-800">{currentActiveLedgers.length}</strong> {isViewingCY ? 'Current Year' : 'Previous Year'} accounts.
              </div>
              <div className="flex items-center gap-4 font-mono text-[11px]">
                <span>Total Dr: ₹{currentTotalDebit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                <span>Total Cr: ₹{currentTotalCredit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          </div>

          {/* Edit Existing Ledger Modal */}
          <EditLedgerModal
            isOpen={!!editingLedger}
            ledger={editingLedger}
            isNew={false}
            onClose={() => setEditingLedger(null)}
            onSave={(updated) => {
              if (editingLedger && onUpdateLedgerDetails) {
                onUpdateLedgerDetails(editingLedger.id, updated, !isViewingCY);
              }
            }}
            selectableNotes={selectableNotes}
          />

          {/* Add New Ledger Modal */}
          <EditLedgerModal
            isOpen={isAddModalOpen}
            ledger={null}
            isNew={true}
            onClose={() => setIsAddModalOpen(false)}
            onSave={(newLedger) => {
              if (onAddLedger) {
                onAddLedger(newLedger, !isViewingCY);
              }
            }}
            selectableNotes={selectableNotes}
          />

          {/* Delete Single Ledger Confirmation Dialog */}
          {deletingLedger && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
                <div className="p-5 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div className="space-y-1.5 text-left flex-1">
                    <h3 className="text-base font-bold text-slate-900">Delete Ledger Account</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Are you sure you want to remove <strong className="text-slate-900">{deletingLedger.accountName}</strong> {deletingLedger.accountCode ? `(${deletingLedger.accountCode})` : ''} from the {isViewingCY ? 'Current Year' : 'Previous Year'} Trial Balance?
                    </p>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-700 flex justify-between items-center">
                      <span>Net Balance: ₹{Math.abs(deletingLedger.netBalance).toLocaleString('en-IN')} {deletingLedger.netBalance >= 0 ? 'Dr' : 'Cr'}</span>
                      <span className="font-sans font-semibold text-emerald-700">Note {deletingLedger.noteNumber}</span>
                    </div>
                  </div>
                </div>
                <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDeletingLedger(null)}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onDeleteLedger && deletingLedger) {
                        onDeleteLedger(deletingLedger.id || deletingLedger.accountName, !isViewingCY);
                      }
                      setDeletingLedger(null);
                    }}
                    className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Account</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Clear Entire Current Year TB Confirmation Dialog */}
          {confirmClearTB && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
                <div className="p-5 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div className="space-y-1.5 text-left flex-1">
                    <h3 className="text-base font-bold text-slate-900">Clear Current Year Trial Balance</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Are you sure you want to clear all {mappedLedgers.length} ledgers from the Current Year Trial Balance? This will reset all generated Notes, Balance Sheet, and P&amp;L accounts for this period.
                    </p>
                  </div>
                </div>
                <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmClearTB(false)}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onClearTB) onClearTB();
                      setConfirmClearTB(false);
                    }}
                    className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All Ledgers</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Clear Entire Previous Year TB Confirmation Dialog */}
          {confirmClearPYTB && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
                <div className="p-5 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div className="space-y-1.5 text-left flex-1">
                    <h3 className="text-base font-bold text-slate-900">Remove Previous Year Trial Balance</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Are you sure you want to remove the Previous Year Trial Balance ({pyMappedLedgers.length} ledgers)? Comparative figures will revert to benchmark estimates.
                    </p>
                  </div>
                </div>
                <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmClearPYTB(false)}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onClearPYTB) onClearPYTB();
                      setConfirmClearPYTB(false);
                    }}
                    className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove PY Data</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
