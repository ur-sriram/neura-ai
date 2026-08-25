import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router/routes';
import { AppProvider } from './context/AppContext';

export const App: React.FC = () => {
  return (
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  );
};

export default App;
