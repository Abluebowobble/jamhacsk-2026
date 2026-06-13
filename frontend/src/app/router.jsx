import { createBrowserRouter } from 'react-router-dom'
import { AppProviders } from './AppProviders'
import { RequireAuth, RequireOnboarded } from './guards'
import { AppShell } from './AppShell'
import { AuthPage } from '../pages/AuthPage'
import { OnboardingPage } from '../pages/OnboardingPage'
import { PairPage } from '../pages/PairPage'
import { OverviewPage } from '../pages/OverviewPage'
import { DeviceDetailPage } from '../pages/DeviceDetailPage'
import { NotFoundPage } from '../pages/NotFoundPage'

import { SummaryPreview } from '../pages/SummaryPreview'

export const router = createBrowserRouter([
  // TEMP: public preview route for DeviceSummaryCard — remove after review.
  { path: '/preview', element: <SummaryPreview /> },
  {
    element: <AppProviders />,
    children: [
      // Public: account creation / login.
      { path: '/login', element: <AuthPage /> },

      // Everything below requires a signed-in user.
      {
        element: <RequireAuth />,
        children: [
          // Onboarding + pairing live before the dashboard gate so the user can
          // get a household and pair a device to clear it.
          { path: '/onboarding', element: <OnboardingPage /> },
          { path: '/pair', element: <PairPage /> },

          // The control panel — only once the user has a household (and a device,
          // unless they deferred pairing this session).
          {
            element: <RequireOnboarded />,
            children: [
              {
                path: '/',
                element: <AppShell />,
                children: [
                  { index: true, element: <OverviewPage /> },
                  { path: 'devices/:deviceId', element: <DeviceDetailPage /> },
                  { path: '*', element: <NotFoundPage /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
])
