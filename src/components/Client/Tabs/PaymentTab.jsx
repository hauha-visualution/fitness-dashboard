import React from 'react';
import { CreditCard, CheckCircle } from 'lucide-react';

const PaymentTab = ({ client }) => (
  <div className="space-y-4 animate-slide-up">
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex justify-between items-center opacity-50">
      <div className="flex items-center gap-3">
        <CheckCircle className="w-4 h-4 text-emerald-500" />
        <div>
          <p className="text-xs text-white font-medium">Thanh toán Gói PT12</p>
          <p className="text-[8px] text-neutral-500 uppercase">24/03/2026</p>
        </div>
      </div>
      <p className="text-xs text-white font-bold">Done</p>
    </div>
  </div>
);
export default PaymentTab;