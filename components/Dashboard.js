
// Расширенная версия приложения с поддержкой ролей: судья, участник, организатор

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Dashboard({ role = 'judge' }) {
  const [works, setWorks] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [scores, setScores] = useState({});
  const [nominations, setNominations] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (role === 'judge') {
      fetchWorks();
      fetchCriteria();
    }
    if (role === 'organizer') {
      fetchNominations();
      fetchCategories();
    }
  }, [role]);

  async function fetchWorks() {
    const { data } = await supabase.from('works').select('*');
    setWorks(data);
  }

  async function fetchCriteria() {
    const { data } = await supabase.from('criteria').select('*');
    setCriteria(data);
  }

  async function fetchNominations() {
    const { data } = await supabase.from('nominations').select('*');
    setNominations(data);
  }

  async function fetchCategories() {
    const { data } = await supabase.from('categories').select('*');
    setCategories(data);
  }

  function handleScoreChange(workId, criterionId, value) {
    setScores(prev => ({
      ...prev,
      [workId]: {
        ...(prev[workId] || {}),
        [criterionId]: Number(value),
      }
    }));
  }

  async function submitScores(workId) {
    const judgeId = 'judge_1'; // временно хардкод
    const entries = Object.entries(scores[workId] || {});

    for (let [criterionId, score] of entries) {
      await supabase.from('scores').insert({
        work_id: workId,
        judge_id: judgeId,
        criterion_id: criterionId,
        score
      });
    }
    alert('Оценки отправлены!');
  }

  if (role === 'participant') {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold">Личный кабинет участника</h1>
        <p className="mt-4">Загрузка работ будет доступна в следующей версии.</p>
      </div>
    );
  }

  if (role === 'organizer') {
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-2xl font-bold">Панель организатора</h1>
        <h2 className="text-xl font-semibold">Номинации</h2>
        <ul className="list-disc list-inside">
          {nominations.map(n => <li key={n.id}>{n.title}</li>)}
        </ul>
        <h2 className="text-xl font-semibold">Категории</h2>
        <ul className="list-disc list-inside">
          {categories.map(c => <li key={c.id}>{c.title}</li>)}
        </ul>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Судейская панель</h1>
      {works.map(work => (
        <div key={work.id} className="border p-4 rounded-xl shadow">
          <h2 className="text-xl font-semibold">{work.title}</h2>
          <img src={work.file_url} alt={work.title} className="w-48 my-2" />
          <div className="grid grid-cols-3 gap-4">
            {criteria.map(crit => (
              <div key={crit.id}>
                <label>{crit.title}</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={scores[work.id]?.[crit.id] || ''}
                  onChange={e => handleScoreChange(work.id, crit.id, e.target.value)}
                  className="border p-1 rounded w-full"
                />
              </div>
            ))}
          </div>
          <button
            onClick={() => submitScores(work.id)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
          >
            Отправить оценки
          </button>
        </div>
      ))}
    </div>
  );
}
