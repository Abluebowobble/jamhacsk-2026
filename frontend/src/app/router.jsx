import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from './AppShell'
import { OverviewPage } from '../pages/OverviewPage'
import { DeviceDetailPage } from '../pages/DeviceDetailPage'
import { NotFoundPage } from '../pages/NotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'devices/:deviceId', element: <DeviceDetailPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
