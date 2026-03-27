import React from 'react';
import { Utensils, AlertTriangle, Heart } from 'lucide-react';

const NutritionTab = ({ client }) => (
  <div className="space-y-6 animate-slide-up">
    <div className="bg-orange-500/5 border border-orange-500/10 rounded-[32px] p-6">
      <div className="flex items-center gap-3 mb-4">
        <AlertTriangle className="w-4 h-4 text-orange-500" />
        <p className="text-[10px] font-black uppercase text-orange-500 tracking-widest">Cần tránh / Dị ứng</p>
      </div>
      <p className="text-sm text-white font-medium">{client.avoidfoods || "Không có dữ liệu"}</p>
    </div>
    
    <div className="bg-white/[0.03] border border-white/10 rounded-[32px] p-6 space-y-4">
      <p className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">Thói quen ăn uống</p>
      <p className="text-sm text-neutral-300 leading-relaxed">{client.cookinghabit || "Chưa cập nhật"}</p>
    </div>
  </div>
);
export default NutritionTab;