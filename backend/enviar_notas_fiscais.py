import pandas as pd
import sqlite3
from datetime import date

CSV_FILE = '00_dados_inicial.csv'
DB_FILE = 'dados_notas_fiscais.db'
TABLE_NAME = 'notas_fiscais'

try:
    print(f"Lendo dados do arquivo: {CSV_FILE}...")
    df = pd.read_csv(CSV_FILE, delimiter=';')

    print("Mapeando e limpando os nomes das colunas...")
    column_mapping = {
        'Chave de Acesso': 'chave_acesso',
        'Emissor': 'emissor',
        'CNPJ Emissor': 'cnpj_emissor',
        'data_emissao_nota': 'data_emissao_nota',
        'Codigo Produto': 'codigo_produto',
        'Descricao Produto': 'descricao_produto',
        'NCM': 'ncm_sh',
        'CFOP': 'cfop',
        'Unidade': 'unidade_medida',
        'Quantidade': 'quantidade',
        'Valor Unitario': 'valor_unitario',
        'Valor Total': 'valor_total'
    }
    df.rename(columns=column_mapping, inplace=True)

    print("Formatando e convertendo os tipos de dados...")
    df['data_emissao_nota'] = pd.to_datetime(df['data_emissao_nota'], errors='coerce', dayfirst=True)

    for col in ['quantidade', 'valor_unitario', 'valor_total']:
        if col in df.columns:
            df[col] = df[col].astype(str).str.replace(',', '.', regex=False)
            df[col] = pd.to_numeric(df[col], errors='coerce')

    df['data_processamento'] = pd.to_datetime(date.today())
    df['origem_dados'] = 'Carga Inicial CSV'

    df.dropna(subset=['descricao_produto', 'valor_unitario', 'quantidade', 'data_emissao_nota'], inplace=True)
    
    df['quantidade'] = df['quantidade'].astype(int)

    print(f"Conectando ao banco de dados: {DB_FILE}...")
    conexao = sqlite3.connect(DB_FILE)

    print(f"Inserindo {len(df)} registros na tabela '{TABLE_NAME}'...")
    df.to_sql(TABLE_NAME, conexao, if_exists='append', index=False)

    print("Dados da planilha inseridos com sucesso!")

except FileNotFoundError:
    print(f"ERRO: Arquivo '{CSV_FILE}' não encontrado. Verifique se o nome está correto e se ele está na mesma pasta.")
except Exception as e:
    print(f"Ocorreu um erro: {e}")
finally:
    if 'conexao' in locals() and conexao:
        conexao.close()