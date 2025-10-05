import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Board";
import LoginPage from "./pages/Login";
import MaterialsPage, { AuthProvider, MaterialsProvider } from "./pages/MaterialsPage";
import ProductsPage from "./pages/Produtos";
import CostsPage from "./pages/Custos";
import UploadPage from "./pages/Upload";
import Upload2 from "./pages/Upload2";
import ProdutoDetalhes from "./pages/ProdutoDetalhes";

import { ThemeProvider } from "./context/ThemeContext";

function AppContent() {
  const location = useLocation();
  const hideNavbarRoutes = ["/login"];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {!hideNavbarRoutes.includes(location.pathname) && <Navbar />}
      <div className="p-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/materias-primas"
            element={
              <AuthProvider>
                <MaterialsProvider>
                  <MaterialsPage />
                </MaterialsProvider>
              </AuthProvider>
            }
          />
          <Route path="/produtos" element={<ProductsPage />} />
          <Route path="/custos" element={<CostsPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/upload2" element={<Upload2 />} />
          <Route path="/produtos-cadastrados/:id" element={<ProdutoDetalhes />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </Router>
  );
}