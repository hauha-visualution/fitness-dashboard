import React, { useState } from 'react';
import { ArrowLeft, Trash2, MoreHorizontal, User, Package, Dumbbell, Utensils, CreditCard } from 'lucide-react';

// Import các Tab mới từ thư mục con
import ProfileTab from './Tabs/ProfileTab';
import PackageTab from './Tabs/PackageTab';
import SessionsTab from './Tabs/SessionsTab';
import NutritionTab from './Tabs/NutritionTab';
import PaymentTab from './Tabs/PaymentTab';

const ClientDetailView = ({ client, onBack, onDelete }) => {
  const [activeSubTab, setActiveSubTab] = useState('profile');

  const renderContent = () => {
    switch (activeSubTab) {
      case 'profile':   return <ProfileTab client={client} />;
      case 'package':   return <PackageTab client={client} />;
      case 'sessions':  return <SessionsTab clientId={client.id} />;
      case 'nutrition': return <NutritionTab client={client} />;
      case 'payment':   return <PaymentTab client={client} />;
      default:          return <ProfileTab client={client} />;
    }
  };

  return (
    <div className="h-screen bg-[#0a0a0a] flex flex-col relative overflow-hidden animate-slide-up">
      
      {/* HEADER */}
      <div className="p-6 flex justify-between items-center shrink-0 z-10">
        <button onClick={onBack} className="p-3 bg-white/5 border border-white/10 rounded-full text-white active:scale-90 transition-all">
          <ArrowLeft className="w-5 h-5"/>
        </button>
        <div className="flex gap-2">
          <button 
            onClick={() => { if(window.confirm("Xóa học viên này?")) onDelete(client.id); }} 
            className="p-3 bg-white/[0.03] border border-white/[0.08] rounded-full text-neutral-600 hover:text-red-500/80 transition-all"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button className="p-3 bg-white/[0.03] border border-white/[0.08] rounded-full text-neutral-600">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* CLIENT MINI HEADER */}
      <div className="px-6 flex items-center gap-5 mb-8 shrink-0">
        <img src={client.avatar} className="w-16 h-16 rounded-full border border-white/10 bg-white shadow-2xl" alt="avt" />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-medium text-white truncate">{client.name}</h1>
          <p className="text-blue-400 text-[9px] font-black uppercase tracking-widest mt-1">{client.goal}</p>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-y-auto px-6 pb-40 hide-scrollbar">
        {renderContent()}
      </div>

      {/* CONTEXTUAL BOTTOM NAV */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[92%] bg-black/80 backdrop-blur-3xl border border-white/10 rounded-[32px] p-1.5 flex justify-between z-50 shadow-2xl">
        {[
          { id: 'profile', icon: User, label: 'Profile' },
          { id: 'package', icon: Package, label: 'Gói tập' },
          { id: 'sessions', icon: Dumbbell, label: 'Sessions' },
          { id: 'nutrition', icon: Utensils, label: 'Nutrition' },
          { id: 'payment', icon: CreditCard, label: 'Payment' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex-1 py-4 rounded-[26px] flex flex-col items-center justify-center gap-1 transition-all duration-300 ${
              activeSubTab === tab.id ? 'bg-white/5 text-white shadow-inner scale-100' : 'text-neutral-600 scale-90 opacity-50'
            }`}
          >
            <tab.icon className={`w-5 h-5 ${activeSubTab === tab.id ? 'text-white' : 'text-neutral-700'}`} />
            <span className="text-[7px] font-black uppercase tracking-tighter">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ClientDetailView;