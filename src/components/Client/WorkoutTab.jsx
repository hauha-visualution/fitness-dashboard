import React, { useState } from 'react';
import { Play, Plus, Dumbbell } from 'lucide-react';

const WorkoutTab = ({ onStartWorkout }) => {
  const [groups] = useState([
    // Dữ liệu mẫu ban đầu để Hạo thấy giao diện
    { 
      id: 1, 
      group_name: "Hypertrophy - Aesthetics", 
      description: "6 Exercises • Focus on Chest & Back",
      exercises: [
        { name: 'Bench Press', sets: 4, weight: 60, done: false },
        { name: 'Lat Pulldown', sets: 4, weight: 45, done: false },
        { name: 'Incline DB Press', sets: 3, weight: 20, done: false }
      ]
    }
  ]);

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex justify-between items-center">
        <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Workout Grouping</h3>
        <button className="text-blue-400 text-[10px] font-black uppercase flex items-center gap-1">
          <Plus className="w-3 h-3"/> New Group
        </button>
      </div>

      {groups.map((group) => (
        <div key={group.id} className="glass p-5 rounded-[28px] border-l-4 border-blue-500 flex justify-between items-center group active:scale-[0.98] transition-all">
          <div className="flex-1">
            <h4 className="text-white font-bold text-sm">{group.group_name}</h4>
            <div className="flex items-center gap-3 mt-1">
               <p className="text-[9px] text-neutral-500 font-bold uppercase flex items-center gap-1">
                 <Dumbbell className="w-3 h-3"/> {group.exercises.length} Exercises
               </p>
            </div>
          </div>
          <button 
            onClick={() => onStartWorkout(group)}
            className="p-4 bg-white text-black rounded-full shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-110 transition-transform"
          >
            <Play className="w-5 h-5 fill-current"/>
          </button>
        </div>
      ))}

      {groups.length === 0 && (
        <div className="py-10 text-center border border-dashed border-white/10 rounded-[28px]">
          <p className="text-xs text-neutral-600 uppercase font-black tracking-widest">No Workout Groups Yet</p>
        </div>
      )}
    </div>
  );
};

export default WorkoutTab;
