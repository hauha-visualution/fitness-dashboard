import React, { useEffect, useState } from 'react';
import { Dumbbell, User, Lock, ArrowLeft, AlertCircle, RefreshCw, UserPlus } from 'lucide-react';
import { supabase, toAuthEmail } from '../../supabaseClient';

// Alias để dùng trong component này
const toEmail = toAuthEmail;

const AuthScreen = ({ onLogin, mode = 'main', onBack = null }) => {
  const isCoachSignupMode = mode === 'coach-signup';
  const isMainMode = mode === 'main';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setUsername('');
    setPassword('');
    setFullName('');
    setError('');
  }, [mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const normalizedUsername = username.trim();
    const email = toEmail(normalizedUsername);

    try {
      if (isCoachSignupMode) {
        if (!normalizedUsername) throw new Error('Please enter a coach username.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username: normalizedUsername, role: 'coach' },
          },
        });

        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            throw new Error('This username already exists. Please contact support for another sign-up link.');
          }
          throw signUpError;
        }

        const { error: coachErr } = await supabase
          .from('coaches')
          .insert([{
            email,
            full_name: fullName.trim() || normalizedUsername,
          }]);

        if (coachErr) {
          console.warn('Coach record error:', coachErr.message);
        }

        if (signUpData.session) {
          onLogin(signUpData.session);
        } else {
          const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
          if (loginErr) throw new Error('Account created. Please sign in from the main login page.');
          onLogin(loginData.session);
        }
      } else {
        if (!normalizedUsername) throw new Error('Please enter your username or phone number.');
        if (password.length < 6) throw new Error('Mật khẩu phải ít nhất 6 ký tự.');

        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

        if (!signInError && signInData.session) {
          onLogin(signInData.session);
          return;
        }

        if (signInError) {
          if (signInError.message.toLowerCase().includes('invalid login credentials')) {
            throw new Error('Sai username hoặc mật khẩu. Nếu bạn là học viên, hãy dùng thông tin coach đã chia sẻ.');
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
    <div className="app-screen-shell h-screen w-full flex flex-col items-center justify-center relative z-20 overflow-hidden px-6">
      <div className="absolute top-[-10%] left-[-20%] w-[140%] h-[400px] bg-white/[0.03] blur-[100px] pointer-events-none"></div>

      <div className="w-full relative z-10 animate-slide-up">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="app-ghost-button mb-5 p-3 border rounded-full text-white active:scale-90 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[linear-gradient(135deg,rgba(200,245,63,0.22),rgba(96,180,255,0.18))] border border-[rgba(200,245,63,0.3)] rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(200,245,63,0.08)]">
            <Dumbbell className="w-8 h-8 app-accent-text" />
          </div>
          <h1 className="text-2xl font-medium text-white tracking-tight">Aesthetics Hub</h1>
          <p className="text-neutral-500 text-[10px] font-black uppercase tracking-widest mt-2">
            {isCoachSignupMode
              ? 'Coach Sign Up'
              : 'Sign In'}
          </p>
        </div>

        {/* Form đăng nhập */}
        <div className="app-glass-panel border rounded-[32px] p-6 shadow-2xl">
          {isMainMode && (
            <p className="mb-4 px-1 text-[11px] leading-relaxed text-white/45">
              Use the login details shared with you.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Tên hiển thị (chỉ khi đăng ký coach mới) */}
            {isCoachSignupMode && (
              <div className="relative">
                <UserPlus className="w-5 h-5 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Display name"
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); setError(''); }}
                  className="w-full bg-black/50 border border-white/10 rounded-[20px] py-4 pl-12 pr-4 text-white text-sm outline-none focus:border-white/30 transition-colors"
                />
              </div>
            )}

            <div className="relative">
              <User className="w-5 h-5 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={isCoachSignupMode ? 'Coach username' : 'Username or phone number'}
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
                placeholder={isCoachSignupMode
                  ? 'Create a password (at least 6 characters)'
                  : 'Password'}
                required
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                className="w-full bg-black/50 border border-white/10 rounded-[20px] py-4 pl-12 pr-4 text-white text-sm outline-none focus:border-white/30 transition-colors"
              />
            </div>

            {error && (
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-[16px] p-4">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-red-400 text-[11px] leading-relaxed">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="app-cta-button w-full font-bold py-4 rounded-[20px] mt-2 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading
                ? <RefreshCw className="w-4 h-4 animate-spin" />
                : <>
                    {isCoachSignupMode
                      ? 'Create coach account'
                      : 'Sign In'}
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
