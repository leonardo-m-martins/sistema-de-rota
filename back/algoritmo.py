import math
import random


def gerarProblema(cidades):
   
    n = len(cidades)
    M = [[0.0 for _ in range(n)] for _ in range(n)]
    
    for i in range(n):
        for j in range(n):
            if i == j:
                M[i][j] = 0.0
            else:
                
                dx = cidades[i] - cidades[j]
                dy = cidades[i][1] - cidades[j][1]
                M[i][j] = math.sqrt(dx**2 + dy**2)
    return M

def solucaoInicial(n):
    
    S = []
    for i in range(n):
        S.append(i)
    
    random.shuffle(S) # S.embaralhar()
    return S

def avalia(s, n, m):
   
    v = 0.0
    for i in range(n - 1):
        v += m[s[i]][s[i+1]]
        
    v += m[s[n-1]][s]
    
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




