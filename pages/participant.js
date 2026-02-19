import Dashboard from '../components/Dashboard';
import { getSupabaseServerClient } from '../lib/supabaseServer';

function parseCookies(cookieHeader = '') {
  return Object.fromEntries(
    cookieHeader
      .split(';')
      .map((v) => v.trim())
      .filter(Boolean)
      .map((v) => {
        const idx = v.indexOf('=');
        return [v.slice(0, idx), decodeURIComponent(v.slice(idx + 1))];
      })
  );
}

export async function getServerSideProps({ query, req, res }) {
  const supabase = getSupabaseServerClient();

  // token может прийти как "{{user.olymp_token}}" (не подставился в GC)
  const rawToken = query.token ?? null;
  const token =
    rawToken && String(rawToken).includes('{{')
      ? null
      : rawToken
      ? String(rawToken).trim()
      : null;

  const gcUserIdRaw = query.gc_user_id ?? null;
  const gcUserId = gcUserIdRaw ? String(gcUserIdRaw).replace(/\D/g, '') : null;

  const cookies = parseCookies(req.headers.cookie || '');
  const cookieUserId = cookies.olymp_user || null;

  // Domain ставим только если реально домен 1olymp.ru (чтобы не ломать на preview)
  const host = req.headers.host || '';
  const domainPart = host.endsWith('1olymp.ru') ? 'Domain=.1olymp.ru; ' : '';

  const setAuthCookie = (userId) => {
    res.setHeader(
      'Set-Cookie',
      `olymp_user=${userId}; Path=/; ${domainPart}HttpOnly; Max-Age=2592000; SameSite=None; Secure`
    );
  };

  // 1) Если есть cookie — логин по cookie (ЭТО НУЖНО ДЛЯ ОБНОВЛЕНИЯ СТРАНИЦЫ)
  if (!token && !gcUserId && cookieUserId) {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', cookieUserId)
      .single();

    if (user) return { props: { user } };
  }

  // 2) Если нет token, но есть gc_user_id — логин по gc_user_id
  if (!token && gcUserId) {
    // поддерживаем и "491..." и "{491...}" на всякий случай
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .or(`gc_user_id.eq.${gcUserId},gc_user_id.eq.{${gcUserId}}`)
      .single();

    if (user) {
      setAuthCookie(user.id);
      return { props: { user } };
    }
  }

  // 3) Если есть token — логин по token
  if (token) {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('olymp_token', token)
      .single();

    if (user) {
      setAuthCookie(user.id);
      return { props: { user } };
    }

    return { props: { user: null, authError: 'user_not_found' } };
  }

  // 4) Ничего нет
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
