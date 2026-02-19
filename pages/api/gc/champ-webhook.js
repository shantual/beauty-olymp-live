// pages/api/gc/champ-webhook.js

import crypto from 'crypto';
import { getSupabaseServerClient } from '../../../lib/supabaseServer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const { user_id, email, full_name, training_id, secret } = req.body || {};

    // 1. Check secret
    if (!secret || secret !== process.env.GC_WEBHOOK_SECRET) {
      console.error('Invalid secret', { received: secret });
      return res.status(403).json({ ok: false, error: 'invalid_secret' });
    }

    // 2. Check that this is the correct training
    if (
      process.env.CHAMP_TRAINING_ID &&
      String(training_id) !== String(process.env.CHAMP_TRAINING_ID)
    ) {
      console.log('Skipping, training ID mismatch');
      return res.status(200).json({ ok: true, skipped: true });
    }

    if (!user_id) {
      return res.status(400).json({ ok: false, error: 'no_user_id' });
    }

    // 3. Generate token
    const olympToken = crypto.randomUUID();

    // 4. Save token in GetCourse
    const params = new URLSearchParams();
    params.append('key', process.env.GC_API_KEY);
    params.append('user[id]', String(user_id));
    params.append('user[extra][olymp_token]', olympToken);

    const gcResponse = await fetch(
      `https://${process.env.GC_ACCOUNT}.getcourse.ru/pl/api/users/update`,
      {
        method: 'POST',
        body: params,
      }
    );

    const gcData = await gcResponse.json().catch(() => ({}));

    if (!gcData || gcData.success === false) {
      console.error('GC update failed:', gcData);
      return res.status(500).json({ ok: false, error: 'gc_update_failed', gcData });
    }
const supabase = getSupabaseServerClient();
    // 5. Save user in Supabase
    const { data, error } = await supabaseServerClient
      .from('users')
      .upsert(
        {
          email,
          full_name,
          gc_user_id: user_id,
          olymp_token: olympToken,
          role: 'participant',
        },
{ onConflict: 'gc_user_id' }
      );

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ ok: false, error: 'supabase_error', details: error });
    }

    return res.status(200).json({ ok: true, olympToken });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}
