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
    
    return round(v, 4)

def sucessores(rota):
    
    novo = rota[:]
    i, j = random.sample(range(len(novo)), 2)
    novo[i], novo[j] = novo[j], novo[i]
    return novo



def encosta(M, n):
    atual = solucaoInicial(n)
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
            return atual, va, historico

def encosta_t(M, n, tmax=500):
    atual = solucaoInicial(n)
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

    return atual, va, historico

def tempera(M, n, T=1000.0, alpha=0.995, T_min=0.1):
    atual = solucaoInicial(n)
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

    return melhor, melhor_custo, historico




