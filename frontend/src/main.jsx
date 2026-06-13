import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { PhoneFrame } from './app/PhoneFrame'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PhoneFrame />
  </StrictMode>,
)
