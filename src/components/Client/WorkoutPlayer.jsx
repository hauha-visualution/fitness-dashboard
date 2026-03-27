import React, { useState, useEffect } from 'react';
import { X, Pause, Play, CheckCircle2, Flag, ChevronRight } from 'lucide-react';

const WorkoutPlayer = ({ sessionData, client, onFinish, onBack }) => {
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [exercises, setExercises] = useState(sessionData.exercises || []);

  useEffect(() => {
    let interval = null;
    if (isActive) {
      interval = setInterval(() => setSeconds(s => s + 1), 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const formatTime = (ts) => {
    const m = Math.floor(ts / 60);
    const s = ts % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const toggleExercise = (index) => {
    const updated = [...exercises];
    updated[index].done = !updated[index].done;
    setExercises(updated);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-slide-up">
      {/* Header Điều khiển */}
      <div className="p-6 flex justify-between items-center border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <button onClick={onBack} className="p-2 bg-white/5 rounded-full text-white"><X className="w-5 h-5"/></button>
        <div className="text-center">
          <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">{sessionData.group_name}</p>
          <h2 className="text-2xl font-mono text-white tracking-tighter">{formatTime(seconds)}</h2>
        </div>
        <button 
          onClick={() => setIsActive(!isActive)} 
          className={`p-3 rounded-full transition-all ${isActive ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}
        >
          {isActive ? <Pause className="w-5 h-5 fill-current"/> : <Play className="w-5 h-5 fill-current"/>}
        </button>
      </div>

      {/* Danh sách bài tập */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 hide-scrollbar">
        <div className="mb-6">
          <h1 className="text-white/40 text-[10px] font-black uppercase tracking-widest">Training with</h1>
          <h2 className="text-white text-lg font-medium">{client.name}</h2>
        </div>

        {exercises.map((ex, idx) => (
          <div 
            key={idx} 
            onClick={() => toggleExercise(idx)}
            className={`p-5 rounded-[24px] border transition-all flex items-center gap-4 ${ex.done ? 'bg-emerald-500/10 border-emerald-500/30 opacity-50' : 'bg-white/[0.03] border-white/5'}`}
          >
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${ex.done ? 'bg-emerald-500 border-emerald-500' : 'border-white/20'}`}>
              {ex.done && <CheckCircle2 className="w-4 h-4 text-black stroke-[3]"/>}
            </div>
            <div className="flex-1">
              <h4 className={`text-sm font-medium transition-all ${ex.done ? 'text-neutral-500 line-through' : 'text-white'}`}>{ex.name}</h4>
              <p className="text-[10px] text-neutral-500 font-bold mt-1 uppercase tracking-wider">{ex.sets} Sets • {ex.weight}kg</p>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-800" />
          </div>
        ))}
      </div>

      {/* Nút Kết thúc buổi tập */}
      <div className="p-6 bg-gradient-to-t from-black via-black/80 to-transparent">
        <button 
          onClick={() => onFinish(seconds)}
          className="w-full bg-white text-black font-black py-5 rounded-[26px] flex items-center justify-center gap-2 shadow-[0_10px_50px_rgba(255,255,255,0.15)] active:scale-95 transition-all"
        >
          <Flag className="w-5 h-5 fill-current"/> FINISH & SAVE SESSION
        </button>
      </div>
    </div>
  );
};

export default WorkoutPlayer;