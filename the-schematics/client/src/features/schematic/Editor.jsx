import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { Link } from 'react-router-dom'

export default function SchematicEditor() {
  const [activeTab, setActiveTab] = useState('DEVICES') 
  const [requests, setRequests] = useState([])
  const [devices, setDevices] = useState([])
  const [categories, setCategories] = useState([])

  const [newDevice, setNewDevice] = useState({ name: '', type: 'smartphone', slug: '', image_url: '', schematic_url: '' })
  
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [schematic, setSchematic] = useState(null)
  const [zones, setZones] = useState([])
  const [drawPoints, setDrawPoints] = useState([])
  const [selectedCatId, setSelectedCatId] = useState('')

  const imgRef = useRef(null)

  useEffect(() => { fetchRequests(); fetchDevices(); fetchCategories() }, [])

  async function fetchRequests() { const { data } = await supabase.from('device_requests').select('*').order('created_at', { ascending: false }); setRequests(data || []) }
  async function fetchDevices() { const { data } = await supabase.from('devices').select('*').order('name'); setDevices(data || []) }
  async function fetchCategories() { const { data } = await supabase.from('part_categories').select('*').order('name'); setCategories(data || []); if(data?.length) setSelectedCatId(data[0].id) }

  const handleCreateDevice = async (e) => {
    e.preventDefault()
    if (!newDevice.name || !newDevice.slug || !newDevice.schematic_url) return alert("Заполните обязательные поля")
    
    try {
        const { data: dev, error: devErr } = await supabase.from('devices').insert({ name: newDevice.name, type: newDevice.type, slug: newDevice.slug, image_url: newDevice.image_url }).select().single()
        if (devErr) throw devErr
        const { error: schErr } = await supabase.from('schematics').insert({ device_id: dev.id, image_url: newDevice.schematic_url, width: 800, height: 600 })
        if (schErr) throw schErr

        alert("Система успешно создана")
        setNewDevice({ name: '', type: 'smartphone', slug: '', image_url: '', schematic_url: '' })
        fetchDevices()
    } catch (error) {
        alert("Ошибка: " + error.message)
    }
  }

  const handleDeleteDevice = async (id) => { if(!confirm("Удалить запись?")) return; await supabase.from('devices').delete().eq('id', id); fetchDevices() }

  const selectDeviceToEdit = async (dev) => {
    setSelectedDevice(dev); setActiveTab('EDITOR'); setDrawPoints([]); setSchematic(null) 
    const { data: schem } = await supabase.from('schematics').select('*').eq('device_id', dev.id).maybeSingle()
    if (!schem) return alert("Схема не найдена")
    setSchematic(schem)
    const { data: zns } = await supabase.from('interactive_zones').select('*, part_categories(name)').eq('schematic_id', schem.id)
    setZones(zns || [])
  }

  const handleImageClick = (e) => {
    if (!schematic) return
    const rect = imgRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left; const y = e.clientY - rect.top
    const scaleX = 800 / rect.width; const scaleY = 600 / rect.height
    setDrawPoints([...drawPoints, [Math.round(x * scaleX), Math.round(y * scaleY)]])
  }

  const saveZone = async () => {
    if (drawPoints.length < 3) return alert("Нужно минимум 3 точки")
    const d = drawPoints.map((p, i) => (i === 0 ? `M${p[0]} ${p[1]}` : `L${p[0]} ${p[1]}`)).join(' ') + ' Z'
    await supabase.from('interactive_zones').insert({ schematic_id: schematic.id, part_category_id: selectedCatId, svg_path: d })
    const { data: zns } = await supabase.from('interactive_zones').select('*, part_categories(name)').eq('schematic_id', schematic.id)
    setZones(zns || []); setDrawPoints([])
  }

  const deleteZone = async (id) => { if (!confirm('Удалить зону?')) return; await supabase.from('interactive_zones').delete().eq('id', id); setZones(zones.filter(z => z.id !== id)) }

  return (
    <div className="h-screen bg-zinc-950 text-white font-sans flex flex-col overflow-hidden pt-16">
      
      {/* HEADER */}
      <div className="h-12 border-b border-white/10 bg-zinc-950 flex items-center justify-between px-6 shrink-0">
        <h1 className="text-[10px] font-bold text-red-500 tracking-widest uppercase border border-red-900/50 bg-red-900/10 px-2 py-1">
            СИСТЕМНЫЙ АДМИНИСТРАТОР
        </h1>
        
        <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-wider">
            <button onClick={() => setActiveTab('REQUESTS')} className={activeTab==='REQUESTS'?'text-white':'text-zinc-600 hover:text-white transition'}>ВХОДЯЩИЕ</button>
            <button onClick={() => setActiveTab('DEVICES')} className={activeTab==='DEVICES'?'text-white':'text-zinc-600 hover:text-white transition'}>БАЗА ДАННЫХ</button>
            <button onClick={() => setActiveTab('EDITOR')} className={activeTab==='EDITOR'?'text-white':'text-zinc-600 hover:text-white transition'}>РЕДАКТОР СХЕМ</button>
            
            <div className="h-4 w-[1px] bg-white/10"></div>
            
            <Link to="/admin/rules" className="flex items-center gap-2 text-amber-500 border border-amber-900/30 bg-amber-900/10 px-3 py-1.5 hover:bg-amber-900/20 hover:border-amber-500/50 transition">
                <span>ЛОГИКА / ПРАВИЛА</span>
            </Link>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        
        {/* TAB: REQUESTS */}
        {activeTab === 'REQUESTS' && (
            <div className="p-8 w-full overflow-y-auto max-w-4xl mx-auto">
                <h2 className="text-[10px] text-zinc-500 uppercase tracking-widest mb-6">ОЖИДАЮЩИЕ ЗАПРОСЫ</h2>
                <div className="grid gap-2">
                    {requests.map(req => (
                        <div key={req.id} className="bg-zinc-900 border border-white/5 p-4 flex justify-between items-center">
                            <div>
                                <span className="font-bold text-white block text-sm">{req.device_name}</span>
                                <span className="text-zinc-500 text-xs">{req.notes}</span>
                            </div>
                            <div className="text-[10px] text-zinc-700 font-mono">{new Date(req.created_at).toLocaleDateString()}</div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* TAB: DEVICES */}
        {activeTab === 'DEVICES' && (
            <div className="p-8 w-full overflow-y-auto flex gap-12">
                <div className="w-1/2 space-y-2">
                    <h2 className="text-[10px] text-zinc-500 uppercase tracking-widest mb-4">ЗАПИСИ БАЗЫ ДАННЫХ</h2>
                    {devices.map(dev => (
                        <div key={dev.id} className="flex justify-between items-center bg-zinc-900 p-3 border border-white/5 hover:border-white/20 transition group">
                            <div>
                                <div className="font-medium text-sm text-zinc-200">{dev.name}</div>
                                <div className="text-[10px] text-zinc-600 font-mono">{dev.slug}</div>
                            </div>
                            <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition">
                                <button onClick={() => selectDeviceToEdit(dev)} className="text-[10px] font-bold uppercase text-white hover:underline">РЕД.</button>
                                <button onClick={() => handleDeleteDevice(dev.id)} className="text-[10px] font-bold uppercase text-red-500 hover:underline">УДАЛИТЬ</button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="w-1/2 bg-zinc-900 border border-white/5 p-6 h-fit">
                    <h2 className="text-[10px] text-white font-bold uppercase tracking-widest mb-6">СОЗДАТЬ НОВУЮ ЗАПИСЬ</h2>
                    <form onSubmit={handleCreateDevice} className="space-y-4">
                        <input className="w-full bg-black border border-white/10 p-3 text-xs text-white outline-none focus:border-white/30" placeholder="Название (напр. iPhone 15)" value={newDevice.name} onChange={e => setNewDevice({...newDevice, name: e.target.value})} />
                        <input className="w-full bg-black border border-white/10 p-3 text-xs text-white outline-none focus:border-white/30" placeholder="Slug (напр. iphone-15)" value={newDevice.slug} onChange={e => setNewDevice({...newDevice, slug: e.target.value})} />
                        <input className="w-full bg-black border border-white/10 p-3 text-xs text-white outline-none focus:border-white/30" placeholder="Ссылка на обложку" value={newDevice.image_url} onChange={e => setNewDevice({...newDevice, image_url: e.target.value})} />
                        <input className="w-full bg-black border border-emerald-900/30 p-3 text-xs text-white outline-none focus:border-emerald-500/50" placeholder="Ссылка на схему" value={newDevice.schematic_url} onChange={e => setNewDevice({...newDevice, schematic_url: e.target.value})} />
                        <button className="w-full bg-white text-black font-bold text-[10px] py-3 uppercase hover:bg-zinc-200 transition">ИНИЦИАЛИЗИРОВАТЬ</button>
                    </form>
                </div>
            </div>
        )}

        {/* TAB: EDITOR */}
        {activeTab === 'EDITOR' && (
            <div className="flex w-full h-full">
                {selectedDevice && schematic ? (
                    <>
                        <div className="flex-1 bg-zinc-950 relative flex items-center justify-center overflow-hidden cursor-crosshair">
                            {/* Grid */}
                            <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                            
                            <div className="relative border border-white/10" style={{ height: '600px', width: '800px' }}>
                                <img ref={imgRef} src={schematic.image_url} className="w-full h-full object-contain pointer-events-none opacity-50 grayscale invert" />
                                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 600" onClick={handleImageClick}>
                                    {zones.map(z => (
                                        <path key={z.id} d={z.svg_path} fill="rgba(255, 255, 255, 0.1)" stroke="white" strokeWidth="1" onClick={(e) => { e.stopPropagation(); deleteZone(z.id) }} className="hover:fill-red-500/50 cursor-pointer" />
                                    ))}
                                    {drawPoints.length > 0 && (
                                        <>
                                            <polyline points={drawPoints.map(p => p.join(',')).join(' ')} fill="none" stroke="red" strokeWidth="1" />
                                            {drawPoints.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="2" fill="red" />)}
                                        </>
                                    )}
                                </svg>
                            </div>
                        </div>
                        <div className="w-72 bg-zinc-900 border-l border-white/10 p-4 flex flex-col gap-4">
                            <h2 className="text-sm font-bold text-white">{selectedDevice.name}</h2>
                            <div className="p-3 bg-black border border-white/10">
                                <label className="text-[10px] text-zinc-500 block mb-2 uppercase">ТИП КОМПОНЕНТА</label>
                                <select className="w-full bg-black text-white text-xs outline-none" value={selectedCatId} onChange={e => setSelectedCatId(e.target.value)}>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setDrawPoints(drawPoints.slice(0, -1))} className="flex-1 bg-zinc-800 text-zinc-300 py-2 text-[10px] hover:text-white uppercase font-bold">ОТМЕНА</button>
                                <button onClick={() => setDrawPoints([])} className="flex-1 bg-zinc-800 text-zinc-300 py-2 text-[10px] hover:text-white uppercase font-bold">СБРОС</button>
                            </div>
                            <button onClick={saveZone} className="w-full bg-white text-black font-bold py-3 text-[10px] uppercase hover:bg-zinc-200">СОХРАНИТЬ ЗОНУ</button>
                            
                            <div className="mt-auto border-t border-white/10 pt-4 overflow-y-auto">
                                <div className="text-[10px] text-zinc-500 uppercase mb-2">РАЗМЕЧЕННЫЕ ЗОНЫ</div>
                                {zones.map(z => (
                                    <div key={z.id} className="flex justify-between text-xs text-zinc-400 py-1 border-b border-white/5">
                                        <span>{z.part_categories?.name}</span>
                                        <button onClick={() => deleteZone(z.id)} className="text-zinc-600 hover:text-red-500">×</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="w-full flex items-center justify-center text-zinc-700 text-xs uppercase tracking-widest">ВЫБЕРИТЕ УСТРОЙСТВО ДЛЯ РАЗМЕТКИ</div>
                )}
            </div>
        )}
      </div>
    </div>
  )
}