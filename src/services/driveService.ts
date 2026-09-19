// Google Drive API Service for CA Financial Statement & Audit Workspace
// Handles client-side Drive API v3 operations using OAuth access tokens

export class GoogleAuthExpiredError extends Error {
  status: number;
  constructor(
    message = 'Google Workspace access token has expired or is invalid. Please reconnect your Google account.',
    status = 401
  ) {
    super(message);
    this.name = 'GoogleAuthExpiredError';
    this.status = status;
  }
}

export function isGoogleAuthExpired(err: any): boolean {
  if (!err) return false;
  if (err instanceof GoogleAuthExpiredError || err.name === 'GoogleAuthExpiredError') return true;
  const msg = String(err.message || err);
  return (
    msg.includes('401') ||
    msg.includes('UNAUTHENTICATED') ||
    msg.includes('Invalid Credentials') ||
    msg.includes('invalid authentication credentials') ||
    msg.includes('authError')
  );
}

export class GoogleDriveApiDisabledError extends Error {
  status: number;
  projectId: string;
  activationUrl: string;
  constructor(
    projectId = '471811229038',
    activationUrl?: string,
    status = 403
  ) {
    const url =
      activationUrl ||
      `https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=${projectId}`;
    super(
      `Google Drive API is disabled in Google Cloud project (${projectId}). Please enable it in Google Cloud Console.`
    );
    this.name = 'GoogleDriveApiDisabledError';
    this.status = status;
    this.projectId = projectId;
    this.activationUrl = url;
  }
}

export function isGoogleDriveApiDisabled(err: any): boolean {
  if (!err) return false;
  if (err instanceof GoogleDriveApiDisabledError || err.name === 'GoogleDriveApiDisabledError') return true;
  const msg = String(err.message || err);
  return (
    msg.includes('SERVICE_DISABLED') ||
    msg.includes('Google Drive API has not been used') ||
    msg.includes('accessNotConfigured') ||
    (msg.includes('drive.googleapis.com') && (msg.includes('disabled') || msg.includes('Enable it')))
  );
}

export function extractDriveActivationUrl(err: any): string {
  if (err && typeof err === 'object' && err.activationUrl) {
    return err.activationUrl;
  }
  const msg = String(err?.message || err || '');
  const urlMatch = msg.match(/https:\/\/[^\s"',)]+/);
  if (urlMatch && urlMatch[0].includes('drive.googleapis.com')) {
    return urlMatch[0];
  }
  const projMatch = msg.match(/project(?:s\/|\s+)(\d+)/i);
  const projId = projMatch ? projMatch[1] : '471811229038';
  return `https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=${projId}`;
}

function handleDriveError(res: Response, errorBody: string, actionDesc: string): never {
  if (
    res.status === 401 ||
    errorBody.includes('UNAUTHENTICATED') ||
    errorBody.includes('Invalid Credentials') ||
    errorBody.includes('authError')
  ) {
    throw new GoogleAuthExpiredError(
      `Google Workspace access token has expired while trying to ${actionDesc}. Please reconnect your Google account.`,
      res.status
    );
  }

  if (
    errorBody.includes('SERVICE_DISABLED') ||
    errorBody.includes('Google Drive API has not been used') ||
    errorBody.includes('accessNotConfigured') ||
    (res.status === 403 && errorBody.includes('drive.googleapis.com'))
  ) {
    const projMatch = errorBody.match(/project(?:s\/|\s+)(\d+)/i);
    const projId = projMatch ? projMatch[1] : '471811229038';
    const urlMatch = errorBody.match(/https:\/\/[^\s"',)]+/);
    const activationUrl =
      urlMatch && urlMatch[0].includes('drive.googleapis.com')
        ? urlMatch[0]
        : `https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=${projId}`;

    throw new GoogleDriveApiDisabledError(projId, activationUrl, res.status);
  }

  throw new Error(`Failed to ${actionDesc} (${res.status}): ${errorBody}`);
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  createdTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
  parents?: string[];
  owners?: Array<{
    displayName: string;
    emailAddress: string;
    photoLink?: string;
  }>;
  trashed?: boolean;
}

export interface DriveAbout {
  user: {
    displayName: string;
    emailAddress: string;
    photoLink?: string;
  };
  storageQuota: {
    limit?: string;
    usage?: string;
    usageInDrive?: string;
    usageInDriveTrash?: string;
  };
}

export interface ListDriveFilesOptions {
  query?: string;
  folderId?: string;
  filterType?: 'all' | 'spreadsheets' | 'csv' | 'json' | 'pdf' | 'folders';
  pageSize?: number;
  pageToken?: string;
}

/**
 * Fetches current user profile and Google Drive storage quota
 */
export async function getDriveAbout(accessToken: string): Promise<DriveAbout> {
  const res = await fetch(
    'https://www.googleapis.com/drive/v3/about?fields=user,storageQuota',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    const errorBody = await res.text();
    handleDriveError(res, errorBody, 'load Google Drive quota');
  }

  return res.json();
}

/**
 * Lists files and folders in Google Drive with query & type filters
 */
export async function listDriveFiles(
  accessToken: string,
  options: ListDriveFilesOptions = {}
): Promise<{ files: DriveFile[]; nextPageToken?: string }> {
  const {
    query = '',
    folderId = '',
    filterType = 'all',
    pageSize = 30,
    pageToken = '',
  } = options;

  const queryParts: string[] = ['trashed = false'];

  if (folderId) {
    queryParts.push(`'${folderId}' in parents`);
  }

  if (filterType === 'spreadsheets') {
    queryParts.push(
      "(mimeType = 'application/vnd.google-apps.spreadsheet' or mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or mimeType = 'application/vnd.ms-excel')"
    );
  } else if (filterType === 'csv') {
    queryParts.push(
      "(mimeType = 'text/csv' or mimeType = 'text/comma-separated-values' or name contains '.csv')"
    );
  } else if (filterType === 'json') {
    queryParts.push(
      "(mimeType = 'application/json' or name contains '.json')"
    );
  } else if (filterType === 'pdf') {
    queryParts.push("mimeType = 'application/pdf'");
  } else if (filterType === 'folders') {
    queryParts.push("mimeType = 'application/vnd.google-apps.folder'");
  }

  if (query.trim()) {
    const cleanQ = query.trim().replace(/'/g, "\\'");
    queryParts.push(`name contains '${cleanQ}'`);
  }

  const q = queryParts.join(' and ');
  const fields =
    'nextPageToken, files(id, name, mimeType, size, modifiedTime, createdTime, webViewLink, webContentLink, iconLink, thumbnailLink, parents, owners, trashed)';

  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('q', q);
  url.searchParams.set('pageSize', String(pageSize));
  url.searchParams.set('fields', fields);
  url.searchParams.set('orderBy', 'folder,modifiedTime desc');

  if (pageToken) {
    url.searchParams.set('pageToken', pageToken);
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorBody = await res.text();
    handleDriveError(res, errorBody, 'list Drive files');
  }

  const data = await res.json();
  return {
    files: data.files || [],
    nextPageToken: data.nextPageToken,
  };
}

/**
 * Creates a folder in Google Drive
 */
export async function createDriveFolder(
  accessToken: string,
  folderName: string,
  parentFolderId?: string
): Promise<DriveFile> {
  const metadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };

  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    handleDriveError(res, errorBody, 'create Google Drive folder');
  }

  return res.json();
}

/**
 * Finds or creates a dedicated CA Audit client folder in Google Drive
 */
export async function findOrCreateEntityFolder(
  accessToken: string,
  entityName: string,
  fyYear: string
): Promise<DriveFile> {
  const targetName = `CA Audit - ${entityName || 'Client'} (FY ${fyYear})`;
  const cleanQ = targetName.replace(/'/g, "\\'");
  const q = `mimeType = 'application/vnd.google-apps.folder' and name = '${cleanQ}' and trashed = false`;

  const searchUrl = new URL('https://www.googleapis.com/drive/v3/files');
  searchUrl.searchParams.set('q', q);
  searchUrl.searchParams.set('fields', 'files(id, name, mimeType, webViewLink)');

  const searchRes = await fetch(searchUrl.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!searchRes.ok) {
    const errBody = await searchRes.text().catch(() => '');
    if (
      searchRes.status === 401 ||
      errBody.includes('UNAUTHENTICATED') ||
      errBody.includes('Invalid Credentials')
    ) {
      handleDriveError(searchRes, errBody, 'access Google Drive');
    }
  } else {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      return data.files[0];
    }
  }

  // Create folder if not found
  return createDriveFolder(accessToken, targetName);
}

/**
 * Uploads a file (Binary or Text) to Google Drive using multipart upload
 */
export async function uploadDriveFile(
  accessToken: string,
  params: {
    name: string;
    content: Blob | string | Uint8Array | ArrayBuffer;
    mimeType: string;
    parentFolderId?: string;
  }
): Promise<DriveFile> {
  const { name, content, mimeType, parentFolderId } = params;

  const metadata: any = {
    name,
    mimeType,
  };

  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const boundary = `-------DriveUploadPart_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  // Prepare body blobs
  const metadataPart = new Blob(
    [
      delimiter,
      'Content-Type: application/json; charset=UTF-8\r\n\r\n',
      JSON.stringify(metadata),
      delimiter,
      `Content-Type: ${mimeType}\r\n\r\n`,
    ],
    { type: 'text/plain' }
  );

  let contentBlob: Blob;
  if (content instanceof Blob) {
    contentBlob = content;
  } else if (typeof content === 'string') {
    contentBlob = new Blob([content], { type: mimeType });
  } else {
    contentBlob = new Blob([content as any], { type: mimeType });
  }

  const closeBlob = new Blob([closeDelimiter], { type: 'text/plain' });
  const multipartBody = new Blob([metadataPart, contentBlob, closeBlob]);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,webContentLink,modifiedTime',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  );

  if (!res.ok) {
    const errorBody = await res.text();
    handleDriveError(res, errorBody, 'upload file to Google Drive');
  }

  return res.json();
}

/**
 * Downloads a file from Google Drive as an ArrayBuffer.
 * Automatically exports Google Sheets to Microsoft Excel (.xlsx).
 */
export async function downloadDriveFile(
  accessToken: string,
  fileId: string,
  mimeType?: string
): Promise<{ data: ArrayBuffer; mimeType: string }> {
  let downloadUrl: string;
  let effectiveMime = mimeType || 'application/octet-stream';

  if (mimeType === 'application/vnd.google-apps.spreadsheet') {
    // Export Google Sheet to Excel format
    downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`;
    effectiveMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  } else {
    downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  }

  const res = await fetch(downloadUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorBody = await res.text();
    handleDriveError(res, errorBody, 'download file from Google Drive');
  }

  const data = await res.arrayBuffer();
  return { data, mimeType: effectiveMime };
}

/**
 * Trashes a file in Google Drive.
 * (MANDATORY: UI must require an explicit confirmation modal before invoking this!)
 */
export async function trashDriveFile(
  accessToken: string,
  fileId: string
): Promise<void> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ trashed: true }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    handleDriveError(res, errorBody, 'trash file in Google Drive');
  }
}
