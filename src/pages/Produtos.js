import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function ProdutosPage() {
  const [nomeProduto, setNomeProduto] = useState("");
  const [materiasPrimasDisponiveis, setMateriasPrimasDisponiveis] = useState([]);
  const [mpForms, setMpForms] = useState([{ id: "", quantidade: "", unidade: "" }]);
  const [produtosCadastrados, setProdutosCadastrados] = useState([]);
  const navigate = useNavigate();
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isRemoveMpModalOpen, setIsRemoveMpModalOpen] = useState(false);
  const [mpIndexToRemove, setMpIndexToRemove] = useState(null);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [alertModalMessage, setAlertModalMessage] = useState('');

  const loadProdutosCadastrados = async () => {
    try {
      const response = await fetch(`${API_URL}/produtos-cadastrados`);
      if (!response.ok) {
        throw new Error('Falha ao carregar produtos cadastrados.');
      }
      const data = await response.json();
      setProdutosCadastrados(data);
    } catch (error)      {
      console.error("Erro ao buscar produtos cadastrados:", error);
    }
  };

  useEffect(() => {
    const loadMateriasPrimas = async () => {
      try {
        const response = await fetch(`${API_URL}/materias-primas`);
        if (!response.ok) {
          throw new Error("Falha ao carregar matérias-primas");
        }
        const data = await response.json();
        setMateriasPrimasDisponiveis(data);
      } catch (error) {
        console.error("Erro ao buscar MP's:", error);
      }
    };
    loadMateriasPrimas();
    loadProdutosCadastrados(); // Carrega os produtos na primeira vez
  }, []);

  const handleMateriaChange = (index, field, value) => {
    const novosForms = [...mpForms];
    novosForms[index][field] = value;
    setMpForms(novosForms);
  };
  
  const adicionarMateriaPrima = () => {
    if (mpForms.some(form => !form.id || !form.quantidade || !form.unidade)) {
        setAlertModalMessage('Por favor, preencha a matéria-prima atual antes de adicionar uma nova.');
        setIsAlertModalOpen(true);
        return;
    }
    setMpForms(prev => [...prev, { id: '', quantidade: '', unidade: '' }]);
  };

  const salvarProduto = (e) => {
      e.preventDefault();
      if (!nomeProduto || mpForms.some(form => !form.id || !form.quantidade || !form.unidade)) {
          setAlertModalMessage('Por favor, preencha o nome do produto e todos os campos da matéria-prima.');
          setIsAlertModalOpen(true);
          return;
      }
      setIsSaveModalOpen(true);
  };

  const closeSaveModal = () => {
      setIsSaveModalOpen(false);
  };

  const confirmSave = async () => {
      const produtoData = {
          nome_produto: nomeProduto,
          materias_primas: mpForms.map(form => ({
              materia_prima_id: parseInt(form.id),
              quantidade_utilizada: parseFloat(form.quantidade),
              unidade_medida: form.unidade
          }))
      };
      try {
          const response = await fetch(`${API_URL}/cadastrar-produto`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(produtoData),
          });
          if (!response.ok) {
              throw new Error("Falha ao cadastrar o produto.");
          }
          // CORREÇÃO: Usa o modal de alerta para sucesso
          setAlertModalMessage("Produto cadastrado com sucesso!");
          setIsAlertModalOpen(true);
          
          setNomeProduto("");
          setMpForms([{ id: "", quantidade: "", unidade: "" }]);
          loadProdutosCadastrados(); // Atualiza a lista de produtos
      } catch (error) {
          console.error("Erro ao cadastrar produto:", error);
          // CORREÇÃO: Usa o modal de alerta para erro
          setAlertModalMessage("Erro ao cadastrar o produto.");
          setIsAlertModalOpen(true);
      } finally {
          closeSaveModal();
      }
  };
  
  const removerMateriaPrima = (index) => {
      setMpIndexToRemove(index);
      setIsRemoveMpModalOpen(true);
  };

  const closeRemoveMpModal = () => {
      setIsRemoveMpModalOpen(false);
      setMpIndexToRemove(null);
  };

  const confirmRemoveMp = () => {
      if (mpIndexToRemove === null) return;
      setMpForms(prev => prev.filter((_, i) => i !== mpIndexToRemove));
      closeRemoveMpModal();
  };

  const handleVisualizarClick = (produtoId) => {
    navigate(`/produtos-cadastrados/${produtoId}`);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
      <div className="pt-16 p-6 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-red-700 dark:text-red-500 mb-6 text-center">
          Cadastro de Produtos
        </h2>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg mb-10 space-y-6 border border-gray-200 dark:border-gray-700">
            <div className="space-y-2">
                <label className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Nome do Produto
                </label>
                <input
                type="text"
                placeholder="Nome do Produto"
                value={nomeProduto}
                onChange={(e) => setNomeProduto(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
            </div>
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-amber-600 dark:text-amber-500">
              Matérias-Primas
            </h3>
            {mpForms.map((mpFormItem, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                    <select
                        value={mpFormItem.id}
                        onChange={(e) =>
                        handleMateriaChange(index, "id", e.target.value)
                        }
                        className="border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    >
                        <option value="">Selecione a matéria-prima</option>
                        {materiasPrimasDisponiveis.map((mp) => (
                        <option key={mp.id} value={mp.id}>
                            {mp.descricao_produto}
                        </option>
                        ))}
                    </select>
                    <input
                        type="number"
                        placeholder="Quantidade"
                        value={mpFormItem.quantidade}
                        onChange={(e) =>
                        handleMateriaChange(index, "quantidade", e.target.value)
                        }
                        className="border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    />
                    <input
                        type="text"
                        placeholder="Unidade"
                        value={mpFormItem.unidade}
                        onChange={(e) =>
                        handleMateriaChange(index, "unidade", e.target.value)
                        }
                        className="border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    />
                    {mpForms.length > 1 && (
                        <button
                            type="button"
                            onClick={() => removerMateriaPrima(index)}
                            className="bg-red-500 text-white font-semibold px-4 py-2 rounded-xl hover:bg-red-600 transition"
                        >
                            Remover
                        </button>
                    )}
                </div>
            ))}
          </div>
          <div className="flex justify-between items-center mt-6">
              <button
                type="button"
                onClick={adicionarMateriaPrima}
                className="text-amber-600 font-semibold hover:underline"
              >
                + Adicionar Matéria-Prima
              </button>
              <button
                type="button"
                onClick={salvarProduto}
                className="bg-red-700 text-white font-semibold px-6 py-2 rounded-xl hover:bg-red-600 transition shadow-md"
              >
                Adicionar Produto
              </button>
          </div>
        </div>

        <div className="tabela-produtos-cadastrados mt-10">
          <h2 className="text-3xl font-bold text-red-700 dark:text-red-500 mb-6 text-center">
            Produtos Cadastrados
          </h2>
          <div className="overflow-x-auto rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg">
              <thead className="bg-red-700 text-white">
                <tr>
                  <th className="py-3 px-4 text-left">ID_Produto</th>
                  <th className="py-3 px-4 text-left">Produto</th>
                  <th className="py-3 px-4 text-left">Quantidades - MP</th>
                  <th className="py-3 px-4 text-left">Total_Produto</th>
                  <th className="py-3 px-4 text-left">Ações</th>
                </tr>
              </thead>
              <tbody className="dark:text-gray-300">
                {produtosCadastrados.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-gray-500 dark:text-gray-400">
                      Nenhum produto cadastrado
                    </td>
                  </tr>
                ) : (
                  produtosCadastrados.map((p) => (
                    <tr key={p.ID_Produto} className="border-b border-gray-200 dark:border-gray-700">
                      <td className="py-3 px-4">{p.ID_Produto}</td>
                      <td className="py-3 px-4">{p.Produto}</td>
                      <td className="py-3 px-4">{p.Quantidades_MP}</td>
                      <td className="py-3 px-4">
                        {(parseFloat(p.Total_Produto) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="py-3 px-4">
                        <button onClick={() => handleVisualizarClick(p.ID_Produto)} className="text-orange-600 hover:underline">Visualizar</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {isSaveModalOpen && (
              <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                      <p className="text-lg text-gray-800 dark:text-gray-200 mb-6">
                          Confirmar o cadastro deste novo produto?
                      </p>
                      <div className="flex justify-end space-x-2">
                          <button onClick={closeSaveModal} className="bg-gray-300 text-gray-800 px-4 py-2 rounded-xl hover:bg-gray-400 transition">
                              Cancelar
                          </button>
                          <button onClick={confirmSave} className="bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition">
                              Sim, cadastrar
                          </button>
                      </div>
                  </div>
              </div>
          )}
            {isRemoveMpModalOpen && (
            <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                    <p className="text-lg text-gray-800 dark:text-gray-200 mb-6">
                        Remover esta matéria-prima do formulário?
                    </p>
                    <div className="flex justify-end space-x-2">
                        <button onClick={closeRemoveMpModal} className="bg-gray-300 text-gray-800 px-4 py-2 rounded-xl hover:bg-gray-400 transition">
                            Cancelar
                        </button>
                        <button onClick={confirmRemoveMp} className="bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition">
                            Sim, remover
                        </button>
                    </div>
                </div>
            </div>
        )}
        {isAlertModalOpen && (
          <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg text-center max-w-sm">
                  <p className="text-lg text-gray-800 dark:text-gray-200 mb-6">
                      {alertModalMessage}
                  </p>
                  <div className="flex justify-center">
                      <button 
                          onClick={() => setIsAlertModalOpen(false)} 
                          className="bg-red-700 text-white font-semibold px-6 py-2 rounded-xl hover:bg-red-600 transition"
                      >
                          OK
                      </button>
                  </div>
              </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

export default ProdutosPage;