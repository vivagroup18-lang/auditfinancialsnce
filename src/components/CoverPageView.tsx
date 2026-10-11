import React, { useState } from 'react';
import {
  FileText,
  Printer,
  Save,
  Check,
  Building2,
  Calendar,
  ShieldCheck,
  Award,
  Layers,
  Palette,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { EntityConfig, CoverPageConfig } from '../types';
import { getDefaultCoverPage } from '../utils/auditDossierDefaults';

interface CoverPageViewProps {
  config: EntityConfig;
  onUpdateConfig: (updated: Partial<EntityConfig>) => void;
}

export const CoverPageView: React.FC<CoverPageViewProps> = ({
  config,
  onUpdateConfig,
}) => {
  const currentData = getDefaultCoverPage(config);
  const [formData, setFormData] = useState<CoverPageConfig>(currentData);
  const [activeTab, setActiveTab] = useState<'preview' | 'customize'>('preview');
  const [isSaved, setIsSaved] = useState(false);

  const handleFieldChange = (field: keyof CoverPageConfig, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    setIsSaved(false);
  };

  const handleSave = () => {
    onUpdateConfig({ coverPageConfig: formData });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const isProprietor = config.entityType === 'Sole Proprietorship';
  const signingPerson = isProprietor
    ? config.proprietorName || 'Proprietor'
    : config.signingPartnerName || config.partners?.find((p) => p.isSigningPartner)?.name || config.partners?.[0]?.name || 'Managing Partner';

  const themeClasses = {
    navy: {
      border: 'border-slate-800',
      headerBg: 'bg-slate-900 text-white',
      accentText: 'text-indigo-400',
      badgeBg: 'bg-indigo-50 text-indigo-900 border-indigo-200',
      ruleBg: 'bg-indigo-900',
      tocAccent: 'text-indigo-900',
    },
    emerald: {
      border: 'border-emerald-900',
      headerBg: 'bg-emerald-950 text-white',
      accentText: 'text-emerald-400',
      badgeBg: 'bg-emerald-50 text-emerald-900 border-emerald-200',
      ruleBg: 'bg-emerald-800',
      tocAccent: 'text-emerald-900',
    },
    slate: {
      border: 'border-slate-800',
      headerBg: 'bg-slate-800 text-white',
      accentText: 'text-slate-300',
      badgeBg: 'bg-slate-100 text-slate-900 border-slate-300',
      ruleBg: 'bg-slate-700',
      tocAccent: 'text-slate-900',
    },
    classic: {
      border: 'border-black',
      headerBg: 'bg-black text-white',
      accentText: 'text-slate-300',
      badgeBg: 'bg-slate-100 text-black border-slate-400',
      ruleBg: 'bg-black',
      tocAccent: 'text-black',
    },
  }[formData.theme || 'navy'];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                Audit Dossier Title
              </span>
              <span className="text-xs text-slate-500 font-medium">
                ICAI Non-Corporate Entity Statutory Presentation
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Statutory Audit Report Cover Page &amp; Title Dossier
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Generate an executive statutory cover page with entity credentials, table of contents index, auditor attestation badges, and UDIN stamps.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              {isSaved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
              <span>{isSaved ? 'Saved to Entity!' : 'Save Parameters'}</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Print Cover Page</span>
            </button>
          </div>
        </div>

        {/* Sub-Tabs */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-100 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'preview'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>1. Cover Page Live Preview</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('customize')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'customize'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Palette className="w-4 h-4 text-indigo-400" />
            <span>2. Customize Titles, Theme &amp; Index</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CUSTOMIZE TAB                                                          */}
      {/* ========================================================================= */}
      {activeTab === 'customize' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Palette className="w-4 h-4 text-indigo-600" />
            <span>Cover Page Styling &amp; Titles</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="sm:col-span-2 md:col-span-4">
              <label className="block font-semibold text-slate-700 mb-1">Color Palette &amp; Theme</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'navy', name: 'ICAI Classic Navy', desc: 'Deep Royal Blue & Gold' },
                  { id: 'emerald', name: 'Prestige Emerald', desc: 'Executive Forest Green' },
                  { id: 'slate', name: 'Executive Slate', desc: 'Modern Graphite & Silver' },
                  { id: 'classic', name: 'Monochrome Black', desc: 'Minimalist High-Contrast' },
                ].map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => handleFieldChange('theme', th.id)}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      formData.theme === th.id
                        ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-500'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-slate-900">{th.name}</div>
                    <div className="text-[10px] text-slate-500">{th.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Report Title</label>
              <input
                type="text"
                value={formData.reportTitle || ''}
                onChange={(e) => handleFieldChange('reportTitle', e.target.value)}
                placeholder="STATUTORY AUDIT REPORT & FINANCIAL STATEMENTS"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none font-bold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Report Subtitle / Period</label>
              <input
                type="text"
                value={formData.reportSubtitle || ''}
                onChange={(e) => handleFieldChange('reportSubtitle', e.target.value)}
                placeholder="For the Financial Year Ended March 31, 2026"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Confidentiality / Privilege Notice</label>
              <input
                type="text"
                value={formData.confidentialNotice || ''}
                onChange={(e) => handleFieldChange('confidentialNotice', e.target.value)}
                placeholder="PRIVILEGED & CONFIDENTIAL • PREPARED IN ACCORDANCE WITH ICAI GUIDANCE NOTE"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none font-mono text-[11px]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Document Date</label>
              <input
                type="text"
                value={formData.documentDate || ''}
                onChange={(e) => handleFieldChange('documentDate', e.target.value)}
                placeholder="March 31, 2026"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2 md:col-span-4">
              <label className="block font-semibold text-slate-700 mb-1">Custom Dossier Notes / Remarks</label>
              <textarea
                rows={2}
                value={formData.customDossierNotes || ''}
                onChange={(e) => handleFieldChange('customDossierNotes', e.target.value)}
                placeholder="Audited under Standards on Auditing (SAs) issued by the Institute of Chartered Accountants of India."
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none leading-relaxed"
              />
            </div>
          </div>

          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3 pt-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>Components &amp; Dossier Sections Toggle</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.includeIndex ?? true}
                onChange={(e) => handleFieldChange('includeIndex', e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded"
              />
              <div>
                <span className="font-bold text-slate-900 block">Table of Contents / Index</span>
                <span className="text-[10px] text-slate-500">Show dossier section index on cover</span>
              </div>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.includeUdinBanner ?? true}
                onChange={(e) => handleFieldChange('includeUdinBanner', e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded"
              />
              <div>
                <span className="font-bold text-slate-900 block">UDIN Verification Banner</span>
                <span className="text-[10px] text-slate-500">Prominent 18-digit UDIN seal badge</span>
              </div>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.includeFirmBadge ?? true}
                onChange={(e) => handleFieldChange('includeFirmBadge', e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded"
              />
              <div>
                <span className="font-bold text-slate-900 block">ICAI NCE Compliance Seal</span>
                <span className="text-[10px] text-slate-500">Official guidance note compliance header</span>
              </div>
            </label>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4 text-emerald-400" />
              <span>Save Cover Configuration</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>View Cover Page Preview</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. PREVIEW TAB (PRINT READY A4 COVER)                                     */}
      {/* ========================================================================= */}
      {activeTab === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-100 p-3 rounded-xl text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <span className="font-semibold text-slate-900">Format:</span>
              <span>A4 Statutory Title Page • Non-Corporate Entity Dossier</span>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>Print / Save as PDF</span>
            </button>
          </div>

          {/* Actual Printable Cover Page Canvas */}
          <div className="bg-white rounded-2xl border-4 border-slate-900 p-8 sm:p-14 shadow-lg max-w-3xl mx-auto flex flex-col justify-between min-h-[920px] font-sans relative overflow-hidden">
            {/* Corner Decorative Borders */}
            <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-slate-900"></div>
            <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-slate-900"></div>
            <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-slate-900"></div>
            <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-slate-900"></div>

            {/* Top Section */}
            <div className="space-y-6 text-center">
              {formData.includeFirmBadge && (
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-300 text-[10px] font-bold uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Institute of Chartered Accountants of India • Non-Corporate Entity Format</span>
                </div>
              )}

              <div className="pt-2">
                <h1 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-slate-950 font-serif leading-tight">
                  {config.entityName}
                </h1>
                <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mt-1">
                  ({config.entityType})
                </p>
                {(config.registeredAddress || config.address) && (
                  <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto">
                    {config.registeredAddress || config.address}
                  </p>
                )}
                {(config.pan || config.gstin) && (
                  <div className="flex items-center justify-center gap-3 text-xs text-slate-600 font-mono mt-1">
                    {config.pan && <span>PAN: <strong className="text-slate-900">{config.pan}</strong></span>}
                    {config.pan && config.gstin && <span>•</span>}
                    {config.gstin && <span>GSTIN: <strong className="text-slate-900">{config.gstin}</strong></span>}
                  </div>
                )}
              </div>

              {/* Title Banner */}
              <div className={`${themeClasses.headerBg} p-5 rounded-2xl shadow-sm space-y-1.5 my-6`}>
                <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider">
                  {formData.reportTitle || 'STATUTORY AUDIT REPORT & FINANCIAL STATEMENTS'}
                </h2>
                <div className="text-xs font-medium text-slate-300">
                  {formData.reportSubtitle || `For the Financial Year Ended ${config.reportingPeriod || 'March 31, 2026'}`}
                </div>
                <div className="text-[11px] font-mono text-emerald-300 pt-1 font-bold">
                  FINANCIAL YEAR: {config.financialYear} • ASSESSMENT YEAR: {parseInt((config.financialYear || '2025-26').slice(0, 4), 10) + 1}-{(parseInt((config.financialYear || '2025-26').slice(0, 4), 10) + 2).toString().slice(2)}
                </div>
              </div>
            </div>

            {/* Middle Section: Table of Contents Index */}
            {formData.includeIndex && (
              <div className="my-4 border border-slate-200 rounded-xl p-4 bg-slate-50/70">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 text-center mb-3 flex items-center justify-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-700" />
                  <span>Dossier Contents &amp; Working Paper Index</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-slate-700">
                  <div className="flex justify-between items-baseline border-b border-slate-200/60 pb-1">
                    <span>1. Independent Auditor's Report</span>
                    <span className="font-mono text-slate-500 font-semibold">SA 700</span>
                  </div>
                  <div className="flex justify-between items-baseline border-b border-slate-200/60 pb-1">
                    <span>2. Balance Sheet (CY &amp; PY)</span>
                    <span className="font-mono text-slate-500 font-semibold">Schedule III / NCE</span>
                  </div>
                  <div className="flex justify-between items-baseline border-b border-slate-200/60 pb-1">
                    <span>3. Statement of Profit &amp; Loss</span>
                    <span className="font-mono text-slate-500 font-semibold">Part II / NCE</span>
                  </div>
                  <div className="flex justify-between items-baseline border-b border-slate-200/60 pb-1">
                    <span>4. Notes 1 to 25 to Accounts</span>
                    <span className="font-mono text-slate-500 font-semibold">ICAI Taxonomy</span>
                  </div>
                  <div className="flex justify-between items-baseline border-b border-slate-200/60 pb-1">
                    <span>5. Partner / Proprietor Capital Schedule</span>
                    <span className="font-mono text-slate-500 font-semibold">Note 3 &amp; Deed</span>
                  </div>
                  <div className="flex justify-between items-baseline border-b border-slate-200/60 pb-1">
                    <span>6. Trade Payables MSME Disclosures</span>
                    <span className="font-mono text-slate-500 font-semibold">MSMED Sec 22</span>
                  </div>
                  <div className="flex justify-between items-baseline border-b border-slate-200/60 pb-1">
                    <span>7. Management Representation Letter</span>
                    <span className="font-mono text-slate-500 font-semibold">ICAI SA 580</span>
                  </div>
                  <div className="flex justify-between items-baseline border-b border-slate-200/60 pb-1">
                    <span>8. Terms of Audit Appointment</span>
                    <span className="font-mono text-slate-500 font-semibold">ICAI SA 210</span>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Section: Signatories & UDIN */}
            <div className="space-y-4 pt-4 border-t-2 border-slate-900">
              <div className="grid grid-cols-2 gap-6 text-xs">
                {/* Client Box */}
                <div className="space-y-1">
                  <div className="font-bold uppercase tracking-wider text-slate-500 text-[10px]">
                    Prepared &amp; Approved By:
                  </div>
                  <div className="font-bold text-slate-900 text-sm">
                    {config.entityName}
                  </div>
                  <div className="text-slate-600">
                    {signingPerson}
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    {isProprietor ? 'Sole Proprietor' : 'Authorized / Managing Partner'}
                  </div>
                  <div className="text-slate-400 text-[10px] pt-1">
                    Place: {config.placeOfSigning || 'Principal Office'}
                  </div>
                </div>

                {/* Auditor Box */}
                <div className="text-right space-y-1">
                  <div className="font-bold uppercase tracking-wider text-slate-500 text-[10px]">
                    Statutory Auditors:
                  </div>
                  <div className="font-bold text-slate-900 text-sm">
                    M/s {config.auditorFirmName || config.auditorName || 'Chartered Accountants'}
                  </div>
                  <div className="text-slate-600">
                    Chartered Accountants
                    {config.firmRegistrationNo && ` • FRN: ${config.firmRegistrationNo}`}
                  </div>
                  <div className="text-slate-800 font-semibold">
                    {config.auditorName || 'Chartered Accountant'}
                  </div>
                  <div className="text-slate-500 text-[11px] font-mono">
                    {config.auditorRole || 'Partner'} • M.No: {config.auditorMembershipNo || 'Chartered Accountant'}
                  </div>
                  <div className="text-slate-400 text-[10px] pt-1">
                    Date: {formData.documentDate || config.dateOfSigning || new Date().toLocaleDateString('en-IN')}
                  </div>
                </div>
              </div>

              {/* UDIN Banner */}
              {formData.includeUdinBanner && (
                <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-400" />
                    <span className="font-semibold">ICAI Unique Document Identification Number (UDIN):</span>
                  </div>
                  <div className="font-mono font-bold text-emerald-300 text-sm tracking-wider">
                    {config.udin || 'UDIN GENERATION READY'}
                  </div>
                </div>
              )}

              {/* Confidentiality Notice */}
              {formData.confidentialNotice && (
                <div className="text-center text-[10px] text-slate-400 font-mono tracking-wider uppercase pt-1">
                  {formData.confidentialNotice}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
