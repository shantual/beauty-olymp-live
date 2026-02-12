import { useEffect, useMemo, useState } from 'react';

const CONTESTS = ['Эстетика', 'Креатив', 'Богиня', 'Империя'];
const CATEGORIES = ['Дебют', 'Мастер', 'Профи', 'Премиум'];
const ASSIGNMENT_STATUS = {
  todo: 'Не начато',
  done: 'Оценено',
};

const STORAGE_KEY = 'beauty-olymp-v2';

const defaultState = {
  judges: [
    {
      judgeId: 'J-001',
      fullName: 'Судья Демонстрационный',
      email: 'judge@example.com',
      login: 'judge1',
      passwordHash: 'demo-hash',
      active: true,
    },
  ],
  criteria: [
    { id: 'C-1', title: 'Креативность' },
    { id: 'C-2', title: 'Качество исполнения' },
    { id: 'C-3', title: 'Техническая сложность' },
  ],
  works: [
    {
      workId: 'EO-00001',
      contest: 'Эстетика',
      nomination: 'Маникюр',
      category: 'Мастер',
      title: 'Небесный блеск',
      description: 'Демонстрационная работа для проверки интерфейса.',
      photos: ['https://picsum.photos/seed/olymp1/900/600'],
      videos: ['https://www.youtube.com/embed/5qap5aO4i9A'],
      status: 'Допущено',
    },
  ],
  assignments: [
    {
      workId: 'EO-00001',
      judgeId: 'J-001',
      status: 'todo',
      assignedAt: new Date().toISOString(),
      completedAt: null,
    },
  ],
  scores: [],
};

function loadState() {
  if (typeof window === 'undefined') return defaultState;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultState;

  try {
    return JSON.parse(raw);
  } catch {
    return defaultState;
  }
}

function saveState(state) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function computeRanking(works, scores) {
  const workWithAvg = works
    .map((work) => {
      const workScores = scores.filter((score) => score.workId === work.workId);
      if (!workScores.length) return null;

      const avg =
        workScores.reduce((acc, row) => acc + row.judgeAverage, 0) / workScores.length;

      return {
        ...work,
        avg: Number(avg.toFixed(2)),
        judgesCount: workScores.length,
      };
    })
    .filter(Boolean);

  const groups = {};
  workWithAvg.forEach((work) => {
    const key = `${work.contest}||${work.nomination}||${work.category}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(work);
  });

  const ranked = [];
  Object.entries(groups).forEach(([key, values]) => {
    values.sort((a, b) => b.avg - a.avg);

    let previousAvg = null;
    let previousPlace = 0;

    values.forEach((item, index) => {
      const place = previousAvg === item.avg ? previousPlace : index + 1;
      previousAvg = item.avg;
      previousPlace = place;

      ranked.push({
        groupKey: key,
        place,
        ...item,
      });
    });
  });

  return ranked;
}

function toCsv(rows) {
  if (!rows.length) return '';

  const headers = Object.keys(rows[0]);
  const escapeCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

  return [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(',')),
  ].join('\n');
}

function downloadCsv(filename, rows) {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function parseCsv(csvText) {
  const lines = csvText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim());
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });
}

function nextWorkId(works) {
  const maxNumber = works.reduce((max, work) => {
    const digits = Number(work.workId.replace('EO-', ''));
    return Number.isNaN(digits) ? max : Math.max(max, digits);
  }, 0);

  return `EO-${String(maxNumber + 1).padStart(5, '0')}`;
}

function JudgePanel({ state, setState }) {
  const [selectedJudge, setSelectedJudge] = useState(state.judges[0]?.judgeId || '');
  const [draft, setDraft] = useState({});

  const assignments = useMemo(
    () => state.assignments.filter((a) => a.judgeId === selectedJudge),
    [state.assignments, selectedJudge],
  );

  const assignedWorks = useMemo(
    () =>
      assignments
        .map((assignment) => {
          const work = state.works.find((item) => item.workId === assignment.workId);
          return work ? { work, assignment } : null;
        })
        .filter(Boolean),
    [assignments, state.works],
  );

  const doneCount = assignments.filter((a) => a.status === 'done').length;

  function changeScore(workId, criterionId, value) {
    setDraft((prev) => ({
      ...prev,
      [workId]: {
        ...(prev[workId] || { comment: '', values: {} }),
        values: {
          ...(prev[workId]?.values || {}),
          [criterionId]: Number(value),
        },
      },
    }));
  }

  function changeComment(workId, value) {
    setDraft((prev) => ({
      ...prev,
      [workId]: {
        ...(prev[workId] || { values: {} }),
        comment: value,
      },
    }));
  }

  function submit(workId) {
    const current = draft[workId];
    if (!current?.comment?.trim()) {
      alert('Комментарий обязателен.');
      return;
    }

    const criteriaIds = state.criteria.map((c) => c.id);
    const hasAllCriteria = criteriaIds.every((id) => current.values?.[id] >= 1 && current.values?.[id] <= 10);
    if (!hasAllCriteria) {
      alert('Поставьте оценку от 1 до 10 по всем критериям.');
      return;
    }

    const values = state.criteria.map((criterion) => ({
      criterionId: criterion.id,
      criterionTitle: criterion.title,
      score: current.values[criterion.id],
    }));

    const judgeAverage = values.reduce((acc, item) => acc + item.score, 0) / values.length;

    const scoreRow = {
      workId,
      judgeId: selectedJudge,
      scores: values,
      comment: current.comment.trim(),
      judgeAverage: Number(judgeAverage.toFixed(2)),
      submittedAt: new Date().toISOString(),
      locked: true,
    };

    setState((prev) => {
      const withoutOld = prev.scores.filter(
        (item) => !(item.workId === workId && item.judgeId === selectedJudge),
      );

      return {
        ...prev,
        scores: [...withoutOld, scoreRow],
        assignments: prev.assignments.map((assignment) =>
          assignment.workId === workId && assignment.judgeId === selectedJudge
            ? { ...assignment, status: 'done', completedAt: new Date().toISOString() }
            : assignment,
        ),
      };
    });

    alert('Оценка отправлена и заблокирована для редактирования.');
  }

  return (
    <div className="space-y-5">
      <div className="card">
        <h2>Профиль судьи</h2>
        <div className="row">
          <label>Судья:</label>
          <select value={selectedJudge} onChange={(e) => setSelectedJudge(e.target.value)}>
            {state.judges
              .filter((judge) => judge.active)
              .map((judge) => (
                <option key={judge.judgeId} value={judge.judgeId}>
                  {judge.fullName} ({judge.judgeId})
                </option>
              ))}
          </select>
        </div>
        <p>
          Назначено: <b>{assignments.length}</b> | Оценено: <b>{doneCount}</b> | Осталось:{' '}
          <b>{assignments.length - doneCount}</b>
        </p>
      </div>

      {assignedWorks.map(({ work, assignment }) => {
        const locked = assignment.status === 'done';

        return (
          <div key={work.workId} className="card">
            <div className="work-head">
              <h3>{work.workId}</h3>
              <span className="badge">{ASSIGNMENT_STATUS[assignment.status]}</span>
            </div>
            <p>
              <b>Конкурс:</b> {work.contest} / <b>Номинация:</b> {work.nomination} / <b>Категория:</b>{' '}
              {work.category}
            </p>
            <p>{work.description}</p>

            <div className="media-grid">
              {work.photos.map((url, index) => (
                <a key={`${work.workId}-photo-${index}`} href={url} target="_blank" rel="noreferrer">
                  <img src={url} alt={`${work.workId}-photo-${index + 1}`} />
                </a>
              ))}
            </div>

            <div className="media-grid video-grid">
              {work.videos.map((url, index) => (
                <iframe
                  key={`${work.workId}-video-${index}`}
                  src={url}
                  title={`${work.workId}-video-${index + 1}`}
                  allowFullScreen
                />
              ))}
            </div>

            <div className="criteria-grid">
              {state.criteria.map((criterion) => (
                <label key={criterion.id}>
                  <span>{criterion.title}</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    disabled={locked}
                    value={draft[work.workId]?.values?.[criterion.id] || ''}
                    onChange={(e) => changeScore(work.workId, criterion.id, e.target.value)}
                  />
                </label>
              ))}
            </div>

            <textarea
              disabled={locked}
              placeholder="Обязательный комментарий"
              value={draft[work.workId]?.comment || ''}
              onChange={(e) => changeComment(work.workId, e.target.value)}
            />

            <button disabled={locked} onClick={() => submit(work.workId)}>
              {locked ? 'Уже оценено' : 'Отправить оценку'}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function AdminPanel({ state, setState }) {
  const [workForm, setWorkForm] = useState({
    contest: CONTESTS[0],
    nomination: '',
    category: CATEGORIES[0],
    title: '',
    description: '',
    photos: '',
    videos: '',
    status: 'Допущено',
  });
  const [judgeForm, setJudgeForm] = useState({
    fullName: '',
    email: '',
    login: '',
    password: '',
  });
  const [criterionTitle, setCriterionTitle] = useState('');

  const ranking = useMemo(() => computeRanking(state.works, state.scores), [state.works, state.scores]);
  const totalAssignments = state.assignments.length;
  const doneAssignments = state.assignments.filter((a) => a.status === 'done').length;

  function addWorkFromForm() {
    if (!workForm.nomination.trim()) {
      alert('Номинация обязательна.');
      return;
    }

    const work = {
      workId: nextWorkId(state.works),
      contest: workForm.contest,
      nomination: workForm.nomination.trim(),
      category: workForm.category,
      title: workForm.title.trim() || 'Без названия',
      description: workForm.description.trim(),
      photos: workForm.photos
        .split('\n')
        .map((url) => url.trim())
        .filter(Boolean),
      videos: workForm.videos
        .split('\n')
        .map((url) => url.trim())
        .filter(Boolean),
      status: workForm.status,
    };

    setState((prev) => ({ ...prev, works: [...prev.works, work] }));
    setWorkForm((prev) => ({ ...prev, nomination: '', title: '', description: '', photos: '', videos: '' }));
  }

  function importCsv(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCsv(String(reader.result || ''));
      if (!rows.length) {
        alert('Файл пустой или неверного формата.');
        return;
      }

      setState((prev) => {
        const nextWorks = [...prev.works];

        rows.forEach((row) => {
          const work = {
            workId: nextWorkId(nextWorks),
            contest: row['конкурс'] || CONTESTS[0],
            nomination: row['номинация'] || 'Без номинации',
            category: row['категория'] || CATEGORIES[0],
            title: row['название'] || 'Без названия',
            description: row['описание'] || '',
            photos: [row['фото1'], row['фото2'], row['фото3']].filter(Boolean),
            videos: [row['видео1']].filter(Boolean),
            status: 'Допущено',
          };
          nextWorks.push(work);
        });

        return { ...prev, works: nextWorks };
      });

      alert(`Импортировано строк: ${rows.length}`);
    };
    reader.readAsText(file, 'utf-8');
  }

  function addJudge() {
    if (!judgeForm.fullName || !judgeForm.login || !judgeForm.password) {
      alert('Для судьи обязательны ФИО, логин и пароль.');
      return;
    }

    setState((prev) => ({
      ...prev,
      judges: [
        ...prev.judges,
        {
          judgeId: `J-${String(prev.judges.length + 1).padStart(3, '0')}`,
          fullName: judgeForm.fullName,
          email: judgeForm.email,
          login: judgeForm.login,
          passwordHash: `hash:${judgeForm.password}`,
          active: true,
        },
      ],
    }));

    setJudgeForm({ fullName: '', email: '', login: '', password: '' });
  }

  function addCriterion() {
    if (!criterionTitle.trim()) return;

    setState((prev) => ({
      ...prev,
      criteria: [
        ...prev.criteria,
        { id: `C-${prev.criteria.length + 1}`, title: criterionTitle.trim() },
      ],
    }));

    setCriterionTitle('');
  }

  function assignWork(workId, judgeId) {
    setState((prev) => {
      const exists = prev.assignments.some((a) => a.workId === workId && a.judgeId === judgeId);
      if (exists) return prev;

      return {
        ...prev,
        assignments: [
          ...prev.assignments,
          {
            workId,
            judgeId,
            status: 'todo',
            assignedAt: new Date().toISOString(),
            completedAt: null,
          },
        ],
      };
    });
  }

  function exportScores() {
    const rows = state.scores.map((score) => {
      const row = {
        workId: score.workId,
        judgeId: score.judgeId,
        comment: score.comment,
        judgeAverage: score.judgeAverage,
        submittedAt: score.submittedAt,
      };

      score.scores.forEach((criterion) => {
        row[`criterion:${criterion.criterionTitle}`] = criterion.score;
      });

      return row;
    });

    downloadCsv('all-scores.csv', rows);
  }

  function exportRanking() {
    const rows = ranking.map((item) => ({
      contest: item.contest,
      nomination: item.nomination,
      category: item.category,
      place: item.place,
      workId: item.workId,
      title: item.title,
      average: item.avg,
      judges: item.judgesCount,
    }));

    downloadCsv('ranking.csv', rows);
  }

  return (
    <div className="space-y-5">
      <div className="card">
        <h2>Дашборд администратора</h2>
        <p>
          Работ: <b>{state.works.length}</b> | Судей: <b>{state.judges.length}</b> | Завершено назначений:{' '}
          <b>{totalAssignments ? Math.round((doneAssignments / totalAssignments) * 100) : 0}%</b>
        </p>
        <p>
          Без оценок: <b>{state.works.filter((work) => !state.scores.some((s) => s.workId === work.workId)).length}</b>
        </p>
      </div>

      <div className="card">
        <h3>Добавить работу вручную</h3>
        <div className="form-grid">
          <select value={workForm.contest} onChange={(e) => setWorkForm({ ...workForm, contest: e.target.value })}>
            {CONTESTS.map((contest) => (
              <option key={contest}>{contest}</option>
            ))}
          </select>
          <input
            placeholder="Номинация"
            value={workForm.nomination}
            onChange={(e) => setWorkForm({ ...workForm, nomination: e.target.value })}
          />
          <select value={workForm.category} onChange={(e) => setWorkForm({ ...workForm, category: e.target.value })}>
            {CATEGORIES.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
          <input
            placeholder="Название"
            value={workForm.title}
            onChange={(e) => setWorkForm({ ...workForm, title: e.target.value })}
          />
          <textarea
            placeholder="Описание"
            value={workForm.description}
            onChange={(e) => setWorkForm({ ...workForm, description: e.target.value })}
          />
          <textarea
            placeholder="Фото-ссылки (по одной на строку)"
            value={workForm.photos}
            onChange={(e) => setWorkForm({ ...workForm, photos: e.target.value })}
          />
          <textarea
            placeholder="Видео-ссылки (iframe src, по одной на строку)"
            value={workForm.videos}
            onChange={(e) => setWorkForm({ ...workForm, videos: e.target.value })}
          />
        </div>
        <button onClick={addWorkFromForm}>Сохранить карточку</button>
      </div>

      <div className="card">
        <h3>Импорт работ из CSV</h3>
        <p className="hint">Колонки: Конкурс, Номинация, Категория, Название, Описание, Фото1, Фото2, Фото3, Видео1</p>
        <input type="file" accept=".csv" onChange={(e) => importCsv(e.target.files?.[0])} />
      </div>

      <div className="card">
        <h3>Судьи и критерии</h3>
        <div className="form-grid">
          <input
            placeholder="ФИО"
            value={judgeForm.fullName}
            onChange={(e) => setJudgeForm({ ...judgeForm, fullName: e.target.value })}
          />
          <input
            placeholder="Email"
            value={judgeForm.email}
            onChange={(e) => setJudgeForm({ ...judgeForm, email: e.target.value })}
          />
          <input
            placeholder="Логин"
            value={judgeForm.login}
            onChange={(e) => setJudgeForm({ ...judgeForm, login: e.target.value })}
          />
          <input
            placeholder="Пароль"
            type="password"
            value={judgeForm.password}
            onChange={(e) => setJudgeForm({ ...judgeForm, password: e.target.value })}
          />
        </div>
        <button onClick={addJudge}>Добавить судью</button>

        <div className="row mt">
          <input
            placeholder="Новый критерий"
            value={criterionTitle}
            onChange={(e) => setCriterionTitle(e.target.value)}
          />
          <button onClick={addCriterion}>Добавить критерий</button>
        </div>
      </div>

      <div className="card">
        <h3>Назначения</h3>
        {state.works.map((work) => (
          <div key={work.workId} className="row">
            <span>
              {work.workId} · {work.nomination} · {work.category}
            </span>
            <div className="row">
              {state.judges
                .filter((judge) => judge.active)
                .map((judge) => (
                  <button key={`${work.workId}-${judge.judgeId}`} onClick={() => assignWork(work.workId, judge.judgeId)}>
                    + {judge.judgeId}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Рейтинг по номинациям и категориям</h3>
        <table>
          <thead>
            <tr>
              <th>Место</th>
              <th>WorkID</th>
              <th>Конкурс</th>
              <th>Номинация</th>
              <th>Категория</th>
              <th>Средний балл</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((row) => (
              <tr key={`${row.groupKey}-${row.workId}`}>
                <td>{row.place}</td>
                <td>{row.workId}</td>
                <td>{row.contest}</td>
                <td>{row.nomination}</td>
                <td>{row.category}</td>
                <td>{row.avg}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="row mt">
          <button onClick={exportScores}>Экспорт всех оценок (CSV)</button>
          <button onClick={exportRanking}>Экспорт рейтинга (CSV)</button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [state, setState] = useState(defaultState);
  const [role, setRole] = useState('admin');

  useEffect(() => {
    setState(loadState());
  }, []);

  useEffect(() => {
    saveState(state);
  }, [state]);

  return (
    <main>
      <header>
        <h1>Система анонимного судейства</h1>
        <div className="row">
          <button onClick={() => setRole('admin')} className={role === 'admin' ? 'active' : ''}>
            Администратор
          </button>
          <button onClick={() => setRole('judge')} className={role === 'judge' ? 'active' : ''}>
            Судья
          </button>
        </div>
      </header>

      {role === 'admin' ? <AdminPanel state={state} setState={setState} /> : <JudgePanel state={state} setState={setState} />}

      <style jsx>{`
        main { max-width: 1100px; margin: 0 auto; padding: 24px; font-family: Arial, sans-serif; }
        header { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; gap:16px; flex-wrap: wrap; }
        .space-y-5 > :global(*) + :global(*) { margin-top: 16px; }
        .card { border:1px solid #ddd; border-radius:12px; padding:16px; background:#fff; }
        h1,h2,h3 { margin: 0 0 10px; }
        .row { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
        .work-head { display:flex; justify-content:space-between; align-items:center; }
        .badge { background:#eef; border-radius:999px; padding:4px 10px; font-size:12px; }
        .media-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap:8px; margin:10px 0; }
        .media-grid img { width:100%; height:120px; object-fit:cover; border-radius:8px; }
        .video-grid iframe { width:100%; min-height:180px; border:0; border-radius:8px; }
        .criteria-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(180px,1fr)); gap:8px; margin:8px 0; }
        .criteria-grid label { display:flex; flex-direction:column; gap:4px; }
        input,select,textarea,button { border-radius:8px; border:1px solid #ccc; padding:8px 10px; }
        button { cursor:pointer; background:#f4f4f4; }
        button.active { background:#111; color:#fff; }
        button:disabled { opacity: .55; cursor: not-allowed; }
        .form-grid { display:grid; gap:8px; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); margin-bottom:10px; }
        textarea { min-height:80px; width:100%; }
        table { width:100%; border-collapse: collapse; font-size:14px; }
        th,td { border:1px solid #ddd; padding:8px; text-align:left; }
        .hint { color:#666; font-size:13px; }
        .mt { margin-top: 10px; }
        @media (max-width: 780px) {
          main { padding: 14px; }
          .video-grid iframe { min-height:130px; }
        }
      `}</style>
    </main>
  );
}
