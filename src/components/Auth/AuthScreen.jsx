import React, { useState } from 'react';
import { Dumbbell, User, Lock, ArrowLeft } from 'lucide-react';

const AuthScreen = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin({ username }); 
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center relative z-20 bg-[#0a0a0a] overflow-hidden px-6">
      <div className="absolute top-[-10%] left-[-20%] w-[140%] h-[400px] bg-white/[0.03] blur-[100px] pointer-events-none"></div>
      <div className="w-full max-sm relative z-10 animate-slide-up">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-white/[0.03] border border-white/10 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
            <Dumbbell className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-medium text-white tracking-tight">Aesthetics Hub</h1>
          <p className="text-neutral-500 text-[10px] font-black uppercase tracking-widest mt-2">Coach Portal Access</p>
        </div>
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 shadow-2xl">
          <div className="flex bg-white/[0.03] p-1 rounded-[20px] mb-6">
            <button onClick={() => setIsLogin(true)} className={`flex-1 py-3 text-[10px] font-bold uppercase rounded-[16px] transition-all ${isLogin ? 'bg-black text-white shadow-lg border border-white/10' : 'text-neutral-600'}`}>Sign In</button>
            <button onClick={() => setIsLogin(false)} className={`flex-1 py-3 text-[10px] font-bold uppercase rounded-[16px] transition-all ${!isLogin ? 'bg-black text-white shadow-lg border border-white/10' : 'text-neutral-600'}`}>Sign Up</button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <User className="w-5 h-5 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input type="text" placeholder="Username" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-[20px] py-4 pl-12 pr-4 text-white text-sm outline-none focus:border-blue-500 transition-colors" />
            </div>
            <div className="relative">
              <Lock className="w-5 h-5 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-[20px] py-4 pl-12 pr-4 text-white text-sm outline-none focus:border-blue-500 transition-colors" />
            </div>
            <button type="submit" className="w-full bg-white text-black font-bold py-4 rounded-[20px] mt-2 flex items-center justify-center gap-2 hover:bg-neutral-200 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]">
              {isLogin ? 'Access Portal' : 'Create Account'} <ArrowLeft className="w-4 h-4 rotate-180" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;