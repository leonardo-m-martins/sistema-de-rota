from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from algoritmo import gerarProblema, encosta, encosta_t, tempera
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

