import React from 'react';
import { Package, Calendar, Zap } from 'lucide-react';

const PackageTab = ({ client }) => (
  <div className="space-y-6 animate-slide-up">
    <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 rounded-[32px] p-8 text-center relative overflow-hidden">
      <Zap className="absolute -right-4 -top-4 w-24 h-24 text-white/5 rotate-12" />
      <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest mb-2">Gói đang tập</p>
      <h3 className="text-2xl font-medium text-white mb-6">PT 12 SESSIONS</h3>
      <div className="flex justify-around items-center">
        <div>
          <p className="text-2xl font-light text-white">{client.package?.remaining || '--'}</p>
          <p className="text-[8px] font-black text-neutral-500 uppercase">Còn lại</p>
        </div>
        <div className="w-px h-8 bg-white/10"></div>
        <div>
          <p className="text-2xl font-light text-white">{client.package?.total || '--'}</p>
          <p className="text-[8px] font-black text-neutral-500 uppercase">Tổng buổi</p>
        </div>
      </div>
    </div>
  </div>
);
export default PackageTab;