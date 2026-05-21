import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppProvider } from '@/app/providers/AppProvider';
import { installGlobalErrorLogging } from '@/core/telemetry/global-error-logging';
import './index.css';

installGlobalErrorLogging();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider />
  </React.StrictMode>,
);
