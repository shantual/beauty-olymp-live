import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getSupabaseServerClient } from '../../../lib/supabaseServer';
import { assertStorageConfig, getStorageClient } from '../../../lib/storageServer';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const cfg = assertStorageConfig();
    const { submissionId, withSignedGet } = req.query;

    const supabase = getSupabaseServerClient();
    let query = supabase
      .from('uploads')
      .select('*')
      .order('created_at', { ascending: false });

    if (submissionId) {
      query = query.eq('submission_id', submissionId);
    }

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ error: error.message || 'Failed to list uploads' });
    }

    const rows = data || [];
    if (!withSignedGet) {
      return res.status(200).json({ records: rows });
    }

    const client = getStorageClient();
    const signedRecords = await Promise.all(rows.map(async (record) => {
      const command = new GetObjectCommand({
        Bucket: cfg.bucket,
        Key: record.object_key,
      });
      const downloadUrl = await getSignedUrl(client, command, {
        expiresIn: cfg.getExpiresSeconds,
      });
      return { ...record, downloadUrl };
    }));

    return res.status(200).json({ records: signedRecords });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to list uploads' });
  }
}
