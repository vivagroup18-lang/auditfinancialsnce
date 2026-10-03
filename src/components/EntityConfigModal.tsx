import React, { useState, useEffect } from 'react';
import { X, Building2, Save, Layers } from 'lucide-react';
import { EntityConfig } from '../types';
import { PartnerConfigForm } from './PartnerConfigForm';
import { syncBranchesWithCount } from '../utils/branchConsolidation';

interface EntityConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: EntityConfig;
  onSave: (updated: EntityConfig) => void;
  onOpenCompanyManager?: () => void;
}

export const EntityConfigModal: React.FC<EntityConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
  onOpenCompanyManager,
}) => {
  const [formData, setFormData] = useState<EntityConfig>({ ...config });

  useEffect(() => {
    setFormData({ ...config });
  }, [config]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">Entity Configuration & Audit Parameters</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition rounded p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {onOpenCompanyManager && (
          <div className="bg-emerald-50 px-5 py-2.5 border-b border-emerald-100 flex items-center justify-between text-xs">
            <span className="text-emerald-900 font-medium">Managing client entity: <strong className="text-slate-900">{config.entityName}</strong></span>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCompanyManager();
              }}
              className="flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-bold underline transition"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Switch / Add Company</span>
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Entity Name</label>
            <input
              type="text"
              value={formData.entityName}
              onChange={(e) => setFormData({ ...formData, entityName: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Constitution Type</label>
              <select
                value={formData.entityType}
                onChange={(e: any) => setFormData({ ...formData, entityType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
              >
                <option value="Partnership Firm">Partnership Firm</option>
                <option value="Sole Proprietorship">Sole Proprietorship</option>
                <option value="LLP">Limited Liability Partnership (LLP)</option>
                <option value="Association of Persons">Association of Persons (AOP) / BOI</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Current Financial Year</label>
              <input
                type="text"
                value={formData.financialYear}
                onChange={(e) => setFormData({ ...formData, financialYear: e.target.value })}
                placeholder="2025-26"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* No. of Branches Configuration */}
          <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <label className="font-bold text-indigo-950 flex items-center gap-1.5 text-xs">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>No. of Branches (Branch-wise TB Consolidation)</span>
                </label>
                <span className="text-[10px] text-indigo-700 block">
                  Set 0 for single Trial Balance, or enter number of branches to import branch-wise CY &amp; PY Trial Balances
                </span>
              </div>
              <input
                type="number"
                min={0}
                max={50}
                value={formData.numberOfBranches ?? (formData.branches?.length || 0)}
                onChange={(e) => {
                  const count = Math.max(0, Math.min(50, parseInt(e.target.value, 10) || 0));
                  const synced = syncBranchesWithCount(formData.branches, count);
                  setFormData({
                    ...formData,
                    numberOfBranches: count,
                    branches: synced,
                  });
                }}
                className="w-20 px-2.5 py-1.5 rounded-lg bg-white border border-indigo-300 text-center font-mono font-bold text-xs text-indigo-950"
              />
            </div>
            {(formData.numberOfBranches ?? 0) > 0 && formData.branches && formData.branches.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1.5 border-t border-indigo-200/60 max-h-32 overflow-y-auto">
                {formData.branches.map((b, idx) => (
                  <div key={b.branchId} className="flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-indigo-200">
                    <span className="text-[10px] font-mono font-bold text-indigo-600">#{idx + 1}</span>
                    <input
                      type="text"
                      value={b.branchName}
                      onChange={(e) => {
                        const updated = (formData.branches || []).map((item) =>
                          item.branchId === b.branchId ? { ...item, branchName: e.target.value } : item
                        );
                        setFormData({ ...formData, branches: updated });
                      }}
                      className="w-full text-[11px] font-medium text-slate-800 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Proprietor Name for Sole Proprietorship */}
          {formData.entityType === 'Sole Proprietorship' && (
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg">
              <label className="block font-semibold text-amber-950 mb-1">
                Name of Proprietor <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.proprietorName || ''}
                onChange={(e) => setFormData({ ...formData, proprietorName: e.target.value })}
                placeholder="e.g. Shri Ramesh Kumar / Proprietor Legal Name"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
              <span className="text-[10px] text-amber-800 block mt-0.5">
                Disclosed on Note 3 (Proprietor's Capital Account), Balance Sheet, and Statutory Sign-off
              </span>
            </div>
          )}

          <div>
            <label className="block font-medium text-slate-700 mb-1">Registered Office / Principal Place of Business</label>
            <input
              type="text"
              value={formData.registeredAddress || formData.address || ''}
              onChange={(e) => setFormData({ ...formData, registeredAddress: e.target.value, address: e.target.value })}
              placeholder="e.g. Shop No. 4, Market Yard, Pune - 411037"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Place of Signing</label>
              <input
                type="text"
                value={formData.placeOfSigning || ''}
                onChange={(e) => setFormData({ ...formData, placeOfSigning: e.target.value })}
                placeholder="e.g. Pune / Mumbai"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Date of Signing</label>
              <input
                type="text"
                value={formData.dateOfSigning || ''}
                onChange={(e) => setFormData({ ...formData, dateOfSigning: e.target.value })}
                placeholder="e.g. March 31, 2025"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Current Reporting Period Date</label>
              <input
                type="text"
                value={formData.reportingPeriod}
                onChange={(e) => setFormData({ ...formData, reportingPeriod: e.target.value })}
                placeholder="March 31, 2025"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Previous Financial Year (Comparative)</label>
              <input
                type="text"
                value={formData.previousFinancialYear || '2024-25'}
                onChange={(e) => setFormData({ ...formData, previousFinancialYear: e.target.value })}
                placeholder="2024-25"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Previous Reporting Period Date</label>
              <input
                type="text"
                value={formData.previousReportingPeriod || 'March 31, 2025'}
                onChange={(e) => setFormData({ ...formData, previousReportingPeriod: e.target.value })}
                placeholder="March 31, 2025"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Income Tax Rate (%)</label>
              <input
                type="number"
                value={formData.taxRatePercent || 30}
                onChange={(e) => setFormData({ ...formData, taxRatePercent: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Profit Transfer Accounting Destination</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <label className={`border rounded-lg p-2.5 cursor-pointer flex items-center gap-2 transition ${formData.transferProfitTo === 'partners_capital' ? 'border-emerald-600 bg-emerald-50/60' : 'border-slate-200'}`}>
                <input
                  type="radio"
                  name="transferProfitTo"
                  checked={formData.transferProfitTo === 'partners_capital'}
                  onChange={() => setFormData({ ...formData, transferProfitTo: 'partners_capital' })}
                />
                <div>
                  <div className="font-semibold text-slate-900">Partners' Capital (Note 3)</div>
                  <div className="text-[10px] text-slate-500">Standard for Partnership & Proprietorship</div>
                </div>
              </label>

              <label className={`border rounded-lg p-2.5 cursor-pointer flex items-center gap-2 transition ${formData.transferProfitTo === 'reserves' ? 'border-emerald-600 bg-emerald-50/60' : 'border-slate-200'}`}>
                <input
                  type="radio"
                  name="transferProfitTo"
                  checked={formData.transferProfitTo === 'reserves'}
                  onChange={() => setFormData({ ...formData, transferProfitTo: 'reserves' })}
                />
                <div>
                  <div className="font-semibold text-slate-900">Reserves & Surplus (Note 4)</div>
                  <div className="text-[10px] text-slate-500">Standard for LLPs & Retained Earnings</div>
                </div>
              </label>
            </div>
          </div>

          {/* Partners & Sharing Ratios for Partnership Firm and LLP */}
          {(formData.entityType === 'Partnership Firm' || formData.entityType === 'LLP') && (
            <PartnerConfigForm
              entityType={formData.entityType}
              partners={formData.partners || [
                { name: 'Partner 1', profitSharePercent: 50, remunerationSharePercent: 50, isWorkingPartner: true, isDesignatedPartner: true, openingBalance: 0 },
                { name: 'Partner 2', profitSharePercent: 50, remunerationSharePercent: 50, isWorkingPartner: true, isDesignatedPartner: true, openingBalance: 0 },
              ]}
              onChange={(updated) => setFormData({ ...formData, partners: updated })}
              signingPartnerName={formData.signingPartnerName}
              onSigningPartnerChange={(name) => setFormData({ ...formData, signingPartnerName: name })}
            />
          )}

          <div className="border-t border-slate-200 pt-3">
            <h4 className="font-bold text-slate-800 mb-2">Auditor Details & Statutory Credentials</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">CA / Audit Firm Name</label>
                <input
                  type="text"
                  value={formData.auditorFirmName || ''}
                  onChange={(e) => setFormData({ ...formData, auditorFirmName: e.target.value })}
                  placeholder="e.g. M/s Viva & Associates, Chartered Accountants"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Chartered Accountant Name</label>
                <input
                  type="text"
                  value={formData.auditorName || ''}
                  onChange={(e) => setFormData({ ...formData, auditorName: e.target.value })}
                  placeholder="e.g. CA. Balaji Rao"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Role / Designation</label>
                <select
                  value={formData.auditorRole || 'Partner'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      auditorRole: e.target.value as 'Partner' | 'Proprietor',
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
                >
                  <option value="Partner">Partner</option>
                  <option value="Proprietor">Proprietor</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">ICAI Membership No.</label>
                <input
                  type="text"
                  value={formData.auditorMembershipNo || ''}
                  onChange={(e) => setFormData({ ...formData, auditorMembershipNo: e.target.value })}
                  placeholder="e.g. 142536"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Firm Reg. No. (FRN)</label>
                <input
                  type="text"
                  value={formData.firmRegistrationNo || ''}
                  onChange={(e) => setFormData({ ...formData, firmRegistrationNo: e.target.value })}
                  placeholder="e.g. 109876W"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="block font-medium text-slate-700 mb-1">Unique Document Identification Number (UDIN)</label>
              <input
                type="text"
                value={formData.udin || ''}
                onChange={(e) => setFormData({ ...formData, udin: e.target.value })}
                placeholder="e.g. 25142536AAAAAA1234 (optional)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none uppercase"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-xs transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
