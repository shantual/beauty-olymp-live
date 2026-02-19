import Dashboard from '../components/Dashboard';
import { getSupabaseServerClient } from '../lib/supabaseServer';

export async function getServerSideProps({ query, req, res }) {
  const token = query.token;

  if (!token) {
    return {
      redirect: { destination: '/?error=no_token', permanent: false },
    };
  }

  const supabase = getSupabaseServerClient();

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('olymp_token', token)
    .single();

  if (error || !user) {
    return {
      redirect: { destination: '/?error=user_not_found', permanent: false },
    };
  }

  res.setHeader(
    'Set-Cookie',
    `olymp_user=${user.id}; Path=/; HttpOnly; Max-Age=2592000; SameSite=None; Secure`
  );

  return { props: { user } };
}

export default function ParticipantPage({ user }) {
  return <Dashboard forcedRole="participant" user={user} />;
}
