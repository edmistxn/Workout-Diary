import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

type Exercise = { id: string; name: string; sets: number; weight: number; min: number; max: number };
type Workout = { id: string; name: string; exercises: Exercise[] };
type Program = { name: string; workouts: Workout[] };
type SetResult = { weight: number; reps: number; rir: number; done: boolean };
type HistoryExercise = { exerciseId: string; name: string; sets: SetResult[] };
type HistoryItem = { id: string; date: string; workoutId: string; workout: string; exercises: HistoryExercise[] };

const uid = () => Math.random().toString(36).slice(2, 10);
const read = <T,>(key: string, fallback: T): T => { try { return JSON.parse(localStorage.getItem(key) || '') as T; } catch { return fallback; } };
const loadProgram = () => read<Program | null>('program', null);
const loadHistory = () => read<HistoryItem[]>('history', []);
const saveProgram = (p: Program) => localStorage.setItem('program', JSON.stringify(p));
const fmtDate = (iso: string) => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

function App() {
  const [program, setProgram] = useState<Program | null>(loadProgram);
  const [history, setHistory] = useState<HistoryItem[]>(loadHistory);
  const [active, setActive] = useState(() => Number(localStorage.getItem('activeWorkout') || 0));
  const [view, setView] = useState<'today'|'history'>('today');
  const [session, setSession] = useState(false);
  const [editing, setEditing] = useState(false);
  const commit = (next: Program) => { saveProgram(next); setProgram(next); setEditing(false); };
  if (!program || editing) return <ProgramBuilder initial={program} onSave={commit} onCancel={program ? () => setEditing(false) : undefined} />;
  const workout = program.workouts[active % program.workouts.length];
  const finish = (item: HistoryItem) => { const nextHistory=[item,...history]; setHistory(nextHistory); localStorage.setItem('history',JSON.stringify(nextHistory)); const next=(active+1)%program.workouts.length; setActive(next); localStorage.setItem('activeWorkout',String(next)); setSession(false); };
  if (session) return <Session workout={workout} history={history} onFinish={finish} onCancel={() => setSession(false)} />;
  return <main>
    <header className="top"><div><small>АКТИВНАЯ ПРОГРАММА</small><h1>{program.name}</h1></div><button className="iconButton" onClick={() => setEditing(true)}>Изменить</button></header>
    <nav className="tabs"><button className={view==='today'?'selected':''} onClick={()=>setView('today')}>Сегодня</button><button className={view==='history'?'selected':''} onClick={()=>setView('history')}>История</button></nav>
    {view==='today' ? <>
      <section className="hero"><small>СЛЕДУЮЩАЯ ТРЕНИРОВКА</small><h2>{workout.name}</h2><p>{workout.exercises.length} упражнений · {workout.exercises.reduce((s,e)=>s+e.sets,0)} подходов</p><button onClick={()=>setSession(true)}>Начать тренировку</button></section>
      <h3>Программа</h3>{program.workouts.map((w,i)=><section key={w.id} className={i===active?'activeCard':''}><div className="sectionTitle"><div><small>ТРЕНИРОВКА {i+1}</small><h2>{w.name}</h2></div>{i===active&&<span className="badge">Следующая</span>}</div>{w.exercises.map(e=><div className="exercise" key={e.id}><b>{e.name}</b><span>{e.sets} × {e.min}–{e.max} · {e.weight} кг</span></div>)}</section>)}
    </> : <History history={history} />}
  </main>;
}

function ProgramBuilder({ initial, onSave, onCancel }: { initial: Program | null; onSave: (p: Program) => void; onCancel?: () => void }) {
  const [name,setName]=useState(initial?.name||''); const [workouts,setWorkouts]=useState<Workout[]>(initial?.workouts||[]);
  const valid=!!name.trim()&&workouts.length>0&&workouts.every(w=>w.name.trim()&&w.exercises.length>0&&w.exercises.every(e=>e.name.trim()&&e.sets>0&&e.min>0&&e.max>=e.min));
  return <main><header className="top"><div><small>{initial?'РЕДАКТИРОВАНИЕ':'НОВАЯ ПРОГРАММА'}</small><h1>{initial?'Программа':'Создайте программу'}</h1></div>{onCancel&&<button className="iconButton" onClick={onCancel}>Готово</button>}</header>
    <label className="field"><span>Название программы</span><input placeholder="Например: Push / Pull / Legs" value={name} onChange={e=>setName(e.target.value)}/></label><div className="builderHeader"><h3>Тренировки</h3><span>{workouts.length}</span></div>
    {workouts.map((w,index)=><WorkoutEditor key={w.id} index={index} workout={w} onChange={n=>setWorkouts(ws=>ws.map(x=>x.id===w.id?n:x))} onDelete={()=>setWorkouts(ws=>ws.filter(x=>x.id!==w.id))}/>)}
    <button className="secondary" onClick={()=>setWorkouts(ws=>[...ws,{id:uid(),name:'',exercises:[]}])}>+ Добавить тренировку</button><button disabled={!valid} onClick={()=>onSave({name:name.trim(),workouts})}>{initial?'Сохранить изменения':'Начать программу'}</button>{!valid&&<p className="hint">У каждой тренировки должно быть название и хотя бы одно упражнение.</p>}
  </main>;
}
function WorkoutEditor({workout,index,onChange,onDelete}:{workout:Workout;index:number;onChange:(w:Workout)=>void;onDelete:()=>void}) { const upd=(id:string,p:Partial<Exercise>)=>onChange({...workout,exercises:workout.exercises.map(e=>e.id===id?{...e,...p}:e)}); return <section className="editorCard"><div className="sectionTitle"><small>ТРЕНИРОВКА {index+1}</small><button className="textDanger" onClick={onDelete}>Удалить</button></div><label className="field"><span>Название</span><input placeholder="Например: Upper A" value={workout.name} onChange={e=>onChange({...workout,name:e.target.value})}/></label>{workout.exercises.map((e,i)=><div className="exerciseEditor" key={e.id}><div className="exerciseEditorTitle"><b>{i+1}. Упражнение</b><button className="remove" onClick={()=>onChange({...workout,exercises:workout.exercises.filter(x=>x.id!==e.id)})}>×</button></div><input placeholder="Название упражнения" value={e.name} onChange={v=>upd(e.id,{name:v.target.value})}/><div className="numbers"><NumberField label="Подходы" value={e.sets} onChange={v=>upd(e.id,{sets:v})}/><NumberField label="Вес, кг" value={e.weight} step="0.5" onChange={v=>upd(e.id,{weight:v})}/><NumberField label="Повт. от" value={e.min} onChange={v=>upd(e.id,{min:v})}/><NumberField label="до" value={e.max} onChange={v=>upd(e.id,{max:v})}/></div></div>)}<button className="secondary compact" onClick={()=>onChange({...workout,exercises:[...workout.exercises,{id:uid(),name:'',sets:3,weight:0,min:8,max:12}]})}>+ Добавить упражнение</button></section> }
function NumberField({label,value,onChange,step='1'}:{label:string;value:number;onChange:(v:number)=>void;step?:string}) { return <label className="field smallField"><span>{label}</span><input type="number" inputMode="decimal" min="0" step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/></label> }

function Session({workout,history,onFinish,onCancel}:{workout:Workout;history:HistoryItem[];onFinish:(h:HistoryItem)=>void;onCancel:()=>void}) {
  const previous=history.find(h=>h.workoutId===workout.id);
  const [data,setData]=useState<SetResult[][]>(()=>workout.exercises.map(e=>{const prev=previous?.exercises.find(x=>x.exerciseId===e.id)?.sets; return Array.from({length:e.sets},(_,i)=>({weight:prev?.[i]?.weight??e.weight,reps:prev?.[i]?.reps??e.min,rir:prev?.[i]?.rir??2,done:false}))}));
  const [seconds,setSeconds]=useState(0); const [running,setRunning]=useState(false);
  useEffect(()=>{if(!running)return;const id=window.setInterval(()=>setSeconds(s=>s+1),1000);return()=>clearInterval(id)},[running]);
  const completed=useMemo(()=>data.flat().filter(s=>s.done).length,[data]); const total=data.flat().length;
  const update=(ei:number,si:number,p:Partial<SetResult>)=>setData(c=>c.map((ss,a)=>ss.map((s,b)=>a===ei&&b===si?{...s,...p}:s)));
  const toggle=(ei:number,si:number)=>{const now=!data[ei][si].done;update(ei,si,{done:now});if(now){setSeconds(0);setRunning(true)}};
  const addSet=(ei:number)=>setData(c=>c.map((ss,i)=>i===ei?[...ss,{...(ss.at(-1)||{weight:workout.exercises[ei].weight,reps:workout.exercises[ei].min,rir:2}),done:false}]:ss));
  const removeSet=(ei:number)=>setData(c=>c.map((ss,i)=>i===ei&&ss.length>1?ss.slice(0,-1):ss));
  return <main><header className="top"><div><small>ТРЕНИРОВКА</small><h1>{workout.name}</h1></div><button className="iconButton" onClick={onCancel}>Закрыть</button></header><div className="sessionMeta"><div><b>{completed}/{total}</b><span> подходов</span></div><button className="timer" onClick={()=>setRunning(r=>!r)}>{String(Math.floor(seconds/60)).padStart(2,'0')}:{String(seconds%60).padStart(2,'0')} {running?'Ⅱ':'▶'}</button></div><div className="progress"><span style={{width:`${total?completed/total*100:0}%`}}/></div>
    {workout.exercises.map((e,ei)=>{const prev=previous?.exercises.find(x=>x.exerciseId===e.id);return <section key={e.id}><h2>{e.name}</h2><p className="muted">Цель: {e.sets} × {e.min}–{e.max} · {e.weight} кг</p>{prev&&<p className="previous">Прошлый раз: {prev.sets.filter(s=>s.done).map(s=>`${s.weight}×${s.reps}`).join(' · ')}</p>}<div className="labels"><span>№</span><span>кг</span><span>повт.</span><span>RIR</span><span></span></div>{data[ei].map((s,si)=><div className={`set ${s.done?'doneSet':''}`} key={si}><span>{si+1}</span><input type="number" value={s.weight} step="0.5" onChange={v=>update(ei,si,{weight:Number(v.target.value)})}/><input type="number" value={s.reps} onChange={v=>update(ei,si,{reps:Number(v.target.value)})}/><input type="number" min="0" max="10" value={s.rir} onChange={v=>update(ei,si,{rir:Number(v.target.value)})}/><button className={s.done?'check ok':'check'} onClick={()=>toggle(ei,si)}>{s.done?'✓':'○'}</button></div>)}<div className="setActions"><button className="secondary compact" onClick={()=>addSet(ei)}>+ Подход</button><button className="secondary compact" onClick={()=>removeSet(ei)} disabled={data[ei].length<=1}>− Подход</button></div></section>})}
    <button onClick={()=>onFinish({id:uid(),date:new Date().toISOString(),workoutId:workout.id,workout:workout.name,exercises:workout.exercises.map((e,i)=>({exerciseId:e.id,name:e.name,sets:data[i]}))})}>Завершить тренировку</button></main>;
}

function History({history}:{history:HistoryItem[]}) { const [open,setOpen]=useState<string|null>(history[0]?.id||null); if(!history.length)return <section className="empty"><h2>История пока пустая</h2><p className="muted">Завершённые тренировки появятся здесь.</p></section>; return <div>{history.map(h=><section key={h.id}><button className="historyHead" onClick={()=>setOpen(open===h.id?null:h.id)}><span><small>{fmtDate(h.date)}</small><b>{h.workout}</b></span><span>{h.exercises.reduce((n,e)=>n+e.sets.filter(s=>s.done).length,0)} подходов</span></button>{open===h.id&&<div className="historyBody">{h.exercises.map(e=><div className="historyExercise" key={e.exerciseId}><b>{e.name}</b><span>{e.sets.filter(s=>s.done).map(s=>`${s.weight} кг × ${s.reps} · RIR ${s.rir}`).join('  |  ')||'Нет выполненных подходов'}</span></div>)}</div>}</section>)}</div> }

createRoot(document.getElementById('root')!).render(<App/>);
