import { createClient } from '@supabase/supabase-js'

// Gắn trực tiếp URL và Key (Đảm bảo chạy mọi môi trường)
const supabaseUrl = 'https://vhidpztcaolmsgijhvtc.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoaWRwenRjYW9sbXNnaWpodnRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MTk0NDIsImV4cCI6MjA5MDA5NTQ0Mn0.okrkgbIPBfRvxxyf097p9DY-ACzpxrcBioycR_eEwrQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)