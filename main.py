from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from algoritmo import gerarProblema, encosta, encosta_t, tempera
from ag_pcv import AG
import networkx as nx
import osmnx as ox
import os

app = Flask(__name__)
CORS(app)

ARQUIVO_GRAFO = "mapeamento_taubate.graphml"

if os.path.exists(ARQUIVO_GRAFO):
     grafo = ox.load_graphml(ARQUIVO_GRAFO)
else:
    grafo = ox.graph_from_place
    grafo = ox.graph_from_place("Taubaté, São Paulo, Brazil", network_type="drive")
    ox.save_graphml(grafo, ARQUIVO_GRAFO)        

@app.route("/")
def index():
    return render_template("index.html")
# --------------------------------

@app.route("/api/resolver", methods=["POST"])
def resolver():
    data = request.get_json()
    dados = request.get_json()
    cidades = dados.get("cidades", [])
    metodo = dados.get("metodo", "encosta")
    tmax = dados.get("tmax", 500)

    if len(cidades) < 3:
        return jsonify({"erro": "Mínimo de 3 cidades necessário."}), 400

    n = len(cidades)
    M = gerarProblema(cidades, grafo)
    
    if metodo == "encosta":
        rota, custo, historico, inicial = encosta(M, n)
    elif metodo == "encosta_t":
         rota, custo, historico, inicial = encosta_t(M, n, tmax=tmax)
    elif metodo == "tempera":
        rota, custo, historico, inicial = tempera(M, n)
    elif metodo == "genetico":

        tp = int(data.get("tp", 20))
        ng = int(data.get("ng", 50))
        tc = float(data.get("tc", 0.8))
        tm = float(data.get("tm", 0.1))
        ig = float(data.get("ig", 0.1))

        
        rota_ini, rota_final, custo_ini, custo_final = AG(n, M, tp, ng, tc, tm, ig)
            
        inicial = rota_ini.tolist()
        rota = rota_final.tolist()
        custo = float(custo_final)
        historico = [float(custo_ini), float(custo_final)]
    else:
        return jsonify({"erro": "Método inválido."}), 400


    return jsonify({
        "rota":      rota,
        "custo":     custo,
        "historico": historico,
        "metodo":    metodo,
        "inicial": inicial

    })

@app.route("/api/ping", methods=["GET"])
def ping():
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    app.run(debug=True, use_reloader=False, port=5001)

