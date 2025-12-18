import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Navigate } from 'react-router-dom'

// ВНИМАНИЕ: Впишите сюда EMAIL, под которым вы зарегистрировались!
const ADMIN_EMAIL = "test@test.com" 

export default function ProtectedRoute({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
        setUser(user)
        // Проверяем, совпадает ли email с админским
        if (user.email === ADMIN_EMAIL) {
            setIsAdmin(true)
        }
    }
    setLoading(false)
  }

  if (loading) return <div className="h-screen bg-black text-red-500 font-mono p-10">SECURITY_CHECK...</div>

  // Если не вошел ИЛИ не админ -> Выкидываем на главную
  if (!user || !isAdmin) {
    return <Navigate to="/" replace />
  }

  // Если всё ок -> Пускаем к секретному контенту
  return children
}