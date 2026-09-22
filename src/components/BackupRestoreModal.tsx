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
  onRestoreSuccess: (restoredCompanies: Company[], restoredActiveId: string) => void;
  user?: User | null;
  accessToken?: string | null;
  onAuthSuccess?: (user: User, token: string) => void;
  onSignOut?: () => void;
  onNavigateToTab?: (tab: string) => void;
  initialSubTab?: 'cloud' | 'local';
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
  initialSubTab = 'cloud',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'cloud' | 'local'>(initialSubTab);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [driveApiDisabledUrl, setDriveApiDisabledUrl] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isSavingToCloud, setIsSavingToCloud] = useState(false);
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
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Fetch backups from Google Drive
  const loadCloudBackups = async () => {
    if (!accessToken) return;
    setIsLoadingCloudBackups(true);
    setErrorMsg(null);
    try {
      // Find or check backups folder
      const result = await listDriveFiles(accessToken, {
        query: 'Full_Backup',
        filterType: 'json',
        pageSize: 15,
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

  // Export Total Local Backup (.json)
  const handleExportLocalBackup = () => {
    try {
      const res = exportTotalLocalBackup(companies, activeCompanyId);
      setSuccessMsg(`Successfully generated total local backup file "${res.fileName}" containing all ${res.totalCompanies} company entity/entities.`);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(`Failed to generate local backup: ${err.message}`);
      setSuccessMsg(null);
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

  // Handle Local File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setPendingRestore({
          companies: res.companies,
          activeId: res.activeCompanyId,
          sourceName: file.name,
          entityCount: res.companies.length,
        });
      } else {
        setErrorMsg(res.error || 'Failed to parse backup file.');
      }
      setIsRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
        setPendingRestore({
          companies: res.companies,
          activeId: res.activeCompanyId,
          sourceName: driveFile.name,
          entityCount: res.companies.length,
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
    onRestoreSuccess(pendingRestore.companies, pendingRestore.activeId);
    setSuccessMsg(
      `Successfully restored ${pendingRestore.entityCount} entity/entities from "${pendingRestore.sourceName}"!`
    );
    setPendingRestore(null);
  };

  const activeComp = companies.find((c) => c.id === activeCompanyId) || companies[0];

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
                <h3 className="font-bold text-sm">Backup, Restore &amp; Cloud Saving</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                  {companies.length} {companies.length === 1 ? 'Entity' : 'Entities'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Protect client trial balances, mapped schedules, and audit parameters locally or in Google Cloud
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
        <div className="flex items-center border-b border-slate-200 px-6 bg-slate-50/80 shrink-0">
          <button
            type="button"
            onClick={() => setActiveSubTab('cloud')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
              activeSubTab === 'cloud'
                ? 'border-emerald-600 text-emerald-800 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CloudLightning className="w-4 h-4 text-emerald-600" />
            <span>Cloud Saving (Google Drive)</span>
            {accessToken && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Cloud Active" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('local')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
              activeSubTab === 'local'
                ? 'border-emerald-600 text-emerald-800 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Total Local Backup (.json)</span>
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
                        Project 471811229038
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      Google Cloud requires the <strong>Google Drive API</strong> to be enabled once in project <code>471811229038</code> before files can be stored or read from Google Drive.
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
                    <div className="text-[11px] text-slate-600 bg-amber-100/70 p-2.5 rounded-lg mt-2 border border-amber-200 space-y-0.5">
                      <div className="font-semibold text-slate-800">Quick 3-step activation:</div>
                      <div>1. Click the blue button above to open your Google Cloud Console.</div>
                      <div>2. Click the blue <strong>"Enable"</strong> button on the page.</div>
                      <div>3. Return here and click <strong>"Retry Backup"</strong> (allow ~1-2 min for Google to sync).</div>
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

          {/* Pending Restore Confirmation Dialog */}
          {pendingRestore && (
            <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-3 animate-in fade-in">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    Confirm Workspace Restoration
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    You are about to restore workspace data from <strong>"{pendingRestore.sourceName}"</strong> containing{' '}
                    <strong>{pendingRestore.entityCount} client entity/entities</strong>.
                  </p>
                  <p className="text-[11px] text-amber-800 mt-1 font-medium">
                    This will replace your current in-memory entities with the backup data. Make sure to download a quick local backup first if you have unsaved changes.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-amber-200">
                <button
                  type="button"
                  onClick={() => setPendingRestore(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteRestore}
                  className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm &amp; Restore</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 1: CLOUD SAVING (GOOGLE DRIVE)                                         */}
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

              {/* Cloud Action: Save Workspace to Drive */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <HardDrive className="w-4 h-4 text-sky-600" />
                      <span>Save Workspace to Google Drive</span>
                    </div>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Uploads a complete snapshot of all {companies.length} client entities, trial balance ledgers, and ICAI Notes schedules into a dedicated <code>CA Financial Statement Backups</code> folder.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveWorkspaceToDrive}
                    disabled={isSavingToCloud || !accessToken}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs shadow-xs transition shrink-0 self-start sm:self-center"
                  >
                    {isSavingToCloud ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Saving to Cloud...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Save to Google Drive</span>
                      </>
                    )}
                  </button>
                </div>

                {!accessToken && (
                  <div className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Click "Activate Cloud Saving" above to enable direct saving to your Google Drive.</span>
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
                        Saved snapshots found in your Google Drive. Click "Restore" to load into your active workspace.
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
                      <span>No previous cloud backups found. Click "Save to Google Drive" above to create your first cloud snapshot.</span>
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
                              className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 font-semibold text-xs rounded-lg transition"
                            >
                              Restore
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
          {/* TAB 2: TOTAL LOCAL JSON BACKUP & RESTORE                                   */}
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
                        Total Local Backup of All {companies.length} Companies
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
                    <span>Restore from Local Backup File</span>
                  </div>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Upload a previously exported <code>.json</code> file to restore companies, mapped trial balances, and audit parameters into your session.
                  </p>
                </div>

                <div className="shrink-0 self-start sm:self-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
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
