import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Settings,
  Info,
  Trash2,
  Calendar,
  Building2,
  FileText,
  Eye,
  Plus,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Check,
  Edit3,
  Box,
  Layers,
  ChevronRight,
  Download,
  BookOpen,
  HelpCircle,
  Copy,
  ChevronDown,
  X,
  HardDrive,
  Database,
} from 'lucide-react';
import {
  EntityConfig,
  Company,
  UploadedStatementDoc,
  BalanceSheetData,
  ProfitAndLossData,
  NoteScheduleData,
  AuditException,
} from '../types';
import { SAMPLE_DATASETS } from '../data/sampleTrialBalances';
import { POPULAR_INDIAN_FY_PRESETS } from '../utils/financialYearUtils';
import { FinancialYearChangeModal } from './FinancialYearChangeModal';
import { CompaniesWindow } from './CompaniesWindow';
import { BranchTrialBalanceManager } from './BranchTrialBalanceManager';

interface IngestionPanelProps {
  config: EntityConfig;
  onUploadTB: (file: File) => void;
  onClearTB?: () => void;
  onUploadPYTB: (file: File) => void;
  onClearPYTB?: () => void;
  onUploadNCE: (file: File) => void;
  onLoadSample: (datasetId: string) => void;
  onOpenConfig: () => void;
  onNavigateToMapping: () => void;
  tbFileName?: string;
  tbRowCount?: number;
  tbDebitTotal?: number;
  tbCreditTotal?: number;
  isTallyBalanced?: boolean;
  pyFileName?: string;
  pyRowCount?: number;
  pyDebitTotal?: number;
  pyCreditTotal?: number;
  isPYTallyBalanced?: boolean;
  nceStatus?: {
    uploaded: boolean;
    fileName?: string;
    sheetCount?: number;
    details?: string;
  };
  isLoading?: boolean;

  // Company management props
  companies?: Company[];
  activeCompanyId?: string;
  onSelectCompany?: (companyId: string) => void;
  onCreateCompany?: (
    config: EntityConfig,
    starterType: 'blank' | 'sample_partnership' | 'sample_proprietorship' | 'clone',
    cloneSourceId?: string
  ) => void;
  onDeleteCompany?: (companyId: string) => void;
  onDuplicateCompany?: (companyId: string) => void;
  onOpenCompanyManager?: (tab?: 'list' | 'add' | 'edit') => void;
  dashboardView?: 'companies' | 'workspace';
  onDashboardViewChange?: (view: 'companies' | 'workspace') => void;
  onUpdateCompanyConfig?: (companyId: string, updatedConfig: EntityConfig) => void;

  onOpenYearModal?: () => void;
  onUpdateConfig?: (updatedConfig: EntityConfig) => void;
  onOpenYearEndAdjustments?: () => void;

  // Uploaded Statement documents
  uploadedBalanceSheet?: UploadedStatementDoc;
  uploadedProfitAndLoss?: UploadedStatementDoc;
  onUploadBalanceSheet: (file: File) => void;
  onUploadProfitAndLoss: (file: File) => void;
  onUploadCombinedStatements: (file: File) => void;
  onClearBalanceSheet: () => void;
  onClearProfitAndLoss: () => void;
  onLoadSampleStatements: () => void;

  uploadedPYBalanceSheet?: UploadedStatementDoc;
  uploadedPYProfitAndLoss?: UploadedStatementDoc;
  onUploadPYBalanceSheet: (file: File) => void;
  onUploadPYProfitAndLoss: (file: File) => void;
  onUploadCombinedPYStatements: (file: File) => void;
  onClearPYBalanceSheet: () => void;
  onClearPYProfitAndLoss: () => void;
  onLoadSamplePYStatements?: () => void;

  onViewStatement: (doc: UploadedStatementDoc) => void;

  // AI mapping trigger
  onTriggerAIMapping?: () => void;
  isAIMapping?: boolean;

  // Executive Dashboard enrichments
  computedFinancials?: {
    balanceSheet: BalanceSheetData;
    profitAndLoss: ProfitAndLossData;
    noteSchedules: Record<number, NoteScheduleData>;
    computationExceptions: AuditException[];
  } | null;
  onNavigateToTab?: (tab: string) => void;
  onExportExcel?: () => void;
  exceptionCount?: number;
  onOpenBackupRestore?: () => void;
  onUploadBranchTB?: (branchId: string, file: File, period: 'CY' | 'PY') => void;
  onBulkUploadBranchTBs?: (files: File[], period: 'CY' | 'PY') => void;
  onClearBranchTB?: (branchId: string, period: 'CY' | 'PY') => void;
  onLoadSampleBranches?: (period: 'CY' | 'PY') => void;
  onUpdateBranchClosingStock?: (branchId: string, stockAmount: number | undefined, period: 'CY' | 'PY') => void;
}

export const IngestionPanel: React.FC<IngestionPanelProps> = ({
  config,
  onUploadTB,
  onClearTB,
  onUploadPYTB,
  onClearPYTB,
  onUploadNCE,
  onLoadSample,
  onOpenConfig,
  onNavigateToMapping,
  onOpenBackupRestore,
  tbFileName,
  tbRowCount = 0,
  tbDebitTotal = 0,
  tbCreditTotal = 0,
  isTallyBalanced = true,
  pyFileName,
  pyRowCount = 0,
  pyDebitTotal = 0,
  pyCreditTotal = 0,
  isPYTallyBalanced = true,
  nceStatus,
  isLoading,

  companies = [],
  activeCompanyId = '',
  onSelectCompany,
  onCreateCompany,
  onDeleteCompany,
  onDuplicateCompany,
  onOpenCompanyManager,
  dashboardView,
  onDashboardViewChange,
  onUpdateCompanyConfig,

  onOpenYearModal,
  onUpdateConfig,
  onOpenYearEndAdjustments,

  uploadedBalanceSheet,
  uploadedProfitAndLoss,
  onUploadBalanceSheet,
  onUploadProfitAndLoss,
  onUploadCombinedStatements,
  onClearBalanceSheet,
  onClearProfitAndLoss,
  onLoadSampleStatements,

  uploadedPYBalanceSheet,
  uploadedPYProfitAndLoss,
  onUploadPYBalanceSheet,
  onUploadPYProfitAndLoss,
  onUploadCombinedPYStatements,
  onClearPYBalanceSheet,
  onClearPYProfitAndLoss,
  onLoadSamplePYStatements,

  onViewStatement,
  onTriggerAIMapping,
  isAIMapping = false,

  computedFinancials,
  onNavigateToTab,
  onExportExcel,
  exceptionCount = 0,
  onUploadBranchTB,
  onBulkUploadBranchTBs,
  onClearBranchTB,
  onLoadSampleBranches,
  onUpdateBranchClosingStock,
}) => {
  const [branchPeriodTab, setBranchPeriodTab] = useState<'CY' | 'PY'>('CY');
  // Input refs for manual file picking
  const cyInputRef = useRef<HTMLInputElement>(null);
  const pyInputRef = useRef<HTMLInputElement>(null);
  const bsInputRef = useRef<HTMLInputElement>(null);
  const plInputRef = useRef<HTMLInputElement>(null);

  // Drag states
  const [dragOverCY, setDragOverCY] = useState(false);
  const [dragOverPY, setDragOverPY] = useState(false);
  const [dragOverBS, setDragOverBS] = useState(false);
  const [dragOverPL, setDragOverPL] = useState(false);

  // Dashboard view toggle between 'companies' (one window only) and 'workspace' (working windows)
  const [localDashboardView, setLocalDashboardView] = useState<'companies' | 'workspace'>(() => {
    if (dashboardView) return dashboardView;
    if (!companies || companies.length === 0 || !activeCompanyId) return 'companies';
    return 'workspace';
  });

  const currentView = dashboardView ?? localDashboardView;
  const setEffectiveView = (view: 'companies' | 'workspace') => {
    setLocalDashboardView(view);
    if (onDashboardViewChange) {
      onDashboardViewChange(view);
    }
  };

  // Company creation panel state (defaults to open if no companies exist)
  const [isCreatingCompany, setIsCreatingCompany] = useState<boolean>(companies.length === 0);
  const [newCompanyName, setNewCompanyName] = useState<string>('');
  const [newEntityType, setNewEntityType] = useState<
    'Partnership Firm' | 'Sole Proprietorship' | 'LLP' | 'AOP/BOI'
  >('Partnership Firm');
  const [newFY, setNewFY] = useState<string>('2025-26');
  const [newStarterType, setNewStarterType] = useState<
    'blank' | 'sample_partnership' | 'sample_proprietorship' | 'clone'
  >('blank');
  const [newCloneSourceId, setNewCloneSourceId] = useState<string>(
    activeCompanyId || (companies[0]?.id ?? '')
  );

  // Segmented Ingestion Mode
  const [ingestionTab, setIngestionTab] = useState<'trial_balance' | 'statements' | 'samples'>('trial_balance');
  const [isLocalYearModalOpen, setIsLocalYearModalOpen] = useState(false);

  // In-App Confirmation Modal States (Bypasses iframe window.confirm blockage)
  const [deletingCompany, setDeletingCompany] = useState<{ id: string; name: string } | null>(null);
  const [confirmClearCY, setConfirmClearCY] = useState<boolean>(false);
  const [confirmClearPY, setConfirmClearPY] = useState<boolean>(false);

  // Currency formatters
  const formatINR = (val?: number) => {
    if (val === undefined || isNaN(val)) return '₹ 0.00';
    return '₹ ' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatCompactINR = (val?: number) => {
    if (val === undefined || isNaN(val)) return '₹ 0.00';
    const abs = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    if (abs >= 10000000) {
      return `${sign}₹ ${(abs / 10000000).toFixed(2)} Cr`;
    }
    if (abs >= 100000) {
      return `${sign}₹ ${(abs / 100000).toFixed(2)} L`;
    }
    return `${sign}₹ ${abs.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  // Drag and Drop handlers
  const handleCYDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverCY(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUploadTB(e.dataTransfer.files[0]);
    }
  };

  const handlePYDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverPY(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUploadPYTB(e.dataTransfer.files[0]);
    }
  };

  const handleBSDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverBS(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUploadBalanceSheet(e.dataTransfer.files[0]);
    }
  };

  const handlePLDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverPL(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUploadProfitAndLoss(e.dataTransfer.files[0]);
    }
  };

  const handleOpenYearChanger = () => {
    if (onOpenYearModal) {
      onOpenYearModal();
    } else {
      setIsLocalYearModalOpen(true);
    }
  };

  // Submit handler for creating a new company directly on the dashboard
  const handleCreateCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = newCompanyName.trim();
    if (!finalName) return;

    const preset = POPULAR_INDIAN_FY_PRESETS.find((p) => p.cyYear === newFY);
    const createdConfig: EntityConfig = {
      entityName: finalName,
      entityType: newEntityType,
      financialYear: newFY,
      reportingPeriod: preset?.cyPeriod || 'March 31, 2026',
      previousFinancialYear: preset?.pyYear || '2024-25',
      previousReportingPeriod: preset?.pyPeriod || 'March 31, 2025',
      currencyUnit: 'INR',
      taxRatePercent: 30,
      transferProfitTo: newEntityType === 'Partnership Firm' ? 'partners_capital' : 'proprietor_capital',
    };

    if (onCreateCompany) {
      onCreateCompany(createdConfig, newStarterType, newCloneSourceId);
      setNewCompanyName('');
      setIsCreatingCompany(false);
    } else if (onOpenCompanyManager) {
      onOpenCompanyManager('add');
    }
  };

  // Quick 1-click sample loaders as companies
  const handleCreateQuickSample = (type: 'sample_partnership' | 'sample_proprietorship') => {
    if (onCreateCompany) {
      if (type === 'sample_partnership') {
        const sample = SAMPLE_DATASETS[0];
        onCreateCompany(
          {
            entityName: sample.name,
            entityType: sample.entityType,
            financialYear: sample.financialYear,
            reportingPeriod: sample.reportingPeriod || 'March 31, 2026',
            previousFinancialYear: sample.previousFinancialYear || '2024-25',
            previousReportingPeriod: sample.previousReportingPeriod || 'March 31, 2025',
            taxRatePercent: 30,
            transferProfitTo: 'partners_capital',
          },
          'sample_partnership'
        );
      } else {
        const sample = SAMPLE_DATASETS[1];
        onCreateCompany(
          {
            entityName: sample.name,
            entityType: sample.entityType,
            financialYear: sample.financialYear,
            reportingPeriod: sample.reportingPeriod || 'March 31, 2026',
            previousFinancialYear: sample.previousFinancialYear || '2024-25',
            previousReportingPeriod: sample.previousReportingPeriod || 'March 31, 2025',
            taxRatePercent: 30,
            transferProfitTo: 'proprietor_capital',
          },
          'sample_proprietorship'
        );
      }
      setIsCreatingCompany(false);
    }
  };

  // Financial Calculations for Pulse KPIs
  const revenue = computedFinancials?.profitAndLoss.revenueFromOperations ?? 0;
  const pyRevenue = computedFinancials?.profitAndLoss.previousYear?.revenueFromOperations;
  const pat = computedFinancials?.profitAndLoss.profitAfterTax ?? 0;
  const pyPat = computedFinancials?.profitAndLoss.previousYear?.profitAfterTax;
  const patMargin = revenue > 0 ? ((pat / revenue) * 100).toFixed(1) : '0.0';
  const totalAssets = computedFinancials?.balanceSheet.totalAssets ?? 0;
  const currentAssets = computedFinancials?.balanceSheet.totalCurrentAssets ?? 0;
  const currentLiabilities = computedFinancials?.balanceSheet.totalCurrentLiabilities ?? 0;
  const netWorkingCapital = currentAssets - currentLiabilities;

  const revGrowth = pyRevenue && pyRevenue > 0 ? (((revenue - pyRevenue) / pyRevenue) * 100).toFixed(1) : null;
  const isDataAvailable = tbRowCount > 0;
  const bsDifference = computedFinancials?.balanceSheet.difference ?? 0;
  const isBSBalanced = computedFinancials?.balanceSheet.isBalanced ?? true;

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. TOP DASHBOARD NAVIGATION: UNIFIED COMPANIES WINDOW & WORKING WINDOWS   */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            id="tab-companies-window"
            onClick={() => setEffectiveView("companies")}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
              currentView === "companies"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span>Saved Client Companies ({companies.length})</span>
          </button>

          {config.entityName && (
            <button
              type="button"
              id="tab-working-windows"
              onClick={() => setEffectiveView("workspace")}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                currentView === "workspace"
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Workspace: {config.entityName}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {config.entityName && currentView === "companies" ? (
            <button
              type="button"
              onClick={() => setEffectiveView("workspace")}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition"
            >
              <span>Open {config.entityName} →</span>
            </button>
          ) : currentView === "workspace" ? (
            <button
              type="button"
              onClick={() => setEffectiveView("companies")}
              className="text-xs text-slate-700 hover:text-slate-900 font-semibold flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 transition"
            >
              <span>← Switch / Add Company</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* VIEW 1: ONE WINDOW ONLY OF SAVED COMPANIES DISPLAY, SELECTION AND CREATION */}
      {currentView === "companies" ? (
        <CompaniesWindow
          companies={companies}
          activeCompanyId={activeCompanyId}
          onSelectCompany={(id) => {
            if (onSelectCompany) onSelectCompany(id);
            setEffectiveView("workspace");
          }}
          onCreateCompany={(cfg, starter, cloneId) => {
            if (onCreateCompany) onCreateCompany(cfg, starter, cloneId);
            setEffectiveView("workspace");
          }}
          onUpdateCompanyConfig={(id, updatedCfg) => {
            if (onUpdateCompanyConfig) onUpdateCompanyConfig(id, updatedCfg);
            else if (onUpdateConfig && id === activeCompanyId) onUpdateConfig(updatedCfg);
          }}
          onDeleteCompany={(id) => {
            if (onDeleteCompany) onDeleteCompany(id);
          }}
          onDuplicateCompany={(id) => {
            if (onDuplicateCompany) onDuplicateCompany(id);
          }}
          onOpenWorkingWindows={() => setEffectiveView("workspace")}
          onOpenBackupRestore={onOpenBackupRestore}
        />
      ) : (
        /* VIEW 2: WORKING WINDOWS AFTER SELECTION */
        <div className="space-y-6">

      {/* ========================================================================= */}
      {/* 2. ACTIVE ENTITY OPERATIONAL HEADER & RECONCILIATION STRIP               */}
      {/* ========================================================================= */}
      {config.entityName && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm text-white space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="px-2.5 py-0.5 font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Active Audit Workspace
                </span>
                <span className="text-slate-400">• ICAI Non-Corporate Entity Taxonomy (Notes 1–25)</span>
              </div>

              <div className="flex items-center gap-3 pt-1 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  <span>{config.entityName}</span>
                </h1>
                <span className="text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                  {config.entityType}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-300 pt-0.5 flex-wrap">
                <span>
                  Reporting Period: <strong className="text-emerald-300">FY {config.financialYear}</strong> ({config.reportingPeriod})
                </span>
                <span className="text-slate-500">vs</span>
                <span>
                  Comparative: <strong className="text-indigo-300">FY {config.previousFinancialYear || '2024-25'}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleOpenYearChanger}
                  className="text-emerald-400 hover:text-emerald-300 font-medium hover:underline inline-flex items-center gap-1 ml-1"
                  title="Change reporting financial year and comparative period"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Change FY</span>
                </button>
              </div>
            </div>

            {/* Quick Action Ribbon */}
            <div className="flex flex-wrap items-center gap-2">
              {onTriggerAIMapping && (
                <button
                  onClick={onTriggerAIMapping}
                  disabled={isAIMapping || tbRowCount === 0}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  title="Open AI Schedule Mapping Agent to review or auto-classify Trial Balance ledgers"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isAIMapping ? 'animate-spin' : ''}`} />
                  <span>{isAIMapping ? 'AI Mapping...' : 'AI Mapping Agent'}</span>
                </button>
              )}

              {onOpenYearEndAdjustments && (
                <button
                  onClick={onOpenYearEndAdjustments}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 text-xs font-semibold transition flex items-center gap-1.5"
                  title="Closing Stock, Tax Provision, Depreciation"
                >
                  <Box className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Adjustments</span>
                </button>
              )}

              {onExportExcel && (
                <button
                  onClick={onExportExcel}
                  disabled={!isDataAvailable}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm transition flex items-center gap-1.5 disabled:opacity-40"
                  title="Export complete 25-note statutory schedules and Balance Sheet to Excel"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Excel</span>
                </button>
              )}

              <button
                onClick={onOpenConfig}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition"
                title="Entity Parameters & Auditor Credentials"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Audit & Reconciliation Health Indicators */}
          <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            {/* 1. TB Status */}
            <div
              className={`px-3 py-2 rounded-xl border flex items-center justify-between ${
                isTallyBalanced
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-800 text-rose-300 animate-pulse'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                {isTallyBalanced ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />}
                <span className="truncate">Trial Balance</span>
              </div>
              <span className="font-bold shrink-0">{isTallyBalanced ? 'Tallied' : 'Imbalanced'}</span>
            </div>

            {/* 2. BS Balance */}
            <div
              className={`px-3 py-2 rounded-xl border flex items-center justify-between ${
                isBSBalanced
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : 'bg-amber-950/60 border-amber-800 text-amber-300'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                {isBSBalanced ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />}
                <span className="truncate">Balance Sheet</span>
              </div>
              <span className="font-bold shrink-0">{isBSBalanced ? 'Balanced' : `Diff ${formatCompactINR(bsDifference)}`}</span>
            </div>

            {/* 3. Schedules */}
            <div className="px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-300 flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <FileSpreadsheet className="w-4 h-4 shrink-0 text-indigo-400" />
                <span className="truncate">Statutory Notes</span>
              </div>
              <span className="font-bold shrink-0">Notes 1–25</span>
            </div>

            {/* 4. Audit Exceptions */}
            <button
              onClick={() => onNavigateToTab && onNavigateToTab('audit_report')}
              className={`px-3 py-2 rounded-xl border flex items-center justify-between transition text-left ${
                exceptionCount > 0
                  ? 'bg-amber-950/40 border-amber-800/80 text-amber-200 hover:bg-amber-900/50'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-700/60'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <AlertCircle className={`w-4 h-4 shrink-0 ${exceptionCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
                <span className="truncate">Audit Flags</span>
              </div>
              <span className="font-bold shrink-0">{exceptionCount === 0 ? '0 Flags' : `${exceptionCount} Items`}</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. EXECUTIVE FINANCIAL PULSE (KPI CARDS)                                   */}
      {/* ========================================================================= */}
      {isDataAvailable && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Revenue */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs hover:border-slate-300 transition">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-medium">Revenue from Operations</span>
              {revGrowth !== null && (
                <span
                  className={`flex items-center gap-0.5 font-bold text-[11px] px-1.5 py-0.5 rounded ${
                    parseFloat(revGrowth) >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {parseFloat(revGrowth) >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {revGrowth}% YoY
                </span>
              )}
            </div>
            <div className="text-xl font-bold text-slate-900">{formatCompactINR(revenue)}</div>
            <div className="text-[11px] text-slate-500 mt-1 truncate">{formatINR(revenue)}</div>
            <button
              onClick={() => onNavigateToTab && onNavigateToTab('profit_loss')}
              className="mt-2.5 text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
            >
              <span>View Profit &amp; Loss</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Card 2: Net Profit (PAT) */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs hover:border-slate-300 transition">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-medium">Profit After Tax (PAT)</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  pat >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {pat >= 0 ? 'Profitable' : 'Net Loss'}
              </span>
            </div>
            <div className={`text-xl font-bold ${pat >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
              {formatCompactINR(pat)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span className="truncate">{formatINR(pat)}</span>
              <span className="font-semibold text-slate-700 ml-1">Margin: {patMargin}%</span>
            </div>
            <button
              onClick={() => onNavigateToTab && onNavigateToTab('profit_loss')}
              className="mt-2.5 text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
            >
              <span>Schedule Breakdown</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Card 3: Total Assets */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs hover:border-slate-300 transition">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-medium">Balance Sheet Size</span>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                Total Assets
              </span>
            </div>
            <div className="text-xl font-bold text-slate-900">{formatCompactINR(totalAssets)}</div>
            <div className="text-[11px] text-slate-500 mt-1 truncate">
              Working Capital: <strong className="text-slate-700 font-semibold">{formatCompactINR(netWorkingCapital)}</strong>
            </div>
            <button
              onClick={() => onNavigateToTab && onNavigateToTab('balance_sheet')}
              className="mt-2.5 text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
            >
              <span>View Balance Sheet</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Card 4: Ledger Mapping Progress */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs hover:border-slate-300 transition">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-medium">Ledger Mapping Health</span>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                100% Mapped
              </span>
            </div>
            <div className="text-xl font-bold text-slate-900">
              {tbRowCount} <span className="text-xs font-normal text-slate-500">Active Ledgers</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 truncate">
              {pyRowCount > 0 ? `Comparative PY: ${pyRowCount} Ledgers` : 'No PY TB Uploaded'}
            </div>
            <button
              onClick={() => onNavigateToTab && onNavigateToTab('mapping')}
              className="mt-2.5 text-[11px] text-indigo-700 hover:text-indigo-800 font-semibold flex items-center gap-1"
            >
              <span>Audit &amp; Reclassify</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SIMPLIFIED 4-STEP AUDIT WORKFLOW PIPELINE                              */}
      {/* ========================================================================= */}
      {config.entityName && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-xs">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 px-1 flex items-center justify-between">
            <span>Engagement Workflow Pipeline</span>
            <span className="text-[11px] text-slate-400 font-normal">Click any step to navigate</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {/* Step 1 */}
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-950 font-semibold flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                1
              </span>
              <div className="truncate">
                <div className="truncate">Data Ingestion</div>
                <div className="text-[10px] text-emerald-700 font-normal truncate">
                  {isDataAvailable ? `${tbRowCount} Ledgers Active` : 'Upload Required'}
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <button
              onClick={() => onNavigateToTab && onNavigateToTab('mapping')}
              className="p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-semibold flex items-center gap-2 transition text-left"
            >
              <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                2
              </span>
              <div className="truncate">
                <div className="truncate">Ledger Mapping</div>
                <div className="text-[10px] text-slate-500 font-normal truncate">Notes 3–25 Alignment</div>
              </div>
            </button>

            {/* Step 3 */}
            <button
              onClick={() => onNavigateToTab && onNavigateToTab('balance_sheet')}
              className="p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-semibold flex items-center gap-2 transition text-left"
            >
              <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                3
              </span>
              <div className="truncate">
                <div className="truncate">Balance Sheet & P & L</div>
                <div className="text-[10px] text-slate-500 font-normal truncate">Statutory Drafts</div>
              </div>
            </button>

            {/* Step 4 */}
            <button
              onClick={() => onNavigateToTab && onNavigateToTab('notes')}
              className="p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-semibold flex items-center gap-2 transition text-left"
            >
              <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                4
              </span>
              <div className="truncate">
                <div className="truncate">Notes &amp; Exceptions</div>
                <div className="text-[10px] text-slate-500 font-normal truncate">Audit Disclosures</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. STREAMLINED INGESTION HUB (TABS)                                        */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Sub-navigation selector */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 p-1.5 gap-1.5 text-xs font-medium">
          <button
            onClick={() => setIngestionTab('trial_balance')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
              ingestionTab === 'trial_balance'
                ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Trial Balance Files (CY &amp; PY)</span>
            {isDataAvailable && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>

          <button
            onClick={() => setIngestionTab('statements')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
              ingestionTab === 'statements'
                ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>Audited Statements Import (Optional)</span>
            {(uploadedBalanceSheet || uploadedProfitAndLoss) && (
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
            )}
          </button>

          <button
            onClick={() => setIngestionTab('samples')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
              ingestionTab === 'samples'
                ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4 text-amber-600" />
            <span>Sample Datasets &amp; Templates</span>
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {/* TAB 1: TRIAL BALANCE INGESTION */}
          {ingestionTab === 'trial_balance' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Trial Balance Ingestion</h3>
                  <p className="text-slate-500">
                    Extract containing Account Name, Debit, and Credit balances from Tally, Busy, SAP, Zoho Books, or Excel.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => onNavigateToTab && onNavigateToTab('drive')}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 text-xs font-semibold transition"
                    title="Browse and import Trial Balance workbooks directly from Google Drive"
                  >
                    <HardDrive className="w-3.5 h-3.5 text-sky-600" />
                    <span>Import from Drive</span>
                  </button>
                  {onOpenBackupRestore && (
                    <button
                      type="button"
                      onClick={onOpenBackupRestore}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold transition"
                      title="Backup workspace or restore previous client audits (Cloud & Local)"
                    >
                      <Database className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Backup &amp; Restore</span>
                    </button>
                  )}
                  <div className="text-[11px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg font-mono">
                    Supported formats: .xlsx, .xls, .csv
                  </div>
                </div>
              </div>

              {/* Branch-wise Trial Balance Consolidation Hub */}
              {onUpdateConfig && onUploadBranchTB && onClearBranchTB && (
                <div className="space-y-2">
                  {(config.numberOfBranches ?? 0) > 0 && (
                    <div className="flex items-center justify-between bg-indigo-50/70 border border-indigo-200 rounded-xl px-3.5 py-2">
                      <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Branch-wise Trial Balance Period Selector:</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setBranchPeriodTab('CY')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            branchPeriodTab === 'CY'
                              ? 'bg-emerald-700 text-white shadow-2xs'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          Current Year (FY {config.financialYear})
                        </button>
                        <button
                          type="button"
                          onClick={() => setBranchPeriodTab('PY')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            branchPeriodTab === 'PY'
                              ? 'bg-indigo-700 text-white shadow-2xs'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          Previous Year (FY {config.previousFinancialYear || '2024-25'})
                        </button>
                      </div>
                    </div>
                  )}
                  <BranchTrialBalanceManager
                    config={config}
                    period={branchPeriodTab}
                    onUpdateConfig={(partial) => onUpdateConfig({ ...config, ...partial })}
                    onUploadBranchTB={onUploadBranchTB}
                    onBulkUploadBranchTBs={onBulkUploadBranchTBs}
                    onClearBranchTB={onClearBranchTB}
                    onLoadSampleBranches={onLoadSampleBranches}
                    onUpdateBranchClosingStock={onUpdateBranchClosingStock}
                    onReviewConsolidatedMappings={onNavigateToMapping}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* 1. Current Year TB Card */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverCY(true);
                  }}
                  onDragLeave={() => setDragOverCY(false)}
                  onDrop={handleCYDrop}
                  className={`rounded-xl border p-5 transition flex flex-col justify-between ${
                    dragOverCY
                      ? 'border-emerald-500 bg-emerald-50/50'
                      : isDataAvailable
                      ? 'border-slate-200 bg-slate-50/30'
                      : 'border-dashed border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                          CY
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                            <span>Current Year Trial Balance</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                              Primary
                            </span>
                          </div>
                          <div className="text-xs text-slate-500">
                            FY {config.financialYear} • As on {config.reportingPeriod}
                          </div>
                        </div>
                      </div>

                      {isDataAvailable && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          <Check className="w-3.5 h-3.5" /> Loaded
                        </span>
                      )}
                    </div>

                    {isDataAvailable ? (
                      <div className="space-y-3 bg-white p-3.5 rounded-lg border border-slate-200 text-xs">
                        <div className="flex items-center justify-between text-slate-700">
                          <span className="font-medium truncate max-w-[200px]" title={tbFileName || 'Current Year TB'}>
                            📄 {tbFileName || 'Current Year TB File'}
                          </span>
                          <span className="font-bold text-slate-900">{tbRowCount} ledgers</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 font-mono text-[11px]">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Total Debit:</span>
                            <span className="font-bold text-slate-800">{formatINR(tbDebitTotal)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Total Credit:</span>
                            <span className="font-bold text-slate-800">{formatINR(tbCreditTotal)}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-800">
                            Drag &amp; Drop Current Year Trial Balance here
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">Supports Excel (.xlsx, .xls), PDF (.pdf), and CSV (.csv, .txt)</div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between gap-2">
                    <input
                      ref={cyInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv,.pdf,.txt"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          onUploadTB(e.target.files[0]);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => cyInputRef.current?.click()}
                      className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition shadow-xs flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isDataAvailable ? 'Replace File' : 'Browse File'}</span>
                    </button>

                    {isDataAvailable ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={onNavigateToMapping}
                          className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition flex items-center gap-1"
                        >
                          <span>View Mapping</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        {onClearTB && (
                          <button
                            type="button"
                            onClick={() => setConfirmClearCY(true)}
                            className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs transition"
                            title="Clear Current Year Trial Balance"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onLoadSample('rrk_manufacturing')}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition"
                      >
                        Load Apex &amp; Co. Sample
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Prior Year (PY) TB Card */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverPY(true);
                  }}
                  onDragLeave={() => setDragOverPY(false)}
                  onDrop={handlePYDrop}
                  className={`rounded-xl border p-5 transition flex flex-col justify-between ${
                    dragOverPY
                      ? 'border-indigo-500 bg-indigo-50/50'
                      : pyRowCount > 0
                      ? 'border-slate-200 bg-slate-50/30'
                      : 'border-dashed border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-xs">
                          PY
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                            <span>Comparative Prior Year TB</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                              Optional
                            </span>
                          </div>
                          <div className="text-xs text-slate-500">
                            FY {config.previousFinancialYear || '2024-25'} • As on {config.previousReportingPeriod || 'March 31, 2025'}
                          </div>
                        </div>
                      </div>

                      {pyRowCount > 0 && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                          <Check className="w-3.5 h-3.5" /> Loaded
                        </span>
                      )}
                    </div>

                    {pyRowCount > 0 ? (
                      <div className="space-y-3 bg-white p-3.5 rounded-lg border border-slate-200 text-xs">
                        <div className="flex items-center justify-between text-slate-700">
                          <span className="font-medium truncate max-w-[200px]" title={pyFileName || 'Prior Year TB'}>
                            📄 {pyFileName || 'Prior Year TB File'}
                          </span>
                          <span className="font-bold text-slate-900">{pyRowCount} ledgers</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 font-mono text-[11px]">
                          <div>
                            <span className="text-slate-400 block text-[10px]">PY Total Debit:</span>
                            <span className="font-bold text-slate-800">{formatINR(pyDebitTotal)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">PY Total Credit:</span>
                            <span className="font-bold text-slate-800">{formatINR(pyCreditTotal)}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-800">
                            Upload Prior Year Trial Balance
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Supports Excel, PDF, CSV; automatically fills comparative figures across all statutory schedules
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between gap-2">
                    <input
                      ref={pyInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv,.pdf,.txt"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          onUploadPYTB(e.target.files[0]);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => pyInputRef.current?.click()}
                      className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition shadow-xs flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{pyRowCount > 0 ? 'Replace PY TB' : 'Upload PY TB'}</span>
                    </button>

                    {pyRowCount > 0 && onClearPYTB && (
                      <button
                        type="button"
                        onClick={() => setConfirmClearPY(true)}
                        className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs transition"
                        title="Remove Prior Year Trial Balance"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AUDITED STATEMENTS IMPORT */}
          {ingestionTab === 'statements' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Audited Financial Statements Direct Import</h3>
                  <p className="text-slate-500">
                    Import existing finalized Balance Sheet or Profit &amp; Loss schedules (CY &amp; PY) to cross-reference with Trial Balance.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onLoadSampleStatements}
                  className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold transition self-start sm:self-auto"
                >
                  Load Sample Audited Statements
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* CY Balance Sheet */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverBS(true);
                  }}
                  onDragLeave={() => setDragOverBS(false)}
                  onDrop={handleBSDrop}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-800">Current Year Balance Sheet</span>
                      {uploadedBalanceSheet && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                          {uploadedBalanceSheet.items.length} Lines
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 text-[11px] mb-3">
                      {uploadedBalanceSheet ? uploadedBalanceSheet.fileName : 'Upload signed/drafted Balance Sheet Excel or CSV.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={bsInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) onUploadBalanceSheet(e.target.files[0]);
                      }}
                    />
                    <button
                      onClick={() => bsInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 transition"
                    >
                      {uploadedBalanceSheet ? 'Replace File' : 'Upload File'}
                    </button>
                    {uploadedBalanceSheet && (
                      <>
                        <button
                          onClick={() => onViewStatement(uploadedBalanceSheet)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={onClearBalanceSheet}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* CY Profit & Loss */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverPL(true);
                  }}
                  onDragLeave={() => setDragOverPL(false)}
                  onDrop={handlePLDrop}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-800">Current Year Profit &amp; Loss</span>
                      {uploadedProfitAndLoss && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                          {uploadedProfitAndLoss.items.length} Lines
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 text-[11px] mb-3">
                      {uploadedProfitAndLoss ? uploadedProfitAndLoss.fileName : 'Upload finalized P&L statement to cross-verify.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={plInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) onUploadProfitAndLoss(e.target.files[0]);
                      }}
                    />
                    <button
                      onClick={() => plInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 transition"
                    >
                      {uploadedProfitAndLoss ? 'Replace File' : 'Upload File'}
                    </button>
                    {uploadedProfitAndLoss && (
                      <>
                        <button
                          onClick={() => onViewStatement(uploadedProfitAndLoss)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={onClearProfitAndLoss}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SAMPLE DATASETS & TEMPLATES */}
          {ingestionTab === 'samples' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Pre-Configured Statutory Non-Corporate Datasets</h3>
                <p className="text-xs text-slate-500">
                  Instantly load full-scale test client trial balances mapped to ICAI schedules 1 to 25.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SAMPLE_DATASETS.map((ds) => (
                  <div
                    key={ds.id}
                    className="p-4 rounded-xl border border-slate-200 hover:border-emerald-300 transition bg-white shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {ds.entityType}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm mt-1">{ds.name}</h4>
                        <span className="text-xs text-slate-500 font-mono">FY {ds.financialYear}</span>
                      </div>
                      <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                        {ds.rows.length} Ledgers
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{ds.description}</p>

                    <button
                      onClick={() => onLoadSample(ds.id)}
                      className="w-full py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Load Dataset into Active Workspace</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. STATUTORY COMPLIANCE & ICAI NCE FRAMEWORK NOTE                         */}
      {/* ========================================================================= */}
      <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-4 text-xs text-slate-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-5 h-5 text-emerald-700 shrink-0" />
          <div>
            <span className="font-bold text-slate-800 block">
              ICAI Technical Guide on Financial Statements of Non-Corporate Entities
            </span>
            <span className="text-slate-500 text-[11px]">
              Notes 1 to 25 standard disclosures, MSME Trade Payables aging, Partner Capital Account reconciliation, and Form 3CD alignment.
            </span>
          </div>
        </div>
        <button
          onClick={onOpenConfig}
          className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium transition shrink-0"
        >
          View Entity Profile
        </button>
      </div>
        </div>
      )}

      {/* Financial Year & Comparative Period Modal */}
      <FinancialYearChangeModal
        isOpen={isLocalYearModalOpen}
        onClose={() => setIsLocalYearModalOpen(false)}
        config={config}
        onSave={(updated) => {
          if (onUpdateConfig) {
            onUpdateConfig(updated);
          }
        }}
      />

      {/* Delete Client Company Confirmation Dialog */}
      {deletingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 text-left flex-1">
                <h3 className="text-base font-bold text-slate-900">Delete Client Company</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {companies.length <= 1 ? (
                    <>
                      Are you sure you want to delete <strong className="text-slate-900">{deletingCompany.name}</strong>? As this is the only client entity in the workspace, deleting it will clear all trial balances and reset the workspace to a clean slate.
                    </>
                  ) : (
                    <>
                      Are you sure you want to delete client company <strong className="text-slate-900">{deletingCompany.name}</strong>? All associated trial balance ledgers and statements will be removed.
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingCompany(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteCompany) {
                    onDeleteCompany(deletingCompany.id);
                  }
                  setDeletingCompany(null);
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{companies.length <= 1 ? 'Reset Workspace' : 'Delete Company'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Current Year TB Confirmation Dialog */}
      {confirmClearCY && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 text-left flex-1">
                <h3 className="text-base font-bold text-slate-900">Clear Current Year Trial Balance</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to clear the Current Year Trial Balance ({tbRowCount} ledgers)? All mapped notes, Balance Sheet items, and P & L accounts for this period will be reset.
                </p>
              </div>
            </div>
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmClearCY(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClearTB) onClearTB();
                  setConfirmClearCY(false);
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Ledgers</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Previous Year TB Confirmation Dialog */}
      {confirmClearPY && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 text-left flex-1">
                <h3 className="text-base font-bold text-slate-900">Remove Previous Year Trial Balance</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to remove the Previous Year Trial Balance ({pyRowCount} ledgers)? Comparative columns in all statutory schedules will revert to benchmark estimates.
                </p>
              </div>
            </div>
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmClearPY(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClearPYTB) onClearPYTB();
                  setConfirmClearPY(false);
                }}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove PY Data</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
