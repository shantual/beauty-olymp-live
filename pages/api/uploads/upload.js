import fs from 'fs';
import formidable from 'formidable';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import mime from 'mime-types';
import { getSupabaseServerClient } from '../../../lib/supabaseServer';
import {
  assertStorageConfig,
  getStorageClient,
  makeObjectKey,
  makeObjectUrl,
} from '../../../lib/storageServer';

export const config = {
  api: { bodyParser: false },
};

function parseForm(req) {
  const form = formidable({ multiples: false });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const cfg = assertStorageConfig();
    const { fields, files } = await parseForm(req);

    const file = files.file;
    const userId = String(fields.userId || '').trim();
    const submissionId = String(fields.submissionId || '').trim();
    const fileKind = String(fields.fileKind || '').trim();

    if (!file || !userId || !submissionId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const size = Number(file.size || 0);

    const fallbackName = String(fields.originalFileName || '').trim();
    const fallbackMime = String(fields.clientMimeType || '').trim();

    const originalFileName = String(file.originalFilename || fallbackName || 'file');
    let mimeType = String(file.mimetype || fallbackMime || '').trim();

    // Если mimetype пустой или octet-stream - пробуем определить по расширению
    if (!mimeType || mimeType === 'application/octet-stream') {
      const guessed = mime.lookup(originalFileName);
      if (guessed) mimeType = String(guessed);
    }

    if (!mimeType) {
      mimeType = 'application/octet-stream';
    }

    // Определяем kind
    const kind =
      fileKind ||
      (mimeType.startsWith('image/')
        ? 'image'
        : mimeType.startsWith('video/')
          ? 'video'
          : 'file');

    // Проверяем размер
    if (size > cfg.maxFileSizeBytes) {
      return res.status(400).json({ error: `File too large: ${size}` });
    }

    // Проверяем допустимость mimeType
    const allowedList = cfg.allowedMime[kind] || [];

    // Если mimeType известен - проверяем по списку
    if (
      allowedList.length &&
      mimeType !== 'application/octet-stream' &&
      !allowedList.includes(mimeType)
    ) {
      return res.status(400).json({ error: `Unsupported mimeType: ${mimeType}` });
    }

    // Если mimeType остался octet-stream - проверяем по расширению
    if (mimeType === 'application/octet-stream') {
      const parts = originalFileName.split('.');
      const ext = (parts.length > 1 ? parts.pop() : '').toLowerCase();

      const allowedExt =
        kind === 'image'
          ? ['jpg', 'jpeg', 'png', 'webp']
          : kind === 'video'
            ? ['mp4', 'mov', 'webm']
            : [];

      if (allowedExt.length && (!ext || !allowedExt.includes(ext))) {
        return res.status(400).json({ error: `Unsupported file type: .${ext || '?'}` });
      }
    }

    // лимит файлов на submission (как в presign.js)
    const supabase = getSupabaseServerClient();
    const { count, error: countError } = await supabase
      .from('uploads')
      .select('*', { count: 'exact', head: true })
      .eq('submission_id', submissionId)
      .eq('status', 'uploaded');

    if (countError) {
      return res
        .status(500)
        .json({ error: countError.message || 'Failed to validate submission limits' });
    }

    if ((count || 0) >= cfg.maxFilesPerSubmission) {
      return res.status(400).json({ error: 'Submission file count limit exceeded' });
    }

    const objectKey = makeObjectKey({
      season: cfg.season,
      submissionId,
      userId,
      originalFileName,
      timestamp: Date.now(),
    });

    const client = getStorageClient();
    const body = fs.readFileSync(file.filepath);

    await client.send(
      new PutObjectCommand({
        Bucket: cfg.bucket,
        Key: objectKey,
        Body: body,
        ContentType: mimeType,
      })
    );

    const objectUrl = makeObjectUrl(cfg.bucket, cfg.endpoint, objectKey);

    const { data: inserted, error: insertError } = await supabase
      .from('uploads')
      .insert({
        submission_id: submissionId,
        user_id: userId,
        object_key: objectKey,
        original_file_name: originalFileName,
        mime_type: mimeType,
        size,
        kind,
        status: 'uploaded',
        object_url: objectUrl,
      })
      .select('*')
      .single();

    if (insertError) {
      return res
        .status(500)
        .json({ error: insertError.message || 'Failed to save upload record' });
    }

    return res.status(200).json({
      record: inserted,
      url: objectUrl,
      key: objectKey,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to upload' });
  }
}
