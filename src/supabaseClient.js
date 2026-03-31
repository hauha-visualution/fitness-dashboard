import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vhidpztcaolmsgijhvtc.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoaWRwenRjYW9sbXNnaWpodnRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MTk0NDIsImV4cCI6MjA5MDA5NTQ0Mn0.okrkgbIPBfRvxxyf097p9DY-ACzpxrcBioycR_eEwrQ'

// Client chính - dùng cho toàn bộ app (coach session)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Chuyển SĐT / username thành email giả nội bộ
export const toAuthEmail = (username) =>
  `${username.toLowerCase().replace(/\s/g, '')}@aestheticshub.app`

/**
 * Tạo tài khoản Supabase Auth cho học viên mà KHÔNG ảnh hưởng session coach hiện tại.
 * Dùng một client instance độc lập (in-memory, không lưu session).
 *
 * @param {string} phone    - SĐT học viên (làm username)
 * @param {string} password - Mật khẩu do coach đặt
 * @returns {{ userId: string|null, error: string|null }}
 */
export const createClientAuthAccount = async (phone, password) => {
  // Client tạm thời: không lưu session xuống localStorage → không ảnh hưởng coach
  const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      storageKey: `temp_client_creation_${Date.now()}`,
    },
  })

  const email = toAuthEmail(phone)

  // Thử signUp
  const { data, error } = await tempClient.auth.signUp({
    email,
    password,
    options: {
      data: { username: phone, role: 'client' },
    },
  })

  if (error) {
    // Nếu account đã tồn tại → sign in để lấy userId
    if (error.message.includes('already registered') || error.message.includes('User already registered')) {
      const { data: signInData, error: signInError } = await tempClient.auth.signInWithPassword({ email, password })
      if (signInError) return { userId: null, error: 'Tài khoản đã tồn tại với mật khẩu khác. Đổi mật khẩu khác.' }
      return { userId: signInData.user?.id ?? null, error: null }
    }
    return { userId: null, error: error.message }
  }

  return { userId: data.user?.id ?? null, error: null }
}