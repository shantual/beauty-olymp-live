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

  const token = query.token || null;
  const cookies = parseCookies(req.headers.cookie || '');
  const cookieUserId = cookies.olymp_user || null;

  // 1) Если есть cookie — логиним по ней
  if (!token && cookieUserId) {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', cookieUserId)
      .single();

    if (user) return { props: { user } };
  }

  // 2) Если есть token — логиним по token и ставим cookie
  if (token) {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('olymp_token', token)
      .single();

    if (user) {
      // cookie для iframe: SameSite=None + Secure обязательно
      res.setHeader(
        'Set-Cookie',
        `olymp_user=${user.id}; Path=/; HttpOnly; Max-Age=2592000; SameSite=None; Secure`
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
