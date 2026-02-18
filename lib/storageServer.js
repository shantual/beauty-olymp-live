import { S3Client } from '@aws-sdk/client-s3';

let cachedClient = null;

export function getStorageConfig() {
  const {
    YC_STORAGE_BUCKET,
    YC_STORAGE_REGION = 'ru-central1',
    YC_STORAGE_ENDPOINT = 'https://storage.yandexcloud.net',
    YC_ACCESS_KEY_ID,
    YC_SECRET_ACCESS_KEY,
    YC_UPLOAD_ALLOWED_IMAGE_MIME = 'image/jpeg,image/png,image/webp',
    YC_UPLOAD_ALLOWED_VIDEO_MIME = 'video/mp4,video/quicktime',
    YC_UPLOAD_MAX_FILE_SIZE_BYTES = '157286400',
    YC_UPLOAD_MAX_FILES_PER_SUBMISSION = '20',
    YC_UPLOAD_PRESIGN_EXPIRES_SECONDS = '900',
    YC_UPLOAD_GET_EXPIRES_SECONDS = '600',
    OLYMP_SEASON = '2025',
  } = process.env;

  return {
    bucket: YC_STORAGE_BUCKET,
    region: YC_STORAGE_REGION,
    endpoint: YC_STORAGE_ENDPOINT,
    accessKeyId: YC_ACCESS_KEY_ID,
    secretAccessKey: YC_SECRET_ACCESS_KEY,
    season: OLYMP_SEASON,
    maxFileSizeBytes: Number(YC_UPLOAD_MAX_FILE_SIZE_BYTES),
    maxFilesPerSubmission: Number(YC_UPLOAD_MAX_FILES_PER_SUBMISSION),
    presignExpiresSeconds: Number(YC_UPLOAD_PRESIGN_EXPIRES_SECONDS),
    getExpiresSeconds: Number(YC_UPLOAD_GET_EXPIRES_SECONDS),
    allowedMime: {
      image: YC_UPLOAD_ALLOWED_IMAGE_MIME.split(',').map((v) => v.trim()).filter(Boolean),
      video: YC_UPLOAD_ALLOWED_VIDEO_MIME.split(',').map((v) => v.trim()).filter(Boolean),
    },
  };
}

export function assertStorageConfig() {
  const cfg = getStorageConfig();
  const required = ['bucket', 'region', 'endpoint', 'accessKeyId', 'secretAccessKey'];
  const missing = required.filter((key) => !cfg[key]);
  if (missing.length) {
    throw new Error(`Missing storage env vars: ${missing.join(', ')}`);
  }
  return cfg;
}

export function getStorageClient() {
  if (cachedClient) return cachedClient;
  const cfg = assertStorageConfig();
  cachedClient = new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
    forcePathStyle: true,
  });
  return cachedClient;
}

export function sanitizeFileName(fileName) {
  const cleaned = String(fileName || 'file')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || 'file';
}

export function makeObjectKey({ season, submissionId, userId, originalFileName, timestamp }) {
  const ts = timestamp || Date.now();
  const safeName = sanitizeFileName(originalFileName);
  return `olymp/${season}/${submissionId}/${userId}/${ts}_${safeName}`;
}

export function makeObjectUrl(bucket, endpoint, objectKey) {
  const endpointHost = String(endpoint || 'https://storage.yandexcloud.net').replace(/\/$/, '');
  return `${endpointHost}/${bucket}/${objectKey}`;
}
