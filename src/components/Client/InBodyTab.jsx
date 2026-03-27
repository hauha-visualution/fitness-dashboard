import React from 'react';
import { Activity } from 'lucide-react';

const InBodyTab = ({ client }) => {
  return (
    <div className="py-20 text-center animate-slide-up">
      <Activity className="w-12 h-12 text-neutral-800 mx-auto mb-4" />
      <p className="text-sm text-neutral-500">InBody History & Comparison Table Coming Soon</p>
      <button className="mt-6 px-6 py-3 bg-white text-black text-[10px] font-black uppercase rounded-full shadow-lg">New Measurement</button>
    </div>
  );
};

export default InBodyTab;