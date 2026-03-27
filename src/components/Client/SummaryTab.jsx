import React from 'react';

const SummaryTab = ({ client }) => {
  return (
    <div className="space-y-8 animate-slide-up">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-black/60 border border-white/10 p-4 rounded-[24px] text-center shadow-lg">
          <p className="text-[14px] text-white font-medium">{client.height} cm</p>
          <p className="text-[8px] text-neutral-600 font-black uppercase mt-1">Height</p>
        </div>
        <div className="bg-black/60 border border-white/10 p-4 rounded-[24px] text-center shadow-lg">
          <p className="text-[14px] text-white font-medium">{client.gender}</p>
          <p className="text-[8px] text-neutral-600 font-black uppercase mt-1">Gender</p>
        </div>
      </div>
      <div className="bg-white/[0.02] border border-white/[0.05] p-5 rounded-[24px]">
        <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-3">Medical / Notes</h3>
        <p className="text-sm text-neutral-300 leading-relaxed">{client.medical}</p>
      </div>
    </div>
  );
};

export default SummaryTab;