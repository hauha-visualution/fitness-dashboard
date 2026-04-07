import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

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