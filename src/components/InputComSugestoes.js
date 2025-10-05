import React, { useState, useEffect, useRef } from 'react';

export default function InputComSugestoes({
  opcoes,
  propriedadeExibicao,
  valor,
  onChange,
  placeholder
}) {
  const [inputValue, setInputValue] = useState(valor || '');
  const [sugestoesFiltradas, setSugestoesFiltradas] = useState([]);
  const [listaVisivel, setListaVisivel] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    setInputValue(valor || '');
  }, [valor]);

  const handleInputChange = (e) => {
    const textoDigitado = e.target.value;
    setInputValue(textoDigitado);
    onChange(textoDigitado);

    if (textoDigitado && opcoes) {
      const filtradas = opcoes.filter(opcao =>
        (opcao[propriedadeExibicao] || '').toLowerCase().includes(textoDigitado.toLowerCase())
      );
      setSugestoesFiltradas(filtradas);
    } else {
      setSugestoesFiltradas(opcoes || []);
    }
    setListaVisivel(true);
  };

  const handleSugestaoClick = (sugestao) => {
    onChange(sugestao);
    setInputValue(sugestao[propriedadeExibicao]);
    setListaVisivel(false);
  };

  useEffect(() => {
    function handleClickFora(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setListaVisivel(false);
      }
    }
    document.addEventListener("mousedown", handleClickFora);
    return () => {
      document.removeEventListener("mousedown", handleClickFora);
    };
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => {
            setSugestoesFiltradas(opcoes || []);
            setListaVisivel(true);
        }}
        placeholder={placeholder}
        className="w-full pl-4 pr-10 py-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
      />
      {!inputValue && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
          </div>
      )}

      {listaVisivel && sugestoesFiltradas && sugestoesFiltradas.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          <ul>
            {sugestoesFiltradas.map((sugestao, index) => (
              <li
                key={index}
                onClick={() => handleSugestaoClick(sugestao)}
                className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
              >
                {sugestao[propriedadeExibicao]}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}