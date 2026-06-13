let mapa;
let marcadorUsuario = null; // Guarda el pin del GPS del usuario
let aves = [];
let aveActual = null;
let modoAdulto = true;
let audioObjeto = null;
let vozActiva = false;

// Variables globales de paginación para el Álbum
let paginaActualAlbum = 1;
const avesPorPagina = 10;

document.addEventListener("DOMContentLoaded", () => {
  cargarBaseDeDatos();
});

function cargarBaseDeDatos() {
  fetch('aves.json')
    .then(response => response.json())
    .then(data => {
      aves = data;
      
      const txtContador = document.getElementById('contador-aves');
      if (txtContador) txtContador.textContent = `🐦 ${aves.length} aves`;
      
      // 1. Inicializamos el mapa con la base de datos lista
      initMapa();
      
      // 2. Renderizamos el Álbum de colección inferior
      renderizarAlbum(); 
      
      // 3. Seleccionamos la primera ave por defecto al arrancar, asegurando que el DOM exista
      if(aves.length > 0) {
        setTimeout(() => {
          seleccionarAve(aves[0], false);
        }, 50);
      }
    })
    .catch(err => console.error("Error cargando aves.json: ", err));
}

// Generador de coordenadas fijas distribuidas por zonas geográficas para que se vean todos los pines en Chile
function obtenerCoordenadasPorZona(ave) {
  if (ave.coordenadasEjemplo) return ave.coordenadasEjemplo;
  
  let lat = -33.4489; 
  let lng = -70.6693;
  
  const zona = ave.zona.toLowerCase();
  if (zona.includes("norte") || zona.includes("altiplano") || zona.includes("atacama")) {
    lat = -22.0 - (ave.id * 0.15);
    lng = -68.5 - ((ave.id % 3) * 0.1);
  } else if (zona.includes("sur") || zona.includes("patagonia") || zona.includes("austral") || zona.includes("chiloé")) {
    lat = -42.0 - (ave.id * 0.12);
    lng = -72.5 - ((ave.id % 3) * 0.1);
  } else if (zona.includes("juan fernández") || zona.includes("robinson crusoe")) {
    lat = -33.6350;
    lng = -78.8319 + (ave.id * 0.01);
  } else { // Centro / Todo Chile
    lat = -31.5 - (ave.id * 0.18);
    lng = -70.8 - ((ave.id % 3) * 0.08);
  }
  return [lat, lng];
}

function initMapa() {
  if (mapa && typeof mapa.remove === 'function') {
    mapa.remove();
  }

  const mapContainer = document.getElementById('map');
  if (!mapContainer) return;

  // Vista inicial centrada en el corazón de Chile
  mapa = L.map('map').setView([-35.0000, -71.5000], 5);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(mapa);

  // Dibujamos cada pin en el mapa de forma inmediata
  aves.forEach(ave => {
    ave.coordenadasEjemplo = obtenerCoordenadasPorZona(ave);
    const colorPin = ave.pinColor || '#1E8449'; 
    
    const pinHtml = `
      <div class="ave-pin" style="background:${colorPin}; width:38px; height:38px; border-radius:50% 50% 50% 0; transform: rotate(-45deg); display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 2px 5px rgba(0,0,0,0.3);">
        <span class="ave-pin-emoji" style="transform: rotate(45deg); font-size:18px;">${ave.emoji}</span>
      </div>
    `;
    
    const customIcon = L.divIcon({
      html: pinHtml,
      className: '',
      iconSize: [38, 38],
      iconAnchor: [19, 38]
    });

    const marker = L.marker(ave.coordenadasEjemplo, { icon: customIcon }).addTo(mapa);
    
    marker.on('click', () => {
      seleccionarAve(ave, true); 
    });
  });
}

function seleccionarAve(ave, moverMapa = true) {
  if (!ave) return;
  aveActual = ave;
  
  // === INYECCIÓN DE DATOS - MODO ADULTO ===
  const elAdultoEmoji = document.getElementById('adulto-emoji');
  const elAdultoNombre = document.getElementById('adulto-nombre');
  const elAdultoCientifico = document.getElementById('adulto-cientifico');
  const elAdultoHabitat = document.getElementById('adulto-habitat');
  const elAdultoConservacion = document.getElementById('adulto-conservacion');

  if (elAdultoEmoji) elAdultoEmoji.textContent = ave.emoji;
  if (elAdultoNombre) elAdultoNombre.textContent = ave.nombreComun || ave.nombre;
  if (elAdultoCientifico) elAdultoCientifico.textContent = ave.nombreCientifico;
  if (elAdultoHabitat) elAdultoHabitat.textContent = ave.habitat || "No especificado";
  if (elAdultoConservacion) elAdultoConservacion.textContent = ave.conservacion || "No evaluado";

  // === INYECCIÓN DE DATOS - MODO NIÑO ===
  const elNinoEmoji = document.getElementById('nino-emoji');
  const elNinoNombre = document.getElementById('nino-nombre');
  const elNinoSuperpoder = document.getElementById('nino-superpoder');

  if (elNinoEmoji) elNinoEmoji.textContent = ave.emoji;
  if (elNinoNombre) elNinoNombre.textContent = ave.nombreComun || ave.nombre;
  if (elNinoSuperpoder) elNinoSuperpoder.textContent = ave.superpoder || "¡Ser un ave genial! ✨";

  // Control e interrupción de audios anteriores para evitar solapamientos
  if(audioObjeto) { audioObjeto.pause(); audioObjeto = null; }
  const btnAudioA = document.getElementById('btn-audio-a');
  if (btnAudioA) btnAudioA.textContent = "🔊 Escuchar Canto";
  
  window.speechSynthesis?.cancel();
  vozActiva = false;
  const btnVozNino = document.getElementById('btn-voz-nino');
  if (btnVozNino) btnVozNino.textContent = "🐦 ¡Háblame!";

  // Animación suave de vuelo del mapa si se clickea un pin o el álbum
  if (moverMapa && mapa && ave.coordenadasEjemplo) {
    mapa.flyTo(ave.coordenadasEjemplo, 7, {
      animate: true,
      duration: 1.2 
    });
  }
}

function renderizarAlbum() {
  const grid = document.getElementById('album-grid');
  if(!grid) return;
  grid.innerHTML = "";

  const inicio = (paginaActualAlbum - 1) * avesPorPagina;
  const fin = inicio + avesPorPagina;
  const avesPagina = aves.slice(inicio, fin);

  avesPagina.forEach(ave => {
    grid.innerHTML += `
      <div class="border border-gray-100 p-3 rounded-xl text-center bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors" 
           onclick="event.stopPropagation(); seleccionarAvePorId(${ave.id})">
        <div class="text-3xl mb-1">${ave.emoji}</div>
        <div class="font-black text-sm text-pizarra">${ave.nombreComun || ave.nombre}</div>
        <div class="text-xs text-pizarra/50 italic">${ave.nombreCientifico}</div>
      </div>
    `;
  });

  const totalPaginas = Math.ceil(aves.length / avesPorPagina) || 1;
  const txtPag = document.getElementById('txt-paginacion');
  if(txtPag) txtPag.textContent = `Página ${paginaActualAlbum} de ${totalPaginas}`;
  
  const btnAnt = document.getElementById('btn-pag-ant');
  const btnSig = document.getElementById('btn-pag-sig');
  if(btnAnt) btnAnt.disabled = paginaActualAlbum === 1;
  if(btnSig) btnSig.disabled = paginaActualAlbum === totalPaginas;
}

function cambiarPaginaAlbum(direccion) {
  paginaActualAlbum += direccion;
  renderizarAlbum();
}

function seleccionarAvePorId(id) {
  const encontrado = aves.find(a => a.id === Number(id));
  if(encontrado) {
    seleccionarAve(encontrado, true); 
    document.getElementById('app-header')?.scrollIntoView({ behavior: 'smooth' });
  }
}

function toggleModo() {
  modoAdulto = !modoAdulto;
  const tAdulto = document.getElementById('tarjeta-adulto');
  const tNino = document.getElementById('tarjeta-nino');
  const lbl = document.getElementById('label-modo');
  const thumb = document.getElementById('switch-thumb');

  if(modoAdulto) {
    tAdulto?.classList.remove('oculta'); tAdulto?.classList.add('visible');
    tNino?.classList.remove('visible'); tNino?.classList.add('oculta');
    if(lbl) lbl.textContent = "Adulto 📊"; 
    if(thumb) thumb.style.transform = "translateX(0px)";
  } else {
    tAdulto?.classList.remove('visible'); tAdulto?.classList.add('oculta');
    tNino?.classList.remove('oculta'); tNino?.classList.add('visible');
    if(lbl) lbl.textContent = "Niño 🧸"; 
    if(thumb) thumb.style.transform = "translateX(28px)";
  }
}

function toggleAudio() {
  if(!aveActual || !aveActual.sonidoUrl) {
    alert("El canto real en audio no está configurado para esta especie.");
    return;
  }
  const btn = document.getElementById('btn-audio-a');
  if(audioObjeto && !audioObjeto.paused) {
    audioObjeto.pause();
    if(btn) btn.textContent = "🔊 Escuchar Canto";
  } else {
    if(!audioObjeto) audioObjeto = new Audio(aveActual.sonidoUrl);
    audioObjeto.play();
    if(btn) btn.textContent = "⏸ Pausar Canto";
    audioObjeto.onended = () => { if(btn) btn.textContent = "🔊 Escuchar Canto"; };
  }
}

function abrirTab(tabName, boton) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('activo'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('activa'));
  document.getElementById(`panel-${tabName}`)?.classList.add('activo');
  boton?.classList.add('activa');
}

function toggleVoz() {
  if(!aveActual) return;
  const btn = document.getElementById('btn-voz-nino');
  if(vozActiva) {
    window.speechSynthesis?.cancel();
    vozActiva = false;
    if(btn) btn.textContent = "🐦 ¡Háblame!";
  } else {
    const textoInformativo = aveActual.datoCurioso || "¡Soy un ave fantástica de Chile!";
    const texto = `¡Hola! Soy el ${aveActual.nombreComun || aveActual.nombre}. ${textoInformativo} ¡Mi superpoder es: ${aveActual.superpoder}!`;
    
    const ut = new SpeechSynthesisUtterance(texto);
    ut.lang = 'es-CL';
    ut.onend = () => {
      vozActiva = false;
      if(btn) btn.textContent = "🐦 ¡Háblame!";
    };
    window.speechSynthesis?.speak(ut);
    vozActiva = true;
    if(btn) btn.textContent = "⏸ Detener Voz";
  }
}

function centrarMiUbicacion() {
  if (!navigator.geolocation) {
    alert("Tu dispositivo no soporta geolocalización.");
    return;
  }
  const btnUbicacion = document.getElementById('btn-ubicacion');
  if(btnUbicacion) btnUbicacion.textContent = "⏳";

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      if(btnUbicacion) btnUbicacion.textContent = "📍";

      if (marcadorUsuario) {
        mapa.removeLayer(marcadorUsuario);
      }

      const usuarioIcon = L.divIcon({
        html: `<div style="background:#2980B9; width:20px; height:20px; border-radius:50%; border:3px solid white; box-shadow:0 0 10px rgba(0,0,0,0.4);"></div>`,
        className: '',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      marcadorUsuario = L.marker([lat, lng], { icon: usuarioIcon }).addTo(mapa)
        .bindPopup("<b class='p-2 block text-center text-xs text-pizarra'>¡Estás aquí! 🌲</b>")
        .openPopup();

      mapa.flyTo([lat, lng], 13, { animate: true, duration: 1.8 });
    },
    (error) => {
      if(btnUbicacion) btnUbicacion.textContent = "📍";
      console.error("Error GPS: ", error);
      alert("No pudimos obtener tu ubicación actual.");
    },
    { enableHighAccuracy: true, timeout: 7000 }
  );
}