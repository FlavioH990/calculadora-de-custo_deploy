import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";

export default function TestNavbar() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Links do menu
  const links = [
    { to: "/", label: "Painel" },
    { to: "/upload", label: "Notas Fiscais" },
    { to: "/materias-primas", label: "Matérias-Primas" },
    { to: "/produtos", label: "Produtos" },
    { to: "/custos", label: "Custos" },
  ];

  return (
    <nav className="fixed top-0 left-0 w-full bg-red-700 shadow-md z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Título / Logo */}
          <div className="flex-shrink-0 text-white font-bold text-xl tracking-wide select-none">
            Calculadora de Custos
          </div>

          {/* Botão mobile menu */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              type="button"
              aria-controls="mobile-menu"
              aria-expanded={menuOpen}
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-600 focus:ring-white transition"
            >
              <span className="sr-only">Abrir menu</span>
              {!menuOpen ? (
                // ícone hamburguer
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" />
                </svg>
              ) : (
                // ícone fechar
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>

          {/* Menu desktop */}
          <ul className="hidden md:flex md:space-x-8">
            {links.map(({ to, label }) => {
              const isActive = location.pathname === to;
              return (
                <li key={to}>
                  <Link
                    to={to}
                    className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition
                      ${
                        isActive
                          ? "bg-gray-400 text-white shadow-lg"
                          : "text-white hover:bg-gray-400 hover:text-red-800"
                      }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Menu mobile */}
      {menuOpen && (
        <div className="md:hidden bg-red-600" id="mobile-menu">
          <ul className="px-2 pt-2 pb-4 space-y-1 sm:px-3">
            {links.map(({ to, label }) => {
              const isActive = location.pathname === to;
              return (
                <li key={to}>
                  <Link
                    to={to}
                    onClick={() => setMenuOpen(false)} // fecha menu ao clicar
                    className={`block px-3 py-2 rounded-md text-base font-medium transition
                      ${
                        isActive
                          ? "bg-yellow-500 text-white shadow-lg"
                          : "text-white hover:bg-yellow-400 hover:text-red-800"
                      }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </nav>
  );
}
