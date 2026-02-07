import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import './index.css';
import { router } from './router';
import { VisualizerProvider } from './contexts/VisualizerContext';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <VisualizerProvider>
      <RouterProvider router={router} />
    </VisualizerProvider>
  </React.StrictMode>,
);
