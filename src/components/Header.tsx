import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Sparkles,
  Building2,
  Printer,
  ChevronDown,
  Plus,
  Layers,
  Settings,
  Check,
  Calendar,
  Box,
  Mail,
  HardDrive,
  Database,
  User as UserIcon,
  LogIn,
  LogOut,
  Zap,
  CreditCard,
  Gift,
  Cloud,
  RefreshCw,
  Scale,
  Rewind,
  FastForward,
  BookOpen,
  Bot,
  Search,
  Globe,
  Monitor,
  Bell,
  ArrowRight,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import { EntityConfig, Company, UserProfile } from '../types';
import {
  POPULAR_INDIAN_FY_PRESETS,
  rollForwardOneYear,
  rollBackOneYear,
} from '../utils/financialYearUtils';
import { NCE_NOTE_DEFINITIONS } from '../data/nceTaxonomy';

interface HeaderProps {
  config: EntityConfig;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isTallyBalanced: boolean;
  tallyDifference: number;
  isBSBalanced: boolean;
  bsDifference: number;
  exceptionCount: number;
  onExportExcel: () => void;
  onOpenConfig: () => void;
  onTriggerAIMap: () => void;
  isAIMapping: boolean;
  companies: Company[];
  activeCompanyId: string;
  onSelectCompany: (companyId: string) => void;
  onOpenCompanyManager: (tab?: 'list' | 'add' | 'edit') => void;
  onOpenYearModal?: () => void;
  onUpdateConfig?: (updated: EntityConfig) => void;
  onOpenYearEndAdjustments?: (target?: 'CY' | 'PY') => void;
  onOpenBackupRestore?: () => void;
  user?: User | null;
  accessToken?: string | null;
  onConnectGmail?: () => void;
  currentUser?: UserProfile | null;
  onOpenAuthModal?: (tab?: 'signin' | 'register') => void;
  onOpenSubscriptionModal?: () => void;
  onOpenUserProfileModal?: () => void;
  onOpenReferralModal?: () => void;
  onLogout?: () => void;
  dashboardView?: 'home' | 'companies' | 'workspace';
  onDashboardViewChange?: (view: 'home' | 'companies' | 'workspace') => void;
  workspaceStep?: 1 | 2 | 3 | 4 | 5;
  onWorkspaceStepChange?: (step: 1 | 2 | 3 | 4 | 5, noteNum?: number) => void;
  driveSyncStatus?: 'idle' | 'syncing' | 'synced' | 'error';
  lastDriveSyncTime?: Date | null;
  onManualDriveSync?: () => void;
  onConnectDrive?: () => void;
  onExportTotalLocalBackup?: () => void;
  onExportSingleCompanyBackup?: (companyId?: string) => void;
  onOpenTermsModal?: () => void;
  onOpenUserManual?: () => void;
  onOpenAICopilot?: (prompt?: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  activeTab,
  setActiveTab,
  isTallyBalanced,
  tallyDifference,
  isBSBalanced,
  bsDifference,
  exceptionCount,
  onExportExcel,
  onOpenConfig,
  onTriggerAIMap,
  isAIMapping,
  companies,
  activeCompanyId,
  onSelectCompany,
  onOpenCompanyManager,
  onOpenYearModal,
  onUpdateConfig,
  onOpenYearEndAdjustments,
  onOpenBackupRestore,
  user,
  accessToken,
  onConnectGmail,
  currentUser,
  onOpenAuthModal,
  onOpenSubscriptionModal,
  onOpenUserProfileModal,
  onOpenReferralModal,
  onLogout,
  dashboardView = 'home',
  onDashboardViewChange,
  workspaceStep = 1,
  onWorkspaceStepChange,
  driveSyncStatus = 'idle',
  lastDriveSyncTime,
  onManualDriveSync,
  onConnectDrive,
  onExportTotalLocalBackup,
  onExportSingleCompanyBackup,
  onOpenTermsModal,
  onOpenUserManual,
  onOpenAICopilot,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const yearDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredDropdownCompanies = useMemo(() => {
    const q = companySearchQuery.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) => {
      const name = (c.config.entityName || '').toLowerCase();
      const pan = (c.config.pan || '').toLowerCase();
      const gstin = (c.config.gstin || '').toLowerCase();
      const fy = (c.config.financialYear || '').toLowerCase();
      const type = (c.config.entityType || '').toLowerCase();
      return (
        name.includes(q) ||
        pan.includes(q) ||
        gstin.includes(q) ||
        fy.includes(q) ||
        type.includes(q)
      );
    });
  }, [companies, companySearchQuery]);

  // Alt + G keyboard shortcut for Go To Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'g' || e.key === 'G')) {
        e.preventDefault();
        setIsSearchOpen(true);
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target as Node)) {
        setIsYearDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setIsToolsMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Quick Go-To Search items
  const goToItems = useMemo(() => {
    const companyItems = companies.map((c) => ({
      id: `comp-${c.id}`,
      title: `Company: ${c.config.entityName} (FY ${c.config.financialYear})`,
      category: c.id === activeCompanyId ? 'Active Company' : 'Switch Company',
      searchMeta: `${c.config.entityName} ${c.config.pan || ''} ${c.config.gstin || ''} ${c.config.financialYear} ${c.config.entityType}`.toLowerCase(),
      action: () => {
        onSelectCompany(c.id);
        onDashboardViewChange?.('home');
      },
    }));

    const base = [
      {
        id: 'nav-home',
        title: 'Home Executive Dashboard',
        category: 'Navigation',
        searchMeta: 'home dashboard overview',
        action: () => onDashboardViewChange?.('home'),
      },
      {
        id: 'nav-step1',
        title: 'Step 1: Current Year Trial Balance & Mapping',
        category: 'Workspace',
        searchMeta: 'step 1 trial balance cy ledgers',
        action: () => onWorkspaceStepChange?.(1),
      },
      {
        id: 'nav-step2',
        title: 'Step 2: Previous Year Trial Balance',
        category: 'Workspace',
        searchMeta: 'step 2 previous year comparative tb',
        action: () => onWorkspaceStepChange?.(2),
      },
      {
        id: 'nav-step3',
        title: 'Step 3: Comparative Balance Sheet & Profit & Loss',
        category: 'Statements',
        searchMeta: 'step 3 balance sheet profit and loss p&l',
        action: () => onWorkspaceStepChange?.(3),
      },
      {
        id: 'nav-step4',
        title: 'Step 4: ICAI Notes 1 to 25 & Audit Exceptions',
        category: 'Schedules',
        searchMeta: 'step 4 notes schedules exceptions',
        action: () => onWorkspaceStepChange?.(4),
      },
      {
        id: 'nav-step5',
        title: 'Step 5: Statutory Excel, PDF, Drive & Gmail Export',
        category: 'Reports',
        searchMeta: 'step 5 export excel pdf drive gmail',
        action: () => onWorkspaceStepChange?.(5),
      },
      {
        id: 'nav-companies',
        title: 'Saved Client Companies & Entities',
        category: 'Clients',
        searchMeta: 'companies clients entities switch add',
        action: () => onDashboardViewChange?.('companies'),
      },
      {
        id: 'act-adj',
        title: 'Closing Stock Valuation & Year-End Adjustments',
        category: 'Action',
        searchMeta: 'closing stock inventory adjustments depreciation tax',
        action: () => onOpenYearEndAdjustments?.('CY'),
      },
      {
        id: 'act-ai',
        title: 'Launch Smart AI Schedule Mapping Agent',
        category: 'AI Tool',
        searchMeta: 'ai auto map schedule mapping',
        action: () => onTriggerAIMap(),
      },
      {
        id: 'act-copilot',
        title: 'Open AI CA Copilot Assistant',
        category: 'AI Tool',
        searchMeta: 'copilot chat assistant',
        action: () => onOpenAICopilot?.(),
      },
      {
        id: 'act-excel',
        title: 'Export Statutory Excel Workbook (.xlsx)',
        category: 'Export',
        searchMeta: 'export download excel xlsx',
        action: () => onExportExcel(),
      },
      {
        id: 'act-backup',
        title: 'Backup & Restore Hub (Google Drive & Local JSON)',
        category: 'Cloud',
        searchMeta: 'backup restore drive json',
        action: () => onOpenBackupRestore?.(),
      },
    ];

    const noteItems = NCE_NOTE_DEFINITIONS.map((n) => ({
      id: `note-${n.noteNumber}`,
      title: `Note ${n.noteNumber}: ${n.name}`,
      category: n.statement === 'BalanceSheet' ? 'BS Schedule' : 'P&L Schedule',
      searchMeta: `note ${n.noteNumber} ${n.name} ${n.description}`.toLowerCase(),
      action: () => onWorkspaceStepChange?.(4, n.noteNumber),
    }));

    const all = [...companyItems, ...base, ...noteItems];
    if (!searchQuery.trim()) return all.slice(0, 10);
    const q = searchQuery.toLowerCase();
    return all
      .filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.searchMeta.includes(q)
      )
      .slice(0, 12);
  }, [
    companies,
    activeCompanyId,
    onSelectCompany,
    searchQuery,
    onDashboardViewChange,
    onWorkspaceStepChange,
    onOpenYearEndAdjustments,
    onTriggerAIMap,
    onOpenAICopilot,
    onExportExcel,
    onOpenBackupRestore,
  ]);

  const isSignedIn = Boolean((currentUser && currentUser.id !== 'guest_ca') || user);

  const displayUserName =
    currentUser && currentUser.id !== 'guest_ca'
      ? currentUser.fullName
      : currentUser && currentUser.id === 'guest_ca'
      ? (currentUser.fullName || 'Guest CA')
      : user?.displayName || 'Not Signed In';

  const displayUserEmail =
    currentUser && currentUser.id !== 'guest_ca'
      ? currentUser.email
      : currentUser && currentUser.id === 'guest_ca'
      ? (currentUser.email || 'Guest Mode (Local Only)')
      : user?.email || 'Click to Sign In / Guest';

  const userInitial = currentUser
    ? (displayUserName || 'G').trim().charAt(0).toUpperCase()
    : '?';

  return (
    <header className="bg-white text-slate-900 border-b border-slate-200/90 sticky top-0 z-30 h-16 px-4 sm:px-6 flex items-center justify-between gap-3 print:hidden">
      {/* =================================================================== */}
      {/* LEFT ZONE: Entity Selector + FY Selector + Plan/Credits Pill        */}
      {/* =================================================================== */}
      <div className="flex items-center gap-2.5 min-w-0 shrink-0">
        {/* 1. Company Switcher Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-extrabold border border-slate-200/90 shadow-2xs transition cursor-pointer whitespace-nowrap"
            title="Switch active company or manage client entities"
          >
            <Building2 className="w-4 h-4 text-slate-600 shrink-0" />
            <span className="max-w-[130px] sm:max-w-[180px] truncate uppercase tracking-tight">
              {config.entityName || 'Viva Group'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {isDropdownOpen && (
            <div className="absolute left-0 mt-2 w-80 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                  Select Active Entity
                </span>
                <span className="text-[10px] text-slate-400">
                  {companies.length} {companies.length === 1 ? 'Entity' : 'Entities'}
                </span>
              </div>

              {/* Search Input inside Company Switcher Dropdown */}
              <div className="p-2 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 focus-within:border-indigo-500">
                  <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={companySearchQuery}
                    onChange={(e) => setCompanySearchQuery(e.target.value)}
                    placeholder="Search company by name, PAN, GSTIN, FY..."
                    className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                {filteredDropdownCompanies.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No company found matching &ldquo;{companySearchQuery}&rdquo;
                  </div>
                ) : (
                  filteredDropdownCompanies.map((company) => {
                    const isSelected = company.id === activeCompanyId;
                    return (
                      <button
                        key={company.id}
                        type="button"
                        onClick={() => {
                          onSelectCompany(company.id);
                          setIsDropdownOpen(false);
                          setCompanySearchQuery('');
                        }}
                        className={`w-full text-left px-4 py-2.5 transition flex items-center justify-between gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50/80 text-indigo-950 font-bold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold truncate flex items-center gap-1.5">
                            <span className="truncate">{company.config.entityName}</span>
                            {isSelected && (
                              <span className="shrink-0 p-0.5 rounded-full bg-indigo-600 text-white">
                                <Check className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span>{company.config.entityType}</span>
                            <span>•</span>
                            <span>FY {company.config.financialYear}</span>
                            <span>•</span>
                            <span>{company.mappedLedgers?.length || 0} ledgers</span>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="p-2 bg-slate-50 border-t border-slate-200 flex flex-col gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onOpenConfig();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-200/70 text-slate-700 text-left transition font-medium cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-500" />
                  <span>Edit Parameters &amp; Audit Rules</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onOpenCompanyManager('add');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-left transition font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Add New Company / Entity</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onOpenCompanyManager('list');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-200/70 text-slate-700 text-left transition font-medium cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  <span>Manage All Companies</span>
                </button>

                {onOpenBackupRestore && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onOpenBackupRestore();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-200/70 text-slate-700 text-left transition font-medium cursor-pointer"
                  >
                    <Database className="w-3.5 h-3.5 text-slate-500" />
                    <span>Single &amp; Total Backup / Restore Hub</span>
                  </button>
                )}

                {onExportSingleCompanyBackup && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onExportSingleCompanyBackup(activeCompanyId);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-emerald-50 text-emerald-900 text-left transition font-semibold cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Single File Backup ({config.entityName || 'Active File'})</span>
                  </button>
                )}

                {onExportTotalLocalBackup && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onExportTotalLocalBackup();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-emerald-50 text-emerald-900 text-left transition font-semibold cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Total Local Backup (All {companies.length} Files)</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2. Financial Year Selector (Warm Amber Style matching Screenshot) */}
        <div className="relative" ref={yearDropdownRef}>
          <button
            type="button"
            onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#B45309] border border-[#FCD34D] text-xs font-extrabold shadow-2xs transition cursor-pointer whitespace-nowrap"
            title="Select Financial Year (Current Year & Previous Year)"
          >
            <Calendar className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
            <span>F.Y. {config.financialYear}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
          </button>

          {isYearDropdownOpen && (
            <div className="absolute left-0 mt-2 w-80 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 text-xs">
              <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  Select Financial Year (CY / PY)
                </span>
                <span className="text-[10px] text-slate-400">
                  Active: FY {config.financialYear}
                </span>
              </div>

              <div className="p-2 space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Standard Indian FY Presets
                </div>
                {POPULAR_INDIAN_FY_PRESETS.map((p) => {
                  const isSelected = config.financialYear === p.cyYear;
                  return (
                    <button
                      key={p.cyYear}
                      type="button"
                      onClick={() => {
                        if (onUpdateConfig) {
                          onUpdateConfig({
                            ...config,
                            financialYear: p.cyYear,
                            reportingPeriod: p.cyPeriod,
                            previousFinancialYear: p.pyYear,
                            previousReportingPeriod: p.pyPeriod,
                          });
                        }
                        setIsYearDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg transition flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-amber-50 text-amber-950 font-bold border border-amber-300'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5 font-semibold flex-wrap">
                          <span>FY {p.cyYear} (CY)</span>
                          <span className="text-slate-400 font-normal">&amp;</span>
                          <span>FY {p.pyYear} (PY)</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-normal">
                          A.Y. {p.assessmentYear} • As on {p.cyPeriod}
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <div className="p-2 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const rolled = rollBackOneYear(config.financialYear);
                    if (onUpdateConfig) {
                      onUpdateConfig({
                        ...config,
                        financialYear: rolled.newCY,
                        reportingPeriod: rolled.newCYPeriod,
                        previousFinancialYear: rolled.newPY,
                        previousReportingPeriod: rolled.newPYPeriod,
                      });
                    }
                    setIsYearDropdownOpen(false);
                  }}
                  className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-medium transition cursor-pointer"
                >
                  <Rewind className="w-3 h-3 text-slate-500" />
                  <span>Roll Back (-1 Yr)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const rolled = rollForwardOneYear(config.financialYear);
                    if (onUpdateConfig) {
                      onUpdateConfig({
                        ...config,
                        financialYear: rolled.newCY,
                        reportingPeriod: rolled.newCYPeriod,
                        previousFinancialYear: rolled.newPY,
                        previousReportingPeriod: rolled.newPYPeriod,
                      });
                    }
                    setIsYearDropdownOpen(false);
                  }}
                  className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 text-[11px] font-medium transition cursor-pointer"
                >
                  <FastForward className="w-3 h-3 text-amber-600" />
                  <span>Roll Forward (+1 Yr)</span>
                </button>
              </div>

              <div className="p-2 bg-slate-100 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsYearDropdownOpen(false);
                    if (onOpenYearModal) {
                      onOpenYearModal();
                    } else {
                      onOpenConfig();
                    }
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>Customize Years &amp; Dates...</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 3. Credits Badge Button */}
        <button
          type="button"
          onClick={onOpenSubscriptionModal}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-emerald-50/70 text-slate-800 border border-slate-200/90 hover:border-emerald-300 text-xs font-extrabold shadow-2xs transition cursor-pointer whitespace-nowrap"
          title={`Credits • ⚡ ${(currentUser?.credits ?? 555).toLocaleString()} Credits Available (Click to top-up)`}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
          <span>CREDITS</span>
          <span className="px-1.5 py-0.5 rounded-md bg-emerald-100/90 text-emerald-800 text-[11px] font-black font-mono border border-emerald-200/80 flex items-center gap-0.5">
            <span>⚡</span>
            <span>{(currentUser?.credits ?? 555).toLocaleString()}</span>
          </span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* CENTER ZONE: Global `GO TO` Search Input (`Alt + G`)                */}
      {/* =================================================================== */}
      <div className="relative flex-1 max-w-md hidden md:block" ref={searchRef}>
        <div
          onClick={() => {
            setIsSearchOpen(true);
            searchInputRef.current?.focus();
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50/90 hover:bg-slate-100/70 focus-within:bg-white border border-slate-200/90 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 transition cursor-text"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="px-1.5 py-0.5 rounded bg-[#F59E0B] text-white text-[10px] font-black uppercase tracking-wider shrink-0">
            GO TO
          </span>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onFocus={() => setIsSearchOpen(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            placeholder="Search anything..."
            className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none font-medium"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-semibold text-slate-500 whitespace-nowrap shrink-0 shadow-2xs">
            Alt + G
          </kbd>
        </div>

        {/* Search Command Dropdown */}
        {isSearchOpen && (
          <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span>Quick Go-To Navigation &amp; ICAI Schedules</span>
              <span>ESC to close</span>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              {goToItems.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No matching screens or schedules found for &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                goToItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      item.action();
                      setIsSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-indigo-50/70 transition flex items-center justify-between gap-2 cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-950 truncate">
                        {item.title}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 shrink-0">
                      {item.category}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* =================================================================== */}
      {/* RIGHT ZONE: Backup/Restore/Sync + Export App Button + Bell + Profile */}
      {/* =================================================================== */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* 1. Visible Backup, Restore & Cloud Sync Menu */}
        <div className="relative" ref={toolsMenuRef}>
          <button
            type="button"
            onClick={() => setIsToolsMenuOpen(!isToolsMenuOpen)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-extrabold transition cursor-pointer whitespace-nowrap shadow-2xs ${
              accessToken
                ? 'bg-teal-50 hover:bg-teal-100 text-teal-800 border-teal-300'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200/90'
            }`}
            title="Backup, Restore & Google Drive Cloud Sync"
          >
            <Cloud className={`w-3.5 h-3.5 shrink-0 ${accessToken ? 'text-teal-600' : 'text-indigo-600'}`} />
            <span className="hidden sm:inline">
              {accessToken ? 'Cloud Synced' : 'Backup & Sync'}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
          </button>

          {isToolsMenuOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden p-1.5 text-xs space-y-1 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2 bg-slate-900 text-white rounded-xl flex items-center justify-between mb-1">
                <span className="font-bold flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-teal-400" />
                  <span>Backup, Restore &amp; Sync</span>
                </span>
                <span className="text-[10px] text-teal-300 font-semibold">
                  {accessToken ? 'Drive Active' : 'Local Mode'}
                </span>
              </div>

              {onOpenBackupRestore && (
                <button
                  type="button"
                  onClick={() => {
                    setIsToolsMenuOpen(false);
                    onOpenBackupRestore();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-950 font-bold flex items-center gap-2 transition cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5 text-teal-600" />
                  <span>Open Backup &amp; Restore Hub</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsToolsMenuOpen(false);
                  if (accessToken) {
                    onManualDriveSync?.();
                  } else {
                    onConnectDrive?.();
                  }
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-2 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${driveSyncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                <span>{accessToken ? 'Sync Google Drive Now' : 'Connect Google Drive Sync'}</span>
              </button>

              {onExportSingleCompanyBackup && (
                <button
                  type="button"
                  onClick={() => {
                    setIsToolsMenuOpen(false);
                    onExportSingleCompanyBackup(activeCompanyId);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-2 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="truncate">Backup Active Company (.json)</span>
                </button>
              )}

              {onExportTotalLocalBackup && (
                <button
                  type="button"
                  onClick={() => {
                    setIsToolsMenuOpen(false);
                    onExportTotalLocalBackup();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-2 transition cursor-pointer"
                >
                  <HardDrive className="w-3.5 h-3.5 text-amber-600" />
                  <span>Backup All {companies.length} Companies (.json)</span>
                </button>
              )}

              <div className="border-t border-slate-100 my-1" />

              {onOpenAICopilot && (
                <button
                  type="button"
                  onClick={() => {
                    setIsToolsMenuOpen(false);
                    onOpenAICopilot();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-2 transition cursor-pointer"
                >
                  <Bot className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Ask AI CA Copilot</span>
                </button>
              )}

              {onOpenUserManual && (
                <button
                  type="button"
                  onClick={() => {
                    setIsToolsMenuOpen(false);
                    onOpenUserManual();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-2 transition cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                  <span>ICAI NCE User Manual</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsToolsMenuOpen(false);
                  window.print();
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-2 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-teal-600" />
                <span>Print / Save as PDF</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. Green Action Button (`💻 Export Excel` styled like `Desktop App` in screenshot) */}
        <button
          type="button"
          onClick={onExportExcel}
          className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#059669] border border-[#A7F3D0] text-xs font-extrabold shadow-2xs transition cursor-pointer whitespace-nowrap"
          title="Export Statutory Financial Statements & Notes to Excel (.xlsx)"
        >
          <Monitor className="w-3.5 h-3.5 text-[#059669] shrink-0" />
          <span>Export Excel</span>
        </button>

        {/* 3. User Manual & ICAI CA Guide Icon Button */}
        {onOpenUserManual && (
          <button
            type="button"
            onClick={onOpenUserManual}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-700 text-xs font-bold shadow-2xs transition cursor-pointer"
            title="AuditFinancials User Manual & ICAI CA Guide (FY 2025-26)"
          >
            <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="hidden xl:inline text-white font-bold">ICAI Guide</span>
          </button>
        )}

        {/* 4. AI CA Copilot Quick Icon Button */}
        {onOpenAICopilot && (
          <button
            type="button"
            onClick={() => onOpenAICopilot()}
            className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition cursor-pointer"
            title="Ask AI CA Copilot"
          >
            <Bot className="w-4 h-4" />
          </button>
        )}

        {/* 5. Notification / Audit Flags Bell */}
        <button
          type="button"
          onClick={() => {
            if (onWorkspaceStepChange) onWorkspaceStepChange(4);
          }}
          className="relative p-2 rounded-xl hover:bg-slate-100 text-slate-700 transition cursor-pointer"
          title={
            exceptionCount > 0
              ? `${exceptionCount} Audit Exceptions / Flags detected — Click to inspect`
              : 'All statements tallied & verified (0 Audit Flags)'
          }
        >
          <Bell className="w-4 h-4" />
          {exceptionCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
          )}
        </button>

        {/* 4. User Profile Lockup on Right */}
        <div className="relative flex items-center gap-2" ref={userMenuRef}>
          {!isSignedIn && onOpenAuthModal && (
            <button
              type="button"
              onClick={() => onOpenAuthModal('signin')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              title="Sign In or Register CA Account"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-xl hover:bg-slate-100 transition cursor-pointer text-left"
            title="Account Profile, Credits & Settings"
          >
            <div
              className={`w-9 h-9 rounded-full text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0 overflow-hidden ${
                isSignedIn ? 'bg-[#5B4FE9]' : 'bg-slate-500'
              }`}
            >
              {isSignedIn && currentUser?.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={displayUserName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : isSignedIn ? (
                <span>{userInitial}</span>
              ) : (
                <UserIcon className="w-4 h-4 text-white" />
              )}
            </div>

            <div className="hidden md:block min-w-0">
              <div className="text-xs font-extrabold text-slate-900 leading-tight truncate max-w-[140px]">
                {displayUserName}
              </div>
              <div className="text-[11px] text-slate-500 leading-tight truncate max-w-[140px]">
                {displayUserEmail}
              </div>
            </div>

            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {/* User Dropdown Menu */}
          {isUserMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-100">
              <div className="p-4 bg-slate-900 text-white">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-bold text-sm truncate">{displayUserName}</div>
                  {isSignedIn && currentUser ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-bold border border-emerald-800 shrink-0">
                      @{currentUser.userId || currentUser.id}
                    </span>
                  ) : currentUser && currentUser.id === 'guest_ca' ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold border border-slate-700 shrink-0">
                      @{currentUser.userId || 'guest_ca'}
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 font-bold border border-amber-800 shrink-0">
                      Not Signed In
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">{displayUserEmail}</div>

                {currentUser && (
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        Usage Credits
                      </span>
                      <span className="font-black text-emerald-400 text-sm">
                        ⚡ {currentUser.credits.toLocaleString()}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenSubscriptionModal?.();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold transition cursor-pointer"
                    >
                      Top-Up
                    </button>
                  </div>
                )}
              </div>

              <div className="p-1.5 space-y-0.5">
                {(!currentUser || currentUser.id === 'guest_ca') && onOpenAuthModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenAuthModal('signin');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-bold flex items-center gap-2 transition cursor-pointer"
                  >
                    <LogIn className="w-4 h-4 text-indigo-600" />
                    <span>Sign In / Register CA Account</span>
                  </button>
                )}

                {onOpenReferralModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenReferralModal();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-900 font-bold flex items-center gap-2 transition cursor-pointer"
                  >
                    <Gift className="w-4 h-4 text-emerald-600" />
                    <span className="flex-1">Refer &amp; Earn 500 Credits</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black">
                      FREE
                    </span>
                  </button>
                )}

                {onOpenUserProfileModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenUserProfileModal();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-medium flex items-center gap-2 transition cursor-pointer"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                    <span>Auditor Profile &amp; Settings</span>
                  </button>
                )}

                {onOpenSubscriptionModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenSubscriptionModal();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-medium flex items-center gap-2 transition cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="flex-1">Credits &amp; Top-Ups</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onOpenCompanyManager('list');
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-medium flex items-center gap-2 transition cursor-pointer"
                >
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Manage Client Companies</span>
                </button>

                {onOpenUserManual && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenUserManual();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-medium flex items-center gap-2 transition cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                    <span>User Manual &amp; ICAI Guide</span>
                  </button>
                )}

                {onOpenTermsModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenTermsModal();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-medium flex items-center gap-2 transition cursor-pointer"
                  >
                    <Scale className="w-3.5 h-3.5 text-slate-500" />
                    <span>Terms &amp; Professional Disclaimer</span>
                  </button>
                )}

                {onLogout && (
                  <div className="pt-1 border-t border-slate-100 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-50 text-rose-700 font-semibold flex items-center gap-2 transition cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-600" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
