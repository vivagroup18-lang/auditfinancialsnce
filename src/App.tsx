import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { IngestionPanel } from './components/IngestionPanel';
import { TrialBalanceMapping } from './components/TrialBalanceMapping';
import { BalanceSheetView } from './components/BalanceSheetView';
import { ProfitLossView } from './components/ProfitLossView';
import { NotesView } from './components/NotesView';
import { AuditReportView } from './components/AuditReportView';
import { EntityConfigModal } from './components/EntityConfigModal';
import { CompanyManagerModal } from './components/CompanyManagerModal';
import { UploadedStatementViewerModal } from './components/UploadedStatementViewerModal';
import { YearEndAdjustmentsModal } from './components/YearEndAdjustmentsModal';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { AIMappingAgentModal } from './components/AIMappingAgentModal';
import { GmailPanel } from './components/GmailPanel';
import { DrivePanel } from './components/DrivePanel';
import { AuthModal } from './components/AuthModal';
import { SubscriptionModal } from './components/SubscriptionModal';
import { UserProfileModal } from './components/UserProfileModal';
import { OnboardingModal } from './components/OnboardingModal';
import { ReferralModal } from './components/ReferralModal';
import { CompaniesWindow } from './components/CompaniesWindow';
import { StepByStepWorkspace } from './components/StepByStepWorkspace';
import { initAuth, googleSignIn, googleLogout } from './firebase';
import type { User } from 'firebase/auth';
import {
  EntityConfig,
  MappedLedger,
  TrialBalanceRow,
  AuditException,
  BalanceSheetData,
  ProfitAndLossData,
  NoteScheduleData,
  Company,
  UploadedStatementDoc,
  UserProfile,
  SubscriptionTier,
} from './types';
import {
  SAMPLE_DATASETS,
  sampleBalanceSheetDoc,
  sampleProfitAndLossDoc,
  samplePYBalanceSheetDoc,
  samplePYProfitAndLossDoc,
} from './data/sampleTrialBalances';
import { CREDIT_COSTS } from './data/subscriptionPlans';
import { mapTrialBalanceLedgers } from './utils/mappingEngine';
import { computeFinancialStatements } from './utils/financialCalculations';
import {
  parseTrialBalanceFile,
  parseTrialBalanceExcelOrCsv,
  parseNCEFormatsFile,
  exportFinancialStatementsToExcel,
  parseUploadedFinancialWorkbook,
  extractPriorYearFromUploadedStatements,
} from './utils/fileParsers';
import { generateAttractiveExcelReport } from './utils/excelExporter';
import {
  loadCompaniesFromStorage,
  saveCompaniesToStorage,
  saveActiveCompanyIdToStorage,
  loadActiveCompanyIdFromStorage,
  loadActiveUserFromStorage,
  logoutActiveUser,
  recordUserUsage,
  deductCredits,
} from './utils/storageManager';
import { NCE_NOTE_DEFINITIONS } from './data/nceTaxonomy';
import { CheckCircle2, AlertTriangle, Info, X, FileSpreadsheet, ArrowRight } from 'lucide-react';
import { FinancialYearChangeModal } from './components/FinancialYearChangeModal';

export default function App() {
  // Initial synchronous recovery from localStorage to prevent empty-state wipes
  const [companies, setCompanies] = useState<Company[]>(() => {
    try {
      const saved = loadCompaniesFromStorage();
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });

  const [activeCompanyId, setActiveCompanyId] = useState<string>(() => {
    try {
      const saved = loadCompaniesFromStorage();
      const storedId = loadActiveCompanyIdFromStorage();
      if (storedId && saved.some((c) => c.id === storedId)) {
        return storedId;
      }
      return saved[0]?.id || '';
    } catch {
      return '';
    }
  });

  // Ref to prevent active-variable sync effect from overwriting newly switched/created company
  const isSwitchingCompanyRef = useRef<boolean>(false);

  // Notification auto-dismiss timer ref
  const notificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derive initial active company if available
  const initialCompany = useMemo(() => {
    const saved = loadCompaniesFromStorage();
    const storedId = loadActiveCompanyIdFromStorage();
    if (storedId && saved.some((c) => c.id === storedId)) {
      return saved.find((c) => c.id === storedId) || saved[0];
    }
    return saved[0];
  }, []);

  // Active Company State Variables
  const [config, setConfig] = useState<EntityConfig>(() => {
    return initialCompany?.config || {
      entityName: '',
      entityType: 'Partnership Firm',
      financialYear: '2024-25',
      reportingPeriod: 'March 31, 2025',
      previousFinancialYear: '2023-24',
      previousReportingPeriod: 'March 31, 2024',
      taxRatePercent: 30,
      transferProfitTo: 'partners_capital',
    };
  });
  const [rawRows, setRawRows] = useState<TrialBalanceRow[]>(() => initialCompany?.rawRows || []);
  const [mappedLedgers, setMappedLedgers] = useState<MappedLedger[]>(() => initialCompany?.mappedLedgers || []);
  const [mappingExceptions, setMappingExceptions] = useState<AuditException[]>(() => initialCompany?.mappingExceptions || []);

  const [pyRawRows, setPyRawRows] = useState<TrialBalanceRow[]>(() => initialCompany?.pyRawRows || []);
  const [pyMappedLedgers, setPyMappedLedgers] = useState<MappedLedger[]>(() => initialCompany?.pyMappedLedgers || []);
  const [pyMappingExceptions, setPyMappingExceptions] = useState<AuditException[]>(() => initialCompany?.pyMappingExceptions || []);

  const [tbFileName, setTbFileName] = useState<string>(() => initialCompany?.tbFileName || '');
  const [pyFileName, setPyFileName] = useState<string>(() => initialCompany?.pyFileName || '');

  // Uploaded financial statements (Balance Sheet & Profit and Loss) - Current Year & Previous Year
  const [uploadedBalanceSheet, setUploadedBalanceSheet] = useState<UploadedStatementDoc | undefined>(() => initialCompany?.uploadedBalanceSheet);
  const [uploadedProfitAndLoss, setUploadedProfitAndLoss] = useState<UploadedStatementDoc | undefined>(() => initialCompany?.uploadedProfitAndLoss);
  const [uploadedPYBalanceSheet, setUploadedPYBalanceSheet] = useState<UploadedStatementDoc | undefined>(() => initialCompany?.uploadedPYBalanceSheet);
  const [uploadedPYProfitAndLoss, setUploadedPYProfitAndLoss] = useState<UploadedStatementDoc | undefined>(() => initialCompany?.uploadedPYProfitAndLoss);
  const [viewingStatementDoc, setViewingStatementDoc] = useState<UploadedStatementDoc | null>(null);

  // Navigation & Modals
  const [activeTab, setActiveTab] = useState<string>('ingestion');
  const [dashboardView, setDashboardView] = useState<'companies' | 'workspace'>(() => {
    const saved = loadCompaniesFromStorage();
    return saved && saved.length > 0 ? 'workspace' : 'companies';
  });
  const [workspaceStep, setWorkspaceStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedNoteNumber, setSelectedNoteNumber] = useState<number | undefined>(undefined);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);
  const [isYearEndAdjustmentsOpen, setIsYearEndAdjustmentsOpen] = useState(false);
  const [isCompanyManagerOpen, setIsCompanyManagerOpen] = useState(false);
  const [isBackupRestoreOpen, setIsBackupRestoreOpen] = useState(false);
  const [isAIMappingModalOpen, setIsAIMappingModalOpen] = useState(false);
  const [companyManagerInitialTab, setCompanyManagerInitialTab] = useState<'list' | 'add' | 'edit'>('list');

  // File metadata & status
  const [nceStatus, setNceStatus] = useState<{
    uploaded: boolean;
    fileName?: string;
    sheetCount?: number;
    details?: string;
  }>({
    uploaded: false,
    details: 'Statutory ICAI NCE Schedules (Notes 1 to 25) pre-configured and active',
  });

  const [isAIMapping, setIsAIMapping] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Authenticated User & SaaS Subscription State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      return loadActiveUserFromStorage();
    } catch {
      return null;
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'register'>('signin');
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [subscriptionUpgradeReason, setSubscriptionUpgradeReason] = useState<string | undefined>(undefined);

  // Gmail & Google Workspace Auth State (tokens cached in-memory only per security standards)
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [gmailInitialTemplateId, setGmailInitialTemplateId] = useState<string>('financial_statements_transmittal');

  // Check URL query param for ?ref=... on mount
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const refParam = params.get('ref');
      if (refParam && !currentUser) {
        setAuthModalTab('register');
        setIsAuthModalOpen(true);
        setNotification({
          type: 'info',
          message: `Referral code "${refParam}" applied! Complete signup to receive 500 bonus credits!`,
        });
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Sync active company count with current user profile usage
  useEffect(() => {
    if (currentUser) {
      if (currentUser.usage?.companiesCount !== companies.length) {
        recordUserUsage(currentUser.id, 'companies', companies.length);
        const reloaded = loadActiveUserFromStorage();
        if (reloaded) setCurrentUser(reloaded);
      }
    }
  }, [companies.length]);

  const handleAuthSuccess = useCallback((authedUser: UserProfile) => {
    setCurrentUser(authedUser);
    setNotification({
      type: 'success',
      message: `Signed in as ${authedUser.fullName} (⚡ ${authedUser.credits.toLocaleString()} Credits Available)`,
    });
  }, []);

  const handleGoogleAuthSuccess = useCallback((authedUser: UserProfile, isNewUser: boolean) => {
    setCurrentUser(authedUser);
    if (isNewUser || !authedUser.mobile) {
      setIsOnboardingModalOpen(true);
    } else {
      setNotification({
        type: 'success',
        message: `Welcome back, ${authedUser.fullName}! (⚡ ${authedUser.credits.toLocaleString()} Credits)`,
      });
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await googleLogout();
    } catch {}
    logoutActiveUser();
    setCurrentUser(null);
    setUser(null);
    setAccessToken(null);
    setNotification({
      type: 'info',
      message: 'You have been signed out.',
    });
  }, []);

  const handleSubscriptionUpdated = useCallback((updatedUser: UserProfile) => {
    setCurrentUser(updatedUser);
    setNotification({
      type: 'success',
      message: `Subscription updated! Balance: ⚡ ${updatedUser.credits.toLocaleString()} credits.`,
    });
  }, []);

  // Initialize Firebase Auth listener on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Auto-dismiss notifications after 6 seconds
  useEffect(() => {
    if (notification) {
      if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
      notificationTimerRef.current = setTimeout(() => setNotification(null), 6000);
    }
    return () => {
      if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    };
  }, [notification]);

  // Load saved companies on initial mount
  useEffect(() => {
    let savedCompanies = loadCompaniesFromStorage();
    // Fallback migration: check any previously saved user companies in localStorage
    if (!savedCompanies || savedCompanies.length === 0) {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('ca_user_') && key.endsWith('_companies_v2')) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed) && parsed.length > 0) {
                savedCompanies = parsed;
                saveCompaniesToStorage(savedCompanies);
                break;
              }
            }
          }
        }
      } catch (e) {
        console.error('Failed checking previous user companies:', e);
      }
    }

    const storedActiveId = loadActiveCompanyIdFromStorage();

    if (savedCompanies && savedCompanies.length > 0) {
      setCompanies(savedCompanies);
      const targetId = storedActiveId && savedCompanies.some((c) => c.id === storedActiveId)
        ? storedActiveId
        : savedCompanies[0].id;

      const activeComp = savedCompanies.find((c) => c.id === targetId) || savedCompanies[0];
      setActiveCompanyId(activeComp.id);
      setConfig({ ...activeComp.config });
      setRawRows([...(activeComp.rawRows || [])]);
      setMappedLedgers([...(activeComp.mappedLedgers || [])]);
      setMappingExceptions([...(activeComp.mappingExceptions || [])]);
      setPyRawRows([...(activeComp.pyRawRows || [])]);
      setPyMappedLedgers([...(activeComp.pyMappedLedgers || [])]);
      setPyMappingExceptions([...(activeComp.pyMappingExceptions || [])]);
      setTbFileName(activeComp.tbFileName || '');
      setPyFileName(activeComp.pyFileName || '');
      setUploadedBalanceSheet(activeComp.uploadedBalanceSheet);
      setUploadedProfitAndLoss(activeComp.uploadedProfitAndLoss);
      setUploadedPYBalanceSheet(activeComp.uploadedPYBalanceSheet);
      setUploadedPYProfitAndLoss(activeComp.uploadedPYProfitAndLoss);
    }
  }, []);

  // Persist companies whenever companies state changes
  useEffect(() => {
    if (companies.length > 0) {
      saveCompaniesToStorage(companies);
    }
  }, [companies]);

  useEffect(() => {
    if (activeCompanyId) {
      saveActiveCompanyIdToStorage(activeCompanyId);
    }
  }, [activeCompanyId]);

  // Sync active company variables back to main companies array
  useEffect(() => {
    if (!activeCompanyId || isSwitchingCompanyRef.current) return;
    setCompanies((prev) => {
      const exists = prev.some((c) => c.id === activeCompanyId);
      if (!exists) return prev;
      const updated = prev.map((c) => {
        if (c.id === activeCompanyId) {
          return {
            ...c,
            config,
            rawRows,
            mappedLedgers,
            mappingExceptions,
            pyRawRows,
            pyMappedLedgers,
            pyMappingExceptions,
            tbFileName,
            pyFileName,
            uploadedBalanceSheet,
            uploadedProfitAndLoss,
            uploadedPYBalanceSheet,
            uploadedPYProfitAndLoss,
            updatedAt: new Date().toISOString(),
          };
        }
        return c;
      });
      saveCompaniesToStorage(updated);
      return updated;
    });
  }, [
    config,
    rawRows,
    mappedLedgers,
    mappingExceptions,
    pyRawRows,
    pyMappedLedgers,
    pyMappingExceptions,
    tbFileName,
    pyFileName,
    uploadedBalanceSheet,
    uploadedProfitAndLoss,
    uploadedPYBalanceSheet,
    uploadedPYProfitAndLoss,
    activeCompanyId,
  ]);

  // Handler: Switch Active Company
  const handleSelectCompany = useCallback(
    (targetCompanyId: string) => {
      if (targetCompanyId === activeCompanyId) {
        setDashboardView('workspace');
        return;
      }
      const target = companies.find((c) => c.id === targetCompanyId);
      if (!target) return;

      isSwitchingCompanyRef.current = true;
      setActiveCompanyId(target.id);
      saveActiveCompanyIdToStorage(target.id);

      setConfig({ ...target.config });
      setRawRows([...(target.rawRows || [])]);
      setMappedLedgers([...(target.mappedLedgers || [])]);
      setMappingExceptions([...(target.mappingExceptions || [])]);
      setPyRawRows([...(target.pyRawRows || [])]);
      setPyMappedLedgers([...(target.pyMappedLedgers || [])]);
      setPyMappingExceptions([...(target.pyMappingExceptions || [])]);
      setTbFileName(target.tbFileName || '');
      setPyFileName(target.pyFileName || '');
      setUploadedBalanceSheet(target.uploadedBalanceSheet);
      setUploadedProfitAndLoss(target.uploadedProfitAndLoss);
      setUploadedPYBalanceSheet(target.uploadedPYBalanceSheet);
      setUploadedPYProfitAndLoss(target.uploadedPYProfitAndLoss);

      setDashboardView('workspace');

      setTimeout(() => {
        isSwitchingCompanyRef.current = false;
      }, 100);

      setNotification({
        type: 'info',
        message: `Switched active entity to: "${target.config.entityName}" (${target.config.entityType}).`,
      });
    },
    [activeCompanyId, companies]
  );

  // Handler: Add / Create New Company
  const handleCreateCompany = useCallback(
    (
      newConfig: EntityConfig,
      starterType: 'blank' | 'sample_partnership' | 'sample_proprietorship' | 'clone',
      cloneFromCompanyId?: string
    ) => {
      // Check active subscription quota before adding new company
      const activeUser = currentUser || loadActiveUserFromStorage();
      const maxAllowed = activeUser?.usage?.maxCompanies || 2;
      if (companies.length >= maxAllowed) {
        setSubscriptionUpgradeReason(
          `You have reached the ${maxAllowed}-company limit on your active ${activeUser?.planTier === 'professional' ? 'CA Professional' : 'Starter Free Trial'} plan. Upgrade to unlock up to 25 companies or unlimited enterprise clients.`
        );
        setIsSubscriptionModalOpen(true);
        setNotification({
          type: 'info',
          message: `Plan limit reached (${companies.length}/${maxAllowed} companies). Please upgrade to add more entities.`,
        });
        return;
      }

      isSwitchingCompanyRef.current = true;
      const newId = `comp-${Date.now()}`;
      let cyRows: TrialBalanceRow[] = [];
      let cyMapped: MappedLedger[] = [];
      let cyExceptions: AuditException[] = [];
      let pyRows: TrialBalanceRow[] = [];
      let pyMapped: MappedLedger[] = [];
      let pyExceptions: AuditException[] = [];
      let tbName = '';
      let pyName = '';

      if (starterType === 'sample_partnership') {
        const s = SAMPLE_DATASETS[0];
        cyRows = [...s.rows];
        const res = mapTrialBalanceLedgers(cyRows);
        cyMapped = res.mappedLedgers;
        cyExceptions = res.exceptions;
        tbName = `${newConfig.entityName} - CY Trial Balance.xlsx`;
        if (s.previousYearRows) {
          pyRows = [...s.previousYearRows];
          const pyRes = mapTrialBalanceLedgers(pyRows);
          pyMapped = pyRes.mappedLedgers;
          pyExceptions = pyRes.exceptions;
          pyName = `${newConfig.entityName} - PY Trial Balance.xlsx`;
        }
      } else if (starterType === 'sample_proprietorship') {
        const s = SAMPLE_DATASETS[1];
        cyRows = [...s.rows];
        const res = mapTrialBalanceLedgers(cyRows);
        cyMapped = res.mappedLedgers;
        cyExceptions = res.exceptions;
        tbName = `${newConfig.entityName} - Trial Balance.xlsx`;
      } else if (starterType === 'clone' && cloneFromCompanyId) {
        const sourceComp = companies.find((c) => c.id === cloneFromCompanyId);
        if (sourceComp) {
          cyRows = JSON.parse(JSON.stringify(sourceComp.rawRows || []));
          cyMapped = JSON.parse(JSON.stringify(sourceComp.mappedLedgers || []));
          cyExceptions = JSON.parse(JSON.stringify(sourceComp.mappingExceptions || []));
          pyRows = JSON.parse(JSON.stringify(sourceComp.pyRawRows || []));
          pyMapped = JSON.parse(JSON.stringify(sourceComp.pyMappedLedgers || []));
          pyExceptions = JSON.parse(JSON.stringify(sourceComp.pyMappingExceptions || []));
          tbName = sourceComp.tbFileName ? `${sourceComp.tbFileName} (Copy)` : '';
          pyName = sourceComp.pyFileName ? `${sourceComp.pyFileName} (Copy)` : '';
        }
      }

      const newCompany: Company = {
        id: newId,
        config: newConfig,
        rawRows: cyRows,
        mappedLedgers: cyMapped,
        mappingExceptions: cyExceptions,
        pyRawRows: pyRows,
        pyMappedLedgers: pyMapped,
        pyMappingExceptions: pyExceptions,
        tbFileName: tbName,
        pyFileName: pyName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Synchronously commit to state and localStorage immediately
      setCompanies((prev) => {
        const updated = [...prev, newCompany];
        saveCompaniesToStorage(updated);
        return updated;
      });

      // Switch to new company and persist active ID
      setActiveCompanyId(newId);
      saveActiveCompanyIdToStorage(newId);

      setConfig(newConfig);
      setRawRows(cyRows);
      setMappedLedgers(cyMapped);
      setMappingExceptions(cyExceptions);
      setPyRawRows(pyRows);
      setPyMappedLedgers(pyMapped);
      setPyMappingExceptions(pyExceptions);
      setTbFileName(tbName);
      setPyFileName(pyName);
      setUploadedBalanceSheet(undefined);
      setUploadedProfitAndLoss(undefined);
      setUploadedPYBalanceSheet(undefined);
      setUploadedPYProfitAndLoss(undefined);

      setIsCompanyManagerOpen(false);
      setDashboardView('workspace');

      setTimeout(() => {
        isSwitchingCompanyRef.current = false;
      }, 100);

      setNotification({
        type: 'success',
        message: `Saved & opened working windows for client entity: "${newConfig.entityName}"`,
      });
    },
    [companies]
  );

  // Handler: Update Existing Company Config
  const handleUpdateCompanyConfig = useCallback(
    (companyId: string, updatedConfig: EntityConfig) => {
      setCompanies((prev) => {
        const updated = prev.map((c) =>
          c.id === companyId
            ? { ...c, config: updatedConfig, updatedAt: new Date().toISOString() }
            : c
        );
        saveCompaniesToStorage(updated);
        return updated;
      });
      if (companyId === activeCompanyId) {
        setConfig(updatedConfig);
      }
      setNotification({
        type: 'success',
        message: `Updated parameters for "${updatedConfig.entityName}".`,
      });
    },
    [activeCompanyId]
  );

  const handleUpdateConfig = useCallback(
    (up: Partial<EntityConfig>) => {
      setConfig((prev) => {
        const next = { ...prev, ...up };
        if (activeCompanyId) {
          setCompanies((all) => {
            const updated = all.map((c) =>
              c.id === activeCompanyId
                ? { ...c, config: next, updatedAt: new Date().toISOString() }
                : c
            );
            saveCompaniesToStorage(updated);
            return updated;
          });
        }
        return next;
      });
    },
    [activeCompanyId]
  );

  // Handler: Delete Company
  const handleDeleteCompany = useCallback(
    (companyId: string) => {
      try {
        localStorage.removeItem(`ca_comp_entry_${companyId}`);
      } catch (e) {
        // ignore
      }

      const companyToDelete = companies.find((c) => c.id === companyId);
      const remaining = companies.filter((c) => c.id !== companyId);

      if (remaining.length === 0) {
        // When deleting the only existing company, reset to empty
        setCompanies([]);
        saveCompaniesToStorage([]);
        setActiveCompanyId('');
        saveActiveCompanyIdToStorage('');
        setConfig({
          entityName: '',
          entityType: 'Partnership Firm',
          financialYear: '2024-25',
          reportingPeriod: 'March 31, 2025',
          previousFinancialYear: '2023-24',
          previousReportingPeriod: 'March 31, 2024',
          taxRatePercent: 30,
          transferProfitTo: 'partners_capital',
        });
        setRawRows([]);
        setMappedLedgers([]);
        setMappingExceptions([]);
        setPyRawRows([]);
        setPyMappedLedgers([]);
        setPyMappingExceptions([]);
        setTbFileName('');
        setPyFileName('');
        setUploadedBalanceSheet(undefined);
        setUploadedProfitAndLoss(undefined);
        setUploadedPYBalanceSheet(undefined);
        setUploadedPYProfitAndLoss(undefined);
        setDashboardView('companies');

        setNotification({
          type: 'info',
          message: `Deleted "${companyToDelete?.config.entityName || 'Entity'}". Companies workspace reset.`,
        });
        return;
      }

      setCompanies(remaining);
      saveCompaniesToStorage(remaining);

      if (companyId === activeCompanyId) {
        const nextComp = remaining[0];
        setActiveCompanyId(nextComp.id);
        saveActiveCompanyIdToStorage(nextComp.id);

        setConfig(nextComp.config);
        setRawRows(nextComp.rawRows || []);
        setMappedLedgers(nextComp.mappedLedgers || []);
        setMappingExceptions(nextComp.mappingExceptions || []);
        setPyRawRows(nextComp.pyRawRows || []);
        setPyMappedLedgers(nextComp.pyMappedLedgers || []);
        setPyMappingExceptions(nextComp.pyMappingExceptions || []);
        setTbFileName(nextComp.tbFileName || '');
        setPyFileName(nextComp.pyFileName || '');
        setUploadedBalanceSheet(nextComp.uploadedBalanceSheet);
        setUploadedProfitAndLoss(nextComp.uploadedProfitAndLoss);
        setUploadedPYBalanceSheet(nextComp.uploadedPYBalanceSheet);
        setUploadedPYProfitAndLoss(nextComp.uploadedPYProfitAndLoss);

        setNotification({
          type: 'info',
          message: `Deleted "${companyToDelete?.config.entityName}". Switched to "${nextComp.config.entityName}".`,
        });
      } else {
        setNotification({
          type: 'success',
          message: `Deleted "${companyToDelete?.config.entityName}".`,
        });
      }
    },
    [activeCompanyId, companies]
  );

  // Handler: Duplicate Company
  const handleDuplicateCompany = useCallback(
    (companyId: string) => {
      const source = companies.find((c) => c.id === companyId);
      if (!source) return;

      isSwitchingCompanyRef.current = true;
      const newId = `comp-${Date.now()}`;
      const duplicated: Company = {
        ...JSON.parse(JSON.stringify(source)),
        id: newId,
        config: {
          ...source.config,
          entityName: `${source.config.entityName} (Copy)`,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setCompanies((prev) => {
        const updated = [...prev, duplicated];
        saveCompaniesToStorage(updated);
        return updated;
      });

      setActiveCompanyId(newId);
      saveActiveCompanyIdToStorage(newId);

      setConfig(duplicated.config);
      setRawRows(duplicated.rawRows || []);
      setMappedLedgers(duplicated.mappedLedgers || []);
      setMappingExceptions(duplicated.mappingExceptions || []);
      setPyRawRows(duplicated.pyRawRows || []);
      setPyMappedLedgers(duplicated.pyMappedLedgers || []);
      setPyMappingExceptions(duplicated.pyMappingExceptions || []);
      setTbFileName(duplicated.tbFileName || '');
      setPyFileName(duplicated.pyFileName || '');
      setUploadedBalanceSheet(duplicated.uploadedBalanceSheet);
      setUploadedProfitAndLoss(duplicated.uploadedProfitAndLoss);
      setUploadedPYBalanceSheet(duplicated.uploadedPYBalanceSheet);
      setUploadedPYProfitAndLoss(duplicated.uploadedPYProfitAndLoss);

      setDashboardView('workspace');
      setIsCompanyManagerOpen(false);

      setTimeout(() => {
        isSwitchingCompanyRef.current = false;
      }, 100);

      setNotification({
        type: 'success',
        message: `Duplicated entity "${source.config.entityName}". Switched to clone.`,
      });
    },
    [companies]
  );

  // Helper to open company manager
  const handleOpenCompanyManager = useCallback((tab: 'list' | 'add' | 'edit' = 'list') => {
    setDashboardView('companies');
    setActiveTab('ingestion');
  }, []);

  const loadDataset = (dataset: typeof SAMPLE_DATASETS[0]) => {
    const newConfig = {
      entityName: dataset.name,
      entityType: dataset.entityType,
      financialYear: dataset.financialYear,
      reportingPeriod: dataset.reportingPeriod || 'March 31, 2025',
      previousFinancialYear: dataset.previousFinancialYear || '2023-24',
      previousReportingPeriod: dataset.previousReportingPeriod || 'March 31, 2024',
      taxRatePercent: 30,
      transferProfitTo: 'partners_capital' as const,
    };

    const result = mapTrialBalanceLedgers(dataset.rows);
    const cyMapped = result.mappedLedgers;
    const cyExceptions = result.exceptions;

    let pyMapped: MappedLedger[] = [];
    let pyExceptions: AuditException[] = [];
    let pyFileName = '';
    let pyRows: TrialBalanceRow[] = [];

    if (dataset.previousYearRows && dataset.previousYearRows.length > 0) {
      pyRows = dataset.previousYearRows;
      pyFileName = dataset.name + ' - PY Trial Balance (FY ' + (dataset.previousFinancialYear || '2023-24') + ').xlsx';
      const pyResult = mapTrialBalanceLedgers(dataset.previousYearRows);
      pyMapped = pyResult.mappedLedgers;
      pyExceptions = pyResult.exceptions;
    }

    const tbName = dataset.name + ' - CY Trial Balance (FY ' + dataset.financialYear + ').xlsx';

    // If no company is active, create a new one for this dataset
    if (!activeCompanyId || companies.length === 0) {
      const newId = `comp-sample-${Date.now()}`;
      const newCompany: Company = {
        id: newId,
        config: newConfig,
        rawRows: dataset.rows,
        mappedLedgers: cyMapped,
        mappingExceptions: cyExceptions,
        pyRawRows: pyRows,
        pyMappedLedgers: pyMapped,
        pyMappingExceptions: pyExceptions,
        tbFileName: tbName,
        pyFileName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setCompanies([newCompany]);
      setActiveCompanyId(newId);
    }

    // Set all active company state
    setRawRows(dataset.rows);
    setTbFileName(tbName);
    setConfig((prev) => ({ ...prev, ...newConfig }));
    setMappedLedgers(cyMapped);
    setMappingExceptions(cyExceptions);
    setPyRawRows(pyRows);
    setPyFileName(pyFileName);
    setPyMappedLedgers(pyMapped);
    setPyMappingExceptions(pyExceptions);
    // Clear any previously uploaded statement docs
    setUploadedBalanceSheet(undefined);
    setUploadedProfitAndLoss(undefined);
    setUploadedPYBalanceSheet(undefined);
    setUploadedPYProfitAndLoss(undefined);

    setNotification({
      type: 'success',
      message: `Loaded ${dataset.rows.length} CY ledgers & ${dataset.previousYearRows?.length || 0} PY comparative ledgers from ${dataset.name}.`,
    });

    setActiveTab('mapping');
  };

  // Prior year comparative figures extracted from uploaded statements (dedicated PY uploads or comparative columns)
  const importedPriorStatements = useMemo(() => {
    return extractPriorYearFromUploadedStatements(
      uploadedBalanceSheet,
      uploadedProfitAndLoss,
      uploadedPYBalanceSheet,
      uploadedPYProfitAndLoss
    );
  }, [uploadedBalanceSheet, uploadedProfitAndLoss, uploadedPYBalanceSheet, uploadedPYProfitAndLoss]);

  // Recompute Financial Statements whenever mappedLedgers, pyMappedLedgers, config, or uploaded statements change
  const computed = useMemo(() => {
    return computeFinancialStatements(
      mappedLedgers || [],
      config,
      pyMappedLedgers || [],
      pyFileName,
      importedPriorStatements
    );
  }, [mappedLedgers, config, pyMappedLedgers, pyFileName, importedPriorStatements]);

  // Combined Audit Exceptions
  const allExceptions = useMemo(() => {
    const cyList = mappingExceptions.map((exc, i) => ({
      ...exc,
      id: exc.id.startsWith('cy-') ? exc.id : `cy-${exc.id}-${i}`,
    }));
    const pyList = pyMappingExceptions.map((exc, i) => ({
      ...exc,
      id: exc.id.startsWith('py-') ? exc.id : `py-${exc.id}-${i}`,
      message: `[PY comparative] ${exc.message}`,
    }));
    const compList = (computed?.computationExceptions || []).map((exc, i) => ({
      ...exc,
      id: exc.id.startsWith('comp-') ? exc.id : `comp-${exc.id}-${i}`,
    }));
    return [...cyList, ...pyList, ...compList];
  }, [mappingExceptions, pyMappingExceptions, computed]);

  // Totals for Current Year Trial Balance
  const { totalDebit, totalCredit, tallyDifference, isTallyBalanced } = useMemo(() => {
    let dr = 0;
    let cr = 0;
    mappedLedgers.forEach((l) => {
      dr += l.originalDebit;
      cr += l.originalCredit;
    });
    const diff = Math.round((dr - cr) * 100) / 100;
    return {
      totalDebit: dr,
      totalCredit: cr,
      tallyDifference: diff,
      isTallyBalanced: Math.abs(diff) < 1,
    };
  }, [mappedLedgers]);

  // Totals for Previous Year Trial Balance
  const { pyTotalDebit, pyTotalCredit, pyTallyDifference, isPYTallyBalanced } = useMemo(() => {
    let dr = 0;
    let cr = 0;
    pyMappedLedgers.forEach((l) => {
      dr += l.originalDebit;
      cr += l.originalCredit;
    });
    const diff = Math.round((dr - cr) * 100) / 100;
    return {
      pyTotalDebit: dr,
      pyTotalCredit: cr,
      pyTallyDifference: diff,
      isPYTallyBalanced: Math.abs(diff) < 1,
    };
  }, [pyMappedLedgers]);

  // Handle Note Reassignment by user (Current Year)
  const handleUpdateLedgerNote = useCallback((ledgerId: string, newNoteNumber: number) => {
    setMappedLedgers((prev) =>
      prev.map((l) => {
        if (l.id === ledgerId) {
          const noteDef = NCE_NOTE_DEFINITIONS.find((n) => n.noteNumber === newNoteNumber);
          return {
            ...l,
            noteNumber: newNoteNumber,
            noteName: noteDef?.name || `Note ${newNoteNumber}`,
            statement: noteDef?.statement || 'BalanceSheet',
            subCategory: noteDef?.subCategories?.[0] || l.subCategory,
            isUserOverridden: true,
          };
        }
        return l;
      })
    );
  }, []);

  // Handle Note Reassignment by user (Previous Year)
  const handleUpdatePyLedgerNote = useCallback((ledgerId: string, newNoteNumber: number) => {
    setPyMappedLedgers((prev) =>
      prev.map((l) => {
        if (l.id === ledgerId) {
          const noteDef = NCE_NOTE_DEFINITIONS.find((n) => n.noteNumber === newNoteNumber);
          return {
            ...l,
            noteNumber: newNoteNumber,
            noteName: noteDef?.name || `Note ${newNoteNumber}`,
            statement: noteDef?.statement || 'BalanceSheet',
            subCategory: noteDef?.subCategories?.[0] || l.subCategory,
            isUserOverridden: true,
          };
        }
        return l;
      })
    );
  }, []);

  // Handle full Ledger Alteration (Text, Code, Debit, Credit, Note, SubCategory)
  const handleUpdateLedgerDetails = useCallback(
    (ledgerId: string, updatedFields: Partial<MappedLedger>, isPY: boolean = false) => {
      const setter = isPY ? setPyMappedLedgers : setMappedLedgers;
      setter((prev) =>
        prev.map((l) => {
          if (l.id === ledgerId) {
            const noteNum = updatedFields.noteNumber !== undefined ? updatedFields.noteNumber : l.noteNumber;
            const noteDef = NCE_NOTE_DEFINITIONS.find((n) => n.noteNumber === noteNum);
            const originalDebit =
              updatedFields.originalDebit !== undefined ? Number(updatedFields.originalDebit) : l.originalDebit;
            const originalCredit =
              updatedFields.originalCredit !== undefined ? Number(updatedFields.originalCredit) : l.originalCredit;
            const netBalance = Math.round((originalDebit - originalCredit) * 100) / 100;

            const updated: MappedLedger = {
              ...l,
              ...updatedFields,
              originalDebit,
              originalCredit,
              netBalance,
              noteNumber: noteNum,
              noteName: noteDef?.name || l.noteName,
              statement: noteDef?.statement || l.statement,
              nature: noteDef?.nature || l.nature,
              subCategory: updatedFields.subCategory || noteDef?.subCategories?.[0] || l.subCategory,
              isUserOverridden: true,
              mappingMethod: 'manual',
            };
            return updated;
          }
          return l;
        })
      );
      setNotification({
        type: 'success',
        message: `Updated ledger "${updatedFields.accountName || 'entry'}" text and parameters.`,
      });
    },
    []
  );

  // Handle Manual Addition of a new Ledger Account
  const handleAddLedger = useCallback(
    (newLedgerData: Partial<MappedLedger>, isPY: boolean = false) => {
      const setter = isPY ? setPyMappedLedgers : setMappedLedgers;
      const noteNum = newLedgerData.noteNumber || 20;
      const noteDef = NCE_NOTE_DEFINITIONS.find((n) => n.noteNumber === noteNum);
      const originalDebit = Number(newLedgerData.originalDebit || 0);
      const originalCredit = Number(newLedgerData.originalCredit || 0);
      const netBalance = Math.round((originalDebit - originalCredit) * 100) / 100;

      const newLedger: MappedLedger = {
        id: `manual-${Date.now()}`,
        accountCode: newLedgerData.accountCode || '',
        accountName: newLedgerData.accountName || 'New Ledger Account',
        originalDebit,
        originalCredit,
        netBalance,
        nature: noteDef?.nature || 'Income',
        statement: noteDef?.statement || 'ProfitAndLoss',
        noteNumber: noteNum,
        noteName: noteDef?.name || 'Note 20: Other Income',
        subCategory: newLedgerData.subCategory || noteDef?.subCategories?.[0] || 'General',
        confidence: 1.0,
        isUserOverridden: true,
        mappingMethod: 'manual',
      };

      setter((prev) => [...prev, newLedger]);
      setNotification({
        type: 'success',
        message: `Added new trial balance ledger "${newLedger.accountName}" to ${isPY ? 'Previous Year' : 'Current Year'}.`,
      });
    },
    []
  );

  // Handle Deleting a Ledger Entry
  const handleDeleteLedger = useCallback(
    (ledgerIdentifier: string, isPY: boolean = false) => {
      const setter = isPY ? setPyMappedLedgers : setMappedLedgers;
      setter((prev) => {
        const target = prev.find((l) => l.id === ledgerIdentifier || l.accountName === ledgerIdentifier);
        if (target) {
          setNotification({
            type: 'info',
            message: `Deleted ledger "${target.accountName}" from ${isPY ? 'Previous Year' : 'Current Year'} Trial Balance.`,
          });
        }
        return prev.filter((l) => (l.id ? l.id !== ledgerIdentifier : l.accountName !== ledgerIdentifier));
      });

      // Synchronize raw rows array so row counts and re-computation stay consistent
      if (isPY) {
        setPyRawRows((prev) => prev.filter((r) => r.id !== ledgerIdentifier && r.accountName !== ledgerIdentifier));
      } else {
        setRawRows((prev) => prev.filter((r) => r.id !== ledgerIdentifier && r.accountName !== ledgerIdentifier));
      }
    },
    []
  );

  // Handle Clear Current Year Trial Balance
  const handleClearTB = useCallback(() => {
    setRawRows([]);
    setMappedLedgers([]);
    setTbFileName('');
    setMappingExceptions([]);
    setNotification({
      type: 'info',
      message: 'Current Year Trial Balance cleared. All mapped notes and schedules have been reset.',
    });
  }, []);

  // Handle File Upload: Current Year Trial Balance
  const handleUploadTB = async (file: File) => {
    try {
      setNotification({ type: 'info', message: `Parsing Current Year TB (${file.name})...` });
      const parsedRows = await parseTrialBalanceFile(file);

      if (parsedRows.length === 0) {
        throw new Error('No valid ledger rows found in the uploaded file.');
      }

      // Perform mapping
      const result = mapTrialBalanceLedgers(parsedRows);

      // If no company is active yet, create one automatically
      if (!activeCompanyId || companies.length === 0) {
        const entityName = file.name.replace(/\.(xlsx?|csv|pdf|txt)$/i, '').replace(/[-_]/g, ' ').trim() || 'New Entity';
        const newId = `comp-uploaded-${Date.now()}`;
        const newCfg = { ...config, entityName };
        const newCompany: Company = {
          id: newId,
          config: newCfg,
          rawRows: parsedRows,
          mappedLedgers: result.mappedLedgers,
          mappingExceptions: result.exceptions,
          pyRawRows: [],
          pyMappedLedgers: [],
          pyMappingExceptions: [],
          tbFileName: file.name,
          pyFileName: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setCompanies([newCompany]);
        setActiveCompanyId(newId);
        setConfig(newCfg);
      }

      setRawRows(parsedRows);
      setTbFileName(file.name);
      setMappedLedgers(result.mappedLedgers);
      setMappingExceptions(result.exceptions);

      setNotification({
        type: 'success',
        message: `Successfully loaded ${parsedRows.length} CY ledgers from ${file.name}! Use the AI Mapping Agent to review or auto-classify statutory schedules.`,
      });

      // Navigate to mapping view
      setActiveTab('mapping');
    } catch (err: any) {
      console.error('Error parsing Trial Balance:', err);
      setNotification({
        type: 'error',
        message: err.message || 'Failed to parse Current Year Trial Balance file.',
      });
    }
  };

  // Handle File Upload: Previous Year Trial Balance (Comparative)
  const handleUploadPYTB = async (file: File) => {
    try {
      setNotification({ type: 'info', message: `Parsing Previous Year TB (${file.name})...` });
      const parsedRows = await parseTrialBalanceFile(file);

      if (parsedRows.length === 0) {
        throw new Error('No valid ledger rows found in the uploaded Previous Year file.');
      }

      setPyRawRows(parsedRows);
      setPyFileName(file.name);

      // Perform mapping
      const result = mapTrialBalanceLedgers(parsedRows);
      setPyMappedLedgers(result.mappedLedgers);
      setPyMappingExceptions(result.exceptions);

      setNotification({
        type: 'success',
        message: `Successfully loaded ${parsedRows.length} Previous Year ledgers from ${file.name}. Exact comparative columns populated!`,
      });
    } catch (err: any) {
      console.error('Error parsing Previous Year Trial Balance:', err);
      setNotification({
        type: 'error',
        message: err.message || 'Failed to parse Previous Year Trial Balance file.',
      });
    }
  };

  // Handle Clear Previous Year Trial Balance
  const handleClearPYTB = () => {
    setPyRawRows([]);
    setPyMappedLedgers([]);
    setPyFileName('');
    setPyMappingExceptions([]);
    setNotification({
      type: 'info',
      message: 'Previous Year Trial Balance cleared. Standard comparative benchmarks will be applied.',
    });
  };

  // Handle direct import from Google Drive
  const handleImportDriveTrialBalance = useCallback(
    (parsedRows: TrialBalanceRow[], fileName: string, isPY: boolean = false) => {
      const result = mapTrialBalanceLedgers(parsedRows);
      if (isPY) {
        setPyRawRows(parsedRows);
        setPyFileName(fileName);
        setPyMappedLedgers(result.mappedLedgers);
        setPyMappingExceptions(result.exceptions);
        setNotification({
          type: 'success',
          message: `Imported ${parsedRows.length} Previous Year comparative ledgers from Google Drive: "${fileName}".`,
        });
      } else {
        setRawRows(parsedRows);
        setTbFileName(fileName);
        setMappedLedgers(result.mappedLedgers);
        setMappingExceptions(result.exceptions);
        setNotification({
          type: 'success',
          message: `Imported ${parsedRows.length} Current Year ledgers from Google Drive: "${fileName}".`,
        });
        setActiveTab('mapping');
      }
    },
    []
  );

  // Handle restoring backup from Google Drive
  const handleRestoreBackup = useCallback((backupData: any) => {
    if (backupData && backupData.company) {
      const comp = backupData.company;
      if (comp.config) setConfig(comp.config);
      if (comp.rawRows) setRawRows(comp.rawRows);
      if (comp.mappedLedgers) setMappedLedgers(comp.mappedLedgers);
      if (comp.mappingExceptions) setMappingExceptions(comp.mappingExceptions);
      if (comp.pyRawRows) setPyRawRows(comp.pyRawRows);
      if (comp.pyMappedLedgers) setPyMappedLedgers(comp.pyMappedLedgers);
      if (comp.pyMappingExceptions) setPyMappingExceptions(comp.pyMappingExceptions);
      if (comp.tbFileName) setTbFileName(comp.tbFileName);
      if (comp.pyFileName) setPyFileName(comp.pyFileName);

      setCompanies((prev) => {
        const idx = prev.findIndex((c) => c.id === comp.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = comp;
          saveCompaniesToStorage(copy);
          return copy;
        } else {
          const updated = [...prev, comp];
          saveCompaniesToStorage(updated);
          return updated;
        }
      });
      setActiveCompanyId(comp.id);
      saveActiveCompanyIdToStorage(comp.id);

      setNotification({
        type: 'success',
        message: `Restored full audit company data for "${comp.config?.entityName || 'Entity'}" from Google Drive!`,
      });
      setActiveTab('ingestion');
    }
  }, []);

  // Handle Upload: Audited Balance Sheet
  const handleUploadBalanceSheet = async (file: File) => {
    try {
      setNotification({ type: 'info', message: `Parsing Balance Sheet from ${file.name}...` });
      const buffer = await file.arrayBuffer();
      const res = parseUploadedFinancialWorkbook(buffer, file.name, 'BalanceSheet');
      if (res.balanceSheet) {
        setUploadedBalanceSheet(res.balanceSheet);
        setNotification({
          type: 'success',
          message: `Loaded Balance Sheet "${file.name}" with ${res.balanceSheet.items.length} line items (Reported Total: ₹${res.balanceSheet.detectedTotal?.toLocaleString('en-IN') || 0}). AI Agent will now use this for schedule linking!`,
        });
      } else {
        throw new Error('No valid Balance Sheet line items identified in file.');
      }
    } catch (err: any) {
      console.error('Error parsing Balance Sheet:', err);
      setNotification({
        type: 'error',
        message: err.message || 'Failed to parse Balance Sheet file.',
      });
    }
  };

  // Handle Upload: Statement of Profit and Loss
  const handleUploadProfitAndLoss = async (file: File) => {
    try {
      setNotification({ type: 'info', message: `Parsing Statement of Profit & Loss from ${file.name}...` });
      const buffer = await file.arrayBuffer();
      const res = parseUploadedFinancialWorkbook(buffer, file.name, 'ProfitAndLoss');
      if (res.profitAndLoss) {
        setUploadedProfitAndLoss(res.profitAndLoss);
        setNotification({
          type: 'success',
          message: `Loaded Profit & Loss "${file.name}" with ${res.profitAndLoss.items.length} line items. AI Agent will now use this for schedule linking!`,
        });
      } else {
        throw new Error('No valid Profit & Loss line items identified in file.');
      }
    } catch (err: any) {
      console.error('Error parsing Profit & Loss:', err);
      setNotification({
        type: 'error',
        message: err.message || 'Failed to parse Profit & Loss file.',
      });
    }
  };

  // Handle Upload: Combined Financials Workbook (Contains both BS and P&L tabs)
  const handleUploadCombinedStatements = async (file: File) => {
    try {
      setNotification({ type: 'info', message: `Scanning combined workbook ${file.name}...` });
      const buffer = await file.arrayBuffer();
      const res = parseUploadedFinancialWorkbook(buffer, file.name);
      let details = [];
      if (res.balanceSheet) {
        setUploadedBalanceSheet(res.balanceSheet);
        details.push(`Balance Sheet (${res.balanceSheet.items.length} lines)`);
      }
      if (res.profitAndLoss) {
        setUploadedProfitAndLoss(res.profitAndLoss);
        details.push(`Profit & Loss (${res.profitAndLoss.items.length} lines)`);
      }
      if (!res.balanceSheet && !res.profitAndLoss) {
        throw new Error('Neither Balance Sheet nor Profit & Loss sheets were recognized in file.');
      }
      setNotification({
        type: 'success',
        message: `Successfully imported ${details.join(' and ')} from ${file.name}! Ready for AI schedule linking.`,
      });
    } catch (err: any) {
      console.error('Error parsing combined workbook:', err);
      setNotification({
        type: 'error',
        message: err.message || 'Failed to parse combined workbook.',
      });
    }
  };

  // Handle Clear Balance Sheet
  const handleClearBalanceSheet = () => {
    setUploadedBalanceSheet(undefined);
    setNotification({
      type: 'info',
      message: 'Uploaded Balance Sheet removed.',
    });
  };

  // Handle Clear Profit and Loss
  const handleClearProfitAndLoss = () => {
    setUploadedProfitAndLoss(undefined);
    setNotification({
      type: 'info',
      message: 'Uploaded Current Year Profit and Loss removed.',
    });
  };

  // Handle Load Sample Audited Financial Statements (Current Year)
  const handleLoadSampleStatements = () => {
    setUploadedBalanceSheet(sampleBalanceSheetDoc);
    setUploadedProfitAndLoss(sampleProfitAndLossDoc);
    setNotification({
      type: 'success',
      message: `Loaded sample audited CY Balance Sheet (${sampleBalanceSheetDoc.items.length} items) & Profit & Loss (${sampleProfitAndLossDoc.items.length} items).`,
    });
  };

  // ================= PREVIOUS YEAR STATEMENT UPLOAD HANDLERS =================
  // Handle Upload: Audited Balance Sheet for Previous Year
  const handleUploadPYBalanceSheet = async (file: File) => {
    try {
      setNotification({ type: 'info', message: `Parsing Previous Year Balance Sheet from ${file.name}...` });
      const buffer = await file.arrayBuffer();
      const res = parseUploadedFinancialWorkbook(buffer, file.name, 'PYBalanceSheet');
      if (res.pyBalanceSheet || res.balanceSheet) {
        const doc = res.pyBalanceSheet || res.balanceSheet!;
        doc.period = 'PY';
        setUploadedPYBalanceSheet(doc);
        setNotification({
          type: 'success',
          message: `Loaded Previous Year Balance Sheet "${file.name}" with ${doc.items.length} line items (Reported Total: ₹${doc.detectedTotal?.toLocaleString('en-IN') || 0}). Comparative schedule columns & AI linking ready!`,
        });
      } else {
        throw new Error('No valid Previous Year Balance Sheet line items identified in file.');
      }
    } catch (err: any) {
      console.error('Error parsing PY Balance Sheet:', err);
      setNotification({
        type: 'error',
        message: err.message || 'Failed to parse Previous Year Balance Sheet file.',
      });
    }
  };

  // Handle Upload: Statement of Profit and Loss for Previous Year
  const handleUploadPYProfitAndLoss = async (file: File) => {
    try {
      setNotification({ type: 'info', message: `Parsing Previous Year Profit & Loss from ${file.name}...` });
      const buffer = await file.arrayBuffer();
      const res = parseUploadedFinancialWorkbook(buffer, file.name, 'PYProfitAndLoss');
      if (res.pyProfitAndLoss || res.profitAndLoss) {
        const doc = res.pyProfitAndLoss || res.profitAndLoss!;
        doc.period = 'PY';
        setUploadedPYProfitAndLoss(doc);
        setNotification({
          type: 'success',
          message: `Loaded Previous Year Profit & Loss "${file.name}" with ${doc.items.length} line items. Comparative figures & AI schedule linking ready!`,
        });
      } else {
        throw new Error('No valid Previous Year Profit & Loss line items identified in file.');
      }
    } catch (err: any) {
      console.error('Error parsing PY Profit & Loss:', err);
      setNotification({
        type: 'error',
        message: err.message || 'Failed to parse Previous Year Profit & Loss file.',
      });
    }
  };

  // Handle Upload: Combined Financials Workbook for Previous Year (Contains PY BS and PY P&L tabs)
  const handleUploadCombinedPYStatements = async (file: File) => {
    try {
      setNotification({ type: 'info', message: `Scanning combined Previous Year workbook ${file.name}...` });
      const buffer = await file.arrayBuffer();
      const res = parseUploadedFinancialWorkbook(buffer, file.name);
      let details = [];
      const bsDoc = res.pyBalanceSheet || res.balanceSheet;
      if (bsDoc) {
        bsDoc.period = 'PY';
        setUploadedPYBalanceSheet(bsDoc);
        details.push(`PY Balance Sheet (${bsDoc.items.length} lines)`);
      }
      const plDoc = res.pyProfitAndLoss || res.profitAndLoss;
      if (plDoc) {
        plDoc.period = 'PY';
        setUploadedPYProfitAndLoss(plDoc);
        details.push(`PY Profit & Loss (${plDoc.items.length} lines)`);
      }
      if (!bsDoc && !plDoc) {
        throw new Error('Neither Balance Sheet nor Profit & Loss sheets were recognized in file.');
      }
      setNotification({
        type: 'success',
        message: `Successfully imported ${details.join(' and ')} from ${file.name} for Previous Year! Ready for comparative financials & AI linking.`,
      });
    } catch (err: any) {
      console.error('Error parsing combined PY workbook:', err);
      setNotification({
        type: 'error',
        message: err.message || 'Failed to parse combined Previous Year workbook.',
      });
    }
  };

  // Handle Clear Previous Year Balance Sheet
  const handleClearPYBalanceSheet = () => {
    setUploadedPYBalanceSheet(undefined);
    setNotification({
      type: 'info',
      message: 'Uploaded Previous Year Balance Sheet removed.',
    });
  };

  // Handle Clear Previous Year Profit and Loss
  const handleClearPYProfitAndLoss = () => {
    setUploadedPYProfitAndLoss(undefined);
    setNotification({
      type: 'info',
      message: 'Uploaded Previous Year Profit and Loss removed.',
    });
  };

  // Handle Load Sample Previous Year Financial Statements
  const handleLoadSamplePYStatements = () => {
    setUploadedPYBalanceSheet(samplePYBalanceSheetDoc);
    setUploadedPYProfitAndLoss(samplePYProfitAndLossDoc);
    setNotification({
      type: 'success',
      message: `Loaded sample audited Previous Year Balance Sheet (${samplePYBalanceSheetDoc.items.length} items) & PY Profit & Loss (${samplePYProfitAndLossDoc.items.length} items).`,
    });
  };

  // Handle File Upload: NCE formats.xlsx
  const handleUploadNCE = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const res = parseNCEFormatsFile(buffer);
      setNceStatus({
        uploaded: true,
        fileName: file.name,
        sheetCount: res.sheetNames.length,
        details: res.details,
      });
      setNotification({
        type: 'success',
        message: `Loaded ${file.name}: ${res.details}`,
      });
    } catch (err: any) {
      console.error('Error parsing NCE template:', err);
      setNotification({
        type: 'error',
        message: 'Could not parse NCE formats template.',
      });
    }
  };

  // Handle Trigger AI Semantic Mapping via AI Agent Modal
  const handleTriggerAIMap = () => {
    if (mappedLedgers.length === 0) {
      setNotification({ type: 'info', message: 'Please upload a Trial Balance first before launching the AI Mapping Agent.' });
      return;
    }

    // Claude-style Credit Check for AI Mapping
    const activeUser = currentUser || loadActiveUserFromStorage();
    if (activeUser && typeof activeUser.credits === 'number' && activeUser.credits < CREDIT_COSTS.AI_MAPPING) {
      setSubscriptionUpgradeReason(
        `Insufficient Credits: AI Schedule Mapping requires ${CREDIT_COSTS.AI_MAPPING} credits, but you currently have ${activeUser.credits} credits. Top up instant credits, upgrade your plan, or invite a colleague to claim 500 free credits!`
      );
      setIsSubscriptionModalOpen(true);
      setNotification({
        type: 'error',
        message: `Low credits (${activeUser.credits} available). ${CREDIT_COSTS.AI_MAPPING} credits needed for AI Mapping.`,
      });
      return;
    }

    setIsAIMappingModalOpen(true);
  };

  // Handle applying AI Schedule Mapping changes to the Master State
  const handleApplyAIMappings = (updatedLedgers: MappedLedger[]) => {
    setMappedLedgers(updatedLedgers);
    if (activeCompanyId) {
      setCompanies((prev) =>
        prev.map((c) =>
          c.id === activeCompanyId
            ? { ...c, mappedLedgers: updatedLedgers, updatedAt: new Date().toISOString() }
            : c
        )
      );
    }

    // Deduct credits and record AI mapping usage
    const activeUser = currentUser || loadActiveUserFromStorage();
    if (activeUser) {
      deductCredits(
        activeUser.id,
        CREDIT_COSTS.AI_MAPPING,
        `AI Schedule Mapping applied (${updatedLedgers.length} ledgers)`,
        'AI_MAPPING'
      );
      recordUserUsage(activeUser.id, 'aiMappings', 1);
      const reloaded = loadActiveUserFromStorage();
      if (reloaded) setCurrentUser(reloaded);
    }

    setNotification({
      type: 'success',
      message: `AI Schedule Mapping applied! Deducted ${CREDIT_COSTS.AI_MAPPING} credits (Remaining: ${(activeUser?.credits || 5) - CREDIT_COSTS.AI_MAPPING}).`,
    });
  };

  // Handle Export Excel with credit check
  const handleExportExcel = () => {
    if (!computed) {
      setNotification({ type: 'error', message: 'No financial statements available to export.' });
      return;
    }

    // Credit check
    const activeUser = currentUser || loadActiveUserFromStorage();
    if (activeUser && typeof activeUser.credits === 'number' && activeUser.credits < CREDIT_COSTS.EXCEL_EXPORT) {
      setSubscriptionUpgradeReason(
        `Insufficient Credits: Statutory Excel Workbook Export requires ${CREDIT_COSTS.EXCEL_EXPORT} credits. You have ${activeUser.credits} credits remaining. Top up credits or invite a colleague to claim 500 free credits!`
      );
      setIsSubscriptionModalOpen(true);
      setNotification({
        type: 'error',
        message: `Low credits (${activeUser.credits} available). ${CREDIT_COSTS.EXCEL_EXPORT} credits needed to export formatted Excel report.`,
      });
      return;
    }

    try {
      generateAttractiveExcelReport({
        entityConfig: config,
        balanceSheet: computed.balanceSheet,
        profitAndLoss: computed.profitAndLoss,
        noteSchedules: computed.noteSchedules,
        exceptions: allExceptions,
        rawRows,
        mappedLedgers,
      });

      if (activeUser) {
        deductCredits(
          activeUser.id,
          CREDIT_COSTS.EXCEL_EXPORT,
          `Statutory Excel Workbook Export (${config.entityName})`,
          'EXCEL_EXPORT'
        );
        const reloaded = loadActiveUserFromStorage();
        if (reloaded) setCurrentUser(reloaded);
      }

      setNotification({
        type: 'success',
        message: `Exported full Financial Statements & Notes to formatted Excel (.xlsx)! Deducted ${CREDIT_COSTS.EXCEL_EXPORT} credits.`,
      });
    } catch (err: any) {
      console.error('Export error:', err);
      setNotification({ type: 'error', message: 'Failed to export Excel report.' });
    }
  };

  // Navigate to specific Note
  const handleSelectNote = (noteNumber: number) => {
    setSelectedNoteNumber(noteNumber);
    setActiveTab('notes');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans antialiased">
      {/* Top Header */}
      <Header
        config={config}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isTallyBalanced={isTallyBalanced}
        tallyDifference={tallyDifference}
        isBSBalanced={computed?.balanceSheet.isBalanced ?? true}
        bsDifference={computed?.balanceSheet.difference ?? 0}
        exceptionCount={allExceptions.length}
        onExportExcel={handleExportExcel}
        onOpenConfig={() => setIsConfigModalOpen(true)}
        onTriggerAIMap={handleTriggerAIMap}
        isAIMapping={isAIMapping}
        companies={companies}
        activeCompanyId={activeCompanyId}
        onSelectCompany={handleSelectCompany}
        onOpenCompanyManager={handleOpenCompanyManager}
        onOpenYearModal={() => setIsYearModalOpen(true)}
        onUpdateConfig={(newCfg) => handleUpdateCompanyConfig(activeCompanyId, newCfg)}
        onOpenYearEndAdjustments={() => setIsYearEndAdjustmentsOpen(true)}
        onOpenBackupRestore={() => setIsBackupRestoreOpen(true)}
        user={user}
        accessToken={accessToken}
        onConnectGmail={() => setActiveTab('gmail')}
        currentUser={currentUser}
        onOpenAuthModal={(tab) => {
          setAuthModalTab(tab || 'signin');
          setIsAuthModalOpen(true);
        }}
        onOpenSubscriptionModal={() => {
          setSubscriptionUpgradeReason(undefined);
          setIsSubscriptionModalOpen(true);
        }}
        onOpenUserProfileModal={() => setIsUserProfileModalOpen(true)}
        onOpenReferralModal={() => setIsReferralModalOpen(true)}
        onLogout={handleLogout}
        dashboardView={dashboardView}
        onDashboardViewChange={setDashboardView}
        workspaceStep={workspaceStep}
        onWorkspaceStepChange={(s) => {
          setWorkspaceStep(s);
          setDashboardView('workspace');
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Notification Toast */}
        {notification && (
          <div
            className={`mb-5 p-3 rounded-lg flex items-center justify-between text-xs shadow-xs border transition ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : notification.type === 'error'
                ? 'bg-rose-50 text-rose-900 border-rose-200'
                : 'bg-blue-50 text-blue-900 border-blue-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              {notification.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
              {notification.type === 'info' && <Info className="w-4 h-4 text-blue-600 shrink-0" />}
              <span className="font-medium">{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* VIEW 1: SAVED CLIENT COMPANIES (ONE WINDOW ONLY) */}
        {dashboardView === 'companies' ? (
          <CompaniesWindow
            companies={companies}
            activeCompanyId={activeCompanyId}
            onSelectCompany={(id) => {
              handleSelectCompany(id);
              setDashboardView('workspace');
              setWorkspaceStep(1);
            }}
            onCreateCompany={(cfg, starter, cloneId) => {
              handleCreateCompany(cfg, starter, cloneId);
              setDashboardView('workspace');
              setWorkspaceStep(1);
            }}
            onUpdateCompanyConfig={(id, cfg) => handleUpdateCompanyConfig(id, cfg)}
            onDeleteCompany={handleDeleteCompany}
            onDuplicateCompany={handleDuplicateCompany}
            onOpenWorkingWindows={() => setDashboardView('workspace')}
            onOpenBackupRestore={() => setIsBackupRestoreOpen(true)}
          />
        ) : (
          /* VIEW 2: 5-STEP GUIDED WORKSPACE WINDOW */
          <StepByStepWorkspace
            config={config}
            mappedLedgers={mappedLedgers}
            totalDebit={totalDebit}
            totalCredit={totalCredit}
            isTallyBalanced={isTallyBalanced}
            tallyDifference={tallyDifference}
            tbFileName={tbFileName}
            onUploadTB={handleUploadTB}
            onClearTB={handleClearTB}
            onLoadSample={(id) => {
              const ds = SAMPLE_DATASETS.find((d) => d.id === id);
              if (ds) loadDataset(ds);
            }}
            onUpdateLedgerNote={handleUpdateLedgerNote}
            onUpdateLedgerDetails={handleUpdateLedgerDetails}
            onAddLedger={handleAddLedger}
            onDeleteLedger={handleDeleteLedger}
            onTriggerAIMap={handleTriggerAIMap}
            isAIMapping={isAIMapping}
            onOpenYearEndAdjustments={() => setIsYearEndAdjustmentsOpen(true)}
            onOpenConfig={() => setIsConfigModalOpen(true)}
            onOpenYearModal={() => setIsYearModalOpen(true)}
            pyMappedLedgers={pyMappedLedgers}
            pyTotalDebit={pyTotalDebit}
            pyTotalCredit={pyTotalCredit}
            isPYTallyBalanced={isPYTallyBalanced}
            pyTallyDifference={pyTallyDifference}
            pyFileName={pyFileName}
            onUploadPYTB={handleUploadPYTB}
            onClearPYTB={handleClearPYTB}
            onUpdatePyLedgerNote={handleUpdatePyLedgerNote}
            computedFinancials={computed}
            allExceptions={allExceptions}
            onExportExcel={handleExportExcel}
            onOpenBackupRestore={() => setIsBackupRestoreOpen(true)}
            onUpdateConfig={handleUpdateConfig}
            onSwitchCompany={() => setDashboardView('companies')}
            initialStep={workspaceStep}
            onStepChange={(step) => setWorkspaceStep(step)}
            currentUser={currentUser}
            onOpenSubscriptionModal={() => {
              setSubscriptionUpgradeReason(undefined);
              setIsSubscriptionModalOpen(true);
            }}
            user={user}
            accessToken={accessToken}
            onAuthSuccess={(authedUser, token) => {
              setUser(authedUser);
              setAccessToken(token);
            }}
            onSignOut={() => {
              setUser(null);
              setAccessToken(null);
            }}
          />
        )}
      </main>

      {/* Entity Config Modal */}
      <EntityConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        config={config}
        onSave={(newCfg) => {
          handleUpdateCompanyConfig(activeCompanyId, newCfg);
        }}
        onOpenCompanyManager={() => handleOpenCompanyManager('list')}
      />

      {/* Multi-Company Manager Modal */}
      <CompanyManagerModal
        isOpen={isCompanyManagerOpen}
        onClose={() => setIsCompanyManagerOpen(false)}
        companies={companies}
        activeCompanyId={activeCompanyId}
        onSelectCompany={handleSelectCompany}
        onCreateCompany={handleCreateCompany}
        onUpdateCompanyConfig={handleUpdateCompanyConfig}
        onDeleteCompany={handleDeleteCompany}
        onDuplicateCompany={handleDuplicateCompany}
        initialTab={companyManagerInitialTab}
        onOpenBackupRestore={() => setIsBackupRestoreOpen(true)}
      />

      {/* Backup & Restore Modal */}
      <BackupRestoreModal
        isOpen={isBackupRestoreOpen}
        onClose={() => setIsBackupRestoreOpen(false)}
        companies={companies}
        activeCompanyId={activeCompanyId}
        onRestoreSuccess={(restoredCompanies, restoredActiveId) => {
          setCompanies(restoredCompanies);
          handleSelectCompany(restoredActiveId);
          setNotification({
            type: 'success',
            message: `Backup restored successfully! Loaded ${restoredCompanies.length} company entity/entities.`,
          });
        }}
        user={user}
        accessToken={accessToken}
        onAuthSuccess={(authedUser, token) => {
          setUser(authedUser);
          setAccessToken(token);
          setNotification({
            type: 'success',
            message: `Cloud saving activated for ${authedUser.email}!`,
          });
        }}
        onSignOut={() => {
          setUser(null);
          setAccessToken(null);
          setNotification({
            type: 'info',
            message: 'Signed out of Google Workspace.',
          });
        }}
        onNavigateToTab={(tab) => setActiveTab(tab as any)}
      />

      {/* Uploaded Statement Line Items Viewer Modal */}
      <UploadedStatementViewerModal
        isOpen={viewingStatementDoc !== null}
        onClose={() => setViewingStatementDoc(null)}
        statementDoc={viewingStatementDoc || undefined}
        mappedLedgers={mappedLedgers}
        onTriggerAIMapping={handleTriggerAIMap}
        isAIMapping={isAIMapping}
      />

      {/* Financial Year & Comparative Period Modal */}
      <FinancialYearChangeModal
        isOpen={isYearModalOpen}
        onClose={() => setIsYearModalOpen(false)}
        config={config}
        onSave={(updatedConfig) => handleUpdateCompanyConfig(activeCompanyId, updatedConfig)}
      />

      {/* Year-End Adjustments & Closing Stock Entry Modal */}
      <YearEndAdjustmentsModal
        isOpen={isYearEndAdjustmentsOpen}
        onClose={() => setIsYearEndAdjustmentsOpen(false)}
        adjustments={config.yearEndAdjustments || {}}
        config={config}
        onSave={(updatedAdjustments) => {
          const updatedConfig = { ...config, yearEndAdjustments: updatedAdjustments };
          setConfig(updatedConfig);
          setCompanies((prev) =>
            prev.map((c) =>
              c.id === activeCompanyId
                ? { ...c, config: updatedConfig, yearEndAdjustments: updatedAdjustments }
                : c
            )
          );
          setNotification({
            type: 'success',
            message: 'Year-End Adjustments & Closing Stock saved! Financial Statements updated.',
          });
        }}
      />

      {/* AI Schedule Mapping Agent Modal */}
      <AIMappingAgentModal
        isOpen={isAIMappingModalOpen}
        onClose={() => setIsAIMappingModalOpen(false)}
        mappedLedgers={mappedLedgers}
        onApplyMappings={handleApplyAIMappings}
        onUpdateSingleLedgerNote={(id, note) => handleUpdateLedgerNote(id, note)}
        uploadedBalanceSheet={uploadedBalanceSheet}
        uploadedProfitAndLoss={uploadedProfitAndLoss}
        uploadedPYBalanceSheet={uploadedPYBalanceSheet}
        uploadedPYProfitAndLoss={uploadedPYProfitAndLoss}
        entityName={config.entityName}
        financialYear={config.financialYear}
      />

      {/* User Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        onGoogleAuthSuccess={handleGoogleAuthSuccess}
        initialTab={authModalTab}
      />

      {/* Subscription & Pricing Plans Modal (with Claude-style credits) */}
      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => {
          setIsSubscriptionModalOpen(false);
          setSubscriptionUpgradeReason(undefined);
        }}
        currentUser={currentUser}
        onSubscriptionUpdated={handleSubscriptionUpdated}
        onOpenReferralModal={() => {
          setIsSubscriptionModalOpen(false);
          setIsReferralModalOpen(true);
        }}
        upgradeReason={subscriptionUpgradeReason}
      />

      {/* User & Firm Profile Modal */}
      <UserProfileModal
        isOpen={isUserProfileModalOpen}
        onClose={() => setIsUserProfileModalOpen(false)}
        currentUser={currentUser}
        onProfileUpdated={(updated) => setCurrentUser(updated)}
        onOpenSubscriptionModal={() => {
          setIsUserProfileModalOpen(false);
          setIsSubscriptionModalOpen(true);
        }}
        onOpenReferralModal={() => {
          setIsUserProfileModalOpen(false);
          setIsReferralModalOpen(true);
        }}
      />

      {/* Onboarding / Profile Setup Modal for New Users */}
      {currentUser && (
        <OnboardingModal
          isOpen={isOnboardingModalOpen}
          currentUser={currentUser}
          onComplete={(updated) => {
            setCurrentUser(updated);
            setIsOnboardingModalOpen(false);
            setNotification({
              type: 'success',
              message: `Profile completed! Welcome @${updated.userId} (⚡ ${updated.credits.toLocaleString()} Credits Available)`,
            });
          }}
        />
      )}

      {/* 500 Credits Referral & Invite Modal */}
      {currentUser && (
        <ReferralModal
          isOpen={isReferralModalOpen}
          onClose={() => setIsReferralModalOpen(false)}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
