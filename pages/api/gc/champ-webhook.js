// pages/api/gc/champ-webhook.js

import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const { user_id, email, full_name, training_id, secret } = req.body || {};

    // 1. Проверяем секрет
    if (!secret || secret !== process.env.GC_WEBHOOK_SECRET) {
      console.error('Invalid secret', { received: secret });
      return res.status(403).json({ ok: false, error: 'invalid_secret' });
    }

    // 2. Проверяем, что это нужный тренинг (если указан)
    if (
      process.env.CHAMP_TRAINING_ID &&
      String(training_id) !== String(process.env.CHAMP_TRAINING_ID)
    ) {
      console.log('Skipping, training ID does not match');
      return res.status(200).json({ ok: true, skipped: true });
    }

    if (!user_id) {
      return res.status(400).json({ ok: false, error: 'no_user_id' });
    }

    // 3. Генерируем токен
    const olympToken = crypto.randomUUID();

    // 4. Сохраняем токен в GetCourse (доп. поле olymp_token)
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

    const data = await gcResponse.json().catch(() => ({}));

    if (!data || data.success === false) {
      console.error('GC update failed:', data);
      return res.status(500).json({ ok: false, error: 'gc_update_failed', data });
    }

    return res.status(200).json({ ok: true, olympToken });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}
