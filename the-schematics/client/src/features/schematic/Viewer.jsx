import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import WikiPanel from './WikiPanel'
// API_URL удален, так как работаем напрямую с базой

export default function SchematicViewer() {
  const { slug } = useParams()
  
  // Данные устройства
  const [device, setDevice] = useState(null)
  const [schematic, setSchematic] = useState(null)
  const [zones, setZones] = useState([])
  
  // Выбранная деталь
  const [selectedPart, setSelectedPart] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Юзер
  const [user, setUser] = useState(null)

  // Рынок и Корзина
  const [offers, setOffers] = useState([]) 
  const [cart, setCart] = useState([]) 
  const [alerts, setAlerts] = useState([]) // Ошибки совместимости
  const [analyzing, setAnalyzing] = useState(false)

  // РЕЖИМ ПРАВОЙ ПАНЕЛИ: 'MARKET' или 'WIKI'
  const [rightPanelMode, setRightPanelMode] = useState('MARKET')

  // 1. ЗАГРУЗКА
  useEffect(() => {
    async function loadData() {
      if (!slug) return
      setLoading(true)

      try {
        const { data: dev } = await supabase.from('devices').select('*').eq('slug', slug).single()
        if (!dev) { alert("Устройство не найдено"); return }
        setDevice(dev)

        const { data: schem } = await supabase.from('schematics').select('*').eq('device_id', dev.id).single()
        setSchematic(schem)

        if (schem) {
            const { data: zns } = await supabase
            .from('interactive_zones')
            .select('*, part_categories(id, name)') 
            .eq('schematic_id', schem.id)
            setZones(zns || [])
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
    
    // Проверка авторизации
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [slug])

  // 2. КЛИК ПО ЗОНЕ
  const handleZoneClick = async (zone) => {
    setSelectedPart(zone)
    setRightPanelMode('MARKET') 
    setOffers([]) 

    // Грузим предложения
    const { data } = await supabase
        .from('market_offers')
        .select('*, vendors(*)')
        .eq('part_category_id', zone.part_categories.id)
        .order('price', { ascending: true }) 
    
    setOffers(data || [])
  }

  // 3. ДОБАВИТЬ В КОРЗИНУ
  const addOfferToCart = (offer) => {
    const exists = cart.find(item => item.categoryId === offer.part_category_id)
    
    if (exists) {
        if(!window.confirm("Заменить деталь в корзине?")) return
        setCart(cart.filter(i => i.id !== exists.id))
    }

    const cartItem = {
        id: Date.now(),
        categoryId: offer.part_category_id,
        categoryName: selectedPart.part_categories.name,
        vendorName: offer.vendors.name,
        price: offer.price,
        vendorId: offer.vendor_id,
        condition: offer.condition,
        offerId: offer.id
    }

    setCart(prev => [...prev, cartItem])
    setAlerts([]) 
  }

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id))
    setAlerts([])
  }

  // 4. ПРОВЕРКА СОВМЕСТИМОСТИ (ИЗМЕНЕНО ДЛЯ ПРЯМОЙ РАБОТЫ С БАЗОЙ)
  const checkIntegrity = async () => {
    if (cart.length < 2) return alert("Нужно добавить хотя бы 2 детали.")
    setAnalyzing(true)
    setAlerts([])
    
    const catIds = cart.map(item => item.categoryId)
    
    try {
        // Запрашиваем конфликты напрямую из Supabase
        const { data: conflicts, error } = await supabase
            .from('assembly_rules')
            .select('*')
            .in('category_a', catIds)
            .in('category_b', catIds)
            .eq('is_compatible', false)

        if (error) throw error

        if (conflicts && conflicts.length > 0) {
            const newAlerts = conflicts.map(c => ({
                type: 'error',
                text: `ВНИМАНИЕ: ${c.description || 'Несовместимые компоненты'}`
            }))
            setAlerts(newAlerts)
        } else {
            setAlerts([{ type: 'success', text: 'СИСТЕМА: КОНФЛИКТОВ НЕТ' }])
        }
    } catch (e) {
        console.error("Ошибка базы данных:", e)
        alert("Ошибка доступа к базе правил")
    } finally {
        setAnalyzing(false)
    }
  }

  // 5. ОФОРМЛЕНИЕ
  const handleCheckout = async () => {
    if (!user) return alert("Требуется вход в систему.")
    if (cart.length === 0) return

    setAnalyzing(true)
    const totalPrice = cart.reduce((sum, item) => sum + item.price, 0)
    
    const { data: order, error } = await supabase
        .from('orders')
        .insert({ user_id: user.id, total_price: totalPrice, status: 'paid' })
        .select()
        .single()

    if (error) {
        alert("Ошибка создания заказа")
        setAnalyzing(false)
        return
    }

    const items = cart.map(item => ({
        order_id: order.id,
        vendor_id: item.vendorId,
        part_name: item.categoryName,
        price: item.price
    }))
    await supabase.from('order_items').insert(items)

    setAnalyzing(false)
    alert(`Заказ #${order.id} успешно оформлен!`)
    setCart([])
    setAlerts([])
  }

  if (loading) return <div className="h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 font-mono text-xs pt-20">ЗАГРУЗКА СИСТЕМЫ...</div>

  return (
    <div className="h-screen bg-zinc-950 text-white font-sans flex flex-col overflow-hidden pt-16">
        
        {/* TOP BAR */}
        <div className="h-12 border-b border-white/10 flex items-center justify-between px-6 bg-zinc-950 shrink-0">
            <div className="flex items-center gap-6">
                <Link to="/" className="text-zinc-500 hover:text-white text-xs font-bold transition">← НАЗАД</Link>
                <div className="h-4 w-[1px] bg-white/10"></div>
                <h1 className="text-sm font-medium text-zinc-200 tracking-wide">
                    {device?.name} <span className="text-zinc-600 ml-2 font-mono text-xs uppercase">ВЕРСИЯ: 1.0</span>
                </h1>
            </div>
            <div className="text-[10px] font-mono text-zinc-600 uppercase">
                {user ? `ВХОД: ${user.email}` : 'РЕЖИМ ЧТЕНИЯ'}
            </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
            
            {/* LEFT SIDEBAR: PART LIST */}
            <div className="w-64 bg-zinc-900 border-r border-white/10 overflow-y-auto hidden md:block shrink-0">
                <div className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5">
                    КОМПОНЕНТЫ
                </div>
                {zones.map(zone => (
                    <div 
                        key={zone.id} 
                        onClick={() => handleZoneClick(zone)}
                        className={`px-4 py-3 text-xs border-b border-white/5 cursor-pointer transition-colors ${selectedPart?.id === zone.id ? 'bg-white text-black font-bold' : 'text-zinc-400 hover:bg-white/5'}`}
                    >
                        {zone.part_categories?.name}
                    </div>
                ))}
            </div>

            {/* CENTER: CANVAS */}
            <div className="flex-1 bg-zinc-950 relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

                <div className="relative shadow-2xl ring-1 ring-white/10" style={{ height: '600px', width: '800px' }}>
                    {schematic && (
                        <>
                            <img 
                                src={schematic.image_url} 
                                className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-90 grayscale contrast-125 invert" 
                                alt="blueprint"
                            />
                            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 600">
                                {zones.map(zone => (
                                    <path 
                                        key={zone.id}
                                        d={zone.svg_path}
                                        fill={selectedPart?.id === zone.id ? "rgba(255, 255, 255, 0.2)" : "transparent"}
                                        stroke={selectedPart?.id === zone.id ? "#fff" : "rgba(255,255,255,0.2)"}
                                        strokeWidth={selectedPart?.id === zone.id ? "2" : "1"}
                                        className="cursor-pointer hover:stroke-white transition-all duration-200"
                                        onClick={() => handleZoneClick(zone)}
                                    />
                                ))}
                            </svg>
                        </>
                    )}
                </div>
            </div>

            {/* RIGHT SIDEBAR */}
            <div className="w-80 bg-zinc-900 border-l border-white/10 flex flex-col shrink-0">
                
                {selectedPart ? (
                    <>
                        <div className="bg-zinc-900 border-b border-white/10 p-5">
                            <div className="text-[10px] font-mono text-zinc-500 uppercase mb-1">ВЫБРАННЫЙ УЗЕЛ</div>
                            <h2 className="text-lg text-white font-medium leading-tight mb-4">{selectedPart.part_categories?.name}</h2>

                            <div className="flex w-full border border-white/10 rounded-sm overflow-hidden">
                                <button onClick={() => setRightPanelMode('MARKET')} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider ${rightPanelMode==='MARKET' ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
                                    РЫНОК (₴)
                                </button>
                                <button onClick={() => setRightPanelMode('WIKI')} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider ${rightPanelMode==='WIKI' ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
                                    ИНФО / WIKI
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden relative bg-zinc-900">
                            {rightPanelMode === 'MARKET' && (
                                <div className="h-full overflow-y-auto p-0">
                                    {offers.length === 0 ? (
                                        <div className="p-8 text-center">
                                            <p className="text-zinc-600 text-xs">Нет предложений.</p>
                                        </div>
                                    ) : (
                                        offers.map(offer => (
                                            <div key={offer.id} className="border-b border-white/5 p-4 hover:bg-white/5 transition group">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <div className="text-xs font-bold text-white">{offer.vendors?.name}</div>
                                                        <div className="text-[10px] text-zinc-500 uppercase">{offer.condition}</div>
                                                    </div>
                                                    <div className="text-[10px] text-emerald-500 font-mono">ПРОВЕРЕНО</div>
                                                </div>
                                                <div className="flex justify-between items-center mt-3">
                                                    <div className="text-sm text-white font-mono">{offer.price} ₴</div>
                                                    <button onClick={() => addOfferToCart(offer)} className="bg-zinc-800 hover:bg-white hover:text-black text-white border border-white/10 text-[10px] px-3 py-1.5 transition uppercase font-bold tracking-wide">
                                                        В СБОРКУ
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                            {rightPanelMode === 'WIKI' && (
                                <WikiPanel categoryId={selectedPart.part_categories.id} categoryName={selectedPart.part_categories.name} />
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 p-8 text-center">
                        <div className="w-8 h-8 border border-zinc-700 rounded-full flex items-center justify-center mb-4 text-xs font-mono">i</div>
                        <p className="text-xs">Выберите компонент на схеме, чтобы увидеть детали.</p>
                    </div>
                )}

                <div className="border-t border-white/10 bg-zinc-950 p-4 z-10">
                    {alerts.length > 0 && (
                        <div className="mb-3 space-y-1">
                            {alerts.map((alert, i) => (
                                <div key={i} className={`text-[10px] py-1 px-2 border-l-2 ${alert.type === 'error' ? 'border-red-500 text-red-400 bg-red-900/10' : 'border-emerald-500 text-emerald-400 bg-emerald-900/10'}`}>
                                    {alert.text}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest">СТОИМОСТЬ СБОРКИ</span>
                        <span className="text-lg font-mono text-white">{cart.reduce((sum, item) => sum + item.price, 0)} ₴</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mb-4 min-h-[20px]">
                        {cart.map(c => (
                            <span key={c.id} onClick={() => removeFromCart(c.id)} className="text-[10px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 border border-white/10 cursor-pointer hover:bg-red-900 hover:text-white transition">
                                {c.categoryName} ×
                            </span>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={checkIntegrity} disabled={cart.length < 2} className="py-3 bg-zinc-900 border border-white/10 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-zinc-800 disabled:opacity-50">
                            ПРОВЕРКА
                        </button>
                        <button onClick={handleCheckout} disabled={cart.length === 0 || analyzing} className="py-3 bg-white text-black text-[10px] font-bold uppercase tracking-wider hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600">
                            {analyzing ? 'ОБРАБОТКА...' : 'ЗАКАЗАТЬ'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    </div>
  )
}