import Dashboard from '../components/Dashboard';
import { supabaseServer } from '../lib/supabaseServer';

export async function getServerSideProps({ query, req, res }) {
  const token = query.token;

  // 1. Проверяем токен
  if (!token) {
    return {
      redirect: {
        destination: '/?error=no_token',
        permanent: false
      }
    };
  }

  // 2. Ищем пользователя по токену
  const { data: user, error } = await supabaseServer
    .from('users')                 // ТАБЛИЦА users (если иначе – скажи)
    .select('*')
    .eq('olymp_token', token)      // ПОЛЕ olymp_token (если иначе – скажи)
    .single();

  if (error || !user) {
    return {
      redirect: {
        destination: '/?error=user_not_found',
        permanent: false
      }
    };
  }

  // 3. Создаём cookie сессии (простейший вариант)
  res.setHeader(
    'Set-Cookie',
    `olymp_user=${user.id}; Path=/; HttpOnly; Max-Age=2592000`
  );

  // 4. Передаём user компоненту Dashboard
  return {
    props: { user }
  };
}

// 5. Основной компонент
export default function ParticipantPage({ user }) {
  return <Dashboard forcedRole="participant" user={user} />;
}
