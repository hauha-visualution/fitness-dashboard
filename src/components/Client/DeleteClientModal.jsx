import React, { useState } from 'react';
import { X, AlertTriangle, Lock, Trash2, RefreshCw } from 'lucide-react';

const DeleteClientModal = ({ client, onClose, onConfirm }) => {
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    // Mật khẩu xác nhận tạm thời (Hạo có thể đổi ở đây)
    const MASTER_PASS = '123456'; 

    if (password !== MASTER_PASS) {
      alert("Mật khẩu PT không chính xác!");
      return;
    }

    if (window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn học viên ${client.name}?`)) {
      setIsDeleting(true);
      await onConfirm(client.id);
      setIsDeleting(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose}></div>
      
      <div className="w-full max-w-sm bg-[#1a1a1c] border border-white/10 rounded-[32px] p-8 relative animate-slide-up shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-white text-xl font-medium tracking-tight">Xác nhận xóa</h3>
          <p className="text-neutral-500 text-xs mt-2 leading-relaxed">
            Hành động này sẽ xóa vĩnh viễn hồ sơ của <span className="text-white font-bold">{client.name}</span>. Nhập mật khẩu PT để tiếp tục.
          </p>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Lock className="w-4 h-4 text-neutral-600 absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mật khẩu PT"
              className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-sm outline-none focus:border-red-500/50 transition-all"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              onClick={onClose}
              className="flex-1 bg-white/5 text-neutral-400 font-bold py-4 rounded-2xl hover:bg-white/10 transition-all"
            >
              Hủy
            </button>
            <button 
              onClick={handleConfirm}
              disabled={isDeleting}
              className="flex-1 bg-red-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.3)] active:scale-95 transition-all disabled:opacity-50"
            >
              {isDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Xóa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteClientModal;