import React, { useState } from "react";
import { auth } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");
  try {
    if (isRegister) {
      await createUserWithEmailAndPassword(auth, email, password);
      // Após cadastro, não logar e não redirecionar automaticamente
      alert("Cadastro realizado com sucesso! Agora faça login.");
      setIsRegister(false); // muda para tela de login
      setEmail("");
      setPassword("");
    } else {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/"); // só redireciona no login
    }
  } catch (err) {
    const message =
      err.code === "auth/user-not-found"
        ? "Usuário não encontrado."
        : err.code === "auth/wrong-password"
        ? "Senha incorreta."
        : err.code === "auth/email-already-in-use"
        ? "Email já está em uso."
        : "Erro ao autenticar. Tente novamente.";
    setError(message);
  }
};


  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-10 sm:p-12">
        {/* Título destacado */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-10 text-center tracking-wide">
           Calculadora Industrial
        </h1>

        {error && (
          <div className="mb-6 p-3 text-center text-red-700 bg-red-100 rounded-lg font-semibold shadow-inner">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <label className="block">
            <span className="text-gray-700 font-semibold">Email</span>
            <input
              type="email"
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400
                         focus:border-indigo-500 focus:ring-2 focus:ring-indigo-400 focus:outline-none transition"
            />
          </label>

          <label className="block">
            <span className="text-gray-700 font-semibold">Senha</span>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400
                         focus:border-indigo-500 focus:ring-2 focus:ring-indigo-400 focus:outline-none transition"
            />
          </label>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg
                       transition duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-indigo-400"
          >
            {isRegister ? "Cadastrar" : "Entrar"}
          </button>
        </form>

        <p className="mt-8 text-center text-gray-600 font-medium">
          {isRegister ? "Já tem uma conta?" : "Não tem uma conta?"}{" "}
          <button
            onClick={() => {
              setError("");
              setIsRegister(!isRegister);
            }}
            className="text-indigo-600 font-bold hover:underline focus:outline-none"
          >
            {isRegister ? "Entre aqui" : "Cadastre-se"}
          </button>
        </p>
      </div>
    </div>
  );
}
