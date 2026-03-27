import React, { useState } from 'react'; // Thêm useState
import { UserPlus, ChevronRight, Users, RefreshCw, Trash2 } from 'lucide-react'; // Thêm Trash2
import DeleteClientModal from './DeleteClientModal'; // Import Modal xóa

const ClientListView = ({ clients, onSelectClient, onOpenAdd, isLoading, onDeleteClient }) => {
  // State quản lý việc mở Modal xóa
  const [selectedForDelete, setSelectedForDelete] = useState(null);

  return (
    <div className="h-screen flex flex-col relative z-10 bg-gradient-to-b from-[#2a2a2c] via-[#121212] to-[#000000] px-6 py-8 pb-32 overflow-y-auto hide-scrollbar">
      
      {/* HEADER GIỮ NGUYÊN */}
      <div className="flex justify-between items-center mb-8 shrink-0">
         <div>
           <h1 className="text-2xl font-medium text-white tracking-tight">Client Pool</h1>
           <p className="text-neutral-500 text-[10px] font-black uppercase tracking-widest mt-1">Total: {clients.length} Active</p>
         </div>
         <button onClick={onOpenAdd} className="p-3 bg-white text-black rounded-full shadow-lg hover:scale-105 transition-all">
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
         <div className="space-y-4">
            {clients.map(c => (
              <div 
                key={c.id} 
                className="relative group animate-slide-up" // Thêm group để hiện nút xóa khi hover
              >
                {/* THẺ HỌC VIÊN CŨ */}
                <div 
                  onClick={() => onSelectClient(c)} 
                  className="bg-white/[0.03] border border-white/5 p-4 rounded-[24px] flex items-center gap-4 cursor-pointer hover:bg-white/[0.05] transition-all active:scale-[0.98]"
                >
                   <img src={c.avatar} className="w-12 h-12 rounded-full border border-white/10 bg-white shadow-inner" alt="avatar" />
                   <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium text-sm truncate">{c.name}</h3>
                      <p className="text-blue-400 text-[10px] font-bold uppercase truncate mt-0.5">{c.goal}</p>
                   </div>
                   <div className="text-right mr-2">
                      <p className="text-[10px] font-black text-neutral-500 uppercase">Phone</p>
                      <p className="text-xs font-bold text-white">{c.phone}</p>
                   </div>
                   <ChevronRight className="w-4 h-4 text-neutral-600" />
                </div>

                {/* NÚT XÓA: Chỉ hiện khi PT muốn (Hover hoặc chủ động) */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation(); // QUAN TRỌNG: Ngăn việc click trúng thẻ để mở profile
                    setSelectedForDelete(c);
                  }}
                  className="absolute -right-2 -top-2 p-2 bg-red-500 text-white rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-all active:scale-90 z-20"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
         </div>
      )}

      {/* MODAL XÁC NHẬN XÓA */}
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