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

  // 2. Mapeamos as duas caixas diferentes do seu HTML
  const divTmax = document.getElementById('param-tmax');
  const divGenetico = document.getElementById('params-genetico');

  
  if (m === 'genetico') {
      // Se for Genético: Esconde o TMAX e mostra os 5 campos
      divTmax.style.display = 'none';
      divGenetico.style.display = 'block';
  } else {
      // Se for outro: Mostra o TMAX e esconde os 5 campos
      divTmax.style.display = (m === 'encosta_t' || m === 'tempera') ? 'block' : 'none';
      divGenetico.style.display = 'none';
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
  if (linhaInicial)   { map.removeLayer(linhaInicial);   linhaInicial   = null; }
  if (linhaOtimizada) { map.removeLayer(linhaOtimizada); linhaOtimizada = null; }

  const cor = COR[metodo];

  // 1. Coordenadas da rota inicial (ordem aleatória)
  const coordsIniciais = indicesIniciais.map(i => [cidades[i].lat, cidades[i].lng]);
  coordsIniciais.push(coordsIniciais[0]);

  // 2. Coordenadas da rota otimizada
  const coordsOtimizadas = indicesOtimizados.map(i => [cidades[i].lat, cidades[i].lng]);
  coordsOtimizadas.push(coordsOtimizadas[0]);

  // 3. Rota Inicial
  linhaInicial = L.polyline(coordsIniciais, {
    color:     '#ff6b35',
    weight:    4,
    dashArray: '12, 8',
    opacity:   0.85,
    lineCap:   'round',
    lineJoin:  'round'
  }).addTo(map);
  linhaInicial.bindTooltip('Rota Inicial (aleatória)', { sticky: true });

  // 4. Rota Otimizada 
  linhaOtimizada = L.polyline(coordsOtimizadas, {
    color:     cor,
    weight:    5,
    opacity:   0.95,
    lineCap:   'round',
    lineJoin:  'round'
  }).addTo(map);
  linhaOtimizada.bindTooltip('Rota Otimizada', { sticky: true });

  // Respeita o estado atual dos toggles
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