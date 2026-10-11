import React, { useState, useEffect } from 'react';
import { X, FileText, Building2, ShieldCheck, Award, Layers } from 'lucide-react';
import { EntityConfig, BalanceSheetData, ProfitAndLossData, NoteScheduleData } from '../types';
import { CoverPageView } from './CoverPageView';
import { AuditAppointmentView } from './AuditAppointmentView';
import { ManagementRepresentationView } from './ManagementRepresentationView';

export type AuditDossierTab = 'cover_page' | 'appointment' | 'mrl';

interface AuditDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: EntityConfig;
  balanceSheet?: BalanceSheetData;
  profitAndLoss?: ProfitAndLossData;
  noteSchedules?: Record<number, NoteScheduleData>;
  onUpdateConfig: (updated: Partial<EntityConfig>) => void;
  initialTab?: AuditDossierTab;
}

export const AuditDossierModal: React.FC<AuditDossierModalProps> = ({
  isOpen,
  onClose,
  config,
  balanceSheet,
  profitAndLoss,
  noteSchedules,
  onUpdateConfig,
  initialTab = 'cover_page',
}) => {
  const [activeTab, setActiveTab] = useState<AuditDossierTab>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl my-auto max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight flex items-center gap-2">
                <span>Statutory Audit Working Paper Dossier</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-slate-700 font-mono">
                  {config.entityName}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                ICAI Standards on Auditing (SA 210, SA 580) &amp; Statutory Non-Corporate Entity Presentation
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition rounded-lg p-1.5 hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 border-b border-slate-200 overflow-x-auto shrink-0 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('cover_page')}
            className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'cover_page'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>1. Audit Report Cover Page</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('appointment')}
            className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'appointment'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>2. Audit Appointment &amp; Acceptance (SA 210)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mrl')}
            className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'mrl'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>3. Management Representation Letter (SA 580)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {activeTab === 'cover_page' && (
            <CoverPageView
              config={config}
              onUpdateConfig={onUpdateConfig}
            />
          )}

          {activeTab === 'appointment' && (
            <AuditAppointmentView
              config={config}
              onUpdateConfig={onUpdateConfig}
            />
          )}

          {activeTab === 'mrl' && (
            <ManagementRepresentationView
              config={config}
              balanceSheet={balanceSheet}
              profitAndLoss={profitAndLoss}
              noteSchedules={noteSchedules}
              onUpdateConfig={onUpdateConfig}
            />
          )}
        </div>
      </div>
    </div>
  );
};
