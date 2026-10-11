import React, { useState } from 'react';
import {
  FileText,
  Printer,
  Copy,
  Check,
  Save,
  Building2,
  Calendar,
  ShieldCheck,
  Award,
  Sparkles,
  HelpCircle,
  FileCheck,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { EntityConfig, ManagementRepresentationConfig } from '../types';
import { getDefaultManagementRepresentation } from '../utils/auditDossierDefaults';

interface ManagementRepresentationViewProps {
  config: EntityConfig;
  onUpdateConfig: (updated: Partial<EntityConfig>) => void;
}

export const ManagementRepresentationView: React.FC<ManagementRepresentationViewProps> = ({
  config,
  onUpdateConfig,
}) => {
  const currentData = getDefaultManagementRepresentation(config);
  const [formData, setFormData] = useState<ManagementRepresentationConfig>(currentData);
  const [activeTab, setActiveTab] = useState<'fields' | 'preview'>('fields');
  const [isCopied, setIsCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const isProprietor = config.entityType === 'Sole Proprietorship';
  const primarySigner = formData.signatoryName || (isProprietor ? config.proprietorName || 'Proprietor' : config.signingPartnerName || config.partners?.[0]?.name || 'Managing Partner');
  const primaryDesignation = formData.signatoryDesignation || (isProprietor ? 'Sole Proprietor' : 'Managing Partner');
  const auditorFirm = config.auditorFirmName || config.auditorName || 'Chartered Accountants';

  const handleFieldChange = (field: keyof ManagementRepresentationConfig, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    setIsSaved(false);
  };

  const handleSave = () => {
    onUpdateConfig({ managementRepresentation: formData });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const getFullLetterText = () => {
    return `MANAGEMENT REPRESENTATION LETTER (ICAI SA 580)
Date: ${formData.letterDate || '31-03-2026'}

To,
M/s ${auditorFirm}
Chartered Accountants
${config.registeredAddress ? `Address: ${config.registeredAddress}` : ''}
${config.firmRegistrationNo ? `Firm Reg. No: ${config.firmRegistrationNo}` : ''}

Dear Sir / Madam,

Sub: Management Representation Letter for Statutory Audit for the Year Ended ${config.reportingPeriod || 'March 31, 2026'}

This representation letter is provided in connection with your audit of the financial statements of ${config.entityName} ("the Entity") for the year ended ${config.reportingPeriod || 'March 31, 2026'}, for the purpose of expressing an opinion as to whether the financial statements give a true and fair view in accordance with the Guidance Note on Financial Statements of Non-Corporate Entities issued by the Institute of Chartered Accountants of India (ICAI).

We confirm, to the best of our knowledge and belief, having made appropriate inquiries, the following representations:

1. Financial Statements & Preparation Responsibility:
We acknowledge our responsibility for the preparation and fair presentation of the financial statements in accordance with the Guidance Note on Financial Statements of Non-Corporate Entities issued by the ICAI, relevant accounting standards, and applicable legal/deed provisions.

2. Completeness of Transactions & Access to Records:
We have made available to you all books of account, vouchers, agreements, minute books, bank statements, branch records, and all other relevant documentation. All transactions undertaken by the Entity during the year have been properly recorded in the accounting records and are reflected in the financial statements.

3. Inventory & Physical Verification:
The inventories as at the year-end were ${formData.inventoryValuationMethod || 'valued at the lower of cost and net realizable value on FIFO basis'}. Complete physical verification of all inventories was carried out by management at the year-end. No obsolete, damaged or unserviceable goods are carried at values exceeding their net realizable value.

4. Cash and Bank Balances:
Physical verification of cash-in-hand was carried out by management as on the closing date, and the physical count tallied with the cash book balance. All bank accounts operated by the Entity during the year are recorded in the books and have been duly reconciled.

5. Trade Receivables & Loans/Advances:
Trade receivables and loans and advances are good and recoverable to the best of our knowledge. In our opinion, adequate provision has been made in the accounts for any doubtful debts or unrecoverable advances.

6. Trade Payables & MSMED Act Compliance:
The Entity has identified Micro, Small and Medium Enterprises based on available supplier information. ${formData.msmeComplianceConfirmed ? 'Disclosures under Section 22 of the MSMED Act, 2006 have been made based on confirmations received.' : 'No interest liability is payable under the MSMED Act.'}

7. Cash Transactions under Section 269SS & 269T:
${formData.sec269ComplianceConfirmed ? 'No loan or deposit or specified sum has been accepted or repaid in cash exceeding the prescribed limits of Section 269SS and Section 269T of the Income Tax Act, 1961.' : 'All cash transaction compliances have been reviewed.'}

8. Litigations, Claims & Contingent Liabilities:
${formData.litigationDetails || 'There are no pending litigations, disputes with tax authorities (Income Tax, GST, PF, ESIC) or claims against the Entity other than those disclosed.'}
${formData.contingentLiabilitiesDetails || 'There are no material contingent liabilities or capital commitments that require disclosure.'}

9. Fraud & Irregularities:
We acknowledge our responsibility for the design and implementation of internal controls to prevent and detect fraud. We have disclosed to you that there are no known frauds, suspected frauds, or allegations of fraud affecting the Entity.

10. Related Party Transactions & Deed Terms:
All transactions with related parties, including partner remuneration and interest on capital, have been made in strict adherence to the Partnership Deed / constitution and the provisions of Section 40(b) of the Income Tax Act, 1961.

11. Subsequent Events:
There have been no events subsequent to the balance sheet date that require adjustments to or disclosure in the financial statements.

12. Specific Representations:
${formData.customRepresentations || 'All transactions have been recorded in the normal course of business.'}

Yours faithfully,
For ${config.entityName}

__________________________
${primarySigner}
${primaryDesignation}

${formData.coSignatoryName ? `__________________________\n${formData.coSignatoryName}\n${formData.coSignatoryDesignation || 'Partner'}` : ''}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getFullLetterText());
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                ICAI SA 580
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Written Representations from Management
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Management Representation Letter (MRL) Generator
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Draft and generate statutory Management Representation Letters conforming to ICAI Standard on Auditing (SA) 580 for inventory, cash, MSME, litigations, and tax declarations.
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
            <span>1. MRL Creation Fields &amp; Confirmation Points</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'preview'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FileCheck className="w-4 h-4 text-indigo-400" />
            <span>2. Formatted Letterhead Preview &amp; Print</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. CREATION FIELDS TAB                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'fields' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-6">
          {/* Signatory and Date */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>Date &amp; Authorized Management Signatories</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date of Representation Letter</label>
                <input
                  type="text"
                  value={formData.letterDate || ''}
                  onChange={(e) => handleFieldChange('letterDate', e.target.value)}
                  placeholder="e.g. 31-03-2026"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Should match or precede audit report signing date
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Primary Signatory Name</label>
                <input
                  type="text"
                  value={formData.signatoryName || ''}
                  onChange={(e) => handleFieldChange('signatoryName', e.target.value)}
                  placeholder="e.g. Managing Partner / Proprietor"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Primary Designation</label>
                <input
                  type="text"
                  value={formData.signatoryDesignation || ''}
                  onChange={(e) => handleFieldChange('signatoryDesignation', e.target.value)}
                  placeholder="Managing Partner / Sole Proprietor"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Co-Signatory Name (Optional)</label>
                <input
                  type="text"
                  value={formData.coSignatoryName || ''}
                  onChange={(e) => handleFieldChange('coSignatoryName', e.target.value)}
                  placeholder="e.g. Second Partner / Director"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Co-Signatory Designation</label>
                <input
                  type="text"
                  value={formData.coSignatoryDesignation || ''}
                  onChange={(e) => handleFieldChange('coSignatoryDesignation', e.target.value)}
                  placeholder="Partner"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Statutory Management Confirmations */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Mandatory ICAI SA 580 Statutory Confirmations</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.physicalVerificationConfirmed ?? true}
                  onChange={(e) => handleFieldChange('physicalVerificationConfirmed', e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded mt-0.5"
                />
                <div>
                  <span className="font-bold text-slate-900 block">Inventory Physical Verification</span>
                  <span className="text-[10px] text-slate-500">Confirmed physical count at year-end</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.cashInHandVerified ?? true}
                  onChange={(e) => handleFieldChange('cashInHandVerified', e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded mt-0.5"
                />
                <div>
                  <span className="font-bold text-slate-900 block">Cash Count &amp; Reconciliation</span>
                  <span className="text-[10px] text-slate-500">Physical cash tallied with cash book</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.receivablesRecoverableConfirmed ?? true}
                  onChange={(e) => handleFieldChange('receivablesRecoverableConfirmed', e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded mt-0.5"
                />
                <div>
                  <span className="font-bold text-slate-900 block">Receivables Recoverability</span>
                  <span className="text-[10px] text-slate-500">Debts considered good &amp; adequate provision</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.msmeComplianceConfirmed ?? true}
                  onChange={(e) => handleFieldChange('msmeComplianceConfirmed', e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded mt-0.5"
                />
                <div>
                  <span className="font-bold text-slate-900 block">MSMED Act Section 22 Compliance</span>
                  <span className="text-[10px] text-slate-500">Supplier classification &amp; delay interest</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.sec269ComplianceConfirmed ?? true}
                  onChange={(e) => handleFieldChange('sec269ComplianceConfirmed', e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded mt-0.5"
                />
                <div>
                  <span className="font-bold text-slate-900 block">Sec 269SS &amp; 269T Cash Limits</span>
                  <span className="text-[10px] text-slate-500">No cash loans accepted/repaid &gt; ₹20k</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.fraudDeclarationConfirmed ?? true}
                  onChange={(e) => handleFieldChange('fraudDeclarationConfirmed', e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded mt-0.5"
                />
                <div>
                  <span className="font-bold text-slate-900 block">Fraud &amp; Irregularity Declaration</span>
                  <span className="text-[10px] text-slate-500">No fraud or material non-compliance detected</span>
                </div>
              </label>
            </div>
          </div>

          {/* Detailed Customizations */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileText className="w-4 h-4 text-amber-600" />
              <span>Specific Valuation, Litigation &amp; Custom Representation Fields</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Inventory Valuation &amp; Stock Verification Method
                </label>
                <input
                  type="text"
                  value={formData.inventoryValuationMethod || ''}
                  onChange={(e) => handleFieldChange('inventoryValuationMethod', e.target.value)}
                  placeholder="Valued at lower of cost or net realizable value on FIFO basis, physically verified by management as on year-end."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Litigations &amp; Disputed Tax Demands
                </label>
                <textarea
                  rows={2}
                  value={formData.litigationDetails || ''}
                  onChange={(e) => handleFieldChange('litigationDetails', e.target.value)}
                  placeholder="No disputed tax demands or court litigations outstanding against the entity."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Contingent Liabilities &amp; Guarantees
                </label>
                <textarea
                  rows={2}
                  value={formData.contingentLiabilitiesDetails || ''}
                  onChange={(e) => handleFieldChange('contingentLiabilitiesDetails', e.target.value)}
                  placeholder="There are no contingent liabilities or capital commitments that require disclosure."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Custom Entity-Specific Management Representations
                </label>
                <textarea
                  rows={3}
                  value={formData.customRepresentations || ''}
                  onChange={(e) => handleFieldChange('customRepresentations', e.target.value)}
                  placeholder="All transactions have been recorded in the normal course of business and are reflected in the financial statements in accordance with applicable deed and regulations."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none leading-relaxed"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4 text-emerald-400" />
              <span>Save Representation Parameters</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>View &amp; Print Letterhead</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PREVIEW & PRINT TAB                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-100 p-3 rounded-xl text-xs">
            <span className="font-semibold text-slate-700">Official Management Representation Letter (ICAI SA 580)</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Copied!' : 'Copy Letter'}</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span>Print Document</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 shadow-sm font-serif text-slate-900 space-y-5 text-sm leading-relaxed max-w-3xl mx-auto">
            {/* Letterhead */}
            <div className="text-center border-b border-slate-300 pb-5">
              <h1 className="text-xl font-bold uppercase tracking-wide font-sans">{config.entityName}</h1>
              <p className="text-xs text-slate-600 font-sans mt-0.5">
                {config.registeredAddress || config.address || 'Principal Place of Business'}
              </p>
              {config.pan && <p className="text-xs text-slate-500 font-mono mt-0.5">PAN: {config.pan} • GSTIN: {config.gstin || 'N/A'}</p>}
            </div>

            <div className="flex justify-between items-baseline font-sans text-xs text-slate-700">
              <div>
                <strong>Management Representation Ref:</strong> <span className="font-mono">MRL/{config.financialYear}/01</span>
              </div>
              <div>
                <strong>Date:</strong> {formData.letterDate || '31-03-2026'}
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
              Sub: Management Representation Letter for Statutory Audit for the Period Ended {config.reportingPeriod || 'March 31, 2026'}
            </div>

            <p>Dear Sir / Madam,</p>

            <p>
              This representation letter is provided in connection with your audit of the financial statements of <strong>{config.entityName}</strong> ("the Entity") for the year ended {config.reportingPeriod || 'March 31, 2026'}, for the purpose of expressing an opinion as to whether the financial statements give a true and fair view in accordance with the Guidance Note on Financial Statements of Non-Corporate Entities issued by the Institute of Chartered Accountants of India (ICAI).
            </p>

            <p>
              We confirm, to the best of our knowledge and belief, having made appropriate inquiries, the following representations:
            </p>

            <div className="space-y-3 pl-2">
              <p>
                <strong>1. Preparation Responsibility:</strong> We acknowledge our responsibility for the preparation of financial statements that give a true and fair view in accordance with ICAI guidelines.
              </p>
              <p>
                <strong>2. Completeness of Books &amp; Records:</strong> All books of account, registers, branch returns, contracts, and vouchers have been made available to you without exception. All transactions are accurately reflected in the financial statements.
              </p>
              <p>
                <strong>3. Inventory Valuation &amp; Verification:</strong> {formData.inventoryValuationMethod || 'Inventories were valued at lower of cost or net realizable value and physically verified by management at year-end.'}
              </p>
              <p>
                <strong>4. Cash and Bank Balances:</strong> Physical verification of cash was conducted as on year-end and matched with the cash book. All active bank accounts are duly recorded.
              </p>
              <p>
                <strong>5. Trade Receivables &amp; Advances:</strong> Book debts and advances are good and recoverable; adequate provision for doubtful debts has been provided.
              </p>
              <p>
                <strong>6. MSMED Act Section 22:</strong> Identification and reporting of Micro, Small and Medium Enterprises has been carried out based on supplier responses and information available.
              </p>
              <p>
                <strong>7. Cash Limits (Sections 269SS &amp; 269T):</strong> No loans or deposits in cash exceeding the prescribed threshold of ₹20,000 have been accepted or repaid.
              </p>
              <p>
                <strong>8. Litigations &amp; Contingent Liabilities:</strong> {formData.litigationDetails || 'No disputed tax demands or court litigations are outstanding against the entity.'} {formData.contingentLiabilitiesDetails || 'There are no undisclosed contingent liabilities.'}
              </p>
              <p>
                <strong>9. Fraud &amp; Internal Controls:</strong> We confirm there have been no frauds, suspected frauds, or material regulatory non-compliances.
              </p>
              <p>
                <strong>10. Related Party Transactions:</strong> Transactions with related parties and partners (including remuneration and interest on capital) have been made in strict accordance with the Partnership Deed and Section 40(b) of the Income Tax Act.
              </p>
              <p>
                <strong>11. Subsequent Events:</strong> No events have occurred after the balance sheet date that require adjustments to the financial statements.
              </p>
              {formData.customRepresentations && (
                <p>
                  <strong>12. Special Representation:</strong> {formData.customRepresentations}
                </p>
              )}
            </div>

            <div className="pt-8 text-right font-sans text-xs">
              <p>Yours faithfully,</p>
              <p className="font-bold text-slate-900">For {config.entityName}</p>
              <div className="mt-8 border-t border-slate-400 pt-1 inline-block text-right">
                <strong>{primarySigner}</strong><br />
                <span className="text-slate-600">{primaryDesignation}</span>
              </div>
              {formData.coSignatoryName && (
                <div className="mt-6 border-t border-slate-400 pt-1 inline-block text-right ml-8">
                  <strong>{formData.coSignatoryName}</strong><br />
                  <span className="text-slate-600">{formData.coSignatoryDesignation || 'Partner'}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
