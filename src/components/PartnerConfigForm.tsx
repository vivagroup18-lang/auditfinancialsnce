import React from 'react';
import { Users, Plus, Trash2, CheckCircle2, AlertTriangle, RefreshCw, Percent, ShieldCheck } from 'lucide-react';

export interface PartnerConfigItem {
  name: string;
  profitSharePercent?: number;
  remunerationSharePercent?: number;
  isWorkingPartner?: boolean;
  isDesignatedPartner?: boolean;
  openingBalance?: number;
}

interface PartnerConfigFormProps {
  entityType: 'Partnership Firm' | 'Sole Proprietorship' | 'LLP' | 'AOP/BOI';
  partners: PartnerConfigItem[];
  onChange: (updatedPartners: PartnerConfigItem[]) => void;
  compact?: boolean;
}

export const PartnerConfigForm: React.FC<PartnerConfigFormProps> = ({
  entityType,
  partners,
  onChange,
  compact = false,
}) => {
  const isLLP = entityType === 'LLP';
  const partnerTitle = isLLP ? 'Designated Partners' : 'Partners';

  // Calculate totals
  const totalPsr = Math.round(
    partners.reduce((sum, p) => sum + (p.profitSharePercent || 0), 0) * 100
  ) / 100;

  const totalRsr = Math.round(
    partners.reduce(
      (sum, p) =>
        sum +
        (p.remunerationSharePercent !== undefined
          ? p.remunerationSharePercent
          : p.profitSharePercent || 0),
      0
    ) * 100
  ) / 100;

  const isPsrValid = Math.abs(totalPsr - 100) < 0.01;
  const isRsrValid = Math.abs(totalRsr - 100) < 0.01;

  // Field change
  const handleFieldChange = (
    index: number,
    field: keyof PartnerConfigItem,
    val: any
  ) => {
    const updated = [...partners];
    updated[index] = {
      ...updated[index],
      [field]: val,
    };
    onChange(updated);
  };

  // Add new partner
  const handleAddPartner = () => {
    const nextIdx = partners.length + 1;
    const remainingPsr = Math.max(0, Math.round((100 - totalPsr) * 100) / 100);
    const remainingRsr = Math.max(0, Math.round((100 - totalRsr) * 100) / 100);

    const newPartner: PartnerConfigItem = {
      name: `${isLLP ? 'Designated Partner' : 'Partner'} ${nextIdx}`,
      profitSharePercent: remainingPsr > 0 ? remainingPsr : 0,
      remunerationSharePercent: remainingRsr > 0 ? remainingRsr : remainingPsr,
      isWorkingPartner: true,
      isDesignatedPartner: true,
      openingBalance: 0,
    };
    onChange([...partners, newPartner]);
  };

  // Remove partner
  const handleRemovePartner = (index: number) => {
    if (partners.length <= 1) return;
    const filtered = partners.filter((_, i) => i !== index);
    onChange(filtered);
  };

  // Equal split 1-click
  const handleEqualSplit = () => {
    const count = partners.length;
    if (count === 0) return;
    const equalShare = Math.round((100 / count) * 100) / 100;

    const updated = partners.map((p, idx) => {
      const share = idx === count - 1 ? Math.round((100 - equalShare * (count - 1)) * 100) / 100 : equalShare;
      return {
        ...p,
        profitSharePercent: share,
        remunerationSharePercent: share,
      };
    });
    onChange(updated);
  };

  return (
    <div className="rounded-xl bg-slate-50/80 border border-slate-200/90 p-3.5 space-y-3">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 font-bold text-xs">
            <Users className="w-3.5 h-3.5 text-emerald-700" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>{partnerTitle} &amp; Sharing Ratios</span>
              <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-emerald-100/70 text-emerald-800">
                Sec 40(b) &amp; Deed
              </span>
            </h4>
            <p className="text-[11px] text-slate-500">
              Specify profit sharing and remuneration sharing percentages as per partnership deed.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleEqualSplit}
            className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold transition flex items-center gap-1 shadow-2xs cursor-pointer"
            title="Split 100% equally among all partners"
          >
            <RefreshCw className="w-3 h-3 text-slate-500" />
            <span>Equal Split</span>
          </button>
          <button
            type="button"
            onClick={handleAddPartner}
            className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Add Partner</span>
          </button>
        </div>
      </div>

      {/* Partners List */}
      <div className="space-y-2.5">
        {partners.map((partner, idx) => (
          <div
            key={idx}
            className="p-2.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-2"
          >
            {/* Row 1: Name and Working status */}
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-mono font-bold text-[10px] shrink-0">
                {idx + 1}
              </span>
              <input
                type="text"
                required
                placeholder="Partner / Owner Full Name"
                value={partner.name}
                onChange={(e) => handleFieldChange(idx, 'name', e.target.value)}
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />

              {/* Working Partner Toggle */}
              <button
                type="button"
                onClick={() => handleFieldChange(idx, 'isWorkingPartner', !partner.isWorkingPartner)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer shrink-0 ${
                  partner.isWorkingPartner !== false
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-slate-100 border-slate-300 text-slate-600'
                }`}
                title={
                  partner.isWorkingPartner !== false
                    ? 'Working Partner: Eligible for Section 40(b) Remuneration'
                    : 'Non-Working / Sleeping Partner: Not eligible for Section 40(b) Remuneration'
                }
              >
                {partner.isWorkingPartner !== false ? 'Working Partner' : 'Non-Working'}
              </button>

              {partners.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemovePartner(idx)}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition shrink-0"
                  title="Remove this partner"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Row 2: Profit Sharing %, Remuneration Sharing %, and Opening Capital */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1">
              <div>
                <label className="block text-slate-600 font-semibold mb-0.5">
                  Profit Share (%) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min={0}
                    max={100}
                    value={partner.profitSharePercent ?? 0}
                    onChange={(e) =>
                      handleFieldChange(idx, 'profitSharePercent', parseFloat(e.target.value) || 0)
                    }
                    className="w-full pl-2.5 pr-6 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold text-xs focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                  <Percent className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-0.5">
                  Remuneration Share (%) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min={0}
                    max={100}
                    value={
                      partner.remunerationSharePercent !== undefined
                        ? partner.remunerationSharePercent
                        : partner.profitSharePercent ?? 0
                    }
                    onChange={(e) =>
                      handleFieldChange(idx, 'remunerationSharePercent', parseFloat(e.target.value) || 0)
                    }
                    className="w-full pl-2.5 pr-6 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold text-xs focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                  <Percent className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-0.5">
                  Opening Capital (₹) <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={partner.openingBalance || ''}
                  onChange={(e) =>
                    handleFieldChange(idx, 'openingBalance', parseFloat(e.target.value) || 0)
                  }
                  className="w-full px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Real-time Summary Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 text-[11px]">
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold border ${
              isPsrValid
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-amber-50 text-amber-800 border-amber-300'
            }`}
          >
            {isPsrValid ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-3 h-3 text-amber-600" />
            )}
            <span>Total Profit Share: {totalPsr}%</span>
            {!isPsrValid && <span className="font-normal">(Must equal 100%)</span>}
          </div>

          <div
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold border ${
              isRsrValid
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-amber-50 text-amber-800 border-amber-300'
            }`}
          >
            {isRsrValid ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-3 h-3 text-amber-600" />
            )}
            <span>Total Remuneration Share: {totalRsr}%</span>
            {!isRsrValid && <span className="font-normal">(Must equal 100%)</span>}
          </div>
        </div>

        <span className="text-[10px] text-slate-400">
          Auto-populates Note 3 &amp; Profit and Loss (Line X &amp; XVII)
        </span>
      </div>
    </div>
  );
};
