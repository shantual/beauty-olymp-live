import Dashboard from '../components/Dashboard';

export default function ParticipantPage() {
  return <Dashboard forcedRole="participant" />;
}
import { getUserByToken } from '../../lib/db';        // твоя функция поиска пользователя
import { setLoginSession } from '../../lib/auth';     // создание сессии

export async function getServerSideProps({ query, req, res }) {
  const token = query.token;

  if (!token) {
    return {
      redirect: {
        destination: '/login?error=no_token',
        permanent: false
      }
    };
  }

  // ищем пользователя в базе
  const user = await getUserByToken(token);

  if (!user) {
    return {
      redirect: {
        destination: '/login?error=user_not_found',
        permanent: false
      }
    };
  }

  // создаём сессию
  await setLoginSession(res, {
    id: user.id,
    email: user.email,
    role: user.role
  });

  // пользователь авторизован, рендерим кабинет
  return {
    props: { user }
  };
}

export default function ParticipantPage({ user }) {
  return (
    <YourParticipantComponent user={user} />
  );
}
