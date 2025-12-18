import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Link } from 'react-router-dom'

export default function RuleManager() {
  const [rules, setRules] = useState([])
  const [categories, setCategories] = useState([])
  
  // Form State
  const [newRule, setNewRule] = useState({
    catA: '',
    catB: '',
    severity: 'error',
    message: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const { data: cats } = await supabase.from('part_categories').select('*').order('name')
    setCategories(cats || [])
    if (cats?.length) {
        setNewRule(prev => ({ ...prev, catA: cats[0].id, catB: cats[0].id }))
    }

    const { data: rls } = await supabase.from('assembly_rules').select('*')
    setRules(rls || [])
  }

  const addRule = async (e) => {
    e.preventDefault()
    if (newRule.catA === newRule.catB) return alert("Выберите разные категории.")
    
    const { data, error } = await supabase
        .from('assembly_rules')
        .insert({
            category_a_id: newRule.catA,
            category_b_id: newRule.catB,
            severity: newRule.severity,
            message: newRule.message
        })
        .select()
        .single()
        
    if (error) alert(error.message)
    else {
        setRules([...rules, data])
        setNewRule({ ...newRule, message: '' }) 
    }
  }

  const deleteRule = async (id) => {
    await supabase.from('assembly_rules').delete().eq('id', id)
    setRules(rules.filter(r => r.id !== id))
  }

  // Helper
  const getCatName = (id) => categories.find(c => c.id === id)?.name || id

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-white/20 p-8 pt-28">
      
      {/* HEADER */}
      <div className="max-w-5xl mx-auto flex justify-between items-end border-b border-white/10 pb-6 mb-12">
        <div>
            <h1 className="text-2xl text-white font-medium tracking-tight mb-1">Ядро Логики</h1>
            <p className="text-zinc-500 text-xs font-mono uppercase tracking-wider">
                Автоматическая проверка совместимости
            </p>
        </div>
        <div className="flex gap-6 text-[10px] font-bold uppercase tracking-wider">
             <Link to="/admin" className="text-zinc-500 hover:text-white transition">← НАЗАД В РЕДАКТОР</Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12">
        
        {/* LEFT COL: FORM */}
        <div className="lg:col-span-1">
            <div className="bg-zinc-900 border border-white/5 p-6 rounded-sm sticky top-32">
                <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                    СОЗДАТЬ ПРАВИЛО
                </div>
                
                <form onSubmit={addRule} className="space-y-4">
                    
                    {/* LOGIC BLOCK */}
                    <div className="space-y-2 p-3 bg-black/50 border border-white/5">
                        <div>
                            <label className="text-[10px] text-zinc-500 block mb-1 uppercase font-bold">ЕСЛИ ЕСТЬ</label>
                            <select 
                                className="w-full bg-zinc-900 border border-white/10 p-2 text-xs text-white outline-none focus:border-white/30"
                                value={newRule.catA} onChange={e => setNewRule({...newRule, catA: e.target.value})}
                            >
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        
                        <div className="text-center text-[10px] text-zinc-600 font-mono py-1">+ И ДОБАВЛЯЕТСЯ +</div>
                        
                        <div>
                            <label className="text-[10px] text-zinc-500 block mb-1 uppercase font-bold">ВТОРАЯ ДЕТАЛЬ</label>
                            <select 
                                className="w-full bg-zinc-900 border border-white/10 p-2 text-xs text-white outline-none focus:border-white/30"
                                value={newRule.catB} onChange={e => setNewRule({...newRule, catB: e.target.value})}
                            >
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* CONSEQUENCE BLOCK */}
                    <div>
                        <label className="text-[10px] text-zinc-500 block mb-1 uppercase font-bold">УРОВЕНЬ РЕАКЦИИ</label>
                        <select 
                            className="w-full bg-black border border-white/10 p-2 text-xs text-white outline-none focus:border-white/30"
                            value={newRule.severity} onChange={e => setNewRule({...newRule, severity: e.target.value})}
                        >
                            <option value="error">КРИТИЧЕСКАЯ ОШИБКА (Блок)</option>
                            <option value="warning">ПРЕДУПРЕЖДЕНИЕ</option>
                            <option value="success">СОВЕТ (Инфо)</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] text-zinc-500 block mb-1 uppercase font-bold">СООБЩЕНИЕ СИСТЕМЫ</label>
                        <textarea 
                            required
                            className="w-full bg-black border border-white/10 p-3 text-xs text-white placeholder-zinc-700 outline-none focus:border-white/30 resize-none h-20"
                            placeholder="напр. Разъем не подходит."
                            value={newRule.message} onChange={e => setNewRule({...newRule, message: e.target.value})}
                        />
                    </div>

                    <button className="w-full bg-white text-black text-[10px] font-bold py-3 uppercase tracking-widest hover:bg-zinc-200 transition">
                        СКОМПИЛИРОВАТЬ
                    </button>
                </form>
            </div>
        </div>

        {/* RIGHT COL: LIST */}
        <div className="lg:col-span-2">
            <div className="flex justify-between items-end mb-6">
                <h2 className="text-[10px] text-zinc-500 uppercase tracking-widest">АКТИВНЫЕ ПРОТОКОЛЫ ({rules.length})</h2>
            </div>
            
            <div className="space-y-2">
                {rules.length === 0 && <div className="text-zinc-600 text-xs italic py-8 text-center border border-dashed border-white/5">Логика не определена.</div>}
                
                {rules.map(rule => (
                    <div key={rule.id} className="group flex justify-between items-start bg-zinc-900 p-4 border-l-2 hover:bg-zinc-800 transition"
                         style={{ borderColor: rule.severity === 'error' ? '#ef4444' : rule.severity === 'warning' ? '#f59e0b' : '#10b981' }}>
                        
                        <div className="flex-1">
                            <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 mb-1">
                                <span>{getCatName(rule.category_a_id)}</span>
                                <span className="text-zinc-600 font-mono text-[10px] px-1">:: СВЯЗЬ ::</span>
                                <span>{getCatName(rule.category_b_id)}</span>
                            </div>
                            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wide">
                                Ответ: <span className="text-zinc-400">"{rule.message}"</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 ml-4">
                            <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 border ${
                                rule.severity === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                                rule.severity === 'warning' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}>
                                {rule.severity}
                            </span>
                            <button onClick={() => deleteRule(rule.id)} className="text-zinc-600 hover:text-red-500 text-[10px] uppercase font-bold opacity-0 group-hover:opacity-100 transition">
                                Удалить
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>

      </div>
    </div>
  )
}