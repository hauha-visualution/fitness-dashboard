import React, { useState } from 'react';
import { Activity, Scale, Percent, Flame, Plus, X } from 'lucide-react';

const InBodyTab = ({ client }) => {
  const [showForm, setShowForm] = useState(false);
  
  // Các chỉ số quan trọng từ ảnh InBody 270 bạn gửi
  const metrics = [
    { label: 'Cân nặng', key: 'weight', unit: 'kg', icon: Scale },
    { label: 'Cơ xương (SMM)', key: 'smm', unit: 'kg', icon: Activity },
    { label: 'Tỷ lệ mỡ (PBF)', key: 'pbf', unit: '%', icon: Percent },
    { label: 'Mỡ nội tạng', key: 'vfat', unit: 'Level', icon: Flame }
  ];

  return (
    <div className="space-y-6 animate-slide-up">
      <button onClick={() => setShowForm(true)} className="w-full glass p-5 rounded-[24px] flex items-center justify-between group active:scale-95 transition-all">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500 rounded-2xl shadow-lg"><Plus className="w-5 h-5 text-white"/></div>
          <div className="text-left">
            <h4 className="text-white font-bold text-sm">Nhập chỉ số mới</h4>
            <p className="text-[10px] text-neutral-500 font-bold uppercase">InBody 270 Template</p>
          </div>
        </div>
      </button>

      {/* Bảng so sánh mẫu (Sẽ lấy từ DB sau khi bạn nhập data) */}
      <div className="glass p-6 rounded-[28px]">
        <h3 className="text-[10px] font-black text-white uppercase tracking-widest mb-6 text-center">So sánh Initial vs Latest</h3>
        <div className="space-y-6">
          {metrics.map((m, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="p-2 bg-white/5 rounded-xl"><m.icon className="w-4 h-4 text-neutral-500"/></div>
              <div className="flex-1">
                <div className="flex justify-between text-[10px] font-bold mb-2">
                   <span className="text-neutral-500 uppercase">{m.label}</span>
                   <span className="text-blue-400">-- {m.unit}</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex">
                  <div className="h-full bg-neutral-700" style={{width: '40%'}}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[110] bg-black p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-medium text-white">Record InBody</h2>
            <button onClick={() => setShowForm(false)} className="p-2 bg-white/5 rounded-full"><X className="w-5 h-5 text-white"/></button>
          </div>
          <div className="space-y-4">
            {metrics.map((m, i) => (
              <div key={i} className="bg-white/5 p-4 rounded-2xl flex justify-between items-center">
                <span className="text-sm text-neutral-400">{m.label} ({m.unit})</span>
                <input type="number" className="bg-black/40 border border-white/10 rounded-lg w-24 p-2 text-right text-white outline-none" placeholder="0.0" />
              </div>
            ))}
            <button className="w-full py-4 border border-dashed border-white/10 rounded-2xl text-[10px] text-neutral-500 font-black uppercase">+ Thêm chỉ số tùy chỉnh</button>
            <button className="w-full bg-white text-black font-black py-5 rounded-[24px] mt-4">LƯU KẾT QUẢ</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InBodyTab;