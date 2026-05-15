import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { store } from './store';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              borderRadius: '12px',
              padding: '12px 16px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              border: '1px solid #e5e7eb',
            },
            success: {
              iconTheme: { primary: '#4f46e5', secondary: '#fff' },
              style: {
                borderLeft: '3px solid #4f46e5',
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                borderRadius: '12px',
                padding: '12px 16px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                border: '1px solid #e5e7eb',
                borderLeftColor: '#4f46e5',
              },
            },
            error: {
              style: {
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                borderRadius: '12px',
                padding: '12px 16px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                border: '1px solid #e5e7eb',
                borderLeft: '3px solid #ef4444',
              },
            },
          }}
        />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
