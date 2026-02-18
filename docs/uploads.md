# Yandex Object Storage Uploads (Presigned URL)

## File structure

- `pages/api/uploads/presign.js` — выдача presigned PUT URL
- `pages/api/uploads/complete.js` — фиксация метаданных в Supabase после успешной загрузки
- `pages/api/uploads/index.js` — список загруженных файлов из Supabase (+опционально presigned GET)
- `lib/storageServer.js` — S3/Yandex Object Storage конфиг, валидация, генерация objectKey
- `lib/supabaseServer.js` — server-only Supabase client (service role)
- `components/upload/UploadWidget.js` — клиентский виджет загрузки с прогрессом

## Required env vars (Vercel)

### Object Storage
- `YC_STORAGE_BUCKET`
- `YC_STORAGE_REGION=ru-central1`
- `YC_STORAGE_ENDPOINT=https://storage.yandexcloud.net`
- `YC_ACCESS_KEY_ID`
- `YC_SECRET_ACCESS_KEY`

### Supabase (server-only)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Optional env vars

- `YC_UPLOAD_ALLOWED_IMAGE_MIME=image/jpeg,image/png,image/webp`
- `YC_UPLOAD_ALLOWED_VIDEO_MIME=video/mp4,video/quicktime`
- `YC_UPLOAD_MAX_FILE_SIZE_BYTES=157286400`
- `YC_UPLOAD_MAX_FILES_PER_SUBMISSION=20`
- `YC_UPLOAD_PRESIGN_EXPIRES_SECONDS=900`
- `YC_UPLOAD_GET_EXPIRES_SECONDS=600`
- `OLYMP_SEASON=2025`

## Supabase setup

Create table `public.uploads`:

```sql
create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  submission_id text not null,
  user_id text not null,
  object_key text not null,
  original_name text not null,
  size bigint not null,
  mime text not null,
  created_at timestamptz not null default now(),
  status text not null default 'uploaded',
  meta jsonb not null default '{}'::jsonb
);

create index if not exists uploads_submission_id_idx on public.uploads(submission_id);
create index if not exists uploads_created_at_idx on public.uploads(created_at desc);
```

## Bucket CORS example

```json
[
  {
    "AllowedOrigins": ["https://<your-vercel-domain>", "http://localhost:3000"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

## API contracts

### POST `/api/uploads/presign`
Request:
```json
{
  "originalFileName": "work1.jpg",
  "mimeType": "image/jpeg",
  "size": 12345,
  "userId": "user-1",
  "submissionId": "submission-1",
  "fileKind": "image"
}
```

Response:
```json
{
  "uploadUrl": "...",
  "objectKey": "olymp/2025/submission-1/user-1/171..._work1.jpg",
  "method": "PUT",
  "objectUrl": "https://storage.yandexcloud.net/<bucket>/<objectKey>"
}
```

### POST `/api/uploads/complete`
Request:
```json
{
  "objectKey": "olymp/...",
  "originalFileName": "work1.jpg",
  "size": 12345,
  "mimeType": "image/jpeg",
  "userId": "user-1",
  "submissionId": "submission-1",
  "status": "uploaded",
  "meta": {}
}
```

### GET `/api/uploads?submissionId=submission-1&withSignedGet=1`
Reads from Supabase, filters by `submission_id`, sorts by `created_at desc`, and with `withSignedGet=1` returns temporary `signedGetUrl` (TTL clamped to 15-60 minutes).

## Run

1. Set env vars locally (`.env.local`) and in Vercel.
2. Run SQL setup for `public.uploads` in Supabase.
3. `npm install`
4. `npm run dev`
