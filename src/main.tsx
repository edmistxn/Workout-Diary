import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

type Exercise = { id: string; name: string; sets: number; weight: number; min: number; max: number };
type Workout = { id: string; name: string; exercises: Exercise[] };
type Program = { name: string; workouts: Workout[] };
type SetResult = { weight: number; reps: number; rir: number; done: boolean };
type HistoryItem = { date: string; workout: string; sets: SetResult[][] };

const uid = () => Math.random().toString(36).slice(2, 10);
const loadProgram = (): Program | null => { try { return JSON.parse(localStorage.getItem('program') || 'null'); } catch { return null; } };
const saveProgram = (program: Program) => localStorage.setItem('program', JSON.stringify(program));

function App() {
  const [program, setProgram] = useState<Program | null>(loadProgram);
  const [active, setActive] = useState(0);
  const [session, setSession] = useState(false);
  const [editing, setEditing] = useState(false);

  const commit = (next: Program) => { saveProgram(next); setProgram(next); setEditing(false); };
  if (!program || editing) return <ProgramBuilder initial={program} onSave={commit} onCancel={program ? () => setEditing(false) : undefined} />;

  const workout = program.workouts[active % program.workouts.length];
  if (session) return <Session workout={workout} onFinish={() => { setSession(false); setActive(v => (v + 1) % program.workouts.length); }} onCancel={() => setSession(false)} />;

  return <main>
    <header className="top"><div><small>АКТИВНАЯ ПРОГРАММА</small><h1>{program.name}</h1></div><button className="iconButton" onClick={() => setEditing(true)}>Изменить</button></header>
    <section className="hero"><small>СЛЕДУЮЩАЯ ТРЕНИРОВКА</small><h2>{workout.name}</h2><p>{workout.exercises.length} упражнений · {workout.exercises.reduce((sum, e) => sum + e.sets, 0)} подходов</p><button onClick={() => setSession(true)}>Начать тренировку</button></section>
    <h3>Программа</h3>
    {program.workouts.map((w, i) => <section key={w.id} className={i === active ? 'activeCard' : ''}><div className="sectionTitle"><div><small>ТРЕНИРОВКА {i + 1}</small><h2>{w.name}</h2></div>{i === active && <span className="badge">Следующая</span>}</div>{w.exercises.map(e => <div className="exercise" key={e.id}><b>{e.name}</b><span>{e.sets} × {e.min}–{e.max} · {e.weight} кг</span></div>)}</section>)}
  </main>;
}

function ProgramBuilder({ initial, onSave, onCancel }: { initial: Program | null; onSave: (p: Program) => void; onCancel?: () => void }) {
  const [name, setName] = useState(initial?.name || '');
  const [workouts, setWorkouts] = useState<Workout[]>(initial?.workouts || []);
  const valid = name.trim() && workouts.length > 0 && workouts.every(w => w.name.trim() && w.exercises.length > 0 && w.exercises.every(e => e.name.trim() && e.sets > 0 && e.min > 0 && e.max >= e.min));
  const updateWorkout = (id: string, next: Workout) => setWorkouts(ws => ws.map(w => w.id === id ? next : w));

  return <main>
    <header className="top"><div><small>{initial ? 'РЕДАКТИРОВАНИЕ' : 'НОВАЯ ПРОГРАММА'}</small><h1>{initial ? 'Программа' : 'Создайте программу'}</h1></div>{onCancel && <button className="iconButton" onClick={onCancel}>Готово</button>}</header>
    <label className="field"><span>Название программы</span><input placeholder="Например: Push / Pull / Legs" value={name} onChange={e => setName(e.target.value)} /></label>
    <div className="builderHeader"><h3>Тренировки</h3><span>{workouts.length}</span></div>
    {workouts.map((w, index) => <WorkoutEditor key={w.id} index={index} workout={w} onChange={next => updateWorkout(w.id, next)} onDelete={() => setWorkouts(ws => ws.filter(x => x.id !== w.id))} />)}
    <button className="secondary" onClick={() => setWorkouts(ws => [...ws, { id: uid(), name: '', exercises: [] }])}>+ Добавить тренировку</button>
    <button disabled={!valid} onClick={() => onSave({ name: name.trim(), workouts })}>{initial ? 'Сохранить изменения' : 'Начать программу'}</button>
    {!valid && <p className="hint">У каждой тренировки должно быть название и хотя бы одно упражнение.</p>}
  </main>;
}

function WorkoutEditor({ workout, index, onChange, onDelete }: { workout: Workout; index: number; onChange: (w: Workout) => void; onDelete: () => void }) {
  const addExercise = () => onChange({ ...workout, exercises: [...workout.exercises, { id: uid(), name: '', sets: 3, weight: 0, min: 8, max: 12 }] });
  const updateExercise = (id: string, patch: Partial<Exercise>) => onChange({ ...workout, exercises: workout.exercises.map(e => e.id === id ? { ...e, ...patch } : e) });
  return <section className="editorCard">
    <div className="sectionTitle"><small>ТРЕНИРОВКА {index + 1}</small><button className="textDanger" onClick={onDelete}>Удалить</button></div>
    <label className="field"><span>Название</span><input placeholder="Например: Upper A" value={workout.name} onChange={e => onChange({ ...workout, name: e.target.value })} /></label>
    {workout.exercises.map((e, i) => <div className="exerciseEditor" key={e.id}>
      <div className="exerciseEditorTitle"><b>{i + 1}. Упражнение</b><button className="remove" onClick={() => onChange({ ...workout, exercises: workout.exercises.filter(x => x.id !== e.id) })}>×</button></div>
      <input placeholder="Название упражнения" value={e.name} onChange={ev => updateExercise(e.id, { name: ev.target.value })} />
      <div className="numbers"><NumberField label="Подходы" value={e.sets} onChange={v => updateExercise(e.id, { sets: v })} /><NumberField label="Вес, кг" value={e.weight} step="0.5" onChange={v => updateExercise(e.id, { weight: v })} /><NumberField label="Повт. от" value={e.min} onChange={v => updateExercise(e.id, { min: v })} /><NumberField label="до" value={e.max} onChange={v => updateExercise(e.id, { max: v })} /></div>
    </div>)}
    <button className="secondary compact" onClick={addExercise}>+ Добавить упражнение</button>
  </section>;
}

function NumberField({ label, value, onChange, step = '1' }: { label: string; value: number; onChange: (v: number) => void; step?: string }) {
  return <label className="field smallField"><span>{label}</span><input type="number" inputMode="decimal" min="0" step={step} value={value} onChange={e => onChange(Number(e.target.value))} /></label>;
}

function Session({ workout, onFinish, onCancel }: { workout: Workout; onFinish: () => void; onCancel: () => void }) {
  const [data, setData] = useState<SetResult[][]>(() => workout.exercises.map(e => Array.from({ length: e.sets }, () => ({ weight: e.weight, reps: e.min, rir: 2, done: false }))));
  const completed = useMemo(() => data.flat().filter(s => s.done).length, [data]);
  const total = data.flat().length;
  const update = (ei: number, si: number, patch: Partial<SetResult>) => setData(current => current.map((sets, a) => sets.map((set, b) => a === ei && b === si ? { ...set, ...patch } : set)));
  return <main>
    <header className="top"><div><small>ТРЕНИРОВКА</small><h1>{workout.name}</h1></div><button className="iconButton" onClick={onCancel}>Закрыть</button></header>
    <div className="progress"><span style={{ width: `${total ? completed / total * 100 : 0}%` }} /></div><p className="muted">{completed} из {total} подходов выполнено</p>
    {workout.exercises.map((e, ei) => <section key={e.id}><h2>{e.name}</h2><p className="muted">Цель: {e.sets} × {e.min}–{e.max} · {e.weight} кг</p><div className="labels"><span>№</span><span>кг</span><span>повт.</span><span>RIR</span><span></span></div>{data[ei].map((s, si) => <div className="set" key={si}><span>{si + 1}</span><input type="number" value={s.weight} step="0.5" onChange={ev => update(ei, si, { weight: Number(ev.target.value) })} /><input type="number" value={s.reps} onChange={ev => update(ei, si, { reps: Number(ev.target.value) })} /><input type="number" value={s.rir} onChange={ev => update(ei, si, { rir: Number(ev.target.value) })} /><button className={s.done ? 'check ok' : 'check'} onClick={() => update(ei, si, { done: !s.done })}>{s.done ? '✓' : '○'}</button></div>)}</section>)}
    <button onClick={() => { const history: HistoryItem[] = JSON.parse(localStorage.getItem('history') || '[]'); history.unshift({ date: new Date().toISOString(), workout: workout.name, sets: data }); localStorage.setItem('history', JSON.stringify(history)); onFinish(); }}>Завершить тренировку</button>
  </main>;
}

createRoot(document.getElementById('root')!).render(<App />);
