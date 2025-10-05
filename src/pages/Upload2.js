import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./ImportManual.css";
import InputComSugestoes from "../components/InputComSugestoes";
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function ImportarManual() {
  const navigate = useNavigate();

  const [listaEmissores, setListaEmissores] = useState([]);
  const [listaCNPJs, setListaCNPJs] = useState([]);
  const [listaCodigos, setListaCodigos] = useState([]);
  const [listaDescricoes, setListaDescricoes] = useState([]);

  useEffect(() => {
      const fetchTodasSugestoes = async () => {
          try {
              const urls = [
                  `${API_URL}/materias-primas`,
                  `${API_URL}/sugestoes/emissores_cnpj`,
                  `${API_URL}/sugestoes/codigos_produto`
              ];

              const responses = await Promise.all(urls.map(url => fetch(url)));

              for (const response of responses) {
                  if (!response.ok) {
                      throw new Error("Falha ao carregar uma das listas de sugestões.");
                  }
              }

              const [dataDescricoes, dataEmissores, dataCodigos] = await Promise.all(responses.map(res => res.json()));

              setListaDescricoes(dataDescricoes);
              setListaEmissores(dataEmissores);
              setListaCNPJs(dataEmissores);
              setListaCodigos(dataCodigos);

          } catch (error) {
              console.error("Erro ao buscar sugestões:", error);
          }
      };

      fetchTodasSugestoes();
  }, []);

  const [materiasPrimas, setMateriasPrimas] = useState([
    { emissor: "", cnpj: "", codProduto: "", descricao: "", unidade: "", quantidade: "", valorUnitario: "" },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [alertModalMessage, setAlertModalMessage] = useState('');
  const [alertModalType, setAlertModalType] = useState('error');


  const handleChange = (index, field, value) => {
    const novaLista = [...materiasPrimas];
    novaLista[index][field] = value;
    setMateriasPrimas(novaLista);
  };

  const adicionarLinha = () => {
      const ultimaLinha = materiasPrimas[materiasPrimas.length - 1];

      if (!ultimaLinha.descricao || !ultimaLinha.quantidade || !ultimaLinha.valorUnitario) {
          setAlertModalMessage('Por favor, preencha a linha atual antes de adicionar uma nova.');
          setAlertModalType('error');
          setIsAlertModalOpen(true);
          return;
      }

      setMateriasPrimas([
          ...materiasPrimas,
          { emissor: "", cnpj: "", codProduto: "", descricao: "", unidade: "", quantidade: "", valorUnitario: "" },
      ]);
  };

  const removerLinha = (index) => {
      if (materiasPrimas.length === 1) {
          setAlertModalMessage('Não é possível remover a única linha.');
          setAlertModalType('error');
          setIsAlertModalOpen(true);
          return;
      }
      
      const novaLista = materiasPrimas.filter((_, i) => i !== index);
      setMateriasPrimas(novaLista);
  };

const salvarMateriaPrima = () => {
    const linhasPreenchidas = materiasPrimas.filter(mp =>
        Object.values(mp).some(valor => valor.toString().trim() !== "")
    );

    if (linhasPreenchidas.length === 0) {
        setAlertModalMessage("Nenhum dado válido para salvar. Preencha pelo menos uma linha.");
        setAlertModalType('error');
        setIsAlertModalOpen(true);
        return;
    }

    const linhaIncompleta = linhasPreenchidas.some(mp =>
        !mp.emissor.trim() ||
        !mp.cnpj.trim() ||
        !mp.codProduto.trim() ||
        !mp.descricao.trim() ||
        !mp.unidade.trim() ||
        !mp.quantidade.toString().trim() ||
        !mp.valorUnitario.toString().trim()
    );

    if (linhaIncompleta) {
        setAlertModalMessage("Existem linhas incompletas. Por favor, preencha todos os campos antes de salvar.");
        setAlertModalType('error');
        setIsAlertModalOpen(true);
        return;
    }

    setIsSaveModalOpen(true);
};

const confirmSave = async () => {
    const dadosParaSalvar = materiasPrimas.filter(mp =>
        mp.emissor || mp.cnpj || mp.codProduto || mp.descricao || mp.unidade || mp.quantidade || mp.valorUnitario
    );

    setIsLoading(true);

    try {
        const response = await fetch(`${API_URL}/adicionar-manual`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosParaSalvar),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Ocorreu um erro no servidor.');
        }

        setAlertModalMessage("Matérias-primas adicionadas com sucesso!");
        setAlertModalType('success');
        setIsAlertModalOpen(true);

        setMateriasPrimas([
            { emissor: "", cnpj: "", codProduto: "", descricao: "", unidade: "", quantidade: "", valorUnitario: "" },
        ]);

    } catch (error) {
        setAlertModalMessage(`Erro: ${error.message}`);
        setAlertModalType('error');
        setIsAlertModalOpen(true);
        console.error("Erro na requisição:", error);
    } finally {
        setIsLoading(false);
        setIsSaveModalOpen(false);
    }
};

  return (
    <div className="importar-container">
      <div className="header-importar">
        <button 
          className="importar-button"
          onClick={() => navigate("/upload")}
        >
          Importar Nota Fiscal
        </button>
      </div>

      <table className="tabela-mp">
        <thead>
          <tr>
            <th>Emissor</th>
            <th>CNPJ Emissor</th>
            <th>Cód Produto</th>
            <th>Descrição</th>
            <th>Unidade</th>
            <th>Quantidade</th>
            <th>Valor Unitário</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {materiasPrimas.map((mp, index) => (
            <tr key={index}>
              <td>
                <InputComSugestoes
                  placeholder="Nome..."
                  opcoes={listaEmissores}
                  propriedadeExibicao="emissor"
                  valor={mp.emissor}
                  onChange={(selecionado) => {
                    if (typeof selecionado === 'object' && selecionado !== null) {
                      handleChange(index, "emissor", selecionado.emissor);
                      handleChange(index, "cnpj", selecionado.cnpj || '');
                    } else {
                      handleChange(index, "emissor", selecionado);
                    }
                  }}
                />
              </td>
              <td>
                <InputComSugestoes
                  placeholder="CNPJ..."
                  opcoes={listaCNPJs}
                  propriedadeExibicao="cnpj"
                  valor={mp.cnpj}
                  onChange={(selecionado) => {
                    if (typeof selecionado === 'object' && selecionado !== null) {
                      handleChange(index, "cnpj", selecionado.cnpj);
                      handleChange(index, "emissor", selecionado.emissor || '');
                    } else {
                      handleChange(index, "cnpj", selecionado);
                    }
                  }}
                />
              </td>
              <td>
                <InputComSugestoes
                  placeholder="Código..."
                  opcoes={listaCodigos}
                  propriedadeExibicao="codProduto"
                  valor={mp.codProduto}
                  onChange={(selecionado) => {
                    const valor = typeof selecionado === 'object' ? selecionado.codProduto : selecionado;
                    handleChange(index, "codProduto", valor);
                  }}
                />
              </td>
              <td>
                <InputComSugestoes
                  placeholder="Descrição..."
                  opcoes={listaDescricoes}
                  propriedadeExibicao="descricao_produto"
                  valor={mp.descricao}
                  onChange={(selecionado) => {
                    const valor = typeof selecionado === 'object' ? selecionado.descricao_produto : selecionado;
                    handleChange(index, "descricao", valor);
                  }}
                />
              </td>
              <td>
                <input
                  type="text"
                  placeholder="Unidade..."
                  value={mp.unidade}
                  onChange={(e) => handleChange(index, "unidade", e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  placeholder="Quantidade..."
                  value={mp.quantidade}
                  onChange={(e) => handleChange(index, "quantidade", e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  placeholder="Valor Unitário..."
                  value={mp.valorUnitario}
                  onChange={(e) => handleChange(index, "valorUnitario", e.target.value)}
                />
              </td>
                  <td>
        {materiasPrimas.length > 1 && (
            <button
                type="button"
                onClick={() => removerLinha(index)}
                className="bg-red-700 text-white font-semibold px-4 py-2 rounded-xl hover:bg-red-600 transition"
            >
                Remover
            </button>
        )}
    </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="acoes">
        <button className="add-materia-prima" onClick={adicionarLinha}>
          + Adicionar Matéria-Prima
        </button>
        <button className="w-[90px] bg-red-700 text-white font-semibold px-2 py-1 rounded-xl hover:bg-red-600 transition" onClick={salvarMateriaPrima}>
          Salvar
        </button>
      </div>
        {isSaveModalOpen && (
          <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
              <div className="bg-white p-6 rounded-xl shadow-lg text-center max-w-sm">
                  <p className="text-lg text-gray-800 mb-6">
                      Confirmar o salvamento destas matérias-primas?
                  </p>
                  <div className="flex justify-end space-x-2">
                      <button onClick={() => setIsSaveModalOpen(false)} className="bg-gray-300 text-gray-800 px-4 py-2 rounded-xl hover:bg-gray-400 transition">
                          Cancelar
                      </button>
                      <button onClick={confirmSave} className="bg-green-700 text-white px-4 py-2 rounded-xl hover:bg-green-600 transition" disabled={isLoading}>
                          {isLoading ? 'Salvando...' : 'Sim, salvar'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {isAlertModalOpen && (
          <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
              <div className="bg-white p-6 rounded-xl shadow-lg text-center max-w-sm">
                  <p className="text-lg text-gray-800 mb-6">
                      {alertModalMessage}
                  </p>
                  <div className="flex justify-center">
                      <button 
                          onClick={() => setIsAlertModalOpen(false)} 
                          className={`text-white font-semibold px-6 py-2 rounded-xl transition ${
                              alertModalType === 'success' 
                                  ? 'bg-green-600 hover:bg-green-700' 
                                  : 'bg-red-700 hover:bg-red-600'
                          }`}
                      >
                          OK
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

export default ImportarManual;
