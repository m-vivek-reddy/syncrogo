import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Use one consistent light theme until every screen has a complete dark design.
localStorage.removeItem("theme");
document.documentElement.classList.remove("dark");

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
