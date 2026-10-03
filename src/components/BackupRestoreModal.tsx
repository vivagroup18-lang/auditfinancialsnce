import React, { useRef, useState, useEffect } from 'react';
import {
  X,
  Download,
  Upload,
  ShieldCheck,
  Database,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  RefreshCw,
  HardDrive,
  Cloud,
  CloudLightning,
  ExternalLink,
  Calendar,
  Building2,
  Check,
  FolderOpen,
  ArrowRight,
} from 'lucide-react';
import { Company } from '../types';
import {
  exportWorkspaceBackup,
  exportTotalLocalBackup,
  exportSingleCompanyBackup,
  generateSingleCompanyBackupData,
  importWorkspaceBackup,
  generateWorkspaceBackupData,
} from '../utils/storageManager';
import {
  uploadDriveFile,
  findOrCreateEntityFolder,
  listDriveFiles,
  downloadDriveFile,
  isGoogleAuthExpired,
  isGoogleDriveApiDisabled,
  extractDriveActivationUrl,
  type DriveFile,
} from '../services/driveService';
import { googleSignIn, googleLogout } from '../firebase';
import type { User } from 'firebase/auth';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: Company[];
  activeCompanyId: string;
  onRestoreSuccess: (
    restoredCompanies: Company[],
    restoredActiveId: string,
    options?: {
      backupType?: 'single' | 'total';
      duplicateStrategy?: 'add_as_new' | 'update_matching';
      sourceName?: string;
    }
  ) => void;
  user?: User | null;
  accessToken?: string | null;
  onAuthSuccess?: (user: User, token: string) => void;
  onSignOut?: () => void;
  onNavigateToTab?: (tab: string) => void;
  initialSubTab?: 'single' | 'local' | 'cloud';
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  companies,
  activeCompanyId,
  onRestoreSuccess,
  user,
  accessToken,
  onAuthSuccess,
  onSignOut,
  onNavigateToTab,
  initialSubTab = 'single',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'single' | 'local' | 'cloud'>(initialSubTab);
  const [selectedSingleCompanyId, setSelectedSingleCompanyId] = useState<string>(
    activeCompanyId || companies[0]?.id || ''
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [driveApiDisabledUrl, setDriveApiDisabledUrl] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isSavingToCloud, setIsSavingToCloud] = useState(false);
  const [isSavingSingleToCloud, setIsSavingSingleToCloud] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [cloudBackups, setCloudBackups] = useState<DriveFile[]>([]);
  const [isLoadingCloudBackups, setIsLoadingCloudBackups] = useState(false);
  const [savedCloudLink, setSavedCloudLink] = useState<string | null>(null);

  // Restore Confirmation state
  const [pendingRestore, setPendingRestore] = useState<{
    companies: Company[];
    activeId: string;
    sourceName: string;
    entityCount: number;
    backupType: 'single' | 'total';
    duplicateStrategy: 'add_as_new' | 'update_matching';
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const singleFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeCompanyId) {
      setSelectedSingleCompanyId(activeCompanyId);
    } else if (companies.length > 0 && !selectedSingleCompanyId) {
      setSelectedSingleCompanyId(companies[0].id);
    }
  }, [activeCompanyId, companies]);

  // Load cloud backups from Google Drive if connected
  useEffect(() => {
    if (isOpen && accessToken) {
      loadCloudBackups();
    }
  }, [isOpen, accessToken]);

  useEffect(() => {
    if (isOpen && initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [isOpen, initialSubTab]);

  if (!isOpen) return null;

  const selectedSingleCompany =
    companies.find((c) => c.id === selectedSingleCompanyId) ||
    companies.find((c) => c.id === activeCompanyId) ||
    companies[0];

  // Fetch backups from Google Drive (includes both Single_Backup, Audit_Backup, and Full_Backup)
  const loadCloudBackups = async () => {
    if (!accessToken) return;
    setIsLoadingCloudBackups(true);
    setErrorMsg(null);
    try {
      const result = await listDriveFiles(accessToken, {
        query: 'Backup',
        filterType: 'json',
        pageSize: 20,
      });
      setCloudBackups(result.files || []);
      setDriveApiDisabledUrl(null);
    } catch (err: any) {
      if (isGoogleAuthExpired(err)) {
        console.warn('[BackupRestoreModal] Google Drive access token has expired or is invalid.');
        if (onSignOut) onSignOut();
        setErrorMsg('Your Google Workspace session has expired. Please click "Reconnect Google Drive" to refresh your session.');
      } else if (isGoogleDriveApiDisabled(err)) {
        setDriveApiDisabledUrl(extractDriveActivationUrl(err));
      } else {
        console.warn('[BackupRestoreModal] Unable to load cloud backups:', err?.message || err);
      }
    } finally {
      setIsLoadingCloudBackups(false);
    }
  };

  // Google OAuth Activation
  const handleActivateCloudSaving = async () => {
    setIsSigningIn(true);
    setErrorMsg(null);
    try {
      const result = await googleSignIn();
      if (onAuthSuccess) {
        onAuthSuccess(result.user, result.accessToken);
      }
      setSuccessMsg(`Cloud saving activated successfully for ${result.user.email}!`);
    } catch (err: any) {
      setErrorMsg(`Cloud activation failed: ${err.message || 'Please enable popups to sign in with Google.'}`);
    } finally {
      setIsSigningIn(false);
    }
  };

  // Export Single Working File (.json)
  const handleExportSingleLocalBackup = (targetComp?: Company) => {
    const compToBackup = targetComp || selectedSingleCompany;
    if (!compToBackup) {
      setErrorMsg('No company file available to back up. Please create a company first.');
      return;
    }
    try {
      const res = exportSingleCompanyBackup(compToBackup);
      setSuccessMsg(
        `Single File Backup complete! Downloaded "${res.fileName}" for "${res.entityName}". When restored, this file will be added to your working files.`
      );
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(`Failed to generate single file backup: ${err.message}`);
      setSuccessMsg(null);
    }
  };

  // Export Total Local Backup (.json)
  const handleExportLocalBackup = () => {
    try {
      const res = exportTotalLocalBackup(companies, activeCompanyId);
      setSuccessMsg(
        `Successfully generated total local backup file "${res.fileName}" containing all ${res.totalCompanies} company entity/entities.`
      );
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(`Failed to generate local backup: ${err.message}`);
      setSuccessMsg(null);
    }
  };

  // Save Single Working File Backup to Google Drive
  const handleSaveSingleCompanyToDrive = async (targetComp?: Company) => {
    if (!accessToken) {
      setErrorMsg('Please activate cloud saving with Google Workspace first.');
      return;
    }
    const compToBackup = targetComp || selectedSingleCompany;
    if (!compToBackup) {
      setErrorMsg('No company selected to save to Google Drive.');
      return;
    }

    setIsSavingSingleToCloud(true);
    setErrorMsg(null);
    setDriveApiDisabledUrl(null);
    setSuccessMsg(null);
    setSavedCloudLink(null);

    try {
      const fy = compToBackup.config.financialYear || '2025-26';
      const folder = await findOrCreateEntityFolder(
        accessToken,
        compToBackup.config.entityName || 'Entity',
        fy
      );

      const backupData = generateSingleCompanyBackupData(compToBackup);
      const jsonContent = JSON.stringify(backupData, null, 2);

      const dateStr = new Date().toISOString().slice(0, 10);
      const timeStr = new Date().toTimeString().slice(0, 5).replace(':', '');
      const compName = (compToBackup.config.entityName || 'Entity').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `${compName}_Single_Backup_FY_${fy}_${dateStr}_${timeStr}.json`;

      const uploaded = await uploadDriveFile(accessToken, {
        name: fileName,
        mimeType: 'application/json',
        content: jsonContent,
        parentFolderId: folder.id,
      });

      setSavedCloudLink(uploaded.webViewLink || null);
      setSuccessMsg(
        `Single File Cloud Backup saved to Google Drive: "${fileName}" in folder "${folder.name}".`
      );
      loadCloudBackups();
    } catch (err: any) {
      if (isGoogleAuthExpired(err)) {
        if (onSignOut) onSignOut();
        setErrorMsg('Your Google Workspace session has expired. Please click "Reconnect Google Drive" to refresh your session.');
      } else if (isGoogleDriveApiDisabled(err)) {
        setDriveApiDisabledUrl(extractDriveActivationUrl(err));
      } else {
        setErrorMsg(`Failed to save single file backup to Google Drive: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setIsSavingSingleToCloud(false);
    }
  };

  // Save Full Workspace Backup to Google Drive
  const handleSaveWorkspaceToDrive = async () => {
    if (!accessToken) {
      setErrorMsg('Please activate cloud saving with Google Workspace first.');
      return;
    }

    setIsSavingToCloud(true);
    setErrorMsg(null);
    setDriveApiDisabledUrl(null);
    setSuccessMsg(null);
    setSavedCloudLink(null);

    try {
      // 1. Get or create root "CA Financial Statement Backups" folder
      const folder = await findOrCreateEntityFolder(
        accessToken,
        'Workspace Backups',
        'Multi-Year'
      );

      // 2. Generate backup JSON payload
      const backupData = generateWorkspaceBackupData(companies, activeCompanyId);
      const jsonContent = JSON.stringify(backupData, null, 2);

      const dateStr = new Date().toISOString().slice(0, 10);
      const timeStr = new Date().toTimeString().slice(0, 5).replace(':', '');
      const activeComp = companies.find((c) => c.id === activeCompanyId);
      const compName = (activeComp?.config.entityName || 'CA_Workspace').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `${compName}_Full_Backup_${dateStr}_${timeStr}.json`;

      // 3. Upload to Google Drive
      const uploaded = await uploadDriveFile(accessToken, {
        name: fileName,
        mimeType: 'application/json',
        content: jsonContent,
        parentFolderId: folder.id,
      });

      setSavedCloudLink(uploaded.webViewLink || null);
      setSuccessMsg(
        `Cloud Backup saved to Google Drive: "${fileName}" in folder "${folder.name}" (${companies.length} entities).`
      );

      // Refresh cloud backups list
      loadCloudBackups();
    } catch (err: any) {
      if (isGoogleAuthExpired(err)) {
        console.warn('[BackupRestoreModal] Cloud backup failed: Google session expired or invalid.');
        if (onSignOut) onSignOut();
        setErrorMsg('Your Google Workspace session has expired. Please click "Reconnect Google Drive" to refresh your session and save your backup.');
      } else if (isGoogleDriveApiDisabled(err)) {
        const activationUrl = extractDriveActivationUrl(err);
        setDriveApiDisabledUrl(activationUrl);
      } else {
        console.warn('[BackupRestoreModal] Cloud backup error:', err?.message || err);
        setErrorMsg(`Failed to save backup to Google Drive: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setIsSavingToCloud(false);
    }
  };

  // Handle Local File Selection (supports both Single File Restore and Total Backup Restore)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, expectedMode?: 'single' | 'total') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      const res = importWorkspaceBackup(content);

      if (res.success && res.companies && res.activeCompanyId) {
        const effectiveType: 'single' | 'total' =
          expectedMode === 'single' || res.backupType === 'single' || res.companies.length === 1
            ? 'single'
            : 'total';

        setPendingRestore({
          companies: res.companies,
          activeId: res.activeCompanyId,
          sourceName: file.name,
          entityCount: res.companies.length,
          backupType: effectiveType,
          duplicateStrategy: effectiveType === 'single' ? 'add_as_new' : 'update_matching',
        });
      } else {
        setErrorMsg(res.error || 'Failed to parse backup file.');
      }
      setIsRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (singleFileInputRef.current) singleFileInputRef.current.value = '';
    };

    reader.onerror = () => {
      setErrorMsg('Failed to read the backup JSON file.');
      setIsRestoring(false);
    };

    reader.readAsText(file);
  };

  // Restore from Google Drive File
  const handleRestoreFromDriveFile = async (driveFile: DriveFile) => {
    if (!accessToken) return;
    setIsRestoring(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { data } = await downloadDriveFile(accessToken, driveFile.id, driveFile.mimeType);
      const text = new TextDecoder('utf-8').decode(data);
      const res = importWorkspaceBackup(text);

      if (res.success && res.companies && res.activeCompanyId) {
        const effectiveType: 'single' | 'total' =
          res.backupType === 'single' || res.companies.length === 1 ? 'single' : 'total';
        setPendingRestore({
          companies: res.companies,
          activeId: res.activeCompanyId,
          sourceName: driveFile.name,
          entityCount: res.companies.length,
          backupType: effectiveType,
          duplicateStrategy: effectiveType === 'single' ? 'add_as_new' : 'update_matching',
        });
      } else {
        setErrorMsg(res.error || 'The selected file is not a valid CA Workspace backup.');
      }
    } catch (err: any) {
      if (isGoogleAuthExpired(err)) {
        console.warn('[BackupRestoreModal] Download backup failed: Google session expired or invalid.');
        if (onSignOut) onSignOut();
        setErrorMsg('Your Google Workspace session has expired. Please click "Reconnect Google Drive" to refresh your session.');
      } else if (isGoogleDriveApiDisabled(err)) {
        const activationUrl = extractDriveActivationUrl(err);
        setDriveApiDisabledUrl(activationUrl);
      } else {
        console.warn('[BackupRestoreModal] Error downloading drive backup:', err?.message || err);
        setErrorMsg(`Failed to download backup from Google Drive: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setIsRestoring(false);
    }
  };

  // Execute confirmed restore
  const handleExecuteRestore = () => {
    if (!pendingRestore) return;
    onRestoreSuccess(pendingRestore.companies, pendingRestore.activeId, {
      backupType: pendingRestore.backupType,
      duplicateStrategy: pendingRestore.duplicateStrategy,
      sourceName: pendingRestore.sourceName,
    });
    setSuccessMsg(
      pendingRestore.backupType === 'single'
        ? `Restored single file "${pendingRestore.companies[0]?.config.entityName || pendingRestore.sourceName}" and added it to your working files in the app!`
        : `Restored ${pendingRestore.entityCount} backup file(s) from "${pendingRestore.sourceName}" and merged with your existing working files!`
    );
    setPendingRestore(null);
  };

  const activeComp = companies.find((c) => c.id === activeCompanyId) || companies[0];
  const hasConflictInPending = pendingRestore
    ? pendingRestore.companies.some((rc) => companies.some((wc) => wc.id === rc.id))
    : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm">Single File &amp; Total Workspace Backup / Restore</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                  {companies.length} Working {companies.length === 1 ? 'File' : 'Files'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Back up or restore a single client working file or all workspace files — restored files are added without removing working files
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition rounded-lg p-1.5 hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center border-b border-slate-200 px-6 bg-slate-50/80 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('single')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'single'
                ? 'border-emerald-600 text-emerald-800 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span>Single File Backup &amp; Restore</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('local')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'local'
                ? 'border-emerald-600 text-emerald-800 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Download className="w-4 h-4 text-indigo-600" />
            <span>Total Backup &amp; Restore ({companies.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('cloud')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'cloud'
                ? 'border-emerald-600 text-emerald-800 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CloudLightning className="w-4 h-4 text-sky-600" />
            <span>Cloud Saving (Google Drive)</span>
            {accessToken && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Cloud Active" />
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-xs text-slate-700 overflow-y-auto flex-1">
          {/* Status Banners */}
          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-xs block">{successMsg}</span>
                  {savedCloudLink && (
                    <a
                      href={savedCloudLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold underline mt-1"
                    >
                      <span>Open backup in Google Drive</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSuccessMsg(null)}
                className="text-emerald-700 hover:text-emerald-900"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {driveApiDisabledUrl && (
            <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl shadow-xs space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 border border-amber-200 text-amber-800 rounded-lg shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-sm">
                        One-Time Action: Enable Google Drive API
                      </h4>
                      <span className="text-[10px] bg-amber-200 text-amber-900 font-mono px-2 py-0.5 rounded-full font-bold">
                        Google Cloud Console
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      Google Cloud requires the <strong>Google Drive API</strong> to be enabled once in your Google Cloud project before files can be stored or read from Google Drive.
                    </p>
                    <div className="pt-1.5 flex flex-wrap items-center gap-2.5">
                      <a
                        href={driveApiDisabledUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Enable Google Drive API in Cloud Console ↗</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setDriveApiDisabledUrl(null);
                          setErrorMsg(null);
                          handleSaveWorkspaceToDrive();
                        }}
                        className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition"
                      >
                        Retry Backup
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDriveApiDisabledUrl(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {!driveApiDisabledUrl && errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-xs block">{errorMsg}</span>
                  {errorMsg.includes('session has expired') && (
                    <button
                      type="button"
                      onClick={handleActivateCloudSaving}
                      disabled={isSigningIn}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition"
                    >
                      <CloudLightning className="w-3.5 h-3.5 text-emerald-300" />
                      <span>{isSigningIn ? 'Connecting...' : 'Reconnect Google Drive'}</span>
                    </button>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="text-rose-700 hover:text-rose-900"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Pending Restore Confirmation Dialog (Non-Destructive: Preserves Existing Working Files!) */}
          {pendingRestore && (
            <div className="p-4 bg-emerald-50/90 border-2 border-emerald-400 rounded-xl space-y-3 animate-in fade-in">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h4 className="font-bold text-slate-900 text-sm">
                      {pendingRestore.backupType === 'single'
                        ? 'Confirm Single File Restore (Add to Working Files)'
                        : `Confirm Total Backup Restore (${pendingRestore.entityCount} Working Files)`}
                    </h4>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                      ✓ Keeps All {companies.length} Current Working {companies.length === 1 ? 'File' : 'Files'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700">
                    Restoring from <strong>&ldquo;{pendingRestore.sourceName}&rdquo;</strong> containing{' '}
                    <strong>
                      {pendingRestore.entityCount}{' '}
                      {pendingRestore.entityCount === 1 ? 'company file' : 'company files'}
                    </strong>
                    . Your currently working files in the app will <strong>not be removed</strong>.
                  </p>

                  {/* Preview of entities being restored */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {pendingRestore.companies.map((c) => (
                      <span
                        key={c.id}
                        className="px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-[11px] font-semibold text-slate-800 flex items-center gap-1"
                      >
                        <Building2 className="w-3 h-3 text-emerald-600" />
                        <span>{c.config.entityName || 'Unnamed Entity'}</span>
                        <span className="text-[10px] text-slate-500">
                          (FY {c.config.financialYear || '2025-26'})
                        </span>
                      </span>
                    ))}
                  </div>

                  {/* If any restored entity has the same ID as an already-working file, let user choose strategy */}
                  {hasConflictInPending && (
                    <div className="p-2.5 rounded-lg bg-white border border-emerald-200 space-y-1.5">
                      <div className="text-[11px] font-bold text-slate-800">
                        Matching file detected in your workspace — how should it be added?
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <label
                          className={`p-2 rounded-lg border cursor-pointer flex items-start gap-2 transition ${
                            pendingRestore.duplicateStrategy === 'add_as_new'
                              ? 'border-emerald-600 bg-emerald-50/70 font-semibold text-emerald-950'
                              : 'border-slate-200 hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name="duplicateStrategy"
                            checked={pendingRestore.duplicateStrategy === 'add_as_new'}
                            onChange={() =>
                              setPendingRestore({
                                ...pendingRestore,
                                duplicateStrategy: 'add_as_new',
                              })
                            }
                            className="mt-0.5"
                          />
                          <div>
                            <div className="text-xs font-bold">Add as New Working File</div>
                            <div className="text-[10px] text-slate-500 font-normal">
                              Keeps existing working file untouched and adds restored file alongside it
                            </div>
                          </div>
                        </label>

                        <label
                          className={`p-2 rounded-lg border cursor-pointer flex items-start gap-2 transition ${
                            pendingRestore.duplicateStrategy === 'update_matching'
                              ? 'border-emerald-600 bg-emerald-50/70 font-semibold text-emerald-950'
                              : 'border-slate-200 hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name="duplicateStrategy"
                            checked={pendingRestore.duplicateStrategy === 'update_matching'}
                            onChange={() =>
                              setPendingRestore({
                                ...pendingRestore,
                                duplicateStrategy: 'update_matching',
                              })
                            }
                            className="mt-0.5"
                          />
                          <div>
                            <div className="text-xs font-bold">Merge &amp; Update Matching File</div>
                            <div className="text-[10px] text-slate-500 font-normal">
                              Updates matching company with backup data &amp; keeps all other working files
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-emerald-200">
                <button
                  type="button"
                  onClick={() => setPendingRestore(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteRestore}
                  className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {pendingRestore.backupType === 'single'
                      ? 'Confirm & Add Single File to Workspace'
                      : 'Confirm & Merge Backup with Working Files'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 1: SINGLE FILE BACKUP & RESTORE                                        */}
          {/* ========================================================================= */}
          {activeSubTab === 'single' && (
            <div className="space-y-4">
              {/* Single File Backup Card */}
              <div className="border-2 border-emerald-500/40 rounded-xl p-5 bg-gradient-to-br from-emerald-50/60 via-white to-slate-50 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">
                          Backup Single Working File (.json)
                        </h3>
                        <span className="text-[10px] text-emerald-800 font-semibold uppercase tracking-wider">
                          Individual Client Engagement Archive
                        </span>
                      </div>
                    </div>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Select any single working company below to download a standalone <code>.json</code> backup containing its Current Year &amp; Previous Year Trial Balances, ICAI Notes (1 to 25) mappings, and audit parameters.
                    </p>
                  </div>
                </div>

                {/* Company Selector + Action Buttons */}
                {companies.length === 0 ? (
                  <div className="p-3.5 rounded-xl bg-slate-100 text-slate-600 text-xs">
                    No working company files currently in workspace. Create a company or restore a backup file below.
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                          Select Working File to Back Up:
                        </label>
                        <select
                          value={selectedSingleCompany?.id || ''}
                          onChange={(e) => setSelectedSingleCompanyId(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          {companies.map((c) => {
                            const cyCount = c.mappedLedgers?.length || c.rawRows?.length || 0;
                            const pyCount = c.pyMappedLedgers?.length || c.pyRawRows?.length || 0;
                            return (
                              <option key={c.id} value={c.id}>
                                {c.config.entityName || 'Unnamed Entity'} ({c.config.entityType} • FY{' '}
                                {c.config.financialYear}) — {cyCount} CY / {pyCount} PY Ledgers
                                {c.id === activeCompanyId ? ' ★ Active' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-start sm:self-end flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleExportSingleLocalBackup(selectedSingleCompany)}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition shadow-xs cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                          <span>Download Single File (.json)</span>
                        </button>

                        {accessToken && (
                          <button
                            type="button"
                            onClick={() => handleSaveSingleCompanyToDrive(selectedSingleCompany)}
                            disabled={isSavingSingleToCloud}
                            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-slate-300 text-white font-bold text-xs transition shadow-xs cursor-pointer"
                          >
                            <Cloud className="w-4 h-4" />
                            <span>{isSavingSingleToCloud ? 'Saving...' : 'Save Single to Drive'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Single File Restore Card */}
              <div className="border border-indigo-200 rounded-xl p-5 bg-indigo-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-indigo-600" />
                    <span>Restore Single File &amp; Add to Working Files</span>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Upload a single-company <code>.json</code> backup file. Once restored, the file is <strong>added directly to your {companies.length} already working {companies.length === 1 ? 'file' : 'files'}</strong> in the app without removing any existing company.
                  </p>
                </div>

                <div className="shrink-0 self-start sm:self-center">
                  <input
                    ref={singleFileInputRef}
                    type="file"
                    accept=".json"
                    onChange={(e) => handleFileChange(e, 'single')}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => singleFileInputRef.current?.click()}
                    disabled={isRestoring}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-bold text-xs transition shadow-xs cursor-pointer"
                  >
                    {isRestoring ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Validating...</span>
                      </>
                    ) : (
                      <>
                        <FileJson className="w-4 h-4" />
                        <span>Restore Single .JSON File</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: CLOUD SAVING (GOOGLE DRIVE)                                         */}
          {/* ========================================================================= */}
          {activeSubTab === 'cloud' && (
            <div className="space-y-4">
              {/* Cloud Status Card */}
              <div
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  accessToken && user
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      accessToken && user ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {accessToken && user ? 'Cloud Saving Active' : 'Cloud Saving Inactive'}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          accessToken && user
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {accessToken && user ? 'Google Drive Connected' : 'Local Only'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {accessToken && user
                        ? `Authenticated as ${user.email}. Backups are securely preserved in your Google Drive.`
                        : 'Connect Google Workspace to enable one-click cloud backup & multi-device sync.'}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 self-start sm:self-center">
                  {accessToken && user ? (
                    <div className="flex items-center gap-2">
                      {onNavigateToTab && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onNavigateToTab('drive');
                          }}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition flex items-center gap-1.5"
                          title="Open Google Drive Workpapers tab"
                        >
                          <HardDrive className="w-3.5 h-3.5 text-sky-600" />
                          <span>Open Drive</span>
                        </button>
                      )}
                      {onSignOut && (
                        <button
                          type="button"
                          onClick={onSignOut}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 transition"
                        >
                          Disconnect
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleActivateCloudSaving}
                      disabled={isSigningIn}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSigningIn ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Connecting...</span>
                        </>
                      ) : (
                        <>
                          <CloudLightning className="w-4 h-4 text-emerald-300" />
                          <span>Activate Cloud Saving</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Cloud Action: Save Single or Total Workspace to Drive */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <HardDrive className="w-4 h-4 text-sky-600" />
                      <span>Save Single File or Full Workspace to Google Drive</span>
                    </div>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Save either the currently active company ({activeComp?.config.entityName || 'Active File'}) or all {companies.length} working files to your <code>CA Financial Statement Backups</code> folder.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-center flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleSaveSingleCompanyToDrive(activeComp)}
                      disabled={isSavingSingleToCloud || !accessToken || !activeComp}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{isSavingSingleToCloud ? 'Saving...' : 'Save Single Active File'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveWorkspaceToDrive}
                      disabled={isSavingToCloud || !accessToken}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                    >
                      {isSavingToCloud ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Saving All...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span>Save All ({companies.length}) to Drive</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {!accessToken && (
                  <div className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Click &ldquo;Activate Cloud Saving&rdquo; above to enable direct saving to your Google Drive.</span>
                  </div>
                )}
              </div>

              {/* Cloud Action: Available Google Drive Backups */}
              {accessToken && (
                <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <FolderOpen className="w-4 h-4 text-emerald-600" />
                        <span>Cloud Backups in Google Drive</span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Click &ldquo;Restore &amp; Add&rdquo; on any single or full backup to merge into your active working files without removing existing companies.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={loadCloudBackups}
                      disabled={isLoadingCloudBackups}
                      className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                      title="Refresh cloud backups"
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoadingCloudBackups ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {isLoadingCloudBackups ? (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                      <span>Scanning Google Drive for workspace backups...</span>
                    </div>
                  ) : cloudBackups.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <span>No previous cloud backups found. Click &ldquo;Save Single Active File&rdquo; or &ldquo;Save All to Drive&rdquo; above to create a cloud snapshot.</span>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                      {cloudBackups.map((f) => (
                        <div
                          key={f.id}
                          className="p-3 hover:bg-slate-50 transition flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <FileJson className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span className="font-bold text-slate-800 truncate">{f.name}</span>
                              {f.name.includes('Single_Backup') && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold shrink-0">
                                  Single File
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                              <span>Modified: {f.modifiedTime ? new Date(f.modifiedTime).toLocaleString() : 'Recent'}</span>
                              {f.size && <span>• {Math.round(Number(f.size) / 1024)} KB</span>}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {f.webViewLink && (
                              <a
                                href={f.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-slate-400 hover:text-slate-700 rounded transition"
                                title="View in Google Drive"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRestoreFromDriveFile(f)}
                              disabled={isRestoring}
                              className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 font-semibold text-xs rounded-lg transition cursor-pointer"
                            >
                              Restore &amp; Add
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: TOTAL LOCAL JSON BACKUP & RESTORE                                   */}
          {/* ========================================================================= */}
          {activeSubTab === 'local' && (
            <div className="space-y-4">
              {/* Total Local Backup Card */}
              <div className="border-2 border-emerald-500/40 rounded-xl p-5 bg-gradient-to-br from-emerald-50/60 via-white to-slate-50 flex flex-col sm:flex-row sm:items-start justify-between gap-4 shadow-xs">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        Total Local Backup of All {companies.length} Working Files
                      </h3>
                      <span className="text-[10px] text-emerald-800 font-semibold uppercase tracking-wider">
                        100% Offline Complete Workspace Archive
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Downloads an instant <code>.json</code> file containing <strong>all {companies.length} client entities</strong>, with all Current Year &amp; Comparative Previous Year Trial Balances, full ICAI Notes (1 to 25) mappings, Year-End closing adjustments, and company partner master profiles.
                  </p>
                  <div className="pt-1 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-500 mr-1">Entities included:</span>
                    {companies.map((c) => (
                      <span
                        key={c.id}
                        className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] font-medium text-slate-800 shadow-2xs flex items-center gap-1"
                      >
                        <Building2 className="w-3 h-3 text-emerald-600" />
                        <span>{c.config.entityName || 'Unnamed Entity'}</span>
                        <span className="text-[10px] text-slate-500">({c.config.entityType})</span>
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExportLocalBackup}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition shadow-xs shrink-0 self-start sm:self-center cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Total Backup (.json)</span>
                </button>
              </div>

              {/* Local Restore Card */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-indigo-600" />
                    <span>Restore Total Backup &amp; Keep Working Files</span>
                  </div>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Upload a <code>.json</code> backup file to restore companies into your workspace. All currently working files in the app are <strong>preserved and merged</strong> — no working files are removed.
                  </p>
                </div>

                <div className="shrink-0 self-start sm:self-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={(e) => handleFileChange(e, 'total')}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isRestoring}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-400 text-white font-bold text-xs transition shadow-xs cursor-pointer"
                  >
                    {isRestoring ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Validating...</span>
                      </>
                    ) : (
                      <>
                        <FileJson className="w-4 h-4" />
                        <span>Select .JSON File to Restore</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Safety Notice */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              <strong>Data Privacy &amp; Protection:</strong> All accounting calculations run strictly on client-side and authenticated private sessions. Regular backups protect against browser cache clearing and enable multi-machine CA audit team workflows.
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            {companies.length} client entities loaded in workspace
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-white font-semibold transition text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
