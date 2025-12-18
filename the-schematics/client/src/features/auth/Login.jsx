import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const navigate = useNavigate()

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
        let result
        if (isSignUp) {
            result = await supabase.auth.signUp({ email, password })
        } else {
            result = await supabase.auth.signInWithPassword({ email, password })
        }
        if (result.error) throw result.error

        if (isSignUp) {
            alert("Регистрация успешна! Проверьте почту.")
            setIsSignUp(false)
        } else {
            navigate('/')
        }
    } catch (error) { alert(error.message) } finally { setLoading(false) }
  }

  return (
    <div className="h-screen bg-zinc-950 flex flex-col items-center justify-center font-sans text-white p-4 relative overflow-hidden">
      
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

      <div className="w-full max-w-sm bg-zinc-900 border border-white/10 p-8 shadow-2xl relative z-10">
        
        <div className="text-center mb-8 border-b border-white/5 pb-6">
            <div className="text-[10px] font-mono text-red-500 uppercase tracking-widest mb-2">SECURE ACCESS</div>
            <h1 className="text-xl font-bold text-white tracking-tight">ВХОД В СИСТЕМУ</h1>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
            <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">ИДЕНТИФИКАТОР (EMAIL)</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-black border border-white/10 p-3 text-sm text-white outline-none focus:border-white/30 transition-colors" placeholder="engineer@corp.com" required />
            </div>

            <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">КОД ДОСТУПА (ПАРОЛЬ)</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-black border border-white/10 p-3 text-sm text-white outline-none focus:border-white/30 transition-colors" placeholder="••••••••" required />
            </div>

            <button disabled={loading} className="w-full bg-white text-black font-bold text-xs py-4 uppercase tracking-widest hover:bg-zinc-200 disabled:opacity-50 transition mt-4">
                {loading ? 'ОБРАБОТКА...' : (isSignUp ? 'СОЗДАТЬ АККАУНТ' : 'АВТОРИЗАЦИЯ')}
            </button>
        </form>

        <div className="mt-6 text-center">
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-[10px] text-zinc-500 hover:text-white uppercase tracking-wider border-b border-transparent hover:border-white transition pb-0.5">
                {isSignUp ? "ЕСТЬ ДОСТУП? ВОЙТИ" : "НЕТ ДОСТУПА? РЕГИСТРАЦИЯ"}
            </button>
        </div>
      </div>

      <div className="absolute bottom-8 text-[10px] text-zinc-700 font-mono">
        ОГРАНИЧЕННАЯ ЗОНА // ТОЛЬКО ДЛЯ ПЕРСОНАЛА
      </div>
    </div>
  )
}