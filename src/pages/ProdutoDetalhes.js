import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function ProdutoDetalhes() {
    const { id } = useParams();

    const [novasMateriasPrimas, setNovasMateriasPrimas] = useState([{ materia_prima_id: '', quantidade_utilizada: '', unidade_medida: '' }]);

    const adicionarNovaLinhaMp = () => {
        const ultimaLinha = novasMateriasPrimas[novasMateriasPrimas.length - 1];
        if (ultimaLinha && (!ultimaLinha.materia_prima_id || !ultimaLinha.quantidade_utilizada || !ultimaLinha.unidade_medida)) {
            setAlertModalMessage('Por favor, preencha a matéria-prima atual antes de adicionar uma nova.');
            setAlertModalType('error');
            setIsAlertModalOpen(true);
            return;
        }
        setNovasMateriasPrimas(prev => [...prev, { materia_prima_id: '', quantidade_utilizada: '', unidade_medida: '' }]);
    };

    const removerNovaLinhaMp = (index) => {
        if (novasMateriasPrimas.length > 1) {
            setNovasMateriasPrimas(prev => prev.filter((_, i) => i !== index));
        } else {
            setAlertModalMessage('Não é possível remover a única linha.');
            setAlertModalType('error');
            setIsAlertModalOpen(true);
        }
    };

    const handleNovaMpChange = (index, field, value) => {
        const novasLinhas = [...novasMateriasPrimas];
        novasLinhas[index][field] = value;
        setNovasMateriasPrimas(novasLinhas);
    };

    const navigate = useNavigate();
    const [produto, setProduto] = useState(null);
    const [materiasPrimasDisponiveis, setMateriasPrimasDisponiveis] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [nomeProdutoEditado, setNomeProdutoEditado] = useState('');
    const [mpForm, setMpForm] = useState({ materia_prima_id: '', quantidade_utilizada: '', unidade_medida: '' });
    const [isDeleteProductModalOpen, setIsDeleteProductModalOpen] = useState(false);
    const [isRemoveMpModalOpen, setIsRemoveMpModalOpen] = useState(false);
    const [mpToRemoveId, setMpToRemoveId] = useState(null);
    const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
    const [originalProduto, setOriginalProduto] = useState(null);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [isAddMpModalOpen, setIsAddMpModalOpen] = useState(false);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
    const [alertModalMessage, setAlertModalMessage] = useState('');
    const [alertModalType, setAlertModalType] = useState('error');

    const totalCusto = useMemo(() => {
        if (!produto || !produto.materias_primas) {
            return 0;
        }
        return produto.materias_primas.reduce((acc, mp) => {
            const quantidade = parseFloat(mp.quantidade_utilizada) || 0;
            const valor = parseFloat(mp.valor_unitario) || 0;
            return acc + (quantidade * valor);
        }, 0);
    }, [produto]);

    const fetchDados = async () => {
        try {
            const mpResponse = await fetch('http://localhost:5000/materias-primas');
            const mpData = await mpResponse.json();
            setMateriasPrimasDisponiveis(mpData);
            const produtoResponse = await fetch(`http://localhost:5000/produtos-cadastrados/${id}`);
            if (!produtoResponse.ok) {
                throw new Error('Produto não encontrado.');
            }
            const produtoData = await produtoResponse.json();
            setProduto(produtoData);
            setOriginalProduto(JSON.parse(JSON.stringify(produtoData)));
            setNomeProdutoEditado(produtoData.nome_produto);
            setLoading(false);
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDados();
    }, [id]);

    const handleNomeProdutoChange = (e) => {
        setNomeProdutoEditado(e.target.value);
    };

    const handleSalvarTudo = () => {
        setIsSaveModalOpen(true);
    };

    const closeSaveModal = () => {
        setIsSaveModalOpen(false);
    };

    const confirmSave = async () => {
        try {
            await fetch(`http://localhost:5000/produtos-cadastrados/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome_produto: nomeProdutoEditado })
            });
            const promessas = [];
            for (const mpAtual of produto.materias_primas) {
                const mpOriginal = originalProduto.materias_primas.find(m => m.id === mpAtual.id);
                if (mpOriginal) {
                    if (mpAtual.quantidade_utilizada !== mpOriginal.quantidade_utilizada ||
                        mpAtual.unidade_medida !== mpOriginal.unidade_medida ||
                        mpAtual.materia_prima_id !== mpOriginal.materia_prima_id) {
                        promessas.push(
                            fetch(`http://localhost:5000/produtos-cadastrados/${id}/editar-mp/${mpAtual.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    materia_prima_id: mpAtual.materia_prima_id,
                                    quantidade_utilizada: parseFloat(mpAtual.quantidade_utilizada),
                                    unidade_medida: mpAtual.unidade_medida
                                })
                            })
                        );
                    }
                } else {
                    promessas.push(
                        fetch(`http://localhost:5000/produtos-cadastrados/${id}/adicionar-mp`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                materia_prima_id: parseInt(mpAtual.materia_prima_id),
                                quantidade_utilizada: parseFloat(mpAtual.quantidade_utilizada),
                                unidade_medida: mpAtual.unidade_medida
                            })
                        })
                    );
                }
            }
            for (const mpOriginal of originalProduto.materias_primas) {
                if (!produto.materias_primas.find(m => m.id === mpOriginal.id)) {
                    promessas.push(
                        fetch(`http://localhost:5000/produtos-cadastrados/${id}/remover-mp/${mpOriginal.id}`, {
                            method: 'DELETE'
                        })
                    );
                }
            }
            await Promise.all(promessas);
            setAlertModalMessage("Alterações salvas com sucesso!");
            setAlertModalType('success');
            setIsAlertModalOpen(true);
        } catch (err) {
            setError(err.message);
            setAlertModalMessage("Ocorreu um erro ao salvar as alterações.");
            setAlertModalType('error');
            setIsAlertModalOpen(true);
        } finally {
            closeSaveModal();
            setIsEditing(false);
            setLoading(true);
            fetchDados();
        }
    };

    const handleAdicionarMateriaPrima = () => {
        // Valida se a última linha está preenchida
        const ultimaLinha = novasMateriasPrimas[novasMateriasPrimas.length - 1];
        if (!ultimaLinha.materia_prima_id || !ultimaLinha.quantidade_utilizada || !ultimaLinha.unidade_medida) {
            setAlertModalMessage('Por favor, preencha todos os campos antes de adicionar.');
            setAlertModalType('error');
            setIsAlertModalOpen(true);
            return;
        }
        // Abre o modal de confirmação que já existe
        setIsAddMpModalOpen(true); 
    };

    const closeAddMpModal = () => {
        setIsAddMpModalOpen(false);
    };

    const confirmAddMp = async () => {
        closeAddMpModal();
        setLoading(true);
        try {
            // Cria uma requisição para cada linha preenchida
            const promessas = novasMateriasPrimas.map(novaMp =>
                fetch(`http://localhost:5000/produtos-cadastrados/${id}/adicionar-mp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        materia_prima_id: parseInt(novaMp.materia_prima_id),
                        quantidade_utilizada: parseFloat(novaMp.quantidade_utilizada),
                        unidade_medida: novaMp.unidade_medida
                    })
                })
            );

            const responses = await Promise.all(promessas);

            // Verifica se todas as requisições deram certo
            for (const response of responses) {
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Falha ao adicionar uma das matérias-primas.');
                }
            }

            setAlertModalMessage("Matérias-primas adicionadas com sucesso!");
            setAlertModalType('success');
            setIsAlertModalOpen(true);
            setNovasMateriasPrimas([{ materia_prima_id: '', quantidade_utilizada: '', unidade_medida: '' }]); // Reseta o formulário
            fetchDados(); // Atualiza a lista de MPs do produto

        } catch (err) {
            setAlertModalMessage(err.message);
            setAlertModalType('error');
            setIsAlertModalOpen(true);
            setLoading(false);
        }
    };

    const openDeleteProductModal = () => {
        setIsDeleteProductModalOpen(true);
    };
    const closeDeleteProductModal = () => {
        setIsDeleteProductModalOpen(false);
    };
    const confirmDeleteProduct = async () => {
        try {
            const response = await fetch(`http://localhost:5000/produtos-cadastrados/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                throw new Error('Falha ao excluir o produto.');
            }
            setAlertModalMessage("Produto excluído com sucesso!");
            setAlertModalType('success');
            setIsAlertModalOpen(true);
            navigate('/produtos');
        } catch (err) {
            setError(err.message);
        } finally {
            closeDeleteProductModal();
        }
    };

    const openRemoveMpModal = (mpId) => {
        setMpToRemoveId(mpId);
        setIsRemoveMpModalOpen(true);
    };
    const closeRemoveMpModal = () => {
        setIsRemoveMpModalOpen(false);
        setMpToRemoveId(null);
    };
    const confirmRemoveMp = async () => {
        closeRemoveMpModal();
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:5000/produtos-cadastrados/${id}/remover-mp/${mpToRemoveId}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao remover a matéria-prima.');
            }
            await fetchDados();
            setAlertModalMessage("Matéria-prima removida com sucesso!");
            setAlertModalType('success');
            setIsAlertModalOpen(true);
        } catch (err) {
            setAlertModalMessage(err.message);
            setAlertModalType('error');
            setIsAlertModalOpen(true);
            setLoading(false);
        }
    };

    const closeValidationModal = () => {
        setIsValidationModalOpen(false);
    };

    const handleMpChange = (mpId, field, value) => {
        if (field === 'materia_prima_id') {
            const novaMateriaPrima = materiasPrimasDisponiveis.find(
                (mp) => mp.id.toString() === value.toString()
            );
            if (novaMateriaPrima) {
                setProduto(prevProduto => ({
                    ...prevProduto,
                    materias_primas: prevProduto.materias_primas.map(mp =>
                        mp.id === mpId ? {
                            ...mp,
                            materia_prima_id: novaMateriaPrima.id,
                            descricao_produto: novaMateriaPrima.descricao_produto,
                            valor_unitario: novaMateriaPrima.custo_por_unidade_padrao,
                            unidade_medida_padrao: novaMateriaPrima.unidade_medida_padrao
                        } : mp
                    )
                }));
            }
        } else {
            setProduto(prevProduto => ({
                ...prevProduto,
                materias_primas: prevProduto.materias_primas.map(mp =>
                    mp.id === mpId ? { ...mp, [field]: value } : mp
                )
            }));
        }
    };

    const openCancelModal = () => {
        setIsCancelModalOpen(true);
    };
    const closeCancelModal = () => {
        setIsCancelModalOpen(false);
    };
    const confirmCancelEdit = () => {
        setProduto(JSON.parse(JSON.stringify(originalProduto)));
        setNomeProdutoEditado(originalProduto.nome_produto);
        setIsEditing(false);
        closeCancelModal();
    };

    if (loading) return <div className="text-center p-6 dark:text-gray-300">Carregando...</div>;
    if (error) return <div className="text-center text-red-600 p-6">Erro: {error}</div>;
    if (!produto) return <div className="text-center text-gray-600 dark:text-gray-400 p-6">Nenhum produto encontrado.</div>;

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
            <main className="pt-16 p-6 max-w-6xl mx-auto">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg mb-10 space-y-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-red-700 dark:text-red-500">
                            <span>Ficha Técnica: </span>
                            <span className={`${isEditing ? 'hidden' : ''} dark:text-gray-200`}>{produto.nome_produto}</span>
                            <input
                                type="text"
                                name="nome_produto"
                                value={nomeProdutoEditado}
                                onChange={handleNomeProdutoChange}
                                className={`border border-gray-300 rounded px-2 py-1 bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 ${isEditing ? '' : 'hidden'}`}
                            />
                        </h3>
                        <div>
                            <div className={isEditing ? '' : 'hidden'}>
                                <button onClick={handleSalvarTudo} className="bg-green-600 text-white font-semibold px-4 py-2 rounded-xl hover:bg-green-700 transition">
                                    Salvar
                                </button>
                                <button onClick={openCancelModal} className="ml-2 bg-gray-400 text-white font-semibold px-4 py-2 rounded-xl hover:bg-gray-500 transition">
                                    Cancelar
                                </button>
                            </div>
                            <div className={isEditing ? 'hidden' : ''}>
                                <button onClick={() => setIsEditing(true)} className="bg-yellow-500 text-white font-semibold px-4 py-2 rounded-xl hover:bg-yellow-600 transition">
                                    Editar
                                </button>
                                <button onClick={() => navigate('/produtos')} className="ml-2 bg-red-700 text-white font-semibold px-4 py-2 rounded-xl hover:bg-red-800 transition">
                                    Voltar
                                </button>
                                <button onClick={openDeleteProductModal} className="ml-2 bg-red-700 text-white font-semibold px-4 py-2 rounded-xl hover:bg-red-800 transition">
                                    Excluir Produto
                                </button>
                            </div>
                        </div>
                    </div>
{/* ACRESCENTAR: Novo sistema de múltiplas matérias-primas */}
<div className="space-y-4">
    <h3 className="text-xl font-semibold text-amber-600 dark:text-amber-500">
        Adicionar Matérias-Primas ao Produto
    </h3>
    {novasMateriasPrimas.map((novaMp, index) => (
        <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <select
                value={novaMp.materia_prima_id}
                onChange={(e) => handleNovaMpChange(index, 'materia_prima_id', e.target.value)}
                className="border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600"
            >
                <option value="">Selecione a matéria-prima</option>
                {materiasPrimasDisponiveis.map(mp => (
                    <option key={mp.id} value={mp.id}>{mp.descricao_produto}</option>
                ))}
            </select>
            <input
                type="number"
                placeholder="Quantidade"
                value={novaMp.quantidade_utilizada}
                onChange={(e) => handleNovaMpChange(index, 'quantidade_utilizada', e.target.value)}
                className="border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600"
            />
            <input
                type="text"
                placeholder="Unidade"
                value={novaMp.unidade_medida}
                onChange={(e) => handleNovaMpChange(index, 'unidade_medida', e.target.value)}
                className="border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600"
            />
            {/* O botão de remover só aparece se houver mais de uma linha */}
            {novasMateriasPrimas.length > 1 && (
                <button
                    type="button"
                    onClick={() => removerNovaLinhaMp(index)}
                    className="bg-red-500 text-white font-semibold px-4 py-2 rounded-xl hover:bg-red-600 transition"
                >
                    Remover
                </button>
            )}
        </div>
    ))}
    <div className="flex justify-between items-center mt-4">
        <button
            type="button"
            onClick={adicionarNovaLinhaMp}
            className="text-amber-600 font-semibold hover:underline"
        >
            + Adicionar Matéria-Prima
        </button>
        <button
            type="button"
            onClick={handleAdicionarMateriaPrima}
            className="bg-red-700 text-white font-semibold px-6 py-2 rounded-xl hover:bg-red-800 transition"
        >
            Adicionar MP
        </button>
    </div>
</div>
                </div>
                <div className="overflow-x-auto rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                    <table className="min-w-full bg-white dark:bg-gray-800 rounded-xl">
                        <thead className="bg-red-700 text-white">
                            <tr>
                                <th className="py-3 px-4 text-left">Nome MP's</th>
                                <th className="py-3 px-4 text-left">Qtd. Utilizada</th>
                                <th className="py-3 px-4 text-left">Un. Padrão</th>
                                <th className="py-3 px-4 text-left">Custo / Un. Padrão</th>
                                <th className="py-3 px-4 text-left">Subtotal</th>
                                <th className="py-3 px-4 text-left">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="dark:text-gray-300">
                            {produto.materias_primas.map((mp) => {
                                const subtotal = (parseFloat(mp.quantidade_utilizada) || 0) * (parseFloat(mp.valor_unitario) || 0);
                                return (
                                    <tr key={mp.id} className="border-b border-gray-200 dark:border-gray-700">
                                        <td className="py-3 px-4">
                                            {isEditing ? (
                                                <select
                                                    value={mp.materia_prima_id}
                                                    onChange={(e) => handleMpChange(mp.id, 'materia_prima_id', parseInt(e.target.value))}
                                                    className="border px-2 py-1 rounded w-full bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                                >
                                                    <option value="">Selecione a MP</option>
                                                    {materiasPrimasDisponiveis.map(mat => (
                                                        <option key={mat.id} value={mat.id}>{mat.descricao_produto}</option>
                                                    ))}
                                                </select>
                                            ) : ( mp.descricao_produto )}
                                        </td>
                                        <td className="py-3 px-4">
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    value={mp.quantidade_utilizada}
                                                    onChange={(e) => handleMpChange(mp.id, 'quantidade_utilizada', parseFloat(e.target.value))}
                                                    className="border px-2 py-1 rounded w-full bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                                />
                                            ) : ( mp.quantidade_utilizada )}
                                        </td>
                                        <td className="py-3 px-4">
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={mp.unidade_medida_padrao || ''}
                                                    readOnly
                                                    title="A unidade padrão é definida na tela de Matérias-Primas"
                                                    className="border px-2 py-1 rounded w-full bg-gray-100 dark:bg-gray-600"
                                                />
                                            ) : ( mp.unidade_medida_padrao || <span className="text-orange-500 font-semibold">-</span> )}
                                        </td>
                                        <td className="py-3 px-4">
                                            {mp.valor_unitario !== null
                                                ? (parseFloat(mp.valor_unitario) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                                : <span className="text-orange-500 font-semibold">Não Mapeado</span>
                                            }
                                        </td>
                                        <td className="py-3 px-4">
                                            {subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
                                        <td className="py-3 px-4">
                                            <button
                                                onClick={() => openRemoveMpModal(mp.id)}
                                                className="text-red-600 font-semibold hover:underline"
                                            >
                                                Remover
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="dark:text-white">
                            <tr className="bg-gray-50 dark:bg-gray-700">
                                <td colSpan="4" className="py-3 px-4 text-right font-bold">Total:</td>
                                <td className="py-3 px-4 font-bold">
                                    {totalCusto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </main>
            {isDeleteProductModalOpen && (
                <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                        <p className="text-lg text-gray-800 dark:text-gray-200 mb-4">Você tem certeza que deseja excluir este produto?</p>
                        <div className="flex justify-end space-x-2">
                            <button onClick={closeDeleteProductModal} className="bg-gray-300 text-gray-800 px-4 py-2 rounded-xl hover:bg-gray-400 transition">Cancelar</button>
                            <button onClick={confirmDeleteProduct} className="bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition">Excluir</button>
                        </div>
                    </div>
                </div>
            )}
            {isRemoveMpModalOpen && (
                <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                        <p className="text-lg text-gray-800 dark:text-gray-200 mb-4">Você tem certeza que deseja remover esta matéria-prima do produto?</p>
                        <div className="flex justify-end space-x-2">
                            <button onClick={closeRemoveMpModal} className="bg-gray-300 text-gray-800 px-4 py-2 rounded-xl hover:bg-gray-400 transition">Cancelar</button>
                            <button onClick={confirmRemoveMp} className="bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition">Remover</button>
                        </div>
                    </div>
                </div>
            )}
            {isValidationModalOpen && (
                <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                        <p className="text-lg text-gray-800 dark:text-gray-200 mb-4">Por favor, preencha todos os campos da matéria-prima.</p>
                        <div className="flex justify-end">
                            <button onClick={closeValidationModal} className="bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition">OK</button>
                        </div>
                    </div>
                </div>
            )}
            {isCancelModalOpen && (
                <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                        <p className="text-lg text-gray-800 dark:text-gray-200 mb-4">
                            Descartar alterações?
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                            Todas as modificações não salvas serão perdidas.
                        </p>
                        <div className="flex justify-end space-x-2">
                            <button onClick={closeCancelModal} className="bg-gray-300 text-gray-800 px-4 py-2 rounded-xl hover:bg-gray-400 transition">
                                Não, continuar editando
                            </button>
                            <button onClick={confirmCancelEdit} className="bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition">
                                Sim, descartar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {isAddMpModalOpen && (
                <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                        <p className="text-lg text-gray-800 dark:text-gray-200 mb-6">
                            Adicionar esta matéria-prima ao produto?
                        </p>
                        <div className="flex justify-end space-x-2">
                            <button onClick={closeAddMpModal} className="bg-gray-300 text-gray-800 px-4 py-2 rounded-xl hover:bg-gray-400 transition">
                                Cancelar
                            </button>
                            <button onClick={confirmAddMp} className="bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition">
                                Sim, adicionar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {isSaveModalOpen && (
                <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                        <p className="text-lg text-gray-800 dark:text-gray-200 mb-6">
                            Confirmar e salvar todas as alterações?
                        </p>
                        <div className="flex justify-end space-x-2">
                            <button onClick={closeSaveModal} className="bg-gray-300 text-gray-800 px-4 py-2 rounded-xl hover:bg-gray-400 transition">
                                Cancelar
                            </button>
                            <button onClick={confirmSave} className="bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition">
                                Sim, salvar
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
                                className={`text-white font-semibold px-6 py-2 rounded-xl transition ${
                                    alertModalType === 'success'
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

export default ProdutoDetalhes;