import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import UploadWidget from './upload/UploadWidget';

const STORAGE_KEY = 'beauty-olymp-v2';
const SESSION_KEY = 'beauty-olymp-session-v1';
const DEFAULT_CLOUD_ROW_ID = process.env.NEXT_PUBLIC_SUPABASE_APP_STATE_ID || 'global-state';
const CLOUD_TABLE = 'app_state';

const CONTEST_OPTIONS = ['Эстетика Олимпа', 'Креатив Олимпа', 'Образ Олимпа', 'Империя Олимпа'];

const CATEGORY_OPTIONS_BY_CONTEST = {
  'Эстетика Олимпа': ['Дебют', 'Мастер', 'Профи', 'Премиум'],
  'Креатив Олимпа': ['Дебют', 'Мастер', 'Профи', 'Премиум'],
  'Образ Олимпа': ['Beauty Vision', 'Design Couture', 'Grand Fusion'],
  'Империя Олимпа': ['Start', 'Business', 'Empire'],
};

const DIRECTION_OPTIONS_BY_CONTEST = {
  'Эстетика Олимпа': [
    'Роспись на салонных типсах',
    'Маникюр',
    'Моделирование',
    'Педикюр и подология',
    'Перманент',
    'Макияж',
    'Ресницы и брови',
    'Парикмахеры',
  ],
  'Креатив Олимпа': [
    'Профессиональное креативное направление индустрии красоты',
    'Творческо-креативное и хендмейд-направление',
    'Постеры и фотографии',
  ],
  'Образ Олимпа': ['Общий зачет'],
  'Империя Олимпа': ['Общий зачет'],
};

const NOMINATION_OPTIONS_BY_CONTEST_AND_DIRECTION = {
  'Эстетика Олимпа': {
    'Роспись на салонных типсах': [
      '200.1 Художественная роспись на типсах, салонный дизайн. Тема — Свободная',
      '200.2 Художественная роспись на типсах, салонный дизайн. Тема — Детское пространство',
      '200.3 Акварель на маникюрных типсах, салонный дизайн. Тема — Свободная',
      '200.4 Художественная роспись на педикюрных типсах (краски, гель-краски, гель-лаки). Тема — Свободная',
      '200.5 Роспись на педикюрных типсах. Тема — Детское пространство',
      '200.6 Роспись на педикюрных типсах. Тема — Цветочная фантазия',
      '200.7 Монохромная роспись на педикюрных типсах. Тема — Свободная',
      '200.8 Китайская роспись на педикюрных типсах. Тема — Свободная',
      '200.9 Жостовская роспись на педикюрных типсах',
      '200.10 Акварель на педикюрных типсах. Тема — Свободная',
      '200.11 Роспись на педикюрных типсах. Тема — Абстракция и геометрия',
    ],
    Маникюр: [
      '201.1 Маникюр и покрытие в один тон на натуральных ногтях (гель-лак)',
      '201.2 Маникюр с покрытием и дизайном',
      '201.3 Маникюр без покрытия женский',
      '201.4 Маникюр без покрытия мужской',
    ],
    Моделирование: [
      '202.1 Салонное моделирование ногтей с дизайном',
      '202.2 Салонное моделирование ногтей «выкладной френч»',
      '202.3 Салонное моделирование ногтей: верхние формы, классическая архитектура. Постановка «под лак».',
      '202.4 Салонное моделирование ногтей с покрытием в один тон',
    ],
    'Педикюр и подология': [
      '210.1 Педикюр подологический',
      '210.2 Салонный педикюр без покрытия',
      '210.3 Гигиенический педикюр с цветным покрытием или салонным дизайном',
      '210.4 Салонный педикюр только пальцев ног с цветным покрытием или салонным дизайном',
      '210.5 Решение подологической проблемы одной зоны',
    ],
    Перманент: [
      '220.1 Пудровое напыление бровей (до/после)',
      '220.2 Брови в аппаратной волосковой технике (до/после)',
      '220.3 Глаза — классическая стрелка (до/после)',
      '220.4 Глаза — стрелка с растушёвкой (до/после)',
      '220.5 Перманентный макияж: губы в акварельной технике (до/после)',
      '220.6 Перманентный макияж: губы — помадный прокрас (до/после)',
    ],
    Макияж: [
      '230.1 Преображение модели — модный трендовый образ (до/после)',
      '230.2 Свадебный макияж — современный клиентский образ невесты',
      '230.3 Smoky-eyes — современный клиентский вечерний образ',
    ],
    'Ресницы и брови': [
      '240.1 Классическое наращивание ресниц (до/после)',
      '240.2 Объемное наращивание ресниц 2-4D (до/после)',
      '240.3 Гиперобъем — наращивание ресниц 6-10D (до/после)',
      '240.4 Наращивание ресниц с современным эффектом (до/после)',
      '240.5 Колорирование ресниц (до/после)',
      '240.6 Оформление бровей краской (до/после)',
      '240.7 Оформление бровей хной (до/после)',
      '240.8 Ламинирование бровей (до/после)',
    ],
    Парикмахеры: [
      '250.1 Салонный женский образ: стрижка',
      '250.2 Салонный женский образ: окрашивание',
      '250.3 Салонный женский образ: окрашивание/стрижка/укладка',
      '250.4 Современная стильная прическа',
      '250.5 Свадебная прическа',
      '250.6 Салонный мужской образ: стрижка',
      '250.7 Салонный мужской образ: окрашивание',
      '250.8 Салонный мужской образ: окрашивание/стрижка/укладка',
      '250.9 Барберинг: мужская стрижка',
      '250.10 Барберинг: моделирование бороды',
      '250.11 Барберинг: стрижка + моделирование бороды',
      '250.12 Барберинг: детская стрижка (мальчик/подросток)',
    ],
  },
};

function getNominationOptions(contest, direction) {
  return NOMINATION_OPTIONS_BY_CONTEST_AND_DIRECTION?.[contest]?.[direction] || [];
}

const DEFAULT_CRITERIA = [
  // Эстетика Олимпа — Маникюр
  {
    id: 'EO-M-1',
    contest: 'Эстетика Олимпа',
    direction: 'Маникюр',
    title: 'Техника исполнения',
    min: 1,
    max: 10,
  },
  {
    id: 'EO-M-2',
    contest: 'Эстетика Олимпа',
    direction: 'Маникюр',
    title: 'Чистота работы',
    min: 1,
    max: 10,
  },

  // Эстетика Олимпа — Перманент
  {
    id: 'EO-P-1',
    contest: 'Эстетика Олимпа',
    direction: 'Перманент',
    title: 'Глубина цвета',
    min: 1,
    max: 10,
  },
];

const DEFAULT_JUDGES = [
  {
    id: 'J-001',
    fullName: 'Судья Демонстрационный',
    email: 'judge@demo.local',
    login: 'judge1',
    passwordHash:
      '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    active: true,
  },
];

const DEFAULT_PARTICIPANTS = [];


const DEFAULT_WORKS = [
  {
    id: 'EO-00001',
    contest: 'Эстетика Олимпа',
    nomination: '200.1 Художественная роспись на типсах, салонный дизайн. Тема — Свободная',
    category: 'Дебют',
    direction: 'Роспись на салонных типсах',
    participantName: 'Иванова Мария',
    title: 'Северное сияние',
    description: 'Градиентный дизайн с ручной прорисовкой.',
    photos: [
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=60',
    ],
    videos: ['https://www.youtube.com/embed/NpEaa2P7qZI'],
    status: 'Допущено',
    author: 'Скрыт',
  },
];

const MODERATOR_PERMISSIONS = [
  { key: 'canManageWorks', label: 'Добавление и импорт работ' },
  { key: 'canManageJudges', label: 'Добавление судей' },
  { key: 'canExportScores', label: 'Выгрузка оценок и рейтингов' },
];

function normalizeModeratorPermissions(rawPermissions) {
  const source = rawPermissions || {};
  return {
    canManageWorks: Boolean(source.canManageWorks),
    canManageJudges: Boolean(source.canManageJudges),
    canExportScores: Boolean(source.canExportScores),
  };
}

function createDefaultState() {
  return {
    criteria: DEFAULT_CRITERIA,
    works: DEFAULT_WORKS,
    judges: DEFAULT_JUDGES,
    participants: DEFAULT_PARTICIPANTS,
    assignments: [{ workId: 'EO-00001', judgeId: 'J-001', status: 'не начато', assignedAt: new Date().toISOString() }],
    scores: [],
    moderators: [],
    adminUsers: [{ login: 'admin', passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918' }],
  };
}

function normalizeState(rawState) {
  const next = { ...createDefaultState(), ...(rawState || {}) };

  // Миграция: исправляем старый неверный hash demo-пароля и отсутствие active.
  next.judges = (next.judges || []).map((judge) => {
    if (
      judge.login === 'judge1' &&
      judge.passwordHash === 'a5ceca62e47d0f6c0f56aa8198c75c5dc2e4f2f4903a06f5f5f7ff4f5d16fd5c'
    ) {
      return {
        ...judge,
        active: judge.active ?? true,
        passwordHash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
      };
    }
    return { ...judge, active: judge.active ?? true };
  });

  // Демо-судья нужен только для локальной разработки.
// В проде (1olymp.ru) он НЕ должен сам появляться после обновления страницы.
const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

if (isLocalhost) {
  const demoIndex = next.judges.findIndex((judge) => judge.login === 'judge1');

  const demoJudge = {
    id: 'J-001',
    fullName: 'Судья Демонстрационный',
    email: 'judge@demo.local',
    login: 'judge1',
    passwordHash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    active: true,
  };

  if (demoIndex === -1) {
    next.judges.unshift(demoJudge);
  } else {
    next.judges[demoIndex] = { ...next.judges[demoIndex], ...demoJudge };
  }
} else {
  // если вдруг демо-судья уже попал в прод-данные — вычищаем его
  next.judges = (next.judges || []).filter((j) => j.login !== 'judge1');
}

  next.moderators = (next.moderators || []).map((moderator, index) => ({
    id: moderator.id || `M-${String(index + 1).padStart(3, '0')}`,
    fullName: moderator.fullName || '',
    login: moderator.login || '',
    passwordHash: moderator.passwordHash || '',
    active: moderator.active ?? true,
    permissions: normalizeModeratorPermissions(moderator.permissions),
  }));

  next.participants = (next.participants || []).map((participant, index) => ({
    id: participant.id || `P-${String(index + 1).padStart(3, '0')}`,
    fullName: participant.fullName || '',
    email: participant.email || '',
    login: participant.login || '',
    passwordHash: participant.passwordHash || '',
    active: participant.active ?? true,
  }));


  return next;
}

function normalizeSession(rawSession, normalizedState) {
  if (!rawSession || !rawSession.role) return { role: null, id: null, login: null };

  if (rawSession.role === 'admin') {
    const adminExists = (normalizedState.adminUsers || []).some((admin) => admin.login === rawSession.login);
    return adminExists ? rawSession : { role: null, id: null, login: null };
  }

  if (rawSession.role === 'judge') {
    const judgeExists = (normalizedState.judges || []).some(
      (judge) => judge.id === rawSession.id && judge.login === rawSession.login && judge.active
    );
    return judgeExists ? rawSession : { role: null, id: null, login: null };
  }

  if (rawSession.role === 'moderator') {
    const moderatorExists = (normalizedState.moderators || []).some(
      (moderator) => moderator.id === rawSession.id && moderator.login === rawSession.login && moderator.active
    );
    return moderatorExists ? rawSession : { role: null, id: null, login: null };
  }

  if (rawSession.role === 'participant') {
    const participantExists = (normalizedState.participants || []).some(
      (participant) => participant.id === rawSession.id && participant.login === rawSession.login && participant.active
    );
    return participantExists ? rawSession : { role: null, id: null, login: null };
  }


  return { role: null, id: null, login: null };
}

function parseList(value) {
  return value
    .split('\n')
    .map((v) => v.trim())
    .filter(Boolean);
}

function isEmbeddedVideoUrl(url) {
  const value = String(url || '').toLowerCase();
  return value.includes('youtube.com') || value.includes('youtu.be') || value.includes('vimeo.com');
}

function generateWorkId(existingWorks) {
  const next = existingWorks.length + 1;
  return `EO-${String(next).padStart(5, '0')}`;
}

function makeSubmissionId() {
  return `submission-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function sha256(text) {
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function toCsv(rows) {
  return rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`)
        .join(',')
    )
    .join('\n');
}


function isUuidInputError(message) {
  const text = String(message || '').toLowerCase();
  return text.includes('invalid input syntax for type uuid');
}

function buildCloudRequestPreview(table, payload) {
  return `supabase.from('${table}').upsert({ id: '${payload.id}', state: <json> }, { onConflict: 'id' })`;
}


function safeParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export default function Dashboard({ forcedRole = null, user = null }) {

  const [state, setState] = useState(createDefaultState);
  const [session, setSession] = useState({ role: null, id: null, login: null });
  

  const [participantSubmissionId, setParticipantSubmissionId] = useState(() => `submission-${Date.now()}`);
  const [sessionReady, setSessionReady] = useState(false);
  const [cloudReady, setCloudReady] = useState(false);
  const [cloudSyncing, setCloudSyncing] = useState(false);
  const [cloudError, setCloudError] = useState('');
  const [cloudDebug, setCloudDebug] = useState({ lastRequest: '', lastError: '' });
  const [cloudRowId, setCloudRowId] = useState(DEFAULT_CLOUD_ROW_ID);
  const lastCloudWriteRef = useRef('');
  const [loginForm, setLoginForm] = useState({ login: '', password: '', role: 'judge' });
  const [workDraft, setWorkDraft] = useState({
    contest: 'Эстетика Олимпа',
    nomination: getNominationOptions('Эстетика Олимпа', 'Роспись на салонных типсах')[0] || '',
    category: 'Дебют',
    direction: 'Роспись на салонных типсах',
    participantName: '',
    title: '',
    description: '',
    photosText: '',
    videosText: '',
    status: 'Допущено',
  });
  const [judgeDraft, setJudgeDraft] = useState({ fullName: '', email: '', login: '', password: '' });
  const [judgePicksByWorkId, setJudgePicksByWorkId] = useState({});
  const [participantDraft, setParticipantDraft] = useState({
    fullName: '',
    contest: 'Эстетика Олимпа',
    direction: 'Роспись на салонных типсах',
    nomination: getNominationOptions('Эстетика Олимпа', 'Роспись на салонных типсах')[0] || '',
    category: 'Дебют',
    title: '',
    description: '',
    photos: [],
    videos: [],
    submissionId: makeSubmissionId(),
  });
  const [moderatorDraft, setModeratorDraft] = useState({
    fullName: '',
    login: '',
    password: '',
    permissions: normalizeModeratorPermissions({}),
  });
  const [participantAdminDraft, setParticipantAdminDraft] = useState({ fullName: '', email: '', login: '', password: '', active: true });
  const [participantEditId, setParticipantEditId] = useState(null);
  const [participantEditDraft, setParticipantEditDraft] = useState({ fullName: '', email: '', login: '', password: '', active: true });
  const [criterionTitle, setCriterionTitle] = useState('');
  const [assignmentDraft, setAssignmentDraft] = useState({ judgeId: '', workId: '' });
  const [scoreDrafts, setScoreDrafts] = useState({});
  const [importText, setImportText] = useState('');
  const [stateImportText, setStateImportText] = useState('');
  const [toast, setToast] = useState('');
  const [ratingFilter, setRatingFilter] = useState({ contest: 'all', direction: 'all', category: 'all' });
  const [selectedWorkId, setSelectedWorkId] = useState(null);
  const [judgeSelectedWorkId, setJudgeSelectedWorkId] = useState(null);
  const [adminTab, setAdminTab] = useState('main');
  const [selectedJudgeWork, setSelectedJudgeWork] = useState(null);
  const [lightboxImage, setLightboxImage] = useState('');
  const [lightboxVideo, setLightboxVideo] = useState('');
  const [judgeViewId, setJudgeViewId] = useState(null);
  const [criteriaContest, setCriteriaContest] = useState('');
const [criteriaDirection, setCriteriaDirection] = useState('');
  const [judgeSubmissionFiles, setJudgeSubmissionFiles] = useState({});
  const [moderatorEditId, setModeratorEditId] = useState(null);
  const [moderatorEditDraft, setModeratorEditDraft] = useState({
    fullName: '',
    login: '',
    password: '',
    active: true,
    permissions: normalizeModeratorPermissions({}),
  });
  const [judgeEditId, setJudgeEditId] = useState(null);
  const [judgeEditDraft, setJudgeEditDraft] = useState({ fullName: '', email: '', login: '', password: '', active: true });
  const [workEditId, setWorkEditId] = useState(null);
  const [workEditDraft, setWorkEditDraft] = useState({ title: '', participantName: '', nomination: '', category: '', direction: '', status: 'Допущено' });
  const toastTimerRef = useRef(null);

  

// -------------------- вычисления доступа (ВАЖНО: до хендлеров табов) --------------------
  const currentModerator = useMemo(() => {
    if (session.role !== 'moderator') return null;
    return state.moderators.find((m) => m.id === session.id && m.active) || null;
  }, [session, state.moderators]);

  const access = useMemo(() => {
    if (session.role === 'admin') return { canManageWorks: true, canManageJudges: true, canExportScores: true };
    if (session.role === 'moderator') return normalizeModeratorPermissions(currentModerator?.permissions);
    return { canManageWorks: false, canManageJudges: false, canExportScores: false };
  }, [session.role, currentModerator]);

  const isAdmin = session.role === 'admin';

  const participantProfile = useMemo(() => {
    if (session.role !== 'participant') return null;
    return state.participants.find((p) => p.id === session.id && p.active) || null;
  }, [session, state.participants]);

  const myWorks = useMemo(() => {
  return (state.works || [])
    .filter((w) => w.participantId === session.id)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}, [state.works, session.id]);

  const canOpenAdminTab = (tab) => {
    if (tab === 'main') return true;
    if (tab === 'moderators') return isAdmin;
    if (tab === 'judges') return isAdmin || access.canManageJudges;
    if (tab === 'works' || tab === 'criteria' || tab === 'import') return isAdmin || access.canManageWorks;
    if (tab === 'participants') return isAdmin;
    return false;
  };

  const handleAdminTabChange = (nextTab) => {
    if (!canOpenAdminTab(nextTab)) return;
    setAdminTab(nextTab);
  };

  // -------------------- опции селектов --------------------
  const categoryOptions = useMemo(() => CATEGORY_OPTIONS_BY_CONTEST[workDraft.contest] || ['Дебют'], [workDraft.contest]);
  const directionOptions = useMemo(() => DIRECTION_OPTIONS_BY_CONTEST[workDraft.contest] || ['Общий зачет'], [workDraft.contest]);
  const nominationOptions = useMemo(() => getNominationOptions(workDraft.contest, workDraft.direction), [workDraft.contest, workDraft.direction]);

  const participantDirectionOptions = useMemo(
    () => DIRECTION_OPTIONS_BY_CONTEST[participantDraft.contest] || ['Общий зачет'],
    [participantDraft.contest]
  );
  const participantNominationOptions = useMemo(
    () => getNominationOptions(participantDraft.contest, participantDraft.direction),
    [participantDraft.contest, participantDraft.direction]
  );
  const participantCategoryOptions = useMemo(
    () => CATEGORY_OPTIONS_BY_CONTEST[participantDraft.contest] || ['Дебют'],
    [participantDraft.contest]
  );

  // -------------------- bootstrap: local + cloud --------------------
  useEffect(() => {
    let cancelled = false;

    async function bootstrapState() {
      const saved = localStorage.getItem(STORAGE_KEY);
      const rawSession = localStorage.getItem(SESSION_KEY);

      let nextState = createDefaultState();
      if (saved) {
        const parsedState = safeParseJson(saved);
        if (parsedState) {
          nextState = normalizeState(parsedState);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }

      if (supabase) {
        try {
          let cloudData = null;
          let cloudReadError = null;

          const { data: byIdData, error: byIdError } = await supabase
            .from(CLOUD_TABLE)
            .select('id,state')
            .eq('id', cloudRowId)
            .maybeSingle();

          if (byIdError && !isUuidInputError(byIdError.message)) {
            cloudReadError = byIdError;
          } else if (byIdData?.state) {
            cloudData = byIdData;
          }

          if (!cloudData) {
            const { data: firstRowData, error: firstRowError } = await supabase
              .from(CLOUD_TABLE)
              .select('id,state')
              .limit(1)
              .maybeSingle();

            if (firstRowError) {
              cloudReadError = firstRowError;
            } else if (firstRowData?.state) {
              cloudData = firstRowData;
            }
          }

          if (cloudReadError) {
            setCloudError(`Не удалось получить данные из облака: ${cloudReadError.message || 'unknown error'}`);
          } else if (cloudData?.state) {
            nextState = normalizeState(cloudData.state);
            if (cloudData.id) {
              setCloudRowId(cloudData.id);
            }
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          setCloudError(`Ошибка подключения к облаку: ${message}`);
        }
      } else {
        setCloudError('Облако отключено: заполните NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY');
      }

      if (cancelled) return;
// ✅ если это вход участника из GetCourse — гарантируем запись участника в nextState
if (forcedRole === 'participant' && user?.id) {
  const fullName =
    (user.full_name || user.fullName || user.name || '').toString().trim();

  const login = (user.email || String(user.id)).toString().trim();

  const participants = Array.isArray(nextState.participants) ? nextState.participants : [];
  const nextParticipant = {
    id: user.id,
    fullName,
    email: (user.email || '').toString().trim(),
    login,
    active: true,
  };

  nextState = {
    ...nextState,
    participants: [...participants.filter((p) => p.id !== user.id), nextParticipant],
  };
}

      
      setState(nextState);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));

    // если это вход участника из GetCourse — НЕ берём сессию из localStorage
if (forcedRole === 'participant' && user?.id) {
  const login = (user.email || String(user.id)).toString().trim();
  setSession({ role: 'participant', id: user.id, login });
} else if (rawSession) {
  const parsedSession = safeParseJson(rawSession);
  if (parsedSession) {
    setSession(normalizeSession(parsedSession, nextState));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}


      setCloudReady(true);
      setSessionReady(true);
    }

    bootstrapState();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (!sessionReady || !cloudReady || !supabase) return;

    const serializedState = JSON.stringify(state);
    if (lastCloudWriteRef.current === serializedState) return;

    const timer = window.setTimeout(async () => {
      setCloudSyncing(true);
      const payload = { id: cloudRowId, state };
      const requestPreview = buildCloudRequestPreview(CLOUD_TABLE, payload);
      setCloudDebug((prev) => ({ ...prev, lastRequest: requestPreview }));

      try {
        let { error } = await supabase
          .from(CLOUD_TABLE)
          .upsert(payload, { onConflict: 'id' });

        if (error && isUuidInputError(error.message)) {
          const fallbackId = crypto.randomUUID();
          const fallbackPayload = { id: fallbackId, state };
          const fallbackPreview = buildCloudRequestPreview(CLOUD_TABLE, fallbackPayload);
          setCloudDebug((prev) => ({ ...prev, lastRequest: fallbackPreview }));
          const retry = await supabase
            .from(CLOUD_TABLE)
            .upsert(fallbackPayload, { onConflict: 'id' });
          error = retry.error;
          if (!error) {
            setCloudRowId(fallbackId);
          }
        }

        if (error) {
          const message = error.message || 'unknown error';
          setCloudError(`Не удалось сохранить состояние в облако: ${message}`);
          setCloudDebug((prev) => ({ ...prev, lastError: message }));
          console.error('[cloud-sync:auto] upsert failed', { requestPreview, error });
        } else {
          lastCloudWriteRef.current = serializedState;
          setCloudError('');
          setCloudDebug((prev) => ({ ...prev, lastError: '' }));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setCloudError(`Не удалось сохранить состояние в облако: ${message}`);
        setCloudDebug((prev) => ({ ...prev, lastError: message }));
        console.error('[cloud-sync:auto] upsert exception', { requestPreview, err });
      }

      setCloudSyncing(false);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [state, sessionReady, cloudReady, cloudRowId]);

  useEffect(() => {
    if (!sessionReady) return;

    if (session.role) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return;
    }
    localStorage.removeItem(SESSION_KEY);
  }, [session, sessionReady]);

useEffect(() => {
  if (!forcedRole) return;
  if (!session.role) return;

  if (session.role !== forcedRole) {
    setSession({ role: null, id: null, login: null });
    showToast('Этот вход предназначен для другой роли');
  }
}, [forcedRole, session.role, session.id, session.login]);
  
  useEffect(() => () => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
  }, []);

  const judgeAssignments = useMemo(() => {
    if (session.role !== 'judge') return [];
    return state.assignments.filter((item) => item.judgeId === session.id);
  }, [session, state.assignments]);

  const judgeWorks = useMemo(
    () =>
      judgeAssignments
        .map((a) => {
          const work = state.works.find((w) => w.id === a.workId);
          return work ? { ...work, assignmentStatus: a.status } : null;
        })
        .filter(Boolean)
        .sort((a, b) => {
          const aDone = a.assignmentStatus === 'оценено';
          const bDone = b.assignmentStatus === 'оценено';
          if (aDone === bDone) return a.id.localeCompare(b.id);
          return aDone ? 1 : -1;
        }),
    [judgeAssignments, state.works]
  );
  const judgeWorkGroups = useMemo(() => {
    const grouped = {};
    judgeWorks.forEach((work) => {
      const groupKey = [
        work.contest || 'Без конкурса',
        work.direction || 'Общий зачет',
        work.nomination || 'Без номинации',
        work.category || 'Без категории',
      ].join(' | ');

      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          contest: work.contest || 'Без конкурса',
          direction: work.direction || 'Общий зачет',
          nomination: work.nomination || 'Без номинации',
          category: work.category || 'Без категории',
          works: [],
        };
      }
      grouped[groupKey].works.push(work);
    });

    return Object.values(grouped).map((group) => ({
      ...group,
      works: group.works.sort((a, b) => a.id.localeCompare(b.id)),
    }));
  }, [judgeWorks]);

  const judgeSelectedWork = useMemo(
    () => judgeWorks.find((work) => work.id === judgeSelectedWorkId) || null,
    [judgeSelectedWorkId, judgeWorks]
  );

  useEffect(() => {
    const shouldLoadSignedFiles =
    session.role === 'judge' ||
    session.role === 'admin' ||
    session.role === 'moderator' ||
    session.role === 'participant';
    if (!shouldLoadSignedFiles) {
      setJudgeSubmissionFiles({});
      return;
    }

    const sourceWorks = session.role === 'judge' ? judgeWorks : state.works;
    const submissionIds = [...new Set(sourceWorks.map((work) => work.submissionId).filter(Boolean))];
    if (!submissionIds.length) {
      setJudgeSubmissionFiles({});
      return;
    }

    let cancelled = false;

    async function loadSignedFiles() {
      const entries = await Promise.all(submissionIds.map(async (submissionId) => {
        try {
          const response = await fetch(`/api/uploads?submissionId=${encodeURIComponent(submissionId)}&withSignedGet=1`);
          const payload = await response.json();
          if (!response.ok) {
            throw new Error(payload.error || 'Failed to load signed files');
          }

          const records = payload.records || [];
          const photos = records
            .filter((item) => String(item.mime || '').startsWith('image/') && item.signedGetUrl)
            .map((item) => item.signedGetUrl);
          const videos = records
            .filter((item) => String(item.mime || '').startsWith('video/') && item.signedGetUrl)
            .map((item) => item.signedGetUrl);

          return [submissionId, { photos, videos }];
        } catch (error) {
          console.error(error);
          return [submissionId, { photos: [], videos: [] }];
        }
      }));

      if (!cancelled) {
        setJudgeSubmissionFiles(Object.fromEntries(entries));
      }
    }

    loadSignedFiles();

    return () => {
      cancelled = true;
    };
  }, [session.role, judgeWorks, state.works]);

  function getWorkMedia(work) {
    if (!work) return { photos: [], videos: [] };
    const signedMedia = judgeSubmissionFiles[work.submissionId] || {};
    return {
      photos: signedMedia.photos?.length ? signedMedia.photos : (work.photos || []),
      videos: signedMedia.videos?.length ? signedMedia.videos : (work.videos || []),
    };
  }

  const progress = useMemo(() => {
    const total = state.assignments.length;
    const done = state.assignments.filter((a) => a.status === 'оценено').length;
    return total ? Math.round((done / total) * 100) : 0;
  }, [state.assignments]);

  const ratingFilterOptions = useMemo(() => {
    const contests = [...new Set(state.works.map((w) => w.contest).filter(Boolean))];
    const directions = [...new Set(state.works.map((w) => w.direction || 'Общий зачет').filter(Boolean))];
    const categories = [...new Set(state.works.map((w) => w.category).filter(Boolean))];
    return { contests, directions, categories };
  }, [state.works]);

  const selectedWork = useMemo(
    () => state.works.find((work) => work.id === selectedWorkId) || null,
    [selectedWorkId, state.works]
  );

  const selectedWorkScores = useMemo(
    () => state.scores.filter((score) => score.workId === selectedWorkId),
    [selectedWorkId, state.scores]
  );

;

  const ratings = useMemo(() => {
    const grouped = {};

    state.works.forEach((work) => {
      const scores = state.scores.filter((score) => score.workId === work.id);
      if (!scores.length) return;
      const totalAvg = scores.reduce((sum, s) => sum + s.avg, 0) / scores.length;
      const key = `${work.contest} | ${work.direction || 'Общий зачет'} | ${work.nomination} | ${work.category}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({ workId: work.id, title: work.title, avg: Number(totalAvg.toFixed(2)) });
    });

    Object.values(grouped).forEach((list) => {
      list.sort((a, b) => b.avg - a.avg);
      let rank = 1;
      list.forEach((entry, index) => {
        if (index > 0 && entry.avg < list[index - 1].avg) {
          rank = index + 1;
        }
        entry.rank = rank;
      });
    });

    const filtered = Object.entries(grouped).reduce((acc, [group, list]) => {
      const [contest, direction, _nomination, category] = group.split(' | ');
      if (ratingFilter.contest !== 'all' && contest !== ratingFilter.contest) return acc;
      if (ratingFilter.direction !== 'all' && direction !== ratingFilter.direction) return acc;
      if (ratingFilter.category !== 'all' && category !== ratingFilter.category) return acc;
      acc[group] = list;
      return acc;
    }, {});

    return filtered;
  }, [state.scores, state.works, ratingFilter]);
  useEffect(() => {
    if (session.role === 'judge' || !session.role) return;
    console.log('[render-tabs] state', {
      role: session.role,
      adminTab,
      isAdmin: session.role === 'admin',
      canManageJudges: access.canManageJudges,
      canManageWorks: access.canManageWorks,
    });
  }, [adminTab, access, session.role]);


  async function login() {
  const normalizedLogin = loginForm.login.trim();
  const role = forcedRole || loginForm.role;

  if (!normalizedLogin || !loginForm.password) {
    alert('Введите логин и пароль.');
    return;
  }

  const passwordHash = await sha256(loginForm.password);

  if (role === 'admin') {
    const admin = (state.adminUsers || []).find((a) => a.login === normalizedLogin && a.passwordHash === passwordHash);
    if (admin) {
      setSession({ role: 'admin', id: 'ADMIN', login: admin.login });
      return;
    }
  }

  if (role === 'judge') {
    const judge = (state.judges || []).find((j) => j.login === normalizedLogin && j.passwordHash === passwordHash && j.active);
    if (judge) {
      setSession({ role: 'judge', id: judge.id, login: judge.login });
      return;
    }
  }

  if (role === 'moderator') {
    const moderator = (state.moderators || []).find((m) => m.login === normalizedLogin && m.passwordHash === passwordHash && m.active);
    if (moderator) {
      setSession({ role: 'moderator', id: moderator.id, login: moderator.login });
      return;
    }
  }

  if (role === 'participant') {
    const participant = (state.participants || []).find((p) => p.login === normalizedLogin && p.passwordHash === passwordHash && p.active);
    if (participant) {
      setSession({ role: 'participant', id: participant.id, login: participant.login });
      return;
    }
  }

  alert('Неверные данные для входа.');
}



  function showToast(message) {
    setToast(message);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => setToast(''), 2200);
  }

  function addWork() {
    if (!workDraft.nomination.trim() || !workDraft.title.trim()) {
      showToast('Заполните минимум номинацию и название работы');
      return;
    }

    const newWork = {
      id: generateWorkId(state.works),
      contest: workDraft.contest,
      nomination: workDraft.nomination,
      category: workDraft.category,
      direction: workDraft.direction,
      participantName: workDraft.participantName.trim(),
      title: workDraft.title,
      description: workDraft.description,
      photos: parseList(workDraft.photosText),
      videos: parseList(workDraft.videosText),
      status: workDraft.status,
      author: 'Скрыт',
    };

    setState((prev) => ({ ...prev, works: [...prev.works, newWork] }));
    setWorkDraft({
      contest: 'Эстетика Олимпа', nomination: getNominationOptions('Эстетика Олимпа', 'Роспись на салонных типсах')[0] || '', category: 'Дебют', direction: 'Роспись на салонных типсах', participantName: '', title: '', description: '', photosText: '', videosText: '', status: 'Допущено',
    });
    showToast('Добавлено');
  }


  async function submitParticipantWork() {
    if (!participantProfile || !participantProfile.fullName) {
      showToast('Профиль участника не найден. Обратитесь к администратору.');
      return;
    }

    if (!participantDraft.title.trim() || !participantDraft.nomination.trim()) {
      showToast('Заполните номинацию и название работы');
      return;
    }

    const newWork = {
  id: generateWorkId(state.works),
  contest: participantDraft.contest,
  nomination: participantDraft.nomination,
  category: participantDraft.category,
  direction: participantDraft.direction,
  participantName: (participantProfile.fullName || session.login || '').trim(),
  participantId: session.id,
  title: participantDraft.title.trim(),
  description: participantDraft.description.trim(),
  photos: participantDraft.photos,
  videos: participantDraft.videos,
  status: 'Отправлено',
  author: 'Скрыт',
  submissionId: participantDraft.submissionId,
  createdAt: new Date().toISOString(),
};

    setState((prev) => ({ ...prev, works: [newWork, ...prev.works] }));
    setParticipantDraft((prev) => ({
  ...prev,
  title: '',
  description: '',
  photos: [],
  videos: [],
  submissionId: makeSubmissionId(),
}));
   
    showToast('Работа отправлена');
  }

 async function addJudge() {
  if (!judgeDraft.fullName.trim() || !judgeDraft.login.trim() || !judgeDraft.password) {
    showToast('Заполните ФИО, логин и пароль судьи');
    return;
  }

  const login = judgeDraft.login.trim();
  const duplicateLogin =
    state.judges.some((judge) => judge.login === login) ||
    state.adminUsers.some((admin) => admin.login === login) ||
    state.moderators.some((moderator) => moderator.login === login);

  if (duplicateLogin) {
    showToast('Судья с таким логином уже существует');
    return;
  }

  const passwordHash = await sha256(judgeDraft.password);

  // 🔹 вычисляем максимальный номер ID
  const maxNum = state.judges
    .map((j) => String(j.id || '').match(/^J-(\d+)$/))
    .filter(Boolean)
    .map((m) => Number(m[1]))
    .reduce((a, b) => Math.max(a, b), 0);

  // 🔹 создаём нового судью
  const judge = {
    id: `J-${String(maxNum + 1).padStart(3, '0')}`,
    fullName: judgeDraft.fullName,
    email: judgeDraft.email,
    login,
    passwordHash,
    active: true,
  };

  setState((prev) => ({ ...prev, judges: [...prev.judges, judge] }));
  setJudgeDraft({ fullName: '', email: '', login: '', password: '' });
  showToast('Добавлено');
}
  function toggleDraftPermission(key) {
    setModeratorDraft((prev) => ({
      ...prev,
      permissions: { ...prev.permissions, [key]: !prev.permissions[key] },
    }));
  }

  function toggleEditPermission(key) {
    setModeratorEditDraft((prev) => ({
      ...prev,
      permissions: { ...prev.permissions, [key]: !prev.permissions[key] },
    }));
  }

  async function addModerator() {
    if (!moderatorDraft.fullName.trim() || !moderatorDraft.login.trim() || !moderatorDraft.password) {
      showToast('Заполните ФИО, логин и пароль модератора');
      return;
    }

    const login = moderatorDraft.login.trim();
    const duplicateLogin =
      state.judges.some((judge) => judge.login === login) ||
      state.adminUsers.some((admin) => admin.login === login) ||
      state.moderators.some((moderator) => moderator.login === login);

    if (duplicateLogin) {
      showToast('Логин уже используется');
      return;
    }

    const passwordHash = await sha256(moderatorDraft.password);
    const moderator = {
      id: `M-${String(state.moderators.length + 1).padStart(3, '0')}`,
      fullName: moderatorDraft.fullName.trim(),
      login,
      passwordHash,
      active: true,
      permissions: normalizeModeratorPermissions(moderatorDraft.permissions),
    };

    setState((prev) => ({ ...prev, moderators: [...prev.moderators, moderator] }));
    setModeratorDraft({
      fullName: '',
      login: '',
      password: '',
      permissions: normalizeModeratorPermissions({}),
    });
    showToast('Модератор добавлен');
  }

  function startModeratorEdit(moderator) {
    setModeratorEditId(moderator.id);
    setModeratorEditDraft({
      fullName: moderator.fullName || '',
      login: moderator.login || '',
      password: '',
      active: moderator.active ?? true,
      permissions: normalizeModeratorPermissions(moderator.permissions),
    });
  }

  async function saveModeratorEdit() {
    if (!moderatorEditId) return;
    const login = moderatorEditDraft.login.trim();

    if (!moderatorEditDraft.fullName.trim() || !login) {
      showToast('Укажите ФИО и логин модератора');
      return;
    }

    const duplicate =
      state.judges.some((judge) => judge.login === login) ||
      state.adminUsers.some((admin) => admin.login === login) ||
      state.moderators.some((moderator) => moderator.id !== moderatorEditId && moderator.login === login);

    if (duplicate) {
      showToast('Логин уже используется');
      return;
    }

    let nextPasswordHash = null;
    if (moderatorEditDraft.password) {
      nextPasswordHash = await sha256(moderatorEditDraft.password);
    }

    setState((prev) => ({
      ...prev,
      moderators: prev.moderators.map((moderator) => {
        if (moderator.id !== moderatorEditId) return moderator;
        return {
          ...moderator,
          fullName: moderatorEditDraft.fullName.trim(),
          login,
          active: moderatorEditDraft.active,
          permissions: normalizeModeratorPermissions(moderatorEditDraft.permissions),
          ...(nextPasswordHash ? { passwordHash: nextPasswordHash } : {}),
        };
      }),
    }));

    if (session.role === 'moderator' && session.id === moderatorEditId) {
      setSession((prev) => ({ ...prev, login }));
    }

    setModeratorEditId(null);
    showToast('Модератор обновлен');
  }

  function deleteModerator(moderatorId) {
    setState((prev) => ({
      ...prev,
      moderators: prev.moderators.filter((moderator) => moderator.id !== moderatorId),
    }));

    if (moderatorEditId === moderatorId) setModeratorEditId(null);
    if (session.role === 'moderator' && session.id === moderatorId) {
      setSession({ role: null, id: null, login: null });
    }

    showToast('Модератор удален');
  }


  async function addParticipant() {
    if (!participantAdminDraft.fullName.trim() || !participantAdminDraft.login.trim() || !participantAdminDraft.password) {
      showToast('Заполните ФИО, логин и пароль участника');
      return;
    }

    const login = participantAdminDraft.login.trim();
    const duplicateLogin =
      state.participants.some((p) => p.login === login) ||
      state.judges.some((j) => j.login === login) ||
      state.moderators.some((m) => m.login === login) ||
      state.adminUsers.some((a) => a.login === login);

    if (duplicateLogin) {
      showToast('Логин уже используется');
      return;
    }

    const passwordHash = await sha256(participantAdminDraft.password);
    const participant = {
      id: `P-${String(state.participants.length + 1).padStart(3, '0')}`,
      fullName: participantAdminDraft.fullName.trim(),
      email: participantAdminDraft.email.trim(),
      login,
      passwordHash,
      active: Boolean(participantAdminDraft.active),
    };

    setState((prev) => ({ ...prev, participants: [...prev.participants, participant] }));
    setParticipantAdminDraft({ fullName: '', email: '', login: '', password: '', active: true });
    showToast('Участник добавлен');
  }

  function startParticipantEdit(participant) {
    setParticipantEditId(participant.id);
    setParticipantEditDraft({
      fullName: participant.fullName || '',
      email: participant.email || '',
      login: participant.login || '',
      password: '',
      active: participant.active ?? true,
    });
  }

  async function saveParticipantEdit() {
    if (!participantEditId) return;

    const login = participantEditDraft.login.trim();
    if (!participantEditDraft.fullName.trim() || !login) {
      showToast('Укажите ФИО и логин участника');
      return;
    }

    const duplicate =
      state.participants.some((p) => p.id !== participantEditId && p.login === login) ||
      state.judges.some((j) => j.login === login) ||
      state.moderators.some((m) => m.login === login) ||
      state.adminUsers.some((a) => a.login === login);

    if (duplicate) {
      showToast('Логин уже используется');
      return;
    }

    let nextPasswordHash = null;
    if (participantEditDraft.password) {
      nextPasswordHash = await sha256(participantEditDraft.password);
    }

    setState((prev) => ({
      ...prev,
      participants: prev.participants.map((p) => {
        if (p.id !== participantEditId) return p;
        return {
          ...p,
          fullName: participantEditDraft.fullName.trim(),
          email: participantEditDraft.email.trim(),
          login,
          active: Boolean(participantEditDraft.active),
          ...(nextPasswordHash ? { passwordHash: nextPasswordHash } : {}),
        };
      }),
    }));

    if (session.role === 'participant' && session.id === participantEditId) {
      setSession((prev) => ({ ...prev, login }));
    }

    setParticipantEditId(null);
    showToast('Участник обновлен');
  }

  function deleteParticipant(participantId) {
    setState((prev) => ({
      ...prev,
      participants: prev.participants.filter((p) => p.id !== participantId),
    }));

    if (participantEditId === participantId) setParticipantEditId(null);
    if (session.role === 'participant' && session.id === participantId) {
      setSession({ role: null, id: null, login: null });
    }

    showToast('Участник удален');
  }


  function addCriterion() {
    if (!criterionTitle.trim()) return;
    const criterion = { id: `c${Date.now()}`, title: criterionTitle.trim(), min: 1, max: 10 };
    setState((prev) => ({ ...prev, criteria: [...prev.criteria, criterion] }));
    setCriterionTitle('');
  }

  function assignWork() {
    if (!assignmentDraft.judgeId || !assignmentDraft.workId) return;
    const exists = state.assignments.some(
      (a) => a.judgeId === assignmentDraft.judgeId && a.workId === assignmentDraft.workId
    );
    if (exists) return;
    setState((prev) => ({
      ...prev,
      assignments: [
        ...prev.assignments,
        {
          judgeId: assignmentDraft.judgeId,
          workId: assignmentDraft.workId,
          status: 'не начато',
          assignedAt: new Date().toISOString(),
        },
      ],
    }));
  }

  function setScoreValue(workId, criterionId, value) {
    setScoreDrafts((prev) => ({
      ...prev,
      [workId]: {
        ...(prev[workId] || { values: {}, comment: '' }),
        values: { ...(prev[workId]?.values || {}), [criterionId]: Number(value) },
      },
    }));
  }

  function setComment(workId, comment) {
    setScoreDrafts((prev) => ({
      ...prev,
      [workId]: {
        ...(prev[workId] || { values: {} }),
        comment,
      },
    }));
  }

  function submitScore(workId) {
    const draft = scoreDrafts[workId];
    if (!draft?.comment?.trim()) {
      alert('Комментарий обязателен.');
      return;
    }

    const criteriaValues = state.criteria.map((criterion) => draft.values?.[criterion.id]).filter(Boolean);
    if (criteriaValues.length !== state.criteria.length) {
      alert('Оцените все критерии.');
      return;
    }

    const total = criteriaValues.reduce((sum, v) => sum + v, 0);
    const avg = total / criteriaValues.length;

    setState((prev) => ({
      ...prev,
      scores: [
        ...prev.scores.filter((s) => !(s.workId === workId && s.judgeId === session.id)),
        {
          workId,
          judgeId: session.id,
          criteriaScores: draft.values,
          comment: draft.comment,
          total,
          avg,
          submittedAt: new Date().toISOString(),
          locked: true,
        },
      ],
      assignments: prev.assignments.map((a) =>
        a.workId === workId && a.judgeId === session.id
          ? { ...a, status: 'оценено', finishedAt: new Date().toISOString() }
          : a
      ),
    }));
  }

  function importWorksFromCsv() {
    const rows = importText
      .split('\n')
      .map((r) => r.trim())
      .filter(Boolean)
      .map((r) => r.split(';'));

    if (rows.length < 2) return;
    const [, ...dataRows] = rows;

    const imported = dataRows.map((row, idx) => ({
      id: generateWorkId([...state.works, ...Array(idx)]),
      contest: row[0] || 'Эстетика Олимпа',
      nomination: row[1] || 'Без номинации',
      category: row[2] || 'Дебют',
      direction: row[3] || (DIRECTION_OPTIONS_BY_CONTEST[row[0]]?.[0] || 'Общий зачет'),
      title: row[4] || `Работа ${idx + 1}`,
      description: row[5] || '',
      photos: [row[6], row[7], row[8]].filter(Boolean),
      videos: [row[9]].filter(Boolean),
      participantName: row[10] || '',
      status: 'Допущено',
      author: 'Скрыт',
    }));

    setState((prev) => ({ ...prev, works: [...prev.works, ...imported] }));
    setImportText('');
  }


  function exportAppState() {
    const payload = JSON.stringify(state, null, 2);
    const blob = new Blob([payload], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'beauty-olymp-state.json';
    link.click();
    URL.revokeObjectURL(url);
    showToast('Данные экспортированы');
  }

  function importAppState() {
    if (!stateImportText.trim()) {
      showToast('Вставьте JSON состояния');
      return;
    }

    const parsed = safeParseJson(stateImportText);
    if (!parsed) {
      showToast('Некорректный JSON');
      return;
    }

    const normalized = normalizeState(parsed);
    setState(normalized);
    setStateImportText('');
    showToast('Данные импортированы');
  }

  async function syncFromCloud() {
    if (!supabase) {
      showToast('Облако не настроено');
      return;
    }

    setCloudSyncing(true);
    const { data, error } = await supabase
      .from(CLOUD_TABLE)
      .select('state')
      .eq('id', cloudRowId)
      .maybeSingle();

    if (error) {
      setCloudSyncing(false);
      setCloudError('Не удалось загрузить данные из облака');
      showToast('Ошибка синхронизации');
      return;
    }

    if (!data?.state) {
      setCloudSyncing(false);
      showToast('Облачное состояние пока пустое');
      return;
    }

    const normalized = normalizeState(data.state);
    const serializedState = JSON.stringify(normalized);
    setState(normalized);
    localStorage.setItem(STORAGE_KEY, serializedState);
    lastCloudWriteRef.current = serializedState;
    setCloudSyncing(false);
    setCloudError('');
    showToast('Данные загружены из облака');
  }

  async function syncToCloud() {
    if (!supabase) {
      showToast('Облако не настроено');
      return;
    }

    setCloudSyncing(true);
    const serializedState = JSON.stringify(state);
    const payload = { id: cloudRowId, state };
    const requestPreview = buildCloudRequestPreview(CLOUD_TABLE, payload);
    setCloudDebug((prev) => ({ ...prev, lastRequest: requestPreview }));

    try {
      let { error } = await supabase
        .from(CLOUD_TABLE)
        .upsert(payload, { onConflict: 'id' });

      if (error && isUuidInputError(error.message)) {
        const fallbackId = crypto.randomUUID();
        const fallbackPayload = { id: fallbackId, state };
        const fallbackPreview = buildCloudRequestPreview(CLOUD_TABLE, fallbackPayload);
        setCloudDebug((prev) => ({ ...prev, lastRequest: fallbackPreview }));
        const retry = await supabase
          .from(CLOUD_TABLE)
          .upsert(fallbackPayload, { onConflict: 'id' });
        error = retry.error;
        if (!error) {
          setCloudRowId(fallbackId);
        }
      }

      setCloudSyncing(false);

      if (error) {
        const message = error.message || 'unknown error';
        setCloudError(`Не удалось сохранить данные в облако: ${message}`);
        setCloudDebug((prev) => ({ ...prev, lastError: message }));
        console.error('[cloud-sync:manual] upsert failed', { requestPreview, error });
        showToast(`Ошибка выгрузки в облако: ${message}`);
        return;
      }

      lastCloudWriteRef.current = serializedState;
      setCloudError('');
      setCloudDebug((prev) => ({ ...prev, lastError: '' }));
      showToast('Данные сохранены в облако');
    } catch (err) {
      setCloudSyncing(false);
      const message = err instanceof Error ? err.message : String(err);
      setCloudError(`Не удалось сохранить данные в облако: ${message}`);
      setCloudDebug((prev) => ({ ...prev, lastError: message }));
      console.error('[cloud-sync:manual] upsert exception', { requestPreview, err });
      showToast(`Ошибка выгрузки в облако: ${message}`);
    }
  }

  function downloadCsv(filename, rows) {
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportScores() {
    const criteriaColumns = state.criteria.map((criterion) => criterion.title);
    const rows = [[
      'Номер работы',
      'Contest',
      'Direction',
      'Nomination',
      'Category',
      'Participant',
      'JudgeID',
      'JudgeName',
      ...criteriaColumns,
      'Comment',
      'Total',
      'Average',
      'SubmittedAt',
    ]];

    state.scores.forEach((score) => {
      const work = state.works.find((item) => item.id === score.workId);
      const judge = state.judges.find((item) => item.id === score.judgeId);
      const criteriaValues = state.criteria.map((criterion) => score.criteriaScores?.[criterion.id] ?? '');
      rows.push([
        score.workId,
        work?.contest || '',
        work?.direction || '',
        work?.nomination || '',
        work?.category || '',
        work?.participantName || '',
        score.judgeId,
        judge?.fullName || '',
        ...criteriaValues,
        score.comment,
        score.total,
        Number(score.avg).toFixed(2),
        score.submittedAt,
      ]);
    });

    downloadCsv('scores-detailed.csv', rows);
  }

  function exportRatings() {
    const rows = [['Group', 'Rank', 'Номер работы', 'Title', 'Average']];
    Object.entries(ratings).forEach(([group, list]) => {
      list.forEach((entry) => rows.push([group, entry.rank, entry.workId, entry.title, entry.avg]));
    });
    downloadCsv('ratings.csv', rows);
  }

  function startJudgeEdit(judge) {
    setJudgeEditId(judge.id);
    setJudgeEditDraft({
      fullName: judge.fullName || '',
      email: judge.email || '',
      login: judge.login || '',
      password: '',
      active: Boolean(judge.active),
    });
  }

  async function saveJudgeEdit() {
    if (!judgeEditId) return;
    const login = judgeEditDraft.login.trim();
    if (!judgeEditDraft.fullName.trim() || !login) {
      showToast('Укажите ФИО и логин судьи');
      return;
    }

    const duplicate =
      state.judges.some((j) => j.id !== judgeEditId && j.login === login) ||
      state.adminUsers.some((admin) => admin.login === login) ||
      state.moderators.some((moderator) => moderator.login === login);
    if (duplicate) {
      showToast('Логин уже используется');
      return;
    }

    let nextPasswordHash = null;
    if (judgeEditDraft.password) {
      nextPasswordHash = await sha256(judgeEditDraft.password);
    }

    setState((prev) => ({
      ...prev,
      judges: prev.judges.map((judge) => {
        if (judge.id !== judgeEditId) return judge;
        return {
          ...judge,
          fullName: judgeEditDraft.fullName.trim(),
          email: judgeEditDraft.email,
          login,
          active: judgeEditDraft.active,
          ...(nextPasswordHash ? { passwordHash: nextPasswordHash } : {}),
        };
      }),
    }));

    setJudgeEditId(null);
    showToast('Судья обновлен');
  }

  function deleteJudge(judgeId) {
    setState((prev) => ({
      ...prev,
      judges: prev.judges.filter((judge) => judge.id !== judgeId),
      assignments: prev.assignments.filter((assignment) => assignment.judgeId !== judgeId),
      scores: prev.scores.filter((score) => score.judgeId !== judgeId),
    }));

    if (judgeViewId === judgeId) setJudgeViewId(null);
    if (judgeEditId === judgeId) setJudgeEditId(null);
    showToast('Судья удален');
  }

  function startWorkEdit(work) {
    setWorkEditId(work.id);
    setWorkEditDraft({
      title: work.title || '',
      participantName: work.participantName || '',
      nomination: work.nomination || '',
      category: work.category || '',
      direction: work.direction || '',
      status: work.status || 'Допущено',
    });
  }
function toggleJudgePick(workId, judgeId) {
  setJudgePicksByWorkId((prev) => {
    const current = prev[workId] || [];
    const exists = current.includes(judgeId);
    const next = exists ? current.filter((id) => id !== judgeId) : [...current, judgeId];
    return { ...prev, [workId]: next };
  });
}
  
  function saveWorkEdit() {
    if (!workEditId) return;
    setState((prev) => ({
      ...prev,
      works: prev.works.map((work) =>
        work.id === workEditId
          ? { ...work, ...workEditDraft, title: workEditDraft.title.trim(), participantName: workEditDraft.participantName.trim() }
          : work
      ),
    }));
    setWorkEditId(null);
    showToast('Работа обновлена');
  }

  function deleteWork(workId) {
    setState((prev) => ({
      ...prev,
      works: prev.works.filter((work) => work.id !== workId),
      assignments: prev.assignments.filter((assignment) => assignment.workId !== workId),
      scores: prev.scores.filter((score) => score.workId !== workId),
    }));

    if (selectedWorkId === workId) setSelectedWorkId(null);
    if (workEditId === workId) setWorkEditId(null);
    showToast('Работа удалена');
  }

  if (!session.role) {
    return (
      <div className="layout">
        <BrandHeader />
        <div className="card narrow">
          <h1>Beauty Olymp — система судейства</h1>
          <p>Вход в личный кабинет.</p>
          {forcedRole ? (
  <div style={{ marginBottom: 12, fontWeight: 500 }}>
    Роль: {
      forcedRole === 'admin'
        ? 'Администратор'
        : forcedRole === 'judge'
        ? 'Судья'
        : forcedRole === 'moderator'
        ? 'Модератор'
        : 'Участник'
    }
  </div>
) : (
  <select
    value={loginForm.role}
    onChange={(e) => setLoginForm((p) => ({ ...p, role: e.target.value }))}
  >
    <option value="judge">Судья</option>
    <option value="admin">Администратор</option>
    <option value="moderator">Модератор</option>
    <option value="participant">Участник</option>
  </select>
)}

          <input placeholder="Логин" value={loginForm.login} onChange={(e) => setLoginForm((p) => ({ ...p, login: e.target.value }))} />
          <input type="password" placeholder="Пароль" value={loginForm.password} onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))} />
          <button onClick={login}>Войти</button>
                    <small>Введите ваш логин и пароль. По всем вопросам пишите: </small>
        </div>
        {lightboxImage ? (
        <div className="modal-overlay" onClick={() => setLightboxImage('')}>
          <div className="modal image-modal" onClick={(e) => e.stopPropagation()}>
            <button className="icon-close" onClick={() => setLightboxImage('')} aria-label="Закрыть">×</button>
            <img src={lightboxImage} alt="Увеличенное фото" className="zoom-image" />
          </div>
        </div>
      ) : null}

      {lightboxVideo ? (
        <div className="modal-overlay" onClick={() => setLightboxVideo('')}>
          <div className="modal video-modal" onClick={(e) => e.stopPropagation()}>
            <button className="icon-close" onClick={() => setLightboxVideo('')} aria-label="Закрыть">×</button>
            <div className="video-frame video-expanded">
              <iframe src={lightboxVideo} title="Увеличенное видео" className="media" allow="autoplay; encrypted-media; fullscreen" allowFullScreen />
            </div>
          </div>
        </div>
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
      <button className="mobile-logout" onClick={() => setSession({ role: null, id: null, login: null })}>Выйти</button>
        <Styles />
      </div>
    );
  }


  if (session.role === 'judge') {
    const done = judgeAssignments.filter((a) => a.status === 'оценено').length;
    const selectedJudgeWork = judgeSelectedWork;
    const alreadyScored = selectedJudgeWork
      ? state.scores.some((score) => score.workId === selectedJudgeWork.id && score.judgeId === session.id)
      : false;

    return (
      <div className="layout">
        <BrandHeader />
        <div className="toolbar">
          <strong>Судья: {session.login}</strong>
          <button className="top-logout" onClick={() => setSession({ role: null, id: null, login: null })}>Выйти</button>
        </div>

        <div className="card judge-stats">
          <h2>Количество работ к судейству</h2>
          <p>Назначено работ: {judgeAssignments.length}</p>
          <p>Уже отсужено работ: {done}</p>
          <p>Осталось отсудить работ: {judgeAssignments.length - done}</p>
        </div>

        {judgeWorkGroups.map((group) => (
          <div key={`${group.contest}-${group.direction}-${group.nomination}-${group.category}`} className="card">
            <h3>{group.contest}</h3>
            <p><strong>Направление:</strong> {group.direction}</p>
            <p><strong>Номинация:</strong> {group.nomination}</p>
            <p><strong>Категория:</strong> {group.category}</p>
            <div className="judge-preview-grid">
              {group.works.map((work) => (
                <button key={work.id} className="judge-preview-card" onClick={() => setJudgeSelectedWorkId(work.id)}>
                  <img
                    src={judgeSubmissionFiles[work.submissionId]?.photos?.[0] || work.photos?.[0] || 'https://via.placeholder.com/480x320?text=%D0%9D%D0%B5%D1%82+%D1%84%D0%BE%D1%82%D0%BE'}
                    alt={`Превью ${work.id}`}
                    className="judge-preview-image"
                  />
                  <span>{work.id}</span>
                  <small>{work.title}</small>
                </button>
              ))}
            </div>
          </div>
        ))}

        {selectedJudgeWork ? (
          <div className="modal-overlay" onClick={() => setJudgeSelectedWorkId(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="toolbar">
                <h3>Работа: {selectedJudgeWork.id}</h3>
                <button onClick={() => setJudgeSelectedWorkId(null)}>Закрыть</button>
              </div>
              <p><strong>Название:</strong> {selectedJudgeWork.title}</p>
              <p><strong>Описание:</strong> {selectedJudgeWork.description || '—'}</p>

              <div className="grid">
                {(judgeSubmissionFiles[selectedJudgeWork.submissionId]?.photos || selectedJudgeWork.photos || []).map((photo, index) => (
                  <img key={photo} src={photo} alt={`Фото ${index + 1}`} className="media clickable" onClick={() => setLightboxImage(photo)} />
                ))}
              </div>

              <div className="grid judge-video-grid">
                {(judgeSubmissionFiles[selectedJudgeWork.submissionId]?.videos || selectedJudgeWork.videos || []).map((video) => (
                  <div key={video} className="video-frame judge-video-thumb" onClick={() => setLightboxVideo(video)}>
                    {isEmbeddedVideoUrl(video) ? (
                      <iframe src={video} title={selectedJudgeWork.id} className="media" allow="autoplay; encrypted-media; fullscreen" allowFullScreen />
                    ) : (
                      <video src={video} className="media" controls playsInline preload="metadata" />
                    )}
                  </div>
                ))}
              </div>

              {alreadyScored ? (
                <>
                  <p><strong>Оценка отправлена. Редактирование закрыто.</strong></p>
                  {(() => {
                    const submitted = state.scores.find((score) => score.workId === selectedJudgeWork.id && score.judgeId === session.id);
                    if (!submitted) return null;
                    return (
                      <div>
                        <table>
                          <thead><tr><th>Критерий</th><th>Оценка</th></tr></thead>
                          <tbody>
                            {state.criteria.map((criterion) => (
                              <tr key={criterion.id}><td>{criterion.title}</td><td>{submitted.criteriaScores?.[criterion.id] ?? '-'}</td></tr>
                            ))}
                          </tbody>
                        </table>
                        <p><strong>Комментарий:</strong> {submitted.comment}</p>
                        <p><strong>Итого:</strong> {submitted.total} / <strong>Среднее:</strong> {Number(submitted.avg).toFixed(2)}</p>
                      </div>
                    );
                  })()}
                </>
              ) : (
                <>
                  <h4>Оценка</h4>
                  {state.criteria.map((criterion) => (
                    <div key={criterion.id}>
                      <label>{criterion.title}: {scoreDrafts[selectedJudgeWork.id]?.values?.[criterion.id] ?? 1}</label>
                      <input
                        type="range"
                        min={criterion.min}
                        max={criterion.max}
                        value={scoreDrafts[selectedJudgeWork.id]?.values?.[criterion.id] ?? criterion.min}
                        onChange={(e) => setScoreValue(selectedJudgeWork.id, criterion.id, e.target.value)}
                      />
                    </div>
                  ))}
                  <textarea
                    placeholder="Обязательный комментарий судьи"
                    value={scoreDrafts[selectedJudgeWork.id]?.comment || ''}
                    onChange={(e) => setComment(selectedJudgeWork.id, e.target.value)}
                  />
                  <button onClick={() => submitScore(selectedJudgeWork.id)}>Отправить оценку</button>
                </>
              )}
            </div>
          </div>
        ) : null}

        {lightboxImage ? (
          <div className="modal-overlay" onClick={() => setLightboxImage('')}>
            <div className="modal image-modal" onClick={(e) => e.stopPropagation()}>
              <button className="icon-close" onClick={() => setLightboxImage('')} aria-label="Закрыть">×</button>
              <img src={lightboxImage} alt="Увеличенное фото" className="zoom-image" />
            </div>
          </div>
        ) : null}

        {lightboxVideo ? (
          <div className="modal-overlay" onClick={() => setLightboxVideo('')}>
            <div className="modal video-modal" onClick={(e) => e.stopPropagation()}>
              <button className="icon-close" onClick={() => setLightboxVideo('')} aria-label="Закрыть">×</button>
              <div className="video-frame video-expanded">
                {isEmbeddedVideoUrl(lightboxVideo) ? (
                  <iframe src={lightboxVideo} title="Увеличенное видео" className="media" allow="autoplay; encrypted-media; fullscreen" allowFullScreen />
                ) : (
                  <video src={lightboxVideo} title="Увеличенное видео" className="media" controls autoPlay playsInline />
                )}
              </div>
            </div>
          </div>
        ) : null}

        {toast ? <div className="toast">{toast}</div> : null}
        <button className="mobile-logout" onClick={() => setSession({ role: null, id: null, login: null })}>Выйти</button>
        <Styles />
      </div>
    );
  }
  if (session.role === 'participant') {
    return (
      <div className="layout">
        <BrandHeader />

            {myWorks.length ? (
        <div className="card">
          <h2>Ваши работы</h2>

          {myWorks.map((work) => {
            const media = getWorkMedia(work);

            return (
              <div key={work.id} className="card" style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{work.title}</strong>
                  <span style={{ opacity: 0.7 }}>{work.status || 'Отправлено'}</span>
                </div>

                <div style={{ marginTop: 6, opacity: 0.8 }}>
                  {work.contest} · {work.direction} · {work.category}
                </div>

                <div style={{ marginTop: 4 }}>
                  <strong>Номинация:</strong> {work.nomination || '—'}
                </div>

                {work.description ? (
                  <div style={{ marginTop: 4, opacity: 0.9 }}>{work.description}</div>
                ) : null}

                {media.photos.length ? (
                  <div className="grid" style={{ marginTop: 10 }}>
                    {media.photos.map((src, idx) => (
                      <img
                        key={idx}
                        src={src}
                        alt=""
                        className="media clickable"
                        onClick={() => setLightboxImage(src)}
                      />
                    ))}
                  </div>
                ) : null}

                {media.videos.length ? (
                  <div className="grid" style={{ marginTop: 10 }}>
                    {media.videos.map((video, idx) => (
                      <video key={idx} src={video} className="media" controls />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      
        <div className="toolbar">
          <strong>Участник: {participantProfile?.fullName || session.login}</strong>
          <button className="top-logout" onClick={() => setSession({ role: null, id: null, login: null })}>Выйти</button>
        </div>

        <div className="card">
          <h1>Загрузите работу</h1>

          <p><strong>ФИО:</strong> {participantProfile?.fullName || '—'}</p>

          <select
            value={participantDraft.contest}
            onChange={(e) => {
              const nextContest = e.target.value;
              const nextDirections = DIRECTION_OPTIONS_BY_CONTEST[nextContest] || ['Общий зачет'];
              const nextDirection = nextDirections[0];
              const nextNominations = getNominationOptions(nextContest, nextDirection);
              const nextCategories = CATEGORY_OPTIONS_BY_CONTEST[nextContest] || ['Дебют'];
              setParticipantDraft((p) => ({
                ...p,
                contest: nextContest,
                direction: nextDirection,
                nomination: nextNominations[0] || '',
                category: nextCategories[0],
              }));
            }}
          >
            {CONTEST_OPTIONS.map((contest) => <option key={contest} value={contest}>{contest}</option>)}
          </select>

          <select
            value={participantDraft.direction}
            onChange={(e) => {
              const nextDirection = e.target.value;
              const nextNominations = getNominationOptions(participantDraft.contest, nextDirection);
              setParticipantDraft((p) => ({ ...p, direction: nextDirection, nomination: nextNominations[0] || '' }));
            }}
          >
            {participantDirectionOptions.map((direction) => <option key={direction} value={direction}>{direction}</option>)}
          </select>

          {participantNominationOptions.length ? (
            <select value={participantDraft.nomination} onChange={(e) => setParticipantDraft((p) => ({ ...p, nomination: e.target.value }))}>
              {participantNominationOptions.map((nomination) => <option key={nomination} value={nomination}>{nomination}</option>)}
            </select>
          ) : (
            <input placeholder="Номинация" value={participantDraft.nomination} onChange={(e) => setParticipantDraft((p) => ({ ...p, nomination: e.target.value }))} />
          )}

          <select value={participantDraft.category} onChange={(e) => setParticipantDraft((p) => ({ ...p, category: e.target.value }))}>
            {participantCategoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>

          <input placeholder="Название работы" value={participantDraft.title} onChange={(e) => setParticipantDraft((p) => ({ ...p, title: e.target.value }))} />
          <textarea placeholder="Описание работы" value={participantDraft.description} onChange={(e) => setParticipantDraft((p) => ({ ...p, description: e.target.value }))} />

          <UploadWidget
  label="Загрузка фото"
  accept="image/jpeg,image/png,image/webp"
  fileKind="image"
  userId={String(session.id)}

  submissionId={participantDraft.submissionId}
  onUploaded={(record) => {
    // достаем ссылку на файл из всех возможных полей
    const src =
      record.objectUrl ||      // то, что мы формируем в UploadWidget
      record.object_url ||     // вдруг придет в snake_case
      record.url ||            // общий url из ответа бэкенда
      null;

    if (!src) {
      console.error('Нет ссылки на файл в record', record);
      return;
    }

    setParticipantDraft((p) => ({
      ...p,
      photos: [...p.photos, src],
    }));
  }}
/>


          <UploadWidget
  label="Загрузка видео"
  accept="video/mp4,video/quicktime"
  fileKind="video"
  userId={String(session.id)}

  submissionId={participantDraft.submissionId}
  onUploaded={(record) => {
    const src =
      record.objectUrl ||
      record.object_url ||
      record.url ||
      null;

    if (!src) {
      console.error('Нет ссылки на видео в record', record);
      return;
    }

    setParticipantDraft((p) => ({
      ...p,
      videos: [...p.videos, src],
    }));
  }}
/>


          <button onClick={submitParticipantWork}>Отправить работу</button>
        </div>

        {toast ? <div className="toast">{toast}</div> : null}
        <Styles />
      </div>
    );
  }




  const notStartedJudges = state.judges.filter((judge) =>
    state.assignments.some((a) => a.judgeId === judge.id && a.status !== 'оценено')
  );

  return (
    <div className="layout">
      <BrandHeader />
      <div className="toolbar">
        <strong>{isAdmin ? `Администратор: ${session.login}` : `Модератор: ${session.login}`}</strong>
        <button className="top-logout" onClick={() => setSession({ role: null, id: null, login: null })}>Выйти</button>
      </div>

      <div className="card row">
  <button onClick={() => handleAdminTabChange('main')}>Админка</button>

  {(isAdmin || access.canManageJudges) ? (
    <button onClick={() => handleAdminTabChange('judges')}>Судьи</button>
  ) : null}

  {(isAdmin || access.canManageWorks) ? (
    <button onClick={() => handleAdminTabChange('works')}>Работы</button>
  ) : null}

  {/* 🔹 Новая вкладка Критерии */}
  {(isAdmin || access.canManageWorks) ? (
    <button onClick={() => handleAdminTabChange('criteria')}>Критерии</button>
  ) : null}

  {isAdmin ? (
    <button onClick={() => handleAdminTabChange('moderators')}>Модераторы</button>
  ) : null}

  {isAdmin ? (
    <button onClick={() => handleAdminTabChange('participants')}>Участники</button>
  ) : null}

  {/* 🔹 Импорт переносим в конец */}
  {(isAdmin || access.canManageWorks) ? (
    <button onClick={() => handleAdminTabChange('import')}>Импорт</button>
  ) : null}
</div>

      {adminTab === 'main' ? (
        <>
      <div className="card">
        <h2>Дашборд</h2>
        <p>Работ: {state.works.length}</p>
        <p>Судей: {state.judges.length}</p>
        <p>Завершено назначений: {progress}%</p>
        <p>Работ без оценок: {state.works.filter((w) => !state.scores.some((s) => s.workId === w.id)).length}</p>
        <p>Судьи с незавершенными назначениями: {notStartedJudges.map((j) => j.fullName).join(', ') || 'нет'}</p>
      </div>

      {access.canManageWorks ? (
      <div className="card">
        <h3>Создание карточки работы</h3>
        <select
          value={workDraft.contest}
          onChange={(e) => {
            const nextContest = e.target.value;
            const nextCategories = CATEGORY_OPTIONS_BY_CONTEST[nextContest] || ['Дебют'];
            const nextDirections = DIRECTION_OPTIONS_BY_CONTEST[nextContest] || ['Общий зачет'];
            const nextDirection = nextDirections[0];
            const nextNominations = getNominationOptions(nextContest, nextDirection);
            setWorkDraft((p) => ({
              ...p,
              contest: nextContest,
              category: nextCategories[0],
              direction: nextDirection,
              nomination: nextNominations[0] || '',
            }));
          }}
        >
          {CONTEST_OPTIONS.map((contest) => <option key={contest} value={contest}>{contest}</option>)}
        </select>
        <select
          value={workDraft.direction}
          onChange={(e) => {
            const nextDirection = e.target.value;
            const nextNominations = getNominationOptions(workDraft.contest, nextDirection);
            setWorkDraft((p) => ({ ...p, direction: nextDirection, nomination: nextNominations[0] || '' }));
          }}
        >
          {directionOptions.map((direction) => <option key={direction} value={direction}>{direction}</option>)}
        </select>
        {nominationOptions.length ? (
          <select value={workDraft.nomination} onChange={(e) => setWorkDraft((p) => ({ ...p, nomination: e.target.value }))}>
            {nominationOptions.map((nomination) => <option key={nomination} value={nomination}>{nomination}</option>)}
          </select>
        ) : (
          <input placeholder="Номинация" value={workDraft.nomination} onChange={(e) => setWorkDraft((p) => ({ ...p, nomination: e.target.value }))} />
        )}
        <select value={workDraft.category} onChange={(e) => setWorkDraft((p) => ({ ...p, category: e.target.value }))}>
          {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
        <input placeholder="Фамилия и отчество участника" value={workDraft.participantName} onChange={(e) => setWorkDraft((p) => ({ ...p, participantName: e.target.value }))} />
        <input placeholder="Название" value={workDraft.title} onChange={(e) => setWorkDraft((p) => ({ ...p, title: e.target.value }))} />
        <textarea placeholder="Описание" value={workDraft.description} onChange={(e) => setWorkDraft((p) => ({ ...p, description: e.target.value }))} />
        <textarea placeholder="Фото (по 1 ссылке на строку)" value={workDraft.photosText} onChange={(e) => setWorkDraft((p) => ({ ...p, photosText: e.target.value }))} />
        <textarea placeholder="Видео (по 1 ссылке на строку)" value={workDraft.videosText} onChange={(e) => setWorkDraft((p) => ({ ...p, videosText: e.target.value }))} />
        <button onClick={addWork}>Сохранить работу</button>
      </div>
      ) : null}

      {access.canManageJudges ? (
      <>
      <div className="card">
        <h3>Управление критериями</h3>
        <ul>{state.criteria.map((c) => <li key={c.id}>{c.title}</li>)}</ul>
        <input value={criterionTitle} onChange={(e) => setCriterionTitle(e.target.value)} placeholder="Новый критерий" />
        <button onClick={addCriterion}>Добавить критерий</button>
      </div>

      <div className="card">
        <h3>Создание судьи</h3>
        <input placeholder="ФИО" value={judgeDraft.fullName} onChange={(e) => setJudgeDraft((p) => ({ ...p, fullName: e.target.value }))} />
        <input placeholder="Логин" value={judgeDraft.login} onChange={(e) => setJudgeDraft((p) => ({ ...p, login: e.target.value }))} />
        <input type="password" placeholder="Пароль" value={judgeDraft.password} onChange={(e) => setJudgeDraft((p) => ({ ...p, password: e.target.value }))} />
        <button onClick={addJudge}>Добавить судью</button>
      </div>

           
      </>
      ) : null}

      {access.canExportScores ? (
      <>
      <div className="card">
        <h3>Рейтинг по номинациям и категориям</h3>
        <div className="row rating-filters">
          <label>Конкурсы</label>
          <select value={ratingFilter.contest} onChange={(e) => setRatingFilter((prev) => ({ ...prev, contest: e.target.value }))}>
            <option value="all">Все конкурсы</option>
            {ratingFilterOptions.contests.map((contest) => <option key={contest} value={contest}>{contest}</option>)}
          </select>
          <label>Направления</label>
          <select value={ratingFilter.direction} onChange={(e) => setRatingFilter((prev) => ({ ...prev, direction: e.target.value }))}>
            <option value="all">Все направления</option>
            {ratingFilterOptions.directions.map((direction) => <option key={direction} value={direction}>{direction}</option>)}
          </select>
          <label>Категории</label>
          <select value={ratingFilter.category} onChange={(e) => setRatingFilter((prev) => ({ ...prev, category: e.target.value }))}>
            <option value="all">Все категории</option>
            {ratingFilterOptions.categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </div>
        {Object.entries(ratings).map(([group, list]) => (
          <div key={group}>
            <h4>{group}</h4>
            <table>
              <thead><tr><th>Место</th><th>Номер работы</th><th>Название</th><th>Средний балл</th><th>Действие</th></tr></thead>
              <tbody>
                {list.map((item) => <tr key={item.workId}><td>{item.rank}</td><td>{item.workId}</td><td>{item.title}</td><td>{item.avg}</td><td><button onClick={() => setSelectedWorkId(item.workId)}>Открыть</button></td></tr>)}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="card row">
        <button onClick={exportScores}>Экспорт всех оценок CSV</button>
        <button onClick={exportRatings}>Экспорт рейтинга CSV</button>
      </div>
      </>
      ) : null}

      </>
      ) : null}

      {adminTab === 'judges' && (isAdmin || access.canManageJudges) ? (
        <div className="card">
          <h3>Все судьи</h3>
          <div className="admin-table-wrap"><table>
            <thead><tr><th>ID</th><th>ФИО</th><th>Логин</th><th>Статус</th><th>Действия</th></tr></thead>
            <tbody>
              {state.judges.map((judge) => {
                const judgeAssignmentsList = state.assignments.filter((a) => a.judgeId === judge.id);
                const judged = judgeAssignmentsList.filter((a) => a.status === 'оценено');
                const pending = judgeAssignmentsList.filter((a) => a.status !== 'оценено');
                const isEditing = judgeEditId === judge.id;
                return (
                  <tr key={judge.id}>
                    <td>{judge.id}</td>
                    <td>{isEditing ? <input value={judgeEditDraft.fullName} onChange={(e) => setJudgeEditDraft((p) => ({ ...p, fullName: e.target.value }))} /> : judge.fullName}</td>
                    <td>{isEditing ? <input value={judgeEditDraft.login} onChange={(e) => setJudgeEditDraft((p) => ({ ...p, login: e.target.value }))} /> : judge.login}</td>
                    <td>{isEditing ? (
                      <select value={String(judgeEditDraft.active)} onChange={(e) => setJudgeEditDraft((p) => ({ ...p, active: e.target.value === 'true' }))}>
                        <option value="true">Активен</option>
                        <option value="false">Неактивен</option>
                      </select>
                    ) : (judge.active ? 'Активен' : 'Неактивен')}</td>
                    <td>
                      <div className="row">
                        {isEditing ? (
                          <>
                            <input type="password" placeholder="Новый пароль (опц.)" value={judgeEditDraft.password} onChange={(e) => setJudgeEditDraft((p) => ({ ...p, password: e.target.value }))} />
                            <button onClick={saveJudgeEdit}>Сохранить</button>
                            <button onClick={() => setJudgeEditId(null)}>Отмена</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => setJudgeViewId(judge.id)}>Просмотр</button>
                            <button onClick={() => startJudgeEdit(judge)}>Редактировать</button>
                            <button onClick={() => deleteJudge(judge.id)}>Удалить</button>
                          </>
                        )}
                      </div>
                      {judgeViewId === judge.id ? (
                        <div>
                          <p><strong>Отсудил:</strong> {judged.length}</p>
                          <ul>{judged.map((a) => { const work = state.works.find((w) => w.id === a.workId); return <li key={a.workId}><button onClick={() => setSelectedJudgeWork({ judgeId: judge.id, workId: a.workId })}>{a.workId} — {work?.title || 'Удалена'}</button></li>; })}</ul>
                          <p><strong>Не отсудил:</strong> {pending.length}</p>
                          <ul>{pending.map((a) => { const work = state.works.find((w) => w.id === a.workId); return <li key={a.workId}>{a.workId} — {work?.title || 'Удалена'}</li>; })}</ul>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>

          <div className="mobile-only-list">
            {state.judges.map((judge) => {
              const judgeAssignmentsList = state.assignments.filter((a) => a.judgeId === judge.id);
              const judged = judgeAssignmentsList.filter((a) => a.status === 'оценено').length;
              const pending = judgeAssignmentsList.filter((a) => a.status !== 'оценено').length;
              return (
                <div key={`mobile-${judge.id}`} className="card compact-card">
                  <h4>{judge.fullName}</h4>
                  <p><strong>ID:</strong> {judge.id}</p>
                  <p><strong>Логин:</strong> {judge.login}</p>
                  <p><strong>Статус:</strong> {judge.active ? 'Активен' : 'Неактивен'}</p>
                  <p><strong>Отсудил:</strong> {judged} · <strong>Не отсудил:</strong> {pending}</p>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

{adminTab === 'criteria' && (
  <div className="card">
    <h3>Управление критериями</h3>

    <div className="row" style={{ marginBottom: 12 }}>
      <select
        value={criteriaContest || ''}
        onChange={(e) => setCriteriaContest(e.target.value)}
      >
        <option value="">Выберите конкурс</option>
        <option value="Эстетика Олимпа">Эстетика Олимпа</option>
        <option value="Креатив Олимпа">Креатив Олимпа</option>
      </select>

      <select
        value={criteriaDirection || ''}
        onChange={(e) => setCriteriaDirection(e.target.value)}
      >
        <option value="">Выберите направление</option>
        <option value="Маникюр">Маникюр</option>
        <option value="Перманент">Перманент</option>
      </select>
    </div>
{criteriaContest && criteriaDirection && (
  <div style={{ marginTop: 20 }}>

    <h4>Критерии для выбранного направления</h4>

    {(state.criteria || [])
      .filter(
        (c) =>
          c.contest === criteriaContest &&
          c.direction === criteriaDirection
      )
      .map((c) => (
        <div key={c.id} className="row" style={{ marginBottom: 8 }}>
          <div style={{ flex: 1 }}>{c.title}</div>
          <div>от {c.min} до {c.max}</div>
        </div>
      ))}

    <hr style={{ margin: '20px 0' }} />

    <h4>Добавить критерий</h4>

    <input
      placeholder="Название критерия"
      value={newCriterionTitle}
      onChange={(e) => setNewCriterionTitle(e.target.value)}
    />

    <button
      onClick={() => {
        if (!newCriterionTitle.trim()) return;

        const newId = `CR-${Date.now()}`;

        const newCriterion = {
          id: newId,
          contest: criteriaContest,
          direction: criteriaDirection,
          title: newCriterionTitle,
          min: 1,
          max: 10,
        };

        setState((prev) => ({
          ...prev,
          criteria: [...prev.criteria, newCriterion],
        }));

        setNewCriterionTitle('');
      }}
    >
      Добавить
    </button>

  </div>
)}
    <div>
      {(state.criteria || [])
        .filter(
          (c) =>
            c.contest === criteriaContest &&
            c.direction === criteriaDirection
        )
        .map((c) => (
          <div key={c.id} className="row" style={{ marginBottom: 8 }}>
            <div style={{ flex: 1 }}>{c.title}</div>
            <div>от {c.min} до {c.max}</div>
          </div>
        ))}
    </div>
  </div>
)}

      {adminTab === 'import' && (isAdmin || access.canManageWorks) ? (
        <div className="card">
          <h3>Импорт работ из CSV (;)</h3>
          <p>Колонки: Конкурс;Номинация;Категория;Направление;Название;Описание;Фото1;Фото2;Фото3;Видео1;ФИО участника</p>
          <textarea rows={8} value={importText} onChange={(e) => setImportText(e.target.value)} />
          <button onClick={importWorksFromCsv}>Импортировать</button>

          <h3>Синхронизация данных между устройствами</h3>
          <p>
            Теперь данные синхронизируются через облако Supabase автоматически. Ручной JSON-обмен оставлен как резервный вариант.
          </p>
          <p>
            Статус облака: {supabase ? (cloudSyncing ? 'идет синхронизация…' : 'подключено') : 'не настроено'}
            {cloudError ? ` — ${cloudError}` : ''}
          </p>
          <small><strong>Текущий cloud row id:</strong> {cloudRowId}</small>
          {cloudDebug.lastRequest ? <small><strong>Последний запрос:</strong> {cloudDebug.lastRequest}</small> : null}
          {cloudDebug.lastError ? <small><strong>Последний error.message:</strong> {cloudDebug.lastError}</small> : null}
          <div className="row">
            <button onClick={syncFromCloud}>Загрузить из облака</button>
            <button onClick={syncToCloud}>Сохранить в облако</button>
            <button onClick={exportAppState}>Экспорт JSON состояния</button>
          </div>
          <textarea rows={6} placeholder="Вставьте JSON состояния сюда" value={stateImportText} onChange={(e) => setStateImportText(e.target.value)} />
          <button onClick={importAppState}>Импорт JSON состояния</button>
        </div>
      ) : null}

      {adminTab === 'works' && (isAdmin || access.canManageWorks) ? (
        <div className="card">
          <h3>Все загруженные работы</h3>
          <div className="admin-table-wrap"><table className="works-table">
            <thead><tr><th>ID</th><th>Конкурс</th><th>Номинация</th><th>Категория</th><th>Участник</th><th>Название</th><th>Судьи</th><th>Действия</th></tr></thead>
            <tbody>
              {state.works.map((work) => {
                const editing = workEditId === work.id;
                return (
                  <tr key={work.id}>
                    <td>{work.id}</td>
                    <td>{work.contest}</td>
                    <td>{editing ? <input value={workEditDraft.nomination} onChange={(e) => setWorkEditDraft((p) => ({ ...p, nomination: e.target.value }))} /> : work.nomination}</td>
                      <td>
  {editing
    ? <input
        value={workEditDraft.category}
        onChange={(e) =>
          setWorkEditDraft((p) => ({ ...p, category: e.target.value }))
        }
      />
    : (work.category || '-')}
</td>
                    <td>{editing ? <input value={workEditDraft.participantName} onChange={(e) => setWorkEditDraft((p) => ({ ...p, participantName: e.target.value }))} /> : (work.participantName || '—')}</td>
                    <td>{editing ? <input value={workEditDraft.title} onChange={(e) => setWorkEditDraft((p) => ({ ...p, title: e.target.value }))} /> : work.title}</td>
                    <td>
  <div style={{ display: 'grid', gap: 8 }}>
    <select
  multiple
  value={judgePicksByWorkId[work.id] || []}
  onChange={(e) => {
    const selectedIds = Array.from(e.target.selectedOptions).map((opt) => opt.value);
    setJudgePicksByWorkId((prev) => ({ ...prev, [work.id]: selectedIds }));
  }}
  style={{
    width: '100%',
    minHeight: 110,
    border: '1px solid #d6d6f0',
    borderRadius: 12,
    padding: '10px',
    outline: 'none',
  }}
>
  {state.judges.map((j) => (
    <option key={j.id} value={j.id}>
      {j.fullName}
    </option>
  ))}
</select>

    <button
      type="button"
      onClick={() => {
        const judgeIds = judgePicksByWorkId[work.id] || [];
        alert(`Для работы ${work.id} выбраны судьи: ${judgeIds.join(', ') || 'никто'}`);
      }}
    >
      Назначить
    </button>
  </div>
</td>
                               <td>
                      <div className="row">     
                        {editing ? (
                          <>
                            <button onClick={saveWorkEdit}>Сохранить</button>
                            <button onClick={() => setWorkEditId(null)}>Отмена</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startWorkEdit(work)}>Редактировать</button>
                            <button onClick={() => deleteWork(work.id)}>Удалить</button>
                            <button onClick={() => setSelectedWorkId(work.id)}>Просмотр оценок</button>
                           </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>

          <div className="mobile-only-list">
            {state.works.map((work) => (
              <div key={`mobile-work-${work.id}`} className="card compact-card">
                <h4>{work.title}</h4>
                <p><strong>Номер:</strong> {work.id}</p>
                <p><strong>Конкурс:</strong> {work.contest}</p>
                <p><strong>Направление:</strong> {work.direction || '—'}</p>
                <p><strong>Категория:</strong> {work.category}</p>
                <p><strong>Участник:</strong> {work.participantName || '—'}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {adminTab === 'moderators' && isAdmin ? (
        <div className="card">
          <h3>Модераторы</h3>
        {/* Создание модератора */}
<div className="card" style={{ marginTop: 16 }}>
  <h3>Создание модератора</h3>

  <input
    placeholder="ФИО"
    value={moderatorDraft.fullName}
    onChange={(e) =>
      setModeratorDraft((p) => ({ ...p, fullName: e.target.value }))
    }
  />

  <input
    placeholder="Логин"
    value={moderatorDraft.login}
    onChange={(e) =>
      setModeratorDraft((p) => ({ ...p, login: e.target.value }))
    }
  />

  <input
    type="password"
    placeholder="Пароль"
    value={moderatorDraft.password}
    onChange={(e) =>
      setModeratorDraft((p) => ({ ...p, password: e.target.value }))
    }
  />

  <div style={{ marginTop: 8 }}>
    {MODERATOR_PERMISSIONS.map((permission) => (
      <label key={permission.key} style={{ display: 'block' }}>
        <input
          type="checkbox"
          checked={moderatorDraft.permissions[permission.key]}
          onChange={() => toggleDraftPermission(permission.key)}
        />{' '}
        {permission.label}
      </label>
    ))}
  </div>

  <button style={{ marginTop: 12 }} onClick={addModerator}>
    Добавить модератора
  </button>
</div>
          <div className="admin-table-wrap"><table>
            <thead><tr><th>ID</th><th>ФИО</th><th>Логин</th><th>Права</th><th>Статус</th><th>Действия</th></tr></thead>
            <tbody>
              {state.moderators.map((moderator) => {
                const isEditing = moderatorEditId === moderator.id;
                return (
                  <tr key={moderator.id}>
                    <td>{moderator.id}</td>
                    <td>{isEditing ? <input value={moderatorEditDraft.fullName} onChange={(e) => setModeratorEditDraft((p) => ({ ...p, fullName: e.target.value }))} /> : moderator.fullName}</td>
                    <td>{isEditing ? <input value={moderatorEditDraft.login} onChange={(e) => setModeratorEditDraft((p) => ({ ...p, login: e.target.value }))} /> : moderator.login}</td>
                    <td>
                      {isEditing ? (
                        <div>
                          {MODERATOR_PERMISSIONS.map((permission) => (
                            <label key={permission.key} style={{ display: 'block' }}>
                              <input
                                type="checkbox"
                                checked={moderatorEditDraft.permissions[permission.key]}
                                onChange={() => toggleEditPermission(permission.key)}
                              />{' '}
                              {permission.label}
                            </label>
                          ))}
                        </div>
                      ) : MODERATOR_PERMISSIONS.filter((permission) => moderator.permissions?.[permission.key]).map((permission) => permission.label).join(', ') || 'Нет прав'}
                    </td>
                    <td>{isEditing ? (
                      <select value={String(moderatorEditDraft.active)} onChange={(e) => setModeratorEditDraft((p) => ({ ...p, active: e.target.value === 'true' }))}>
                        <option value="true">Активен</option>
                        <option value="false">Неактивен</option>
                      </select>
                    ) : (moderator.active ? 'Активен' : 'Неактивен')}</td>
                    <td>
                      <div className="row">
                        {isEditing ? (
                          <>
                            <input type="password" placeholder="Новый пароль (опц.)" value={moderatorEditDraft.password} onChange={(e) => setModeratorEditDraft((p) => ({ ...p, password: e.target.value }))} />
                            <button onClick={saveModeratorEdit}>Сохранить</button>
                            <button onClick={() => setModeratorEditId(null)}>Отмена</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startModeratorEdit(moderator)}>Редактировать</button>
                            <button onClick={() => deleteModerator(moderator.id)}>Удалить</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        </div>
      ) : null}
      {adminTab === 'participants' && isAdmin ? (
        <div className="card">
          <h3>Участники</h3>

          <div className="card subtle">
            <h4>Добавить участника</h4>
            <input placeholder="ФИО" value={participantAdminDraft.fullName} onChange={(e) => setParticipantAdminDraft((p) => ({ ...p, fullName: e.target.value }))} />
            <input placeholder="Email (опционально)" value={participantAdminDraft.email} onChange={(e) => setParticipantAdminDraft((p) => ({ ...p, email: e.target.value }))} />
            <input placeholder="Логин" value={participantAdminDraft.login} onChange={(e) => setParticipantAdminDraft((p) => ({ ...p, login: e.target.value }))} />
            <input type="password" placeholder="Пароль" value={participantAdminDraft.password} onChange={(e) => setParticipantAdminDraft((p) => ({ ...p, password: e.target.value }))} />
            <label className="checkbox-row">
              <input type="checkbox" checked={participantAdminDraft.active} onChange={(e) => setParticipantAdminDraft((p) => ({ ...p, active: e.target.checked }))} />
              Активен
            </label>
            <button onClick={addParticipant}>Добавить</button>
          </div>

          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr><th>ID</th><th>ФИО</th><th>Email</th><th>Логин</th><th>Статус</th><th>Действия</th></tr>
              </thead>
              <tbody>
                {state.participants.map((participant) => {
                  const isEditing = participantEditId === participant.id;
                  return (
                    <tr key={participant.id}>
                      <td>{participant.id}</td>
                      <td>{isEditing ? <input value={participantEditDraft.fullName} onChange={(e) => setParticipantEditDraft((p) => ({ ...p, fullName: e.target.value }))} /> : participant.fullName}</td>
                      <td>{isEditing ? <input value={participantEditDraft.email} onChange={(e) => setParticipantEditDraft((p) => ({ ...p, email: e.target.value }))} /> : (participant.email || '—')}</td>
                      <td>{isEditing ? <input value={participantEditDraft.login} onChange={(e) => setParticipantEditDraft((p) => ({ ...p, login: e.target.value }))} /> : participant.login}</td>
                      <td>
                        {isEditing ? (
                          <label className="checkbox-row">
                            <input type="checkbox" checked={participantEditDraft.active} onChange={(e) => setParticipantEditDraft((p) => ({ ...p, active: e.target.checked }))} />
                            Активен
                          </label>
                        ) : (participant.active ? 'Активен' : 'Выключен')}
                      </td>
                      <td>
                        {isEditing ? (
                          <>
                            <input type="password" placeholder="Новый пароль (опц.)" value={participantEditDraft.password} onChange={(e) => setParticipantEditDraft((p) => ({ ...p, password: e.target.value }))} />
                            <button onClick={saveParticipantEdit}>Сохранить</button>
                            <button onClick={() => setParticipantEditId(null)}>Отмена</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startParticipantEdit(participant)}>Редактировать</button>
                            <button onClick={() => deleteParticipant(participant.id)}>Удалить</button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}



      {selectedJudgeWork ? (
        <div className="modal-overlay" onClick={() => setSelectedJudgeWork(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="toolbar">
              <h3>Оценка судьи по работе</h3>
              <button onClick={() => setSelectedJudgeWork(null)}>Закрыть</button>
            </div>
            {(() => {
              const score = state.scores.find((s) => s.workId === selectedJudgeWork.workId && s.judgeId === selectedJudgeWork.judgeId);
              const judge = state.judges.find((j) => j.id === selectedJudgeWork.judgeId);
              const work = state.works.find((w) => w.id === selectedJudgeWork.workId);
              return (
                <div>
                  <p><strong>Судья:</strong> {judge?.fullName || selectedJudgeWork.judgeId}</p>
                  <p><strong>Номер работы:</strong> {work?.id}</p>
                  <p><strong>Название:</strong> {work?.title || '—'}</p>
                  <p><strong>Описание:</strong> {work?.description || '—'}</p>

                  <div className="grid">
                    {getWorkMedia(work).photos.map((photo, index) => (
                      <img key={photo} src={photo} alt={`Фото ${index + 1}`} className="media clickable" onClick={() => setLightboxImage(photo)} />
                    ))}
                  </div>

                  <div className="grid judge-video-grid">
                    {getWorkMedia(work).videos.map((video) => (
                      <div key={video} className="video-frame judge-video-thumb" onClick={() => setLightboxVideo(video)}>
                        {isEmbeddedVideoUrl(video) ? (
                          <iframe src={video} title={work?.id || 'video'} className="media" allow="autoplay; encrypted-media; fullscreen" allowFullScreen />
                        ) : (
                          <video src={video} className="media" controls playsInline preload="metadata" />
                        )}
                      </div>
                    ))}
                  </div>

                  {!score ? <p>По этой связке судья-работа оценка пока не отправлена.</p> : (
                    <>
                      <table>
                        <thead><tr><th>Критерий</th><th>Оценка</th></tr></thead>
                        <tbody>
                          {state.criteria.map((criterion) => (
                            <tr key={criterion.id}><td>{criterion.title}</td><td>{score.criteriaScores?.[criterion.id] ?? '-'}</td></tr>
                          ))}
                        </tbody>
                      </table>
                      <p><strong>Комментарий:</strong> {score.comment}</p>
                      <p><strong>Итого:</strong> {score.total} / <strong>Среднее:</strong> {Number(score.avg).toFixed(2)}</p>
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      ) : null}

      {selectedWork ? (

        <div className="modal-overlay" onClick={() => setSelectedWorkId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="toolbar">
              <h3>Результаты судейства: Номер работы {selectedWork.id}</h3>
              <button onClick={() => setSelectedWorkId(null)}>Закрыть</button>
            </div>
            <p>{selectedWork.contest} / {selectedWork.direction || 'Общий зачет'} / {selectedWork.nomination} / {selectedWork.category}</p>
            <p><strong>Участник:</strong> {selectedWork.participantName || 'не указан'}</p>
            <p><strong>Название:</strong> {selectedWork.title || '—'}</p>
            <p><strong>Описание:</strong> {selectedWork.description || '—'}</p>
            <h4>Фото работы</h4>
            <div className="grid">
              {getWorkMedia(selectedWork).photos.map((photo, index) => (
                <img key={photo} src={photo} alt={`Фото ${index + 1}`} className="media clickable" onClick={() => setLightboxImage(photo)} />
              ))}
            </div>
            <h4>Видео работы</h4>
            <div className="grid judge-video-grid">
              {getWorkMedia(selectedWork).videos.map((video) => (
                <div key={video} className="video-frame judge-video-thumb" onClick={() => setLightboxVideo(video)}>
                  {isEmbeddedVideoUrl(video) ? (
                    <iframe src={video} title={selectedWork.id} className="media" allow="autoplay; encrypted-media; fullscreen" allowFullScreen />
                  ) : (
                    <video src={video} className="media" controls playsInline preload="metadata" />
                  )}
                </div>
              ))}
            </div>
            {selectedWorkScores.length === 0 ? (
              <p>По этой работе пока нет отправленных оценок.</p>
            ) : (
              selectedWorkScores.map((score) => {
                const judge = state.judges.find((item) => item.id === score.judgeId);
                return (
                  <div key={`${score.workId}-${score.judgeId}-${score.submittedAt}`} className="card">
                    <strong>{judge?.fullName || score.judgeId}</strong>
                    <table>
                      <thead><tr><th>Критерий</th><th>Оценка</th></tr></thead>
                      <tbody>
                        {state.criteria.map((criterion) => (
                          <tr key={criterion.id}>
                            <td>{criterion.title}</td>
                            <td>{score.criteriaScores?.[criterion.id] ?? '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p><strong>Комментарий:</strong> {score.comment}</p>
                    <p><strong>Итого:</strong> {score.total} / <strong>Среднее:</strong> {Number(score.avg).toFixed(2)}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}

      {lightboxImage ? (
        <div className="modal-overlay" onClick={() => setLightboxImage('')}>
          <div className="modal image-modal" onClick={(e) => e.stopPropagation()}>
            <button className="icon-close" onClick={() => setLightboxImage('')} aria-label="Закрыть">×</button>
            <img src={lightboxImage} alt="Увеличенное фото" className="zoom-image" />
          </div>
        </div>
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
      <button className="mobile-logout" onClick={() => setSession({ role: null, id: null, login: null })}>Выйти</button>
      <Styles />
    </div>
  );
}


function BrandHeader() {
  return (
    <div className="brand-header">
      <img src="/beauty-olymp-logo.png" alt="Association of Beauty Professionals | beauty olymp" className="brand-logo-image" />
    </div>
  );
}


function Styles() {
  return (
    <style jsx global>{`
      @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&family=Roboto+Condensed:wght@400;500;700&display=swap');
      body { margin: 0; font-family: 'Open Sans', Arial, sans-serif; color: #000; background: radial-gradient(circle at 8% 10%, rgba(255,2,93,0.14), transparent 40%), radial-gradient(circle at 92% 20%, rgba(40,28,104,0.14), transparent 44%), radial-gradient(circle at 50% 100%, rgba(255,2,93,0.1), transparent 35%), #fff; }
      .layout { max-width: 1100px; margin: 0 auto; padding: 20px; display: grid; gap: 16px; }
      .brand-header { display: flex; justify-content: flex-start; margin-bottom: 4px; }
      .brand-logo-image { width: min(360px, 65vw); height: auto; object-fit: contain; }
      .card { background: rgba(255,255,255,0.94); border: 1px solid rgba(40,28,104,0.1); border-radius: 14px; padding: 16px; box-shadow: 0 12px 34px rgba(40,28,104,0.08); display: grid; gap: 8px; }
      .narrow { max-width: 420px; margin: 40px auto; }
      .toolbar { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
      input, textarea, select, button { padding: 10px; border-radius: 10px; border: 1px solid rgba(40,28,104,0.2); font-size: 14px; }
      input, textarea, select { background: rgba(255,255,255,0.94); color: #000; }
      input:focus, textarea:focus, select:focus { outline: none; border-color: #FF025D; box-shadow: 0 0 0 3px rgba(255,2,93,0.14); }
      button { border: none; background: linear-gradient(135deg, #FF025D 0%, #d90178 100%); color: #fff; cursor: pointer; box-shadow: none; transition: transform 0.15s ease, filter 0.15s ease; text-transform: uppercase; letter-spacing: 0.4px; font-weight: 700; font-family: 'Roboto Condensed', Arial, sans-serif; }
      button:hover { filter: brightness(1.05); transform: translateY(-1px); }
      button:active { transform: translateY(0); }
      .grid { display: grid; gap: 8px; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }
      .media { width: 100%; min-height: 140px; border-radius: 8px; border: 1px solid #d8deea; }
      .row { display: flex; gap: 8px; flex-wrap: wrap; }
      .rating-filters label { font-size: 13px; font-weight: 700; color: #281C68; }
      .admin-table-wrap { overflow-x: auto; }
      .admin-table-wrap table { min-width: 920px; }
      .mobile-only-list { display: none; }
      .compact-card { padding: 10px 12px; gap: 4px; }
      .top-logout { display: inline-flex; }
      .mobile-logout { display: none; background: #281C68; margin-top: 4px; }
      .toast { position: fixed; right: 20px; bottom: 20px; background: linear-gradient(135deg, #281C68 0%, #FF025D 100%); color: #fff; padding: 10px 14px; border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.18); z-index: 30; }
      .modal-overlay { position: fixed; inset: 0; background: rgba(10, 17, 35, 0.55); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 25; }
      .modal { width: min(920px, 100%); max-height: 85vh; overflow: auto; background: #fff; border-radius: 14px; padding: 16px; display: grid; gap: 12px; }
      .image-modal { width: min(1100px, 100%); position: relative; }
      .video-modal { width: min(1200px, 100%); position: relative; }
      .icon-close { position: absolute; top: 10px; right: 10px; width: 44px; height: 44px; border-radius: 999px; padding: 0; font-size: 28px; line-height: 1; display: grid; place-items: center; z-index: 2; }
      .zoom-image { width: 100%; max-height: 75vh; object-fit: contain; }
      .video-frame { position: relative; width: 100%; aspect-ratio: 16 / 9; }
      .video-frame .media { position: absolute; inset: 0; width: 100%; height: 100%; min-height: 0; }
      .judge-video-grid { grid-template-columns: 1fr; }
      .judge-video-thumb { cursor: zoom-in; width: clamp(320px, 46vw, 640px); max-width: 100%; }
      .judge-video-thumb .media { width: 100%; aspect-ratio: 16/9; background: #000; overflow: hidden; }
      .judge-video-thumb video, .judge-video-thumb iframe { width: 100%; height: 100%; object-fit: contain; display: block; }
      .video-expanded { aspect-ratio: 16 / 9; min-height: 58vh; }
      .clickable { cursor: pointer; }
      .works-table { table-layout: fixed; }
      .works-table th, .works-table td { vertical-align: middle; }
      .works-table th { text-align: center; }
      .works-table td { text-align: left; }
      .works-table td > .row { justify-content: flex-start; }
     /* Таблица фиксированной ширины */
.works-table {
  width: 100%;
  table-layout: fixed;
}

/* перенос слов аккуратно */
.works-table th,
.works-table td {
  word-break: break-word;
  overflow-wrap: break-word;
  vertical-align: top;
}

/* 1 — ID */
.works-table th:nth-child(1),
.works-table td:nth-child(1) {
  width: 70px;
}

/* 2 — Конкурс */
.works-table th:nth-child(2),
.works-table td:nth-child(2) {
  width: 90px;
}

/* 3 — Номинация (шире!) */
.works-table th:nth-child(3),
.works-table td:nth-child(3) {
  width: 170px;
}

/* 4 — Категория */
.works-table th:nth-child(4),
.works-table td:nth-child(4) {
  width: 90px;
}

/* 5 — Участник (шире) */
.works-table th:nth-child(5),
.works-table td:nth-child(5) {
  width: 90px;
}

/* 6 — Название */
.works-table th:nth-child(6),
.works-table td:nth-child(6) {
  width: 120px;
}

/* 7 — Судьи */
.works-table th:nth-child(7),
.works-table td:nth-child(7) {
  width: 170px;
}

/* 8 — Действия */
.works-table th:nth-child(8),
.works-table td:nth-child(8) {
  width: 120px;
}
      .judge-preview-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
      .judge-preview-card { display: grid; gap: 6px; padding: 8px; background: rgba(255,255,255,0.9); border: 1px solid #e4e8f1; border-radius: 10px; text-align: left; color: #000; text-transform: none; letter-spacing: 0; font-family: 'Open Sans', Arial, sans-serif; }
      .judge-preview-image { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 8px; border: 1px solid #d8deea; }
      .judge-stats p { margin: 6px 0; line-height: 1.2; }
      h1, h2, h3, h4 { margin: 0; color: #281C68; font-family: "Roboto Condensed", Arial, sans-serif; letter-spacing: 0.2px; }
      strong { color: #000; }
      p, label, li, td, th, small { color: #000; }
      table { width: 100%; border-collapse: collapse; }
      td, th { border: 1px solid #e4e8f1; padding: 8px; text-align: left; }

      @media (max-width: 1024px) {
        .layout { padding: 14px; gap: 12px; }
        .card { padding: 14px; }
        .toolbar { gap: 10px; flex-wrap: wrap; }
        .row { gap: 6px; }
        table { display: block; overflow-x: auto; white-space: nowrap; }
      }

      @media (max-width: 768px) {
        .brand-logo-image { width: min(250px, 78vw); }
        .layout { padding: 10px; gap: 10px; }
        .card { padding: 12px; border-radius: 10px; }
        .toolbar { flex-direction: column; align-items: stretch; }
        .toolbar > * { width: 100%; }
        .top-logout { display: none; }
        .mobile-logout { display: block; position: sticky; bottom: 8px; z-index: 10; }
        .row { flex-direction: column; }
        .admin-table-wrap { display: none; }
        .mobile-only-list { display: grid; gap: 8px; }
        .row > * { width: 100%; }
        input, textarea, select, button { width: 100%; box-sizing: border-box; font-size: 16px; }
        .grid { grid-template-columns: 1fr; }
        .media { min-height: 180px; }
        .modal-overlay { padding: 8px; align-items: flex-end; }
        .modal { width: 100%; max-height: 92vh; border-radius: 14px 14px 0 0; }
        .image-modal { border-radius: 14px; }
        .video-modal { border-radius: 14px; }
        .video-expanded { min-height: 36vh; }
        .toast { right: 10px; left: 10px; bottom: 10px; text-align: center; }
      }
    `}</style>
  );
}
