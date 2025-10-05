# Importa o Flask e outras bibliotecas necessárias
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import pandas as pd
from datetime import date
import xml.etree.ElementTree as ET
import sqlite3
import pdfplumber

# Cria uma instância do aplicativo Flask
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "https://calculadora-custos-r4e0.onrender.com"}})

def limpar_descricao(series):
    return series.astype(str).str.strip().str.lstrip('- ')

def limpar_chave_acesso(series):
    return series.astype(str).str.replace(r'[^0-9]', '', regex=True)

def formatar_data(series):
    return pd.to_datetime(series.astype(str).str.slice(0, 10), errors='coerce', dayfirst=True)

def formatar_numero_robusto(series):
    def converter(valor):
        if pd.isna(valor):
            return None
        s = str(valor).strip()
        if ',' in s:
            s = s.replace('.', '').replace(',', '.')
        return pd.to_numeric(s, errors='coerce')
    return series.apply(converter)

# Funções auxiliares para o banco de dados
def criar_banco_e_tabela():
    print("Tentando criar o banco de dados e as tabelas...")
    try:
        conexao = sqlite3.connect('dados_notas_fiscais.db')
        cursor = conexao.cursor()
        
        # Tabela de notas fiscais (sem alteração)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS notas_fiscais (
                id INTEGER PRIMARY KEY, chave_acesso NVARCHAR(255), emissor NVARCHAR(255),
                cnpj_emissor NVARCHAR(30), data_emissao_nota DATE, codigo_produto NVARCHAR(50), 
                descricao_produto NVARCHAR(255), ncm_sh NVARCHAR(20), cfop NVARCHAR(20),
                unidade_medida NVARCHAR(10), quantidade INT, valor_unitario DECIMAL(18, 2),
                valor_total DECIMAL(18, 2), data_processamento DATE, origem_dados NVARCHAR(50)
            )
        ''')
        
        # Tabela de produtos (sem alteração)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS produtos (
                id INTEGER PRIMARY KEY, nome_produto NVARCHAR(255),
                total_custo DECIMAL(18, 2), data_cadastro DATE
            )
        ''')

        # Tabela de associação (sem alteração)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS produto_materias_primas (
                id INTEGER PRIMARY KEY, produto_id INTEGER, materia_prima_id INTEGER,
                quantidade_utilizada DECIMAL(18, 2), unidade_medida NVARCHAR(10),
                FOREIGN KEY (produto_id) REFERENCES produtos(id),
                FOREIGN KEY (materia_prima_id) REFERENCES notas_fiscais(id)
            )
        ''')
        
        # Tabela de atributos que criamos no Passo 1 (sem alteração)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS atributos_materias_primas (
                id INTEGER PRIMARY KEY, descricao_produto NVARCHAR(255) UNIQUE,
                peso_bruto DECIMAL(18, 3), unidade_medida_padrao NVARCHAR(10)
            )
        ''')

        cursor.execute('DROP VIEW IF EXISTS produtos_data_mais_recente')
        cursor.execute('DROP VIEW IF EXISTS materias_primas_detalhadas')


        cursor.execute('''
            CREATE VIEW materias_primas_detalhadas AS
            WITH produtos_agrupados AS (
                SELECT
                    nf.id, nf.data_emissao_nota, nf.codigo_produto, nf.descricao_produto,
                    nf.unidade_medida AS unidade_medida_nf,
                    nf.valor_unitario AS valor_unitario_nf,
                    ROW_NUMBER() OVER(PARTITION BY nf.descricao_produto ORDER BY nf.data_emissao_nota DESC) AS rn
                FROM notas_fiscais nf
            )
            SELECT
                pa.id,
                pa.data_emissao_nota,
                pa.codigo_produto,
                pa.descricao_produto,
                pa.unidade_medida_nf,
                pa.valor_unitario_nf,
                amp.peso_bruto,
                amp.unidade_medida_padrao,
                CASE
                    -- REGRA 1: Se a unidade for 'UN' ou MT, o custo é o próprio valor da nota.
                    WHEN amp.unidade_medida_padrao IN ('UN', 'MT', 'KG')
                    THEN pa.valor_unitario_nf

                    -- Se for KG ou LT e o peso for válido, faz a divisão
                    WHEN amp.unidade_medida_padrao IN ('LT') AND amp.peso_bruto IS NOT NULL AND amp.peso_bruto > 0
                    THEN (pa.valor_unitario_nf * 1.0) / amp.peso_bruto
                    
                    -- Para todos os outros casos (não mapeado, etc.), o custo é nulo.
                    ELSE NULL
                END AS custo_por_unidade_padrao
                       
            FROM produtos_agrupados pa
            LEFT JOIN atributos_materias_primas amp ON pa.descricao_produto = amp.descricao_produto
            WHERE pa.rn = 1
        ''')
        conexao.commit()
        print("Banco de dados e tabelas (com a REGRA DE CUSTO FINAL) criados com sucesso!")
        
    except Exception as e:
        print(f"Erro ao criar banco de dados: {e}")
        if conexao:
            conexao.rollback()
        return False
    finally:
        if 'conexao' in locals() and conexao:
            conexao.close()
    return True

def inserir_dados(df):
    conexao = sqlite3.connect('dados_notas_fiscais.db')
    df.to_sql('notas_fiscais', conexao, if_exists='append', index=False)
    conexao.close()

def converter_primeiro_layout(arquivo_pdf):
    with pdfplumber.open(arquivo_pdf) as pdf:
        primeira_pagina = pdf.pages[0]
        tabelas = primeira_pagina.extract_tables()
        tabela_produtos = tabelas[-1]
        df = pd.DataFrame(pdf.pages[0].extract_tables()[-1][1:], columns=pdf.pages[0].extract_tables()[-1][0])
        df["chave_acesso"] = pdf.pages[0].extract_tables()[0][1][2].split("\n")[1]
        df["emissor"] = pdf.pages[0].extract_tables()[0][0][0].split("\n")[1]
        df["cnpj_emissor"] = pdf.pages[0].extract_tables()[0][4][3].split("\n")[1]
        df["data_emissao_nota"] = pdf.pages[0].extract_tables()[2][0][4].split("\n")[1]
        colunas_a_explodir = ['CÓDIGO PRODUTO', 'DESCRIÇÃO DO PRODUTO / SERVIÇO', 'NCM/SH', 'CFOP', 'UN', 'QUANT', 'VALOR UNIT', 'VALOR TOTAL']
        for col in colunas_a_explodir:
            df[col] = df[col].str.split("\n")
        df_expandido = df.explode(column=colunas_a_explodir, ignore_index=True)
        df_final = df_expandido.rename(columns={
            "CÓDIGO PRODUTO": "codigo_produto", "DESCRIÇÃO DO PRODUTO / SERVIÇO": "descricao_produto",
            "NCM/SH": "ncm_sh", "CFOP": "cfop", "UN": "unidade_medida", "QUANT": "quantidade",
            "VALOR UNIT": "valor_unitario", "VALOR TOTAL": "valor_total"
        })
        return df_final[df_final.columns.intersection(['chave_acesso', 'emissor', 'cnpj_emissor', 'data_emissao_nota', 'codigo_produto', 'descricao_produto', 'ncm_sh', 'cfop', 'unidade_medida', 'quantidade', 'valor_unitario', 'valor_total'])]

def converter_segundo_layout(arquivo_pdf):
    with pdfplumber.open(arquivo_pdf) as pdf:
        primeira_pagina = pdf.pages[0]
        tabelas = pdf.pages[0].extract_tables()
        df = pd.DataFrame()
        df["codigo_produto"] = tabelas[5][1][0].split("\n")
        df["descricao_produto"] = tabelas[5][1][1].split("\n")[0:200:3]
        df["ncm_sh"] = tabelas[5][1][2].split("\n")
        df["cfop"] = tabelas[5][1][4].split("\n")
        df["unidade_medida"] = tabelas[5][1][5].split("\n")
        df["quantidade"] = tabelas[5][1][6].split("\n")
        df["valor_unitario"] = tabelas[5][1][7].split("\n")
        df["valor_total"] = tabelas[5][1][8].split("\n")
        df["emissor"] = tabelas[0][0][0].replace("RECEBEMOS DE ", "").replace(" OS PRODUTOS/SERVIÇOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO", "")
        df["cnpj_emissor"] = tabelas[1][2][1].split("\n")[1]
        df["chave_acesso"] = tabelas[1][0][2].split("\n")[2]
        df["data_emissao_nota"] = tabelas[2][0][5].split("\n")[1]
        return df

def converter_terceiro_layout(arquivo_pdf):
    with pdfplumber.open(arquivo_pdf) as pdf:
        primeira_pagina = pdf.pages[0]
        tabelas = pdf.pages[0].extract_tables()
        dados = tabelas[3][2:]
        df_prod = pd.DataFrame(dados, columns=[col.replace('\n', ' ') for col in tabelas[3][1]])
        df_final = pd.DataFrame()
        df_final["codigo_produto"] = df_prod["CÓDIGO"]
        df_final["descricao_produto"] = df_prod["DESCRIÇÃO DO PRODUTO"]
        df_final["ncm_sh"] = df_prod["NCM/SH"]
        df_final["cfop"] = df_prod["CFOP"]
        df_final["unidade_medida"] = df_prod["UNID"]
        df_final["quantidade"] = df_prod["QTDE"].str.split("\n").str[0]
        df_final["valor_unitario"] = df_prod["VLR UNIT"]
        df_final["valor_total"] = df_prod["VLR TOTAL"].str.split(" ").str[0]
        df_final["emissor"] = tabelas[1][0][0].split("\n")[0]
        df_final["cnpj_emissor"] = tabelas[0][0][0].split(" - ")[-1].split("\n")[0]
        df_final["data_emissao_nota"] = tabelas[0][1][1].split("\n")[1].replace("DATA DE EMISSÃO: ", "").split(" ")[0]
        df_final["chave_acesso"] = tabelas[1][1][18].replace("CHAVE DE ACESSO ", "")
        return df_final

def converter_quarto_layout(arquivo_pdf):
    with pdfplumber.open(arquivo_pdf) as pdf:
        primeira_pagina = pdf.pages[0]
        tabelas = pdf.pages[0].extract_tables()
        prods_ = tabelas[8][1:]
        df_prod = pd.DataFrame(prods_, columns=tabelas[8][0])
        df_final = pd.DataFrame()
        df_final["codigo_produto"] = df_prod["CÓDIGO"]
        df_final["descricao_produto"] = df_prod["DESCRIÇÃO DO PRODUTO"]
        df_final["ncm_sh"] = df_prod["NCM/SH"]
        df_final["cfop"] = df_prod["CFOP"]
        df_final["unidade_medida"] = df_prod["UNID."]
        df_final["quantidade"] = df_prod["QUANTIDADE"].str.split("\n").str[0]
        df_final["valor_unitario"] = df_prod["VALOR UNITÁRIO"].str.split(" ").str[0]
        df_final["valor_total"] = df_prod["VALOR UNITÁRIO"].str.split(" ").str[1]
        df_final["emissor"] = tabelas[0][0][0].replace("RECEBEMOS DE ", "").replace(" OS PRODUTOS CONSTANTES NA NOTA FISCAL AO LADO", "")
        df_final["cnpj_emissor"] = "11.908.486/0001-87"
        df_final["data_emissao_nota"] = tabelas[1][0][1].split(" ")[5]
        df_final["chave_acesso"] = "0000000000000000000"
        return df_final

# Rota de teste
@app.route('/', methods=['GET'])
def index():
    return jsonify({"message": "Servidor está funcionando!"}), 200

# Rota para buscar todos os materiais mais recentes da view
@app.route('/materias-primas', methods=['GET'])
def get_materias_primas():
    try:
        conexao = sqlite3.connect('dados_notas_fiscais.db')
        cursor = conexao.cursor()
        cursor.execute("SELECT * FROM materias_primas_detalhadas")
        registros = cursor.fetchall()
        
        nomes_colunas = [column[0] for column in cursor.description]
        dados = [dict(zip(nomes_colunas, registro)) for registro in registros]
            
        return jsonify(dados), 200
        
    except Exception as e:
        return jsonify({"error": f"Erro ao buscar os dados: {e}"}), 500
    finally:
        if conexao:
            conexao.close()
        
# Rota para receber arquivos XML/PDF e processá-los
@app.route('/upload-xml', methods=['POST'])
def upload_arquivos():
    if 'files[]' not in request.files:
        return jsonify({"error": "Nenhum arquivo encontrado"}), 400

    arquivos = request.files.getlist('files[]')
    lista_dfs_processados = []
    
    layouts_pdf = [converter_primeiro_layout, converter_segundo_layout, converter_terceiro_layout, converter_quarto_layout]

    for arquivo in arquivos:
        nome_arquivo = arquivo.filename
        
        if nome_arquivo.lower().endswith('.xml'):
            print(f"Processando XML: {nome_arquivo}...")
            try:
                arvore = ET.parse(arquivo)
                raiz = arvore.getroot()
                ns = {"nfe": "http://www.portalfiscal.inf.br/nfe"}
                infNFe = raiz.find(".//nfe:infNFe", ns)
                if infNFe:
                    dados_xml = []
                    for item in raiz.findall('.//nfe:det', ns):
                        prod = item.find("nfe:prod", ns)
                        if prod:
                            dados_xml.append({
                                'chave_acesso': infNFe.attrib.get('Id'),
                                'emissor': infNFe.find("nfe:emit/nfe:xNome", ns).text,
                                'cnpj_emissor': infNFe.find("nfe:emit/nfe:CNPJ", ns).text,
                                'data_emissao_nota': infNFe.find("nfe:ide/nfe:dhEmi", ns).text,
                                'codigo_produto': prod.find("nfe:cProd", ns).text,
                                'descricao_produto': prod.find("nfe:xProd", ns).text,
                                'ncm_sh': prod.find("nfe:NCM", ns).text,
                                'cfop': prod.find("nfe:CFOP", ns).text,
                                'unidade_medida': prod.find("nfe:uCom", ns).text,
                                'quantidade': prod.find("nfe:qCom", ns).text,
                                'valor_unitario': prod.find("nfe:vUnCom", ns).text,
                                'valor_total': prod.find("nfe:vProd", ns).text
                            })
                    df_xml = pd.DataFrame(dados_xml)
                    df_xml['origem_dados'] = 'XML'
                    lista_dfs_processados.append(df_xml)
            except Exception as e:
                print(f"Erro ao processar XML {nome_arquivo}: {e}")
        
        elif nome_arquivo.lower().endswith('.pdf'):
            print(f"Processando PDF: {nome_arquivo}...")
            sucesso = False
            for layout_func in layouts_pdf:
                try:
                    arquivo.seek(0)
                    df_pdf = layout_func(arquivo)
                    df_pdf['origem_dados'] = 'PDF'
                    lista_dfs_processados.append(df_pdf)
                    sucesso = True
                    print(f"  -> Layout '{layout_func.__name__}' aplicado com sucesso.")
                    break
                except Exception:
                    pass
            if not sucesso:
                print(f"Nenhum layout compatível encontrado para o PDF: {nome_arquivo}")

    if not lista_dfs_processados:
        return jsonify({"error": "Nenhum dado válido foi extraído."}), 400

    df_unificado = pd.concat(lista_dfs_processados, ignore_index=True)
    
    try:
        df_unificado['chave_acesso'] = limpar_chave_acesso(df_unificado['chave_acesso'])
        df_unificado['descricao_produto'] = limpar_descricao(df_unificado['descricao_produto'])
        df_unificado['data_emissao_nota'] = formatar_data(df_unificado['data_emissao_nota'])
        df_unificado['quantidade'] = formatar_numero_robusto(df_unificado['quantidade'])
        df_unificado['valor_unitario'] = formatar_numero_robusto(df_unificado['valor_unitario'])
        df_unificado['valor_total'] = formatar_numero_robusto(df_unificado['valor_total'])
        df_unificado["data_processamento"] = pd.to_datetime(date.today()).date()

        colunas_db = ['chave_acesso', 'emissor', 'cnpj_emissor', 'data_emissao_nota', 'codigo_produto', 
                      'descricao_produto', 'ncm_sh', 'cfop', 'unidade_medida', 'quantidade', 
                      'valor_unitario', 'valor_total', 'data_processamento', 'origem_dados']
        df_para_salvar = df_unificado.reindex(columns=colunas_db)
        
        inserir_dados(df_para_salvar)
        return jsonify({"message": f"Sucesso! {len(df_para_salvar)} registros salvos.", "count": len(arquivos)}), 200

    except Exception as e:
        return jsonify({"error": f"Erro na formatação final ou ao salvar no banco: {e}"}), 500

# Rota para adicionar dados manualmente
@app.route('/adicionar-manual', methods=['POST'])
def adicionar_manual():
    try:
        dados_recebidos = request.json
        if not isinstance(dados_recebidos, list):
            dados_recebidos = [dados_recebidos]

        if not dados_recebidos:
            return jsonify({"error": "Nenhum dado recebido"}), 400
        
        for dado in dados_recebidos:
            emissor = dado.get('emissor')
            cnpj_emissor = dado.get('cnpj')
            codigo_produto = dado.get('codProduto')
            descricao_produto = dado.get('descricao')
            unidade_medida = dado.get('unidade')
            quantidade = dado.get('quantidade')
            valor_unitario = dado.get('valorUnitario')

            if not descricao_produto:
                continue

            quantidade = int(quantidade)
            valor_unitario = float(valor_unitario)
            
            df_manual = pd.DataFrame([{
                'emissor': emissor,
                'cnpj_emissor': cnpj_emissor,
                'codigo_produto': codigo_produto,
                'descricao_produto': descricao_produto,
                'unidade_medida': unidade_medida,
                'quantidade': quantidade,
                'valor_unitario': valor_unitario,
                'valor_total': quantidade * valor_unitario,
                'data_emissao_nota': date.today(),
                'data_processamento': date.today(),
                'origem_dados': 'Manual'
            }])
            
            inserir_dados(df_manual)
        
        return jsonify({"message": f"Dados de {len(dados_recebidos)} linha(s) inseridos manualmente com sucesso!"}), 200

    except Exception as e:
        return jsonify({"error": f"Erro ao adicionar dados manualmente: {e}"}), 500

# Rota para editar um material (PUT)
@app.route('/materias-primas/<int:id>', methods=['PUT'])
def editar_materia_prima(id):
    try:
        dados_recebidos = request.json
        
        conexao = sqlite3.connect('dados_notas_fiscais.db')
        cursor = conexao.cursor()

        campos_para_atualizar = []
        valores = []

        if 'descricao_produto' in dados_recebidos:
            campos_para_atualizar.append('descricao_produto = ?')
            valores.append(dados_recebidos.get('descricao_produto'))
        
        if 'unidade_medida' in dados_recebidos:
            campos_para_atualizar.append('unidade_medida = ?')
            valores.append(dados_recebidos.get('unidade_medida'))
        
        if 'valor_unitario' in dados_recebidos:
            campos_para_atualizar.append('valor_unitario = ?')
            valores.append(dados_recebidos.get('valor_unitario'))
        
        campos_para_atualizar.append('data_processamento = ?')
        valores.append(date.today())
        
        query = f"UPDATE notas_fiscais SET {', '.join(campos_para_atualizar)} WHERE id = ?"
        valores.append(id)

        cursor.execute(query, tuple(valores))
        
        conexao.commit()
        
        if cursor.rowcount == 0:
            return jsonify({"error": "Material não encontrado ou nenhum dado alterado"}), 404
            
        return jsonify({"message": f"Material com ID {id} atualizado com sucesso!"}), 200
        
    except Exception as e:
        return jsonify({"error": f"Erro ao atualizar material: {e}"}), 500
    finally:
        conexao.close()

# Rota para excluir um material por ID (DELETE)
@app.route('/materias-primas/<int:id>', methods=['DELETE'])
def excluir_materia_prima(id):
    try:
        conexao = sqlite3.connect('dados_notas_fiscais.db')
        cursor = conexao.cursor()
        
        cursor.execute("DELETE FROM notas_fiscais WHERE id = ?", (id,))
        conexao.commit()
        
        if cursor.rowcount == 0:
            return jsonify({"error": "Material não encontrado"}), 404
            
        return jsonify({"message": f"Material com ID {id} excluído com sucesso!"}), 200
        
    except Exception as e:
        return jsonify({"error": f"Erro ao excluir material: {e}"}), 500
    finally:
        conexao.close()

# Rota para excluir todos os materiais (DELETE)
@app.route('/materias-primas', methods=['DELETE'])
def excluir_todos_materiais():
    try:
        conexao = sqlite3.connect('dados_notas_fiscais.db')
        cursor = conexao.cursor()
        cursor.execute("DELETE FROM notas_fiscais")
        conexao.commit()
        return jsonify({"message": "Todos os materiais foram excluídos com sucesso!"}), 200
    except Exception as e:
        return jsonify({"error": f"Erro ao excluir todos os materiais: {e}"}), 500
    finally:
        conexao.close()

# Rota para cadastrar um produto
@app.route('/cadastrar-produto', methods=['POST'])
def cadastrar_produto():
    try:
        dados_recebidos = request.json
        if not dados_recebidos or 'nome_produto' not in dados_recebidos or 'materias_primas' not in dados_recebidos:
            return jsonify({"error": "Dados inválidos."}), 400

        nome_produto = dados_recebidos['nome_produto']
        materias_primas = dados_recebidos['materias_primas']
        
        conexao = sqlite3.connect('dados_notas_fiscais.db')
        cursor = conexao.cursor()
        
        cursor.execute("INSERT INTO produtos (nome_produto, data_cadastro) VALUES (?, ?)", (nome_produto, date.today()))
        produto_id = cursor.lastrowid
        
        for mp in materias_primas:
            materia_prima_id = mp.get('materia_prima_id')
            quantidade_utilizada = mp.get('quantidade_utilizada')
            unidade_medida = mp.get('unidade_medida')
            
            cursor.execute('''
                INSERT INTO produto_materias_primas (produto_id, materia_prima_id, quantidade_utilizada, unidade_medida)
                VALUES (?, ?, ?, ?)
            ''', (produto_id, materia_prima_id, quantidade_utilizada, unidade_medida))
            
        conexao.commit()
        
        return jsonify({"message": "Produto cadastrado com sucesso!", "produto_id": produto_id}), 201
    
    except Exception as e:
        return jsonify({"error": f"Erro ao cadastrar o produto: {e}"}), 500
    finally:
        conexao.close()

# Rota para buscar produtos cadastrados
@app.route('/produtos-cadastrados', methods=['GET'])
def get_produtos_cadastrados():
    try:
        conexao = sqlite3.connect('dados_notas_fiscais.db')
        cursor = conexao.cursor()

        cursor.execute('''
            SELECT
                p.id AS ID_Produto,
                p.nome_produto AS Produto,
                SUM(pmp.quantidade_utilizada) AS Quantidades_MP,
                -- O Total agora é a soma da quantidade usada * o custo por unidade padrão
                SUM(pmp.quantidade_utilizada * COALESCE(mpd.custo_por_unidade_padrao, 0)) AS Total_Produto
            FROM produtos p
            JOIN produto_materias_primas pmp ON p.id = pmp.produto_id
            -- Trocamos 'notas_fiscais' pela nossa VIEW inteligente
            JOIN materias_primas_detalhadas mpd ON pmp.materia_prima_id = mpd.id
            GROUP BY p.id
        ''')
        
        registros = cursor.fetchall()
        
        nomes_colunas = [column[0] for column in cursor.description]
        dados = [dict(zip(nomes_colunas, registro)) for registro in registros]
            
        return jsonify(dados), 200
        
    except sqlite3.OperationalError as e:
        return jsonify({"error": f"Erro no banco de dados: {e}"}), 500
    except Exception as e:
        return jsonify({"error": f"Erro ao buscar os produtos cadastrados: {e}"}), 500
    finally:
        if conexao:
            conexao.close()

# Rota para buscar detalhes de um produto específico e suas matérias-primas
@app.route('/produtos-cadastrados/<int:id>', methods=['GET'])
def get_detalhes_produto(id):
    try:
        conexao = sqlite3.connect('dados_notas_fiscais.db')
        cursor = conexao.cursor()

        cursor.execute("SELECT id, nome_produto FROM produtos WHERE id = ?", (id,))
        produto = cursor.fetchone()
        if not produto:
            return jsonify({"error": "Produto não encontrado"}), 404

        cursor.execute('''
            SELECT
                pmp.id,
                pmp.materia_prima_id,
                pmp.quantidade_utilizada,
                mpd.unidade_medida_padrao, -- <<< ADICIONADO AQUI
                mpd.descricao_produto,
                mpd.custo_por_unidade_padrao AS valor_unitario
            FROM produto_materias_primas pmp
            JOIN materias_primas_detalhadas mpd ON pmp.materia_prima_id = mpd.id
            WHERE pmp.produto_id = ?
        ''', (id,))
        materias_primas = cursor.fetchall()
        
        nomes_colunas_mp = [desc[0] for desc in cursor.description]
        materias_primas_formatadas = [dict(zip(nomes_colunas_mp, mp)) for mp in materias_primas]

        total_custo = sum(
            (mp['quantidade_utilizada'] or 0) * (mp['valor_unitario'] or 0) 
            for mp in materias_primas_formatadas
        )

        produto_formatado = {
            "id": produto[0],
            "nome_produto": produto[1],
            "total_custo": total_custo,
            "materias_primas": materias_primas_formatadas
        }
            
        return jsonify(produto_formatado), 200
        
    except Exception as e:
        return jsonify({"error": f"Erro ao buscar detalhes do produto: {e}"}), 500
    finally:
        if conexao:
            conexao.close()

# Rota para atualizar o nome de um produto (PUT)
@app.route('/produtos-cadastrados/<int:id>', methods=['PUT'])
def atualizar_produto(id):
    try:
        dados_recebidos = request.json
        nome_produto = dados_recebidos.get('nome_produto')
        
        conexao = sqlite3.connect('dados_notas_fiscais.db')
        cursor = conexao.cursor()

        cursor.execute('''
            UPDATE produtos
            SET nome_produto = ?
            WHERE id = ?
        ''', (nome_produto, id))
        
        conexao.commit()
        
        if cursor.rowcount == 0:
            return jsonify({"error": "Produto não encontrado ou nenhum dado alterado"}), 404
        
        return jsonify({"message": f"Produto com ID {id} atualizado com sucesso!"}), 200
        
    except Exception as e:
        return jsonify({"error": f"Erro ao atualizar produto: {e}"}), 500
    finally:
        conexao.close()

# Rota para adicionar uma matéria-prima a um produto existente (POST)
@app.route('/produtos-cadastrados/<int:id>/adicionar-mp', methods=['POST'])
def adicionar_materia_prima_ao_produto(id):
    try:
        dados_recebidos = request.json
        materia_prima_id = dados_recebidos.get('materia_prima_id')
        quantidade_utilizada = dados_recebidos.get('quantidade_utilizada')
        unidade_medida = dados_recebidos.get('unidade_medida')

        conexao = sqlite3.connect('dados_notas_fiscais.db')
        cursor = conexao.cursor()

        cursor.execute('''
            INSERT INTO produto_materias_primas (produto_id, materia_prima_id, quantidade_utilizada, unidade_medida)
            VALUES (?, ?, ?, ?)
        ''', (id, materia_prima_id, quantidade_utilizada, unidade_medida))
        
        conexao.commit()

        return jsonify({"message": f"Matéria-prima adicionada ao produto {id} com sucesso!"}), 201
        
    except Exception as e:
        return jsonify({"error": f"Erro ao adicionar matéria-prima: {e}"}), 500
    finally:
        conexao.close()

# Rota para remover uma matéria-prima específica de um produto (DELETE)
@app.route('/produtos-cadastrados/<int:produto_id>/remover-mp/<int:associacao_id>', methods=['DELETE'])
def remover_materia_prima_do_produto(produto_id, associacao_id):
    try:
        conexao = sqlite3.connect('dados_notas_fiscais.db')
        cursor = conexao.cursor()

        cursor.execute("DELETE FROM produto_materias_primas WHERE id = ?", (associacao_id,))
        
        conexao.commit()

        if cursor.rowcount == 0:
            return jsonify({"error": "Associação de matéria-prima não encontrada."}), 404
        
        return jsonify({"message": f"Associação de matéria-prima {associacao_id} do produto {produto_id} removida com sucesso!"}), 200
        
    except Exception as e:
        return jsonify({"error": f"Erro ao remover a matéria-prima: {e}"}), 500
    finally:
        conexao.close()

# Rota para excluir um produto e suas associações (DELETE)
@app.route('/produtos-cadastrados/<int:id>', methods=['DELETE'])
def excluir_produto_completo(id):
    try:
        conexao = sqlite3.connect('dados_notas_fiscais.db')
        cursor = conexao.cursor()

        cursor.execute("DELETE FROM produto_materias_primas WHERE produto_id = ?", (id,))
        
        cursor.execute("DELETE FROM produtos WHERE id = ?", (id,))
        
        conexao.commit()
        
        if cursor.rowcount == 0:
            return jsonify({"error": "Produto não encontrado."}), 404
        
        return jsonify({"message": f"Produto com ID {id} e suas associações foram excluídos com sucesso!"}), 200
        
    except Exception as e:
        return jsonify({"error": f"Erro ao excluir o produto: {e}"}), 500
    finally:
        conexao.close()

# Rota para inserir ou atualizar os atributos de uma matéria-prima (mapeamento)
@app.route('/mapear-atributos', methods=['POST'])
def mapear_atributos():
    try:
        dados = request.json
        descricao_produto = dados.get('descricao_produto')
        peso_bruto = dados.get('peso_bruto')
        unidade_padrao = dados.get('unidade_medida_padrao')

        if not descricao_produto:
            return jsonify({"error": "Descrição do produto é obrigatória."}), 400

        conexao = sqlite3.connect('dados_notas_fiscais.db')
        cursor = conexao.cursor()

        cursor.execute("SELECT id FROM atributos_materias_primas WHERE descricao_produto = ?", (descricao_produto,))
        existente = cursor.fetchone()

        if existente:
            cursor.execute('''
                UPDATE atributos_materias_primas
                SET peso_bruto = ?, unidade_medida_padrao = ?
                WHERE descricao_produto = ?
            ''', (peso_bruto, unidade_padrao, descricao_produto))
            mensagem = f"Atributos para '{descricao_produto}' atualizados com sucesso."
        else:
            cursor.execute('''
                INSERT INTO atributos_materias_primas (descricao_produto, peso_bruto, unidade_medida_padrao)
                VALUES (?, ?, ?)
            ''', (descricao_produto, peso_bruto, unidade_padrao))
            mensagem = f"Atributos para '{descricao_produto}' inseridos com sucesso."

        conexao.commit()
        return jsonify({"message": mensagem}), 200

    except Exception as e:
        if 'conexao' in locals() and conexao:
            conexao.rollback()
        return jsonify({"error": f"Erro ao mapear atributos: {e}"}), 500
    finally:
        if 'conexao' in locals() and conexao:
            conexao.close()

# Rota para editar uma matéria-prima de um produto (PUT)
@app.route('/produtos-cadastrados/<int:produto_id>/editar-mp/<int:associacao_id>', methods=['PUT'])
def editar_materia_prima_do_produto(produto_id, associacao_id):
    try:
        dados_recebidos = request.json
        
        materia_prima_id_nova = dados_recebidos.get('materia_prima_id')
        quantidade_utilizada = dados_recebidos.get('quantidade_utilizada')
        unidade_medida = dados_recebidos.get('unidade_medida')

        conexao = sqlite3.connect('dados_notas_fiscais.db')
        cursor = conexao.cursor()

        cursor.execute('''
            UPDATE produto_materias_primas
            SET
                materia_prima_id = ?,
                quantidade_utilizada = ?,
                unidade_medida = ?
            WHERE produto_id = ? AND id = ?
        ''', (materia_prima_id_nova, quantidade_utilizada, unidade_medida, produto_id, associacao_id))

        conexao.commit()

        if cursor.rowcount == 0:
            return jsonify({"error": "Matéria-prima não encontrada ou nenhum dado alterado para este produto"}), 404
            
        return jsonify({"message": f"Matéria-prima com ID de associação {associacao_id} do produto {produto_id} atualizada com sucesso!"}), 200
        
    except Exception as e:
        return jsonify({"error": f"Erro ao atualizar matéria-prima do produto: {e}"}), 500
    finally:
        if conexao:
            conexao.close()

# Rota para remover todas as matérias-primas de um produto (DELETE)
@app.route('/produtos-cadastrados/<int:id>/remover-mp-all', methods=['DELETE'])
def remover_all_materias_primas_do_produto(id):
    try:
        conexao = sqlite3.connect('dados_notas_fiscais.db')
        cursor = conexao.cursor()

        cursor.execute("DELETE FROM produto_materias_primas WHERE produto_id = ?", (id,))
        conexao.commit()
        
        if cursor.rowcount == 0:
            return jsonify({"error": "Nenhuma matéria-prima encontrada para este produto"}), 404
        
        return jsonify({"message": f"Todas as matérias-primas do produto {id} foram removidas com sucesso!"}), 200
        
    except Exception as e:
        return jsonify({"error": f"Erro ao remover todas as matérias-primas: {e}"}), 500
    finally:
        conexao.close()

@app.route('/sugestoes/emissores_cnpj', methods=['GET'])
def get_sugestoes_emissores():
    try:
        conexao = sqlite3.connect('dados_notas_fiscais.db')
        cursor = conexao.cursor()
        cursor.execute("""
            SELECT DISTINCT emissor, cnpj_emissor
            FROM notas_fiscais
            WHERE emissor IS NOT NULL AND emissor != '' AND cnpj_emissor IS NOT NULL AND cnpj_emissor != ''
        """)
        registros = cursor.fetchall()

        dados = [{"emissor": r[0], "cnpj": r[1]} for r in registros]

        return jsonify(dados), 200

    except Exception as e:
        return jsonify({"error": f"Erro ao buscar sugestões de emissores: {e}"}), 500
    finally:
        if conexao:
            conexao.close()

@app.route('/sugestoes/codigos_produto', methods=['GET'])
def get_sugestoes_codigos():
    try:
        conexao = sqlite3.connect('dados_notas_fiscais.db')
        cursor = conexao.cursor()
        cursor.execute("""
            SELECT DISTINCT codigo_produto 
            FROM notas_fiscais 
            WHERE codigo_produto IS NOT NULL AND codigo_produto != ''
        """)
        registros = cursor.fetchall()

        dados = [{"codProduto": r[0]} for r in registros]

        return jsonify(dados), 200

    except Exception as e:
        return jsonify({"error": f"Erro ao buscar sugestões de códigos: {e}"}), 500
    finally:
        if conexao:
            conexao.close()


if __name__ == '__main__':
    # Cria o banco e a tabela antes de rodar o servidor
    criar_banco_e_tabela()

    app.run(debug=True)
