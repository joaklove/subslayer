import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyTheme, getTheme, readStoredThemeId } from './lib/themes'

// 在首帧之前把主题变量写进 :root，避免刷新时闪一下默认配色
applyTheme(getTheme(readStoredThemeId()))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
