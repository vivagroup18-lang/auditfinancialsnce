import React, { useState } from 'react';
import {
  FileText,
  Printer,
  Copy,
  Check,
  Save,
  Download,
  FileDown,
  Building2,
  Calendar,
  ShieldCheck,
  Award,
  Sparkles,
  HelpCircle,
  FileCheck2,
  ArrowRight,
} from 'lucide-react';
import { EntityConfig, AuditAppointmentConfig } from '../types';
import { getDefaultAuditAppointment } from '../utils/auditDossierDefaults';

interface AuditAppointmentViewProps {
  config: EntityConfig;
  onUpdateConfig: (updated: Partial<EntityConfig>) => void;
  onProceedToNext?: () => void;
}

export const AuditAppointmentView: React.FC<AuditAppointmentViewProps> = ({
  config,
  onUpdateConfig,
  onProceedToNext,
}) => {
  const currentData = getDefaultAuditAppointment(config);
  const [formData, setFormData] = useState<AuditAppointmentConfig>(currentData);
  const [activeTab, setActiveTab] = useState<'fields' | 'client_letter' | 'acceptance_letter'>('fields');
  const [isCopied, setIsCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const isProprietor = config.entityType === 'Sole Proprietorship';
  const clientSigner = formData.appointeeSignatory || (isProprietor ? config.proprietorName || 'Proprietor' : config.signingPartnerName || config.partners?.[0]?.name || 'Managing Partner');
  const auditorFirm = config.auditorFirmName || config.auditorName || 'Chartered Accountants';
  const auditorPerson = config.auditorName || 'Chartered Accountant';

  const handleFieldChange = (field: keyof AuditAppointmentConfig, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    setIsSaved(false);
  };

  const handleSave = () => {
    onUpdateConfig({ auditAppointment: formData });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const applyPreset = (presetType: 'tax_audit' | 'partnership' | 'proprietor' | 'llp') => {
    const startYear = parseInt((config.financialYear || '2025-26').slice(0, 4), 10) || 2025;
    const ay = `${startYear + 1}-${(startYear + 2).toString().slice(2)}`;
    if (presetType === 'tax_audit') {
      const updated: AuditAppointmentConfig = {
        ...formData,
        appointingAuthority: isProprietor ? 'Sole Proprietor' : 'Partners of the Firm',
        statutorySection: 'Section 44AB of the Income Tax Act, 1961 read with ICAI Non-Corporate Entity Guidance Note',
        scopeDescription: 'Statutory tax audit of financial statements (Balance Sheet, Profit & Loss Statement, Notes 1-25) and issuance of Form 3CB & Form 3CD with UDIN.',
        auditTenure: `Financial Year ${config.financialYear} (Assessment Year ${ay})`,
      };
      setFormData(updated);
      onUpdateConfig({ auditAppointment: updated });
    } else if (presetType === 'partnership') {
      const updated: AuditAppointmentConfig = {
        ...formData,
        appointingAuthority: 'Partners of the Firm (unanimous partner resolution)',
        statutorySection: 'Partnership Deed Clause and ICAI Technical Guide on Accounting for Partnership Firms',
        scopeDescription: 'Comprehensive annual financial audit, partner capital schedule verification, and tax compliance review.',
        auditTenure: `Financial Year ${config.financialYear}`,
      };
      setFormData(updated);
      onUpdateConfig({ auditAppointment: updated });
    } else if (presetType === 'proprietor') {
      const updated: AuditAppointmentConfig = {
        ...formData,
        appointingAuthority: 'Sole Proprietor',
        statutorySection: 'Income Tax Act 1961 and Bank Credit / Working Capital Audit requirements',
        scopeDescription: 'Audit of proprietary business books of account, stock statements, and certified financial statements.',
        auditTenure: `Financial Year ${config.financialYear}`,
      };
      setFormData(updated);
      onUpdateConfig({ auditAppointment: updated });
    } else if (presetType === 'llp') {
      const updated: AuditAppointmentConfig = {
        ...formData,
        appointingAuthority: 'Designated Partners of LLP',
        statutorySection: 'Section 34(4) of the Limited Liability Partnership Act, 2008 & Rule 24 of LLP Rules, 2009',
        scopeDescription: 'Statutory audit of Statement of Account & Solvency (Form 8) and filing of Tax Audit under Form 3CB/3CD.',
        auditTenure: `Financial Year ${config.financialYear}`,
      };
      setFormData(updated);
      onUpdateConfig({ auditAppointment: updated });
    }
  };

  const getClientLetterText = () => {
    return `APPOINTMENT LETTER FOR STATUTORY AUDIT
Date: ${formData.appointmentDate || '15-09-2025'}
Ref No: ${formData.resolutionNumber || 'AUD/APPT/2025-26/01'}

To,
${auditorFirm}
Chartered Accountants
${config.registeredAddress ? `Address: ${config.registeredAddress}` : ''}
${config.firmRegistrationNo ? `Firm Reg. No: ${config.firmRegistrationNo}` : ''}

Dear Sir / Madam,

Sub: Appointment as Statutory Auditor for ${formData.auditTenure || `Financial Year ${config.financialYear}`}

We are pleased to inform you that the ${formData.appointingAuthority || 'Partners of the Firm'} of ${config.entityName} have resolved to appoint your firm, M/s ${auditorFirm}, as the Statutory Auditors of our entity for ${formData.auditTenure || `Financial Year ${config.financialYear}`}.

1. Governing Framework & Authority:
This appointment is made pursuant to ${formData.statutorySection || 'Section 44AB of the Income Tax Act, 1961 read with ICAI Guidance Note on Non-Corporate Entities'}.

2. Scope of Audit & Deliverables:
${formData.scopeDescription || 'Audit of Balance Sheet, Statement of Profit and Loss, Statutory Notes to Accounts, and Form 3CB/3CD Tax Audit Annexures with UDIN.'}

3. Audit Remuneration:
The agreed audit fees for the assignment shall be ₹${(formData.proposedAuditFees ?? 25000).toLocaleString('en-IN')} (${formData.auditFeeTerms || 'plus applicable GST and reimbursement of actual out-of-pocket expenses'}).

4. Access to Books of Account:
Management will provide full, unrestricted access to all books of account, subsidiary registers, branch records, vouchers, and management explanations required to conduct the audit under the Standards on Auditing (SAs) issued by the ICAI.

Please confirm your acceptance of the appointment by returning the duplicate copy of this letter duly signed.

Thanking you,
Yours faithfully,
For ${config.entityName}

__________________________
${clientSigner}
${isProprietor ? 'Sole Proprietor' : 'Authorized Partner'}`;
  };

  const getAcceptanceLetterText = () => {
    return `LETTER OF ACCEPTANCE OF AUDIT APPOINTMENT (ICAI SA 210)
Date: ${formData.acceptanceDate || '20-09-2025'}
Ref No: ${formData.acceptanceLetterRef || 'CA/AUD/ACC/2025-26/01'}

To,
The ${formData.appointingAuthority || 'Partners'}
${config.entityName}
${config.registeredAddress || config.address || ''}

Dear Sir / Madam,

Sub: Acceptance of Appointment as Statutory Auditors for ${formData.auditTenure || `Financial Year ${config.financialYear}`}

We refer to your letter of appointment dated ${formData.appointmentDate || '15-09-2025'} (Ref: ${formData.resolutionNumber || 'AUD/APPT/2025-26/01'}) appointing our firm M/s ${auditorFirm} as the Statutory Auditors of ${config.entityName}.

1. Confirmation of Acceptance:
We have great pleasure in accepting the appointment as Statutory Auditors under ${formData.statutorySection || 'Section 44AB of the Income Tax Act, 1961'}.

2. Standards on Auditing & Independence:
Our audit will be conducted in accordance with the Standards on Auditing (SAs) issued by the Institute of Chartered Accountants of India (ICAI). We confirm that:
a) Our appointment is within the statutory ceiling limits prescribed by the ICAI.
b) We maintain independence in mental attitude and appearance in accordance with the ICAI Code of Ethics.
${formData.priorAuditorName ? `c) Professional communication / NOC has been completed with the predecessor auditor (${formData.priorAuditorName}) in compliance with Clause 8 of Part I of First Schedule to the Chartered Accountants Act, 1949.` : 'c) We are the continuing auditors / compliance with ICAI Code of Ethics is verified.'}

3. Audit Fees:
We confirm acceptance of the audit fee of ₹${(formData.proposedAuditFees ?? 25000).toLocaleString('en-IN')} ${formData.auditFeeTerms || 'plus applicable GST and out-of-pocket expenses'}.

We thank you for the confidence reposed in our firm and assure you of our best professional services.

Yours faithfully,
For ${auditorFirm}
Chartered Accountants
${config.firmRegistrationNo ? `Firm Registration No: ${config.firmRegistrationNo}` : ''}

__________________________
${auditorPerson}
${config.auditorRole || 'Partner'}
Membership No: ${config.auditorMembershipNo || 'Chartered Accountant'}`;
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadWord = (text: string, title: string, filename: string) => {
    const safeTitle = (title || 'Audit Document').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeText = (text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>${safeTitle}</title>
<style>
  @page WordSection1 { size: 210mm 297mm; margin: 20mm; }
  div.WordSection1 { page: WordSection1; }
  body { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.5; color: #000; }
  h1 { font-family: Arial, sans-serif; font-size: 14pt; text-align: center; }
</style>
</head>
<body>
<div class="WordSection1" style="white-space: pre-line;">${safeText}</div>
</body></html>`;
    const blob = new Blob(['\ufeff' + html], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleDownloadTxt = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-200">
                ICAI SA 210
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Agreeing the Terms of Audit Engagements
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Audit Appointment &amp; Engagement Letter Generator
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Draft, customize, and generate official client appointment letters, resolution records, and auditor acceptance letters conforming to ICAI Standards on Auditing.
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
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Letter</span>
            </button>
          </div>
        </div>

        {/* Sub-Tabs */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-100 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('fields')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'fields'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>1. Appointment Fields &amp; Parameters</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('client_letter')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'client_letter'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4 text-indigo-400" />
            <span>2. Client Appointment Letter</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('acceptance_letter')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'acceptance_letter'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>3. Auditor Acceptance Letter (SA 210)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. CREATION & CONFIGURATION FIELDS                                         */}
      {/* ========================================================================= */}
      {activeTab === 'fields' && (
        <div className="space-y-6">
          {/* Quick Presets */}
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Quick Appointment Templates &amp; Presets</span>
              </span>
              <span className="text-[11px] text-indigo-700">One-click standard statutory engagement terms</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => applyPreset('tax_audit')}
                className="p-2.5 rounded-xl bg-white hover:bg-indigo-100/60 border border-indigo-200 text-left transition text-xs cursor-pointer"
              >
                <div className="font-bold text-slate-900">Section 44AB Tax Audit</div>
                <div className="text-[10px] text-slate-500 mt-0.5">ICAI Form 3CB/3CD &amp; UDIN</div>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('partnership')}
                className="p-2.5 rounded-xl bg-white hover:bg-indigo-100/60 border border-indigo-200 text-left transition text-xs cursor-pointer"
              >
                <div className="font-bold text-slate-900">Partnership Deed Audit</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Capital accounts &amp; deed terms</div>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('proprietor')}
                className="p-2.5 rounded-xl bg-white hover:bg-indigo-100/60 border border-indigo-200 text-left transition text-xs cursor-pointer"
              >
                <div className="font-bold text-slate-900">Proprietorship Bank Audit</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Working capital &amp; stock audit</div>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('llp')}
                className="p-2.5 rounded-xl bg-white hover:bg-indigo-100/60 border border-indigo-200 text-left transition text-xs cursor-pointer"
              >
                <div className="font-bold text-slate-900">LLP Statutory Audit</div>
                <div className="text-[10px] text-slate-500 mt-0.5">LLP Act Sec 34(4) &amp; Form 8</div>
              </button>
            </div>
          </div>

          {/* Form Fields Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>Engagement &amp; Appointment Authority Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Appointment Date</label>
                <input
                  type="text"
                  value={formData.appointmentDate || ''}
                  onChange={(e) => handleFieldChange('appointmentDate', e.target.value)}
                  placeholder="e.g. 15-09-2025"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Resolution / Ref Number</label>
                <input
                  type="text"
                  value={formData.resolutionNumber || ''}
                  onChange={(e) => handleFieldChange('resolutionNumber', e.target.value)}
                  placeholder="e.g. AUD/APPT/2025-26/01"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Appointing Authority</label>
                <input
                  type="text"
                  value={formData.appointingAuthority || ''}
                  onChange={(e) => handleFieldChange('appointingAuthority', e.target.value)}
                  placeholder="e.g. Partners of the Firm / Sole Proprietor"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Audit Tenure / Period</label>
                <input
                  type="text"
                  value={formData.auditTenure || ''}
                  onChange={(e) => handleFieldChange('auditTenure', e.target.value)}
                  placeholder="e.g. Financial Year 2025-26 (AY 2026-27)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Client Signing Authority</label>
                <input
                  type="text"
                  value={formData.appointeeSignatory || ''}
                  onChange={(e) => handleFieldChange('appointeeSignatory', e.target.value)}
                  placeholder="e.g. Managing Partner / Proprietor"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Statutory Section / Authority</label>
                <input
                  type="text"
                  value={formData.statutorySection || ''}
                  onChange={(e) => handleFieldChange('statutorySection', e.target.value)}
                  placeholder="e.g. Section 44AB of Income Tax Act 1961"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3 pt-2">
              <Award className="w-4 h-4 text-indigo-600" />
              <span>Audit Remuneration &amp; Predecessor Auditor (NOC)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Agreed Audit Fee (₹)</label>
                <input
                  type="number"
                  value={formData.proposedAuditFees ?? 25000}
                  onChange={(e) => handleFieldChange('proposedAuditFees', parseFloat(e.target.value) || 0)}
                  placeholder="25000"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none font-bold text-emerald-800"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Fee Terms &amp; Out-of-Pocket Expenses</label>
                <input
                  type="text"
                  value={formData.auditFeeTerms || ''}
                  onChange={(e) => handleFieldChange('auditFeeTerms', e.target.value)}
                  placeholder="Plus applicable GST and reimbursement of actual conveyance/out-of-pocket expenses"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Predecessor Auditor Name (if any)</label>
                <input
                  type="text"
                  value={formData.priorAuditorName || ''}
                  onChange={(e) => handleFieldChange('priorAuditorName', e.target.value)}
                  placeholder="Leave blank if continuing auditor"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">ICAI NOC / Communication Reference</label>
                <input
                  type="text"
                  value={formData.nocReference || ''}
                  onChange={(e) => handleFieldChange('nocReference', e.target.value)}
                  placeholder="NOC obtained / continuing appointment under ICAI Code of Ethics"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3 pt-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Auditor Acceptance &amp; Scope Specification</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Auditor Acceptance Date</label>
                <input
                  type="text"
                  value={formData.acceptanceDate || ''}
                  onChange={(e) => handleFieldChange('acceptanceDate', e.target.value)}
                  placeholder="e.g. 20-09-2025"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Acceptance Letter Ref No.</label>
                <input
                  type="text"
                  value={formData.acceptanceLetterRef || ''}
                  onChange={(e) => handleFieldChange('acceptanceLetterRef', e.target.value)}
                  placeholder="e.g. CA/AUD/ACC/2025-26/01"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Scope of Audit &amp; Deliverables Description</label>
                <textarea
                  rows={3}
                  value={formData.scopeDescription || ''}
                  onChange={(e) => handleFieldChange('scopeDescription', e.target.value)}
                  placeholder="Audit of Balance Sheet, Statement of Profit & Loss, 25 Statutory Notes to Accounts, and Form 3CB/3CD Tax Audit Annexures."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none leading-relaxed"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4 text-emerald-400" />
                <span>Save Appointment Settings</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('client_letter')}
                className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>View &amp; Print Client Appointment Letter</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CLIENT APPOINTMENT LETTER PREVIEW & PRINT                              */}
      {/* ========================================================================= */}
      {activeTab === 'client_letter' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-100 p-3 rounded-xl text-xs">
            <span className="font-semibold text-slate-700">Official Client Letter of Appointment</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopy(getClientLetterText())}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Copied!' : 'Copy Letter'}</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span>Print Document</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 shadow-sm font-serif text-slate-900 space-y-6 text-sm leading-relaxed max-w-3xl mx-auto">
            {/* Letterhead */}
            <div className="text-center border-b border-slate-300 pb-5">
              <h1 className="text-xl font-bold uppercase tracking-wide font-sans">{config.entityName}</h1>
              <p className="text-xs text-slate-600 font-sans mt-0.5">
                {config.registeredAddress || config.address || 'Registered Office Address'}
              </p>
              {config.pan && <p className="text-xs text-slate-500 font-mono mt-0.5">PAN: {config.pan} • GSTIN: {config.gstin || 'N/A'}</p>}
            </div>

            <div className="flex justify-between items-baseline font-sans text-xs text-slate-700">
              <div>
                <strong>Ref No:</strong> <span className="font-mono">{formData.resolutionNumber || 'AUD/APPT/2025-26/01'}</span>
              </div>
              <div>
                <strong>Date:</strong> {formData.appointmentDate || '15-09-2025'}
              </div>
            </div>

            <div className="text-xs font-sans leading-normal">
              <div>To,</div>
              <div className="font-bold text-slate-900 text-sm">M/s {auditorFirm}</div>
              <div>Chartered Accountants</div>
              {config.firmRegistrationNo && <div>Firm Registration No: {config.firmRegistrationNo}</div>}
              {config.placeOfSigning && <div>{config.placeOfSigning}</div>}
            </div>

            <div className="font-sans font-bold text-sm text-slate-900 underline">
              Sub: Appointment as Statutory Auditor for {formData.auditTenure || `Financial Year ${config.financialYear}`}
            </div>

            <p>Dear Sir / Madam,</p>

            <p>
              We are pleased to inform you that the {formData.appointingAuthority || 'Partners of the Firm'} of <strong>{config.entityName}</strong> have resolved to appoint your firm, <strong>M/s {auditorFirm}</strong>, as the Statutory Auditors of our entity for {formData.auditTenure || `Financial Year ${config.financialYear}`}.
            </p>

            <p>
              <strong>1. Statutory Framework &amp; Authority:</strong><br />
              This appointment is made pursuant to {formData.statutorySection || 'Section 44AB of the Income Tax Act, 1961 read with the Guidance Note on Financial Statements of Non-Corporate Entities issued by the Institute of Chartered Accountants of India (ICAI)'}.
            </p>

            <p>
              <strong>2. Scope of Audit &amp; Deliverables:</strong><br />
              {formData.scopeDescription || 'Audit of the Balance Sheet, Statement of Profit and Loss, 25 Statutory Notes to Accounts, and Form 3CB & Form 3CD Tax Audit Annexures with UDIN.'}
            </p>

            <p>
              <strong>3. Remuneration:</strong><br />
              The agreed audit fee for the assignment shall be <strong>₹{(formData.proposedAuditFees ?? 25000).toLocaleString('en-IN')}</strong> ({formData.auditFeeTerms || 'plus applicable GST and reimbursement of actual out-of-pocket expenses'}).
            </p>

            <p>
              <strong>4. Management Undertaking &amp; Record Access:</strong><br />
              Management undertakes to provide your audit team with unrestricted access to all books of account, subsidiary ledgers, vouchers, branch records, agreements, and all information and explanations required for the conduct of the statutory audit in accordance with the Standards on Auditing (SAs) issued by the ICAI.
            </p>

            <p>
              Please confirm your acceptance of the appointment by returning a copy of this letter duly endorsed.
            </p>

            <div className="pt-8 flex justify-between items-end font-sans text-xs">
              <div>
                <p>Accepted and Confirmed:</p>
                <div className="mt-8 border-t border-slate-400 pt-1 text-slate-600">
                  For {auditorFirm}<br />
                  Chartered Accountants
                </div>
              </div>

              <div className="text-right">
                <p>Yours faithfully,</p>
                <p className="font-bold">For {config.entityName}</p>
                <div className="mt-8 border-t border-slate-400 pt-1">
                  <strong>{clientSigner}</strong><br />
                  <span className="text-slate-600">{isProprietor ? 'Sole Proprietor' : 'Authorized Partner'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. AUDITOR ACCEPTANCE LETTER (SA 210)                                      */}
      {/* ========================================================================= */}
      {activeTab === 'acceptance_letter' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-100 p-3 rounded-xl text-xs">
            <span className="font-semibold text-slate-700">ICAI SA 210 Compliant Auditor Acceptance Letter</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopy(getAcceptanceLetterText())}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Copied!' : 'Copy Letter'}</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span>Print Document</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 shadow-sm font-serif text-slate-900 space-y-6 text-sm leading-relaxed max-w-3xl mx-auto">
            {/* Letterhead */}
            <div className="text-center border-b border-slate-300 pb-5">
              <h1 className="text-xl font-bold uppercase tracking-wide font-sans text-indigo-950">
                {auditorFirm}
              </h1>
              <p className="text-xs font-semibold text-slate-600 font-sans uppercase tracking-wider">
                Chartered Accountants
              </p>
              {config.firmRegistrationNo && (
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Firm Registration No: {config.firmRegistrationNo}
                </p>
              )}
            </div>

            <div className="flex justify-between items-baseline font-sans text-xs text-slate-700">
              <div>
                <strong>Ref No:</strong> <span className="font-mono">{formData.acceptanceLetterRef || 'CA/AUD/ACC/2025-26/01'}</span>
              </div>
              <div>
                <strong>Date:</strong> {formData.acceptanceDate || '20-09-2025'}
              </div>
            </div>

            <div className="text-xs font-sans leading-normal">
              <div>To,</div>
              <div className="font-bold text-slate-900 text-sm">The {formData.appointingAuthority || 'Partners'}</div>
              <div className="font-bold">{config.entityName}</div>
              <div>{config.registeredAddress || config.address || 'Principal Place of Business'}</div>
            </div>

            <div className="font-sans font-bold text-sm text-slate-900 underline">
              Sub: Acceptance of Appointment as Statutory Auditors under ICAI SA 210 for {formData.auditTenure || `FY ${config.financialYear}`}
            </div>

            <p>Dear Sir / Madam,</p>

            <p>
              We refer to your letter of appointment dated {formData.appointmentDate || '15-09-2025'} (Ref: {formData.resolutionNumber || 'AUD/APPT/2025-26/01'}) appointing our firm, <strong>M/s {auditorFirm}</strong>, as the Statutory Auditors of <strong>{config.entityName}</strong> for {formData.auditTenure || `Financial Year ${config.financialYear}`}.
            </p>

            <p>
              <strong>1. Acceptance &amp; Engagement Terms:</strong><br />
              We are pleased to accept the appointment and confirm our understanding of the terms and conditions of the engagement in accordance with Standard on Auditing (SA) 210, <em>"Agreeing the Terms of Audit Engagements"</em>, issued by the Institute of Chartered Accountants of India (ICAI).
            </p>

            <p>
              <strong>2. Independence &amp; Statutory Ceiling:</strong><br />
              We confirm that our appointment is in accordance with the provisions of the Chartered Accountants Act, 1949 and Code of Ethics issued by the ICAI. We further confirm that our firm is independent of the entity and that the appointment is within the prescribed statutory ceilings.
              {formData.priorAuditorName && (
                <span className="block mt-1 text-slate-700">
                  • Professional communication has been completed with the predecessor auditor (<strong>{formData.priorAuditorName}</strong>) in compliance with Clause 8 of Part I of the First Schedule to the Chartered Accountants Act, 1949.
                </span>
              )}
            </p>

            <p>
              <strong>3. Audit Scope &amp; Applicable Reporting Framework:</strong><br />
              The financial statements will be audited in accordance with the Standards on Auditing (SAs) and the <em>Guidance Note on Financial Statements of Non-Corporate Entities</em> issued by ICAI. Our audit will be conducted with the objective of expressing an opinion on whether the financial statements give a true and fair view of the state of affairs and profit/loss of the entity.
            </p>

            <p>
              <strong>4. Fees:</strong><br />
              We acknowledge and accept the agreed audit fees of <strong>₹{(formData.proposedAuditFees ?? 25000).toLocaleString('en-IN')}</strong> {formData.auditFeeTerms || 'plus applicable GST and out-of-pocket expenses'}.
            </p>

            <p>
              We appreciate the opportunity of providing professional audit services to your organization.
            </p>

            <div className="pt-8 text-right font-sans text-xs">
              <p>Yours faithfully,</p>
              <p className="font-bold text-slate-900">For {auditorFirm}</p>
              <p className="text-slate-600">Chartered Accountants</p>
              {config.firmRegistrationNo && <p className="text-slate-500 font-mono">FRN: {config.firmRegistrationNo}</p>}
              <div className="mt-8 border-t border-slate-400 pt-1 inline-block text-right">
                <strong>{auditorPerson}</strong><br />
                <span className="text-slate-600">{config.auditorRole || 'Partner'}</span><br />
                <span className="text-slate-500 font-mono">M. No: {config.auditorMembershipNo || 'Chartered Accountant'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
