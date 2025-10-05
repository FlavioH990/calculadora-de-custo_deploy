import React, { useState } from 'react';
import './NotasFiscais.css';
import { useNavigate } from "react-router-dom";
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function NotasFiscais() {
  const navigate = useNavigate();
  const [arquivos, setArquivos] = useState([]);
  const [isLoading, setIsLoading] = useState(false); // Para feedback de "enviando"
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState('error'); // 'error' ou 'success'

  const handleFileChange = (e) => {
    setArquivos(e.target.files);

  };

  const handleUpload = async () => {
        if (arquivos.length === 0) {
            setModalMessage('Por favor, selecione arquivos para enviar.');
            setModalType('error');
            setIsModalOpen(true);
            return;
        }

        const formData = new FormData();
        for (let i = 0; i < arquivos.length; i++) {
            formData.append('files[]', arquivos[i]);
        }

        setIsLoading(true); // Ativa o estado de carregamento

        try {
            const response = await fetch(`${API_URL}/upload-xml`, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                // Se a resposta não for OK, lança um erro com a mensagem do servidor
                throw new Error(data.error || 'Ocorreu um erro no servidor.');
            }

            const mensagemSucesso = data.count === 1
                ? `Sucesso! 1 arquivo processado e salvo no banco de dados.`
                : `Sucesso! ${data.count} arquivos processados e salvos no banco de dados.`;
            
            setModalMessage(mensagemSucesso);
            setModalType('success');
            setIsModalOpen(true);
            setArquivos([]); // Limpa a seleção de arquivos após o sucesso

        } catch (error) {
            setModalMessage(`Erro: ${error.message}`);
            setModalType('error');
            setIsModalOpen(true);
        } finally {
            setIsLoading(false); // Desativa o estado de carregamento
        }
    };

  return (
    <div className="notas-fiscais-container">
      {/* Header com botão no canto direito */}
      <div className="header-notas">
        <h2>Envie suas Notas Fiscais</h2>
        <button 
          className="bg-red-700 text-white px-3 py-2 rounded hover:bg-red-600 transition importar-button"
          onClick={() => navigate("/upload2")}
        >
          Importar Manualmente
        </button>
      </div>

      <div className="upload-box">
        <p>Selecione os arquivos <b>XML/PDF</b>.</p>

        <input
          type="file"
          multiple
          onChange={handleFileChange}
          accept=".xml,.pdf"
          style={{ display: 'none' }}
          id="file-input"
        />

        <label htmlFor="file-input" className="custom-file-button">
          Selecionar Arquivos
        </label>

        <p>
          {arquivos.length > 0
            ? `${arquivos.length} arquivo(s) selecionado(s)`
            : 'Nenhum arquivo selecionado'}
        </p>

          <button
              onClick={handleUpload}
              disabled={arquivos.length === 0 || isLoading} // Desativa o botão durante o envio
              className="upload-button"
          >
              {isLoading ? 'Enviando...' : 'Enviar para o Servidor'}
          </button>
      </div>

        {isModalOpen && (
          <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
              <div className="bg-white p-6 rounded-xl shadow-lg text-center max-w-sm">
                  <p className="text-lg text-gray-800 mb-6">
                      {modalMessage}
                  </p>
                  <div className="flex justify-center">
                      <button 
                          onClick={() => setIsModalOpen(false)} 
                          className={`text-white font-semibold px-6 py-2 rounded-xl transition ${
                              modalType === 'success' 
                                  ? 'bg-green-600 hover:bg-green-700' 
                                  : 'bg-red-600 hover:bg-red-700'
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

export default NotasFiscais;
