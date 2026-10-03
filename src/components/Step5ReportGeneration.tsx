import React, { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  Printer,
  Mail,
  HardDrive,
  Database,
  CheckCircle2,
  ShieldCheck,
  Building2,
  Calendar,
  Zap,
  ArrowLeft,
  Sparkles,
  Layers,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import {
  EntityConfig,
  BalanceSheetData,
  ProfitAndLossData,
  NoteScheduleData,
  AuditException,
  UserProfile,
} from '../types';
import { CREDIT_COSTS } from '../data/subscriptionPlans';
import { GmailPanel } from './GmailPanel';
import { DrivePanel } from './DrivePanel';
import type { User } from 'firebase/auth';

interface Step5ReportGenerationProps {
  config: EntityConfig;
  computedFinancials: {
    balanceSheet: BalanceSheetData;
    profitAndLoss: ProfitAndLossData;
    noteSchedules: Record<number, NoteScheduleData>;
  };
  exceptions: AuditException[];
  onExportExcel: () => void;
  onOpenBackupRestore?: () => void;
  onRestoreBackup?: (backupData: any) => void;
  currentUser?: UserProfile | null;
  onOpenSubscriptionModal?: () => void;
  user?: User | null;
  accessToken?: string | null;
  onAuthSuccess?: (user: User, token: string) => void;
  onSignOut?: () => void;
  onBackToStep4: () => void;
  onSwitchCompany: () => void;
}

export const Step5ReportGeneration: React.FC<Step5ReportGenerationProps> = ({
  config,
  computedFinancials,
  exceptions,
  onExportExcel,
  onOpenBackupRestore,
  onRestoreBackup,
  currentUser,
  onOpenSubscriptionModal,
  user,
  accessToken,
  onAuthSuccess,
  onSignOut,
  onBackToStep4,
  onSwitchCompany,
}) => {
  const [activeDeliveryTab, setActiveDeliveryTab] = useState<'export' | 'gmail' | 'drive'>('export');
  const [isExporting, setIsExporting] = useState(false);

  const bs = computedFinancials.balanceSheet;
  const pl = computedFinancials.profitAndLoss;

  const formatCompactINR = (val?: number) => {
    if (val === undefined || isNaN(val)) return '₹ 0.00';
    const abs = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    if (abs >= 10000000) return `${sign}₹ ${(abs / 10000000).toFixed(2)} Cr`;
    if (abs >= 100000) return `${sign}₹ ${(abs / 100000).toFixed(2)} L`;
    return `${sign}₹ ${abs.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const handleExportClick = () => {
    setIsExporting(true);
    try {
      onExportExcel();
    } finally {
      setTimeout(() => setIsExporting(false), 1200);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                Step 5 of 5 • Final Step
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Engagement Finalization & Report Generation
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Statutory Audit Report Generation & Delivery
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Generate formatted multi-sheet Excel workbooks (.xlsx), print statutory PDF statements, email clients via Gmail, or archive workpapers to Google Drive.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
            <button
              type="button"
              onClick={onBackToStep4}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Step 4</span>
            </button>

            <button
              type="button"
              onClick={onSwitchCompany}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span>Switch / Add Company</span>
            </button>
          </div>
        </div>

        {/* Inner Delivery Sub-Tabs */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-100 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveDeliveryTab('export')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              activeDeliveryTab === 'export'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>1. Download Excel & Print PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDeliveryTab('gmail')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              activeDeliveryTab === 'gmail'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Mail className="w-4 h-4 text-indigo-400" />
            <span>2. Client Email Transmittal</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDeliveryTab('drive')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              activeDeliveryTab === 'drive'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <HardDrive className="w-4 h-4 text-sky-400" />
            <span>3. Google Drive Archival & Backup</span>
          </button>
        </div>
      </div>

      {/* Engagement Final Summary Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm text-white space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Audit Engagement Tallied & Validated
              </span>
              <span className="text-slate-400">• ICAI Non-Corporate Entity Format</span>
            </div>
            <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2 pt-1">
              <Building2 className="w-5 h-5 text-emerald-400" />
              <span>{config.entityName}</span>
            </h3>
            {(config.registeredAddress || config.address) && (
              <div className="text-xs text-slate-300">
                {config.registeredAddress || config.address}
              </div>
            )}
            <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap pt-0.5">
              <span>{config.entityType}</span>
              <span>•</span>
              <span>Financial Year: <strong className="text-emerald-400">FY {config.financialYear}</strong></span>
              <span>•</span>
              <span>Reporting Date: {config.reportingPeriod || 'March 31, 2025'}</span>
              {config.entityType === 'Sole Proprietorship' && config.proprietorName && (
                <>
                  <span>•</span>
                  <span>Proprietor: <strong className="text-slate-200">{config.proprietorName}</strong></span>
                </>
              )}
              {config.entityType !== 'Sole Proprietorship' && (
                <>
                  <span>•</span>
                  <span>Signing Partner: <strong className="text-emerald-300">{config.signingPartnerName || config.partners?.find(p => p.isSigningPartner)?.name || config.partners?.[0]?.name || 'Authorized Partner'}</strong></span>
                </>
              )}
              {(config.auditorFirmName || config.auditorName) && (
                <>
                  <span>•</span>
                  <span>
                    Auditor: {config.auditorName || 'Chartered Accountant'}
                    {config.auditorRole ? ` (${config.auditorRole})` : ''}
                    {config.auditorFirmName ? ` • ${config.auditorFirmName}` : ''}
                    {config.firmRegistrationNo ? ` (FRN: ${config.firmRegistrationNo})` : ''}
                    {config.auditorMembershipNo ? ` (M.No: ${config.auditorMembershipNo})` : ''}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center sm:text-right">
            <div className="bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700">
              <div className="text-[10px] text-slate-400 uppercase">Revenue</div>
              <div className="text-sm font-bold text-white">{formatCompactINR(pl.revenueFromOperations)}</div>
            </div>
            <div className="bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700">
              <div className="text-[10px] text-slate-400 uppercase">Net Profit</div>
              <div className={`text-sm font-bold ${pl.profitAfterTax >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatCompactINR(pl.profitAfterTax)}
              </div>
            </div>
            <div className="bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700">
              <div className="text-[10px] text-slate-400 uppercase">Balance Sheet</div>
              <div className="text-sm font-bold text-white">{formatCompactINR(bs.totalAssets)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. EXCEL REPORT GENERATION & PRINT PDF                                    */}
      {/* ========================================================================= */}
      {activeDeliveryTab === 'export' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Statutory Excel Export */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Statutory Multi-Sheet Excel Report (.xlsx)
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Generates a presentation-ready Excel workbook formatted according to ICAI Non-Corporate Entity guidelines. Includes:
              </p>
              <ul className="text-xs text-slate-600 space-y-1.5 pl-4 list-disc">
                <li>Form 3CB/3CD Ready Balance Sheet (CY &amp; PY comparative)</li>
                <li>Statement of Profit and Loss with variance analysis</li>
                <li>Complete 25 Statutory Schedule Notes with full ledger itemization</li>
                <li>Forensic Audit Exception &amp; Disclosures Sheet</li>
              </ul>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Usage Cost:</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 fill-current text-amber-500" />
                  <span>{CREDIT_COSTS.EXCEL_EXPORT} Credits</span>
                </span>
              </div>

              <button
                type="button"
                onClick={handleExportClick}
                disabled={isExporting}
                className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isExporting ? 'Generating Formatted Excel...' : 'Download Statutory Excel Report'}</span>
              </button>
            </div>
          </div>

          {/* Card 2: PDF Printing & Save */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs">
                <Printer className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Print or Save as PDF Statements
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Opens the statutory print preview formatted for official CA signing, physical stamping, and client delivery:
              </p>
              <ul className="text-xs text-slate-600 space-y-1.5 pl-4 list-disc">
                <li>Professional page breaks between Balance Sheet and Profit &amp; Loss</li>
                <li>Includes Partner / Proprietor signature blocks</li>
                <li>Includes Statutory Auditor Membership &amp; UDIN spaces</li>
                <li>Clean high-resolution typography with no screen clutter</li>
              </ul>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Printing Cost:</span>
                <span className="font-bold text-slate-700">Free / Unlimited</span>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Open Print / PDF Save Window</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. GMAIL CLIENT TRANSMITTAL                                               */}
      {/* ========================================================================= */}
      {activeDeliveryTab === 'gmail' && (
        <div className="space-y-4">
          <GmailPanel
            config={config}
            balanceSheet={bs}
            profitAndLoss={pl}
            mappedLedgers={[]}
            user={user || null}
            accessToken={accessToken || null}
            onAuthSuccess={onAuthSuccess}
            onSignOut={onSignOut}
            initialTemplateId="financial_statements_transmittal"
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. GOOGLE DRIVE ARCHIVAL & BACKUP                                         */}
      {/* ========================================================================= */}
      {activeDeliveryTab === 'drive' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Offline &amp; Cloud Backup</h4>
                <p className="text-xs text-slate-500">
                  Export complete engagement JSON bundle for local archival or migration.
                </p>
              </div>
            </div>

            {onOpenBackupRestore && (
              <button
                type="button"
                onClick={onOpenBackupRestore}
                className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Open Backup &amp; Restore Hub</span>
              </button>
            )}
          </div>

          <DrivePanel
            config={config}
            balanceSheet={bs}
            profitAndLoss={pl}
            noteSchedules={computedFinancials.noteSchedules}
            exceptions={exceptions}
            rawRows={[]}
            mappedLedgers={[]}
            pyRawRows={[]}
            pyMappedLedgers={[]}
            user={user || null}
            accessToken={accessToken || null}
            onAuthSuccess={onAuthSuccess || (() => {})}
            onSignOut={onSignOut || (() => {})}
            onImportTrialBalance={() => {}}
            onRestoreBackup={onRestoreBackup}
          />
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToStep4}
          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Step 4: Statutory Notes &amp; Audit</span>
        </button>

        <div className="text-xs text-slate-500">
          Engagement Complete 🎉 • Ready for Client Delivery
        </div>

        <button
          type="button"
          onClick={onSwitchCompany}
          className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer"
        >
          <Building2 className="w-4 h-4 text-emerald-400" />
          <span>Switch or Create Another Company</span>
        </button>
      </div>
    </div>
  );
};
