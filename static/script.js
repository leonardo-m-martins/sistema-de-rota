const API = '';
let cidades  = [];   
let marcadores = []; 
let rotaAtiva = null;
let metodo   = 'encosta';

let linhaInicial = null;
let linhaOtimizada = null;

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
  document.getElementById('param-tmax').style.display = (m === 'encosta_t' || m === 'genetico') ? 'block' : 'none';
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

    if (linhaInicial) { map.removeLayer(linhaInicial); linhaInicial = null; }
    if (linhaOtimizada) { map.removeLayer(linhaOtimizada); linhaOtimizada = null; }

  // Limpa a tela
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
    const tmax = parseInt(document.getElementById('tmax').value);
    
  
    const body = {
      cidades: cidades.map(c => [c.lat, c.lng]),
      metodo,
      tmax
    };
    
    const res  = await fetch(`${API}/api/resolver`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body)
    });
    const data = await res.json();

    if (data.erro) { alert('Erro: ' + data.erro); return; }


    desenharAsDuasRotas(data.inicial, data.rota);
    desenharGrafico(data.historico);
    
    
    const km = Number(data.custo).toFixed(2);
    document.getElementById('s-custo').textContent = km + ' km';
    document.getElementById('s-iter').textContent  = data.historico.length;
    document.getElementById('sb-status').textContent = 'rota calculada';

  } catch(err) {
    alert('Não foi possível conectar ao backend.\nVerifique se está rodando na porta 5000.');
  } finally {
    loading.classList.remove('show');
  }
}


function desenharAsDuasRotas(indicesIniciais, indicesOtimizados) {
  // Limpa o mapa antes de desenhar
  if (linhaInicial) { map.removeLayer(linhaInicial); }
  if (linhaOtimizada) { map.removeLayer(linhaOtimizada); }

  const cor = COR[metodo];

  // 1. Mapeia os índices bagunçados para Latitude/Longitude (Linha Reta)
  const coordsIniciais = indicesIniciais.map(i => [cidades[i].lat, cidades[i].lng]);
  coordsIniciais.push(coordsIniciais[0]); // Fecha o ciclo voltando pra casa

  // 2. Mapeia os índices otimizados para Latitude/Longitude (Linha Reta)
  const coordsOtimizadas = indicesOtimizados.map(i => [cidades[i].lat, cidades[i].lng]);
  coordsOtimizadas.push(coordsOtimizadas[0]); // Fecha o ciclo voltando pra casa

  // 3. Desenha a Rota Inicial Bagunçada (Cinza e Tracejada)
  linhaInicial = L.polyline(coordsIniciais, {
      color: '#888888',
      weight: 3,
      dashArray: '10, 10',
      opacity: 0.6
  }).addTo(map);

  // 4. Desenha a Rota Otimizada (Com a cor do algoritmo)
  linhaOtimizada = L.polyline(coordsOtimizadas, {
      color: cor,
      weight: 5,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round'
  }).addTo(map);

  // Faz a câmera do mapa focar exatamente nas rotas
  map.fitBounds(linhaOtimizada.getBounds(), { padding: [30, 30] });
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