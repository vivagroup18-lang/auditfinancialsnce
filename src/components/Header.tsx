import React, { useState, useRef, useEffect } from 'react';
import {
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Download,
  Sparkles,
  Building2,
  ShieldCheck,
  Printer,
  ChevronDown,
  Plus,
  Layers,
  Settings,
  Check,
  Calendar,
  FastForward,
  Rewind,
  ArrowRightLeft,
  ChevronRight,
  Box,
  LayoutDashboard,
  Mail,
  HardDrive,
  Database,
  User as UserIcon,
  LogIn,
  LogOut,
  Zap,
  CreditCard,
  Gift,
  Coins,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import { EntityConfig, Company, UserProfile } from '../types';
import {
  POPULAR_INDIAN_FY_PRESETS,
  rollForwardOneYear,
  rollBackOneYear,
} from '../utils/financialYearUtils';

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
  onOpenYearEndAdjustments?: () => void;
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
  dashboardView?: 'companies' | 'workspace';
  onDashboardViewChange?: (view: 'companies' | 'workspace') => void;
  workspaceStep?: 1 | 2 | 3 | 4 | 5;
  onWorkspaceStepChange?: (step: 1 | 2 | 3 | 4 | 5) => void;
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
  dashboardView = 'workspace',
  onDashboardViewChange,
  workspaceStep = 1,
  onWorkspaceStepChange,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const yearDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Entity info with Company Switcher */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold shadow-sm shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-slate-100 tracking-tight">CA Financial Statement Agent</h1>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-medium">
                  ICAI NCE Framework
                </span>
              </div>

              {/* Company Switcher Dropdown Trigger */}
              <div className="relative" ref={dropdownRef}>
                <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="hover:text-emerald-300 transition flex items-center gap-1.5 font-medium text-slate-200 bg-slate-800/80 hover:bg-slate-800 px-2 py-0.5 rounded border border-slate-700/80"
                    title="Click to switch company or manage entities"
                  >
                    <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="max-w-[190px] sm:max-w-[260px] truncate">
                      {config.entityName}
                    </span>
                    <span className="text-[10px] px-1 py-0.2 rounded bg-slate-700 text-slate-300">
                      {config.entityType}
                    </span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  <span className="hidden sm:inline">•</span>

                  {/* Financial Year Selector Trigger */}
                  <div className="relative" ref={yearDropdownRef}>
                    <button
                      onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                      className="flex items-center gap-1.5 font-medium text-slate-200 bg-slate-800/80 hover:bg-slate-800 px-2 py-0.5 rounded border border-slate-700 hover:border-emerald-500/60 text-xs transition"
                      title="Click to change Current Year and Comparative Previous Year"
                    >
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      <span>FY {config.financialYear}</span>
                      <span className="text-[10px] text-slate-400 hidden xl:inline">
                        (PY: {config.previousFinancialYear || '2023-24'})
                      </span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>

                    {/* Financial Year Quick Dropdown */}
                    {isYearDropdownOpen && (
                      <div className="absolute left-0 mt-1.5 w-80 bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 text-xs">
                        <div className="px-3.5 py-2.5 bg-slate-900 text-white flex items-center justify-between">
                          <span className="font-bold flex items-center gap-1.5 text-xs">
                            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                            Select Financial Year (CY / PY)
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Active: FY {config.financialYear}
                          </span>
                        </div>

                        {/* Quick Presets */}
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
                                className={`w-full text-left px-2.5 py-2 rounded-lg transition flex items-center justify-between ${
                                  isSelected
                                    ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-300'
                                    : 'hover:bg-slate-100 text-slate-700'
                                }`}
                              >
                                <div>
                                  <div className="flex items-center gap-1.5 font-semibold">
                                    <span>FY {p.cyYear} (CY)</span>
                                    <span className="text-slate-400 font-normal">&</span>
                                    <span>FY {p.pyYear} (PY)</span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-normal">
                                    A.Y. {p.assessmentYear} • As on {p.cyPeriod}
                                  </div>
                                </div>
                                {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>

                        {/* Quick Adjust Buttons */}
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
                            className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-medium transition"
                            title="Roll back 1 year"
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
                            className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 text-[11px] font-medium transition"
                            title="Advance 1 year"
                          >
                            <FastForward className="w-3 h-3 text-emerald-600" />
                            <span>Roll Forward (+1 Yr)</span>
                          </button>
                        </div>

                        {/* Custom Edit Option */}
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
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition"
                          >
                            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Customize Years & Dates...</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => onOpenCompanyManager('add')}
                    className="hidden md:flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/60 transition"
                    title="Add new company entity"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New</span>
                  </button>
                </div>

                {/* Company Dropdown Popover */}
                {isDropdownOpen && (
                  <div className="absolute left-0 mt-1.5 w-80 bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3.5 py-2.5 bg-slate-900 text-white flex items-center justify-between">
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                        Select Active Entity
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {companies.length} {companies.length === 1 ? 'Company' : 'Companies'}
                      </span>
                    </div>

                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                      {companies.map((company) => {
                        const isSelected = company.id === activeCompanyId;
                        return (
                          <button
                            key={company.id}
                            onClick={() => {
                              onSelectCompany(company.id);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3.5 py-2.5 transition flex items-center justify-between gap-2 ${
                              isSelected
                                ? 'bg-emerald-50 text-emerald-950 font-semibold'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                                <span className="truncate">{company.config.entityName}</span>
                                {isSelected && (
                                  <span className="shrink-0 p-0.5 rounded-full bg-emerald-600 text-white">
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
                      })}
                    </div>

                    <div className="p-2 bg-slate-50 border-t border-slate-200 flex flex-col gap-1 text-xs">
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          onOpenConfig();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-200/70 text-slate-700 text-left transition font-medium"
                      >
                        <Settings className="w-3.5 h-3.5 text-slate-500" />
                        <span>Edit Parameters & Audit Rules</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          onOpenCompanyManager('add');
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-left transition font-semibold"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Add New Company / Entity</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          onOpenCompanyManager('list');
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-200/70 text-slate-700 text-left transition font-medium"
                      >
                        <Layers className="w-3.5 h-3.5 text-slate-500" />
                        <span>Manage All Companies</span>
                      </button>

                      {onOpenBackupRestore && (
                        <button
                          onClick={() => {
                            setIsDropdownOpen(false);
                            onOpenBackupRestore();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-emerald-50 text-emerald-800 text-left transition font-semibold"
                        >
                          <Database className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Backup & Restore (Cloud & Local)</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        {/* Action Buttons & Status */}
        <div className="flex items-center gap-2">
          {/* Unified Audit Health Indicator */}
          <div className="hidden lg:flex items-center gap-2 text-xs">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                isTallyBalanced && isBSBalanced
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-800 text-rose-300 animate-pulse'
              }`}
            >
              {isTallyBalanced && isBSBalanced ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Statements Tallied</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>
                    {!isTallyBalanced
                      ? `TB Diff: ₹${Math.abs(tallyDifference).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                      : `BS Diff: ₹${Math.abs(bsDifference).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                  </span>
                </>
              )}
            </div>

            {exceptionCount > 0 ? (
              <button
                onClick={() => setActiveTab('audit_report')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/40 border border-amber-800/60 text-amber-300 hover:bg-amber-900/40 transition text-[11px] font-medium"
              >
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                <span>{exceptionCount} Flags</span>
              </button>
            ) : (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/60 border border-slate-700/60 text-slate-300 text-[11px]">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>0 Flags</span>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-slate-800 hidden lg:block" />

          {/* Key Actions */}
          {onOpenYearEndAdjustments && (
            <button
              onClick={onOpenYearEndAdjustments}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
              title="Closing stock valuation and year-end audit adjustments"
            >
              <Box className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden xl:inline">Adjustments</span>
            </button>
          )}

          <button
            onClick={onTriggerAIMap}
            disabled={isAIMapping}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer"
            title="Launch AI Schedule Mapping Agent"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAIMapping ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isAIMapping ? 'Mapping...' : 'AI Mapping'}</span>
          </button>

          <button
            onClick={onExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition"
            title="Export full NCE financial statements & notes to Excel"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>

          {/* Drive & Gmail Integration shortcuts */}
          <div className="hidden sm:flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/80">
            <button
              onClick={() => setActiveTab('drive')}
              className={`p-1.5 rounded-md text-xs transition ${
                accessToken && user ? 'text-sky-400 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-200'
              }`}
              title={accessToken ? `Drive Connected (${user?.email})` : 'Google Drive Workpapers'}
            >
              <HardDrive className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTab('gmail')}
              className={`p-1.5 rounded-md text-xs transition ${
                accessToken && user ? 'text-emerald-400 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-200'
              }`}
              title={accessToken ? `Gmail Connected (${user?.email})` : 'Gmail Client Communication'}
            >
              <Mail className="w-3.5 h-3.5" />
            </button>
            {onOpenBackupRestore && (
              <button
                onClick={onOpenBackupRestore}
                className="p-1.5 rounded-md text-xs text-slate-400 hover:text-emerald-300 transition"
                title="Backup & Restore (Cloud/Local)"
              >
                <Database className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => window.print()}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition"
            title="Print / Save PDF Statements"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>

          {/* Claude-Style Live Credit Meter Pill */}
          {currentUser && (
            <button
              type="button"
              onClick={onOpenSubscriptionModal}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border transition cursor-pointer shadow-xs ${
                currentUser.credits > 100
                  ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/90'
                  : currentUser.credits > 20
                  ? 'bg-amber-950/80 border-amber-500/60 text-amber-300 hover:bg-amber-900/90'
                  : 'bg-rose-950/90 border-rose-500/80 text-rose-300 animate-pulse'
              }`}
              title="Claude-Style Usage Credits • Click to top-up or view breakdown"
            >
              <Zap className="w-3.5 h-3.5 fill-current text-amber-400" />
              <span>⚡ {currentUser.credits.toLocaleString()} Credits</span>
            </button>
          )}

          {/* Referral Reward Button */}
          {onOpenReferralModal && (
            <button
              type="button"
              onClick={onOpenReferralModal}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:text-white text-xs font-bold transition shadow-2xs cursor-pointer"
              title="Invite colleagues and earn 500 credits each"
            >
              <Gift className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xl:inline">Refer & Earn</span>
              <span className="text-amber-300 font-extrabold">+500</span>
            </button>
          )}

          {/* User Account & Subscription Status */}
          {currentUser && currentUser.id !== 'guest_ca' ? (
            <div className="relative" ref={userMenuRef}>
              <div className="flex items-center gap-2">
                {/* Subscription Tier Pill */}
                <button
                  type="button"
                  onClick={onOpenSubscriptionModal}
                  className={`hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border shadow-xs transition cursor-pointer ${
                    currentUser.planTier === 'enterprise'
                      ? 'bg-indigo-950/80 border-indigo-500/70 text-indigo-300 hover:bg-indigo-900/80'
                      : currentUser.planTier === 'professional'
                      ? 'bg-emerald-950/80 border-emerald-500/70 text-emerald-300 hover:bg-emerald-900/80'
                      : 'bg-amber-950/80 border-amber-500/70 text-amber-300 hover:bg-amber-900/80'
                  }`}
                  title="Manage Subscription & Billing"
                >
                  <Coins className="w-3 h-3 text-amber-400" />
                  <span>
                    {currentUser.planTier === 'enterprise'
                      ? 'Enterprise'
                      : currentUser.planTier === 'professional'
                      ? 'Pro Plan'
                      : 'Trial'}
                  </span>
                </button>

                {/* Avatar Button */}
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200 transition overflow-hidden cursor-pointer"
                  title="User Profile & Settings"
                >
                  {currentUser.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>
                      {currentUser.fullName
                        ? currentUser.fullName.charAt(0).toUpperCase()
                        : 'CA'}
                    </span>
                  )}
                </button>
              </div>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-4 bg-slate-900 text-white">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm truncate">{currentUser.fullName}</div>
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-950 text-emerald-300 font-bold border border-emerald-800">
                        @{currentUser.userId || currentUser.id}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {currentUser.email}
                    </div>
                    {currentUser.mobile && (
                      <div className="text-[11px] text-emerald-400 truncate mt-0.5">
                        📱 +91 {currentUser.mobile}
                      </div>
                    )}

                    {/* Credit Status Card */}
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
                          if (onOpenSubscriptionModal) onOpenSubscriptionModal();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold transition cursor-pointer"
                      >
                        Top-Up
                      </button>
                    </div>
                  </div>

                  <div className="p-1.5 space-y-0.5">
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
                        <span className="flex-1">Refer & Earn 500 Credits</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black">
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
                        <span>Auditor Profile & Settings</span>
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
                        <span className="flex-1">Subscription & Top-Ups</span>
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
                      <span>Manage Companies</span>
                    </button>

                    {onLogout && (
                      <div className="pt-1 border-t border-slate-100">
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
          ) : (
            <div className="flex items-center gap-1.5">
              {onOpenSubscriptionModal && (
                <button
                  type="button"
                  onClick={onOpenSubscriptionModal}
                  className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition"
                  title="View Subscription Plans"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Plans</span>
                </button>
              )}

              {onOpenAuthModal && (
                <button
                  type="button"
                  onClick={() => onOpenAuthModal('signin')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 5-Step Progressive Workflow Navigation */}
      <nav className="flex space-x-1 overflow-x-auto py-1.5 scrollbar-none border-t border-slate-800/70 text-xs items-center">
        <button
          type="button"
          onClick={() => {
            if (onDashboardViewChange) onDashboardViewChange('companies');
            setActiveTab('companies');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition cursor-pointer ${
            dashboardView === 'companies'
              ? 'bg-emerald-700 text-white font-semibold shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Saved Companies ({companies.length})</span>
        </button>

        <div className="h-3.5 w-px bg-slate-800 mx-1 hidden sm:block" />

        {[
          { step: 1, id: 'step1', label: '1. Current Year (CY)', icon: LayoutDashboard },
          { step: 2, id: 'step2', label: '2. Previous Year (PY)', icon: FileSpreadsheet },
          { step: 3, id: 'step3', label: '3. Comparative Statements', icon: Building2 },
          { step: 4, id: 'step4', label: `4. Notes & Audit (${exceptionCount})`, icon: AlertTriangle },
          { step: 5, id: 'step5', label: '5. Generate Report', icon: Download },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = dashboardView === 'workspace' && workspaceStep === tab.step;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (onDashboardViewChange) onDashboardViewChange('workspace');
                if (onWorkspaceStepChange) onWorkspaceStepChange(tab.step as any);
                setActiveTab(tab.id);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? 'bg-slate-800 text-emerald-400 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isActive ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {tab.step}
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
      </div>
    </header>
  );
};
