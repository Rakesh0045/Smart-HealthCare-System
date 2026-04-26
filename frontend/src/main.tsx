import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster position="top-right" toastOptions={{
        success: { style: { background: '#f0fdf4', border: '1px solid #22c55e', color: '#166534' } },
        error: { style: { background: '#fef2f2', border: '1px solid #ef4444', color: '#991b1b' } },
        duration: 4000,
      }} />
    </BrowserRouter>
  </React.StrictMode>
)
