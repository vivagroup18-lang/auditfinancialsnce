import React, { useState, useEffect } from 'react';
import { X, Check, Plus, Trash2, Box, Info, Sparkles, Layers, DollarSign, Calculator, AlertCircle } from 'lucide-react';
import { YearEndAdjustments, CustomAdjustmentEntry, EntityConfig } from '../types';
import { NCE_NOTE_DEFINITIONS } from '../data/nceTaxonomy';

interface YearEndAdjustmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  adjustments?: YearEndAdjustments;
  onSave: (updated: YearEndAdjustments) => void;
  config: EntityConfig;
  currentOpeningStock?: number;
}

export const YearEndAdjustmentsModal: React.FC<YearEndAdjustmentsModalProps> = ({
  isOpen,
  onClose,
  adjustments = {} as YearEndAdjustments,
  onSave,
  config,
  currentOpeningStock = 0,
}) => {
  const [closingStockCY, setClosingStockCY] = useState<string>(
    adjustments.closingStockCY !== undefined ? String(adjustments.closingStockCY) : ''
  );
  const [closingStockPY, setClosingStockPY] = useState<string>(
    adjustments.closingStockPY !== undefined ? String(adjustments.closingStockPY) : ''
  );
  const [provisionForTaxCY, setProvisionForTaxCY] = useState<string>(
    adjustments.provisionForTaxCY !== undefined ? String(adjustments.provisionForTaxCY) : ''
  );
  const [depreciationCY, setDepreciationCY] = useState<string>(
    adjustments.depreciationCY !== undefined ? String(adjustments.depreciationCY) : ''
  );
  const [partnerRemunerationCY, setPartnerRemunerationCY] = useState<string>(
    adjustments.partnerRemunerationCY !== undefined ? String(adjustments.partnerRemunerationCY) : ''
  );

  const [customAdjustments, setCustomAdjustments] = useState<CustomAdjustmentEntry[]>(
    adjustments.customAdjustments || []
  );

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setClosingStockCY(adjustments.closingStockCY !== undefined ? String(adjustments.closingStockCY) : '');
      setClosingStockPY(adjustments.closingStockPY !== undefined ? String(adjustments.closingStockPY) : '');
      setProvisionForTaxCY(adjustments.provisionForTaxCY !== undefined ? String(adjustments.provisionForTaxCY) : '');
      setDepreciationCY(adjustments.depreciationCY !== undefined ? String(adjustments.depreciationCY) : '');
      setPartnerRemunerationCY(adjustments.partnerRemunerationCY !== undefined ? String(adjustments.partnerRemunerationCY) : '');
      setCustomAdjustments(adjustments.customAdjustments || []);
    }
  }, [isOpen, adjustments]);

  if (!isOpen) return null;

  const parseNum = (val: string): number | undefined => {
    if (!val.trim()) return undefined;
    const num = parseFloat(val.replace(/,/g, ''));
    return isNaN(num) ? undefined : num;
  };

  const handleAddCustom = () => {
    const newEntry: CustomAdjustmentEntry = {
      id: `adj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      particulars: '',
      amount: 0,
      isDebit: true,
      noteNumber: 18,
      statement: 'BalanceSheet',
    };
    setCustomAdjustments([...customAdjustments, newEntry]);
  };

  const handleUpdateCustom = (id: string, field: keyof CustomAdjustmentEntry, val: any) => {
    setCustomAdjustments((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: val };
          if (field === 'noteNumber') {
            const noteDef = NCE_NOTE_DEFINITIONS.find((n) => n.noteNumber === Number(val));
            if (noteDef) updated.statement = noteDef.statement;
          }
          return updated;
        }
        return item;
      })
    );
  };

  const handleRemoveCustom = (id: string) => {
    setCustomAdjustments((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSave = () => {
    const updated: YearEndAdjustments = {
      closingStockCY: parseNum(closingStockCY),
      closingStockPY: parseNum(closingStockPY),
      provisionForTaxCY: parseNum(provisionForTaxCY),
      depreciationCY: parseNum(depreciationCY),
      partnerRemunerationCY: parseNum(partnerRemunerationCY),
      customAdjustments: customAdjustments.filter((c) => c.particulars.trim() && c.amount > 0),
    };
    onSave(updated);
    onClose();
  };

  const stockValCY = parseNum(closingStockCY) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Year-End Adjustments & Closing Stock Entry</h2>
              <p className="text-xs text-slate-300">
                Enter Closing Stock valuation & missing year-end adjustment items for FY {config.financialYear}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">

          {/* 1. Closing Stock Valuation Section */}
          <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Box className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-900">Closing Stock Valuation (Physical Count / Valued as per AS-2)</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                Affects Note 15 & Note 21
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Trial Balances exported before year-end stock audit often do not include Closing Stock. Enter the valued Closing Stock below to update Balance Sheet Note 15 (Inventories) and credit P&L Note 21 (COGS).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Current Year Closing Stock (FY {config.financialYear})
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. 19,78,250"
                    value={closingStockCY}
                    onChange={(e) => setClosingStockCY(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-slate-900 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Previous Year Closing Stock (FY {config.previousFinancialYear || '2023-24'})
                </label>
                <input
                  type="text"
                  placeholder="e.g. 16,84,200"
                  value={closingStockPY}
                  onChange={(e) => setClosingStockPY(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-slate-700 bg-white"
                />
              </div>
            </div>

            {/* Live Financial Effect Preview */}
            {stockValCY > 0 && (
              <div className="bg-white rounded-lg p-3 border border-emerald-200 text-xs space-y-1 mt-2">
                <p className="font-bold text-emerald-800 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Automatic Statement Adjustments for Closing Stock ({stockValCY.toLocaleString('en-IN', { minimumFractionDigits: 2 })}):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
                  <div className="p-2 rounded bg-emerald-50 border border-emerald-100">
                    <span className="font-bold text-emerald-900 block">🏛️ Balance Sheet (Note 15):</span>
                    <span>Adds Current Asset of <strong>{stockValCY.toLocaleString('en-IN')}</strong> under Inventories.</span>
                  </div>
                  <div className="p-2 rounded bg-blue-50 border border-blue-100">
                    <span className="font-bold text-blue-900 block">📈 Profit & Loss (Note 21):</span>
                    <span>Deducts <strong>-{stockValCY.toLocaleString('en-IN')}</strong> from COGS (increases Net Profit).</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Standard Statutory Adjustments */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-blue-600" />
              Statutory Year-End Audit Provisions
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Provision for Tax (Note 8 & P&L)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 50,000"
                  value={provisionForTaxCY}
                  onChange={(e) => setProvisionForTaxCY(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Depreciation Adjustment (Note 24)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 7,95,219"
                  value={depreciationCY}
                  onChange={(e) => setDepreciationCY(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Partner/Owner Remuneration
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1,80,000"
                  value={partnerRemunerationCY}
                  onChange={(e) => setPartnerRemunerationCY(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* 3. Custom Year-End Adjustment Ledgers */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Custom Adjustment Ledgers</h3>
                <p className="text-xs text-slate-500">Add any missing ledgers (e.g. Prepaid Insurance, Audit Fee Payable, Accrued Interest)</p>
              </div>
              <button
                type="button"
                onClick={handleAddCustom}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Add Adjustment
              </button>
            </div>

            {customAdjustments.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-400 italic bg-white rounded-lg border border-dashed border-slate-200">
                No custom adjustment ledgers added. Click "+ Add Adjustment" above if needed.
              </div>
            ) : (
              <div className="space-y-2">
                {customAdjustments.map((item) => (
                  <div key={item.id} className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                    <input
                      type="text"
                      placeholder="Account Particulars (e.g. Audit Fee Payable)"
                      value={item.particulars}
                      onChange={(e) => handleUpdateCustom(item.id, 'particulars', e.target.value)}
                      className="flex-1 px-2.5 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 min-w-[160px]"
                    />

                    <input
                      type="number"
                      placeholder="Amount"
                      value={item.amount || ''}
                      onChange={(e) => handleUpdateCustom(item.id, 'amount', parseFloat(e.target.value) || 0)}
                      className="w-28 px-2.5 py-1.5 text-xs rounded border border-slate-300 font-mono font-bold"
                    />

                    <select
                      value={item.isDebit ? 'Dr' : 'Cr'}
                      onChange={(e) => handleUpdateCustom(item.id, 'isDebit', e.target.value === 'Dr')}
                      className="w-16 px-2 py-1.5 text-xs rounded border border-slate-300 font-bold"
                    >
                      <option value="Dr">Dr</option>
                      <option value="Cr">Cr</option>
                    </select>

                    <select
                      value={item.noteNumber}
                      onChange={(e) => handleUpdateCustom(item.id, 'noteNumber', Number(e.target.value))}
                      className="w-40 px-2 py-1.5 text-xs rounded border border-slate-300"
                    >
                      {NCE_NOTE_DEFINITIONS.filter((n) => n.noteNumber >= 3).map((n) => (
                        <option key={n.noteNumber} value={n.noteNumber}>
                          Note {n.noteNumber}: {n.name.slice(0, 18)}...
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => handleRemoveCustom(item.id)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition"
                      title="Delete adjustment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
          >
            <Check className="w-4 h-4" />
            Apply Adjustments & Update Statements
          </button>
        </div>

      </div>
    </div>
  );
};
