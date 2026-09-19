import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Calendar,
  CheckCircle2,
  Search,
  ArrowDownRight,
  TrendingUp,
  Building,
  Layers,
  Sparkles,
} from 'lucide-react';
import { UploadedStatementDoc, MappedLedger } from '../types';

interface UploadedStatementViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  statementDoc?: UploadedStatementDoc;
  mappedLedgers?: MappedLedger[];
  onTriggerAIMapping?: () => void;
  isAIMapping?: boolean;
}

export const UploadedStatementViewerModal: React.FC<UploadedStatementViewerModalProps> = ({
  isOpen,
  onClose,
  statementDoc,
  mappedLedgers = [],
  onTriggerAIMapping,
  isAIMapping = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  if (!isOpen || !statementDoc) return null;

  const isPY = statementDoc.period === 'PY' || statementDoc.fileType === 'PYBalanceSheet' || statementDoc.fileType === 'PYProfitAndLoss';
  const isBS = statementDoc.fileType === 'BalanceSheet' || statementDoc.fileType === 'PYBalanceSheet';
  const title = isPY
    ? isBS
      ? 'Uploaded Previous Year Balance Sheet'
      : 'Uploaded Previous Year Profit & Loss'
    : isBS
    ? 'Uploaded Balance Sheet'
    : 'Uploaded Statement of Profit & Loss';

  // Extract unique categories
  const categories = ['All', ...Array.from(new Set(statementDoc.items.map((i) => i.rawCategory || 'Uncategorized')))];

  // Filter items
  const filteredItems = statementDoc.items.filter((item) => {
    const matchesSearch =
      item.particulars.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.scheduleReference && item.scheduleReference.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = selectedCategory === 'All' || item.rawCategory === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const totalCurrent = statementDoc.items.reduce((sum, i) => sum + (i.currentPeriodAmount || 0), 0);
  const totalPrevious = statementDoc.items.reduce((sum, i) => sum + (i.previousPeriodAmount || 0), 0);

  // Helper to count how many trial balance ledgers link to this note/schedule
  const getLinkedLedgersCount = (noteNum?: number | string) => {
    if (!noteNum) return 0;
    const parsedNum = typeof noteNum === 'number' ? noteNum : parseInt(String(noteNum).replace(/\D/g, ''), 10);
    if (isNaN(parsedNum) || !parsedNum) return 0;
    return mappedLedgers.filter((l) => l.noteNumber === parsedNum).length;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                isBS ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white">{title}</h3>
                {isPY && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-900/80 text-sky-200 border border-sky-700">
                    Prior Year (PY)
                  </span>
                )}
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {statementDoc.items.length} Line Items
                </span>
                {statementDoc.hasPreviousYear && !isPY && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-900/60 text-indigo-300 border border-indigo-700">
                    Comparative PY Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                <span>Source: {statementDoc.fileName}</span>
                <span>•</span>
                <span>Uploaded: {new Date(statementDoc.uploadedAt).toLocaleTimeString()}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onTriggerAIMapping && (
              <button
                onClick={onTriggerAIMapping}
                disabled={isAIMapping}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-xs transition disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isAIMapping ? 'animate-spin' : ''}`} />
                <span>{isAIMapping ? 'AI Categorizing...' : 'Run AI Linking'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Highlight Summary Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <span className="text-slate-500 block text-[11px]">
                {isPY ? 'Reported Total / Net (PY)' : 'Reported Total / Net (CY)'}
              </span>
              <span className="text-slate-900 font-bold text-sm">
                ₹{totalCurrent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
            {statementDoc.hasPreviousYear && !isPY && (
              <div>
                <span className="text-slate-500 block text-[11px]">Reported Total / Net (PY)</span>
                <span className="text-indigo-900 font-bold text-sm">
                  ₹{totalPrevious.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </div>
            )}
            <div>
              <span className="text-slate-500 block text-[11px]">Schedule References</span>
              <span className="text-slate-700 font-medium">
                {statementDoc.items.filter((i) => i.noteNumber).length} lines mapped to ICAI Notes
              </span>
            </div>
          </div>

          {/* Search & Category Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search line item or note..."
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 w-44"
              />
            </div>
            {categories.length > 2 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="py-1.5 px-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="py-2.5 px-4 w-12 text-center">#</th>
                  <th className="py-2.5 px-4">Particulars / Statutory Head</th>
                  <th className="py-2.5 px-3 w-28 text-center">ICAI Note</th>
                  <th className="py-2.5 px-3 w-36">Category</th>
                  <th className="py-2.5 px-4 w-32 text-right">
                    {isPY ? 'Prior Year Amount (₹)' : 'Current Period (₹)'}
                  </th>
                  {statementDoc.hasPreviousYear && !isPY && (
                    <th className="py-2.5 px-4 w-32 text-right">Previous Period (₹)</th>
                  )}
                  <th className="py-2.5 px-3 w-28 text-center">TB Ledgers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={statementDoc.hasPreviousYear && !isPY ? 7 : 6} className="text-center py-8 text-slate-400">
                      No line items matching &quot;{searchTerm}&quot;
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => {
                    const linkedCount = getLinkedLedgersCount(item.noteNumber);
                    return (
                      <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-4 text-center text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-slate-900">{item.particulars}</div>
                          {item.scheduleReference && item.scheduleReference !== `Note ${item.noteNumber}` && (
                            <span className="text-[10px] text-slate-500">{item.scheduleReference}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {item.noteNumber ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              Note {item.noteNumber}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700">
                            {item.rawCategory || 'General'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-medium text-slate-900">
                          {item.currentPeriodAmount !== undefined
                            ? item.currentPeriodAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })
                            : '-'}
                        </td>
                        {statementDoc.hasPreviousYear && !isPY && (
                          <td className="py-2.5 px-4 text-right font-mono text-indigo-900">
                            {item.previousPeriodAmount !== undefined
                              ? item.previousPeriodAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })
                              : '-'}
                          </td>
                        )}
                        <td className="py-2.5 px-3 text-center">
                          {linkedCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> {linkedCount}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">0</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            {statementDoc.items.length} line items ready for AI automated schedule mapping & financials generation.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
