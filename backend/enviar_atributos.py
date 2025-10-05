import pandas as pd
import sqlite3
import re

CSV_FILE = '01_mapeamento_inicial.csv'
DB_FILE = 'dados_notas_fiscais.db'
TABLE_NAME = 'atributos_materias_primas'

def clean_column_names(df):
    new_columns = {}
    for col in df.columns:
        cleaned_col = col.lower()
        cleaned_col = re.sub(r'[^a-z0-9_]', '', cleaned_col.replace(' ', '_'))
        new_columns[col] = cleaned_col
    df.rename(columns=new_columns, inplace=True)
    return df

try:
    print(f"Lendo dados do arquivo: {CSV_FILE}...")
    df = pd.read_csv(CSV_FILE, delimiter=';')
    
    df = clean_column_names(df)
    
    df.rename(columns={
        'descricao_produto': 'descricao_produto',
        'peso_bruto': 'peso_bruto',
        'unidade_medida': 'unidade_medida_padrao'
    }, inplace=True)
    
    required_cols = ['descricao_produto', 'peso_bruto', 'unidade_medida_padrao']
    for col in required_cols:
        if col not in df.columns:
            raise Exception(f"Coluna '{col}' não encontrada no CSV. Verifique os nomes no arquivo original.")

    df['peso_bruto'] = pd.to_numeric(df['peso_bruto'], errors='coerce')
    
    print(f"Conectando ao banco de dados: {DB_FILE}...")
    conexao = sqlite3.connect(DB_FILE)
    cursor = conexao.cursor()

    print(f"Inserindo/atualizando dados na tabela '{TABLE_NAME}' (modo de alta compatibilidade)...")

    for index, row in df.iterrows():
        try:
            cursor.execute(f'''
                INSERT INTO {TABLE_NAME} (descricao_produto, peso_bruto, unidade_medida_padrao)
                VALUES (?, ?, ?)
            ''', (row['descricao_produto'], row['peso_bruto'], row['unidade_medida_padrao']))
        except sqlite3.IntegrityError:
            cursor.execute(f'''
                UPDATE {TABLE_NAME}
                SET peso_bruto = ?, unidade_medida_padrao = ?
                WHERE descricao_produto = ?
            ''', (row['peso_bruto'], row['unidade_medida_padrao'], row['descricao_produto']))

    conexao.commit()
    print(f"{len(df)} registros foram processados com sucesso para a tabela '{TABLE_NAME}'!")

except FileNotFoundError:
    print(f"ERRO: Arquivo '{CSV_FILE}' não encontrado. Verifique se o nome está correto e se ele está na mesma pasta.")
except Exception as e:
    print(f"Ocorreu um erro: {e}")
finally:
    if 'conexao' in locals() and conexao:
        conexao.close()