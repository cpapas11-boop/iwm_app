import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from '../full_version';

const el = document.getElementById('root');
if (el) {
  const root = createRoot(el);
  root.render(<App />);
}
