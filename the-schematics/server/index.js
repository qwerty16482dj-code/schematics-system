const express = require('express')
const cors = require('cors')
const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')

// Загружаем переменные окружения
dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

// Подключение к Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

// --- 1. МАГАЗИН (VENDOR) ---

app.post('/api/vendor/create', async (req, res) => {
  const { userId, name } = req.body
  const { data, error } = await supabase
    .from('vendors')
    .insert({ owner_id: userId, name, rating: 5.0 })
    .select()
    .single()
  
  if (error) return res.status(400).json({ error: error.message })
  res.json({ success: true, vendor: data })
})

app.post('/api/vendor/add-product', async (req, res) => {
  const { vendorId, categoryId, price, condition, stock } = req.body
  const { error } = await supabase.from('market_offers').insert({
    vendor_id: vendorId,
    part_category_id: categoryId,
    price,
    condition,
    stock
  })
  if (error) return res.status(400).json({ error: error.message })
  res.json({ success: true })
})

app.post('/api/vendor/delete-product', async (req, res) => {
  const { offerId } = req.body
  const { error } = await supabase.from('market_offers').delete().eq('id', offerId)
  if (error) return res.status(400).json({ error: error.message })
  res.json({ success: true })
})

// --- 2. ЗАЯВКИ (REQUESTS) ---

app.post('/api/request-device', async (req, res) => {
  const { userId, name, notes } = req.body
  const { error } = await supabase.from('device_requests').insert({
      user_id: userId || null,
      device_name: name,
      notes: notes
  })
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

// --- 3. ВАЛИДАЦИЯ (COMPATIBILITY) ---

app.post('/api/validate-cart', async (req, res) => {
  const { cart } = req.body 
  if (!cart || cart.length < 2) return res.json({ alerts: [] })

  const { data: rules } = await supabase.from('assembly_rules').select('*')
  const alerts = []

  if (rules) {
    rules.forEach(rule => {
        const hasA = cart.includes(rule.category_a_id)
        const hasB = cart.includes(rule.category_b_id)
        if (hasA && hasB) {
            alerts.push({ type: rule.severity, text: rule.message })
        }
    })
  }
  res.json({ alerts })
})

// --- 4. ОФОРМЛЕНИЕ ЗАКАЗА (CHECKOUT) ---

app.post('/api/checkout', async (req, res) => {
    const { cart, total, contact, userId } = req.body

    // 1. Создаем запись заказа
    const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({ 
            user_id: userId || null, 
            total_price: total, 
            status: 'paid',
            customer_contact: contact 
        })
        .select()
        .single()

    if (orderErr) return res.status(500).json({ error: orderErr.message })

    // 2. Создаем записи товаров (items)
    const items = cart.map(item => ({
        order_id: order.id,
        vendor_id: item.vendorId,
        part_name: item.categoryName,
        price: item.price
    }))

    const { error: itemsErr } = await supabase.from('order_items').insert(items)
    
    if (itemsErr) return res.status(500).json({ error: itemsErr.message })

    res.json({ success: true, orderId: order.id })
})

// --- 5. ВИКИ-ДВИЖОК (WIKI ENGINE) ---

app.get('/api/wiki/:catId', async (req, res) => {
  const { catId } = req.params
  const { data, error } = await supabase
    .from('wiki_articles')
    .select('*')
    .eq('category_id', catId)
    .maybeSingle() 

  if (error) return res.status(500).json({ error: error.message })
  res.json({ article: data || null })
})

app.post('/api/wiki/save', async (req, res) => {
  const { catId, content, userId, userEmail, comment } = req.body

  let { data: article } = await supabase.from('wiki_articles').select('id').eq('category_id', catId).maybeSingle()
  
  if (!article) {
    const { data: newArt, error } = await supabase
        .from('wiki_articles')
        .insert({ category_id: catId, content: '' })
        .select()
        .single()
    if (error) return res.status(500).json({ error: error.message })
    article = newArt
  }

  await supabase.from('wiki_revisions').insert({
      article_id: article.id,
      user_id: userId,
      user_email: userEmail,
      content_snapshot: content,
      comment: comment || 'Update'
  })

  const { error: updError } = await supabase
    .from('wiki_articles')
    .update({ content: content, updated_at: new Date() })
    .eq('id', article.id)

  if (updError) return res.status(500).json({ error: updError.message })

  res.json({ success: true })
})

app.get('/api/wiki/history/:catId', async (req, res) => {
  const { catId } = req.params
  const { data: article } = await supabase.from('wiki_articles').select('id').eq('category_id', catId).maybeSingle()
  
  if (!article) return res.json({ history: [] })

  const { data: history } = await supabase
    .from('wiki_revisions')
    .select('*')
    .eq('article_id', article.id)
    .order('created_at', { ascending: false })

  res.json({ history: history || [] })
})

// --- ЗАПУСК ---
const PORT = 3000
app.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`)
})