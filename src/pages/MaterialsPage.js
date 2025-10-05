import React, { createContext, useContext, useEffect, useState } from "react";
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const fakeUser = { uid: "mock-user-id" };
const AuthContext = createContext();
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    useEffect(() => { setUser(fakeUser); }, []);
    return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>;
}
export function useAuth() { return useContext(AuthContext); }
const MaterialsContext = createContext();
export function MaterialsProvider({ children }) {
    const [materials, setMaterials] = useState([]);
    const { user } = useAuth();
    const loadMaterials = async () => {
        if (!user) return;
        try {
            const response = await fetch(`${API_URL}/materias-primas`);
            if (!response.ok) throw new Error("Erro ao buscar dados do servidor.");
            const data = await response.json();
            setMaterials(data);
        } catch (error) {
            console.error("Erro ao carregar materiais:", error);
            setMaterials([]);
        }
    };
    useEffect(() => { loadMaterials(); }, [user]);
    return (
        <MaterialsContext.Provider value={{ materials, setMaterials, reloadMaterials: loadMaterials }}>
            {children}
        </MaterialsContext.Provider>
    );
}
export function useMaterials() { return useContext(MaterialsContext); }

export default function MaterialsPage() {
    const { materials, reloadMaterials } = useMaterials();
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [modalOpen, setModalOpen] = useState(false);
    const [materialToDelete, setMaterialToDelete] = useState(null);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [savePayload, setSavePayload] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [quickFilter, setQuickFilter] = useState('all');
    const [columnFilters, setColumnFilters] = useState({
        descricao_produto: '',
        data_emissao_nota: '',
        unidade_medida_nf: '',
        valor_unitario_nf: '',
        peso_bruto: '',
        unidade_medida_padrao: '',
        custo_por_unidade_padrao: ''
    });

    const handleColumnFilterChange = (e) => {
        const { name, value } = e.target;
        setColumnFilters(prev => ({ ...prev, [name]: value }));
    };

    const materiaisFiltrados = materials.filter((m) => {
        const globalSearchMatch = m.descricao_produto && m.descricao_produto.toLowerCase().includes(searchTerm.toLowerCase());
        const quickFilterMatch = quickFilter === 'unmapped' ? m.unidade_medida_padrao === null : true;
        const columnFilterMatch = Object.keys(columnFilters).every(key => {
            const filterValue = String(columnFilters[key] || '').toLowerCase();
            if (!filterValue) return true;
            const materialValue = String(m[key] || '').toLowerCase();
            return materialValue.includes(filterValue);
        });
        return globalSearchMatch && quickFilterMatch && columnFilterMatch;
    });

    const handleEditClick = (material) => {
        setEditingId(material.id);
        setEditForm({
            descricao_produto: material.descricao_produto,
            unidade_medida_nf: material.unidade_medida_nf,
            valor_unitario_nf: material.valor_unitario_nf,
            peso_bruto: material.peso_bruto || '',
            unidade_medida_padrao: material.unidade_medida_padrao || 'KG',
        });
    };
    const handleSaveClick = (materialId, originalDescription) => {
        setSavePayload({ materialId, originalDescription });
        setIsSaveModalOpen(true);
    };
    const confirmSave = async () => {
        if (!savePayload) return;
        const { materialId, originalDescription } = savePayload;
        try {
            const promessas = [];
            promessas.push(fetch(`${API_URL}/mapear-atributos`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    descricao_produto: originalDescription,
                    peso_bruto: parseFloat(editForm.peso_bruto) || null,
                    unidade_medida_padrao: editForm.unidade_medida_padrao,
                }),
            }));
            promessas.push(fetch(`${API_URL}/materias-primas/${materialId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    descricao_produto: editForm.descricao_produto,
                    unidade_medida: editForm.unidade_medida_nf,
                    valor_unitario: parseFloat(editForm.valor_unitario_nf) || 0,
                }),
            }));
            const responses = await Promise.all(promessas);
            for (const response of responses) {
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`Falha ao salvar. Erro: ${errorData.error || response.statusText}`);
                }
            }
            setEditingId(null);
            await reloadMaterials();
        } catch (error) {
            console.error("Erro ao salvar:", error);
            alert(error.message || "Erro ao salvar as alterações.");
        } finally {
            setIsSaveModalOpen(false);
            setSavePayload(null);
        }
    };
    const handleCancelClick = () => {
        setIsCancelModalOpen(true);
    };
    const confirmCancel = () => {
        setEditingId(null);
        setIsCancelModalOpen(false);
    };
    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setEditForm((prev) => ({ ...prev, [name]: value }));
    };
    const confirmDelete = (material) => {
        setMaterialToDelete(material);
        setModalOpen(true);
    };
    const handleDelete = async () => {
        if (!materialToDelete) return;
        try {
            const response = await fetch(`${API_URL}/materias-primas/${materialToDelete.id}`, { method: "DELETE" });
            if (!response.ok) throw new Error("Erro ao excluir material.");
            setModalOpen(false);
            await reloadMaterials();
        } catch (error) {
            alert(`Erro: ${error.message}`);
        }
    };
    const formatCurrency = (value) => {
        if (value === null || value === undefined) return '0,00';
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };
    const formatNumber = (value) => {
        if (value === null || value === undefined) return '';
        return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 relative">
            <main className="pt-16 p-6">
                <h2 className="text-3xl font-bold text-red-700 dark:text-red-500 mb-6 text-center">Matérias-Primas</h2>
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <input
                        type="text"
                        placeholder="Pesquisar por nome..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-80 border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-800 dark:text-white dark:border-gray-600"
                    />
                    <select
                        value={quickFilter}
                        onChange={(e) => setQuickFilter(e.target.value)}
                        className="w-full md:w-72 border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-800 dark:text-white dark:border-gray-600"
                    >
                        <option value="all">Exibir todos os materiais</option>
                        <option value="unmapped">Exibir somente não mapeados</option>
                    </select>
                </div>
                <div className="overflow-x-auto rounded-lg shadow-md max-h-[70vh] overflow-y-auto">
                    <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg">
                        <thead className="bg-red-700 text-white sticky top-0 z-10">
                            <tr>
                                <th className="py-3 px-4 text-left">Nome da Matéria-Prima</th>
                                <th className="py-3 px-4 text-left">Data Emissão</th>
                                <th className="py-3 px-4 text-left">Unidade (NF)</th>
                                <th className="py-3 px-4 text-left">Preço (NF)</th>
                                <th className="py-3 px-4 text-left">Peso Bruto</th>
                                <th className="py-3 px-4 text-left">Un. Padrão</th>
                                <th className="py-3 px-4 text-left">Custo / Un. Padrão</th>
                                <th className="py-3 px-4 text-left">Ações</th>
                            </tr>
                            <tr className="bg-red-800">
                                <td><input type="text" name="descricao_produto" value={columnFilters.descricao_produto} onChange={handleColumnFilterChange} className="w-full bg-red-800 text-white p-2 placeholder-gray-300" placeholder="Filtrar por nome..."/></td>
                                <td><input type="text" name="data_emissao_nota" value={columnFilters.data_emissao_nota} onChange={handleColumnFilterChange} className="w-full bg-red-800 text-white p-2 placeholder-gray-300" placeholder="Filtrar..."/></td>
                                <td><input type="text" name="unidade_medida_nf" value={columnFilters.unidade_medida_nf} onChange={handleColumnFilterChange} className="w-full bg-red-800 text-white p-2 placeholder-gray-300" placeholder="Filtrar..."/></td>
                                <td><input type="text" name="valor_unitario_nf" value={columnFilters.valor_unitario_nf} onChange={handleColumnFilterChange} className="w-full bg-red-800 text-white p-2 placeholder-gray-300" placeholder="Filtrar..."/></td>
                                <td><input type="text" name="peso_bruto" value={columnFilters.peso_bruto} onChange={handleColumnFilterChange} className="w-full bg-red-800 text-white p-2 placeholder-gray-300" placeholder="Filtrar..."/></td>
                                <td><input type="text" name="unidade_medida_padrao" value={columnFilters.unidade_medida_padrao} onChange={handleColumnFilterChange} className="w-full bg-red-800 text-white p-2 placeholder-gray-300" placeholder="Filtrar..."/></td>
                                <td><input type="text" name="custo_por_unidade_padrao" value={columnFilters.custo_por_unidade_padrao} onChange={handleColumnFilterChange} className="w-full bg-red-800 text-white p-2 placeholder-gray-300" placeholder="Filtrar..."/></td>
                                <td></td>
                            </tr>
                        </thead>
                        <tbody className="dark:text-gray-300">
                            {materiaisFiltrados.map((m) => (
                                <tr key={m.id} className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700">
                                    <td className="py-3 px-4">
                                        {editingId === m.id ? ( <input type="text" value={editForm.descricao_produto} onChange={handleFormChange} name="descricao_produto" className="w-full p-2 border border-gray-300 rounded bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600" /> ) : ( m.descricao_produto )}
                                    </td>
                                    <td className="py-3 px-4">
                                        {new Date(m.data_emissao_nota).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="py-3 px-4">
                                        {editingId === m.id ? ( <input type="text" value={editForm.unidade_medida_nf} onChange={handleFormChange} name="unidade_medida_nf" className="w-24 p-2 border border-gray-300 rounded bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600" /> ) : ( m.unidade_medida_nf )}
                                    </td>
                                    <td className="py-3 px-4">
                                        {editingId === m.id ? ( <input type="number" value={editForm.valor_unitario_nf} onChange={handleFormChange} name="valor_unitario_nf" className="w-24 p-2 border border-gray-300 rounded bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600" /> ) : ( formatCurrency(m.valor_unitario_nf) )}
                                    </td>
                                    <td className="py-3 px-4">
                                        {editingId === m.id ? (
                                        <input
                                            type="number"
                                            value={editForm.peso_bruto}
                                            onChange={handleFormChange}
                                            name="peso_bruto"
                                            className="w-24 p-2 border border-gray-300 rounded bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                        />
                                        ) : (
                                        m.peso_bruto
                                            ? formatNumber(m.peso_bruto)
                                            : (
                                                m.unidade_padrao === "LT"
                                                ? <span className="text-orange-500 font-semibold">Mapear</span>
                                                : 1
                                            )
                                        )}
                                    </td>
                                    <td className="py-3 px-4">
                                        {editingId === m.id ? (
                                            <select value={editForm.unidade_medida_padrao} onChange={handleFormChange} name="unidade_medida_padrao" className="p-2 border border-gray-300 rounded bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600">
                                                <option value="KG">KG</option>
                                                <option value="LT">LT</option>
                                                <option value="UN">UN</option>
                                                <option value="MT">MT</option>
                                            </select>
                                        ) : ( m.unidade_medida_padrao || <span className="text-orange-500 font-semibold">Mapear</span> )}
                                    </td>
                                    <td className="py-3 px-4">{formatCurrency(m.custo_por_unidade_padrao)}</td>
                                    <td className="py-3 px-4">
                                        <div className="flex space-x-2">
                                            {editingId === m.id ? (
                                                <>
                                                    <button onClick={() => handleSaveClick(m.id, m.descricao_produto)} className="bg-green-700 text-white px-3 py-2 rounded-xl hover:bg-green-600 transition">Salvar</button>
                                                    <button onClick={handleCancelClick} className="bg-gray-700 text-white px-3 py-2 rounded-xl hover:bg-gray-600 transition shadow-md">Cancelar</button>
                                                </>
                                            ) : (
                                                <button onClick={() => handleEditClick(m)} className="bg-yellow-600 text-white px-3 py-2 rounded-xl hover:bg-yellow-500 transition shadow-md">Editar</button>
                                            )}
                                            <button onClick={() => confirmDelete(m)} className="bg-red-700 text-white px-3 py-2 rounded-xl hover:bg-red-600 transition shadow-md" >Excluir</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
            {modalOpen && (
                <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                        <p className="text-lg text-gray-800 dark:text-gray-200 mb-4">Você tem certeza que deseja excluir esta matéria-prima?</p>
                        <div className="flex justify-end space-x-2">
                            <button onClick={() => setModalOpen(false)} className="bg-gray-300 text-gray-800 px-4 py-2 rounded-xl hover:bg-gray-400 transition">Cancelar</button>
                            <button onClick={handleDelete} className="bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition">Excluir</button>
                        </div>
                    </div>
                </div>
            )}
            {isSaveModalOpen && (
                <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                        <p className="text-lg text-gray-800 dark:text-gray-200 mb-6">
                            Confirmar e salvar as alterações para este material?
                        </p>
                        <div className="flex justify-end space-x-2">
                            <button onClick={() => setIsSaveModalOpen(false)} className="bg-gray-300 text-gray-800 px-4 py-2 rounded-xl hover:bg-gray-400 transition">
                                Cancelar
                            </button>
                            <button onClick={confirmSave} className="bg-green-700 text-white px-4 py-2 rounded-xl hover:bg-green-600 transition">
                                Sim, salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {isCancelModalOpen && (
                <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                        <p className="text-lg text-gray-800 dark:text-gray-200 mb-4">
                            Descartar alterações não salvas?
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                            As modificações serão perdidas.
                        </p>
                        <div className="flex justify-end space-x-2">
                            <button onClick={() => setIsCancelModalOpen(false)} className="bg-gray-300 text-gray-800 px-4 py-2 rounded-xl hover:bg-gray-400 transition">
                                Não, continuar editando
                            </button>
                            <button onClick={confirmCancel} className="bg-red-700 text-white px-4 py-2 rounded-xl hover:bg-red-600 transition">
                                Sim, descartar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}