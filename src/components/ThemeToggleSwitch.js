import React from 'react';

import { useTheme } from '../context/ThemeContext';

export default function ThemeToggleSwitch() {

  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative flex items-center h-8 w-14
        cursor-pointer rounded-full p-1
        transition-colors duration-300 ease-in-out
        ${theme === 'light' ? 'bg-gray-300' : 'bg-gray-700'}
      `}
    >
      <span
        className={`
          absolute h-6 w-6
          bg-white rounded-full
          flex items-center justify-center
          transition-transform duration-300 ease-in-out
          ${theme === 'light' ? 'transform translate-x-0' : 'transform translate-x-6'}
        `}
      >
        {theme === 'light' ? '☀️' : '🌙'}
      </span>
    </button>
  );
}