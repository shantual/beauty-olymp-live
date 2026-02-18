import { getSupabaseServerClient } from '../../../lib/supabaseServer';
import { assertStorageConfig, makeObjectUrl } from '../../../lib/storageServer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const cfg = assertStorageConfig();
    const {
      objectKey,
      originalFileName,
      size,
      mimeType,
      userId,
      submissionId,
      status = 'uploaded',
      meta = {},
    } = req.body || {};

    if (!objectKey || !originalFileName || !size || !mimeType || !userId || !submissionId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const supabase = getSupabaseServerClient();
    const payload = {
      submission_id: submissionId,
      user_id: userId,
      object_key: objectKey,
      original_name: originalFileName,
      size: Number(size),
      mime: mimeType,
      status,
      meta,
    };

    const { data, error } = await supabase
      .from('uploads')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message || 'Failed to persist upload metadata' });
    }

    return res.status(200).json({
      ok: true,
      record: {
        ...data,
        objectUrl: makeObjectUrl(cfg.bucket, cfg.endpoint, objectKey),
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to complete upload' });
  }
}
