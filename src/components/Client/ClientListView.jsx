import React from 'react';
import { UserPlus, ChevronRight, Users, RefreshCw, Package } from 'lucide-react';

const ClientListView = ({ clients, onSelectClient, onOpenAdd, isLoading }) => {
  return (
    <div className="h-screen flex flex-col relative z-10 bg-gradient-to-b from-[#2a2a2c] via-[#121212] to-[#000000] px-6 py-8 pb-32 overflow-y-auto hide-scrollbar">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8 shrink-0">
         <div>
           <h1 className="text-2xl font-medium text-white tracking-tight">Client Pool</h1>
           <p className="text-neutral-500 text-[10px] font-black uppercase tracking-widest mt-1">Total: {clients.length} Active</p>
         </div>
         <button 
          onClick={onOpenAdd} 
          className="p-3 bg-white text-black rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all"
         >
           <UserPlus className="w-5 h-5" />
         </button>
      </div>
      
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 mt-10">
          <RefreshCw className="w-8 h-8 mb-4 text-blue-500 animate-spin" />
          <p className="text-sm text-neutral-400">Đang tải dữ liệu...</p>
        </div>
      ) : clients.length === 0 ? (
         <div className="flex flex-col items-center justify-center h-64 text-center mt-10">
           <Users className="w-12 h-12 mb-4 text-neutral-800" />
           <p className="text-sm text-neutral-500 font-medium">Chưa có khách hàng trong danh sách.</p>
         </div>
      ) : (
         <div className="space-y-4">
            {clients.map(c => (
              <div 
                key={c.id} 
                onClick={() => onSelectClient(c)} 
                className="bg-white/[0.03] border border-white/5 p-4 rounded-[24px] flex items-center gap-4 cursor-pointer hover:bg-white/[0.05] transition-all active:scale-[0.98] animate-slide-up"
              >
                 <img src={c.avatar} className="w-12 h-12 rounded-full border border-white/10 bg-white shadow-inner" alt="avatar" />
                 
                 <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium text-sm truncate">{c.name}</h3>
                    <p className="text-blue-400 text-[10px] font-black uppercase truncate mt-0.5 tracking-wider">{c.goal}</p>
                 </div>
                 
                 <div className="text-right mr-2 flex flex-col items-end shrink-0">
                    {c.package.remaining === '--' ? (
                      <div className="flex gap-1.5 items-center bg-white/[0.02] border border-white/[0.05] px-3 py-1.5 rounded-full">
                         <Package className="w-2.5 h-2.5 text-neutral-600" />
                         <span className="text-[8px] font-black text-neutral-600 uppercase tracking-tighter">Unactivated</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-end">
                        <p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest">Remaining</p>
                        <p className="text-xs font-bold text-white mt-0.5">{c.package.remaining} Sessions</p>
                      </div>
                    )}
                 </div>
                 
                 <ChevronRight className="w-4 h-4 text-neutral-700" />
              </div>
            ))}
         </div>
      )}
    </div>
  );
};

export default ClientListView;