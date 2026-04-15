import React from 'react';
import { UserPlus, ChevronRight, Users, Package } from 'lucide-react';
import ClientAvatar from '../shared/ClientAvatar';
import Skeleton from '../shared/Skeleton';

const ClientListView = ({ clients, onSelectClient, onOpenAdd, isLoading }) => {
  return (
    <div className="app-screen-shell relative z-10 flex h-dvh flex-col overflow-hidden lg:h-full">

      {/* PAGE TITLE */}
      <div className="flex shrink-0 items-center justify-between gap-4 px-5 py-4">
        <div className="min-w-0">
          <h1 className="text-[17px] font-semibold tracking-[-0.01em] text-white">Trainee List</h1>
          <p className="mt-0.5 text-[11px] text-neutral-500">Total: {clients.length} trainees</p>
        </div>
        <button
          onClick={onOpenAdd}
          className="app-cta-button shrink-0 p-2.5 border rounded-full active:scale-95 transition-all"
        >
          <UserPlus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar px-6 py-6 app-mobile-nav-spacing lg:pb-8">
      {isLoading ? (
        <Skeleton.ClientList rows={6} />
      ) : clients.length === 0 ? (
         <div className="flex flex-col items-center justify-center h-64 text-center mt-10">
           <Users className="w-12 h-12 mb-4 text-white/15" />
           <p className="text-sm app-subtle-text font-medium">No trainees in the list yet.</p>
         </div>
      ) : (
         <div className="space-y-4">
            {clients.map(c => (
              <div 
                key={c.id} 
                onClick={() => onSelectClient(c)} 
                className="app-glass-panel border p-4 rounded-[24px] flex items-center gap-4 cursor-pointer hover:bg-[rgba(255,255,255,0.04)] transition-all active:scale-[0.98] animate-slide-up"
              >
                 <ClientAvatar
                   name={c.name}
                   avatarUrl={c.avatar_url || c.avatar}
                   sizeClassName="w-12 h-12"
                   ringClassName="border border-[rgba(200,245,63,0.28)] bg-[linear-gradient(135deg,rgba(200,245,63,0.18),rgba(96,180,255,0.18))] shadow-inner"
                   textClassName="text-sm font-black app-accent-text"
                 />
                 
                 <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium text-sm truncate">{c.name}</h3>
                    <p className="app-blue-text text-[10px] font-black uppercase truncate mt-0.5 tracking-wider">{c.goal}</p>
                 </div>
                 
                 <div className="text-right mr-2 flex flex-col items-end shrink-0">
                    {c.package.remaining === '--' ? (
                      <div className="flex gap-1.5 items-center bg-white/[0.02] border border-white/[0.05] px-3 py-1.5 rounded-full">
                         <Package className="w-2.5 h-2.5 app-label" />
                         <span className="text-[8px] font-black app-label uppercase tracking-tighter">Not Activated</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-end">
                        <p className="text-[8px] font-black app-label uppercase tracking-widest">Remaining</p>
                        <p className="text-xs font-bold app-accent-text mt-0.5">{c.package.remaining} sessions</p>
                        {typeof c.package.remaining === 'number' && c.package.remaining > 0 && c.package.remaining <= 5 ? (
                          <span className="mt-1 inline-flex items-center rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-[7px] font-black uppercase tracking-widest text-amber-300">
                            Ending Soon
                          </span>
                        ) : null}
                      </div>
                    )}
                 </div>
                 
                 <ChevronRight className="w-4 h-4 app-disabled-text" />
              </div>
            ))}
         </div>
      )}
      </div>
    </div>
  );
};

export default ClientListView;
