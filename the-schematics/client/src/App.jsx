import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { supabase } from './lib/supabase'

// Импорты страниц
import SchematicViewer from './features/schematic/Viewer'
import SchematicEditor from './features/schematic/Editor'
import RuleManager from './features/schematic/RuleManager'
import Home from './features/Home'
import Login from './features/auth/Login'
import Profile from './features/auth/Profile'
import ProtectedRoute from './features/auth/ProtectedRoute'

const ADMIN_EMAIL = "test@test.com" 

function App() {
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUser(user))
    
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user || null)
    })
    
    return () => listener.subscription.unsubscribe()
  }, [])

  const isUserAdmin = currentUser?.email === ADMIN_EMAIL

  return (
    <BrowserRouter>
      {/* GLOBAL NAVIGATION PILL */}
      <nav className="fixed top-0 left-0 w-full z-50 pointer-events-none p-5">
        <div className="pointer-events-auto inline-flex items-center gap-6 bg-zinc-900/90 backdrop-blur-md border border-white/10 px-6 py-3 rounded-full shadow-2xl">
            
            {/* LOGO / HOME */}
            <Link to="/" className="flex items-center gap-2 group">
                <div className="w-2 h-2 bg-white rounded-full group-hover:bg-emerald-400 transition-colors"></div>
                <span className="text-[10px] font-bold tracking-widest text-white uppercase group-hover:text-emerald-400 transition">
                    ГЛАВНАЯ
                </span>
            </Link>
            
            <div className="h-3 w-[1px] bg-white/10"></div>
            
            {/* PROFILE LINK */}
            <Link to="/profile" className="text-[10px] font-bold tracking-widest text-zinc-400 hover:text-white transition uppercase">
                ПРОФИЛЬ
            </Link>
            
            {/* ADMIN LINK (ONLY IF ADMIN) */}
            {isUserAdmin && (
              <>
                <div className="h-3 w-[1px] bg-white/10"></div>
                <Link to="/admin" className="text-[10px] font-bold tracking-widest text-amber-600 hover:text-amber-400 transition uppercase flex items-center gap-2">
                    <span>⚠ КОНСОЛЬ АДМИНА</span>
                </Link>
              </>
            )}

            {/* LOGIN STATUS INDICATOR */}
            {!currentUser && (
                <>
                    <div className="h-3 w-[1px] bg-white/10"></div>
                    <Link to="/login" className="text-[10px] font-bold tracking-widest text-zinc-500 hover:text-white transition uppercase">
                        ВХОД
                    </Link>
                </>
            )}
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/device/:slug" element={<SchematicViewer />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<Profile />} />
        
        <Route path="/admin" element={
          <ProtectedRoute>
            <SchematicEditor />
          </ProtectedRoute>
        } />
        
        <Route path="/admin/rules" element={
          <ProtectedRoute>
            <RuleManager />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App