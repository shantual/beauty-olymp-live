// pages/api/gc/champ-webhook.js

import crypto from 'crypto';
import { getSupabaseServerClient } from '../../../lib/supabaseServer';

export default async function handler(req, res) {
  // Только POST
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const { user_id, email, full_name, training_id, secret } = req.body || {};

    // 1) Проверка секрета (защита webhook)
    if (!secret || secret !== process.env.GC_WEBHOOK_SECRET) {
      console.error('Invalid secret', { received: secret });
      return res.status(403).json({ ok: false, error: 'invalid_secret' });
    }

    // 2) Проверка обязательных полей
    if (!user_id) {
      return res.status(400).json({ ok: false, error: 'no_user_id' });
    }
    if (!email) {
      // email нужен, чтобы потом отображать/идентифицировать
      return res.status(400).json({ ok: false, error: 'no_email' });
    }

    // 3) (опционально) Ограничение по тренингу — пока выключено
    // Если хочешь включить обратно — раскомментируй блок и проверь CHAMP_TRAINING_ID
    //
    // if (
    //   process.env.CHAMP_TRAINING_ID &&
    //   String(training_id) !== String(process.env.CHAMP_TRAINING_ID)
    // ) {
    //   return res.status(200).json({ ok: true, skipped: true });
    // }

    // 4) Генерация токена
    const olympToken = crypto.randomUUID();

    // 5) Сохраняем токен в GetCourse в extra-поле
    const params = new URLSearchParams();
    params.append('key', process.env.GC_API_KEY || '');
    params.append('user[id]', String(user_id));
    params.append('user[extra][olymp_token]', olympToken);

    if (!process.env.GC_ACCOUNT) {
      return res.status(500).json({ ok: false, error: 'missing_gc_account' });
    }
    if (!process.env.GC_API_KEY) {
      return res.status(500).json({ ok: false, error: 'missing_gc_api_key' });
    }

    const gcUrl = `https://${process.env.GC_ACCOUNT}.getcourse.ru/pl/api/users/update`;

    const gcResponse = await fetch(gcUrl, {
      method: 'POST',
      body: params,
    });

    // GetCourse иногда возвращает не-json. Страхуемся:
    let gcData = {};
    try {
      gcData = await gcResponse.json();
    } catch {
      gcData = { raw: await gcResponse.text().catch(() => '') };
    }

    // Варианты успешного ответа GC бывают разные, но если явно success:false — считаем ошибкой
    if (gcData && gcData.success === false) {
      console.error('GC update failed:', gcData);
      return res.status(500).json({ ok: false, error: 'gc_update_failed', gcData });
    }

    // 6) Сохраняем пользователя и токен в Supabase
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('users')
      .upsert(
        {
          email,
          full_name: full_name || null,
          gc_user_id: String(user_id),
          olymp_token: olympToken,
          role: 'participant',
          // training_id можешь хранить тоже, если добавишь колонку:
          // champ_training_id: training_id ? String(training_id) : null,
        },
        { onConflict: 'gc_user_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        ok: false,
        error: 'supabase_error',
        details: error,
      });
    }

    // 7) Успех
    return res.status(200).json({
      ok: true,
      olympToken,
      user: data ? { id: data.id, email: data.email, full_name: data.full_name } : null,
    });
  } catch (e) {
    console.error('Webhook crash:', e);
    return res.status(500).json({
      ok: false,
      error: 'server_error',
      message: String(e?.message || e),
      name: String(e?.name || ''),
    });
  }
}
