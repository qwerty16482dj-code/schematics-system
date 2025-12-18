import { createClient } from '@supabase/supabase-js' // <-- Проверьте здесь

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Эта строка как раз и выдает вашу ошибку в консоль
  throw new Error('Missing Supabase Environment Variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)