import math
import random
import networkx as nx
import osmnx as ox
import os


def gerarProblema(cidades, grafo):
   
    n = len(cidades)
    M = [[0.0 for _ in range(n)] for _ in range(n)]
    
    nos_novos = []
    for coordenada in cidades:
        lat = float(coordenada[0]) # Y
        long = float(coordenada[1]) # X
        no_da_rua = ox.nearest_nodes(grafo, X=long, Y=lat)
        nos_novos.append(no_da_rua)

    for i in range(n):
        for j in range(n):
            if i == j:
                M[i][j] = 0.0
            else:
                try:
                    distancia_metros = nx.shortest_path_length(
                    grafo, 
                    source=nos_novos[i], 
                    target=nos_novos[j], 
                     weight='length' )
                    M[i][j] = distancia_metros / 1000.0
                except nx.NetworkXNoPath:

                    M[i][j] = 99999.0
                      
    print("\ndistancia")
    for linha in M:
        print(linha)
                 
    return M

def solucaoInicial(n):
    
    S = []
    for i in range(n):
        S.append(i)
    
    random.shuffle(S) 
    return S

def avalia(s, n, m):
   
    v = 0.0
    for i in range(n - 1):
        v += m[s[i]][s[i+1]]
        
    v += m[s[n-1]][s[0]]
    
    return float(round(v, 4))

def sucessores(rota):


    novo = rota[:]
    i, j = random.sample(range(len(novo)), 2)
    novo[i], novo[j] = novo[j], novo[i]
    return novo



def encosta(M, n):
    inicial = solucaoInicial(n)
    atual = inicial[:]
    va = avalia(atual, n, M)
    historico = [va]

    while True:
        novo = sucessores(atual)
        vn = avalia(novo, n, M)
        
        if vn < va:
            atual = novo
            va = vn
            historico.append(va)
        else:
            return atual, va, historico, inicial

def encosta_t(M, n, tmax=500):
    inicial = solucaoInicial(n)
    atual = inicial[:]
    va = avalia(atual, n, M)
    t = 0
    historico = [va]

    while t < tmax:
        novo = sucessores(atual)
        vn = avalia(novo, n, M)
        
        if vn < va:
            atual = novo
            va = vn
            t = 0
            historico.append(va)
        else:
            t += 1

    return atual, va, historico, inicial

def tempera(M, n, T=1000.0, alpha=0.995, T_min=0.1):
    inicial = solucaoInicial(n)
    atual = inicial[:]
    va = avalia(atual, n, M)
    
    melhor = atual[:]
    melhor_custo = va
    historico = [va]

    while T > T_min:
        novo = sucessores(atual)
        vn = avalia(novo, n, M)
        delta = vn - va

        if delta < 0 or random.random() < math.exp(-delta / T):
            atual = novo
            va = vn
            historico.append(va)

        if va < melhor_custo:
            melhor = atual[:]
            melhor_custo = va

        T *= alpha

    return melhor, melhor_custo, historico, inicial

if __name__ == "__main__":
    # 1. Matriz de distâncias de mentira (3 cidades)
    M_teste = [
        [0.0, 10.0, 15.0, 20.0, 25.0],
        [10.0, 0.0, 35.0, 25.0, 30.0],
        [15.0, 35.0, 0.0, 30.0, 5.0],
        [20.0, 25.0, 30.0, 0.0, 15.0],
        [25.0, 30.0, 5.0, 15.0, 0.0]
    ]

    n_teste = 5

    # 2. Executa a sua lógica
    rota_final, custo_final, historico, rota_inicial = encosta_t(M_teste, n_teste)

    print(f"rota solucaoinicial: {rota_inicial}")
    print(f"rota solucaootimizada:{rota_final}")
    print(f"rota custo final:{custo_final}")




