import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// IMPORTAR OS CONTEXTOS
import { MaterialsProvider } from './MaterialsContext';
import { ProductsProvider } from './ProductsContext';
import { AuthProvider } from './AuthContext';  // <- importe o AuthProvider

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider> {/* AuthProvider deve ficar no topo para fornecer o user */}
      <MaterialsProvider>
        <ProductsProvider>
          <App />
        </ProductsProvider>
      </MaterialsProvider>
    </AuthProvider>
  </React.StrictMode>
);

reportWebVitals();
