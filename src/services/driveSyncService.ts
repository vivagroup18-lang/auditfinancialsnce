// Google Drive Automated Cloud Sync Service for CA Audit & Financials Workspace
// Automatically syncs companies, ledger mappings, and financial statements to Google Drive
// Enables instant multi-device / cross-system restore whenever the user signs in with their Gmail ID

import { Company } from '../types';
import {
  DriveFile,
  handleDriveError,
  isGoogleAuthExpired,
  isGoogleDriveApiDisabled,
  extractDriveActivationUrl,
} from './driveService';

export const DRIVE_SYNC_FOLDER_NAME = 'CA Financial Statement Backups';
export const DRIVE_SYNC_FILE_NAME = 'CA_Audit_Workspace_AutoSync.json';

export interface DriveSyncPayload {
  version: number;
  appName: string;
  schemaVersion: string;
  exportedAt: string;
  userEmail?: string;
  activeCompanyId: string;
  companies: Company[];
}

export interface DriveSyncResult {
  restored: boolean;
  syncedToCloud: boolean;
  companies: Company[];
  activeCompanyId?: string;
  message: string;
  lastSyncedAt?: string;
  fileId?: string;
}

/**
 * Finds or creates the root sync folder "CA Financial Statement Backups" in the user's Google Drive.
 */
export async function findOrCreateSyncFolder(accessToken: string): Promise<DriveFile> {
  const cleanQ = DRIVE_SYNC_FOLDER_NAME.replace(/'/g, "\\'");
  const q = `mimeType = 'application/vnd.google-apps.folder' and name = '${cleanQ}' and trashed = false`;

  const searchUrl = new URL('https://www.googleapis.com/drive/v3/files');
  searchUrl.searchParams.set('q', q);
  searchUrl.searchParams.set('fields', 'files(id, name, mimeType, webViewLink)');
  searchUrl.searchParams.set('pageSize', '5');

  const searchRes = await fetch(searchUrl.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!searchRes.ok) {
    const errBody = await searchRes.text();
    handleDriveError(searchRes, errBody, 'search for CA Financial Statement Backups folder');
  }

  const data = await searchRes.json();
  if (data.files && data.files.length > 0) {
    return data.files[0];
  }

  // Create folder if not found
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: DRIVE_SYNC_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Automated CA Audit & Financial Statements Workspace Backups for Multi-Device Access',
    }),
  });

  if (!createRes.ok) {
    const errBody = await createRes.text();
    handleDriveError(createRes, errBody, 'create CA Financial Statement Backups folder');
  }

  return createRes.json();
}

/**
 * Locates the auto-sync workspace file in Google Drive.
 */
export async function findSyncFile(
  accessToken: string,
  folderId?: string
): Promise<DriveFile | null> {
  const cleanName = DRIVE_SYNC_FILE_NAME.replace(/'/g, "\\'");
  let q = `name = '${cleanName}' and trashed = false`;
  if (folderId) {
    q += ` and '${folderId}' in parents`;
  }

  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('q', q);
  url.searchParams.set('fields', 'files(id, name, mimeType, modifiedTime, createdTime, size, webViewLink)');
  url.searchParams.set('pageSize', '5');
  url.searchParams.set('orderBy', 'modifiedTime desc');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errBody = await res.text();
    handleDriveError(res, errBody, 'locate Google Drive sync file');
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0];
  }
  return null;
}

/**
 * Downloads and parses the content of a JSON file from Google Drive.
 */
export async function fetchDriveSyncContent(
  accessToken: string,
  fileId: string
): Promise<DriveSyncPayload | null> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errBody = await res.text();
    handleDriveError(res, errBody, 'download Google Drive sync file');
  }

  const text = await res.text();
  try {
    const parsed = JSON.parse(text);
    if (parsed && Array.isArray(parsed.companies)) {
      return parsed as DriveSyncPayload;
    }
  } catch (e) {
    console.warn('Failed to parse Google Drive sync file JSON:', e);
  }
  return null;
}

/**
 * Checks Google Drive upon login and synchronizes workspace:
 * - If Drive contains companies and local is empty (e.g. new computer / browser), restores Drive data.
 * - If Drive contains newer companies, restores Drive data.
 * - If local has companies but Drive is empty, uploads local data to Drive.
 * - If both have companies, combines them cleanly without data loss.
 */
export async function checkAndRestoreFromDrive(
  accessToken: string,
  localCompanies: Company[],
  userEmail?: string
): Promise<DriveSyncResult> {
  try {
    const cleanEmail = userEmail ? userEmail.trim().toLowerCase() : undefined;

    // Filter incoming local companies so only records belonging to this user or guest working session are considered
    const safeLocalCompanies = cleanEmail
      ? localCompanies.filter(
          (c) =>
            !c.userEmail ||
            c.userEmail === 'guest' ||
            c.userEmail.trim().toLowerCase() === cleanEmail
        )
      : localCompanies;

    // 1. Get or create root sync folder
    const folder = await findOrCreateSyncFolder(accessToken);

    // 2. Check if auto-sync file already exists in Google Drive
    const syncFile = await findSyncFile(accessToken, folder.id);

    if (syncFile) {
      // Fetch cloud backup from Google Drive
      const cloudPayload = await fetchDriveSyncContent(accessToken, syncFile.id);

      if (cloudPayload && cloudPayload.companies && cloudPayload.companies.length > 0) {
        // Exclude any cross-contaminated companies belonging to a different email
        const cloudCompanies = cloudPayload.companies
          .filter((c) => {
            if (!c?.id) return false;
            if (
              cleanEmail &&
              c.userEmail &&
              c.userEmail !== 'guest' &&
              c.userEmail.trim().toLowerCase() !== cleanEmail
            ) {
              return false;
            }
            return true;
          })
          .map((c) => ({
            ...c,
            userEmail: cleanEmail || c.userEmail,
          }));

        const cloudCount = cloudCompanies.length;
        const localCount = safeLocalCompanies.length;

        // Scenario A: Local is empty for this user -> Full Restore from Drive
        if (localCount === 0 && cloudCount > 0) {
          return {
            restored: true,
            syncedToCloud: false,
            companies: cloudCompanies,
            activeCompanyId: cloudPayload.activeCompanyId,
            message: `Restored ${cloudCount} company entity/entities from your Google Drive (${cleanEmail || 'cloud'}).`,
            lastSyncedAt: cloudPayload.exportedAt || syncFile.modifiedTime,
            fileId: syncFile.id,
          };
        }

        // Scenario B: Both have companies -> Merge by company ID, preserving all local working files
        const mergedMap = new Map<string, Company>();

        // Put local working companies in first so active working files are never lost
        safeLocalCompanies.forEach((localComp) => {
          if (localComp?.id) {
            mergedMap.set(localComp.id, {
              ...localComp,
              userEmail: cleanEmail || localComp.userEmail,
            });
          }
        });

        let hasNewLocal = safeLocalCompanies.some(
          (lc) => lc?.id && !cloudCompanies.some((cc) => cc.id === lc.id)
        );

        // Add any cloud companies not in local, or update if cloud copy has a newer updatedAt timestamp
        cloudCompanies.forEach((cloudComp) => {
          if (!cloudComp?.id) return;
          const existingLocal = mergedMap.get(cloudComp.id);
          if (!existingLocal) {
            mergedMap.set(cloudComp.id, cloudComp);
          } else {
            const localTime = existingLocal.updatedAt ? new Date(existingLocal.updatedAt).getTime() : 0;
            const cloudTime = cloudComp.updatedAt ? new Date(cloudComp.updatedAt).getTime() : 0;
            const localLedgers = existingLocal.mappedLedgers?.length || existingLocal.rawRows?.length || 0;
            const cloudLedgers = cloudComp.mappedLedgers?.length || cloudComp.rawRows?.length || 0;

            if (cloudTime > localTime || (localLedgers === 0 && cloudLedgers > 0)) {
              mergedMap.set(cloudComp.id, cloudComp);
            } else if (localTime > cloudTime) {
              hasNewLocal = true;
            }
          }
        });

        const mergedCompanies = Array.from(mergedMap.values());

        // If local had new or updated companies not yet in Drive, update Drive
        if (hasNewLocal) {
          await saveWorkspaceToDriveSync(accessToken, mergedCompanies, cloudPayload.activeCompanyId, userEmail, syncFile.id, folder.id);
        }

        return {
          restored: true,
          syncedToCloud: hasNewLocal,
          companies: mergedCompanies,
          activeCompanyId: cloudPayload.activeCompanyId || mergedCompanies[0]?.id,
          message: `Synced ${mergedCompanies.length} companies with your Google Drive (all working files preserved).`,
          lastSyncedAt: new Date().toISOString(),
          fileId: syncFile.id,
        };
      }
    }

    // Scenario C: No cloud file in Google Drive yet, but local has companies -> Upload local to Drive
    if (safeLocalCompanies.length > 0) {
      const activeId = safeLocalCompanies[0]?.id || '';
      const saveRes = await saveWorkspaceToDriveSync(
        accessToken,
        safeLocalCompanies,
        activeId,
        userEmail,
        undefined,
        folder.id
      );

      return {
        restored: false,
        syncedToCloud: true,
        companies: safeLocalCompanies,
        activeCompanyId: activeId,
        message: `Backed up ${safeLocalCompanies.length} existing local companies to your Google Drive!`,
        lastSyncedAt: saveRes.lastSyncedAt,
        fileId: saveRes.fileId,
      };
    }

    return {
      restored: false,
      syncedToCloud: false,
      companies: [],
      message: 'Google Drive connected. Ready to sync created companies.',
    };
  } catch (error: any) {
    if (!isGoogleAuthExpired(error)) {
      console.warn('Notice during checkAndRestoreFromDrive:', error?.message || error);
    }
    throw error;
  }
}

/**
 * Saves the active workspace to Google Drive:
 * - If fileId is known or found, updates file in-place (no duplicate files).
 * - Otherwise creates a new file in "CA Financial Statement Backups" folder.
 */
export async function saveWorkspaceToDriveSync(
  accessToken: string,
  companies: Company[],
  activeCompanyId: string,
  userEmail?: string,
  existingFileId?: string,
  existingFolderId?: string
): Promise<{ success: boolean; fileId: string; lastSyncedAt: string }> {
  try {
    // 1. Get or create folder
    const folderId = existingFolderId || (await findOrCreateSyncFolder(accessToken)).id;

    // 2. Find file ID if not passed
    let targetFileId = existingFileId;
    if (!targetFileId) {
      const found = await findSyncFile(accessToken, folderId);
      if (found) targetFileId = found.id;
    }

    // 3. Prepare payload strictly filtered to this user's companies
    const now = new Date().toISOString();
    const cleanEmail = userEmail ? userEmail.trim().toLowerCase() : undefined;
    const safeCompanies = companies
      .filter((c) => !cleanEmail || !c.userEmail || c.userEmail.trim().toLowerCase() === cleanEmail)
      .map((c) => ({
        ...c,
        userEmail: cleanEmail || c.userEmail || 'ca-user',
      }));

    const payload: DriveSyncPayload = {
      version: 2,
      appName: 'AuditFinancials',
      schemaVersion: '2.0.0',
      exportedAt: now,
      userEmail: cleanEmail || 'ca-user',
      activeCompanyId: activeCompanyId || (safeCompanies[0]?.id ?? ''),
      companies: safeCompanies,
    };

    const jsonString = JSON.stringify(payload, null, 2);

    if (targetFileId) {
      // In-place update existing file content (PATCH)
      const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${targetFileId}?uploadType=media`;
      const updateRes = await fetch(uploadUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: jsonString,
      });

      if (!updateRes.ok) {
        const errBody = await updateRes.text();
        handleDriveError(updateRes, errBody, 'update Google Drive auto-sync file');
      }

      return {
        success: true,
        fileId: targetFileId,
        lastSyncedAt: now,
      };
    } else {
      // Multipart upload for new file with folder metadata
      const boundary = `-------DriveSyncBoundary_${Date.now()}`;
      const metadata = {
        name: DRIVE_SYNC_FILE_NAME,
        mimeType: 'application/json',
        description: 'Auto-sync audit financial statements and companies workspace',
        parents: [folderId],
      };

      const multipartBody =
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        JSON.stringify(metadata) +
        `\r\n--${boundary}\r\n` +
        `Content-Type: application/json\r\n\r\n` +
        jsonString +
        `\r\n--${boundary}--`;

      const uploadRes = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: multipartBody,
        }
      );

      if (!uploadRes.ok) {
        const errBody = await uploadRes.text();
        handleDriveError(uploadRes, errBody, 'create Google Drive auto-sync file');
      }

      const createdFile: DriveFile = await uploadRes.json();
      return {
        success: true,
        fileId: createdFile.id,
        lastSyncedAt: now,
      };
    }
  } catch (error: any) {
    if (!isGoogleAuthExpired(error)) {
      console.warn('Notice during saveWorkspaceToDriveSync:', error?.message || error);
    }
    throw error;
  }
}
