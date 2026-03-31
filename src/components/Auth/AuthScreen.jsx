import React, { useState } from 'react';
import { Dumbbell, User, Lock, ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../../supabaseClient';

// Chuyển username thành email giả nội bộ để dùng với Supabase Auth
const toEmail = (username) => `${username.toLowerCase().trim()}@aestheticshub.app`;

const AuthScreen = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        // --- ĐĂNG NHẬP ---
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: toEmail(username),
          password,
        });

        if (signInError) {
          if (signInError.message.includes('Invalid login')) {
            throw new Error('Sai username hoặc mật khẩu. Thử lại nhé!');
          }
          throw signInError;
        }

        onLogin(data.session);

      } else {
        // --- ĐĂNG KÝ ---
        if (password.length < 6) {
          throw new Error('Mật khẩu phải ít nhất 6 ký tự.');
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: toEmail(username),
          password,
          options: {
            data: { username }, // Lưu username vào user_metadata
          },
        });

        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            throw new Error('Username này đã tồn tại, thử username khác nhé!');
          }
          throw signUpError;
        }

        // Nếu Supabase yêu cầu confirm email → báo hướng dẫn
        if (data.user && !data.session) {
          setError('⚠️ Cần tắt "Enable email confirmations" trong Supabase Dashboard → Authentication → Settings để đăng ký trực tiếp.');
        } else if (data.session) {
          onLogin(data.session);
        }
      }
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra, thử lại nhé!');
    } finally {
      setIsLoading(false);
    }
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
          {/* Toggle Sign In / Sign Up */}
          <div className="flex bg-white/[0.03] p-1 rounded-[20px] mb-6">
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-3 text-[10px] font-bold uppercase rounded-[16px] transition-all ${isLogin ? 'bg-black text-white shadow-lg border border-white/10' : 'text-neutral-600'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-3 text-[10px] font-bold uppercase rounded-[16px] transition-all ${!isLogin ? 'bg-black text-white shadow-lg border border-white/10' : 'text-neutral-600'}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <User className="w-5 h-5 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-[20px] py-4 pl-12 pr-4 text-white text-sm outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="relative">
              <Lock className="w-5 h-5 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                placeholder="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-[20px] py-4 pl-12 pr-4 text-white text-sm outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Hiển thị lỗi */}
            {error && (
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-[16px] p-4">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-red-400 text-[11px] leading-relaxed">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-white text-black font-bold py-4 rounded-[20px] mt-2 flex items-center justify-center gap-2 hover:bg-neutral-200 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading
                ? <RefreshCw className="w-4 h-4 animate-spin" />
                : <>{isLogin ? 'Access Portal' : 'Create Account'} <ArrowLeft className="w-4 h-4 rotate-180" /></>
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
