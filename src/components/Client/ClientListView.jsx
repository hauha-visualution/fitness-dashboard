import React, { useState } from 'react';
import { UserPlus, ChevronRight, Users, RefreshCw, Trash2, Package } from 'lucide-react';
import DeleteClientModal from './DeleteClientModal';

const ClientListView = ({ clients, onSelectClient, onOpenAdd, isLoading, onDeleteClient }) => {
  const [selectedForDelete, setSelectedForDelete] = useState(null);

  return (
    <div className="h-screen flex flex-col relative z-10 bg-gradient-to-b from-[#2a2a2c] via-[#121212] to-[#000000] px-6 py-8 pb-32 overflow-y-auto hide-scrollbar">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8 shrink-0">
         <div>
           <h1 className="text-2xl font-medium text-white tracking-tight">Client Pool</h1>
           <p className="text-neutral-500 text-[10px] font-black uppercase tracking-widest mt-1">Total: {clients.length} Active</p>
         </div>
         <button onClick={onOpenAdd} className="p-3 bg-white text-black rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all">
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
           <Users className="w-12 h-12 mb-4 text-neutral-600/50" />
           <p className="text-sm text-neutral-400">Chưa có khách hàng.</p>
         </div>
      ) : (
         <div className="space-y-5"> {/* Tăng khoảng cách một chút để nút xóa không bị dính */}
            {clients.map(c => (
              <div key={c.id} className="relative animate-slide-up">
                
                {/* THẺ HỌC VIÊN */}
                <div 
                  onClick={() => onSelectClient(c)} 
                  className="bg-white/[0.03] border border-white/5 p-4 rounded-[24px] flex items-center gap-4 cursor-pointer hover:bg-white/[0.05] transition-all active:scale-[0.98]"
                >
                   <img src={c.avatar} className="w-12 h-12 rounded-full border border-white/10 bg-white shadow-inner" alt="avatar" />
                   <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium text-sm truncate">{c.name}</h3>
                      <p className="text-blue-400 text-[10px] font-bold uppercase truncate mt-0.5">{c.goal}</p>
                   </div>
                   
                   <div className="text-right mr-2 flex flex-col items-end">
                      {c.package.remaining === '--' ? (
                        <div className="flex gap-1 items-center bg-orange-500/10 border border-orange-500/20 px-2.5 py-1.5 rounded-full">
                           <Package className="w-2.5 h-2.5 text-orange-400" />
                           <span className="text-[8px] font-black text-orange-300 uppercase">Chưa kích hoạt</span>
                        </div>
                      ) : (
                        <>
                          <p className="text-[10px] font-black text-neutral-500 uppercase">Remaining</p>
                          <p className="text-xs font-bold text-white">{c.package.remaining} Buổi</p>
                        </>
                      )}
                   </div>
                   <ChevronRight className="w-4 h-4 text-neutral-600" />
                </div>

                {/* NÚT XÓA: Đã bỏ opacity-0 để LUÔN HIỂN THỊ */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation(); 
                    setSelectedForDelete(c);
                  }}
                  className="absolute -right-1 -top-1 p-2 bg-red-500/20 border border-red-500/30 rounded-full text-red-500 shadow-xl active:scale-90 z-20 hover:bg-red-500 hover:text-white transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
         </div>
      )}

      {selectedForDelete && (
        <DeleteClientModal 
          client={selectedForDelete}
          onClose={() => setSelectedForDelete(null)}
          onConfirm={onDeleteClient}
        />
      )}
    </div>
  );
};

export default ClientListView;