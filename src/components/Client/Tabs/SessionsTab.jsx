import React from 'react';
import { Dumbbell, Clock } from 'lucide-react';

const SessionsTab = ({ clientId }) => (
  <div className="space-y-4 animate-slide-up">
    <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest ml-1">Recent Sessions</p>
    <div className="text-center py-20 opacity-20 italic text-[10px] font-black uppercase tracking-widest">
       Chưa có lịch sử buổi tập
    </div>
  </div>
);
export default SessionsTab;