import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Building2,
  Calendar,
  CheckCircle2,
  ArrowRight,
  FileSpreadsheet,
  Layers,
  Download,
  Settings,
  Sliders,
  ChevronDown,
  Sparkles,
  Plus,
  Trash2,
  Printer,
  Database,
  Check,
  Search,
  AlertTriangle,
  BookOpen,
  Scale,
  Package,
  Coins,
  Home,
  ShieldCheck,
} from 'lucide-react';
import {
  EntityConfig,
  MappedLedger,
  BalanceSheetData,
  ProfitAndLossData,
  NoteScheduleData,
  AuditException,
  UserProfile,
  Company,
} from '../types';
import { NCE_NOTE_DEFINITIONS } from '../data/nceTaxonomy';
import { computePeriodTotals } from '../utils/financialCalculations';
import { Step1CurrentYear } from './Step1CurrentYear';
import { Step2PreviousYear } from './Step2PreviousYear';
import { Step3ComparativeStatements, Step3StatementTab } from './Step3ComparativeStatements';
import { Step4NotesAndAudit } from './Step4NotesAndAudit';
import { Step5ReportGeneration } from './Step5ReportGeneration';
import { TradePayablesMsmeModal } from './TradePayablesMsmeModal';
import { AuditDossierModal, AuditDossierTab } from './AuditDossierModal';
import type { User } from 'firebase/auth';

interface StepByStepWorkspaceProps {
  config: EntityConfig;
  companies?: Company[];
  activeCompanyId?: string;
  onSelectCompany?: (companyId: string) => void;
  onOpenAddCompany?: () => void;
  onExportSingleCompanyBackup?: () => void;
  onExportTotalLocalBackup?: () => void;
  mappedLedgers: MappedLedger[];
  totalDebit: number;
  totalCredit: number;
  isTallyBalanced: boolean;
  tallyDifference: number;
  tbFileName?: string;
  onUploadTB: (file: File) => void;
  onClearTB: () => void;
  onLoadSample: (datasetId: string) => void;
  onUpdateLedgerNote: (ledgerId: string, newNoteNumber: number) => void;
  onUpdateLedgerDetails?: (ledgerId: string, updatedFields: Partial<MappedLedger>, isPY?: boolean) => void;
  onAddLedger?: (newLedger: Partial<MappedLedger>, isPY?: boolean) => void;
  onDeleteLedger?: (ledgerId: string, isPY?: boolean) => void;
  onTriggerAIMap: (target?: 'CY' | 'PY') => void;
  isAIMapping: boolean;
  onOpenYearEndAdjustments: (target?: 'CY' | 'PY', onProceed?: () => void) => void;
  onOpenConfig: () => void;
  onOpenYearModal?: () => void;

  // Previous Year
  pyMappedLedgers: MappedLedger[];
  pyTotalDebit: number;
  pyTotalCredit: number;
  isPYTallyBalanced: boolean;
  pyTallyDifference: number;
  pyFileName?: string;
  onUploadPYTB: (file: File) => void;
  onClearPYTB: () => void;
  onUpdatePyLedgerNote: (ledgerId: string, newNoteNumber: number) => void;

  // Computed Statements & Notes
  computedFinancials: {
    balanceSheet: BalanceSheetData;
    profitAndLoss: ProfitAndLossData;
    noteSchedules: Record<number, NoteScheduleData>;
    computationExceptions: AuditException[];
  };
  allExceptions: AuditException[];

  // Report Generation & Export
  onExportExcel: () => void;
  onOpenBackupRestore?: () => void;
  onRestoreBackup?: (backupData: any) => void;
  onUpdateConfig: (updated: Partial<EntityConfig>) => void;
  onUploadBranchTB?: (branchId: string, file: File, period: 'CY' | 'PY') => void;
  onBulkUploadBranchTBs?: (files: File[], period: 'CY' | 'PY') => void;
  onClearBranchTB?: (branchId: string, period: 'CY' | 'PY') => void;
  onLoadSampleBranches?: (period: 'CY' | 'PY') => void;
  onUpdateBranchClosingStock?: (branchId: string, stockAmount: number | undefined, period: 'CY' | 'PY') => void;

  // Navigation
  onSwitchCompany: () => void;
  onBackToHome?: () => void;
  initialStep?: 1 | 2 | 3 | 4 | 5;
  initialNoteNumber?: number;
  onStepChange?: (step: 1 | 2 | 3 | 4 | 5) => void;

  // Auth & Cloud
  currentUser?: UserProfile | null;
  onOpenSubscriptionModal?: () => void;
  user?: User | null;
  accessToken?: string | null;
  onAuthSuccess?: (user: User, token: string) => void;
  onSignOut?: () => void;
}

type DropdownId =
  | 'home'
  | 'step1'
  | 'step2'
  | 'step3'
  | 'step4'
  | 'step5'
  | 'stock'
  | 'msme'
  | 'entity'
  | 'dossier'
  | 'settings'
  | null;

function formatShortINR(val: number | undefined | null): string {
  const num = typeof val === 'number' && !Number.isNaN(val) ? val : 0;
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export const StepByStepWorkspace: React.FC<StepByStepWorkspaceProps> = ({
  config,
  companies = [],
  activeCompanyId,
  onSelectCompany,
  onOpenAddCompany,
  onExportSingleCompanyBackup,
  onExportTotalLocalBackup,
  mappedLedgers,
  totalDebit,
  totalCredit,
  isTallyBalanced,
  tallyDifference,
  tbFileName,
  onUploadTB,
  onClearTB,
  onLoadSample,
  onUpdateLedgerNote,
  onUpdateLedgerDetails,
  onAddLedger,
  onDeleteLedger,
  onTriggerAIMap,
  isAIMapping,
  onOpenYearEndAdjustments,
  onOpenConfig,
  onOpenYearModal,
  pyMappedLedgers,
  pyTotalDebit,
  pyTotalCredit,
  isPYTallyBalanced,
  pyTallyDifference,
  pyFileName,
  onUploadPYTB,
  onClearPYTB,
  onUpdatePyLedgerNote,
  computedFinancials,
  allExceptions,
  onExportExcel,
  onOpenBackupRestore,
  onRestoreBackup,
  onUpdateConfig,
  onUploadBranchTB,
  onBulkUploadBranchTBs,
  onClearBranchTB,
  onLoadSampleBranches,
  onUpdateBranchClosingStock,
  onSwitchCompany,
  onBackToHome,
  initialStep = 1,
  initialNoteNumber,
  onStepChange,
  currentUser,
  onOpenSubscriptionModal,
  user,
  accessToken,
  onAuthSuccess,
  onSignOut,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(initialStep);
  const [step3StatementTab, setStep3StatementTab] = useState<Step3StatementTab>('balance_sheet');
  const [openDropdown, setOpenDropdown] = useState<DropdownId>(null);
  const [noteFilterQuery, setNoteFilterQuery] = useState('');
  const [entityFilterQuery, setEntityFilterQuery] = useState('');
  const barRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Keep internal step synchronized with parent/header selection
  useEffect(() => {
    if (initialStep !== undefined) {
      setCurrentStep(initialStep);
    }
  }, [initialStep]);

  const handleStepChange = (step: 1 | 2 | 3 | 4 | 5) => {
    setCurrentStep(step);
    if (onStepChange) {
      onStepChange(step);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [selectedNoteNumber, setSelectedNoteNumber] = useState<number | undefined>(initialNoteNumber);
  const [isTradePayablesModalOpen, setIsTradePayablesModalOpen] = useState(false);
  const [isAuditDossierModalOpen, setIsAuditDossierModalOpen] = useState(false);
  const [auditDossierTab, setAuditDossierTab] = useState<AuditDossierTab>('cover_page');

  const handleOpenAuditDossier = (tab: AuditDossierTab = 'cover_page') => {
    setAuditDossierTab(tab);
    setIsAuditDossierModalOpen(true);
  };

  useEffect(() => {
    if (initialNoteNumber !== undefined) {
      setSelectedNoteNumber(initialNoteNumber);
    }
  }, [initialNoteNumber]);

  const handleOpenTradePayables = () => {
    setIsTradePayablesModalOpen(true);
  };

  // Compute standalone Previous Year totals for Step 2 if PY ledgers exist
  const pyComputedFinancials = useMemo(() => {
    if (!pyMappedLedgers || pyMappedLedgers.length === 0) return null;
    try {
      return computePeriodTotals(pyMappedLedgers, config, 'Previous Period');
    } catch {
      return null;
    }
  }, [pyMappedLedgers, config]);

  const hasCYData = mappedLedgers && mappedLedgers.length > 0;
  const hasPYData = pyMappedLedgers && pyMappedLedgers.length > 0;

  const STEPS = [
    {
      step: 1 as const,
      dropdownId: 'step1' as const,
      title: 'CY Trial Balance',
      subtitle: 'TB & Mapping',
      isCompleted: hasCYData,
    },
    {
      step: 2 as const,
      dropdownId: 'step2' as const,
      title: 'PY Trial Balance',
      subtitle: 'Prior Period TB',
      isCompleted: hasPYData,
    },
    {
      step: 3 as const,
      dropdownId: 'step3' as const,
      title: 'Comparative BS & P&L',
      subtitle: 'ICAI Statements',
      isCompleted: hasCYData,
    },
    {
      step: 4 as const,
      dropdownId: 'step4' as const,
      title: 'Notes 1–25 & Audit',
      subtitle: 'Schedules & Flags',
      isCompleted: hasCYData,
    },
    {
      step: 5 as const,
      dropdownId: 'step5' as const,
      title: 'Export & Reports',
      subtitle: 'Excel, PDF & Cloud',
      isCompleted: false,
    },
  ];

  const handleSelectNote = (noteNumber: number) => {
    setSelectedNoteNumber(noteNumber);
    setCurrentStep(4);
    if (onStepChange) {
      onStepChange(4);
    }
    setOpenDropdown(null);
  };

  const filteredNotesList = useMemo(() => {
    const q = noteFilterQuery.trim().toLowerCase();
    const seen = new Set<number>();
    const all = NCE_NOTE_DEFINITIONS.filter((n) => {
      if (seen.has(n.noteNumber)) return false;
      seen.add(n.noteNumber);
      return true;
    }).map((n) => ({
      noteNumber: n.noteNumber,
      name: n.name,
      statement: n.noteNumber <= 2 ? 'Policy' : n.statement,
    }));
    if (!q) return all;
    return all.filter(
      (n) =>
        n.name.toLowerCase().includes(q) ||
        `note ${n.noteNumber}`.includes(q) ||
        String(n.noteNumber) === q
    );
  }, [noteFilterQuery]);

  const filteredEntities = useMemo(() => {
    const q = entityFilterQuery.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) => {
      const name = (c.config.entityName || '').toLowerCase();
      const pan = (c.config.pan || '').toLowerCase();
      const gstin = (c.config.gstin || '').toLowerCase();
      const fy = (c.config.financialYear || '').toLowerCase();
      return name.includes(q) || pan.includes(q) || gstin.includes(q) || fy.includes(q);
    });
  }, [companies, entityFilterQuery]);

  const toggleDropdown = (id: DropdownId) => {
    setOpenDropdown((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-4">
      {/* ========================================================================= */}
      {/* 1. STATIC PINNED WORKFLOW STEPPER BAR WITH INTERACTIVE DROPDOWNS          */}
      {/* ========================================================================= */}
      <div ref={barRef} className="sticky top-16 z-20 bg-[#F8FAFC] pt-1 pb-2 print:hidden">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs px-3 py-2 flex flex-wrap items-center justify-between gap-2">
          {/* Left: Home Dropdown + 5-Step Segmented Dropdowns */}
          <div className="flex flex-wrap items-center gap-1.5">
            {onBackToHome && (
              <div className="relative">
                <div className="inline-flex items-center rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 text-xs font-extrabold transition shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenDropdown(null);
                      onBackToHome();
                    }}
                    className="pl-2.5 pr-1.5 py-1.5 flex items-center gap-1 cursor-pointer"
                    title="Return to Executive Home Dashboard"
                  >
                    <span>← Home</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDropdown('home');
                    }}
                    className="pr-2 pl-1 py-1.5 border-l border-indigo-200/70 hover:text-indigo-950 cursor-pointer flex items-center"
                    title="Home & Workspace Quick Menu"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {openDropdown === 'home' && (
                  <div className="absolute left-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden p-1.5 text-xs space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Navigation &amp; Hub
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenDropdown(null);
                        onBackToHome();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-indigo-50 text-slate-800 font-bold flex items-center gap-2 cursor-pointer"
                    >
                      <Home className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Executive Home Dashboard</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenDropdown(null);
                        onSwitchCompany();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-2 cursor-pointer"
                    >
                      <Building2 className="w-3.5 h-3.5 text-teal-600" />
                      <span>Saved Client Companies ({companies.length})</span>
                    </button>
                    {onOpenBackupRestore && (
                      <button
                        type="button"
                        onClick={() => {
                          setOpenDropdown(null);
                          onOpenBackupRestore();
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-2 cursor-pointer"
                      >
                        <Database className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Backup &amp; Restore Hub</span>
                      </button>
                    )}
                    {onOpenSubscriptionModal && (
                      <button
                        type="button"
                        onClick={() => {
                          setOpenDropdown(null);
                          onOpenSubscriptionModal();
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-2 cursor-pointer"
                      >
                        <Coins className="w-3.5 h-3.5 text-amber-500" />
                        <span>Credits &amp; Top-Up</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {STEPS.map((s) => {
              const isCurrent = currentStep === s.step;
              const isCompleted = s.isCompleted && !isCurrent;
              const isOpen = openDropdown === s.dropdownId;

              return (
                <div key={s.step} className="relative">
                  <div
                    className={`inline-flex items-center rounded-xl border text-xs transition shrink-0 ${
                      isCurrent
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs font-extrabold'
                        : isCompleted
                        ? 'bg-emerald-50/80 hover:bg-emerald-100 text-emerald-950 border-emerald-200 font-bold'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80 font-semibold'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        handleStepChange(s.step);
                        toggleDropdown(s.dropdownId);
                      }}
                      className="pl-2.5 pr-1.5 py-1.5 flex items-center gap-1.5 cursor-pointer"
                    >
                      <span
                        className={`w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                          isCurrent
                            ? 'bg-emerald-400 text-slate-950'
                            : isCompleted
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white text-slate-600 border border-slate-300'
                        }`}
                      >
                        {isCompleted ? <CheckCircle2 className="w-3 h-3" /> : s.step}
                      </span>
                      <span className="whitespace-nowrap">{s.title}</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDropdown(s.dropdownId);
                      }}
                      className={`pr-2 pl-1 py-1.5 border-l cursor-pointer flex items-center ${
                        isCurrent
                          ? 'border-slate-700 text-slate-300 hover:text-white'
                          : isCompleted
                          ? 'border-emerald-200/80 text-emerald-700 hover:text-emerald-950'
                          : 'border-slate-200 text-slate-500 hover:text-slate-900'
                      }`}
                      title={`Open ${s.title} options`}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* STEP 1 DROPDOWN: CY Trial Balance */}
                  {isOpen && s.step === 1 && (
                    <div className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden p-1.5 text-xs space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-3 py-2 bg-slate-900 text-white rounded-xl mb-1 flex items-center justify-between">
                        <span className="font-bold">Step 1: CY Trial Balance</span>
                        <span className="text-[10px] text-emerald-400 font-mono">
                          {mappedLedgers.length} Ledgers
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          handleStepChange(1);
                          setOpenDropdown(null);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-800 font-bold flex items-center justify-between cursor-pointer"
                      >
                        <span>Open CY Trial Balance &amp; Mapping</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenDropdown(null);
                          onTriggerAIMap('CY');
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-indigo-50 text-indigo-700 font-bold flex items-center gap-2 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>AI Auto-Map CY Ledgers</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenDropdown(null);
                          onOpenYearEndAdjustments('CY');
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-amber-50 text-amber-900 font-semibold flex items-center gap-2 cursor-pointer"
                      >
                        <Package className="w-3.5 h-3.5 text-amber-600" />
                        <span>CY Closing Stock &amp; Adjustments</span>
                      </button>
                      <div className="border-t border-slate-100 my-1 pt-1">
                        <div className="px-3 py-1 text-[10px] font-bold uppercase text-slate-400">
                          Load Sample Trial Balance
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenDropdown(null);
                            onLoadSample('rrk_manufacturing');
                            handleStepChange(1);
                          }}
                          className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-emerald-50 text-emerald-800 font-semibold flex items-center gap-2 cursor-pointer"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Sample Partnership Firm (R R K &amp; Co)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenDropdown(null);
                            onLoadSample('durga_steel');
                            handleStepChange(1);
                          }}
                          className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-indigo-50 text-indigo-800 font-semibold flex items-center gap-2 cursor-pointer"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Sample Proprietorship (Durga Steel)</span>
                        </button>
                      </div>
                      {hasCYData && (
                        <div className="border-t border-slate-100 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setOpenDropdown(null);
                              onClearTB();
                            }}
                            className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-rose-50 text-rose-700 font-semibold flex items-center gap-2 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>Clear CY Trial Balance</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* STEP 2 DROPDOWN: PY Trial Balance */}
                  {isOpen && s.step === 2 && (
                    <div className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden p-1.5 text-xs space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-3 py-2 bg-slate-900 text-white rounded-xl mb-1 flex items-center justify-between">
                        <span className="font-bold">Step 2: PY Trial Balance</span>
                        <span className="text-[10px] text-emerald-400 font-mono">
                          {pyMappedLedgers.length} Ledgers
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          handleStepChange(2);
                          setOpenDropdown(null);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-800 font-bold flex items-center justify-between cursor-pointer"
                      >
                        <span>
                          Open PY Trial Balance (FY {config.previousFinancialYear || '2024-25'})
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenDropdown(null);
                          onTriggerAIMap('PY');
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-indigo-50 text-indigo-700 font-bold flex items-center gap-2 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>AI Auto-Map PY Ledgers</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenDropdown(null);
                          onOpenYearEndAdjustments('PY');
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-amber-50 text-amber-900 font-semibold flex items-center gap-2 cursor-pointer"
                      >
                        <Package className="w-3.5 h-3.5 text-amber-600" />
                        <span>PY Closing Stock &amp; Adjustments</span>
                      </button>
                      {hasPYData && (
                        <div className="border-t border-slate-100 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setOpenDropdown(null);
                              onClearPYTB();
                            }}
                            className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-rose-50 text-rose-700 font-semibold flex items-center gap-2 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>Clear PY Trial Balance</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* STEP 3 DROPDOWN: Comparative BS & P&L (Separate Options) */}
                  {isOpen && s.step === 3 && (
                    <div className="absolute left-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden p-1.5 text-xs space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-3 py-2 bg-slate-900 text-white rounded-xl mb-1 flex items-center justify-between">
                        <span className="font-bold">Step 3: Comparative Statements</span>
                        <span className="text-[10px] text-emerald-400">
                          {computedFinancials.balanceSheet.isBalanced ? '✓ BS Tallied' : 'Check Diff'}
                        </span>
                      </div>

                      {/* Option 1: Comparative Balance Sheet */}
                      <button
                        type="button"
                        onClick={() => {
                          setStep3StatementTab('balance_sheet');
                          handleStepChange(3);
                          setOpenDropdown(null);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl transition flex items-center justify-between cursor-pointer ${
                          currentStep === 3 && step3StatementTab === 'balance_sheet'
                            ? 'bg-indigo-50 text-indigo-950 font-extrabold'
                            : 'hover:bg-slate-100 text-slate-900 font-bold'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Comparative Balance Sheet</span>
                        </span>
                        <span className="font-mono text-[11px] text-slate-700 font-bold">
                          ₹{formatShortINR(computedFinancials.balanceSheet.totalAssets)}
                        </span>
                      </button>

                      {/* Option 2: Comparative Profit & Loss */}
                      <button
                        type="button"
                        onClick={() => {
                          setStep3StatementTab('profit_loss');
                          handleStepChange(3);
                          setOpenDropdown(null);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl transition flex items-center justify-between cursor-pointer ${
                          currentStep === 3 && step3StatementTab === 'profit_loss'
                            ? 'bg-indigo-50 text-indigo-950 font-extrabold'
                            : 'hover:bg-slate-100 text-slate-900 font-bold'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>Comparative Profit &amp; Loss</span>
                        </span>
                        <span className="font-mono text-[11px] text-indigo-700 font-bold">
                          PAT: ₹{formatShortINR(computedFinancials.profitAndLoss.profitAfterTax)}
                        </span>
                      </button>

                      {/* Option 3: Consolidated Notes Summary (1-25) */}
                      <button
                        type="button"
                        onClick={() => {
                          setStep3StatementTab('notes_summary');
                          handleStepChange(3);
                          setOpenDropdown(null);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl transition flex items-center justify-between cursor-pointer ${
                          currentStep === 3 && step3StatementTab === 'notes_summary'
                            ? 'bg-indigo-50 text-indigo-950 font-extrabold'
                            : 'hover:bg-slate-100 text-slate-800 font-semibold'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Consolidated Notes (1–25)</span>
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      </button>

                      {(config.numberOfBranches ?? 0) > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setStep3StatementTab('branch_consolidation');
                            handleStepChange(3);
                            setOpenDropdown(null);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl transition flex items-center justify-between cursor-pointer ${
                            currentStep === 3 && step3StatementTab === 'branch_consolidation'
                              ? 'bg-indigo-50 text-indigo-950 font-extrabold'
                              : 'hover:bg-slate-100 text-indigo-800 font-semibold'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>Branch-wise vs Consolidated (CY &amp; PY)</span>
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                            {config.numberOfBranches} Br
                          </span>
                        </button>
                      )}

                      <div className="border-t border-slate-100 my-1 pt-1">
                        <div className="px-3 py-1 text-[10px] font-bold uppercase text-slate-400">
                          Key Schedule Breakdowns
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSelectNote(3)}
                          className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center justify-between cursor-pointer"
                        >
                          <span>Note 3: Owners&apos; / Partners&apos; Capital</span>
                          <span className="font-mono text-[11px] text-slate-500">
                            ₹{formatShortINR(computedFinancials.balanceSheet.ownersCapital)}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectNote(11)}
                          className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center justify-between cursor-pointer"
                        >
                          <span>Note 11: Fixed Assets / PPE Schedule</span>
                          <span className="font-mono text-[11px] text-slate-500">
                            ₹{formatShortINR(computedFinancials.balanceSheet.propertyPlantEquipment)}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectNote(19)}
                          className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center justify-between cursor-pointer"
                        >
                          <span>Note 19: Revenue from Operations</span>
                          <span className="font-mono text-[11px] text-emerald-700">
                            ₹{formatShortINR(computedFinancials.profitAndLoss.revenueFromOperations)}
                          </span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setOpenDropdown(null);
                          onExportExcel();
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold flex items-center gap-2 cursor-pointer mt-1"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Export Statements to Excel (.xlsx)</span>
                      </button>
                    </div>
                  )}

                  {/* STEP 4 DROPDOWN: Notes 1–25 & Audit */}
                  {isOpen && s.step === 4 && (
                    <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-3.5 py-2.5 bg-slate-900 text-white flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Select ICAI Note (1 to 25) &amp; Audit</span>
                        </span>
                        <span className="text-[10px] text-amber-300 font-bold">
                          {allExceptions.length} Audit Flags
                        </span>
                      </div>

                      <div className="p-2 bg-slate-50 border-b border-slate-100">
                        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 focus-within:border-indigo-500">
                          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <input
                            type="text"
                            value={noteFilterQuery}
                            onChange={(e) => setNoteFilterQuery(e.target.value)}
                            placeholder="Filter Note 1 to 25 by number or title..."
                            className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 p-1">
                        {filteredNotesList.map((n) => {
                          const sched = computedFinancials.noteSchedules?.[n.noteNumber];
                          const amt = sched?.totalAmount ?? 0;
                          const isSelectedNote =
                            currentStep === 4 && selectedNoteNumber === n.noteNumber;
                          return (
                            <button
                              key={n.noteNumber}
                              type="button"
                              onClick={() => handleSelectNote(n.noteNumber)}
                              className={`w-full text-left px-3 py-2 rounded-xl transition flex items-center justify-between gap-2 cursor-pointer ${
                                isSelectedNote
                                  ? 'bg-indigo-50 text-indigo-950 font-extrabold'
                                  : 'hover:bg-slate-50 text-slate-800'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="font-bold truncate">
                                  Note {n.noteNumber}: {n.name}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {n.statement === 'Policy'
                                    ? 'Accounting Policy'
                                    : n.statement === 'BalanceSheet'
                                    ? 'Balance Sheet Schedule'
                                    : 'Profit & Loss Schedule'}
                                </div>
                              </div>
                              {n.noteNumber >= 3 && (
                                <span className="font-mono font-bold text-[11px] text-slate-700 shrink-0">
                                  ₹{formatShortINR(amt)}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* STEP 5 DROPDOWN: Export & Reports */}
                  {isOpen && s.step === 5 && (
                    <div className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden p-1.5 text-xs space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-3 py-2 bg-slate-900 text-white rounded-xl mb-1 flex items-center justify-between">
                        <span className="font-bold">Step 5: Export &amp; Reports</span>
                        <span className="text-[10px] text-emerald-400">ICAI Formats</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          handleStepChange(5);
                          setOpenDropdown(null);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-800 font-bold flex items-center justify-between cursor-pointer"
                      >
                        <span>Open Export &amp; Reports Center</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenDropdown(null);
                          onExportExcel();
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-emerald-50 text-emerald-800 font-bold flex items-center gap-2 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Download Statutory Excel (.xlsx)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenDropdown(null);
                          window.print();
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-2 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Print / Save as PDF</span>
                      </button>
                      {onExportSingleCompanyBackup && (
                        <button
                          type="button"
                          onClick={() => {
                            setOpenDropdown(null);
                            onExportSingleCompanyBackup();
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-2 cursor-pointer"
                        >
                          <Database className="w-3.5 h-3.5 text-teal-600" />
                          <span className="truncate">
                            Single File Backup ({config.entityName})
                          </span>
                        </button>
                      )}
                      {onExportTotalLocalBackup && (
                        <button
                          type="button"
                          onClick={() => {
                            setOpenDropdown(null);
                            onExportTotalLocalBackup();
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-2 cursor-pointer"
                        >
                          <Database className="w-3.5 h-3.5 text-amber-600" />
                          <span>Total Backup (All {companies.length} Companies)</span>
                        </button>
                      )}
                      {onOpenBackupRestore && (
                        <button
                          type="button"
                          onClick={() => {
                            setOpenDropdown(null);
                            onOpenBackupRestore();
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-2 cursor-pointer"
                        >
                          <Layers className="w-3.5 h-3.5 text-slate-500" />
                          <span>Open Backup &amp; Restore Hub</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right: Utility Action Fields with Dropdowns */}
          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
            {/* 1. Closing Stock & Adj. Dropdown */}
            <div className="relative">
              <div className="inline-flex items-center rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/90 text-xs font-bold transition whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => toggleDropdown('stock')}
                  className="px-2.5 py-1.5 flex items-center gap-1 cursor-pointer"
                  title="Closing Stock Valuation & Year-End Adjustments Dropdown"
                >
                  <span>Closing Stock &amp; Adj.</span>
                  <ChevronDown className="w-3.5 h-3.5 text-amber-700" />
                </button>
              </div>

              {openDropdown === 'stock' && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden p-1.5 text-xs space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 bg-amber-950 text-white rounded-xl mb-1 flex items-center justify-between">
                    <span className="font-bold">Closing Stock &amp; Adjustments</span>
                    <span className="text-[10px] text-amber-300">Note 15 &amp; 21</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenDropdown(null);
                      onOpenYearEndAdjustments('CY');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-amber-50 text-slate-800 font-bold flex items-center justify-between cursor-pointer"
                  >
                    <span>Current Year (CY) Stock &amp; Adj.</span>
                    <span className="font-mono text-[11px] text-amber-800">
                      ₹{formatShortINR(computedFinancials.balanceSheet.inventories)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenDropdown(null);
                      onOpenYearEndAdjustments('PY');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-amber-50 text-slate-700 font-semibold flex items-center justify-between cursor-pointer"
                  >
                    <span>Previous Year (PY) Stock &amp; Adj.</span>
                    <span className="font-mono text-[11px] text-slate-500">
                      ₹{formatShortINR(computedFinancials.balanceSheet.previousYear?.inventories)}
                    </span>
                  </button>
                  <div className="border-t border-slate-100 my-1 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSelectNote(15)}
                      className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center justify-between cursor-pointer"
                    >
                      <span>View Note 15: Inventories Schedule</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectNote(21)}
                      className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center justify-between cursor-pointer"
                    >
                      <span>View Note 21: COGS &amp; Stock Change</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectNote(24)}
                      className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center justify-between cursor-pointer"
                    >
                      <span>View Note 24: Depreciation Expense</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Creditors MSME Data Dropdown */}
            <div className="relative">
              <div className="inline-flex items-center rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/90 text-xs font-bold transition whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => toggleDropdown('msme')}
                  className="px-2.5 py-1.5 flex items-center gap-1 cursor-pointer"
                  title="Creditors MSME & Trade Payables Aging Dropdown"
                >
                  <Sliders className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Creditors MSME Data</span>
                  <ChevronDown className="w-3.5 h-3.5 text-emerald-700" />
                </button>
              </div>

              {openDropdown === 'msme' && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden p-1.5 text-xs space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 bg-emerald-950 text-white rounded-xl mb-1 flex items-center justify-between">
                    <span className="font-bold">Creditors &amp; MSME Disclosures</span>
                    <span className="text-[10px] text-emerald-300">Note 9</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenDropdown(null);
                      handleOpenTradePayables();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-emerald-50 text-emerald-950 font-bold flex items-center justify-between cursor-pointer"
                  >
                    <span>Edit MSME &amp; Aging Table (Note 9)</span>
                    <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectNote(9)}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center justify-between cursor-pointer"
                  >
                    <span>Open Note 9: Trade Payables Schedule</span>
                    <span className="font-mono text-[11px] text-slate-600">
                      ₹{formatShortINR(computedFinancials.balanceSheet.tradePayables)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectNote(16)}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center justify-between cursor-pointer"
                  >
                    <span>Open Note 16: Trade Receivables</span>
                    <span className="font-mono text-[11px] text-slate-600">
                      ₹{formatShortINR(computedFinancials.balanceSheet.tradeReceivables)}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* 3. Switch Entity Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown('entity')}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
                title="Switch Client Entity or Manage Companies"
              >
                <Building2 className="w-3.5 h-3.5 text-slate-600" />
                <span>Switch Entity</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {openDropdown === 'entity' && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3.5 py-2.5 bg-slate-900 text-white flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Switch Active Entity</span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {companies.length} {companies.length === 1 ? 'Company' : 'Companies'}
                    </span>
                  </div>

                  <div className="p-2 bg-slate-50 border-b border-slate-100">
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 focus-within:border-indigo-500">
                      <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        value={entityFilterQuery}
                        onChange={(e) => setEntityFilterQuery(e.target.value)}
                        placeholder="Search company by name, PAN, GSTIN..."
                        className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                    {filteredEntities.length === 0 ? (
                      <div className="p-4 text-center text-slate-400">
                        No company matches &ldquo;{entityFilterQuery}&rdquo;
                      </div>
                    ) : (
                      filteredEntities.map((comp) => {
                        const isSelected =
                          comp.id === activeCompanyId ||
                          (!activeCompanyId && comp.config.entityName === config.entityName);
                        return (
                          <button
                            key={comp.id}
                            type="button"
                            onClick={() => {
                              setOpenDropdown(null);
                              setEntityFilterQuery('');
                              if (onSelectCompany) {
                                onSelectCompany(comp.id);
                              } else {
                                onSwitchCompany();
                              }
                            }}
                            className={`w-full text-left px-3.5 py-2.5 transition flex items-center justify-between gap-2 cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50/80 text-indigo-950 font-bold'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="font-bold truncate">{comp.config.entityName}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                                {comp.config.entityType} • FY {comp.config.financialYear} •{' '}
                                {comp.mappedLedgers?.length || 0} ledgers
                              </div>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div className="p-2 bg-slate-50 border-t border-slate-200 space-y-1">
                    {onOpenAddCompany && (
                      <button
                        type="button"
                        onClick={() => {
                          setOpenDropdown(null);
                          onOpenAddCompany();
                        }}
                        className="w-full text-left px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold flex items-center gap-2 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Add New Company / Entity</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setOpenDropdown(null);
                        onSwitchCompany();
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-200/70 text-slate-700 font-semibold flex items-center gap-2 cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5 text-slate-500" />
                      <span>Open Full Company Manager</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 3b. Audit Dossier Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown('dossier')}
                className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Audit Dossier: Cover Page, Appointment Letter & Management Representation Letter"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-700" />
                <span className="hidden md:inline">Audit Dossier</span>
                <ChevronDown className="w-3 h-3 text-indigo-600" />
              </button>

              {openDropdown === 'dossier' && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden p-1.5 text-xs space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Statutory Engagement Papers
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenDropdown(null);
                      handleOpenAuditDossier('cover_page');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-800 font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5 text-emerald-600" />
                    <div>
                      <div>1. Audit Report Cover Page</div>
                      <div className="text-[10px] font-normal text-slate-500">Statutory title dossier &amp; index</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenDropdown(null);
                      handleOpenAuditDossier('appointment');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-800 font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    <div>
                      <div>2. Audit Appointment &amp; Acceptance</div>
                      <div className="text-[10px] font-normal text-slate-500">ICAI SA 210 terms, resolution &amp; fees</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenDropdown(null);
                      handleOpenAuditDossier('mrl');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-800 font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    <div>
                      <div>3. Management Representation (MRL)</div>
                      <div className="text-[10px] font-normal text-slate-500">ICAI SA 580 written representations</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* 4. Settings / Config Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown('settings')}
                className="px-2 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition flex items-center gap-1 cursor-pointer"
                title="Entity Config, Financial Year & Auditor Settings Dropdown"
              >
                <Settings className="w-3.5 h-3.5" />
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </button>

              {openDropdown === 'settings' && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden p-1.5 text-xs space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Entity &amp; Audit Settings
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenDropdown(null);
                      onOpenConfig();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-800 font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Edit Entity &amp; Auditor Config</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenDropdown(null);
                      if (onOpenYearModal) {
                        onOpenYearModal();
                      } else {
                        onOpenConfig();
                      }
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    <span>Change Financial Year (FY {config.financialYear})</span>
                  </button>
                  {onOpenBackupRestore && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenDropdown(null);
                        onOpenBackupRestore();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-2 cursor-pointer"
                    >
                      <Database className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Backup &amp; Restore Hub</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DEDICATED STEP WINDOW                                                  */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <Step1CurrentYear
          config={config}
          mappedLedgers={mappedLedgers}
          totalDebit={totalDebit}
          totalCredit={totalCredit}
          isTallyBalanced={isTallyBalanced}
          tallyDifference={tallyDifference}
          tbFileName={tbFileName}
          onUploadTB={onUploadTB}
          onClearTB={onClearTB}
          onLoadSample={onLoadSample}
          onUpdateLedgerNote={onUpdateLedgerNote}
          onUpdateLedgerDetails={onUpdateLedgerDetails}
          onAddLedger={onAddLedger}
          onDeleteLedger={onDeleteLedger}
          onTriggerAIMap={onTriggerAIMap}
          isAIMapping={isAIMapping}
          onOpenYearEndAdjustments={onOpenYearEndAdjustments}
          computedFinancials={computedFinancials}
          onProceedToStep2={() => handleStepChange(2)}
          onSelectNote={handleSelectNote}
          onOpenTradePayables={handleOpenTradePayables}
          onUpdateConfig={onUpdateConfig}
          onUploadBranchTB={onUploadBranchTB}
          onBulkUploadBranchTBs={onBulkUploadBranchTBs}
          onClearBranchTB={onClearBranchTB}
          onLoadSampleBranches={onLoadSampleBranches}
          onUpdateBranchClosingStock={onUpdateBranchClosingStock}
        />
      )}

      {currentStep === 2 && (
        <Step2PreviousYear
          config={config}
          pyMappedLedgers={pyMappedLedgers}
          pyTotalDebit={pyTotalDebit}
          pyTotalCredit={pyTotalCredit}
          isPYTallyBalanced={isPYTallyBalanced}
          pyTallyDifference={pyTallyDifference}
          pyFileName={pyFileName}
          onUploadPYTB={onUploadPYTB}
          onClearPYTB={onClearPYTB}
          onUpdatePyLedgerNote={onUpdatePyLedgerNote}
          onUpdateLedgerDetails={onUpdateLedgerDetails}
          onAddLedger={onAddLedger}
          onDeleteLedger={onDeleteLedger}
          onTriggerAIMap={onTriggerAIMap}
          isAIMapping={isAIMapping}
          onOpenYearEndAdjustments={onOpenYearEndAdjustments}
          pyComputedFinancials={pyComputedFinancials}
          onBackToStep1={() => handleStepChange(1)}
          onProceedToStep3={() => handleStepChange(3)}
          onSelectNote={handleSelectNote}
          onUpdateConfig={onUpdateConfig}
          onUploadBranchTB={onUploadBranchTB}
          onBulkUploadBranchTBs={onBulkUploadBranchTBs}
          onClearBranchTB={onClearBranchTB}
          onLoadSampleBranches={onLoadSampleBranches}
          onUpdateBranchClosingStock={onUpdateBranchClosingStock}
        />
      )}

      {currentStep === 3 && (
        <Step3ComparativeStatements
          config={config}
          computedFinancials={computedFinancials}
          onBackToStep2={() => handleStepChange(2)}
          onProceedToStep4={() => handleStepChange(4)}
          onSelectNote={handleSelectNote}
          onOpenTradePayables={handleOpenTradePayables}
          activeStatementTab={step3StatementTab}
          onChangeStatementTab={setStep3StatementTab}
        />
      )}

      {currentStep === 4 && (
        <Step4NotesAndAudit
          config={config}
          noteSchedules={computedFinancials.noteSchedules}
          exceptions={allExceptions}
          balanceSheet={computedFinancials.balanceSheet}
          profitAndLoss={computedFinancials.profitAndLoss}
          onUpdateConfig={onUpdateConfig}
          onSelectNote={setSelectedNoteNumber}
          selectedNoteNumber={selectedNoteNumber}
          onOpenYearEndAdjustments={onOpenYearEndAdjustments}
          onOpenTradePayables={handleOpenTradePayables}
          onBackToStep3={() => handleStepChange(3)}
          onProceedToStep5={() => handleStepChange(5)}
          onUpdateLedgerDetails={onUpdateLedgerDetails}
          onUpdateLedgerNote={onUpdateLedgerNote}
          onUpdatePyLedgerNote={onUpdatePyLedgerNote}
          mappedLedgers={mappedLedgers}
          pyMappedLedgers={pyMappedLedgers}
        />
      )}

      {currentStep === 5 && (
        <Step5ReportGeneration
          config={config}
          computedFinancials={computedFinancials}
          exceptions={allExceptions}
          onExportExcel={onExportExcel}
          onOpenBackupRestore={onOpenBackupRestore}
          onRestoreBackup={onRestoreBackup}
          currentUser={currentUser}
          onOpenSubscriptionModal={onOpenSubscriptionModal}
          user={user}
          accessToken={accessToken}
          onAuthSuccess={onAuthSuccess}
          onSignOut={onSignOut}
          onBackToStep4={() => handleStepChange(4)}
          onSwitchCompany={onSwitchCompany}
        />
      )}

      {/* Global Trade Payables (Note 9) MSME & Aging Disclosures Modal */}
      <TradePayablesMsmeModal
        isOpen={isTradePayablesModalOpen}
        onClose={() => setIsTradePayablesModalOpen(false)}
        config={config}
        onUpdateConfig={onUpdateConfig}
        noteSchedule={computedFinancials.noteSchedules[9]}
      />

      {/* Global Audit Working Paper Dossier Modal (Cover Page, Appointment SA 210, MRL SA 580) */}
      <AuditDossierModal
        isOpen={isAuditDossierModalOpen}
        onClose={() => setIsAuditDossierModalOpen(false)}
        config={config}
        onUpdateConfig={onUpdateConfig}
        initialTab={auditDossierTab}
      />
    </div>
  );
};
