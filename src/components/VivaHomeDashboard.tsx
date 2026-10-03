import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  TrendingUp,
  Wallet,
  Package,
  Sparkles,
  Download,
  Scale,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FileSpreadsheet,
  Briefcase,
  Calculator,
  Coins,
  Settings,
  Search,
  Building2,
  X,
  Plus,
  Check,
  Layers,
  BookOpen,
  ChevronDown,
  Calendar,
  Cloud,
  Database,
  RefreshCw,
  Upload,
  HardDrive,
} from 'lucide-react';
import {
  EntityConfig,
  BalanceSheetData,
  ProfitAndLossData,
  NoteScheduleData,
  AuditException,
  MappedLedger,
  Company,
  UserProfile,
} from '../types';
import { NCE_NOTE_DEFINITIONS } from '../data/nceTaxonomy';

interface VivaHomeDashboardProps {
  config: EntityConfig;
  companies: Company[];
  activeCompanyId?: string;
  onSelectCompany?: (companyId: string) => void;
  onOpenAddCompany?: () => void;
  mappedLedgers: MappedLedger[];
  pyMappedLedgers: MappedLedger[];
  totalDebit: number;
  totalCredit: number;
  computedFinancials: {
    balanceSheet: BalanceSheetData;
    profitAndLoss: ProfitAndLossData;
    noteSchedules: Record<number, NoteScheduleData>;
    computationExceptions: AuditException[];
  };
  allExceptions: AuditException[];
  isTallyBalanced: boolean;
  tallyDifference: number;
  onNavigateToStep: (step: 1 | 2 | 3 | 4 | 5, noteNum?: number) => void;
  onOpenCompanies: () => void;
  onTriggerAIMap: () => void;
  onOpenYearEndAdjustments: (target?: 'CY' | 'PY') => void;
  onOpenTradePayables: () => void;
  onOpenConfig: () => void;
  onExportExcel: () => void;
  onLoadSample: (datasetId: string) => void;
  currentUser?: UserProfile | null;
  onOpenSubscriptionModal?: () => void;
  onOpenReferralModal?: () => void;
  onOpenBackupRestore?: () => void;
  driveSyncStatus?: 'idle' | 'syncing' | 'synced' | 'error';
  lastDriveSyncTime?: Date | null;
  accessToken?: string | null;
  userEmail?: string;
  onManualDriveSync?: () => void;
  onConnectDrive?: () => void;
  onExportTotalLocalBackup?: () => void;
  onExportSingleCompanyBackup?: (companyId?: string) => void;
  driveApiDisabledUrl?: string | null;
}

function formatINR(val: number | undefined | null): string {
  const num = typeof val === 'number' && !Number.isNaN(val) ? val : 0;
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export const VivaHomeDashboard: React.FC<VivaHomeDashboardProps> = ({
  config,
  companies,
  activeCompanyId,
  onSelectCompany,
  onOpenAddCompany,
  mappedLedgers,
  pyMappedLedgers,
  totalDebit,
  computedFinancials,
  allExceptions,
  isTallyBalanced,
  tallyDifference,
  onNavigateToStep,
  onOpenCompanies,
  onTriggerAIMap,
  onOpenYearEndAdjustments,
  onOpenTradePayables,
  onOpenConfig,
  onExportExcel,
  onLoadSample,
  currentUser,
  onOpenSubscriptionModal,
  onOpenReferralModal,
  onOpenBackupRestore,
  driveSyncStatus = 'idle',
  lastDriveSyncTime,
  accessToken,
  userEmail,
  onManualDriveSync,
  onConnectDrive,
  onExportTotalLocalBackup,
  onExportSingleCompanyBackup,
  driveApiDisabledUrl,
}) => {
  const [dashboardSearch, setDashboardSearch] = useState('');
  const [searchScope, setSearchScope] = useState<'all' | 'companies' | 'ledgers' | 'notes'>('all');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showCompanyDirectory, setShowCompanyDirectory] = useState(false);
  const [schedulePeriodView, setSchedulePeriodView] = useState<'CY' | 'PY' | 'BOTH'>('CY');
  const [cardPeriodOverrides, setCardPeriodOverrides] = useState<Record<string, 'CY' | 'PY' | 'BOTH'>>({});
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleGlobalSchedulePeriodChange = (mode: 'CY' | 'PY' | 'BOTH') => {
    setSchedulePeriodView(mode);
    setCardPeriodOverrides({});
  };

  const getCardPeriodMode = (cardId: string): 'CY' | 'PY' | 'BOTH' => {
    return cardPeriodOverrides[cardId] || schedulePeriodView;
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const bs = computedFinancials.balanceSheet;
  const pl = computedFinancials.profitAndLoss;
  const userCredits = typeof currentUser?.credits === 'number' ? currentUser.credits : 555;
  const planBadgeText = 'CREDITS';

  // Core ICAI Statement Figures
  const revenueFromOps = pl.revenueFromOperations || 0;
  const otherIncome = pl.otherIncome || 0;
  const totalExpenses = pl.totalExpenses || 0;
  const cogs = pl.costOfGoodsSold || 0;
  const netProfit = pl.profitAfterTax || 0;
  const profitBeforeTax = pl.profitBeforeTax || 0;

  // Balance Sheet & Schedule Figures (Current Year - CY)
  const totalAssets = bs.totalAssets || 0;
  const totalEquitiesAndLiab = (bs as any).totalEquitiesAndLiabilities ?? bs.totalEquityAndLiabilities ?? 0;
  const ownersFunds = bs.totalOwnersFunds || 0;
  const ownersCapitalCY = bs.ownersCapital || 0;
  const reservesAndSurplusCY = bs.reservesAndSurplus || 0;
  const tradeReceivables = bs.tradeReceivables || 0;
  const tradePayables = bs.tradePayables || 0;
  const tradePayablesMsme = bs.tradePayablesMsme || 0;
  const inventories = bs.inventories || 0;
  const cashAndBank = bs.cashAndBankBalances || 0;
  const ppeNetBlock =
    ((bs as any).propertyPlantAndEquipment ?? bs.propertyPlantEquipment ?? 0) +
    (bs.intangibleAssets || 0) +
    (bs.capitalWorkInProgress || 0);
  const depreciationExpense = pl.depreciationExpense || 0;
  const totalBorrowings = (bs.longTermBorrowings || 0) + (bs.shortTermBorrowings || 0);

  // Previous Year (PY) Schedule & Statement Figures
  const pyOwnersFunds = bs.previousYear?.totalOwnersFunds || 0;
  const ownersCapitalPY = bs.previousYear?.ownersCapital || 0;
  const reservesAndSurplusPY = bs.previousYear?.reservesAndSurplus || 0;
  const pyInventories = bs.previousYear?.inventories || 0;
  const pyCogs = pl.previousYear?.costOfGoodsSold || 0;
  const pyTradeReceivables = bs.previousYear?.tradeReceivables || 0;
  const pyTradePayables = bs.previousYear?.tradePayables || 0;
  const pyTradePayablesMsme = bs.previousYear?.tradePayablesMsme || 0;
  const pyPpeNetBlock =
    ((bs.previousYear as any)?.propertyPlantAndEquipment ?? bs.previousYear?.propertyPlantEquipment ?? 0) +
    (bs.previousYear?.intangibleAssets || 0) +
    (bs.previousYear?.capitalWorkInProgress || 0);
  const pyDepreciationExpense = pl.previousYear?.depreciationExpense || 0;
  const pyCashAndBank = bs.previousYear?.cashAndBankBalances || 0;
  const pyTotalBorrowings =
    (bs.previousYear?.longTermBorrowings || 0) + (bs.previousYear?.shortTermBorrowings || 0);
  const cyLabel = config.financialYear || '2025-26';
  const pyLabel = config.previousFinancialYear || '2024-25';

  // Mapping & Readiness
  const mappedCount = mappedLedgers.filter((l) => ((l as any).mappedNote ?? l.noteNumber) > 0).length;
  const unmappedCount = mappedLedgers.length - mappedCount;
  const hasData = mappedLedgers.length > 0;
  const isFullyTallied = hasData && isTallyBalanced && bs.isBalanced;

  // Filtered Companies for Dashboard Search
  const filteredCompanies = useMemo(() => {
    const q = dashboardSearch.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) => {
      const name = (c.config.entityName || '').toLowerCase();
      const pan = (c.config.pan || '').toLowerCase();
      const gstin = (c.config.gstin || '').toLowerCase();
      const fy = (c.config.financialYear || '').toLowerCase();
      const type = (c.config.entityType || '').toLowerCase();
      const biz = (c.config.natureOfBusiness || '').toLowerCase();
      const prop = (c.config.proprietorName || '').toLowerCase();
      const partner = (c.config.signingPartnerName || '').toLowerCase();
      return (
        name.includes(q) ||
        pan.includes(q) ||
        gstin.includes(q) ||
        fy.includes(q) ||
        type.includes(q) ||
        biz.includes(q) ||
        prop.includes(q) ||
        partner.includes(q)
      );
    });
  }, [companies, dashboardSearch]);

  // Filtered Ledgers inside Active Company
  const filteredLedgers = useMemo(() => {
    const q = dashboardSearch.trim().toLowerCase();
    if (!q) return mappedLedgers.slice(0, 8);
    return mappedLedgers
      .filter((l) => {
        const name = (l.accountName || '').toLowerCase();
        const code = (l.accountCode || '').toLowerCase();
        const noteName = (l.noteName || '').toLowerCase();
        const subCat = (l.subCategory || '').toLowerCase();
        const noteNum = `note ${l.noteNumber}`;
        const balStr = String(Math.abs(l.netBalance || l.originalDebit || l.originalCredit || 0));
        return (
          name.includes(q) ||
          code.includes(q) ||
          noteName.includes(q) ||
          subCat.includes(q) ||
          noteNum.includes(q) ||
          balStr.includes(q)
        );
      })
      .slice(0, 15);
  }, [mappedLedgers, dashboardSearch]);

  // Filtered ICAI Notes inside Active Company
  const filteredNotes = useMemo(() => {
    const q = dashboardSearch.trim().toLowerCase();
    const allNotes = NCE_NOTE_DEFINITIONS.map((def) => {
      const sched = computedFinancials.noteSchedules?.[def.noteNumber];
      return {
        ...def,
        totalAmount: sched?.totalAmount ?? 0,
        previousYearAmount: sched?.previousYearAmount ?? 0,
        itemCount: sched?.items?.length ?? 0,
      };
    });
    if (!q) return allNotes.slice(0, 6);
    return allNotes.filter(
      (n) =>
        n.name.toLowerCase().includes(q) ||
        `note ${n.noteNumber}`.includes(q) ||
        String(n.noteNumber) === q ||
        n.description.toLowerCase().includes(q) ||
        n.subCategories.some((s) => s.toLowerCase().includes(q))
    );
  }, [computedFinancials.noteSchedules, dashboardSearch]);

  const netMarginPct =
    revenueFromOps > 0 ? ((netProfit / revenueFromOps) * 100).toFixed(1) : '0.0';

  const pyRevenue = pl.previousYear?.revenueFromOperations || 0;
  const pyOtherIncome = pl.previousYear?.otherIncome || 0;
  const pyTotalExpenses = pl.previousYear?.totalExpenses || 0;
  const pyTotalAssets = bs.previousYear?.totalAssets || 0;
  const pyTotalEquitiesAndLiab =
    (bs.previousYear as any)?.totalEquitiesAndLiabilities ??
    bs.previousYear?.totalEquityAndLiabilities ??
    0;
  const pyNetProfit = pl.previousYear?.profitAfterTax || 0;
  const pyProfitBeforeTax = pl.previousYear?.profitBeforeTax || 0;
  const pyNetMarginPct =
    pyRevenue > 0 ? ((pyNetProfit / pyRevenue) * 100).toFixed(1) : '0.0';
  const isPYBSBalanced = Math.abs(pyTotalAssets - pyTotalEquitiesAndLiab) < 1;

  const revYoYPct =
    pyRevenue > 0
      ? (((revenueFromOps - pyRevenue) / Math.abs(pyRevenue)) * 100).toFixed(1)
      : null;

  const entityInitial = (config.entityName || 'V').trim().charAt(0).toUpperCase() || 'V';
  const displayName = config.entityName || 'Viva Group';

  return (
    <div className="space-y-6 pb-10">
      {/* =================================================================== */}
      {/* 1. CLEAN ENTITY HERO BANNER                                         */}
      {/* =================================================================== */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Left: Entity Identity & Status */}
          <div className="flex items-start sm:items-center gap-4 min-w-0">
            <button
              type="button"
              onClick={onOpenConfig}
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-700 hover:from-teal-500 hover:to-cyan-600 text-white font-black text-2xl flex items-center justify-center shadow-sm shrink-0 transition cursor-pointer"
              title="Edit Entity Details, PAN/GSTIN & Auditor Settings"
            >
              {entityInitial}
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">
                  {displayName}
                </h1>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold whitespace-nowrap">
                  {config.entityType}
                </span>

                {/* Active Plan & Credit Balance Pill on Dashboard */}
                <button
                  type="button"
                  onClick={onOpenSubscriptionModal}
                  className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/90 text-xs font-extrabold whitespace-nowrap transition cursor-pointer shadow-2xs"
                  title="Click to view Credits, Balance & Top-Ups"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>{planBadgeText}</span>
                  <span className="text-amber-400">•</span>
                  <span className="text-emerald-700 font-black font-mono">
                    ⚡ {userCredits.toLocaleString()} Credits
                  </span>
                </button>

                {hasData && (
                  <span
                    onClick={() => onNavigateToStep(isFullyTallied ? 3 : 1)}
                    className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer border ${
                      isFullyTallied
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {isFullyTallied ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>TB &amp; BS Tallied</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>
                          {!isTallyBalanced
                            ? `TB Diff: ₹${formatINR(Math.abs(tallyDifference))}`
                            : `BS Diff: ₹${formatINR(Math.abs(bs.difference))}`}
                        </span>
                      </>
                    )}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 flex-wrap mt-1.5 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">
                  {config.gstin
                    ? `GSTIN: ${config.gstin}`
                    : config.pan
                    ? `PAN: ${config.pan}`
                    : 'No PAN/GSTIN set'}
                </span>
                <span>•</span>
                <span className="font-bold text-indigo-700">
                  F.Y. {config.financialYear}
                </span>
                <span>•</span>
                <span>
                  {mappedCount}/{mappedLedgers.length} CY Ledgers &amp; {pyMappedLedgers.length} PY Ledgers
                </span>
                <button
                  type="button"
                  onClick={onOpenConfig}
                  className="inline-flex items-center gap-1 text-slate-600 hover:text-indigo-600 font-semibold underline underline-offset-2 cursor-pointer"
                >
                  <Settings className="w-3 h-3" />
                  <span>Edit Entity</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right: Credit Balance Card + 3 Clear Primary Actions */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {onOpenSubscriptionModal && (
              <button
                type="button"
                onClick={onOpenSubscriptionModal}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-slate-900 to-emerald-950 hover:from-slate-800 hover:to-emerald-900 text-white border border-slate-800 text-xs font-extrabold shadow-xs transition flex items-center gap-2 cursor-pointer"
                title="Open Credits & Top-Up Hub"
              >
                <Coins className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="text-left leading-tight">
                  <div className="text-[9px] uppercase tracking-wider text-emerald-300 font-bold">
                    {planBadgeText}
                  </div>
                  <div className="text-xs font-black text-white font-mono">
                    ⚡ {userCredits.toLocaleString()} Pts
                  </div>
                </div>
              </button>
            )}

            <button
              type="button"
              onClick={() => onNavigateToStep(1)}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{hasData ? 'Trial Balance & Mapping' : 'Upload Trial Balance'}</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateToStep(3)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <Scale className="w-4 h-4" />
              <span>View BS &amp; P&amp;L</span>
            </button>

            <button
              type="button"
              onClick={onExportExcel}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-extrabold shadow-2xs transition flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Export Excel</span>
            </button>

            {onOpenBackupRestore && (
              <button
                type="button"
                onClick={onOpenBackupRestore}
                className="px-4 py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-300 text-xs font-extrabold shadow-2xs transition flex items-center gap-2 cursor-pointer"
                title="Open Backup, Restore & Google Drive Sync Hub"
              >
                <Database className="w-4 h-4 text-teal-700" />
                <span>Backup, Restore &amp; Sync</span>
              </button>
            )}
          </div>
        </div>

        {/* =================================================================== */}
        {/* DASHBOARD SEARCH IN COMPANY & CLIENT ENTITIES                       */}
        {/* =================================================================== */}
        <div ref={searchContainerRef} className="mt-5 pt-4 border-t border-slate-100 relative">
          <div className="flex flex-col md:flex-row md:items-center gap-2.5">
            {/* Search Input Box */}
            <div
              onClick={() => {
                setIsSearchFocused(true);
                searchInputRef.current?.focus();
              }}
              className="flex-1 flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-slate-50/90 hover:bg-slate-100/70 focus-within:bg-white border border-slate-200/90 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 transition cursor-text"
            >
              <Search className="w-4 h-4 text-indigo-600 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={dashboardSearch}
                onFocus={() => setIsSearchFocused(true)}
                onChange={(e) => {
                  setDashboardSearch(e.target.value);
                  setIsSearchFocused(true);
                }}
                placeholder={`Search in company (${displayName} ledgers, Notes 1–25) or search client companies by Name, PAN, GSTIN, FY...`}
                className="w-full bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none font-medium"
              />
              {dashboardSearch && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDashboardSearch('');
                    searchInputRef.current?.focus();
                  }}
                  className="p-1 rounded-lg hover:bg-slate-200/70 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Scope Pills & Company Directory Toggle */}
            <div className="flex items-center gap-1.5 flex-wrap shrink-0">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'companies', label: `Companies (${companies.length})` },
                  { id: 'ledgers', label: `Ledgers (${mappedLedgers.length})` },
                  { id: 'notes', label: 'Notes (1–25)' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setSearchScope(tab.id);
                    setIsSearchFocused(true);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    searchScope === tab.id
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setShowCompanyDirectory((prev) => !prev)}
                className={`px-3 py-2 rounded-xl text-xs font-extrabold border transition flex items-center gap-1.5 cursor-pointer ${
                  showCompanyDirectory
                    ? 'bg-teal-50 text-teal-900 border-teal-300'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
                title="Browse and search all saved client companies on Dashboard"
              >
                <Building2 className="w-3.5 h-3.5 text-teal-600" />
                <span>Switch Company</span>
              </button>

              {onOpenAddCompany && (
                <button
                  type="button"
                  onClick={onOpenAddCompany}
                  className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-extrabold transition flex items-center gap-1 cursor-pointer"
                  title="Create or add a new client company"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Add Company</span>
                </button>
              )}
            </div>
          </div>

          {/* Interactive Search Results Panel */}
          {(isSearchFocused || dashboardSearch.trim().length > 0) && (
            <div className="mt-3 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden z-20 animate-in fade-in duration-150">
              <div className="px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-bold">
                  <Search className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {dashboardSearch.trim()
                      ? `Search Results for "${dashboardSearch.trim()}"`
                      : `Quick Search in ${displayName} & Saved Companies`}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onOpenCompanies}
                    className="text-[11px] text-emerald-300 hover:text-emerald-200 font-semibold underline underline-offset-2 cursor-pointer"
                  >
                    Open Full Company Manager →
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSearchFocused(false);
                      setDashboardSearch('');
                    }}
                    className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 p-3 space-y-4">
                {/* SECTION A: MATCHING CLIENT COMPANIES */}
                {(searchScope === 'all' || searchScope === 'companies') && (
                  <div>
                    <div className="px-2 pb-2 flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-teal-600" />
                        Saved Client Companies ({filteredCompanies.length})
                      </span>
                      <button
                        type="button"
                        onClick={onOpenCompanies}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        Manage All Companies
                      </button>
                    </div>

                    {filteredCompanies.length === 0 ? (
                      <div className="p-3 rounded-xl bg-slate-50 text-xs text-slate-500 flex items-center justify-between">
                        <span>No saved company matches &ldquo;{dashboardSearch}&rdquo;.</span>
                        {onOpenAddCompany && (
                          <button
                            type="button"
                            onClick={onOpenAddCompany}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-xs cursor-pointer"
                          >
                            + Create New Company
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {filteredCompanies.map((comp) => {
                          const isCurrent =
                            comp.id === activeCompanyId ||
                            (!activeCompanyId && comp.config.entityName === config.entityName);
                          return (
                            <button
                              key={comp.id}
                              type="button"
                              onClick={() => {
                                onSelectCompany?.(comp.id);
                                setIsSearchFocused(false);
                                setDashboardSearch('');
                              }}
                              className={`text-left p-3 rounded-xl border transition flex items-start justify-between gap-2 cursor-pointer ${
                                isCurrent
                                  ? 'bg-teal-50/70 border-teal-300 text-teal-950'
                                  : 'bg-white hover:bg-slate-50 border-slate-200/90 text-slate-800'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="text-xs font-extrabold truncate flex items-center gap-1.5">
                                  <span className="truncate">{comp.config.entityName}</span>
                                  {isCurrent && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-teal-600 text-white text-[9px] font-black uppercase shrink-0">
                                      Active
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                                  {comp.config.entityType} • FY {comp.config.financialYear}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                                  {comp.config.gstin
                                    ? `GSTIN: ${comp.config.gstin}`
                                    : comp.config.pan
                                    ? `PAN: ${comp.config.pan}`
                                    : `${comp.mappedLedgers?.length || 0} CY Ledgers`}
                                </div>
                              </div>
                              {isCurrent ? (
                                <Check className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                              ) : (
                                <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* SECTION B: LEDGERS INSIDE ACTIVE COMPANY */}
                {(searchScope === 'all' || searchScope === 'ledgers') && (
                  <div className="pt-3 first:pt-0">
                    <div className="px-2 pb-2 flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        Ledgers in {displayName} ({filteredLedgers.length} shown)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsSearchFocused(false);
                          onNavigateToStep(1);
                        }}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                      >
                        Open Full Trial Balance →
                      </button>
                    </div>

                    {filteredLedgers.length === 0 ? (
                      <div className="p-3 rounded-xl bg-slate-50 text-xs text-slate-500">
                        {mappedLedgers.length === 0
                          ? `No Trial Balance ledgers uploaded yet for ${displayName}.`
                          : `No ledgers in ${displayName} match "${dashboardSearch}".`}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {filteredLedgers.map((ledger, idx) => {
                          const dr = ledger.originalDebit || 0;
                          const cr = ledger.originalCredit || 0;
                          const amt = dr > 0 ? dr : cr;
                          const drCr = dr > 0 ? 'Dr' : 'Cr';
                          return (
                            <button
                              key={ledger.id || `${ledger.accountName}-${idx}`}
                              type="button"
                              onClick={() => {
                                setIsSearchFocused(false);
                                if (ledger.noteNumber && ledger.noteNumber >= 3) {
                                  onNavigateToStep(4, ledger.noteNumber);
                                } else {
                                  onNavigateToStep(1);
                                }
                              }}
                              className="text-left p-2.5 rounded-xl border border-slate-200/80 hover:border-indigo-300 hover:bg-indigo-50/40 transition flex items-center justify-between gap-2 cursor-pointer"
                            >
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 truncate">
                                  {ledger.accountName}
                                </div>
                                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                  {ledger.noteNumber > 0
                                    ? `Note ${ledger.noteNumber}: ${ledger.noteName}`
                                    : 'Unmapped Ledger'}{' '}
                                  {ledger.subCategory ? `• ${ledger.subCategory}` : ''}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-xs font-black font-mono text-slate-900">
                                  ₹{formatINR(amt)}{' '}
                                  <span
                                    className={
                                      drCr === 'Dr' ? 'text-indigo-600' : 'text-emerald-700'
                                    }
                                  >
                                    {drCr}
                                  </span>
                                </div>
                                <div className="text-[10px] text-indigo-600 font-semibold">
                                  View Note →
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* SECTION C: ICAI NOTES & SCHEDULES INSIDE ACTIVE COMPANY */}
                {(searchScope === 'all' || searchScope === 'notes') && (
                  <div className="pt-3 first:pt-0">
                    <div className="px-2 pb-2 flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                        ICAI Notes &amp; Schedules in {displayName} ({filteredNotes.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsSearchFocused(false);
                          onNavigateToStep(4);
                        }}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        View All 25 Notes →
                      </button>
                    </div>

                    {filteredNotes.length === 0 ? (
                      <div className="p-3 rounded-xl bg-slate-50 text-xs text-slate-500">
                        No ICAI Note schedules match &ldquo;{dashboardSearch}&rdquo;.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {filteredNotes.map((note) => (
                          <button
                            key={note.noteNumber}
                            type="button"
                            onClick={() => {
                              setIsSearchFocused(false);
                              onNavigateToStep(4, note.noteNumber);
                            }}
                            className="text-left p-2.5 rounded-xl border border-slate-200/80 hover:border-indigo-300 hover:bg-indigo-50/40 transition flex items-center justify-between gap-2 cursor-pointer"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-extrabold text-slate-900 truncate">
                                Note {note.noteNumber}: {note.name}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                {note.statement === 'BalanceSheet' ? 'Balance Sheet' : 'Profit & Loss'}{' '}
                                {note.itemCount > 0 ? `• ${note.itemCount} ledgers` : ''}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xs font-black font-mono text-slate-800">
                                ₹{formatINR(note.totalAmount)}
                              </div>
                              <div className="text-[10px] text-indigo-600 font-semibold">Open →</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Expandable Quick Company Switcher & Directory Strip */}
          {showCompanyDirectory && !isSearchFocused && (
            <div className="mt-3 p-4 rounded-2xl bg-slate-50/90 border border-slate-200/90 space-y-3 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-teal-600" />
                  <span className="text-xs font-black text-slate-900">
                    Saved Client Companies ({companies.length})
                  </span>
                  <span className="text-[11px] text-slate-500">
                    — Click any company to switch active workspace
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onOpenCompanies}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition cursor-pointer"
                  >
                    Open Company Manager
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCompanyDirectory(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {companies.map((comp) => {
                  const isCurrent =
                    comp.id === activeCompanyId ||
                    (!activeCompanyId && comp.config.entityName === config.entityName);
                  return (
                    <button
                      key={comp.id}
                      type="button"
                      onClick={() => {
                        onSelectCompany?.(comp.id);
                        setShowCompanyDirectory(false);
                      }}
                      className={`text-left p-3 rounded-xl border transition flex items-center justify-between gap-2 cursor-pointer ${
                        isCurrent
                          ? 'bg-teal-50 border-teal-400 text-teal-950 shadow-2xs'
                          : 'bg-white hover:bg-indigo-50/40 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-extrabold truncate flex items-center gap-1.5">
                          <span className="truncate">{comp.config.entityName}</span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.5 rounded-full bg-teal-600 text-white text-[9px] font-black uppercase shrink-0">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {comp.config.entityType} • FY {comp.config.financialYear} •{' '}
                          {comp.mappedLedgers?.length || 0} ledgers
                        </div>
                      </div>
                      {isCurrent ? (
                        <Check className="w-4 h-4 text-teal-600 shrink-0" />
                      ) : (
                        <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Friendly Quick-Start Strip when no Trial Balance is loaded */}
        {!hasData && (
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 rounded-2xl p-4">
            <div>
              <div className="text-xs font-extrabold text-slate-800">
                Get Started in 1 Click
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload your client&apos;s Excel/CSV Trial Balance in Step 1, or load a sample dataset to explore the full ICAI statements.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <button
                type="button"
                onClick={() => onLoadSample('rrk_manufacturing')}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold shadow-2xs transition cursor-pointer"
              >
                Load Sample Partnership Firm
              </button>
              <button
                type="button"
                onClick={() => onLoadSample('durga_steel')}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-bold shadow-2xs transition cursor-pointer"
              >
                Load Sample Proprietorship
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* 1B. USER-FRIENDLY BACKUP, RESTORE & CLOUD SYNC HUB ON DASHBOARD     */}
      {/* =================================================================== */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white rounded-3xl border border-slate-800 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          {/* Left: Status & Explanation */}
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-teal-500/20 text-teal-300 border border-teal-400/30 flex items-center justify-center shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black text-white tracking-tight">
                  Backup, Restore &amp; Cloud Sync Hub
                </h2>
                {accessToken ? (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      driveSyncStatus === 'syncing'
                        ? 'bg-blue-500/20 text-blue-200 border-blue-400/30'
                        : driveSyncStatus === 'error'
                        ? 'bg-rose-500/20 text-rose-200 border-rose-400/30'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                    }`}
                  >
                    <RefreshCw
                      className={`w-3 h-3 ${driveSyncStatus === 'syncing' ? 'animate-spin' : ''}`}
                    />
                    <span>
                      {driveSyncStatus === 'syncing'
                        ? 'Syncing to Google Drive...'
                        : driveSyncStatus === 'error'
                        ? 'Drive Sync Needs Attention'
                        : 'Google Drive Auto-Sync Active'}
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] font-black uppercase tracking-wider">
                    <span>Local Storage Active • Cloud Not Connected</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {accessToken && lastDriveSyncTime ? (
                  <>
                    Connected as <strong className="text-white">{userEmail || 'Google Account'}</strong> • Last synced at{' '}
                    <strong className="text-teal-300">
                      {lastDriveSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </strong>
                    . Download 1-click JSON backups or restore any company file anytime.
                  </>
                ) : (
                  <>
                    Save 1-click local backups (<code className="text-teal-300">.json</code>) for{' '}
                    <strong className="text-white">{displayName}</strong> or all{' '}
                    <strong className="text-white">{companies.length} companies</strong>, restore from backup files, or connect Google Drive for automatic cross-device cloud sync.
                  </>
                )}
              </p>
              {driveApiDisabledUrl && (
                <div className="mt-2">
                  <a
                    href={driveApiDisabledUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold transition"
                  >
                    <span>Enable Google Drive API in Cloud Console →</span>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Right: 4 User-Friendly Action Buttons (Sync, Single Backup, Total Backup, Restore) */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 shrink-0">
            {/* 1. Google Drive Sync / Connect Button */}
            <button
              type="button"
              onClick={() => {
                if (accessToken) {
                  onManualDriveSync?.();
                } else {
                  onConnectDrive?.();
                }
              }}
              disabled={driveSyncStatus === 'syncing'}
              className="px-3.5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-60 text-slate-950 text-xs font-black shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              title={
                accessToken
                  ? 'Manually sync all companies to your Google Drive right now'
                  : 'Sign in with Google to enable automatic Google Drive cloud backup & sync'
              }
            >
              <RefreshCw
                className={`w-3.5 h-3.5 shrink-0 ${driveSyncStatus === 'syncing' ? 'animate-spin' : ''}`}
              />
              <span>{accessToken ? 'Sync Drive Now' : 'Connect Cloud Sync'}</span>
            </button>

            {/* 2. Single Company Backup (.json) */}
            {onExportSingleCompanyBackup && (
              <button
                type="button"
                onClick={() => onExportSingleCompanyBackup(activeCompanyId)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                title={`Download Single Company Backup (.json) for ${displayName}`}
              >
                <Download className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Backup Active Company</span>
              </button>
            )}

            {/* 3. Total Backup (All Companies .json) */}
            {onExportTotalLocalBackup && (
              <button
                type="button"
                onClick={onExportTotalLocalBackup}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                title={`Download Total Workspace Backup (.json) containing all ${companies.length} client companies`}
              >
                <HardDrive className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Backup All ({companies.length})</span>
              </button>
            )}

            {/* 4. Restore / Open Full Backup & Restore Hub */}
            {onOpenBackupRestore && (
              <button
                type="button"
                onClick={onOpenBackupRestore}
                className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/40 text-xs font-extrabold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                title="Restore companies from a local .json backup file or Google Drive cloud snapshot"
              >
                <Upload className="w-3.5 h-3.5 text-white shrink-0" />
                <span>Restore &amp; Backup Hub</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. 4 PRIMARY FINANCIAL PILLARS (PASTEL CARDS WITH CY / PY DROPDOWN) */}
      {/* =================================================================== */}
      <div className="space-y-3">
        {/* Top Period Bar for Financial Pillars */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-black text-slate-900">
              Primary Financial Highlights
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 text-[10px] font-extrabold uppercase tracking-wider">
              {schedulePeriodView === 'PY'
                ? `Previous Year • FY ${pyLabel}`
                : schedulePeriodView === 'BOTH'
                ? `Comparative • FY ${cyLabel} vs FY ${pyLabel}`
                : `Current Year • FY ${cyLabel}`}
            </span>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-bold text-slate-500">Select Period:</span>
            <div className="relative flex items-center">
              <Calendar className="w-3.5 h-3.5 text-indigo-600 absolute left-3 pointer-events-none" />
              <select
                value={schedulePeriodView}
                onChange={(e) =>
                  handleGlobalSchedulePeriodChange(e.target.value as 'CY' | 'PY' | 'BOTH')
                }
                aria-label="Select Current Year or Previous Year for Financial Pillars"
                className="pl-8 pr-8 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/90 text-xs font-extrabold shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer appearance-none transition"
              >
                <option value="CY">Current Year (CY • FY {cyLabel})</option>
                <option value="PY">Previous Year (PY • FY {pyLabel})</option>
                <option value="BOTH">Comparative (CY &amp; PY Details)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {/* 1. Revenue from Operations */}
          {(() => {
            const mode = getCardPeriodMode('pillar_revenue');
            return (
              <div
                onClick={() => onNavigateToStep(4, 19)}
                className="rounded-3xl bg-gradient-to-br from-[#F0FDF4] to-[#DCFCE7]/60 border border-[#BBF7D0] p-5 sm:p-6 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-[#D1FAE5] text-[#059669] flex items-center justify-center shrink-0">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <span className="px-2.5 py-1 rounded-full bg-[#D1FAE5] text-[#047857] text-[10px] font-black uppercase tracking-wider">
                      {mode === 'PY'
                        ? `PY • FY ${pyLabel}`
                        : revYoYPct !== null
                        ? `${Number(revYoYPct) >= 0 ? '+' : ''}${revYoYPct}% YoY`
                        : 'NOTE 19 • TURNOVER'}
                    </span>
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="relative"
                    >
                      <select
                        value={mode}
                        onChange={(e) =>
                          setCardPeriodOverrides((prev) => ({
                            ...prev,
                            pillar_revenue: e.target.value as 'CY' | 'PY' | 'BOTH',
                          }))
                        }
                        aria-label="Revenue Period Selection"
                        className="pl-2 pr-5 py-1 rounded-full bg-white/90 hover:bg-white text-[#065F46] border border-[#86EFAC] text-[10px] font-black uppercase cursor-pointer appearance-none focus:outline-none shadow-2xs"
                      >
                        <option value="CY">CY</option>
                        <option value="PY">PY</option>
                        <option value="BOTH">CY &amp; PY</option>
                      </select>
                      <ChevronDown className="w-2.5 h-2.5 text-[#047857] absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between gap-1">
                    <div className="text-xs font-bold text-[#065F46] uppercase tracking-wider">
                      Revenue from Operations
                    </div>
                    <span className="text-[10px] font-extrabold text-[#047857]">
                      {mode === 'PY' ? `(PY ${pyLabel})` : mode === 'BOTH' ? '(CY vs PY)' : `(CY ${cyLabel})`}
                    </span>
                  </div>

                  {mode === 'BOTH' ? (
                    <div className="mt-2 grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-white/70 border border-[#BBF7D0]">
                      <div>
                        <div className="text-[10px] font-extrabold text-[#065F46] uppercase">
                          CY ({cyLabel})
                        </div>
                        <div className="text-sm font-black text-[#059669] font-mono tabular-nums mt-0.5 truncate">
                          ₹{formatINR(revenueFromOps)}
                        </div>
                        <div className="text-[10px] text-[#047857] mt-0.5 truncate">
                          Other: ₹{formatINR(otherIncome)}
                        </div>
                      </div>
                      <div className="border-l border-[#BBF7D0] pl-2">
                        <div className="text-[10px] font-extrabold text-amber-800 uppercase">
                          PY ({pyLabel})
                        </div>
                        <div className="text-sm font-black text-slate-800 font-mono tabular-nums mt-0.5 truncate">
                          ₹{formatINR(pyRevenue)}
                        </div>
                        <div className="text-[10px] text-slate-600 mt-0.5 truncate">
                          Other: ₹{formatINR(pyOtherIncome)}
                        </div>
                      </div>
                    </div>
                  ) : mode === 'PY' ? (
                    <>
                      <div className="text-2xl font-black text-[#059669] font-mono tabular-nums tracking-tight mt-1">
                        ₹{formatINR(pyRevenue)}
                      </div>
                      <div className="text-xs font-medium text-[#047857] mt-2.5 flex items-center justify-between gap-2 flex-wrap">
                        <span>PY Other Income: ₹{formatINR(pyOtherIncome)}</span>
                        <span className="opacity-80">CY: ₹{formatINR(revenueFromOps)}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-2xl font-black text-[#059669] font-mono tabular-nums tracking-tight mt-1">
                        ₹{formatINR(revenueFromOps)}
                      </div>
                      <div className="text-xs font-medium text-[#047857] mt-2.5 flex items-center justify-between gap-2 flex-wrap">
                        <span>Other Income: ₹{formatINR(otherIncome)}</span>
                        <span className="opacity-75">PY: ₹{formatINR(pyRevenue)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })()}

          {/* 2. Total Expenses & COGS */}
          {(() => {
            const mode = getCardPeriodMode('pillar_expenses');
            return (
              <div
                onClick={() => onNavigateToStep(4, 21)}
                className="rounded-3xl bg-gradient-to-br from-[#FFFBEB] to-[#FEF3C7]/60 border border-[#FDE68A] p-5 sm:p-6 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-[#FEF3C7] text-[#B45309] flex items-center justify-center shrink-0">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <span className="px-2.5 py-1 rounded-full bg-[#FDE68A]/80 text-[#92400E] text-[10px] font-black uppercase tracking-wider">
                      {mode === 'PY' ? `PY • FY ${pyLabel}` : 'NOTES 21–25'}
                    </span>
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="relative"
                    >
                      <select
                        value={mode}
                        onChange={(e) =>
                          setCardPeriodOverrides((prev) => ({
                            ...prev,
                            pillar_expenses: e.target.value as 'CY' | 'PY' | 'BOTH',
                          }))
                        }
                        aria-label="Total Expenses Period Selection"
                        className="pl-2 pr-5 py-1 rounded-full bg-white/90 hover:bg-white text-[#78350F] border border-[#FCD34D] text-[10px] font-black uppercase cursor-pointer appearance-none focus:outline-none shadow-2xs"
                      >
                        <option value="CY">CY</option>
                        <option value="PY">PY</option>
                        <option value="BOTH">CY &amp; PY</option>
                      </select>
                      <ChevronDown className="w-2.5 h-2.5 text-[#92400E] absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between gap-1">
                    <div className="text-xs font-bold text-[#78350F] uppercase tracking-wider">
                      Total Expenses &amp; COGS
                    </div>
                    <span className="text-[10px] font-extrabold text-[#92400E]">
                      {mode === 'PY' ? `(PY ${pyLabel})` : mode === 'BOTH' ? '(CY vs PY)' : `(CY ${cyLabel})`}
                    </span>
                  </div>

                  {mode === 'BOTH' ? (
                    <div className="mt-2 grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-white/70 border border-[#FDE68A]">
                      <div>
                        <div className="text-[10px] font-extrabold text-[#78350F] uppercase">
                          CY ({cyLabel})
                        </div>
                        <div className="text-sm font-black text-[#B45309] font-mono tabular-nums mt-0.5 truncate">
                          ₹{formatINR(totalExpenses)}
                        </div>
                        <div className="text-[10px] text-[#92400E] mt-0.5 truncate">
                          COGS: ₹{formatINR(cogs)}
                        </div>
                      </div>
                      <div className="border-l border-[#FDE68A] pl-2">
                        <div className="text-[10px] font-extrabold text-[#92400E] uppercase">
                          PY ({pyLabel})
                        </div>
                        <div className="text-sm font-black text-slate-800 font-mono tabular-nums mt-0.5 truncate">
                          ₹{formatINR(pyTotalExpenses)}
                        </div>
                        <div className="text-[10px] text-slate-600 mt-0.5 truncate">
                          PY COGS: ₹{formatINR(pyCogs)}
                        </div>
                      </div>
                    </div>
                  ) : mode === 'PY' ? (
                    <>
                      <div className="text-2xl font-black text-[#B45309] font-mono tabular-nums tracking-tight mt-1">
                        ₹{formatINR(pyTotalExpenses)}
                      </div>
                      <div className="text-xs font-medium text-[#92400E] mt-2.5 flex items-center justify-between gap-2 flex-wrap">
                        <span>PY COGS (N.21): ₹{formatINR(pyCogs)}</span>
                        <span className="opacity-80">CY: ₹{formatINR(totalExpenses)}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-2xl font-black text-[#B45309] font-mono tabular-nums tracking-tight mt-1">
                        ₹{formatINR(totalExpenses)}
                      </div>
                      <div className="text-xs font-medium text-[#92400E] mt-2.5 flex items-center justify-between gap-2 flex-wrap">
                        <span>COGS (N.21): ₹{formatINR(cogs)}</span>
                        <span className="opacity-75">PY: ₹{formatINR(pyTotalExpenses)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })()}

          {/* 3. Balance Sheet Size */}
          {(() => {
            const mode = getCardPeriodMode('pillar_bs');
            return (
              <div
                onClick={() => onNavigateToStep(3)}
                className="rounded-3xl bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE]/60 border border-[#BFDBFE] p-5 sm:p-6 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-[#DBEAFE] text-[#2563EB] flex items-center justify-center shrink-0">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        (mode === 'PY' ? isPYBSBalanced : bs.isBalanced)
                          ? 'bg-[#DBEAFE] text-[#1D4ED8]'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {mode === 'PY'
                        ? isPYBSBalanced
                          ? '✓ PY TALLIED'
                          : 'CHECK PY DIFF'
                        : bs.isBalanced
                        ? '✓ BS TALLIED'
                        : 'CHECK DIFF'}
                    </span>
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="relative"
                    >
                      <select
                        value={mode}
                        onChange={(e) =>
                          setCardPeriodOverrides((prev) => ({
                            ...prev,
                            pillar_bs: e.target.value as 'CY' | 'PY' | 'BOTH',
                          }))
                        }
                        aria-label="Balance Sheet Period Selection"
                        className="pl-2 pr-5 py-1 rounded-full bg-white/90 hover:bg-white text-[#1E3A8A] border border-[#93C5FD] text-[10px] font-black uppercase cursor-pointer appearance-none focus:outline-none shadow-2xs"
                      >
                        <option value="CY">CY</option>
                        <option value="PY">PY</option>
                        <option value="BOTH">CY &amp; PY</option>
                      </select>
                      <ChevronDown className="w-2.5 h-2.5 text-[#1D4ED8] absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between gap-1">
                    <div className="text-xs font-bold text-[#1E3A8A] uppercase tracking-wider">
                      Balance Sheet Total
                    </div>
                    <span className="text-[10px] font-extrabold text-[#1D4ED8]">
                      {mode === 'PY' ? `(PY ${pyLabel})` : mode === 'BOTH' ? '(CY vs PY)' : `(CY ${cyLabel})`}
                    </span>
                  </div>

                  {mode === 'BOTH' ? (
                    <div className="mt-2 grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-white/70 border border-[#BFDBFE]">
                      <div>
                        <div className="text-[10px] font-extrabold text-[#1E3A8A] uppercase">
                          CY ({cyLabel})
                        </div>
                        <div className="text-sm font-black text-[#2563EB] font-mono tabular-nums mt-0.5 truncate">
                          ₹{formatINR(totalAssets)}
                        </div>
                        <div className="text-[10px] text-[#1D4ED8] mt-0.5 truncate">
                          Liab: ₹{formatINR(totalEquitiesAndLiab)}
                        </div>
                      </div>
                      <div className="border-l border-[#BFDBFE] pl-2">
                        <div className="text-[10px] font-extrabold text-amber-800 uppercase">
                          PY ({pyLabel})
                        </div>
                        <div className="text-sm font-black text-slate-800 font-mono tabular-nums mt-0.5 truncate">
                          ₹{formatINR(pyTotalAssets)}
                        </div>
                        <div className="text-[10px] text-slate-600 mt-0.5 truncate">
                          PY Liab: ₹{formatINR(pyTotalEquitiesAndLiab)}
                        </div>
                      </div>
                    </div>
                  ) : mode === 'PY' ? (
                    <>
                      <div className="text-2xl font-black text-[#2563EB] font-mono tabular-nums tracking-tight mt-1">
                        ₹{formatINR(pyTotalAssets)}
                      </div>
                      <div className="text-xs font-medium text-[#1D4ED8] mt-2.5 flex items-center justify-between gap-2 flex-wrap">
                        <span>PY Liabilities: ₹{formatINR(pyTotalEquitiesAndLiab)}</span>
                        <span className="opacity-80">CY: ₹{formatINR(totalAssets)}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-2xl font-black text-[#2563EB] font-mono tabular-nums tracking-tight mt-1">
                        ₹{formatINR(totalAssets)}
                      </div>
                      <div className="text-xs font-medium text-[#1D4ED8] mt-2.5 flex items-center justify-between gap-2 flex-wrap">
                        <span>Liabilities: ₹{formatINR(totalEquitiesAndLiab)}</span>
                        <span className="opacity-75">PY: ₹{formatINR(pyTotalAssets)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })()}

          {/* 4. Net Profit After Tax */}
          {(() => {
            const mode = getCardPeriodMode('pillar_profit');
            return (
              <div
                onClick={() => onNavigateToStep(3)}
                className="rounded-3xl bg-gradient-to-br from-[#FAF5FF] to-[#F3E8FF]/60 border border-[#E9D5FF] p-5 sm:p-6 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-[#F3E8FF] text-[#7C3AED] flex items-center justify-center shrink-0">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <span className="px-2.5 py-1 rounded-full bg-[#F3E8FF] text-[#6D28D9] text-[10px] font-black uppercase tracking-wider">
                      {mode === 'PY'
                        ? pyNetProfit >= 0
                          ? `PY MARGIN ${pyNetMarginPct}%`
                          : 'PY NET LOSS'
                        : netProfit >= 0
                        ? `MARGIN ${netMarginPct}%`
                        : 'NET LOSS'}
                    </span>
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="relative"
                    >
                      <select
                        value={mode}
                        onChange={(e) =>
                          setCardPeriodOverrides((prev) => ({
                            ...prev,
                            pillar_profit: e.target.value as 'CY' | 'PY' | 'BOTH',
                          }))
                        }
                        aria-label="Net Profit Period Selection"
                        className="pl-2 pr-5 py-1 rounded-full bg-white/90 hover:bg-white text-[#4C1D95] border border-[#D8B4FE] text-[10px] font-black uppercase cursor-pointer appearance-none focus:outline-none shadow-2xs"
                      >
                        <option value="CY">CY</option>
                        <option value="PY">PY</option>
                        <option value="BOTH">CY &amp; PY</option>
                      </select>
                      <ChevronDown className="w-2.5 h-2.5 text-[#6D28D9] absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between gap-1">
                    <div className="text-xs font-bold text-[#4C1D95] uppercase tracking-wider">
                      Net Profit After Tax
                    </div>
                    <span className="text-[10px] font-extrabold text-[#6D28D9]">
                      {mode === 'PY' ? `(PY ${pyLabel})` : mode === 'BOTH' ? '(CY vs PY)' : `(CY ${cyLabel})`}
                    </span>
                  </div>

                  {mode === 'BOTH' ? (
                    <div className="mt-2 grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-white/70 border border-[#E9D5FF]">
                      <div>
                        <div className="text-[10px] font-extrabold text-[#4C1D95] uppercase">
                          CY ({cyLabel})
                        </div>
                        <div className="text-sm font-black text-[#7C3AED] font-mono tabular-nums mt-0.5 truncate">
                          ₹{formatINR(netProfit)}
                        </div>
                        <div className="text-[10px] text-[#6D28D9] mt-0.5 truncate">
                          PBT: ₹{formatINR(profitBeforeTax)}
                        </div>
                      </div>
                      <div className="border-l border-[#E9D5FF] pl-2">
                        <div className="text-[10px] font-extrabold text-amber-800 uppercase">
                          PY ({pyLabel})
                        </div>
                        <div className="text-sm font-black text-slate-800 font-mono tabular-nums mt-0.5 truncate">
                          ₹{formatINR(pyNetProfit)}
                        </div>
                        <div className="text-[10px] text-slate-600 mt-0.5 truncate">
                          PY PBT: ₹{formatINR(pyProfitBeforeTax)}
                        </div>
                      </div>
                    </div>
                  ) : mode === 'PY' ? (
                    <>
                      <div className="text-2xl font-black text-[#7C3AED] font-mono tabular-nums tracking-tight mt-1">
                        ₹{formatINR(pyNetProfit)}
                      </div>
                      <div className="text-xs font-medium text-[#6D28D9] mt-2.5 flex items-center justify-between gap-2 flex-wrap">
                        <span>PY PBT: ₹{formatINR(pyProfitBeforeTax)}</span>
                        <span className="opacity-80">CY: ₹{formatINR(netProfit)}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-2xl font-black text-[#7C3AED] font-mono tabular-nums tracking-tight mt-1">
                        ₹{formatINR(netProfit)}
                      </div>
                      <div className="text-xs font-medium text-[#6D28D9] mt-2.5 flex items-center justify-between gap-2 flex-wrap">
                        <span>PBT: ₹{formatINR(profitBeforeTax)}</span>
                        <span className="opacity-75">PY: ₹{formatINR(pyNetProfit)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. TWO-COLUMN WORKSPACE: 5-STEP FLOW (LEFT) + KEY SCHEDULES (RIGHT) */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (5 cols): 5-Step Guided Workflow */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900">
                5-Step Guided Workflow
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Follow each step to prepare and export statutory statements
              </p>
            </div>
            <button
              type="button"
              onClick={onTriggerAIMap}
              className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Auto-Map</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {[
              {
                step: 1 as const,
                title: 'Current Year Trial Balance',
                subtitle: hasData
                  ? `${mappedCount}/${mappedLedgers.length} ledgers mapped • Dr: ₹${formatINR(totalDebit)}`
                  : 'Upload Excel/CSV Trial Balance & map to ICAI notes',
                done: hasData && unmappedCount === 0 && isTallyBalanced,
              },
              {
                step: 2 as const,
                title: 'Previous Year Comparative TB',
                subtitle:
                  pyMappedLedgers.length > 0
                    ? `${pyMappedLedgers.length} prior year ledgers mapped (FY ${config.previousFinancialYear || '2024-25'})`
                    : 'Optional: Upload prior period TB for comparative figures',
                done: pyMappedLedgers.length > 0,
              },
              {
                step: 3 as const,
                title: 'Balance Sheet & Profit & Loss',
                subtitle: `Review comparative ICAI statements & Section 40(b) remuneration`,
                done: hasData && bs.isBalanced,
              },
              {
                step: 4 as const,
                title: 'Notes 1 to 25 & Audit Checks',
                subtitle:
                  allExceptions.length > 0
                    ? `${allExceptions.length} audit flags to review • PPE, Capital & MSME schedules`
                    : 'All 25 ICAI schedules & accounting policies verified',
                done: hasData && allExceptions.length === 0,
              },
              {
                step: 5 as const,
                title: 'Export Excel, PDF & Cloud Backup',
                subtitle: 'Download formatted multi-sheet Excel (.xlsx), PDF or sync Drive',
                done: false,
              },
            ].map((item) => (
              <button
                key={item.step}
                type="button"
                onClick={() => onNavigateToStep(item.step)}
                className="w-full text-left p-3.5 rounded-2xl border border-slate-200/80 hover:border-indigo-300 hover:bg-indigo-50/30 transition flex items-center justify-between gap-3 group cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                      item.done
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-700 group-hover:bg-indigo-600 group-hover:text-white transition'
                    }`}
                  >
                    {item.done ? <CheckCircle2 className="w-4 h-4" /> : item.step}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-slate-900 group-hover:text-indigo-950 truncate">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {item.subtitle}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN (7 cols): Key ICAI Schedules & Adjustments (2x3 Clean Grid) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-slate-900">
                Key Statutory Schedules &amp; Adjustments
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Click any schedule card to view or edit its underlying breakdown
              </p>
            </div>

            {/* Global CY / PY / Comparative Dropdown Selector */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative flex items-center">
                <Calendar className="w-3.5 h-3.5 text-indigo-600 absolute left-3 pointer-events-none" />
                <select
                  value={schedulePeriodView}
                  onChange={(e) =>
                    handleGlobalSchedulePeriodChange(e.target.value as 'CY' | 'PY' | 'BOTH')
                  }
                  aria-label="Select Current Year or Previous Year Schedule Details"
                  className="pl-8 pr-8 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs font-extrabold shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer appearance-none transition"
                >
                  <option value="CY">Current Year (CY • FY {cyLabel})</option>
                  <option value="PY">Previous Year (PY • FY {pyLabel})</option>
                  <option value="BOTH">Comparative (CY &amp; PY Details)</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Owners' / Partners' Capital */}
            {(() => {
              const mode = getCardPeriodMode('owners');
              return (
                <div
                  onClick={() => onNavigateToStep(4, 3)}
                  className="p-4 rounded-2xl border border-slate-200/80 hover:border-indigo-300 hover:shadow-xs transition cursor-pointer flex flex-col justify-between gap-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                          Owners&apos; / Partners&apos; Funds (Notes 3 &amp; 4)
                        </div>
                      </div>

                      {mode === 'BOTH' ? (
                        <div className="mt-2 grid grid-cols-2 gap-2 p-2 rounded-xl bg-indigo-50/50 border border-indigo-100">
                          <div>
                            <div className="text-[10px] font-bold text-indigo-700 uppercase">
                              CY (FY {cyLabel})
                            </div>
                            <div className="text-sm font-black text-slate-900 font-mono tabular-nums mt-0.5">
                              ₹{formatINR(ownersFunds)}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                              Cap: ₹{formatINR(ownersCapitalCY)} | Res: ₹{formatINR(reservesAndSurplusCY)}
                            </div>
                          </div>
                          <div className="border-l border-indigo-200/70 pl-2">
                            <div className="text-[10px] font-bold text-amber-700 uppercase">
                              PY (FY {pyLabel})
                            </div>
                            <div className="text-sm font-black text-slate-800 font-mono tabular-nums mt-0.5">
                              ₹{formatINR(pyOwnersFunds)}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                              Cap: ₹{formatINR(ownersCapitalPY)} | Res: ₹{formatINR(reservesAndSurplusPY)}
                            </div>
                          </div>
                        </div>
                      ) : mode === 'PY' ? (
                        <>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-lg font-black text-slate-900 font-mono tabular-nums truncate">
                              ₹{formatINR(pyOwnersFunds)}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-black uppercase shrink-0">
                              PY {pyLabel}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                            N.3 Cap: ₹{formatINR(ownersCapitalPY)} • N.4 Res: ₹{formatINR(reservesAndSurplusPY)}
                          </div>
                          <div className="text-[11px] text-indigo-600 font-semibold mt-1 truncate">
                            CY: ₹{formatINR(ownersFunds)} • Open Partner Capital →
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-lg font-black text-slate-900 font-mono tabular-nums truncate">
                              ₹{formatINR(ownersFunds)}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase shrink-0">
                              CY {cyLabel}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                            PY: ₹{formatINR(pyOwnersFunds)} • N.3 Cap: ₹{formatINR(ownersCapitalCY)}
                          </div>
                          <div className="text-[11px] text-indigo-600 font-semibold mt-1 truncate">
                            Open Partner Capital Schedule →
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="relative"
                      >
                        <select
                          value={mode}
                          onChange={(e) =>
                            setCardPeriodOverrides((prev) => ({
                              ...prev,
                              owners: e.target.value as 'CY' | 'PY' | 'BOTH',
                            }))
                          }
                          aria-label="Owners Funds Period"
                          className="pl-2 pr-5 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-[10px] font-extrabold border border-slate-200 cursor-pointer appearance-none focus:outline-none"
                        >
                          <option value="CY">CY</option>
                          <option value="PY">PY</option>
                          <option value="BOTH">CY &amp; PY</option>
                        </select>
                        <ChevronDown className="w-2.5 h-2.5 text-slate-500 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <Wallet className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 2. Closing Stock / Inventories */}
            {(() => {
              const mode = getCardPeriodMode('stock');
              return (
                <div
                  onClick={() => onOpenYearEndAdjustments(mode === 'PY' ? 'PY' : 'CY')}
                  className="p-4 rounded-2xl border border-slate-200/80 hover:border-purple-300 hover:shadow-xs transition cursor-pointer flex flex-col justify-between gap-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                        Closing Stock / Inventories (Note 15)
                      </div>

                      {mode === 'BOTH' ? (
                        <div className="mt-2 grid grid-cols-2 gap-2 p-2 rounded-xl bg-purple-50/50 border border-purple-100">
                          <div>
                            <div className="text-[10px] font-bold text-purple-700 uppercase">
                              CY (FY {cyLabel})
                            </div>
                            <div className="text-sm font-black text-slate-900 font-mono tabular-nums mt-0.5">
                              ₹{formatINR(inventories)}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                              COGS (N.21): ₹{formatINR(cogs)}
                            </div>
                          </div>
                          <div className="border-l border-purple-200/70 pl-2">
                            <div className="text-[10px] font-bold text-amber-700 uppercase">
                              PY (FY {pyLabel})
                            </div>
                            <div className="text-sm font-black text-slate-800 font-mono tabular-nums mt-0.5">
                              ₹{formatINR(pyInventories)}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                              PY COGS: ₹{formatINR(pyCogs)}
                            </div>
                          </div>
                        </div>
                      ) : mode === 'PY' ? (
                        <>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-lg font-black text-slate-900 font-mono tabular-nums truncate">
                              ₹{formatINR(pyInventories)}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-black uppercase shrink-0">
                              PY {pyLabel}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                            CY Stock: ₹{formatINR(inventories)} • PY COGS: ₹{formatINR(pyCogs)}
                          </div>
                          <div className="text-[11px] text-purple-600 font-semibold mt-1 truncate">
                            Edit PY Closing Stock &amp; Adjustments →
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-lg font-black text-slate-900 font-mono tabular-nums truncate">
                              ₹{formatINR(inventories)}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-[9px] font-black uppercase shrink-0">
                              CY {cyLabel}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                            PY: ₹{formatINR(pyInventories)} • COGS (N.21): ₹{formatINR(cogs)}
                          </div>
                          <div className="text-[11px] text-purple-600 font-semibold mt-1 truncate">
                            Edit Closing Stock &amp; Adjustments →
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="relative"
                      >
                        <select
                          value={mode}
                          onChange={(e) =>
                            setCardPeriodOverrides((prev) => ({
                              ...prev,
                              stock: e.target.value as 'CY' | 'PY' | 'BOTH',
                            }))
                          }
                          aria-label="Closing Stock Period"
                          className="pl-2 pr-5 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-[10px] font-extrabold border border-slate-200 cursor-pointer appearance-none focus:outline-none"
                        >
                          <option value="CY">CY</option>
                          <option value="PY">PY</option>
                          <option value="BOTH">CY &amp; PY</option>
                        </select>
                        <ChevronDown className="w-2.5 h-2.5 text-slate-500 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 3. Trade Receivables */}
            {(() => {
              const mode = getCardPeriodMode('receivables');
              return (
                <div
                  onClick={() => onNavigateToStep(4, 16)}
                  className="p-4 rounded-2xl border border-slate-200/80 hover:border-emerald-300 hover:shadow-xs transition cursor-pointer flex flex-col justify-between gap-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                        Trade Receivables / Debtors (Note 16)
                      </div>

                      {mode === 'BOTH' ? (
                        <div className="mt-2 grid grid-cols-2 gap-2 p-2 rounded-xl bg-emerald-50/50 border border-emerald-100">
                          <div>
                            <div className="text-[10px] font-bold text-emerald-700 uppercase">
                              CY (FY {cyLabel})
                            </div>
                            <div className="text-sm font-black text-slate-900 font-mono tabular-nums mt-0.5">
                              ₹{formatINR(tradeReceivables)}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                              Sales (N.19): ₹{formatINR(revenueFromOps)}
                            </div>
                          </div>
                          <div className="border-l border-emerald-200/70 pl-2">
                            <div className="text-[10px] font-bold text-amber-700 uppercase">
                              PY (FY {pyLabel})
                            </div>
                            <div className="text-sm font-black text-slate-800 font-mono tabular-nums mt-0.5">
                              ₹{formatINR(pyTradeReceivables)}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                              PY Sales: ₹{formatINR(pyRevenue)}
                            </div>
                          </div>
                        </div>
                      ) : mode === 'PY' ? (
                        <>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-lg font-black text-slate-900 font-mono tabular-nums truncate">
                              ₹{formatINR(pyTradeReceivables)}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-black uppercase shrink-0">
                              PY {pyLabel}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                            CY Debtors: ₹{formatINR(tradeReceivables)}
                          </div>
                          <div className="text-[11px] text-emerald-600 font-semibold mt-1 truncate">
                            PY Sales: ₹{formatINR(pyRevenue)} • View Note 16 →
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-lg font-black text-slate-900 font-mono tabular-nums truncate">
                              ₹{formatINR(tradeReceivables)}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase shrink-0">
                              CY {cyLabel}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                            PY: ₹{formatINR(pyTradeReceivables)}
                          </div>
                          <div className="text-[11px] text-emerald-600 font-semibold mt-1 truncate">
                            View Note 16 Schedule →
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="relative"
                      >
                        <select
                          value={mode}
                          onChange={(e) =>
                            setCardPeriodOverrides((prev) => ({
                              ...prev,
                              receivables: e.target.value as 'CY' | 'PY' | 'BOTH',
                            }))
                          }
                          aria-label="Trade Receivables Period"
                          className="pl-2 pr-5 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-[10px] font-extrabold border border-slate-200 cursor-pointer appearance-none focus:outline-none"
                        >
                          <option value="CY">CY</option>
                          <option value="PY">PY</option>
                          <option value="BOTH">CY &amp; PY</option>
                        </select>
                        <ChevronDown className="w-2.5 h-2.5 text-slate-500 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <ArrowDownLeft className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 4. Trade Payables & MSME */}
            {(() => {
              const mode = getCardPeriodMode('payables');
              return (
                <div
                  onClick={onOpenTradePayables}
                  className="p-4 rounded-2xl border border-slate-200/80 hover:border-amber-300 hover:shadow-xs transition cursor-pointer flex flex-col justify-between gap-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                        Trade Payables &amp; MSME (Note 9)
                      </div>

                      {mode === 'BOTH' ? (
                        <div className="mt-2 grid grid-cols-2 gap-2 p-2 rounded-xl bg-amber-50/60 border border-amber-100">
                          <div>
                            <div className="text-[10px] font-bold text-amber-800 uppercase">
                              CY (FY {cyLabel})
                            </div>
                            <div className="text-sm font-black text-slate-900 font-mono tabular-nums mt-0.5">
                              ₹{formatINR(tradePayables)}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                              MSME: ₹{formatINR(tradePayablesMsme)}
                            </div>
                          </div>
                          <div className="border-l border-amber-200/70 pl-2">
                            <div className="text-[10px] font-bold text-amber-700 uppercase">
                              PY (FY {pyLabel})
                            </div>
                            <div className="text-sm font-black text-slate-800 font-mono tabular-nums mt-0.5">
                              ₹{formatINR(pyTradePayables)}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                              PY MSME: ₹{formatINR(pyTradePayablesMsme)}
                            </div>
                          </div>
                        </div>
                      ) : mode === 'PY' ? (
                        <>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-lg font-black text-slate-900 font-mono tabular-nums truncate">
                              ₹{formatINR(pyTradePayables)}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-black uppercase shrink-0">
                              PY {pyLabel}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                            CY Payables: ₹{formatINR(tradePayables)}
                          </div>
                          <div className="text-[11px] text-amber-700 font-semibold mt-1 truncate">
                            PY MSME: ₹{formatINR(pyTradePayablesMsme)} • Edit Aging →
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-lg font-black text-slate-900 font-mono tabular-nums truncate">
                              ₹{formatINR(tradePayables)}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[9px] font-black uppercase shrink-0">
                              CY {cyLabel}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                            PY: ₹{formatINR(pyTradePayables)} • MSME: ₹{formatINR(tradePayablesMsme)}
                          </div>
                          <div className="text-[11px] text-amber-700 font-semibold mt-1 truncate">
                            Edit MSME &amp; Creditor Aging →
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="relative"
                      >
                        <select
                          value={mode}
                          onChange={(e) =>
                            setCardPeriodOverrides((prev) => ({
                              ...prev,
                              payables: e.target.value as 'CY' | 'PY' | 'BOTH',
                            }))
                          }
                          aria-label="Trade Payables Period"
                          className="pl-2 pr-5 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-[10px] font-extrabold border border-slate-200 cursor-pointer appearance-none focus:outline-none"
                        >
                          <option value="CY">CY</option>
                          <option value="PY">PY</option>
                          <option value="BOTH">CY &amp; PY</option>
                        </select>
                        <ChevronDown className="w-2.5 h-2.5 text-slate-500 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <ArrowUpRight className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 5. PPE & Fixed Assets */}
            {(() => {
              const mode = getCardPeriodMode('ppe');
              return (
                <div
                  onClick={() => onNavigateToStep(4, 11)}
                  className="p-4 rounded-2xl border border-slate-200/80 hover:border-blue-300 hover:shadow-xs transition cursor-pointer flex flex-col justify-between gap-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                        Fixed Assets / PPE Net Block (Note 11)
                      </div>

                      {mode === 'BOTH' ? (
                        <div className="mt-2 grid grid-cols-2 gap-2 p-2 rounded-xl bg-blue-50/50 border border-blue-100">
                          <div>
                            <div className="text-[10px] font-bold text-blue-700 uppercase">
                              CY (FY {cyLabel})
                            </div>
                            <div className="text-sm font-black text-slate-900 font-mono tabular-nums mt-0.5">
                              ₹{formatINR(ppeNetBlock)}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                              Dep (N.24): ₹{formatINR(depreciationExpense)}
                            </div>
                          </div>
                          <div className="border-l border-blue-200/70 pl-2">
                            <div className="text-[10px] font-bold text-amber-700 uppercase">
                              PY (FY {pyLabel})
                            </div>
                            <div className="text-sm font-black text-slate-800 font-mono tabular-nums mt-0.5">
                              ₹{formatINR(pyPpeNetBlock)}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                              PY Dep: ₹{formatINR(pyDepreciationExpense)}
                            </div>
                          </div>
                        </div>
                      ) : mode === 'PY' ? (
                        <>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-lg font-black text-slate-900 font-mono tabular-nums truncate">
                              ₹{formatINR(pyPpeNetBlock)}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-black uppercase shrink-0">
                              PY {pyLabel}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                            CY Net Block: ₹{formatINR(ppeNetBlock)}
                          </div>
                          <div className="text-[11px] text-blue-600 font-semibold mt-1 truncate">
                            PY Depreciation (N.24): ₹{formatINR(pyDepreciationExpense)} →
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-lg font-black text-slate-900 font-mono tabular-nums truncate">
                              ₹{formatINR(ppeNetBlock)}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[9px] font-black uppercase shrink-0">
                              CY {cyLabel}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                            PY: ₹{formatINR(pyPpeNetBlock)}
                          </div>
                          <div className="text-[11px] text-blue-600 font-semibold mt-1 truncate">
                            Depreciation (N.24): ₹{formatINR(depreciationExpense)} →
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="relative"
                      >
                        <select
                          value={mode}
                          onChange={(e) =>
                            setCardPeriodOverrides((prev) => ({
                              ...prev,
                              ppe: e.target.value as 'CY' | 'PY' | 'BOTH',
                            }))
                          }
                          aria-label="Fixed Assets Period"
                          className="pl-2 pr-5 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-[10px] font-extrabold border border-slate-200 cursor-pointer appearance-none focus:outline-none"
                        >
                          <option value="CY">CY</option>
                          <option value="PY">PY</option>
                          <option value="BOTH">CY &amp; PY</option>
                        </select>
                        <ChevronDown className="w-2.5 h-2.5 text-slate-500 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Briefcase className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 6. Cash, Bank & Borrowings */}
            {(() => {
              const mode = getCardPeriodMode('cash');
              return (
                <div
                  onClick={() => onNavigateToStep(4, 17)}
                  className="p-4 rounded-2xl border border-slate-200/80 hover:border-teal-300 hover:shadow-xs transition cursor-pointer flex flex-col justify-between gap-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                        Cash &amp; Bank Balances (Note 17)
                      </div>

                      {mode === 'BOTH' ? (
                        <div className="mt-2 grid grid-cols-2 gap-2 p-2 rounded-xl bg-teal-50/50 border border-teal-100">
                          <div>
                            <div className="text-[10px] font-bold text-teal-700 uppercase">
                              CY (FY {cyLabel})
                            </div>
                            <div className="text-sm font-black text-slate-900 font-mono tabular-nums mt-0.5">
                              ₹{formatINR(cashAndBank)}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                              Loans (N.5): ₹{formatINR(totalBorrowings)}
                            </div>
                          </div>
                          <div className="border-l border-teal-200/70 pl-2">
                            <div className="text-[10px] font-bold text-amber-700 uppercase">
                              PY (FY {pyLabel})
                            </div>
                            <div className="text-sm font-black text-slate-800 font-mono tabular-nums mt-0.5">
                              ₹{formatINR(pyCashAndBank)}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                              PY Loans: ₹{formatINR(pyTotalBorrowings)}
                            </div>
                          </div>
                        </div>
                      ) : mode === 'PY' ? (
                        <>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-lg font-black text-slate-900 font-mono tabular-nums truncate">
                              ₹{formatINR(pyCashAndBank)}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-black uppercase shrink-0">
                              PY {pyLabel}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                            CY Cash &amp; Bank: ₹{formatINR(cashAndBank)}
                          </div>
                          <div className="text-[11px] text-teal-700 font-semibold mt-1 truncate">
                            PY Borrowings (N.5): ₹{formatINR(pyTotalBorrowings)} →
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-lg font-black text-slate-900 font-mono tabular-nums truncate">
                              ₹{formatINR(cashAndBank)}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 text-[9px] font-black uppercase shrink-0">
                              CY {cyLabel}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                            PY: ₹{formatINR(pyCashAndBank)}
                          </div>
                          <div className="text-[11px] text-teal-700 font-semibold mt-1 truncate">
                            Borrowings (N.5): ₹{formatINR(totalBorrowings)} →
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="relative"
                      >
                        <select
                          value={mode}
                          onChange={(e) =>
                            setCardPeriodOverrides((prev) => ({
                              ...prev,
                              cash: e.target.value as 'CY' | 'PY' | 'BOTH',
                            }))
                          }
                          aria-label="Cash and Bank Period"
                          className="pl-2 pr-5 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-[10px] font-extrabold border border-slate-200 cursor-pointer appearance-none focus:outline-none"
                        >
                          <option value="CY">CY</option>
                          <option value="PY">PY</option>
                          <option value="BOTH">CY &amp; PY</option>
                        </select>
                        <ChevronDown className="w-2.5 h-2.5 text-slate-500 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                        <Landmark className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};
