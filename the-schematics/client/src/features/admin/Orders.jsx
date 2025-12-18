import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Link } from 'react-router-dom'

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  // Загружаем заказы и вложенные товары
  useEffect(() => {
    fetchOrders()
  }, [])

  async function fetchOrders() {
    setLoading(true)
    // Supabase умеет делать вложенные запросы (join)
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          part_name,
          price,
          quantity
        )
      `)
      .order('created_at', { ascending: false }) // Сначала новые

    if (error) console.error('Ошибка:', error)
    else setOrders(data || [])
    
    setLoading(false)
  }

  // Функция смены статуса
  const updateStatus = async (orderId, newStatus) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)
    
    if (error) alert('Ошибка обновления')
    else {
      // Обновляем список локально, чтобы не делать лишний запрос
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    }
  }

  if (loading) return <div className="min-h-screen bg-gray-900 text-cyan-500 p-10 font-mono"> ЗАГРУЗКА CRM...</div>

  return (
    <div className="min-h-screen bg-[#050b14] text-white font-mono p-8">
      
      {/* HEADER */}
<div className="w-full min-h-screen h-auto overflow-y-auto bg-[#050b14] text-white font-mono p-8 pb-20">        <div>
            <h1 className="text-3xl text-cyan-400 tracking-widest font-bold"> ADMIN: SALES_LOG</h1>
            <p className="text-gray-500 text-sm">УПРАВЛЕНИЕ ЗАКАЗАМИ И ОТГРУЗКАМИ</p>
        </div>
        <div className="flex gap-4">
             <Link to="/admin" className="text-gray-400 hover:text-white">[ Зоны ]</Link>
             <Link to="/admin/rules" className="text-gray-400 hover:text-white">[ Правила ]</Link>
             <Link to="/" className="text-gray-400 hover:text-white">[ На Сайт ]</Link>
        </div>
      </div>

      {/* ТАБЛИЦА ЗАКАЗОВ */}
      <div className="space-y-4">
        {orders.length === 0 && <div className="text-center text-gray-600 py-10">ЗАКАЗОВ ПОКА НЕТ</div>}

        {orders.map(order => (
            <div key={order.id} className={`border p-4 rounded bg-[#0a0f1e] transition ${
                order.status === 'new' ? 'border-blue-500/50' : 
                order.status === 'paid' ? 'border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 
                'border-gray-700 opacity-70'
            }`}>
                
                {/* ЗАГОЛОВОК ЗАКАЗА */}
                <div className="flex justify-between items-start mb-4 border-b border-gray-800 pb-2">
                    <div>
                        <div className="text-xl font-bold text-white">
                            ЗАКАЗ #{order.id} 
                            <span className="text-sm font-normal text-gray-400 ml-2">
                                от {new Date(order.created_at).toLocaleString()}
                            </span>
                        </div>
                        <div className="text-cyan-500 text-sm mt-1">Клиент: {order.customer_contact}</div>
                    </div>
                    
                    <div className="text-right">
                        <div className="text-2xl font-bold text-green-400">{order.total_price} ₽</div>
                        
                        {/* СТАТУС И КНОПКИ */}
                        <div className="mt-2 flex items-center gap-2 justify-end">
                            <span className={`px-2 py-1 text-xs font-bold rounded uppercase ${
                                order.status === 'paid' ? 'bg-green-900 text-green-300' :
                                order.status === 'shipped' ? 'bg-gray-700 text-gray-300' :
                                'bg-blue-900 text-blue-300'
                            }`}>
                                {order.status}
                            </span>

                            {order.status === 'paid' && (
                                <button 
                                    onClick={() => updateStatus(order.id, 'shipped')}
                                    className="bg-cyan-700 hover:bg-cyan-600 text-white text-xs px-3 py-1 rounded"
                                >
                                    ОТПРАВИТЬ 📦
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* СПИСОК ТОВАРОВ ВНУТРИ ЗАКАЗА */}
                <div className="bg-black/30 p-3 rounded">
                    <table className="w-full text-sm text-left text-gray-400">
                        <thead>
                            <tr className="border-b border-gray-800 text-xs uppercase">
                                <th className="pb-2">Наименование</th>
                                <th className="pb-2 text-right">Кол-во</th>
                                <th className="pb-2 text-right">Цена</th>
                                <th className="pb-2 text-right">Сумма</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {order.order_items.map((item, idx) => (
                                <tr key={idx} className="hover:text-gray-200">
                                    <td className="py-2">{item.part_name}</td>
                                    <td className="py-2 text-right">{item.quantity}</td>
                                    <td className="py-2 text-right">{item.price}</td>
                                    <td className="py-2 text-right text-white">{item.price * item.quantity}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

            </div>
        ))}
      </div>
    </div>
  )
}