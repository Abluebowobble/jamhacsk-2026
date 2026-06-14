import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import { App } from './App'
import { Landing } from './pages/Landing'
import { Download } from './pages/Download'

const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { path: '/', element: <Landing /> },
      { path: '/download', element: <Download /> },
      { path: '*', element: <Landing /> },
    ],
  },
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
