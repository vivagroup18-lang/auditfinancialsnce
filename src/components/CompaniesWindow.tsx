import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Check,
  Trash2,
  Copy,
  Edit3,
  ArrowRight,
  ShieldCheck,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Search,
  CheckCircle2,
  Clock,
  Briefcase,
  X,
  FileText,
  Database,
  Users,
  Percent,
  AlertTriangle,
  Cloud,
  RefreshCw,
  Download,
  HardDrive,
} from 'lucide-react';
import { Company, EntityConfig } from '../types';
import { POPULAR_INDIAN_FY_PRESETS } from '../utils/financialYearUtils';
import { SAMPLE_DATASETS } from '../data/sampleTrialBalances';
import { PartnerConfigForm, PartnerConfigItem } from './PartnerConfigForm';
import { exportTotalLocalBackup } from '../utils/storageManager';

interface CompaniesWindowProps {
  companies: Company[];
  activeCompanyId: string;
  onSelectCompany: (companyId: string) => void;
  onCreateCompany: (
    config: EntityConfig,
    starterType: 'blank' | 'sample_partnership' | 'sample_proprietorship' | 'clone',
    cloneSourceId?: string
  ) => void;
  onUpdateCompanyConfig: (companyId: string, updatedConfig: EntityConfig) => void;
  onDeleteCompany: (companyId: string) => void;
  onDuplicateCompany: (companyId: string) => void;
  onOpenWorkingWindows: () => void;
  onOpenBackupRestore?: () => void;
  driveSyncStatus?: 'idle' | 'syncing' | 'synced' | 'error';
  lastDriveSyncTime?: Date | null;
  userEmail?: string;
  onManualDriveSync?: () => void;
  onConnectDrive?: () => void;
  onExportTotalLocalBackup?: () => void;
}

export const CompaniesWindow: React.FC<CompaniesWindowProps> = ({
  companies,
  activeCompanyId,
  onSelectCompany,
  onCreateCompany,
  onUpdateCompanyConfig,
  onDeleteCompany,
  onDuplicateCompany,
  onOpenWorkingWindows,
  onOpenBackupRestore,
  driveSyncStatus = 'idle',
  lastDriveSyncTime,
  userEmail,
  onManualDriveSync,
  onConnectDrive,
  onExportTotalLocalBackup,
}) => {
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // Creation Form State
  const [newEntityName, setNewEntityName] = useState('');
  const [newEntityType, setNewEntityType] = useState<EntityConfig['entityType']>('Partnership Firm');
  const [newFY, setNewFY] = useState<string>('2025-26');
  const [newStarterType, setNewStarterType] = useState<
    'blank' | 'sample_partnership' | 'sample_proprietorship' | 'clone'
  >('blank');
  const [newCloneSourceId, setNewCloneSourceId] = useState<string>(activeCompanyId || (companies[0]?.id ?? ''));
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  const [newPan, setNewPan] = useState('');
  const [newGstin, setNewGstin] = useState('');
  const [newAuditorFirmName, setNewAuditorFirmName] = useState('');
  const [newAuditorName, setNewAuditorName] = useState('');
  const [newAuditorRole, setNewAuditorRole] = useState<'Partner' | 'Proprietor'>('Partner');
  const [newMembershipNo, setNewMembershipNo] = useState('');
  const [newFirmRegNo, setNewFirmRegNo] = useState('');
  const [newUdin, setNewUdin] = useState('');
  const [newRegisteredAddress, setNewRegisteredAddress] = useState('');
  const [newPlaceOfSigning, setNewPlaceOfSigning] = useState('');
  const [newDateOfSigning, setNewDateOfSigning] = useState('');
  const [newProprietorName, setNewProprietorName] = useState('');
  const [newSigningPartnerName, setNewSigningPartnerName] = useState('');

  // Partners configured during Companies Stage
  const [newPartners, setNewPartners] = useState<PartnerConfigItem[]>([
    { name: 'Partner 1', profitSharePercent: 50, remunerationSharePercent: 50, isWorkingPartner: true, isDesignatedPartner: true, openingBalance: 0 },
    { name: 'Partner 2', profitSharePercent: 50, remunerationSharePercent: 50, isWorkingPartner: true, isDesignatedPartner: true, openingBalance: 0 },
  ]);

  // Edit Modal/Inline State
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editConfig, setEditConfig] = useState<EntityConfig | null>(null);

  // Deletion Confirmation State (Bypasses window.confirm for iframe safety)
  const [deletingCompany, setDeletingCompany] = useState<{ id: string; name: string } | null>(null);

  // Filtered companies list
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const matchesSearch =
        c.config.entityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.config.pan && c.config.pan.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.config.financialYear && c.config.financialYear.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = filterType === 'all' || c.config.entityType === filterType;
      return matchesSearch && matchesType;
    });
  }, [companies, searchQuery, filterType]);

  const activeCompany = companies.find((c) => c.id === activeCompanyId) || companies[0];

  // Handle Select Company and navigate to working windows
  const handleSelectAndWork = (companyId: string) => {
    onSelectCompany(companyId);
    onOpenWorkingWindows();
  };

  // Handle Form Submission for New Company
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = newEntityName.trim();
    if (!finalName) return;

    const preset = POPULAR_INDIAN_FY_PRESETS.find((p) => p.cyYear === newFY);
    const isFirmOrLLP = newEntityType === 'Partnership Firm' || newEntityType === 'LLP';

    const createdConfig: EntityConfig = {
      entityName: finalName,
      entityType: newEntityType,
      financialYear: newFY,
      reportingPeriod: preset?.cyPeriod || 'March 31, 2026',
      previousFinancialYear: preset?.pyYear || '2024-25',
      previousReportingPeriod: preset?.pyPeriod || 'March 31, 2025',
      currencyUnit: 'INR',
      taxRatePercent: 30,
      transferProfitTo: newEntityType === 'LLP' ? 'reserves' : 'partners_capital',
      pan: newPan.trim().toUpperCase() || undefined,
      gstin: newGstin.trim().toUpperCase() || undefined,
      address: newRegisteredAddress.trim() || undefined,
      registeredAddress: newRegisteredAddress.trim() || undefined,
      placeOfSigning: newPlaceOfSigning.trim() || undefined,
      dateOfSigning: newDateOfSigning.trim() || undefined,
      proprietorName: newEntityType === 'Sole Proprietorship' ? (newProprietorName.trim() || undefined) : undefined,
      signingPartnerName: isFirmOrLLP ? (newSigningPartnerName.trim() || newPartners[0]?.name || undefined) : undefined,
      auditorFirmName: newAuditorFirmName.trim() || undefined,
      auditorName: newAuditorName.trim() || undefined,
      auditorRole: newAuditorRole || undefined,
      auditorMembershipNo: newMembershipNo.trim() || undefined,
      firmRegistrationNo: newFirmRegNo.trim() || undefined,
      udin: newUdin.trim() || undefined,
      partners: isFirmOrLLP && newPartners.length > 0 ? newPartners : undefined,
    };

    onCreateCompany(createdConfig, newStarterType, newCloneSourceId);

    // Reset form fields
    setNewEntityName('');
    setNewPan('');
    setNewGstin('');
    setNewRegisteredAddress('');
    setNewPlaceOfSigning('');
    setNewDateOfSigning('');
    setNewProprietorName('');
    setNewSigningPartnerName('');
    setNewAuditorFirmName('');
    setNewAuditorName('');
    setNewAuditorRole('Partner');
    setNewMembershipNo('');
    setNewFirmRegNo('');
    setNewUdin('');
    setShowAdditionalDetails(false);
    setNewPartners([
      { name: 'Partner 1', profitSharePercent: 50, remunerationSharePercent: 50, isWorkingPartner: true, isDesignatedPartner: true, openingBalance: 0 },
      { name: 'Partner 2', profitSharePercent: 50, remunerationSharePercent: 50, isWorkingPartner: true, isDesignatedPartner: true, openingBalance: 0 },
    ]);

    // Immediately open working windows for newly created entity
    onOpenWorkingWindows();
  };

  // 1-Click Sample Handlers
  const handleCreateSample = (type: 'sample_partnership' | 'sample_proprietorship') => {
    if (type === 'sample_partnership') {
      const sample = SAMPLE_DATASETS[1]; // RRK & CO. (Partnership Firm)
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
          address: 'Plot No. 12, Industrial Area, Phase II, Pune - 411018, Maharashtra',
          registeredAddress: 'Plot No. 12, Industrial Area, Phase II, Pune - 411018, Maharashtra',
          placeOfSigning: 'Pune',
          dateOfSigning: 'March 31, 2026',
          signingPartnerName: 'Partner R. R. Kulkarni',
          auditorFirmName: 'Kulkarni & Associates',
          auditorName: 'CA Rajesh Kulkarni',
          auditorRole: 'Partner',
          auditorMembershipNo: '123456',
          firmRegistrationNo: '112233W',
          partners: [
            { name: 'Partner R. R. Kulkarni', profitSharePercent: 50, remunerationSharePercent: 50, isWorkingPartner: true, isDesignatedPartner: true, isSigningPartner: true, openingBalance: 5000000, openingNature: 'Cr' },
            { name: 'Partner R. K. Kulkarni', profitSharePercent: 50, remunerationSharePercent: 50, isWorkingPartner: true, isDesignatedPartner: true, isSigningPartner: false, openingBalance: 5000000, openingNature: 'Cr' },
          ],
        },
        'sample_partnership'
      );
    } else {
      const sample = SAMPLE_DATASETS[0]; // Durga Steel (Proprietorship Firm)
      onCreateCompany(
        {
          entityName: sample.name,
          entityType: sample.entityType,
          financialYear: sample.financialYear,
          reportingPeriod: sample.reportingPeriod || 'March 31, 2026',
          previousFinancialYear: '2024-25',
          previousReportingPeriod: 'March 31, 2025',
          taxRatePercent: 30,
          transferProfitTo: 'proprietor_capital',
          proprietorName: 'Parasharam Patil',
          address: 'Shop No. 4, Steel Market Yard, Kalamboli, Navi Mumbai - 410218, Maharashtra',
          registeredAddress: 'Shop No. 4, Steel Market Yard, Kalamboli, Navi Mumbai - 410218, Maharashtra',
          placeOfSigning: 'Navi Mumbai',
          dateOfSigning: 'March 31, 2026',
          auditorFirmName: 'S. P. Joshi & Co.',
          auditorName: 'CA Snehal Joshi',
          auditorRole: 'Proprietor',
          auditorMembershipNo: '654321',
          firmRegistrationNo: '223344W',
        },
        'sample_proprietorship'
      );
    }
    onOpenWorkingWindows();
  };

  // Start Editing
  const handleStartEdit = (company: Company) => {
    setEditingCompany(company);
    const existingPartners =
      company.config.partners && company.config.partners.length > 0
        ? company.config.partners.map((p) => ({
            name: p.name,
            profitSharePercent: p.profitSharePercent ?? 50,
            remunerationSharePercent:
              p.remunerationSharePercent !== undefined
                ? p.remunerationSharePercent
                : p.profitSharePercent ?? 50,
            isWorkingPartner: p.isWorkingPartner !== false,
            isDesignatedPartner: p.isDesignatedPartner !== false,
            openingBalance: p.openingBalance || 0,
            openingNature: ((p.openingNature === 'Dr' || (p.openingBalance || 0) < 0) ? 'Dr' : 'Cr') as 'Cr' | 'Dr',
          }))
        : company.config.entityType === 'Partnership Firm' || company.config.entityType === 'LLP'
        ? [
            { name: 'Partner 1', profitSharePercent: 50, remunerationSharePercent: 50, isWorkingPartner: true, isDesignatedPartner: true, openingBalance: 0, openingNature: 'Cr' as const },
            { name: 'Partner 2', profitSharePercent: 50, remunerationSharePercent: 50, isWorkingPartner: true, isDesignatedPartner: true, openingBalance: 0, openingNature: 'Cr' as const },
          ]
        : [];

    setEditConfig({
      ...company.config,
      signingPartnerName:
        company.config.signingPartnerName ||
        company.config.partners?.find((p) => p.isSigningPartner)?.name ||
        existingPartners[0]?.name,
      partners: existingPartners,
    });
  };

  // Save Edit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany || !editConfig) return;
    onUpdateCompanyConfig(editingCompany.id, editConfig);
    setEditingCompany(null);
    setEditConfig(null);
  };

  const handleTriggerTotalLocalBackup = () => {
    if (onExportTotalLocalBackup) {
      onExportTotalLocalBackup();
    } else {
      try {
        exportTotalLocalBackup(companies, activeCompanyId);
      } catch (e: any) {
        alert(e.message || 'Failed to generate local backup');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Window Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Client Companies Workspace
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {companies.length} {companies.length === 1 ? 'Saved Entity' : 'Saved Entities'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Unified window to manage, select, and create client companies for ICAI Non-Corporate Entity audit &amp; financial reporting.
              </p>
            </div>
          </div>

          {activeCompany && (
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3 shrink-0">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Active Entity
                </span>
                <span className="text-xs font-bold text-slate-900 block truncate max-w-[200px]">
                  {activeCompany.config.entityName || 'Unnamed Entity'}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {activeCompany.config.entityType} • FY {activeCompany.config.financialYear}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleTriggerTotalLocalBackup}
                  className="px-3 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white border border-emerald-700 text-xs font-bold transition flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
                  title={`Download total offline backup .json file containing all ${companies.length} client companies`}
                >
                  <Download className="w-3.5 h-3.5 text-emerald-300" />
                  <span className="hidden sm:inline">Total Local Backup ({companies.length})</span>
                  <span className="sm:hidden">Backup ({companies.length})</span>
                </button>
                {onOpenBackupRestore && (
                  <button
                    type="button"
                    onClick={onOpenBackupRestore}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
                    title="Export, restore, or cloud-sync all client entities"
                  >
                    <Database className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden sm:inline">Backup &amp; Restore</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onOpenWorkingWindows}
                  className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-xs shrink-0"
                >
                  <span>Working Windows</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Google Drive Automated Cloud Sync Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-xs border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            {driveSyncStatus === 'syncing' ? (
              <RefreshCw className="w-5 h-5 animate-spin text-emerald-300" />
            ) : (
              <Cloud className="w-5 h-5 text-emerald-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-white">
                {userEmail
                  ? `Google Drive Auto-Sync Active (${userEmail})`
                  : 'Google Drive Multi-Device Auto-Sync'}
              </span>
              {driveSyncStatus === 'synced' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                  <Check className="w-2.5 h-2.5" />
                  <span>Synced</span>
                </span>
              )}
              {driveSyncStatus === 'syncing' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-400/20 text-blue-300 border border-blue-400/30 animate-pulse">
                  Syncing...
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {userEmail
                ? 'Your companies, ledger mappings, and financial statements are automatically backed up in Google Drive and accessible on any computer upon login.'
                : 'Connect your Gmail ID to automatically back up and access your companies anywhere on any laptop or desktop.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleTriggerTotalLocalBackup}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 font-bold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            title={`Download complete offline .json backup containing all ${companies.length} client entities`}
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Total Local Backup ({companies.length})</span>
            <span className="md:hidden">Local Backup</span>
          </button>
          {userEmail ? (
            <button
              type="button"
              onClick={onManualDriveSync}
              disabled={driveSyncStatus === 'syncing'}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${driveSyncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              <span>{driveSyncStatus === 'syncing' ? 'Syncing...' : 'Sync with Drive Now'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onConnectDrive}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Connect Google Drive</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area: 2-Column Responsive Window */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================================= */}
        {/* LEFT / MAIN COLUMN (7 cols): SAVED COMPANIES DISPLAY & SELECTION         */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5">
            {/* Account Workspace Context Badge */}
            <div className="mb-3 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${userEmail ? 'bg-emerald-500' : 'bg-amber-500'} shrink-0`} />
                <span className="text-slate-600 font-medium text-[11px] sm:text-xs">
                  {userEmail ? (
                    <>
                      Workspace Account: <strong className="text-slate-900 font-bold">{userEmail}</strong> <span className="text-emerald-700 font-semibold hidden md:inline">• Private User Workspace</span>
                    </>
                  ) : (
                    <>
                      <strong className="text-slate-800 font-semibold">Offline Guest Workspace</strong> • Sign in with Google to auto-sync &amp; isolate cloud companies
                    </>
                  )}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                {companies.length} {companies.length === 1 ? 'entity' : 'entities'}
              </span>
            </div>

            {/* Search & Filter Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-700" />
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    Saved Client Companies ({filteredCompanies.length})
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleTriggerTotalLocalBackup}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                  title={`Download total offline backup .json of all ${companies.length} companies`}
                >
                  <Download className="w-3 h-3 text-emerald-600" />
                  <span>Backup All ({companies.length})</span>
                </button>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 sm:pb-0">
                {(['all', 'Partnership Firm', 'Sole Proprietorship', 'LLP'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFilterType(type)}
                    className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition ${
                      filterType === type
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {type === 'all' ? 'All' : type}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Bar */}
            <div className="mt-3 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search saved companies by name, PAN, or financial year..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Companies List / Cards */}
            <div className="mt-4 space-y-3">
              {filteredCompanies.length === 0 ? (
                <div className="text-center py-10 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <h3 className="text-sm font-semibold text-slate-700">
                    {searchQuery
                      ? 'No matching companies found'
                      : userEmail
                      ? `No client companies created yet for ${userEmail}`
                      : 'No client companies created yet'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    {searchQuery
                      ? 'Try adjusting your search keywords or filter.'
                      : userEmail
                      ? 'Create your first entity using the form on the right, or click Quick Sample to start drafting.'
                      : 'Use the registration form on the right to add your first client entity, or click one of the quick starter samples.'}
                  </p>
                  {!searchQuery && (
                    <div className="mt-4 flex justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCreateSample('sample_partnership')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold transition"
                      >
                        ⚡ Quick Sample Partnership
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                filteredCompanies.map((company) => {
                  const isSelected = company.id === activeCompanyId;
                  const tbCount = company.mappedLedgers?.length || company.rawRows?.length || 0;
                  const pyCount = company.pyMappedLedgers?.length || company.pyRawRows?.length || 0;
                  const hasTB = tbCount > 0;

                  return (
                    <div
                      key={company.id}
                      className={`p-4 rounded-xl border transition-all duration-150 ${
                        isSelected
                          ? 'bg-emerald-50/50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {/* Title & Badges */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm sm:text-base text-slate-900 tracking-tight truncate">
                              {company.config.entityName || 'Unnamed Entity'}
                            </span>
                            {isSelected && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-2xs">
                                <Check className="w-3 h-3" />
                                Active
                              </span>
                            )}
                          </div>

                          {/* Entity Metas */}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs text-slate-600">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 font-medium text-slate-700">
                              <Briefcase className="w-3 h-3 text-slate-500" />
                              {company.config.entityType}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 font-medium text-slate-700">
                              <Calendar className="w-3 h-3 text-slate-500" />
                              FY {company.config.financialYear}
                            </span>
                            {company.config.pan && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-mono text-slate-600">
                                PAN: {company.config.pan}
                              </span>
                            )}
                          </div>

                          {/* Partners Summary Chip for Partnership Firms & LLPs */}
                          {company.config.partners && company.config.partners.length > 0 && (
                            <div className="mt-2 flex items-center gap-1.5 flex-wrap text-[11px] text-slate-600 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1">
                              <Users className="w-3 h-3 text-emerald-700 shrink-0" />
                              <span className="font-semibold text-slate-700">
                                {company.config.entityType === 'LLP' ? 'Designated Partners:' : 'Partners:'}
                              </span>
                              {company.config.partners.map((p, pIdx) => (
                                <span
                                  key={pIdx}
                                  className="inline-flex items-center gap-1 font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200"
                                >
                                  <span className="font-sans font-medium text-slate-800">{p.name}</span>
                                  <span className="text-emerald-700 font-bold">({p.profitSharePercent || 0}% PSR)</span>
                                  {p.remunerationSharePercent !== undefined && p.remunerationSharePercent !== p.profitSharePercent && (
                                    <span className="text-indigo-700 font-semibold">({p.remunerationSharePercent}% Remun)</span>
                                  )}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Audit Status Indicators */}
                          <div className="mt-3 flex items-center gap-2.5 flex-wrap text-[11px]">
                            {hasTB ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium bg-emerald-100/60 px-2 py-0.5 rounded">
                                <CheckCircle2 className="w-3 h-3" />
                                TB: {tbCount} Ledgers
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                <FileSpreadsheet className="w-3 h-3 text-slate-400" />
                                Pending TB Upload
                              </span>
                            )}

                            {pyCount > 0 && (
                              <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-medium">
                                PY TB: {pyCount} Ledgers
                              </span>
                            )}

                            <span className="text-slate-400 text-[10px]">
                              Updated {new Date(company.updatedAt || company.createdAt || Date.now()).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          <button
                            type="button"
                            onClick={() => handleSelectAndWork(company.id)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-xs ${
                              isSelected
                                ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                                : 'bg-slate-900 hover:bg-slate-800 text-white'
                            }`}
                            title="Select this company and open working windows"
                          >
                            <span>{isSelected ? 'Open Workspace' : 'Select & Work'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStartEdit(company)}
                            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                            title="Edit company parameters"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onDuplicateCompany(company.id)}
                            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                            title="Clone/Duplicate this company"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingCompany({ id: company.id, name: company.config.entityName })}
                            className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                            title="Delete this company"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN (5 cols): CREATE NEW CLIENT COMPANY FORM                      */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4 text-emerald-700" />
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  Register New Client Entity
                </h2>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                ICAI NCE
              </span>
            </div>

            {/* Quick 1-Click Starter Buttons */}
            <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                ⚡ 1-Click Starter Presets:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleCreateSample('sample_partnership')}
                  className="p-2 rounded-lg bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 text-left transition"
                >
                  <span className="text-xs font-semibold text-slate-800 block">
                    Partnership Firm
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Sample TB + P & L
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCreateSample('sample_proprietorship')}
                  className="p-2 rounded-lg bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 text-left transition"
                >
                  <span className="text-xs font-semibold text-slate-800 block">
                    Sole Proprietor
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Retail Trader TB
                  </span>
                </button>
              </div>
            </div>

            {/* Creation Form */}
            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4 text-xs">
              {/* Entity Name */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  Entity / Trade Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shree Balaji Traders, Apex Associates"
                  value={newEntityName}
                  onChange={(e) => setNewEntityName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs font-medium transition"
                />
              </div>

              {/* Entity Type & Financial Year Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Entity Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newEntityType}
                    onChange={(e) => setNewEntityType(e.target.value as EntityConfig['entityType'])}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs font-medium transition"
                  >
                    <option value="Partnership Firm">Partnership Firm</option>
                    <option value="Sole Proprietorship">Sole Proprietorship</option>
                    <option value="LLP">Limited Liability Partnership (LLP)</option>
                    <option value="AOP/BOI">AOP / BOI / Trust</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Financial Year <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newFY}
                    onChange={(e) => setNewFY(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs font-medium transition"
                  >
                    {POPULAR_INDIAN_FY_PRESETS.map((p) => (
                      <option key={p.cyYear} value={p.cyYear}>
                        FY {p.cyYear} (AY {p.assessmentYear}){p.isCurrentActive ? ' ★ Active Audit Year' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Starter Dataset Selection */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  Starter Template Setup
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'blank', label: '📄 Fresh Blank', desc: 'Upload own TB' },
                    { id: 'sample_partnership', label: '⚡ Sample Partnership', desc: 'Standard ledger set' },
                    { id: 'sample_proprietorship', label: '⚡ Sample Proprietor', desc: 'Retail trader set' },
                    { id: 'clone', label: '📋 Clone Existing', desc: 'Copy from saved' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setNewStarterType(item.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        newStarterType === item.id
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="block">{item.label}</span>
                      <span className="text-[10px] text-slate-500 block font-normal">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Clone source selector */}
              {newStarterType === 'clone' && companies.length > 0 && (
                <div className="space-y-1 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="font-semibold text-slate-700 block">Select Source Entity to Clone:</label>
                  <select
                    value={newCloneSourceId}
                    onChange={(e) => setNewCloneSourceId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs font-medium"
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.config.entityName} ({c.config.entityType})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Name of Proprietor for Sole Proprietorship */}
              {newEntityType === 'Sole Proprietorship' && (
                <div className="space-y-1 p-3 rounded-xl bg-amber-50/70 border border-amber-200">
                  <label className="font-semibold text-amber-950 block text-xs">
                    Name of Proprietor <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Shri Ramesh Kumar / Proprietor Legal Name"
                    value={newProprietorName}
                    onChange={(e) => setNewProprietorName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-amber-800 block">
                    Disclosed in Note 3 (Proprietor's Capital Account), Balance Sheet, and Statutory Sign-off
                  </span>
                </div>
              )}

              {/* Toggle Optional Additional Details */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdditionalDetails((prev) => !prev)}
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
                >
                  <span>{showAdditionalDetails ? '− Hide' : '+ Additional Details:'} Address, Signing Details, PAN, GSTIN &amp; Auditor</span>
                </button>

                {showAdditionalDetails && (
                  <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block">Registered Office / Principal Place of Business</label>
                      <input
                        type="text"
                        placeholder="e.g. Shop No. 4, Market Yard, Pune - 411037"
                        value={newRegisteredAddress}
                        onChange={(e) => setNewRegisteredAddress(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block">Place of Signing</label>
                        <input
                          type="text"
                          placeholder="e.g. Pune / Mumbai"
                          value={newPlaceOfSigning}
                          onChange={(e) => setNewPlaceOfSigning(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block">Date of Signing</label>
                        <input
                          type="text"
                          placeholder="e.g. March 31, 2025"
                          value={newDateOfSigning}
                          onChange={(e) => setNewDateOfSigning(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block">PAN Number</label>
                        <input
                          type="text"
                          maxLength={10}
                          placeholder="e.g. AAAPB1234C"
                          value={newPan}
                          onChange={(e) => setNewPan(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs uppercase"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block">GSTIN</label>
                        <input
                          type="text"
                          maxLength={15}
                          placeholder="e.g. 27AAAPB1234C1Z5"
                          value={newGstin}
                          onChange={(e) => setNewGstin(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs uppercase"
                        />
                      </div>
                    </div>

                    {/* Auditor / CA Firm Credentials */}
                    <div className="pt-2 border-t border-slate-200/80 space-y-2">
                      <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-[11px]">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Statutory Auditor &amp; CA Firm Credentials</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block">CA / Audit Firm Name</label>
                          <input
                            type="text"
                            placeholder="e.g. M/s Sutar & Associates"
                            value={newAuditorFirmName}
                            onChange={(e) => setNewAuditorFirmName(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block">Chartered Accountant Name</label>
                          <input
                            type="text"
                            placeholder="e.g. CA Vishal Sutar"
                            value={newAuditorName}
                            onChange={(e) => setNewAuditorName(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block">Role / Designation</label>
                          <select
                            value={newAuditorRole}
                            onChange={(e) => setNewAuditorRole(e.target.value as 'Partner' | 'Proprietor')}
                            className="w-full px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium"
                          >
                            <option value="Partner">Partner</option>
                            <option value="Proprietor">Proprietor</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block">Membership No.</label>
                          <input
                            type="text"
                            placeholder="e.g. 142536"
                            value={newMembershipNo}
                            onChange={(e) => setNewMembershipNo(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block">Firm Reg. No. (FRN)</label>
                          <input
                            type="text"
                            placeholder="e.g. 109876W"
                            value={newFirmRegNo}
                            onChange={(e) => setNewFirmRegNo(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block">UDIN (Unique Document Identification Number)</label>
                        <input
                          type="text"
                          placeholder="e.g. 25142536AAAAAA1234 (optional)"
                          value={newUdin}
                          onChange={(e) => setNewUdin(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs uppercase"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Partners and Sharing Ratios for Partnership Firm and LLP */}
              {(newEntityType === 'Partnership Firm' || newEntityType === 'LLP') && (
                <PartnerConfigForm
                  entityType={newEntityType}
                  partners={newPartners}
                  onChange={setNewPartners}
                  signingPartnerName={newSigningPartnerName}
                  onSigningPartnerChange={setNewSigningPartnerName}
                />
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!newEntityName.trim()}
                className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <span>Save &amp; Open Working Windows</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Edit Company Modal */}
      {editingCompany && editConfig && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl max-h-[90vh] overflow-y-auto w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-700" />
                <h3 className="font-bold text-sm text-slate-900">
                  Edit Company: {editingCompany.config.entityName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingCompany(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Entity Name</label>
                <input
                  type="text"
                  required
                  value={editConfig.entityName}
                  onChange={(e) => setEditConfig({ ...editConfig, entityName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Entity Type</label>
                  <select
                    value={editConfig.entityType}
                    onChange={(e) =>
                      setEditConfig({
                        ...editConfig,
                        entityType: e.target.value as any,
                        transferProfitTo: e.target.value === 'LLP' ? 'reserves' : 'partners_capital',
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                  >
                    <option value="Partnership Firm">Partnership Firm</option>
                    <option value="Sole Proprietorship">Sole Proprietorship</option>
                    <option value="LLP">LLP</option>
                    <option value="AOP/BOI">AOP/BOI</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Financial Year</label>
                  <select
                    value={editConfig.financialYear}
                    onChange={(e) => setEditConfig({ ...editConfig, financialYear: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                  >
                    {POPULAR_INDIAN_FY_PRESETS.map((p) => (
                      <option key={p.cyYear} value={p.cyYear}>
                        FY {p.cyYear}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">PAN</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={editConfig.pan || ''}
                    onChange={(e) => setEditConfig({ ...editConfig, pan: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">GSTIN</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={editConfig.gstin || ''}
                    onChange={(e) => setEditConfig({ ...editConfig, gstin: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs uppercase"
                  />
                </div>
              </div>

              {/* Name of Proprietor for Sole Proprietorship */}
              {editConfig.entityType === 'Sole Proprietorship' && (
                <div className="space-y-1 p-3 rounded-xl bg-amber-50/70 border border-amber-200">
                  <label className="font-semibold text-amber-950 block text-xs">
                    Name of Proprietor <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Shri Ramesh Kumar / Proprietor Legal Name"
                    value={editConfig.proprietorName || ''}
                    onChange={(e) => setEditConfig({ ...editConfig, proprietorName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-amber-800 block">
                    Disclosed in Note 3 (Proprietor's Capital Account), Balance Sheet, and Statutory Sign-off
                  </span>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Registered Office / Principal Place of Business</label>
                <input
                  type="text"
                  placeholder="e.g. Shop No. 4, Market Yard, Pune - 411037"
                  value={editConfig.registeredAddress || editConfig.address || ''}
                  onChange={(e) => setEditConfig({ ...editConfig, registeredAddress: e.target.value, address: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Place of Signing</label>
                  <input
                    type="text"
                    placeholder="e.g. Pune / Mumbai"
                    value={editConfig.placeOfSigning || ''}
                    onChange={(e) => setEditConfig({ ...editConfig, placeOfSigning: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Date of Signing</label>
                  <input
                    type="text"
                    placeholder="e.g. March 31, 2025"
                    value={editConfig.dateOfSigning || ''}
                    onChange={(e) => setEditConfig({ ...editConfig, dateOfSigning: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  />
                </div>
              </div>

              {/* Statutory Auditor & CA Firm Details */}
              <div className="border-t border-slate-200 pt-3 space-y-2.5">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>Statutory Auditor &amp; CA Firm Details</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 block">CA / Audit Firm Name</label>
                    <input
                      type="text"
                      placeholder="e.g. M/s Sutar & Associates"
                      value={editConfig.auditorFirmName || ''}
                      onChange={(e) => setEditConfig({ ...editConfig, auditorFirmName: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 block">Chartered Accountant Name</label>
                    <input
                      type="text"
                      placeholder="e.g. CA Vishal Sutar"
                      value={editConfig.auditorName || ''}
                      onChange={(e) => setEditConfig({ ...editConfig, auditorName: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 block">Role / Designation</label>
                    <select
                      value={editConfig.auditorRole || 'Partner'}
                      onChange={(e) =>
                        setEditConfig({
                          ...editConfig,
                          auditorRole: e.target.value as 'Partner' | 'Proprietor',
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium"
                    >
                      <option value="Partner">Partner</option>
                      <option value="Proprietor">Proprietor</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 block">ICAI Membership No.</label>
                    <input
                      type="text"
                      placeholder="e.g. 142536"
                      value={editConfig.auditorMembershipNo || ''}
                      onChange={(e) => setEditConfig({ ...editConfig, auditorMembershipNo: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 block">Firm Reg. No. (FRN)</label>
                    <input
                      type="text"
                      placeholder="e.g. 109876W"
                      value={editConfig.firmRegistrationNo || ''}
                      onChange={(e) => setEditConfig({ ...editConfig, firmRegistrationNo: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Unique Document Identification No. (UDIN)</label>
                  <input
                    type="text"
                    placeholder="e.g. 25142536AAAAAA1234 (optional)"
                    value={editConfig.udin || ''}
                    onChange={(e) => setEditConfig({ ...editConfig, udin: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs uppercase"
                  />
                </div>
              </div>

              {/* Partners and Sharing Ratios for Partnership Firm and LLP */}
              {(editConfig.entityType === 'Partnership Firm' || editConfig.entityType === 'LLP') && (
                <PartnerConfigForm
                  entityType={editConfig.entityType}
                  partners={editConfig.partners || []}
                  onChange={(updated) => setEditConfig({ ...editConfig, partners: updated })}
                  signingPartnerName={editConfig.signingPartnerName}
                  onSigningPartnerChange={(name) => setEditConfig({ ...editConfig, signingPartnerName: name })}
                />
              )}

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCompany(null)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCompany && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-center font-bold text-slate-900 text-sm">
              Delete Company Entity?
            </h3>
            <p className="text-center text-xs text-slate-500 mt-1">
              Are you sure you want to delete <span className="font-semibold text-slate-800">"{deletingCompany.name}"</span>?
              All mapped ledgers, uploaded trial balances, and financial adjustments for this client will be removed.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDeletingCompany(null)}
                className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteCompany(deletingCompany.id);
                  setDeletingCompany(null);
                }}
                className="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition shadow-xs"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
