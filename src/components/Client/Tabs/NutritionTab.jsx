import React from 'react';
import { AlertTriangle, Heart, ChefHat } from 'lucide-react';

const InfoRow = ({ label, value, color }) => (
  <div className="flex justify-between items-start border-b border-white/[0.03] pb-4 last:border-0 last:pb-0">
    <span className="text-[10px] text-neutral-600 uppercase font-black tracking-widest shrink-0">{label}</span>
    <span className={`text-xs text-right max-w-[60%] leading-relaxed ${color || 'text-white'}`}>{value || '--'}</span>
  </div>
);

const NutritionTab = ({ client }) => (
  <div className="space-y-6 animate-slide-up">

    {/* 1. Cần tránh & Dị ứng */}
    <div className="bg-orange-500/5 border border-orange-500/10 rounded-[32px] p-6 space-y-5">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-4 h-4 text-orange-500" />
        <p className="text-[10px] font-black uppercase text-orange-500 tracking-widest">Cần tránh & Dị ứng</p>
      </div>
      <InfoRow label="Thực phẩm tránh" value={client.avoidfoods} color="text-orange-300" />
      <InfoRow label="Ăn kiêng đặc biệt" value={client.dietaryrestriction} color="text-orange-200" />
    </div>

    {/* 2. Món yêu thích */}
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-[32px] p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Heart className="w-4 h-4 text-pink-500" />
        <p className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">Món yêu thích</p>
      </div>
      <p className="text-sm text-neutral-300 leading-relaxed">
        {client.favoritefoods || '--'}
      </p>
    </div>

    {/* 3. Thói quen nấu ăn */}
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-[32px] p-6 space-y-5">
      <div className="flex items-center gap-3">
        <ChefHat className="w-4 h-4 text-neutral-400" />
        <p className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">Thói quen nấu ăn</p>
      </div>
      <InfoRow label="Hình thức" value={client.cookinghabit} />
      <InfoRow label="Thời gian nấu/ngày" value={client.cookingtime} />
      <InfoRow label="Ngân sách/tháng" value={client.foodbudget} color="text-green-400" />
    </div>

  </div>
);

export default NutritionTab;
