import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';

// Page Components
import { Login } from '../pages/Login';
import { Dashboard } from '../pages/Dashboard';
import { LiveMap } from '../pages/LiveMap';
import { Vehicles } from '../pages/Vehicles';
import { Deliveries } from '../pages/Deliveries';
import { Routes as RoutesPage } from '../pages/Routes';
import { Incidents } from '../pages/Incidents';
import { Accessibility } from '../pages/Accessibility';
import { Analytics } from '../pages/Analytics';
import { AIDecisionCenter } from '../pages/AIDecisionCenter';
import { WhatIfSimulation } from '../pages/WhatIfSimulation';
import { Network } from '../pages/Network';
import { DPR } from '../pages/DPR';
import { Offline } from '../pages/Offline';
import { Settings } from '../pages/Settings';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'live-map',
        element: <LiveMap />,
      },
      {
        path: 'vehicles',
        element: <Vehicles />,
      },
      {
        path: 'deliveries',
        element: <Deliveries />,
      },
      {
        path: 'routes',
        element: <RoutesPage />,
      },
      {
        path: 'incidents',
        element: <Incidents />,
      },
      {
        path: 'accessibility',
        element: <Accessibility />,
      },
      {
        path: 'ai-decision-center',
        element: <AIDecisionCenter />,
      },
      {
        path: 'what-if-simulation',
        element: <WhatIfSimulation />,
      },
      {
        path: 'analytics',
        element: <Analytics />,
      },
      {
        path: 'network',
        element: <Network />,
      },
      {
        path: 'dpr',
        element: <DPR />,
      },
      {
        path: 'offline',
        element: <Offline />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
