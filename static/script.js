const API = '';
let cidades  = [];   
let marcadores = []; 
let rotaAtiva = null;
let metodo   = 'encosta';

let linhaInicial = null;
let linhaOtimizada = null;
let mostrarInicial    = true;
let mostrarOtimizada  = true;

const COR = {
  encosta:   '#00e5ff',
  encosta_t: '#ff4081',
  tempera:   '#69ff47',
  genetico:  '#f6e58d'
};

// Gráfico
const gcvs = document.getElementById('grafico');
const gctx = gcvs.getContext('2d');

// Inicializa o Leaflet centrado em Taubaté
const map = L.map('map').setView([-23.0274, -45.5553], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);



function resize() {
  gcvs.width  = document.querySelector('.chart-panel').offsetWidth - 32;
  gcvs.height = document.querySelector('.chart-panel').offsetHeight - 28;
}
window.addEventListener('resize', resize);
setTimeout(resize, 100);


map.on('click', (e) => {
  const lat = e.latlng.lat;
  const lng = e.latlng.lng;
  const label = String.fromCharCode(65 + (cidades.length % 26)); 
  
  cidades.push({ lat, lng, label });
  
  // Coloca o marcador visual no mapa
  const marker = L.marker([lat, lng]).addTo(map).bindPopup(`Ponto ${label}`);
  marcadores.push(marker);

  // Se já tinha uma rota desenhada, apaga pra recalcular
  if (rotaAtiva) { map.removeLayer(rotaAtiva); rotaAtiva = null; }
  
  atualizar();
});


function setMetodo(m) {
  metodo = m;

  document.querySelectorAll('.method-btn').forEach(b => {
    const bm = b.dataset.m;
    b.className = 'method-btn' + (bm === m ? ` active-${m}` : '');
  });

  
  const divTmax = document.getElementById('param-tmax');
  const divGenetico = document.getElementById('params-genetico');
  const divTempera = document.getElementById('params-tempera'); 

  
  divGenetico.style.display = 'none';
  divTempera.style.display = 'none';

  // Mostra apenas as caixas corretas dependendo do método
  if (m === 'genetico') {
    divTmax.style.display = 'none';
    divGenetico.style.display = 'block';
    
  } else if (m === 'tempera') {
    divTmax.style.display = 'none'; 
    divTempera.style.display = 'block';
    
  } else {
    // Para Encosta e Encosta_t
    divTmax.style.display = (m === 'encosta_t') ? 'block' : 'none';
  }

  document.getElementById('sb-metodo').textContent = m + '()';
}

setMetodo('encosta');

function atualizar() {
  const n = cidades.length;
  document.getElementById('s-cidades').textContent = n;
  document.getElementById('btn-run').disabled = n < 3;
  document.getElementById('sb-status').textContent =
    n < 3 ? `adicione mais ${3-n} cidade(s)` : 'pronto para executar';
}

function limpar() {
  // Limpa lógica
  cidades = [];
  
  // Limpa o mapa
  marcadores.forEach(m => map.removeLayer(m));
  marcadores = [];

    if (linhaInicial)   { map.removeLayer(linhaInicial);   linhaInicial   = null; }
  if (linhaOtimizada) { map.removeLayer(linhaOtimizada); linhaOtimizada = null; }
  mostrarInicial   = true;
  mostrarOtimizada = true;
  atualizarLegenda();

  // Limpa a tela
  document.getElementById('s-custo-ini').textContent = '-';
  document.getElementById('s-custo').textContent = '—';
  document.getElementById('s-iter').textContent  = '—';
  gctx.clearRect(0,0,gcvs.width,gcvs.height);
  
  atualizar();
}


async function rodar() {
  const loading = document.getElementById('loading');
  loading.classList.add('show');
  document.getElementById('loading-txt').textContent = `Executando ${metodo}()…`;

  try {
    const tmax = parseInt(document.getElementById('tmax').value) || 500;
    
    // 
    const body = {
      cidades: cidades.map(c => [c.lat, c.lng]),
      metodo: metodo,
      tmax: tmax
    };

    //  ADICIONA AS TAXAS NO PACOTE 
    if (metodo === 'genetico') {
      body.tp = parseInt(document.getElementById('ag-tp').value);
      body.ng = parseInt(document.getElementById('ag-ng').value);
      body.tc = parseFloat(document.getElementById('ag-tc').value);
      body.tm = parseFloat(document.getElementById('ag-tm').value);
      body.ig = parseFloat(document.getElementById('ag-ig').value);
    }
    if (metodo === 'tempera') {
      body.ti = parseFloat(document.getElementById('temp-ti').value);
      body.tf = parseFloat(document.getElementById('temp-tf').value);
      body.fr = parseFloat(document.getElementById('temp-fr').value);
    }
    
    const res  = await fetch(`${API}/api/resolver`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body)
    });
    const data = await res.json();

    if (data.erro) { alert('Erro: ' + data.erro); return; }

    desenharAsDuasRotas(data.inicial, data.rota);
    desenharGrafico(data.historico);
    
    //ATUALIZA O PAINEL COM O ANTES E DEPOIS
    const kmIni = Number(data.custo_inicial).toFixed(2);
    const kmFinal = Number(data.custo).toFixed(2);
    
    document.getElementById('s-custo-ini').textContent = kmIni + ' km'; // Linha nova!
    document.getElementById('s-custo').textContent = kmFinal + ' km';   // Linha antiga
    document.getElementById('s-iter').textContent  = data.historico.length;
    document.getElementById('sb-status').textContent = 'rota calculada';

  } catch(err) {
    alert('Não foi possível conectar ao backend.\nVerifique se está rodando na porta 5000.');
  } finally {
    loading.classList.remove('show');
  }
}


function desenharAsDuasRotas(indicesIniciais, indicesOtimizados) {
  if (linhaInicial)   { map.removeLayer(linhaInicial);   linhaInicial   = null; }
  if (linhaOtimizada) { map.removeLayer(linhaOtimizada); linhaOtimizada = null; }

  const cor = COR[metodo];

  //  Coordenadas da rota inicial (ordem aleatória)
  const coordsIniciais = indicesIniciais.map(i => [cidades[i].lat, cidades[i].lng]);
  coordsIniciais.push(coordsIniciais[0]);

  // Coordenadas da rota otimizada
  const coordsOtimizadas = indicesOtimizados.map(i => [cidades[i].lat, cidades[i].lng]);
  coordsOtimizadas.push(coordsOtimizadas[0]);

  //Rota Inicial
  linhaInicial = L.polyline(coordsIniciais, {
    color:     '#ff6b35',
    weight:    4,
    dashArray: '12, 8',
    opacity:   0.85,
    lineCap:   'round',
    lineJoin:  'round'
  }).addTo(map);
  linhaInicial.bindTooltip('Rota Inicial (aleatória)', { sticky: true });

  // Rota Otimizada 
  linhaOtimizada = L.polyline(coordsOtimizadas, {
    color:     cor,
    weight:    5,
    opacity:   0.95,
    lineCap:   'round',
    lineJoin:  'round'
  }).addTo(map);
  linhaOtimizada.bindTooltip('Rota Otimizada', { sticky: true });

  
  if (!mostrarInicial)   linhaInicial.setStyle({ opacity: 0, fillOpacity: 0 });
  if (!mostrarOtimizada) linhaOtimizada.setStyle({ opacity: 0, fillOpacity: 0 });

  map.fitBounds(linhaOtimizada.getBounds(), { padding: [30, 30] });

  // Atualiza a legenda visual
  atualizarLegenda();
}

function toggleRota(qual) {
  if (qual === 'inicial') {
    mostrarInicial = !mostrarInicial;
    if (linhaInicial)
      linhaInicial.setStyle({ opacity: mostrarInicial ? 0.85 : 0 });
  } else {
    mostrarOtimizada = !mostrarOtimizada;
    const cor = COR[metodo];
    if (linhaOtimizada)
      linhaOtimizada.setStyle({ opacity: mostrarOtimizada ? 0.95 : 0 });
  }
  atualizarLegenda();
}

function atualizarLegenda() {
  const btnI = document.getElementById('leg-inicial');
  const btnO = document.getElementById('leg-otimizada');
  if (!btnI || !btnO) return;

  btnI.classList.toggle('leg-off', !mostrarInicial);
  btnO.classList.toggle('leg-off', !mostrarOtimizada);

  
  document.getElementById('leg-dot-o').style.background = COR[metodo];
}


function desenharGrafico(hist) {
  gctx.clearRect(0, 0, gcvs.width, gcvs.height);
  if (!hist || hist.length < 2) return;

  const W = gcvs.width, H = gcvs.height;
  const pad = { t:4, r:4, b:16, l:50 };
  const pw = W - pad.l - pad.r;
  const ph = H - pad.t - pad.b;

  const minV = Math.min(...hist);
  const maxV = Math.max(...hist);
  const rng  = maxV - minV || 1;

  const cor = COR[metodo];

  
  gctx.strokeStyle = '#333355';
  gctx.lineWidth = 1;
  gctx.beginPath();
  gctx.moveTo(pad.l, pad.t);
  gctx.lineTo(pad.l, pad.t + ph);
  gctx.lineTo(pad.l + pw, pad.t + ph);
  gctx.stroke();

  
  gctx.fillStyle = '#555577';
  gctx.font = '8px Space Mono';
  gctx.textAlign = 'right';
  gctx.fillText(maxV.toFixed(2), pad.l - 4, pad.t + 4);
  gctx.fillText(minV.toFixed(2), pad.l - 4, pad.t + ph);

  // Linha do gráfico
  gctx.strokeStyle = cor;
  gctx.lineWidth = 1.5;
  gctx.shadowColor = cor;
  gctx.shadowBlur  = 4;
  gctx.beginPath();
  hist.forEach((v, i) => {
    const x = pad.l + (i / (hist.length - 1)) * pw;
    const y = pad.t + (1 - (v - minV) / rng) * ph;
    i === 0 ? gctx.moveTo(x, y) : gctx.lineTo(x, y);
  });
  gctx.stroke();
  gctx.shadowBlur = 0;


  const lx = pad.l + pw;
  const ly = pad.t + (1 - (hist[hist.length-1] - minV) / rng) * ph;
  gctx.beginPath();
  gctx.arc(lx, ly, 3, 0, Math.PI*2);
  gctx.fillStyle = cor;
  gctx.fill();
}

async function compararMetodos() {
    
    if (cidades.length < 3) {
        alert('Adicione pelo menos 3 cidades no mapa para fazer a comparação.');
        return;
    }

    const loading = document.getElementById('loading');
    loading.classList.add('show');
    
    const tbody = document.getElementById('tabela-comparacao');
    tbody.innerHTML = ''; // Limpa a tabela antiga

    const metodos = ['encosta', 'encosta_t', 'tempera', 'genetico'];
    const nomesFamosos = {
        'encosta': 'Subida de Encosta',
        'encosta_t': 'Subida com Tentativas',
        'tempera': 'Têmpera Simulada',
        'genetico': 'Algoritmo Genético'
    };

    const tmax = parseInt(document.getElementById('tmax').value) || 500;

    try {
        // 
        for (let met of metodos) {
            document.getElementById('loading-txt').textContent = `Aguarde... Executando ${nomesFamosos[met]}`;
            
            
            let reqBody = {
                cidades: cidades.map(c => [c.lat, c.lng]),
                metodo: met,
                tmax: tmax
            };

            // Puxa as taxas do Genético da tela
            if (met === 'genetico') {
                reqBody.tp = parseInt(document.getElementById('ag-tp').value) || 20;
                reqBody.ng = parseInt(document.getElementById('ag-ng').value) || 50;
                reqBody.tc = parseFloat(document.getElementById('ag-tc').value) || 0.8;
                reqBody.tm = parseFloat(document.getElementById('ag-tm').value) || 0.1;
                reqBody.ig = parseFloat(document.getElementById('ag-ig').value) || 0.1;
            }

            // Puxa as taxas da Têmpera da tela
            if (met === 'tempera') {
                reqBody.ti = parseFloat(document.getElementById('temp-ti').value) || 1000.0;
                reqBody.tf = parseFloat(document.getElementById('temp-tf').value) || 0.01;
                reqBody.fr = parseFloat(document.getElementById('temp-fr').value) || 0.99;
            }

            //  Dispara para o Python 
            const res = await fetch(`/api/resolver`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(reqBody)
            });
            
            const data = await res.json();

            if (!data.erro) {
                //  Calcula o percentual de melhoria matemática
                const custoIni = Number(data.custo_inicial);
                const custoFim = Number(data.custo);
                const melhoria = (((custoIni - custoFim) / custoIni) * 100).toFixed(1);

                
                tbody.innerHTML += `
                    <tr style="border-bottom: 1px solid #222;">
                        <td style="padding:15px; color:#00e5ff; font-weight: bold;">${nomesFamosos[met]}</td>
                        <td style="color: #ff5555;">${custoIni.toFixed(2)} km</td>
                        <td style="color: #00ff88;">${custoFim.toFixed(2)} km</td>
                        <td style="color: #ff00ff;">⬇ ${melhoria}%</td>
                    </tr>
                `;
            }
        }
        
        
        document.getElementById('modal-comparacao').style.display = 'flex';

    } catch(err) {
        alert('Erro durante a análise comparativa.');
        console.error(err);
    } finally {
        loading.classList.remove('show');
    }
}