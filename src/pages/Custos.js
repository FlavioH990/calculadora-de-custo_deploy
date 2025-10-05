import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function Custos() {
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [rawMaterials, setRawMaterials] = useState([]);
    const [calculatedData, setCalculatedData] = useState(null);
    const [producedQuantity, setProducedQuantity] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
    const [validationMessage, setValidationMessage] = useState('');
    const [isSaveQueryModalOpen, setIsSaveQueryModalOpen] = useState(false);

    useEffect(() => {
        const fetchAllProducts = async () => {
            try {
                const response = await fetch(`${API_URL}/produtos-cadastrados`);
                if (!response.ok) {
                    throw new Error('Erro ao buscar a lista de produtos.');
                }
                const data = await response.json();
                setProducts(data);
                setLoading(false);
            } catch (err) {
                setError(err.message);
                setLoading(false);
            }
        };
        fetchAllProducts();
    }, []);

    useEffect(() => {
        if (!selectedProduct) {
            setRawMaterials([]);
            setCalculatedData(null);
            return;
        }
        const fetchProductDetails = async () => {
            try {
                setLoading(true);
                const response = await fetch(`${API_URL}/produtos-cadastrados/${selectedProduct.ID_Produto}`);
                if (!response.ok) {
                    throw new Error('Erro ao buscar os detalhes do produto.');
                }
                const data = await response.json();
                setRawMaterials(data.materias_primas);
                setLoading(false);
            } catch (err) {
                setError(err.message);
                setLoading(false);
            }
        };
        fetchProductDetails();
    }, [selectedProduct]);

    const handleProductChange = (e) => {
        const productId = e.target.value;
        if (productId) {
            const product = products.find(p => p.ID_Produto.toString() === productId);
            setSelectedProduct(product);
            setProducedQuantity('');
            setCalculatedData(null);
        } else {
            setSelectedProduct(null);
            setProducedQuantity('');
            setCalculatedData(null);
        }
    };

    const handleQuantityChange = (e) => {
        const value = e.target.value;
        if (value === '') {
            setProducedQuantity('');
        } else {
            const intValue = parseInt(value, 10);
            if (!isNaN(intValue) && intValue >= 0) {
                setProducedQuantity(intValue);
            }
        }
    };

    const handleActionClick = (action) => {
        alert(`Ação de '${action}' foi chamada!`);
    };

    const handleCalculateClick = () => {
        if (!selectedProduct || !producedQuantity || Number(producedQuantity) <= 0) {
            setValidationMessage("Por favor, selecione um produto e insira uma quantidade válida.");
            setIsValidationModalOpen(true);
            return;
        }
        const quantidade = Number(producedQuantity);
        const calculatedMaterials = rawMaterials.map(mp => {
            const quantidadeTotalMP = mp.quantidade_utilizada * quantidade;
            const subTotalMP = quantidadeTotalMP * (mp.valor_unitario || 0);
            return { ...mp, quantidadeTotalMP, subTotalMP };
        });
        const totalCusto = calculatedMaterials.reduce((acc, item) => acc + item.subTotalMP, 0);
        setCalculatedData({
            rawMaterials: calculatedMaterials,
            totalCusto: totalCusto
        });
    };

    const handleSaveQuery = () => {
        if (!calculatedData) {
            setValidationMessage("Nenhum cálculo foi realizado para salvar.");
            setIsValidationModalOpen(true);
            return;
        }
        const novaConsulta = {
            id: new Date().toISOString(),
            dataConsulta: new Date().toISOString(),
            nomeProduto: selectedProduct.Produto,
            qtdProduzida: producedQuantity,
            custoTotal: calculatedData.totalCusto,
            detalhes: calculatedData
        };
        try {
            const historicoExistente = JSON.parse(localStorage.getItem('consultasHistorico') || '[]');
            historicoExistente.push(novaConsulta);
            localStorage.setItem('consultasHistorico', JSON.stringify(historicoExistente));
            setIsSaveQueryModalOpen(true);
        } catch (error) {
            console.error("Erro ao salvar consulta no localStorage:", error);
            setValidationMessage("Ocorreu um erro ao salvar a consulta.");
            setIsValidationModalOpen(true);
        }
    };

    const displayRawMaterials = calculatedData ? calculatedData.rawMaterials : [];
    const displayTotalCusto = calculatedData ? calculatedData.totalCusto : 0;

    if (loading) return <div className="text-center p-6 dark:text-gray-300">Carregando...</div>;
    if (error) return <div className="text-center text-red-600 p-6">Erro: {error}</div>;

    const handleExportXLSX = () => {
        if (!calculatedData || !selectedProduct || !producedQuantity) {
            setValidationMessage("Nenhum cálculo para exportar. Por favor, clique em 'Calcular' primeiro.");
            setIsValidationModalOpen(true);
            return;
        }
        const quantidade = Number(producedQuantity);
        const custoTotal = calculatedData.totalCusto;
        const custoUnitario = quantidade > 0 ? custoTotal / quantidade : 0;
        const dataExportacao = new Date().toLocaleDateString('pt-BR');
        const header = [
            ["Relatório de Custo de Produção"],
            [],
            ["Produto:", selectedProduct.Produto],
            ["Quantidade Produzida:", `${quantidade} Unidades`],
            ["Data da Exportação:", dataExportacao],
            [],
            ["Custo Total do Lote:", custoTotal],
            ["Custo por Unidade:", custoUnitario],
            []
        ];
        const tableData = calculatedData.rawMaterials.map(mp => ({
            "Matéria-Prima": mp.descricao_produto,
            "Quantidade Utilizada": mp.quantidadeTotalMP,
            "Unidade": mp.unidade_medida_padrao || 'N/A',
            "Custo Unitário (MP)": mp.valor_unitario,
            "Subtotal (R$)": mp.subTotalMP
        }));
        const worksheet = XLSX.utils.aoa_to_sheet(header);
        XLSX.utils.sheet_add_json(worksheet, tableData, {
            origin: 'A10',
            skipHeader: false
        });
        worksheet['!cols'] = [
            { wch: 30 }, { wch: 20 }, { wch: 10 }, { wch: 20 }, { wch: 20 }
        ];
        const currencyFormat = '"R$"#,##0.00';
        worksheet['B7'].z = currencyFormat;
        worksheet['B8'].z = currencyFormat;
        const tableStartRow = 11;
        for (let i = 0; i < tableData.length; i++) {
            const currentRow = tableStartRow + i;
            const costCell = `D${currentRow}`;
            const subtotalCell = `E${currentRow}`;
            if (worksheet[costCell]) worksheet[costCell].z = currencyFormat;
            if (worksheet[subtotalCell]) worksheet[subtotalCell].z = currencyFormat;
        }
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Cálculo de Custo");
        XLSX.writeFile(workbook, `custo_${selectedProduct.Produto.replace(/\s+/g, '_')}.xlsx`);
    };

    const handleExportPDF = () => {
        if (!calculatedData || !selectedProduct || !producedQuantity) {
            setValidationMessage("Nenhum cálculo para exportar. Por favor, clique em 'Calcular' primeiro.");
            setIsValidationModalOpen(true);
            return;
        }
        const doc = new jsPDF();
        const quantidade = Number(producedQuantity);
        const custoTotal = calculatedData.totalCusto;
        const custoUnitario = quantidade > 0 ? custoTotal / quantidade : 0;
        const dataExportacao = new Date().toLocaleDateString('pt-BR');
        const tableColumn = ["Matéria-Prima", "Qtd. Utilizada", "Un.", "Custo Unitário (MP)", "Subtotal"];
        const tableRows = [];
        calculatedData.rawMaterials.forEach(mp => {
            const materialData = [
                mp.descricao_produto,
                mp.quantidadeTotalMP.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                mp.unidade_medida_padrao || 'N/A',
                mp.valor_unitario !== null ? mp.valor_unitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Não Mapeado',
                mp.subTotalMP.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            ];
            tableRows.push(materialData);
        });
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text("Relatório de Custo de Produção", 105, 20, { align: 'center' });
        doc.setLineWidth(0.5);
        doc.line(14, 25, 196, 25);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Produto:`, 14, 35);
        doc.text(`Quantidade Produzida:`, 14, 42);
        doc.text(`Data do Relatório:`, 14, 49);
        doc.setFont('helvetica', 'bold');
        doc.text(selectedProduct.Produto, 58, 35);
        doc.text(`${quantidade} Unidades`, 58, 42);
        doc.text(dataExportacao, 58, 49);
        doc.text(`Custo Total do Lote:`, 120, 35);
        doc.text(`Custo por Unidade:`, 120, 42);
        doc.setTextColor(40, 167, 69);
        doc.text(custoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 160, 35);
        doc.text(custoUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 160, 42);
        doc.setTextColor(0, 0, 0);
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 60,
            theme: 'grid',
            headStyles: {
                fillColor: [179, 25, 25],
                textColor: 255,
                fontStyle: 'bold'
            },
            didDrawPage: function (data) {
                const pageCount = doc.internal.getNumberOfPages();
                doc.setFontSize(10);
                doc.text(`Página ${data.pageNumber} de ${pageCount}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
            }
        });
        doc.save(`custo_${selectedProduct.Produto.replace(/\s+/g, '_')}.pdf`);
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
            <main className="pt-16 p-6 max-w-6xl mx-auto">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg mb-10 space-y-6 border border-gray-200 dark:border-gray-700">
                    <div className="relative flex flex-col gap-4 mb-6">
                        <select
                            className="w-full p-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600"
                            onChange={handleProductChange}
                            value={selectedProduct ? selectedProduct.ID_Produto : ''}
                        >
                            <option value="">Selecione o produto...</option>
                            {products.map(p => (
                                <option key={p.ID_Produto} value={p.ID_Produto}>
                                    {p.Produto}
                                </option>
                            ))}
                        </select>
                        <div className="flex flex-row gap-4 items-end">
                        <input
                            type="number"
                            placeholder="Quantidade produzida"
                            className="min-w-[79%] p-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600"
                            value={producedQuantity}
                            onChange={handleQuantityChange}
                            min="0"
                            step="1"
                        />
                        <button
                            onClick={handleCalculateClick}
                            className="min-w-[200px] bottom-0 right-0 bg-red-700 text-white font-semibold px-6 py-2 rounded-xl hover:bg-red-600 transition shadow-md"
                        >
                            Calcular
                        </button>
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center mb-6">
                    <div>
                        <button onClick={() => handleActionClick('Histórico de consulta')} className="bg-red-700 text-white font-semibold px-6 py-2 rounded-xl hover:bg-red-600 transition hidden">
                            Histórico de consulta
                        </button>
                    </div>
                    <div className="flex space-x-4">
                        <button onClick={handleSaveQuery} className="bg-red-700 text-white font-semibold px-6 py-2 rounded-xl hover:bg-red-600 transition shadow-md">
                            Salvar consulta
                        </button>
                        <button onClick={handleExportPDF} className="bg-red-700 text-white font-semibold px-6 py-2 rounded-xl hover:bg-red-600 transition shadow-md">
                            Exportar PDF
                        </button>
                        <button onClick={handleExportXLSX} className="bg-red-700 text-white font-semibold px-6 py-2 rounded-xl hover:bg-red-600 transition shadow-md">
                            Exportar planilha
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                    <table className="min-w-full bg-white dark:bg-gray-800 rounded-xl">
                        <thead className="bg-red-700 text-white">
                            <tr>
                                <th className="py-3 px-4 text-left">ID_Produto</th>
                                <th className="py-3 px-4 text-left">Nome_MP's</th>
                                <th className="py-3 px-4 text-left">Qtd. Total</th>
                                <th className="py-3 px-4 text-left">Un. Padrão</th>
                                <th className="py-3 px-4 text-left">Custo / Un. Padrão</th>
                                <th className="py-3 px-4 text-left">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody className="dark:text-gray-300">
                            {displayRawMaterials.length > 0 ? (
                                displayRawMaterials.map((mp, index) => (
                                    <tr key={mp.id || index} className="border-b border-gray-200 dark:border-gray-700">
                                        <td className="py-3 px-4">{selectedProduct.ID_Produto}</td>
                                        <td className="py-3 px-4">{mp.descricao_produto}</td>
                                        <td className="py-3 px-4">
                                            {mp.quantidadeTotalMP.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-3 px-4">
                                            {mp.unidade_medida_padrao || <span className="text-orange-500 font-semibold">-</span>}
                                        </td>
                                        <td className="py-3 px-4">
                                            {mp.valor_unitario !== null
                                                ? mp.valor_unitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                                : <span className="text-orange-500 font-semibold">Não Mapeado</span>
                                            }
                                        </td>
                                        <td className="py-3 px-4">
                                            {mp.subTotalMP.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="text-center py-6 text-gray-500 dark:text-gray-400">
                                        Selecione um produto e clique em Calcular.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot className="dark:text-white">
                            <tr className="bg-gray-50 dark:bg-gray-700">
                                <td colSpan="5" className="py-3 px-4 text-right font-bold">Total:</td>
                                <td className="py-3 px-4 font-bold">{displayTotalCusto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </main>
            {isValidationModalOpen && (
                <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg text-center">
                        <p className="text-lg text-gray-800 dark:text-gray-200 mb-6">
                            {validationMessage}
                        </p>
                        <div className="flex justify-center">
                            <button
                                onClick={() => setIsValidationModalOpen(false)}
                                className="bg-red-700 text-white px-6 py-2 rounded-xl hover:bg-red-600 transition"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {isSaveQueryModalOpen && (
                <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg text-center max-w-sm">
                        <p className="text-lg text-green-600 font-bold mb-4">
                            Sucesso!
                        </p>
                        <p className="text-gray-800 dark:text-gray-200 mb-6">
                            Sua consulta foi salva. Você pode visualizá-la no Painel.
                        </p>
                        <div className="flex justify-center">
                            <button
                                onClick={() => setIsSaveQueryModalOpen(false)}
                                className="bg-green-600 text-white font-semibold px-6 py-2 rounded-xl hover:bg-green-700 transition"
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

export default Custos;