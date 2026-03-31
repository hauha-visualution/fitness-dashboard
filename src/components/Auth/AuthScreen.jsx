import React, { useState } from 'react';
import { Dumbbell, User, Lock, ArrowLeft, AlertCircle, RefreshCw, UserCheck, Users } from 'lucide-react';
import { supabase, toAuthEmail } from '../../supabaseClient';

// Alias để dùng trong component này
const toEmail = toAuthEmail;

const AuthScreen = ({ onLogin }) => {
  const [role, setRole] = useState('coach'); // 'coach' | 'client'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Reset form khi đổi role
  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setUsername('');
    setPassword('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const email = toEmail(username);

    try {
      if (role === 'coach') {
        // ==== ĐĂNG NHẬP COACH ====
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          if (signInError.message.includes('Invalid login')) throw new Error('Sai username hoặc mật khẩu. Thử lại nhé!');
          throw signInError;
        }
        onLogin(data.session, 'coach');

      } else {
        // ==== ĐĂNG NHẬP HỌC VIÊN ====
        if (password.length < 6) throw new Error('Mật khẩu phải ít nhất 6 ký tự.');

        // Thử sign in trước (đã có tài khoản)
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

        if (!signInError && signInData.session) {
          onLogin(signInData.session, 'client');
          return;
        }

        // Xử lý lỗi đăng nhập
        if (signInError) {
          if (signInError.message.toLowerCase().includes('invalid login credentials')) {
            throw new Error('Sai SĐT hoặc mật khẩu. Liên hệ coach để được hỗ trợ.');
          }
          throw signInError;
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

      <div className="w-full relative z-10 animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/[0.03] border border-white/10 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
            <Dumbbell className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-medium text-white tracking-tight">Aesthetics Hub</h1>
          <p className="text-neutral-500 text-[10px] font-black uppercase tracking-widest mt-2">
            {role === 'coach' ? 'Coach Portal Access' : 'Học Viên Portal'}
          </p>
        </div>

        {/* Role Toggle: Coach / Học viên */}
        <div className="flex bg-white/[0.03] border border-white/[0.06] p-1.5 rounded-[28px] mb-5 gap-1">
          <button
            type="button"
            onClick={() => handleRoleChange('coach')}
            className={`flex-1 py-3.5 rounded-[22px] flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
              role === 'coach'
                ? 'bg-white text-black shadow-lg'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Coach
          </button>
          <button
            type="button"
            onClick={() => handleRoleChange('client')}
            className={`flex-1 py-3.5 rounded-[22px] flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
              role === 'client'
                ? 'bg-white text-black shadow-lg'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Học viên
          </button>
        </div>

        {/* Form đăng nhập */}
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <User className="w-5 h-5 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={role === 'coach' ? 'Coach username' : 'Số điện thoại (0901234567)'}
                required
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                className="w-full bg-black/50 border border-white/10 rounded-[20px] py-4 pl-12 pr-4 text-white text-sm outline-none focus:border-white/30 transition-colors"
              />
            </div>
            <div className="relative">
              <Lock className="w-5 h-5 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                placeholder={role === 'client' ? 'Mật khẩu (coach đã cấp)' : 'Password'}
                required
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                className="w-full bg-black/50 border border-white/10 rounded-[20px] py-4 pl-12 pr-4 text-white text-sm outline-none focus:border-white/30 transition-colors"
              />
            </div>

            {role === 'client' && !error && (
              <p className="text-neutral-600 text-[10px] leading-relaxed px-1">
                Dùng số điện thoại và mật khẩu coach đã cung cấp cho bạn.
              </p>
            )}

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
                : <>
                    {role === 'coach' ? 'Access Portal' : 'Đăng Nhập'}
                    <ArrowLeft className="w-4 h-4 rotate-180" />
                  </>
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
