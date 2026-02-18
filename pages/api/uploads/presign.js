import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getSupabaseServerClient } from '../../../lib/supabaseServer';
import {
  assertStorageConfig,
  getStorageClient,
  makeObjectKey,
  makeObjectUrl,
} from '../../../lib/storageServer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const cfg = assertStorageConfig();
    const {
      originalFileName,
      mimeType,
      size,
      userId,
      submissionId,
      fileKind,
    } = req.body || {};

    if (!originalFileName || !mimeType || !size || !userId || !submissionId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const kind = fileKind || (mimeType.startsWith('image/') ? 'image' : 'video');
    const allowedList = cfg.allowedMime[kind] || [];
    if (!allowedList.includes(mimeType)) {
      return res.status(400).json({ error: `Unsupported mimeType: ${mimeType}` });
    }

    if (Number(size) > cfg.maxFileSizeBytes) {
      return res.status(400).json({ error: `File too large: ${size}` });
    }

    const supabase = getSupabaseServerClient();
    const { count, error: countError } = await supabase
      .from('uploads')
      .select('*', { count: 'exact', head: true })
      .eq('submission_id', submissionId)
      .eq('status', 'uploaded');

    if (countError) {
      return res.status(500).json({ error: countError.message || 'Failed to validate submission limits' });
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
    const command = new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: objectKey,
      ContentType: mimeType,
    });

    const uploadUrl = await getSignedUrl(client, command, {
      expiresIn: cfg.presignExpiresSeconds,
    });

    return res.status(200).json({
      uploadUrl,
      objectKey,
      method: 'PUT',
      objectUrl: makeObjectUrl(cfg.bucket, cfg.endpoint, objectKey),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to presign upload' });
  }
}
