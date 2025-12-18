import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'
import { API_URL } from '../config' // <-- ВАЖНО: ИМПОРТ КОНФИГА

export default function Home() {
  const [devices, setDevices] = useState([])
  const [user, setUser] = useState(null)
  
  const [showModal, setShowModal] = useState(false)
  const [reqName, setReqName] = useState('')
  const [reqNotes, setReqNotes] = useState('')

  useEffect(() => {
    async function loadDevices() {
      const { data } = await supabase.from('devices').select('*')
      setDevices(data || [])
    }
    loadDevices()

    async function checkAuth() {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
    }
    checkAuth()
  }, [])

  const handleRequest = async (e) => {
    e.preventDefault()
    if (!reqName) return

    try {
        // ИСПОЛЬЗУЕМ API_URL
        const res = await fetch(`${API_URL}/api/request-device`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user ? user.id : null, name: reqName, notes: reqNotes })
        })

        const result = await res.json()
        if (result.success) {
            alert("Запрос успешно отправлен.")
            setShowModal(false); setReqName(''); setReqNotes('')
        } else {
            alert("Ошибка отправки запроса")
        }
    } catch (e) { alert("Сервер недоступен") }
  }

  return (
    <div className="w-full min-h-screen bg-zinc-950 text-white font-sans selection:bg-white/20 pb-20 pt-28 px-6">
      
      {/* HEADER */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-end border-b border-white/10 pb-8 mb-16 gap-6">
        <div>
            <div className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase mb-2 flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                СИСТЕМА АКТИВНА // v3.2
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-none mb-2">
                The Schematics
            </h1>
            <p className="text-zinc-400 text-sm max-w-md leading-relaxed">
                Глобальный репозиторий интерактивных инженерных чертежей и руководств по ремонту. 
                Только для авторизованного персонала.
            </p>
        </div>
        
        <div className="text-right">
            {!user && (
                <Link to="/login" className="inline-block bg-white text-black text-[10px] font-bold px-6 py-3 uppercase tracking-widest hover:bg-zinc-200 transition">
                    АВТОРИЗАЦИЯ
                </Link>
            )}
        </div>
      </div>

      {/* GRID */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {devices.map(device => (
            <Link key={device.id} to={`/device/${device.slug}`} className="group relative block h-72 bg-zinc-900 border border-white/5 hover:border-white/30 transition-all overflow-hidden">
                <div className="absolute inset-0 opacity-60 group-hover:opacity-40 transition-opacity duration-500 mix-blend-luminosity">
                    <img src={device.image_url} alt={device.name} className="w-full h-full object-cover grayscale contrast-125" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent"></div>

                <div className="absolute bottom-0 left-0 w-full p-6 z-20">
                    <div className="text-[10px] text-zinc-500 mb-2 uppercase tracking-widest border-l border-emerald-500 pl-2">
                        {device.type}
                    </div>
                    <h2 className="text-xl font-bold text-white mb-4 group-hover:text-emerald-400 transition-colors">
                        {device.name}
                    </h2>
                    
                    <div className="flex items-center justify-between border-t border-white/10 pt-4">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider group-hover:text-white transition">
                            ОТКРЫТЬ ЧЕРТЕЖ
                        </span>
                        <span className="text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1">→</span>
                    </div>
                </div>
            </Link>
        ))}

        {/* REQUEST BUTTON */}
        <button 
            onClick={() => setShowModal(true)}
            className="h-72 border border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-600 hover:border-white/20 hover:text-white hover:bg-white/5 transition cursor-pointer group"
        >
            <div className="w-12 h-12 border border-zinc-800 rounded-full flex items-center justify-center mb-4 group-hover:border-white transition">
                <span className="text-2xl font-light leading-none pb-1">+</span>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest">ЗАПРОСИТЬ СХЕМУ</div>
        </button>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[100] bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
            <div className="bg-zinc-900 border border-white/10 w-full max-w-md p-8 shadow-2xl relative">
                <button onClick={() => setShowModal(false)} className="absolute top-0 right-0 p-4 text-zinc-500 hover:text-white transition">✕</button>

                <div className="mb-6">
                    <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-2">НОВЫЙ ЗАПРОС</div>
                    <h2 className="text-xl font-bold text-white">ЗАПРОС ОБОРУДОВАНИЯ</h2>
                </div>

                <form onSubmit={handleRequest} className="space-y-4">
                    <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">МОДЕЛЬ УСТРОЙСТВА</label>
                        <input type="text" className="w-full bg-black border border-white/10 p-3 text-sm text-white outline-none focus:border-white/30 transition" placeholder="например, iPhone 15 Pro" value={reqName} onChange={e => setReqName(e.target.value)} required />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">ТЕХНИЧЕСКИЕ ЗАМЕТКИ</label>
                        <textarea className="w-full bg-black border border-white/10 p-3 text-sm text-white outline-none focus:border-white/30 h-24 resize-none transition" placeholder="Какая именно плата или узел..." value={reqNotes} onChange={e => setReqNotes(e.target.value)}></textarea>
                    </div>
                    <button className="w-full py-4 bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-200 transition mt-2">ОТПРАВИТЬ ЗАПРОС</button>
                </form>
            </div>
        </div>
      )}
    </div>
  )
}