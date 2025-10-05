import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import ThemeToggleSwitch from '../components/ThemeToggleSwitch';
import { useTheme } from '../context/ThemeContext';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function Dashboard() {
  const { theme } = useTheme();

  const chartTextColor = theme === 'dark' ? '#E5E7EB' : '#374151';
  const chartTooltipBg = theme === 'dark' ? '#1F2937' : '#FFFFFF';
  const chartGridColor = theme === 'dark' ? '#4B5563' : '#E5E7EB';

  const renderCustomPieLabel = ({ cx, cy, midAngle, outerRadius, percent, nome }) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 25;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill={chartTextColor}
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={12}
      >
        {`${nome} (${(percent * 100).toFixed(0)}%)`}
      </text>
    );
  };

  const [products, setProducts] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [consultasHistorico, setConsultasHistorico] = useState([]);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [productsResponse, materialsResponse] = await Promise.all([
          fetch(`${API_URL}/produtos-cadastrados`),
          fetch(`${API_URL}/materias-primas`),
        ]);
        if (!productsResponse.ok || !materialsResponse.ok) {
          throw new Error("Falha ao buscar dados do servidor.");
        }
        const productsData = await productsResponse.json();
        const materialsData = await materialsResponse.json();
        setProducts(productsData);
        setMaterials(materialsData);
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error("Erro ao carregar dados do dashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  useEffect(() => {
        try {
            const historicoSalvo = JSON.parse(localStorage.getItem('consultasHistorico') || '[]');
            setConsultasHistorico(historicoSalvo);
        } catch (error) {
            console.error("Erro ao carregar histórico do localStorage:", error);
            setConsultasHistorico([]);
        }
  }, []);

  const somaTotalProdutos = products.reduce(
    (acc, p) => acc + (p.Total_Produto || 0),
    0
  );
  const totalProdutos = products.length;
  const precoMedioProduto =
    totalProdutos > 0 ? somaTotalProdutos / totalProdutos : 0;
  const totalMateriasPrimas = materials.length;
  const chartData = products.map((p) => ({
    nome: p.Produto,
    custo: p.Total_Produto || 0,
  }));
  const chartPizza = products.map((p) => ({
    nome: p.Produto,
    valor: somaTotalProdutos > 0 ? ((p.Total_Produto || 0) / somaTotalProdutos) * 100 : 0,
  }));
  const COLORS = ["#b91c1c", "#ef4444", "#fca5a5", "#4b5563", "#9ca3af", "#e5e7eb"];

  const handleLimparConsultas = () => {
    setIsClearModalOpen(true);
  };
  const closeClearModal = () => {
    setIsClearModalOpen(false);
  };
  const confirmClearHistory = () => {
    try {
      localStorage.removeItem('consultasHistorico');
      setConsultasHistorico([]);
    } catch (error) {
      console.error("Erro ao limpar o histórico:", error);
    } finally {
      closeClearModal();
    }
  };

  if (loading) {
    return <div className="text-center p-10 pt-20 dark:text-gray-300">Carregando dados do dashboard...</div>;
  }
  if (error) {
    return <div className="text-center p-10 pt-20 text-red-600">Erro ao carregar dados: {error}</div>;
  }

  return (
    <div className="min-h-screen w-full bg-gray-100 dark:bg-gray-900">
      <main className="pt-16 p-6 w-full">
        <div className="flex justify-between items-center mb-2">
            <h2 className="text-4xl font-bold text-red-700 dark:text-red-500 mb-2">Dashboard</h2>
            <ThemeToggleSwitch />
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Visão geral dos seus produtos e custos.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 w-full">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center">
            <h3 className="text-2xl font-bold text-red-600">
              {somaTotalProdutos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Custo Total dos Produtos
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center">
            <h3 className="text-2xl font-bold text-amber-600">
              {totalProdutos}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Produtos Cadastrados</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center">
            <h3 className="text-2xl font-bold text-red-600">
              {precoMedioProduto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Custo Médio por Produto</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center">
            <h3 className="text-2xl font-bold text-amber-600">
              {totalMateriasPrimas}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Matérias-Primas Cadastradas
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 w-full">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
            <h4 className="text-lg font-semibold text-red-600 dark:text-red-500 mb-2">
              Custo por Produto
            </h4>
            {chartData.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-12">Nenhum produto para exibir</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                  <XAxis dataKey="nome" tick={{ fontSize: 12, fill: chartTextColor }} />
                  <YAxis tickFormatter={(v) => `R$ ${v.toLocaleString('pt-BR')}`} tick={{ fontSize: 12, fill: chartTextColor }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: chartTooltipBg,
                      borderColor: chartGridColor
                    }}
                    labelStyle={{ color: chartTextColor }}
                    itemStyle={{ color: '#dc2626' }}
                    formatter={(value) => [value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), "Custo"]}
                  />
                  <Legend wrapperStyle={{ color: chartTextColor }} />
                  <Line type="monotone" dataKey="custo" stroke="#dc2626" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 w-full">
            <h4 className="text-lg font-semibold mb-4 text-red-600 dark:text-red-500">
              Participação no Custo Total
            </h4>
            {chartPizza.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-12">Nenhum dado para exibir</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={chartPizza}
                    dataKey="valor"
                    nameKey="nome"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={renderCustomPieLabel}
                  >
                    {chartPizza.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                   <Tooltip
                    contentStyle={{
                      backgroundColor: chartTooltipBg,
                      borderColor: chartGridColor
                    }}
                    labelStyle={{ color: chartTextColor }}
                    // AQUI ESTÁ A CORREÇÃO:
                    itemStyle={{ color: chartTextColor }}
                    formatter={(value, name) => [`${name}: ${value.toFixed(2)}%`, null]}
                  />
                  <Legend wrapperStyle={{ color: chartTextColor }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <div className="mt-10 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-semibold text-red-600 dark:text-red-500">
              Histórico de Consultas Salvas
            </h4>
            {consultasHistorico.length > 0 && (
              <button
                onClick={handleLimparConsultas}
                className="bg-red-700 text-white font-semibold text-sm py-2 px-4 rounded-xl hover:bg-red-600 transition shadow-md"
              >
                Limpar Consultas
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b-2 border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="py-3 px-4 text-left text-gray-600 dark:text-gray-400 font-bold">Data da Consulta</th>
                  <th className="py-3 px-4 text-left text-gray-600 dark:text-gray-400 font-bold">Produto</th>
                  <th className="py-3 px-4 text-left text-gray-600 dark:text-gray-400 font-bold">Qtd. Produzida</th>
                  <th className="py-3 px-4 text-left text-gray-600 dark:text-gray-400 font-bold">Custo Total</th>
                </tr>
              </thead>
              <tbody>
                {consultasHistorico.length > 0 ? (
                  consultasHistorico.map(consulta => (
                    <tr key={consulta.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                        {new Date(consulta.dataConsulta).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{consulta.nomeProduto}</td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{consulta.qtdProduzida}</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-200 font-semibold">
                        {consulta.custoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center py-10 text-gray-500 dark:text-gray-400">
                      Nenhuma consulta foi salva ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        {isClearModalOpen && (
        <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg text-center max-w-sm">
            <p className="text-lg text-gray-800 dark:text-gray-200 mb-6">
                Apagar todo o histórico de consultas?
            </p>
            <div className="flex justify-end space-x-2">
                <button onClick={closeClearModal} className="bg-gray-300 text-gray-800 px-4 py-2 rounded-xl hover:bg-gray-400 transition">
                Cancelar
                </button>
                <button onClick={confirmClearHistory} className="bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition">
                Sim, apagar
                </button>
            </div>
            </div>
        </div>
        )}
      </main>
    </div>
  );
}