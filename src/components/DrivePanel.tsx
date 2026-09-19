import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  HardDrive,
  FolderPlus,
  UploadCloud,
  FileSpreadsheet,
  FileText,
  Folder,
  Download,
  Trash2,
  RefreshCw,
  ExternalLink,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  ArrowRight,
  ShieldCheck,
  Building2,
  Layers,
  ChevronRight,
  FileUp,
  Info,
  Check,
  X,
  Database,
  Calendar,
} from 'lucide-react';
import {
  listDriveFiles,
  getDriveAbout,
  createDriveFolder,
  uploadDriveFile,
  downloadDriveFile,
  trashDriveFile,
  findOrCreateEntityFolder,
  isGoogleAuthExpired,
  isGoogleDriveApiDisabled,
  extractDriveActivationUrl,
  type DriveFile,
  type DriveAbout,
} from '../services/driveService';
import { googleSignIn, googleLogout } from '../firebase';
import type { User } from 'firebase/auth';
import {
  EntityConfig,
  BalanceSheetData,
  ProfitAndLossData,
  NoteScheduleData,
  AuditException,
  TrialBalanceRow,
  MappedLedger,
  Company,
} from '../types';
import { generateAttractiveExcelBuffer } from '../utils/excelExporter';
import { parseTrialBalanceExcelOrCsv } from '../utils/fileParsers';

interface DrivePanelProps {
  config: EntityConfig;
  balanceSheet?: BalanceSheetData;
  profitAndLoss?: ProfitAndLossData;
  noteSchedules?: Record<number, NoteScheduleData>;
  exceptions?: AuditException[];
  rawRows?: TrialBalanceRow[];
  mappedLedgers?: MappedLedger[];
  pyRawRows?: TrialBalanceRow[];
  pyMappedLedgers?: MappedLedger[];
  user: User | null;
  accessToken: string | null;
  onAuthSuccess: (user: User, token: string) => void;
  onSignOut: () => void;
  onImportTrialBalance: (rows: TrialBalanceRow[], fileName: string, isPY?: boolean) => void;
  onRestoreBackup?: (backupData: any) => void;
  company?: Company;
}

export const DrivePanel: React.FC<DrivePanelProps> = ({
  config,
  balanceSheet,
  profitAndLoss,
  noteSchedules = {},
  exceptions = [],
  rawRows = [],
  mappedLedgers = [],
  pyRawRows = [],
  pyMappedLedgers = [],
  user,
  accessToken,
  onAuthSuccess,
  onSignOut,
  onImportTrialBalance,
  onRestoreBackup,
  company,
}) => {
  // Auth & Profile State
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [aboutData, setAboutData] = useState<DriveAbout | null>(null);
  const [loadingAbout, setLoadingAbout] = useState(false);

  // File Listing State
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'spreadsheets' | 'csv' | 'json' | 'pdf' | 'folders'>('all');
  const [currentFolderId, setCurrentFolderId] = useState<string>('');
  const [folderHistory, setFolderHistory] = useState<Array<{ id: string; name: string }>>([
    { id: '', name: 'My Drive' },
  ]);

  // Operations feedback
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
    driveLink?: string;
    activationUrl?: string;
  } | null>(null);
  const [isExportingToDrive, setIsExportingToDrive] = useState(false);
  const [isBackingUpToDrive, setIsBackingUpToDrive] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  // Upload Local File to Drive Modal State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLocal, setIsUploadingLocal] = useState(false);

  // Mandatory Safety Confirmation Dialog State (Workspace Skill requirement)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    actionType: 'trash' | 'overwrite_import';
    file?: DriveFile;
    targetYear?: 'CY' | 'PY';
  }>({
    isOpen: false,
    actionType: 'trash',
  });

  // Centralized Drive error handler
  const handleDriveCatch = useCallback(
    (err: any, fallbackMessage: string) => {
      if (isGoogleAuthExpired(err)) {
        console.warn(`[DrivePanel] Google Drive session expired: ${fallbackMessage}`);
        onSignOut();
        setStatusMessage({
          type: 'error',
          text: 'Google Drive session has expired. Please click "Connect Google Drive" below to reconnect.',
        });
      } else if (isGoogleDriveApiDisabled(err)) {
        setStatusMessage({
          type: 'error',
          text: 'Google Drive API is disabled in your Google Cloud Project (471811229038). Please click the button below to enable it in the Google Cloud Console.',
          activationUrl: extractDriveActivationUrl(err),
        });
      } else {
        console.warn(`[DrivePanel] ${fallbackMessage}:`, err?.message || err);
        setStatusMessage({
          type: 'error',
          text: `${fallbackMessage}: ${err?.message || err}`,
        });
      }
    },
    [onSignOut]
  );

  // Load Google Drive About & Quota
  const loadAboutInfo = useCallback(async () => {
    if (!accessToken) return;
    setLoadingAbout(true);
    try {
      const data = await getDriveAbout(accessToken);
      setAboutData(data);
    } catch (err: any) {
      handleDriveCatch(err, 'Unable to load Drive quota');
    } finally {
      setLoadingAbout(false);
    }
  }, [accessToken, handleDriveCatch]);

  // Fetch Drive Files
  const fetchFiles = useCallback(async () => {
    if (!accessToken) return;
    setLoadingFiles(true);
    try {
      const res = await listDriveFiles(accessToken, {
        query: searchQuery,
        folderId: currentFolderId,
        filterType,
        pageSize: 40,
      });
      setFiles(res.files);
    } catch (err: any) {
      handleDriveCatch(err, 'Error loading Drive files');
    } finally {
      setLoadingFiles(false);
    }
  }, [accessToken, currentFolderId, filterType, searchQuery, handleDriveCatch]);

  // Initial load when token changes or folder/filter changes
  useEffect(() => {
    if (accessToken) {
      loadAboutInfo();
      fetchFiles();
    } else {
      setAboutData(null);
      setFiles([]);
    }
  }, [accessToken, loadAboutInfo, fetchFiles]);

  // Google Sign In handler
  const handleSignIn = async () => {
    setIsSigningIn(true);
    setStatusMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        onAuthSuccess(res.user, res.accessToken);
        setStatusMessage({
          type: 'success',
          text: `Successfully connected Google Drive for ${res.user.email}!`,
        });
      }
    } catch (err: any) {
      console.error('Sign-in failed:', err);
      setStatusMessage({
        type: 'error',
        text: `Authentication failed: ${err.message || 'Please enable popups to sign in with Google.'}`,
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  // Google Sign Out handler
  const handleSignOut = async () => {
    await googleLogout();
    onSignOut();
    setAboutData(null);
    setFiles([]);
    setStatusMessage({
      type: 'info',
      text: 'Signed out of Google Drive.',
    });
  };

  // Navigate into a folder
  const handleOpenFolder = (folder: DriveFile) => {
    setCurrentFolderId(folder.id);
    setFolderHistory((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  // Navigate breadcrumb
  const handleBreadcrumbClick = (index: number) => {
    const target = folderHistory[index];
    setCurrentFolderId(target.id);
    setFolderHistory((prev) => prev.slice(0, index + 1));
  };

  // Create New Folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !newFolderName.trim()) return;

    setIsCreatingFolder(true);
    setStatusMessage(null);
    try {
      const created = await createDriveFolder(
        accessToken,
        newFolderName.trim(),
        currentFolderId || undefined
      );
      setNewFolderName('');
      setShowNewFolderModal(false);
      setStatusMessage({
        type: 'success',
        text: `Created folder "${created.name}" in Google Drive.`,
        driveLink: created.webViewLink,
      });
      fetchFiles();
    } catch (err: any) {
      handleDriveCatch(err, 'Failed to create folder');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  // Save NCE Financial Statements (Excel Workbook) directly to Google Drive
  const handleExportExcelToDrive = async () => {
    if (!accessToken) return;

    if (!balanceSheet || !profitAndLoss) {
      setStatusMessage({
        type: 'error',
        text: 'No computed financial statements available yet. Please upload or map a Trial Balance first.',
      });
      return;
    }

    setIsExportingToDrive(true);
    setStatusMessage(null);

    try {
      // 1. Generate Excel binary buffer
      const { data, fileName } = await generateAttractiveExcelBuffer({
        entityConfig: config,
        balanceSheet,
        profitAndLoss,
        noteSchedules,
        exceptions,
        rawRows,
        mappedLedgers,
      });

      // 2. Locate or create client folder in Google Drive
      const fy = config.financialYear || '2024-25';
      const entityFolder = await findOrCreateEntityFolder(
        accessToken,
        config.entityName || 'Entity',
        fy
      );

      // 3. Upload to Google Drive folder
      const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const uploaded = await uploadDriveFile(accessToken, {
        name: fileName,
        content: data,
        mimeType,
        parentFolderId: entityFolder.id,
      });

      setStatusMessage({
        type: 'success',
        text: `Successfully saved "${fileName}" to Google Drive folder "${entityFolder.name}"!`,
        driveLink: uploaded.webViewLink,
      });

      // Refresh file list if in root or same folder
      fetchFiles();
      loadAboutInfo();
    } catch (err: any) {
      handleDriveCatch(err, 'Failed to export to Google Drive');
    } finally {
      setIsExportingToDrive(false);
    }
  };

  // Save Full Audit Backup (JSON) directly to Google Drive
  const handleBackupToDrive = async () => {
    if (!accessToken) return;
    setIsBackingUpToDrive(true);
    setStatusMessage(null);

    try {
      const fy = config.financialYear || '2024-25';
      const backupPayload = {
        app: 'CA Financial Statement Automation',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        company: company || {
          id: 'comp-current',
          config,
          rawRows,
          mappedLedgers,
          mappingExceptions: exceptions,
          pyRawRows,
          pyMappedLedgers,
          updatedAt: new Date().toISOString(),
        },
      };

      const jsonStr = JSON.stringify(backupPayload, null, 2);
      const cleanEntity = (config.entityName || 'Entity').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `${cleanEntity}_Audit_Backup_FY_${fy}_${new Date().toISOString().slice(0, 10)}.json`;

      const entityFolder = await findOrCreateEntityFolder(
        accessToken,
        config.entityName || 'Entity',
        fy
      );

      const uploaded = await uploadDriveFile(accessToken, {
        name: fileName,
        content: jsonStr,
        mimeType: 'application/json',
        parentFolderId: entityFolder.id,
      });

      setStatusMessage({
        type: 'success',
        text: `Audit backup saved to Google Drive: "${fileName}" in folder "${entityFolder.name}"!`,
        driveLink: uploaded.webViewLink,
      });

      fetchFiles();
      loadAboutInfo();
    } catch (err: any) {
      handleDriveCatch(err, 'Failed to save backup to Drive');
    } finally {
      setIsBackingUpToDrive(false);
    }
  };

  // Upload Local File from desktop directly into current Google Drive folder
  const handleUploadLocalFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;

    setIsUploadingLocal(true);
    setStatusMessage(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const uploaded = await uploadDriveFile(accessToken, {
        name: file.name,
        content: arrayBuffer,
        mimeType: file.type || 'application/octet-stream',
        parentFolderId: currentFolderId || undefined,
      });

      setStatusMessage({
        type: 'success',
        text: `Uploaded "${file.name}" to Google Drive!`,
        driveLink: uploaded.webViewLink,
      });

      fetchFiles();
      loadAboutInfo();
    } catch (err: any) {
      handleDriveCatch(err, 'Upload failed');
    } finally {
      setIsUploadingLocal(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Import file from Google Drive into App as CY or PY Trial Balance
  const executeImportFromDrive = async (file: DriveFile, isPY: boolean) => {
    if (!accessToken) return;
    setDownloadingFileId(file.id);
    setStatusMessage(null);

    try {
      const { data } = await downloadDriveFile(accessToken, file.id, file.mimeType);

      // If JSON backup
      if (file.name.endsWith('.json') || file.mimeType === 'application/json') {
        const text = new TextDecoder().decode(data);
        const parsed = JSON.parse(text);
        if (onRestoreBackup) {
          onRestoreBackup(parsed);
          setStatusMessage({
            type: 'success',
            text: `Successfully restored complete company backup from Google Drive file "${file.name}"!`,
          });
        }
        return;
      }

      // Parse Excel or CSV
      const rows = parseTrialBalanceExcelOrCsv(data);
      if (!rows || rows.length === 0) {
        throw new Error('No valid trial balance rows found in this file.');
      }

      onImportTrialBalance(rows, file.name, isPY);
      setStatusMessage({
        type: 'success',
        text: `Imported ${rows.length} accounts from "${file.name}" as ${isPY ? 'Previous Year' : 'Current Year'} Trial Balance!`,
      });
    } catch (err: any) {
      handleDriveCatch(err, 'Could not import file');
    } finally {
      setDownloadingFileId(null);
      setConfirmModal({ isOpen: false, actionType: 'trash' });
    }
  };

  // Trashing file with safety confirmation modal
  const executeTrashFile = async (file: DriveFile) => {
    if (!accessToken) return;
    try {
      await trashDriveFile(accessToken, file.id);
      setStatusMessage({
        type: 'info',
        text: `Moved "${file.name}" to Google Drive trash.`,
      });
      fetchFiles();
      loadAboutInfo();
    } catch (err: any) {
      handleDriveCatch(err, 'Failed to delete file');
    } finally {
      setConfirmModal({ isOpen: false, actionType: 'trash' });
    }
  };

  // Helper formatting for file size
  const formatFileSize = (bytes?: string) => {
    if (!bytes) return '—';
    const num = parseInt(bytes, 10);
    if (isNaN(num)) return '—';
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Helper icon by mime type
  const getFileIcon = (file: DriveFile) => {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      return <Folder className="w-5 h-5 text-amber-500 fill-amber-100" />;
    }
    if (
      file.mimeType.includes('spreadsheet') ||
      file.mimeType.includes('excel') ||
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xls')
    ) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    }
    if (file.name.endsWith('.csv') || file.mimeType.includes('csv')) {
      return <Database className="w-5 h-5 text-sky-600" />;
    }
    if (file.name.endsWith('.json') || file.mimeType.includes('json')) {
      return <FileCode className="w-5 h-5 text-purple-600" />;
    }
    if (file.mimeType.includes('pdf') || file.name.endsWith('.pdf')) {
      return <FileText className="w-5 h-5 text-red-600" />;
    }
    return <FileText className="w-5 h-5 text-slate-500" />;
  };

  const isSpreadsheetOrCsv = (file: DriveFile) => {
    return (
      file.mimeType === 'application/vnd.google-apps.spreadsheet' ||
      file.mimeType.includes('spreadsheet') ||
      file.mimeType.includes('excel') ||
      file.mimeType.includes('csv') ||
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xls') ||
      file.name.endsWith('.csv')
    );
  };

  const isJsonBackup = (file: DriveFile) => {
    return file.name.endsWith('.json') || file.mimeType === 'application/json';
  };

  // Quota percentage
  const quotaPercent =
    aboutData?.storageQuota?.limit && aboutData?.storageQuota?.usage
      ? Math.min(
          100,
          Math.round(
            (parseInt(aboutData.storageQuota.usage, 10) /
              parseInt(aboutData.storageQuota.limit, 10)) *
              100
          )
        )
      : null;

  return (
    <div className="space-y-6">
      {/* 1. Header & Account Status Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shadow-2xs">
              <HardDrive className="w-6 h-6 text-sky-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Google Drive Workpapers &amp; Cloud Sync
                </h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                  Google Workspace
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Directly sync client financial statements, import trial balance workbooks, and backup audit files in Google Drive.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {accessToken && user ? (
              <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 shadow-2xs">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Google User'}
                    className="w-7 h-7 rounded-full border border-slate-300"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                    {user.email?.[0].toUpperCase() || 'U'}
                  </div>
                )}
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>{user.displayName || user.email?.split('@')[0]}</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" title="Connected" />
                  </div>
                  <div className="text-[10px] text-slate-500 truncate max-w-[170px]">
                    {user.email}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="ml-2 text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-slate-200/60 transition"
                  title="Sign out of Google Drive"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="gsi-material-button text-xs shadow-xs hover:shadow-sm"
                style={{
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  background: '#FFFFFF',
                  border: '1px solid #DADCE0',
                  borderRadius: '12px',
                  padding: '0 16px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  color: '#3c4043',
                }}
              >
                <div style={{ marginRight: '10px' }}>
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ width: '18px', height: '18px', display: 'block' }}>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span>{isSigningIn ? 'Connecting...' : 'Sign in with Google'}</span>
              </button>
            )}

            {accessToken && (
              <button
                type="button"
                onClick={() => {
                  fetchFiles();
                  loadAboutInfo();
                }}
                className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                title="Refresh Drive Files"
              >
                <RefreshCw className={`w-4 h-4 ${loadingFiles ? 'animate-spin text-sky-600' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Quota Meter */}
        {aboutData?.storageQuota && (
          <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <span className="font-semibold text-slate-700">Drive Storage:</span>
              <span>
                {formatFileSize(aboutData.storageQuota.usage)} of{' '}
                {formatFileSize(aboutData.storageQuota.limit)} used
              </span>
              {quotaPercent !== null && (
                <span className="text-[11px] font-medium text-slate-500">
                  ({quotaPercent}%)
                </span>
              )}
            </div>
            {quotaPercent !== null && (
              <div className="w-full sm:w-48 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                <div
                  className={`h-full transition-all ${
                    quotaPercent > 90
                      ? 'bg-rose-500'
                      : quotaPercent > 70
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${quotaPercent}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notification Toast */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-xs transition ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-sky-50 border-sky-200 text-sky-900'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
            {statusMessage.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
            {statusMessage.type === 'info' && <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />}
            <div>
              <p className="font-semibold">{statusMessage.text}</p>
              {statusMessage.driveLink && (
                <a
                  href={statusMessage.driveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-1 text-emerald-700 underline font-bold hover:text-emerald-800"
                >
                  <span>Open file in Google Drive</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {statusMessage.activationUrl && (
                <div className="mt-2.5 space-y-1.5">
                  <a
                    href={statusMessage.activationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs transition"
                  >
                    <span>Enable Google Drive API in Cloud Console</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <p className="text-[11px] text-slate-600">
                    Click &ldquo;Enable&rdquo; in Google Cloud Console, wait 1&ndash;2 minutes for Google propagation, then retry your action.
                  </p>
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Quick-Action Cloud Sync Bar for Current Audit Entity */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-5 shadow-sm border border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs uppercase tracking-wider text-slate-300 font-bold">
                Active Client Audit Entity
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mt-1">
              {config.entityName || 'Unnamed Entity'}
            </h3>
            <div className="flex items-center gap-3 text-xs text-slate-300 mt-1 flex-wrap">
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-emerald-300 font-medium">
                FY {config.financialYear || '2024-25'}
              </span>
              <span>•</span>
              <span>{config.entityType || 'Partnership Firm'}</span>
              <span>•</span>
              <span>
                {rawRows.length} CY Ledgers | {pyRawRows.length} PY Ledgers
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleExportExcelToDrive}
              disabled={isExportingToDrive || !accessToken}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition flex items-center gap-2"
              title="Exports beautifully styled NCE Financial Statements workbook directly into a client folder in Google Drive"
            >
              <FileSpreadsheet className={`w-4 h-4 ${isExportingToDrive ? 'animate-spin' : ''}`} />
              <span>{isExportingToDrive ? 'Saving to Drive...' : 'Save Financials (Excel) to Drive'}</span>
            </button>

            <button
              type="button"
              onClick={handleBackupToDrive}
              disabled={isBackingUpToDrive || !accessToken}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 disabled:opacity-50 text-slate-200 hover:text-white font-bold text-xs shadow-xs transition flex items-center gap-2"
              title="Upload full JSON snapshot of all ledgers, mappings, and configuration to Google Drive"
            >
              <Database className={`w-4 h-4 text-purple-400 ${isBackingUpToDrive ? 'animate-spin' : ''}`} />
              <span>{isBackingUpToDrive ? 'Backing up...' : 'Save Backup to Drive'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Drive File Explorer & Workpapers Workspace */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
        {/* Explorer Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 overflow-x-auto py-1">
            {folderHistory.map((folder, idx) => (
              <React.Fragment key={folder.id || 'root'}>
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                <button
                  type="button"
                  onClick={() => handleBreadcrumbClick(idx)}
                  className={`font-semibold hover:text-sky-600 truncate max-w-[140px] px-1 py-0.5 rounded transition ${
                    idx === folderHistory.length - 1 ? 'text-slate-900 font-bold bg-slate-100' : ''
                  }`}
                >
                  {folder.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowNewFolderModal(true)}
              disabled={!accessToken}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <FolderPlus className="w-3.5 h-3.5 text-amber-500" />
              <span>New Folder</span>
            </button>

            {/* Hidden local file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleUploadLocalFile}
              className="hidden"
              accept=".xlsx,.xls,.csv,.json,.pdf"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!accessToken || isUploadingLocal}
              className="px-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 disabled:opacity-50 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <UploadCloud className={`w-3.5 h-3.5 ${isUploadingLocal ? 'animate-spin' : ''}`} />
              <span>{isUploadingLocal ? 'Uploading...' : 'Upload File to Drive'}</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files in Google Drive..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
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

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'all', label: 'All Files' },
              { id: 'spreadsheets', label: '📊 Excel / Sheets' },
              { id: 'csv', label: '📄 CSV' },
              { id: 'json', label: '💾 Backups' },
              { id: 'pdf', label: '📑 PDFs' },
              { id: 'folders', label: '📁 Folders' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterType(f.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  filterType === f.id
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Files Table / Empty State */}
        {!accessToken ? (
          <div className="py-14 text-center border-2 border-dashed border-slate-200 rounded-2xl">
            <HardDrive className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-700">Connect Google Drive to View Workpapers</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
              Sign in with your Google Workspace or Gmail account to browse audit files, import client trial balances, and sync financial workbooks directly with your Drive.
            </p>
            <button
              type="button"
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition"
            >
              <span>{isSigningIn ? 'Connecting...' : 'Sign in with Google Drive'}</span>
            </button>
          </div>
        ) : loadingFiles ? (
          <div className="py-14 text-center">
            <RefreshCw className="w-7 h-7 text-sky-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">Loading files from Google Drive...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="py-12 text-center border border-slate-100 rounded-xl bg-slate-50/50">
            <Folder className="w-9 h-9 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600">No files found in this folder</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Upload client workpapers or save financial statements to see them listed here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                  <th className="py-2.5 px-3">File Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Size</th>
                  <th className="py-2.5 px-3">Last Modified</th>
                  <th className="py-2.5 px-3 text-right">Actions &amp; Import</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {files.map((file) => {
                  const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                  const isDownloadable = !isFolder;
                  const isTBFile = isSpreadsheetOrCsv(file);
                  const isJson = isJsonBackup(file);
                  const isDownloading = downloadingFileId === file.id;

                  return (
                    <tr
                      key={file.id}
                      className="hover:bg-slate-50/90 transition group"
                    >
                      {/* Name & Icon */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          {getFileIcon(file)}
                          {isFolder ? (
                            <button
                              type="button"
                              onClick={() => handleOpenFolder(file)}
                              className="font-bold text-slate-900 hover:text-sky-600 text-left truncate max-w-xs md:max-w-md"
                            >
                              {file.name}
                            </button>
                          ) : (
                            <span className="font-medium text-slate-800 truncate max-w-xs md:max-w-md">
                              {file.name}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Type */}
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                        {isFolder
                          ? 'Folder'
                          : file.name.endsWith('.xlsx')
                          ? 'Excel Workbook'
                          : file.name.endsWith('.csv')
                          ? 'CSV File'
                          : file.name.endsWith('.json')
                          ? 'JSON Backup'
                          : file.mimeType === 'application/vnd.google-apps.spreadsheet'
                          ? 'Google Sheet'
                          : 'Document'}
                      </td>

                      {/* Size */}
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                        {isFolder ? '—' : formatFileSize(file.size)}
                      </td>

                      {/* Modified Time */}
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                        {file.modifiedTime
                          ? new Date(file.modifiedTime).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>

                      {/* Action buttons */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 1. Direct Import to Current Year TB */}
                          {isTBFile && (
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmModal({
                                  isOpen: true,
                                  actionType: 'overwrite_import',
                                  file,
                                  targetYear: 'CY',
                                });
                              }}
                              disabled={isDownloading}
                              className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-[11px] font-bold transition"
                              title="Import directly into Current Year Trial Balance"
                            >
                              {isDownloading ? 'Importing...' : '📥 Import CY TB'}
                            </button>
                          )}

                          {/* 2. Direct Import to Previous Year TB */}
                          {isTBFile && (
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmModal({
                                  isOpen: true,
                                  actionType: 'overwrite_import',
                                  file,
                                  targetYear: 'PY',
                                });
                              }}
                              disabled={isDownloading}
                              className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-[11px] font-bold transition"
                              title="Import directly into Previous Year (Comparative) Trial Balance"
                            >
                              {isDownloading ? 'Importing...' : '📥 Import PY TB'}
                            </button>
                          )}

                          {/* 3. Restore JSON backup */}
                          {isJson && (
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmModal({
                                  isOpen: true,
                                  actionType: 'overwrite_import',
                                  file,
                                });
                              }}
                              disabled={isDownloading}
                              className="px-2 py-1 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-[11px] font-bold transition"
                              title="Restore complete company backup"
                            >
                              {isDownloading ? 'Restoring...' : '🔄 Restore Backup'}
                            </button>
                          )}

                          {/* Open in Google Drive */}
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded text-slate-400 hover:text-sky-600 hover:bg-slate-100 transition"
                              title="Open in Google Drive"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}

                          {/* Delete / Trash button (with MANDATORY confirmation modal) */}
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmModal({
                                isOpen: true,
                                actionType: 'trash',
                                file,
                              });
                            }}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Move to Google Drive trash"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. New Folder Creation Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-amber-500" />
                <h4 className="text-sm font-bold text-slate-800">New Google Drive Folder</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowNewFolderModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Folder Name
                </label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Audit Vouchers FY 2024-25"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  autoFocus
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingFolder || !newFolderName.trim()}
                  className="px-4 py-1.5 text-xs bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold transition disabled:opacity-50"
                >
                  {isCreatingFolder ? 'Creating...' : 'Create Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MANDATORY Safety Confirmation Dialog (Workspace Skill Requirement) */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  confirmModal.actionType === 'trash'
                    ? 'bg-rose-50 text-rose-600 border border-rose-100'
                    : 'bg-amber-50 text-amber-600 border border-amber-100'
                }`}
              >
                {confirmModal.actionType === 'trash' ? (
                  <Trash2 className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {confirmModal.actionType === 'trash'
                    ? 'Move File to Google Drive Trash?'
                    : 'Import & Overwrite Existing Data?'}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Explicit user confirmation is required before proceeding.
                </p>
              </div>
            </div>

            <div className="my-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex items-center justify-between text-slate-700">
                <span className="font-medium text-slate-500">Selected File:</span>
                <span className="font-bold truncate max-w-[220px]">
                  {confirmModal.file?.name}
                </span>
              </div>
              {confirmModal.actionType === 'trash' ? (
                <p className="text-[11px] text-rose-700 pt-1">
                  This will move the file to your Google Drive Trash. You can restore it from Drive Trash within 30 days.
                </p>
              ) : (
                <p className="text-[11px] text-amber-700 pt-1">
                  {confirmModal.targetYear === 'CY'
                    ? 'Importing will replace the Current Year Trial Balance for this company with the accounts found in this file.'
                    : confirmModal.targetYear === 'PY'
                    ? 'Importing will replace the Previous Year (Comparative) Trial Balance with the accounts found in this file.'
                    : 'Restoring will load all company details, ledgers, and configurations contained in this backup.'}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal({ isOpen: false, actionType: 'trash' })}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!confirmModal.file) return;
                  if (confirmModal.actionType === 'trash') {
                    executeTrashFile(confirmModal.file);
                  } else {
                    executeImportFromDrive(
                      confirmModal.file,
                      confirmModal.targetYear === 'PY'
                    );
                  }
                }}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition ${
                  confirmModal.actionType === 'trash'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {confirmModal.actionType === 'trash'
                  ? 'Yes, Move to Trash'
                  : 'Yes, Proceed with Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
