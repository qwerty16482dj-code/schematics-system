// Если переменная задана (на Vercel), используем её.
// Если нет (локально), используем localhost.
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';