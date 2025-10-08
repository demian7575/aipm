import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './views/App.js';
import './index.css';
import './lib/i18n.js';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
