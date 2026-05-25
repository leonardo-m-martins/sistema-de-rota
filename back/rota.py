from flask import Flask, request, jsonify
from flask_cors import CORS
from algoritmo import gerarProblema, encosta, encosta_t, tempera, algoritmo_genetico

app = Flask(__name__)
CORS(app)

@app.route("/api/resolver", methods=["POST"])
def resolver():
    dados = request.get_json()
    cidades = dados.get("cidades", [])
    metodo = dados.get("metodo", "encosta")
    tmax = dados.get("tmax", 500)

    if len(cidades) < 3:
        return jsonify({"erro": "Mínimo de 3 cidades necessário."}), 400

    n = len(cidades)
    
    
    M = gerarProblema(cidades)

    
    if metodo == "encosta":
        rota, custo, historico = encosta(M, n)
    elif metodo == "encosta_t":
        rota, custo, historico = encosta_t(M, n, tmax=tmax)
    elif metodo == "tempera":
        rota, custo, historico = tempera(M, n)
    elif metodo == "genetico":
        rota, custo, historico = algoritmo_genetico(M, n, geracoes=tmax)
    else:
        return jsonify({"erro": "Método inválido."}), 400

    
    return jsonify({
        "rota":      rota,
        "custo":     custo,
        "historico": historico,
        "metodo":    metodo
    })

@app.route("/api/ping", methods=["GET"])
def ping():
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    app.run(debug=True, use_reloader=False, port=5000)