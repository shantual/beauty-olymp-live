import Dashboard from '../components/Dashboard';
import { getSupabaseServerClient } from '../lib/supabaseServer';

export async function getServerSideProps({ query, req, res }) {
  const supabase = getSupabaseServerClient();

  const rawToken = Array.isArray(query.token) ? query.token[0] : query.token;
const tokenRaw = rawToken ? String(rawToken).trim() : null;

// если в iframe прилетает не подставленный шаблон {{...}} — считаем токен отсутствующим
const token = tokenRaw && tokenRaw.includes('{{') ? null : tokenRaw;


    const gcUserIdRaw = query.gc_user_id || null;
const gcUserId = gcUserIdRaw ? String(gcUserIdRaw).replace(/\D/g, '') : null;


 // 1.5) Если нет token, но есть gc_user_id — пробуем логин по gc_user_id
if (!token && gcUserId) {
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .or(`gc_user_id.eq.${gcUserId},gc_user_id.eq.{${gcUserId}}`)
    .maybeSingle();

  if (user) {
    const host = req.headers.host || '';
const domainPart = host.endsWith('1olymp.ru') ? 'Domain=.1olymp.ru; ' : '';

res.setHeader(
  'Set-Cookie',
  `olymp_user=${user.id}; Path=/; ${domainPart}HttpOnly; Max-Age=2592000; SameSite=None; Secure`
);

    return { props: { user } };
  }
}

  // 2) Если есть token — логиним по token и ставим cookie
  if (token) {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('olymp_token', token)
      .maybeSingle();

    if (user) {
      // cookie для iframe: SameSite=None + Secure обязательно
      const host = req.headers.host || '';
const domainPart = host.endsWith('1olymp.ru') ? 'Domain=.1olymp.ru; ' : '';

res.setHeader(
  'Set-Cookie',
  `olymp_user=${user.id}; Path=/; ${domainPart}HttpOnly; Max-Age=2592000; SameSite=None; Secure`
);

      return { props: { user } };
    }

    return { props: { user: null, authError: 'user_not_found' } };
  }

  // 3) Нет token и нет cookie
  return { props: { user: null, authError: 'no_token' } };
}

export default function ParticipantPage({ user, authError }) {
  if (!user) {
    return (
      <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
        <h2>Не удалось открыть кабинет</h2>
        <p>Ошибка: {authError}</p>
        <p>Откройте кабинет из GetCourse ещё раз или напишите в поддержку.</p>
      </div>
    );
  }

  return <Dashboard forcedRole="participant" user={user} />;
}
