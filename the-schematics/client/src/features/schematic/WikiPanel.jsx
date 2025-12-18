import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function WikiPanel({ categoryId, categoryName }) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('READ') // READ | EDIT | HISTORY
  const [history, setHistory] = useState([])
  const [user, setUser] = useState(null)
  
  const [editContent, setEditContent] = useState('')
  const [editComment, setEditComment] = useState('')

  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    loadArticle()
  }, [categoryId])

  async function loadArticle() {
    setLoading(true)
    try {
        // Читаем статью напрямую из Supabase
        const { data, error } = await supabase
            .from('wiki_articles')
            .select('content')
            .eq('category_id', categoryId)
            .maybeSingle()

        if (error) throw error;

        setContent(data?.content || '')
        setEditContent(data?.content || '') 
    } catch (e) {
        console.error("Ошибка загрузки вики:", e)
    }
    setLoading(false)
  }

  async function loadHistory() {
    try {
        // Читаем историю напрямую из Supabase
        const { data, error } = await supabase
            .from('wiki_history')
            .select('*')
            .eq('category_id', categoryId)
            .order('created_at', { ascending: false })

        if (error) throw error;
        setHistory(data || [])
        setMode('HISTORY')
    } catch (e) {
        console.error("Ошибка загрузки истории:", e)
    }
  }

  const handleSave = async () => {
    if (!user) return alert("Войдите в систему, чтобы править Вики!")
    if (!editComment) return alert("Напишите комментарий к правке")

    try {
        // 1. Обновляем или создаем статью
        const { error: articleError } = await supabase
            .from('wiki_articles')
            .upsert({ 
                category_id: categoryId, 
                content: editContent,
                updated_at: new Date()
            }, { onConflict: 'category_id' })

        if (articleError) throw articleError;

        // 2. Записываем действие в историю
        const { error: historyError } = await supabase
            .from('wiki_history')
            .insert({
                category_id: categoryId,
                content: editContent,
                user_id: user.id,
                user_email: user.email,
                comment: editComment
            })

        if (historyError) throw historyError;

        loadArticle()
        setMode('READ')
        setEditComment('')
    } catch (e) {
        alert("Ошибка сохранения: " + e.message)
    }
  }

  if (loading) return <div className="p-4 text-zinc-500 text-xs font-mono">ЗАГРУЗКА...</div>

  return (
    <div className="bg-zinc-900 h-full flex flex-col p-4 border-l border-white/5">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider truncate w-1/2">
            📖 {categoryName}
        </h3>
        <div className="flex gap-1">
            <button onClick={() => setMode('READ')} className={`px-2 py-1 text-[10px] font-bold uppercase ${mode==='READ'?'bg-white text-black':'text-zinc-500 hover:text-white'}`}>ЧТЕНИЕ</button>
            <button onClick={() => setMode('EDIT')} className={`px-2 py-1 text-[10px] font-bold uppercase ${mode==='EDIT'?'bg-white text-black':'text-zinc-500 hover:text-white'}`}>ПРАВКА</button>
            <button onClick={loadHistory} className={`px-2 py-1 text-[10px] font-bold uppercase ${mode==='HISTORY'?'bg-white text-black':'text-zinc-500 hover:text-white'}`}>ИСТОРИЯ</button>
        </div>
      </div>

      {/* --- MODE: READ --- */}
      {mode === 'READ' && (
        <div className="flex-1 overflow-y-auto font-mono text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed pr-2 custom-scrollbar">
            {content ? content : (
                <div className="text-zinc-600 italic mt-10 text-center">
                    Нет данных.<br/>
                    Нажмите <span className="text-white font-bold">ПРАВКА</span>, чтобы создать статью.
                </div>
            )}
        </div>
      )}

      {/* --- MODE: EDIT --- */}
      {mode === 'EDIT' && (
        <div className="flex-1 flex flex-col gap-2 relative">
            {!user ? (
                <div className="absolute inset-0 bg-zinc-900/95 z-10 flex flex-col items-center justify-center text-center p-4">
                    <div className="text-red-500 font-bold mb-2 text-xs uppercase tracking-widest">ДОСТУП ЗАПРЕЩЕН</div>
                    <p className="text-zinc-500 text-xs mb-4">
                        Только авторизованные инженеры могут вносить правки.
                    </p>
                    <button 
                        onClick={() => navigate('/login')}
                        className="bg-white hover:bg-zinc-200 text-black px-4 py-2 font-bold text-[10px] uppercase tracking-widest"
                    >
                        ВОЙТИ В СИСТЕМУ
                    </button>
                </div>
            ) : null}

            <textarea 
                className="flex-1 bg-black border border-white/10 p-3 text-white font-mono text-xs focus:border-white/30 outline-none resize-none"
                value={editContent} 
                onChange={e => setEditContent(e.target.value)}
                placeholder="# Заголовок...\n\nТекст инструкции..."
            />
            
            <input 
                className="bg-zinc-900 border border-white/10 p-2 text-white text-xs outline-none focus:border-white/30 placeholder-zinc-600"
                placeholder="Комментарий к правке (обязательно)"
                value={editComment}
                onChange={e => setEditComment(e.target.value)}
            />
            
            <button 
                onClick={handleSave}
                className="bg-white hover:bg-zinc-200 text-black font-bold py-2 text-[10px] uppercase tracking-widest"
            >
                ОПУБЛИКОВАТЬ ИЗМЕНЕНИЯ
            </button>
        </div>
      )}

      {/* --- MODE: HISTORY --- */}
      {mode === 'HISTORY' && (
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {history.length === 0 && <div className="text-zinc-600 text-xs text-center mt-4">История пуста.</div>}
            {history.map(rev => (
                <div key={rev.id} className="bg-zinc-800 p-2 border-l-2 border-white/20 text-xs hover:bg-zinc-700 transition">
                    <div className="flex justify-between text-white mb-1 font-bold">
                        <span>{rev.user_email?.split('@')[0]}</span>
                        <span className="text-zinc-500 font-mono text-[10px]">{new Date(rev.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="text-zinc-400 italic">"{rev.comment}"</div>
                </div>
            ))}
        </div>
      )}

    </div>
  )
}