import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../../config' // <-- ВАЖНО: ПРАВИЛЬНЫЙ ИМПОРТ

// Иконки
const Icons = {
  Box: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
  Briefcase: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  Logout: () => <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
  Plus: () => <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>,
  Trash: () => <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
}

export default function Profile() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const [orders, setOrders] = useState([]) 
  const [vendor, setVendor] = useState(null) 
  const [myProducts, setMyProducts] = useState([]) 
  const [sales, setSales] = useState([]) 
  const [categories, setCategories] = useState([])
  
  const [newProduct, setNewProduct] = useState({ catId: '', price: '', cond: 'Used Original', stock: 1 })

  useEffect(() => { loadProfileData() }, [])

  async function loadProfileData() {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { navigate('/login'); return }
        setUser(user)

        const { data: ordersData } = await supabase.from('orders').select('*, order_items(*)').eq('user_id', user.id).order('created_at', { ascending: false })
        setOrders(ordersData || [])

        const { data: vendorData } = await supabase.from('vendors').select('*').eq('owner_id', user.id).maybeSingle()
        setVendor(vendorData)

        if (vendorData) {
            const { data: products } = await supabase.from('market_offers').select(`*, part_categories(name)`).eq('vendor_id', vendorData.id).order('id', { ascending: false })
            setMyProducts(products || [])
            const { data: salesData } = await supabase.from('order_items').select('*, orders(id, created_at, customer_contact, status)').eq('vendor_id', vendorData.id).order('id', { ascending: false })
            setSales(salesData || [])
            const { data: cats } = await supabase.from('part_categories').select('id, name').order('name')
            setCategories(cats || [])
            if(cats?.length && !newProduct.catId) setNewProduct(prev => ({ ...prev, catId: cats[0].id }))
        }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const createShop = async () => {
    const name = prompt("Название магазина:")
    if (!name) return
    try {
        // ИСПОЛЬЗУЕМ API_URL
        const res = await fetch(`${API_URL}/api/vendor/create`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, name }) })
        const result = await res.json()
        if (result.success) loadProfileData()
        else alert(result.error)
    } catch (e) { alert("Ошибка сети") }
  }

  const addProduct = async (e) => {
    e.preventDefault()
    if (!vendor) return
    try {
        // ИСПОЛЬЗУЕМ API_URL
        const res = await fetch(`${API_URL}/api/vendor/add-product`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vendorId: vendor.id, categoryId: newProduct.catId, price: newProduct.price, condition: newProduct.cond, stock: newProduct.stock })
        })
        const result = await res.json()
        if (result.success) { alert("Лот добавлен"); loadProfileData() } else alert(result.error)
    } catch (e) { alert("Ошибка сети") }
  }

  const deleteProduct = async (id) => {
    if (!window.confirm("Удалить?")) return
    try {
        // ИСПОЛЬЗУЕМ API_URL
        await fetch(`${API_URL}/api/vendor/delete-product`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ offerId: id }) })
        loadProfileData()
    } catch (e) { console.error(e) }
  }

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/login') }

  if (loading) return <div className="min-h-screen bg-zinc-950 text-zinc-500 flex items-center justify-center font-mono text-xs pt-24">ЗАГРУЗКА ДАННЫХ...</div>

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans selection:bg-white/20 p-8 pt-24">
      <div className="flex justify-between items-end border-b border-white/10 pb-6 mb-12">
        <div>
            <h1 className="text-2xl text-white font-medium tracking-tight mb-1">Панель Управления</h1>
            <p className="text-zinc-500 text-xs font-mono uppercase tracking-wider">ID: {user?.id?.split('-')[0]} • {user?.email}</p>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-white transition-colors border border-white/10 px-4 py-2 hover:bg-white/5 rounded">
            ВЫХОД <Icons.Logout/>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-6">
            <div className="flex items-center gap-3 text-white border-b border-white/10 pb-4">
                <Icons.Box />
                <h2 className="text-sm font-bold tracking-widest uppercase">История Заказов</h2>
            </div>
            {orders.length === 0 && <div className="text-zinc-600 text-sm italic py-4">Заказов не найдено.</div>}
            <div className="space-y-3">
                {orders.map(order => (
                    <div key={order.id} className="group bg-zinc-900/50 border border-white/5 hover:border-white/20 transition-all p-5 rounded-sm">
                        <div className="flex justify-between items-center mb-4">
                            <span className="font-mono text-xs text-zinc-500">ЗАКАЗ #{order.id}</span>
                            <span className="text-white font-medium">{order.total_price} ₴</span>
                        </div>
                        <div className="space-y-2">
                            {order.order_items.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm text-zinc-400">
                                    <span>{item.part_name}</span>
                                    <span className="text-zinc-600">x1</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-zinc-600 uppercase flex justify-between">
                            <span>{new Date(order.created_at).toLocaleDateString()}</span>
                            <span className="text-emerald-500">ОПЛАЧЕНО</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        <div className="space-y-6">
            <div className="flex items-center gap-3 text-white border-b border-white/10 pb-4">
                <Icons.Briefcase />
                <h2 className="text-sm font-bold tracking-widest uppercase">Консоль Продавца</h2>
            </div>
            {!vendor ? (
                <div className="bg-zinc-900/30 border border-dashed border-zinc-800 p-12 text-center rounded-sm">
                    <p className="text-zinc-500 mb-6 text-sm">Профиль продавца не активирован.</p>
                    <button onClick={createShop} className="bg-white text-black text-xs font-bold px-6 py-3 hover:bg-zinc-200 transition uppercase tracking-wider">Создать Магазин</button>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-zinc-900 border border-white/5 p-4 rounded-sm">
                            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Репутация</div>
                            <div className="text-2xl text-white font-light">{vendor.rating} <span className="text-zinc-600 text-sm">/ 5.0</span></div>
                        </div>
                        <div className="bg-zinc-900 border border-white/5 p-4 rounded-sm">
                            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Продаж</div>
                            <div className="text-2xl text-white font-light">{sales.length}</div>
                        </div>
                    </div>
                    <div className="bg-zinc-900/50 border border-white/5 p-5 rounded-sm">
                        <div className="text-xs font-bold text-white uppercase mb-4 flex items-center gap-2"><Icons.Plus/> Добавить Товар</div>
                        <form onSubmit={addProduct} className="grid grid-cols-12 gap-3">
                            <select className="col-span-6 bg-black border border-white/10 text-white text-xs p-3 outline-none" value={newProduct.catId} onChange={e => setNewProduct({...newProduct, catId: e.target.value})}>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <select className="col-span-6 bg-black border border-white/10 text-white text-xs p-3 outline-none" value={newProduct.cond} onChange={e => setNewProduct({...newProduct, cond: e.target.value})}>
                                <option value="Used Original">Б/У Оригинал</option>
                                <option value="New Original">Новый Оригинал</option>
                                <option value="New Copy">Новая Копия</option>
                                <option value="Refurbished">Восстановленный</option>
                            </select>
                            <input type="number" placeholder="Цена (₴)" className="col-span-4 bg-black border border-white/10 text-white text-xs p-3 outline-none" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} required />
                            <input type="number" placeholder="Кол-во" className="col-span-4 bg-black border border-white/10 text-white text-xs p-3 outline-none" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} required />
                            <button className="col-span-4 bg-white text-black font-bold text-xs hover:bg-zinc-200 transition uppercase">ДОБАВИТЬ</button>
                        </form>
                    </div>
                    <div className="space-y-1">
                        <div className="text-xs text-zinc-600 uppercase tracking-wider mb-2">Активные Лоты</div>
                        {myProducts.length === 0 && <div className="text-zinc-700 text-xs italic">Склад пуст.</div>}
                        {myProducts.map(p => (
                            <div key={p.id} className="flex justify-between items-center bg-zinc-900 p-3 border border-white/5 hover:border-white/20 transition-colors text-xs">
                                <div className="flex flex-col"><span className="text-zinc-200 font-medium">{p.part_categories?.name}</span><span className="text-zinc-600 text-[10px]">{p.condition}</span></div>
                                <div className="flex items-center gap-4"><span className="text-white font-mono">{p.price} ₴</span><button onClick={() => deleteProduct(p.id)} className="text-zinc-600 hover:text-red-500 transition-colors"><Icons.Trash/></button></div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
      </div>
    </div>
  )
}