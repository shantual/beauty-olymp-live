import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'beauty-olymp-v2';

const DEFAULT_CRITERIA = [
  { id: 'c1', title: 'Креативность', min: 1, max: 10 },
  { id: 'c2', title: 'Качество исполнения', min: 1, max: 10 },
  { id: 'c3', title: 'Техническая сложность', min: 1, max: 10 },
];

const DEFAULT_JUDGES = [
  {
    id: 'J-001',
    fullName: 'Судья Демонстрационный',
    email: 'judge@demo.local',
    login: 'judge1',
    passwordHash:
      'a5ceca62e47d0f6c0f56aa8198c75c5dc2e4f2f4903a06f5f5f7ff4f5d16fd5c',
    active: true,
  },
];

const DEFAULT_WORKS = [
  {
    id: 'EO-00001',
    contest: 'Эстетика',
    nomination: 'Маникюр',
    category: 'Мастер',
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

function createDefaultState() {
  return {
    criteria: DEFAULT_CRITERIA,
    works: DEFAULT_WORKS,
    judges: DEFAULT_JUDGES,
    assignments: [{ workId: 'EO-00001', judgeId: 'J-001', status: 'не начато', assignedAt: new Date().toISOString() }],
    scores: [],
    adminUsers: [{ login: 'admin', passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918' }],
  };
}

function parseList(value) {
  return value
    .split('\n')
    .map((v) => v.trim())
    .filter(Boolean);
}

function generateWorkId(existingWorks) {
  const next = existingWorks.length + 1;
  return `EO-${String(next).padStart(5, '0')}`;
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

export default function Dashboard() {
  const [state, setState] = useState(createDefaultState);
  const [session, setSession] = useState({ role: null, id: null, login: null });
  const [loginForm, setLoginForm] = useState({ login: '', password: '', role: 'judge' });
  const [workDraft, setWorkDraft] = useState({
    contest: 'Эстетика',
    nomination: '',
    category: 'Дебют',
    title: '',
    description: '',
    photosText: '',
    videosText: '',
    status: 'Допущено',
  });
  const [judgeDraft, setJudgeDraft] = useState({ fullName: '', email: '', login: '', password: '' });
  const [criterionTitle, setCriterionTitle] = useState('');
  const [assignmentDraft, setAssignmentDraft] = useState({ judgeId: '', workId: '' });
  const [scoreDrafts, setScoreDrafts] = useState({});
  const [importText, setImportText] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setState(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

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
        .filter(Boolean),
    [judgeAssignments, state.works]
  );

  const progress = useMemo(() => {
    const total = state.assignments.length;
    const done = state.assignments.filter((a) => a.status === 'оценено').length;
    return total ? Math.round((done / total) * 100) : 0;
  }, [state.assignments]);

  const ratings = useMemo(() => {
    const grouped = {};

    state.works.forEach((work) => {
      const scores = state.scores.filter((score) => score.workId === work.id);
      if (!scores.length) return;
      const totalAvg = scores.reduce((sum, s) => sum + s.avg, 0) / scores.length;
      const key = `${work.contest} | ${work.nomination} | ${work.category}`;
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

    return grouped;
  }, [state.scores, state.works]);

  async function login() {
    const passwordHash = await sha256(loginForm.password);

    if (loginForm.role === 'admin') {
      const admin = state.adminUsers.find((a) => a.login === loginForm.login && a.passwordHash === passwordHash);
      if (admin) {
        setSession({ role: 'admin', id: 'ADMIN', login: admin.login });
        return;
      }
    }

    if (loginForm.role === 'judge') {
      const judge = state.judges.find(
        (j) => j.login === loginForm.login && j.passwordHash === passwordHash && j.active
      );
      if (judge) {
        setSession({ role: 'judge', id: judge.id, login: judge.login });
        return;
      }
    }

    alert('Неверные данные для входа.');
  }

  function addWork() {
    const newWork = {
      id: generateWorkId(state.works),
      contest: workDraft.contest,
      nomination: workDraft.nomination,
      category: workDraft.category,
      title: workDraft.title,
      description: workDraft.description,
      photos: parseList(workDraft.photosText),
      videos: parseList(workDraft.videosText),
      status: workDraft.status,
      author: 'Скрыт',
    };

    setState((prev) => ({ ...prev, works: [...prev.works, newWork] }));
    setWorkDraft({
      contest: 'Эстетика', nomination: '', category: 'Дебют', title: '', description: '', photosText: '', videosText: '', status: 'Допущено',
    });
  }

  async function addJudge() {
    const passwordHash = await sha256(judgeDraft.password);
    const judge = {
      id: `J-${String(state.judges.length + 1).padStart(3, '0')}`,
      fullName: judgeDraft.fullName,
      email: judgeDraft.email,
      login: judgeDraft.login,
      passwordHash,
      active: true,
    };
    setState((prev) => ({ ...prev, judges: [...prev.judges, judge] }));
    setJudgeDraft({ fullName: '', email: '', login: '', password: '' });
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

    setCriterionTitle('');
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
      contest: row[0] || 'Эстетика',
      nomination: row[1] || 'Без номинации',
      category: row[2] || 'Дебют',
      title: row[3] || `Работа ${idx + 1}`,
      description: row[4] || '',
      photos: [row[5], row[6], row[7]].filter(Boolean),
      videos: [row[8]].filter(Boolean),
      status: 'Допущено',
      author: 'Скрыт',
    }));

    setState((prev) => ({ ...prev, works: [...prev.works, ...imported] }));
    setImportText('');
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
    const rows = [['WorkID', 'JudgeID', 'Comment', 'Total', 'Average', 'SubmittedAt']];
    state.scores.forEach((s) => rows.push([s.workId, s.judgeId, s.comment, s.total, s.avg, s.submittedAt]));
    downloadCsv('scores.csv', rows);
  }

  function exportRatings() {
    const rows = [['Group', 'Rank', 'WorkID', 'Title', 'Average']];
    Object.entries(ratings).forEach(([group, list]) => {
      list.forEach((entry) => rows.push([group, entry.rank, entry.workId, entry.title, entry.avg]));
    });
    downloadCsv('ratings.csv', rows);
  }

  if (!session.role) {
    return (
      <div className="layout">
        <div className="card narrow">
          <h1>Beauty Olymp — система судейства</h1>
          <p>Вход для администратора или судьи.</p>
          <select value={loginForm.role} onChange={(e) => setLoginForm((p) => ({ ...p, role: e.target.value }))}>
            <option value="judge">Судья</option>
            <option value="admin">Администратор</option>
          </select>
          <input placeholder="Логин" value={loginForm.login} onChange={(e) => setLoginForm((p) => ({ ...p, login: e.target.value }))} />
          <input type="password" placeholder="Пароль" value={loginForm.password} onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))} />
          <button onClick={login}>Войти</button>
          <small>Демо: admin/admin или judge1/password</small>
        </div>
        <Styles />
      </div>
    );
  }

  if (session.role === 'judge') {
    const done = judgeAssignments.filter((a) => a.status === 'оценено').length;
    return (
      <div className="layout">
        <div className="toolbar">
          <strong>Судья: {session.login}</strong>
          <button onClick={() => setSession({ role: null })}>Выйти</button>
        </div>
        <div className="card">
          <h2>Прогресс</h2>
          <p>Назначено: {judgeAssignments.length}</p>
          <p>Оценено: {done}</p>
          <p>Осталось: {judgeAssignments.length - done}</p>
        </div>

        {judgeWorks.map((work) => {
          const alreadyScored = state.scores.some((s) => s.workId === work.id && s.judgeId === session.id);
          return (
            <div className="card" key={work.id}>
              <h3>{work.id}</h3>
              <p>{work.contest} / {work.nomination} / {work.category}</p>
              <p>{work.description}</p>
              <div className="grid">
                {work.photos.map((photo, index) => (
                  <img key={photo} src={photo} alt={`Фото ${index + 1}`} className="media" />
                ))}
              </div>
              <div className="grid">
                {work.videos.map((video) => (
                  <iframe key={video} src={video} title={work.id} className="media" allow="autoplay; encrypted-media" />
                ))}
              </div>

              {alreadyScored ? (
                <p><strong>Оценка отправлена. Редактирование закрыто.</strong></p>
              ) : (
                <>
                  <h4>Оценка</h4>
                  {state.criteria.map((criterion) => (
                    <div key={criterion.id}>
                      <label>{criterion.title}: {scoreDrafts[work.id]?.values?.[criterion.id] ?? 1}</label>
                      <input
                        type="range"
                        min={criterion.min}
                        max={criterion.max}
                        value={scoreDrafts[work.id]?.values?.[criterion.id] ?? criterion.min}
                        onChange={(e) => setScoreValue(work.id, criterion.id, e.target.value)}
                      />
                    </div>
                  ))}
                  <textarea
                    placeholder="Обязательный комментарий судьи"
                    value={scoreDrafts[work.id]?.comment || ''}
                    onChange={(e) => setComment(work.id, e.target.value)}
                  />
                  <button onClick={() => submitScore(work.id)}>Отправить оценку</button>
                </>
              )}
            </div>
          );
        })}
        <Styles />
      </div>
    );
  }

  const notStartedJudges = state.judges.filter((judge) =>
    state.assignments.some((a) => a.judgeId === judge.id && a.status !== 'оценено')
  );

  return (
    <div className="layout">
      <div className="toolbar">
        <strong>Администратор: {session.login}</strong>
        <button onClick={() => setSession({ role: null })}>Выйти</button>
      </div>

      <div className="card">
        <h2>Дашборд</h2>
        <p>Работ: {state.works.length}</p>
        <p>Судей: {state.judges.length}</p>
        <p>Завершено назначений: {progress}%</p>
        <p>Работ без оценок: {state.works.filter((w) => !state.scores.some((s) => s.workId === w.id)).length}</p>
        <p>Судьи с незавершенными назначениями: {notStartedJudges.map((j) => j.fullName).join(', ') || 'нет'}</p>
      </div>

      <div className="card">
        <h3>Создание карточки работы</h3>
        <input placeholder="Конкурс" value={workDraft.contest} onChange={(e) => setWorkDraft((p) => ({ ...p, contest: e.target.value }))} />
        <input placeholder="Номинация" value={workDraft.nomination} onChange={(e) => setWorkDraft((p) => ({ ...p, nomination: e.target.value }))} />
        <input placeholder="Категория" value={workDraft.category} onChange={(e) => setWorkDraft((p) => ({ ...p, category: e.target.value }))} />
        <input placeholder="Название" value={workDraft.title} onChange={(e) => setWorkDraft((p) => ({ ...p, title: e.target.value }))} />
        <textarea placeholder="Описание" value={workDraft.description} onChange={(e) => setWorkDraft((p) => ({ ...p, description: e.target.value }))} />
        <textarea placeholder="Фото (по 1 ссылке на строку)" value={workDraft.photosText} onChange={(e) => setWorkDraft((p) => ({ ...p, photosText: e.target.value }))} />
        <textarea placeholder="Видео (по 1 ссылке на строку)" value={workDraft.videosText} onChange={(e) => setWorkDraft((p) => ({ ...p, videosText: e.target.value }))} />
        <button onClick={addWork}>Сохранить работу</button>
      </div>

      <div className="card">
        <h3>Импорт работ из CSV (;)</h3>
        <p>Колонки: Конкурс;Номинация;Категория;Название;Описание;Фото1;Фото2;Фото3;Видео1</p>
        <textarea rows={5} value={importText} onChange={(e) => setImportText(e.target.value)} />
        <button onClick={importWorksFromCsv}>Импортировать</button>
      </div>

      <div className="card">
        <h3>Управление критериями</h3>
        <ul>{state.criteria.map((c) => <li key={c.id}>{c.title}</li>)}</ul>
        <input value={criterionTitle} onChange={(e) => setCriterionTitle(e.target.value)} placeholder="Новый критерий" />
        <button onClick={addCriterion}>Добавить критерий</button>
      </div>

      <div className="card">
        <h3>Создание судьи</h3>
        <input placeholder="ФИО" value={judgeDraft.fullName} onChange={(e) => setJudgeDraft((p) => ({ ...p, fullName: e.target.value }))} />
        <input placeholder="Email" value={judgeDraft.email} onChange={(e) => setJudgeDraft((p) => ({ ...p, email: e.target.value }))} />
        <input placeholder="Логин" value={judgeDraft.login} onChange={(e) => setJudgeDraft((p) => ({ ...p, login: e.target.value }))} />
        <input type="password" placeholder="Пароль" value={judgeDraft.password} onChange={(e) => setJudgeDraft((p) => ({ ...p, password: e.target.value }))} />
        <button onClick={addJudge}>Добавить судью</button>
      </div>

      <div className="card">
        <h3>Назначение работ</h3>
        <select value={assignmentDraft.judgeId} onChange={(e) => setAssignmentDraft((p) => ({ ...p, judgeId: e.target.value }))}>
          <option value="">Выберите судью</option>
          {state.judges.map((judge) => <option key={judge.id} value={judge.id}>{judge.id} — {judge.fullName}</option>)}
        </select>
        <select value={assignmentDraft.workId} onChange={(e) => setAssignmentDraft((p) => ({ ...p, workId: e.target.value }))}>
          <option value="">Выберите работу</option>
          {state.works.map((work) => <option key={work.id} value={work.id}>{work.id} — {work.title}</option>)}
        </select>
        <button onClick={assignWork}>Назначить</button>
      </div>

      <div className="card">
        <h3>Рейтинг по номинациям и категориям</h3>
        {Object.entries(ratings).map(([group, list]) => (
          <div key={group}>
            <h4>{group}</h4>
            <table>
              <thead><tr><th>Место</th><th>WorkID</th><th>Название</th><th>Средний балл</th></tr></thead>
              <tbody>
                {list.map((item) => <tr key={item.workId}><td>{item.rank}</td><td>{item.workId}</td><td>{item.title}</td><td>{item.avg}</td></tr>)}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="card row">
        <button onClick={exportScores}>Экспорт всех оценок CSV</button>
        <button onClick={exportRatings}>Экспорт рейтинга CSV</button>
      </div>
      <Styles />
    </div>
  );
}

function Styles() {
  return (
    <style jsx global>{`
      body { margin: 0; font-family: Inter, Arial, sans-serif; background: #f5f7fb; }
      .layout { max-width: 1100px; margin: 0 auto; padding: 20px; display: grid; gap: 16px; }
      .card { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); display: grid; gap: 8px; }
      .narrow { max-width: 420px; margin: 40px auto; }
      .toolbar { display: flex; justify-content: space-between; align-items: center; }
      input, textarea, select, button { padding: 10px; border-radius: 8px; border: 1px solid #d8deea; font-size: 14px; }
      button { border: none; background: #3348ff; color: #fff; cursor: pointer; }
      .grid { display: grid; gap: 8px; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }
      .media { width: 100%; min-height: 140px; border-radius: 8px; border: 1px solid #d8deea; }
      .row { display: flex; gap: 8px; flex-wrap: wrap; }
      table { width: 100%; border-collapse: collapse; }
      td, th { border: 1px solid #e4e8f1; padding: 8px; text-align: left; }
      @media (max-width: 768px) { .layout { padding: 12px; } }
    `}</style>
  );
}
