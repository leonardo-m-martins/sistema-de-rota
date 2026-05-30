import numpy as np
import random as rd
#---------------------------------------------------------------------
# Gera matriz de adjacências
def GerarProblema(n,min1,max1):    
    mat  = np.random.randint(min1,max1,(n,n))

    return mat
#---------------------------------------------------------------------
# Custo/lucro de uma solução
def Avalia(n,mat,sol):
    v = 0   
    for i in range(n-1):
        v += (mat[sol[i]][sol[i+1]])
    
    v += mat[sol[n-1]][sol[0]]    
    return v
#---------------------------------------------------------------------
def Ordena(p,f):
    aux = sorted(zip(p, f), key=lambda x: x[1], reverse=True) 
    p, f = zip(*aux)
    p = list(p)
    f = list(f)
    return p, f
#---------------------------------------------------------------------
# Gera a população inicial
def PopIni(n, tp):
    # random number generator
    rng = np.random.default_rng()
    pop = np.array([rng.permutation(n) for _ in range(tp)])

    return pop
#---------------------------------------------------------------------
# Calcula aptidao
def Aptidao(n,mat,p,tp):
    fit = np.zeros(tp,float)
    for i in range(tp):
        fit[i] = 1./Avalia(n,mat,p[i])
    soma = sum(fit)
    fit = fit/soma
    return fit
#---------------------------------------------------------------------
# Operador Roleta
def Roleta(fit,tp):
    ale = rd.uniform(0,1)
    ind=0
    soma = fit[ind]
    while soma<ale and ind<tp-1:
        ind += 1
        soma += fit[ind]
    return ind
#---------------------------------------------------------------------
# Operador Torneio
def Torneio(tp,fit):
    p1 = rd.randrange(tp)
    p2 = rd.randrange(tp)
    if fit[p1]>fit[p2]:
        return p1
    else:
        return p2
#---------------------------------------------------------------------
# Operador de cruzamento
def Cruzamento(p1,p2,ponto,n):
    d1 = np.concatenate((p1[0:ponto],p2[ponto:n]))
    d2 = np.concatenate((p2[0:ponto],p1[ponto:n]))
    return d1, d2
#---------------------------------------------------------------------
# Operador de mutação- translocação
def Mutacao(d,n):
    pos1 = rd.randrange(n) 
    pos2 = rd.randrange(n)
    temp = d[pos1]
    d[pos1] = d[pos2] 
    d[pos2] = temp    
    return d
#---------------------------------------------------------------------
# Gera os descendentes
def Descendentes(n,pop,fit,tp,tc,tm):
    qd = 2*tp
    desc = np.zeros((qd,n),int)
    corte = rd.randint(1,n-1)
    i = 0
    while i<qd:
        p1 = pop[Roleta(fit,tp)]
        p2 = pop[Roleta(fit,tp)]
        if rd.uniform(0,1) <= tc:
            desc[i],desc[i+1] = Cruzamento(p1,p2,corte,n)
        else:
            desc[i],desc[i+1] = p1, p2
            
        # Ajustar a restrição antes da mutação
        desc = AjustaRestricao(n, desc, qd, corte)

        if rd.uniform(0,1) <= tm:
            desc[i] = Mutacao(desc[i],n)
        if rd.uniform(0,1) <= tm:    
            desc[i+1] = Mutacao(desc[i+1],n)
        i += 2
    return desc, qd, corte
#---------------------------------------------------------------------
def NovaPop(pop,desc,tp,ig):
    elite = int(ig*tp)
    for i in range(tp-elite):
        pop[i+elite] = desc[i]
    return pop
#---------------------------------------------------------------------
# AJUSTA SOLUÇÃO PARA ATENDER A RESTRIÇÃO PCV
def AjustaRestricao(n,desc,qd,corte):
    for i in range(qd):
        alfabeto = [x for x in range(n) if x not in desc[i]]
        rd.shuffle(alfabeto)
        parte1 = desc[i][:corte]
        j = corte
        while(j<n and len(alfabeto)>0):
            if(desc[i][j] in parte1):
                desc[i][j] = alfabeto[0]
                alfabeto.remove(alfabeto[0])
            j += 1
    return desc
#---------------------------------------------------------------------
# Retorna  solução inicial, solução final, custo incial, custo final
def AG(n,mat,tp,ng,tc,tm,ig):
    pop = PopIni(n,tp)
    fit = Aptidao(n,mat,pop,tp)
    pop, fit = Ordena(pop,fit)
    si = pop[0]
    historico = [Avalia(n, mat, si)]

    for g in range(ng):
        desc, qd, corte = Descendentes(n,pop,fit,tp,tc,tm)
        fit_d = Aptidao(n,mat,desc,qd)
        desc, fit_d = Ordena(desc,fit_d)
        pop  = NovaPop(pop,desc,tp,ig)
        fit = Aptidao(n,mat,pop,tp)
        pop, fit = Ordena(pop,fit)

        historico.append(Avalia(n, mat, pop[0]))
    sf = pop[0]
    return si, sf, Avalia(n,mat,si), Avalia(n,mat,sf), historico 

def test_ag():
    n = 10
    # matriz n x n
    mat = [
        [rd.random() for _ in range(n)] for _ in range(n)
    ]
    
    si, sf, vi, vf, historico = AG(n, mat, 50, 200, 0.8, 0.1, 0.1)

    if len(np.unique(si)) == len(si):   print("si válido")
    else:                               print("si inválido")
    
    if len(np.unique(sf)) == len(sf):   print("sf válido")
    else:                               print("sf inválido")

    ganho = ((vi - vf) / vi) * 100


    print(f'Inicial: {si}\tcusto: {vi}', 
          f'Final:   {sf}\tcusto: {vf}', 
          f'Ganho:   {ganho:.1f}%', sep="\n")

if __name__ == "__main__":
    test_ag()