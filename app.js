let mapa;
let marcadorUsuario = null; 
let aves = [];
let aveActual = null;
let modoAdulto = true;

// Controladores de Sonidos y Voz
let audioObj = null;
let audioSonando = false;
let notasTimer = null;
let vozActiva = false;

// Variables de Control del Álbum Gamificado
let paginaActualAlbum = 1;
const avesPorPagina = 10;
let avesDesbloqueadas = JSON.parse(localStorage.getItem('avesDesbloqueadas')) || [];

document.addEventListener("DOMContentLoaded", () => {
  cargarBaseDeDatos();
});

function cargarBaseDeDatos() {
  fetch('aves.json')
    .then(response => response.json())
    .then(data => {
      aves = data;
      
      const txtContador = document.getElementById('contador-aves');
      if (txtContador) txtContador.textContent = `🐦 ${aves.length} especies registradas`;
      
      initMapa();
      actualizarProgresoYMedallas(); 
      renderizarAlbum(); 
      
      if(aves.length > 0) {
        setTimeout(() => {
          seleccionarAve(aves[0], false);
        }, 50);
      }
    })
    .catch(err => {
      console.error("Error cargando aves.json: ", err);
      mostrarToast("Error al cargar la base de datos", "❌");
    });
}

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
  } else { 
    lat = -31.5 - (ave.id * 0.18);
    lng = -70.8 - ((ave.id % 3) * 0.08);
  }
  return [lat, lng];
}

function initMapa() {
  if (mapa && typeof mapa.remove === 'function') {
    mapa.remove();
  }
  mapa = L.map('map').setView([-35.0000, -71.5000], 5);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(mapa);

  aves.forEach(ave => {
    ave.coordenadasEjemplo = obtenerCoordenadasPorZona(ave);
    const colorPin = ave.pinColor || '#1E8449'; 
    
    const pinHtml = `
      <div class="ave-pin" style="background:${colorPin};">
        <span class="ave-pin-emoji">${ave.emoji}</span>
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
  
  detenerAudio();
  window.speechSynthesis?.cancel();
  vozActiva = false;
  const btnVoz = document.getElementById('btn-voz-nino');
  if (btnVoz) btnVoz.textContent = "🗣️ ¡Háblame del ave!";

  // Inyectar datos en tarjetas
  document.getElementById('adulto-emoji').textContent = ave.emoji;
  document.getElementById('adulto-nombre').textContent = ave.nombreComun || ave.nombre;
  document.getElementById('adulto-cientifico').textContent = ave.nombreCientifico;
  document.getElementById('adulto-zona').textContent = ave.zona;
  document.getElementById('adulto-conservacion').textContent = ave.conservacion || "Preocupación Menor";
  document.getElementById('adulto-habitat').textContent = ave.habitat || "Sin especificar.";

  document.getElementById('nino-emoji').textContent = ave.emoji;
  document.getElementById('nino-nombre').textContent = ave.nombreComun || ave.nombre;
  document.getElementById('nino-superpoder').textContent = ave.superpoder || "¡Volar muy alto! ✨";
  document.getElementById('nino-curioso').textContent = ave.datoCurioso || "¡Es una especie genial!";

  actualizarBotonAvistamiento();

  if (moverMapa && mapa && ave.coordenadasEjemplo) {
    mapa.flyTo(ave.coordenadasEjemplo, 7, { animate: true, duration: 1.2 });
  }
}

function actualizarBotonAvistamiento() {
  const btn = document.getElementById('btn-registrar-avistamiento');
  if (!btn || !aveActual) return;

  const estaDesbloqueada = avesDesbloqueadas.includes(Number(aveActual.id));

  if (estaDesbloqueada) {
    btn.className = "w-full bg-gradient-to-r from-bosque to-emerald-600 text-white font-black py-3.5 px-5 rounded-2xl shadow-sm flex items-center justify-center gap-2 text-sm uppercase tracking-wider cursor-default";
    btn.innerHTML = "✅ ¡Especie Registrada en tu Colección!";
  } else {
    btn.className = "w-full bg-gradient-to-r from-sol to-amber-500 hover:from-amber-500 hover:to-sol text-pizarra font-black py-3.5 px-5 rounded-2xl shadow-md border-2 border-sol flex items-center justify-center gap-2 text-sm uppercase tracking-wider transition-all transform active:scale-95 animate-pulse";
    btn.innerHTML = "📸 Registrar Avistamiento ✨";
  }
}

function registrarAvistamientoActual() {
  if (!aveActual) return;
  const aveId = Number(aveActual.id);

  if (avesDesbloqueadas.includes(aveId)) {
    mostrarToast("Esta especie ya está en tu álbum", "🐦");
    return;
  }

  avesDesbloqueadas.push(aveId);
  localStorage.setItem('avesDesbloqueadas', JSON.stringify(avesDesbloqueadas));

  // Animaciones de estallido visual
  const tAdulto = document.getElementById('tarjeta-adulto');
  const tNino = document.getElementById('tarjeta-nino');
  if (tAdulto) { tAdulto.classList.add('animar-desbloqueo'); setTimeout(() => tAdulto.classList.remove('animar-desbloqueo'), 1000); }
  if (tNino) { tNino.classList.add('animar-desbloqueo'); setTimeout(() => tNino.classList.remove('animar-desbloqueo'), 1000); }

  mostrarToast(`¡${aveActual.nombreComun} añadido al álbum!`, "🏆");
  
  actualizarProgresoYMedallas();
  actualizarBotonAvistamiento();
  renderizarAlbum(aveId);
}

function actualizarProgresoYMedallas() {
  if (aves.length === 0) return;
  const total = aves.length;
  const descubiertas = avesDesbloqueadas.length;
  const porcentaje = Math.round((descubiertas / total) * 100);

  let rango = "🥚 Huevo (Principiante)";
  if (porcentaje >= 25 && porcentaje < 50) rango = "🐥 Pichón (Observador)";
  if (porcentaje >= 50 && porcentaje < 75) rango = "🦅 Halcón (Guardián)";
  if (porcentaje >= 75 && porcentaje < 100) rango = "🦉 Búho (Experto)";
  if (porcentaje === 100) rango = "👑 ¡Cóndor Supremo! 🇨🇱";

  document.getElementById('txt-progreso-conteo').textContent = `🏆 Descubiertas: ${descubiertas} / ${total} (${porcentaje}%)`;
  document.getElementById('txt-medalla-rango').textContent = rango;
  document.getElementById('barra-progreso-llenado').style.width = `${porcentaje}%`;
}

function renderizarAlbum(idNueva = null) {
  const grid = document.getElementById('album-grid');
  if(!grid) return;
  grid.innerHTML = "";

  const inicio = (paginaActualAlbum - 1) * avesPorPagina;
  const fin = inicio + avesPorPagina;
  const avesPagina = aves.slice(inicio, fin);

  avesPagina.forEach(ave => {
    const descubierta = avesDesbloqueadas.includes(Number(ave.id));
    const esNueva = Number(ave.id) === Number(idNueva);

    if (descubierta) {
      grid.innerHTML += `
        <div class="p-3 rounded-2xl text-center shadow-sm border border-hoja bg-white hover:bg-gray-50 cursor-pointer transition-all transform active:scale-95 ${esNueva ? 'animar-desbloqueo border-2 border-sol' : ''}"
             onclick="event.stopPropagation(); seleccionarAvePorId(${ave.id})">
          <div class="text-3xl mb-1">${ave.emoji}</div>
          <div class="font-black text-xs text-pizarra">${ave.nombreComun || ave.nombre}</div>
          <div class="text-[9px] text-bosque font-black uppercase mt-1">✨ Avistada</div>
        </div>
      `;
    } else {
      grid.innerHTML += `
        <div class="border border-gray-200 p-3 rounded-2xl text-center bg-gray-100 opacity-50 filter grayscale cursor-not-allowed select-none relative"
             onclick="event.stopPropagation(); mostrarToast('¡Pulsa registrar avistamiento para desbloquearla!', '🔒')">
          <div class="absolute top-1 right-2 text-[9px]">🔒</div>
          <div class="text-3xl mb-1 filter blur-[2px]">❓</div>
          <div class="font-bold text-xs text-gray-400 italic">Incógnita</div>
          <div class="text-[8px] text-pizarra/40 font-black uppercase mt-1">Zona: ${ave.zona.split(' ')[0]}</div>
        </div>
      `;
    }
  });

  const totalPaginas = Math.ceil(aves.length / avesPorPagina) || 1;
  document.getElementById('txt-paginacion').textContent = `Página ${paginaActualAlbum} de ${totalPaginas}`;
  document.getElementById('btn-pag-ant').disabled = paginaActualAlbum === 1;
  document.getElementById('btn-pag-sig').disabled = paginaActualAlbum === totalPaginas;
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

// CONTROL DE AUDIOS Y ELEMENTOS DE ADORNO
function toggleAudio() {
  if (!aveActual || !aveActual.sonidoUrl) {
    mostrarToast("Canto no disponible para esta especie", "🔇");
    return;
  }

  if (audioSonando) {
    detenerAudio();
  } else {
    audioObj = new Audio(aveActual.sonidoUrl);
    audioObj.play().then(() => {
      audioSonando = true;
      document.querySelectorAll('.btn-audio').forEach(btn => btn.classList.add('sonando'));
      document.getElementById('audio-icon-a').textContent = '⏹';
      document.getElementById('audio-lbl-a').textContent = 'Detener Canto';
      document.getElementById('audio-icon-n').textContent = '⏹';
      document.getElementById('audio-lbl-n').textContent = 'Detener Canto';

      if (!modoAdulto) lanzarNotas();

      audioObj.onended = () => detenerAudio();
    }).catch(() => {
      mostrarToast("No se pudo reproducir el canto", "🔇");
    });
  }
}

function detenerAudio() {
  if (audioObj) {
    audioObj.pause();
    audioObj = null;
  }
  audioSonando = false;
  clearInterval(notasTimer);
  document.querySelectorAll('.btn-audio').forEach(btn => btn.classList.remove('sonando'));
  
  if (document.getElementById('audio-icon-a')) document.getElementById('audio-icon-a').textContent = '🔊';
  if (document.getElementById('audio-lbl-a')) document.getElementById('audio-lbl-a').textContent = 'Escuchar Canto Real';
  if (document.getElementById('audio-icon-n')) document.getElementById('audio-icon-n').textContent = '🎵';
  if (document.getElementById('audio-lbl-n')) document.getElementById('audio-lbl-n').textContent = '¡Escuchar Pajarito!';
}

function lanzarNotas() {
  const emojis = ['🎵','🎶','✨','🎼','🎵','🎶'];
  const ref = document.getElementById('btn-audio-n');
  if (!ref) return;
  clearInterval(notasTimer);

  notasTimer = setInterval(() => {
    if (!audioSonando) { clearInterval(notasTimer); return; }
    const nota = document.createElement('div');
    nota.className = 'nota';
    nota.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    nota.style.left = (15 + Math.random() * 70) + '%';
    nota.style.bottom = '48px';
    ref.parentElement.style.position = 'relative';
    ref.parentElement.appendChild(nota);
    setTimeout(() => nota.remove(), 1700);
  }, 380);
}

function toggleVoz() {
  if (!aveActual) return;
  const btn = document.getElementById('btn-voz-nino');

  if (vozActiva) {
    window.speechSynthesis?.cancel();
    vozActiva = false;
    if (btn) btn.textContent = "🗣️ ¡Háblame del ave!";
  } else {
    const dCurioso = aveActual.datoCurioso || "Es un ave fantástica de Chile.";
    const sPoder = aveActual.superpoder || "¡Tener plumas increíbles!";
    const relato = `¡Hola! Soy el ${aveActual.nombreComun}. ${dCurioso} ¡Mi superpoder oculto es ${sPoder}!`;

    const utterance = new SpeechSynthesisUtterance(relato);
    utterance.lang = 'es-CL';
    utterance.onend = () => {
      vozActiva = false;
      if (btn) btn.textContent = "🗣️ ¡Háblame del ave!";
    };

    window.speechSynthesis?.speak(utterance);
    vozActiva = true;
    if (btn) btn.textContent = "⏹ Detener Relato";
  }
}

function toggleModo() {
  modoAdulto = !modoAdulto;
  const tAdulto = document.getElementById('tarjeta-adulto');
  const tNino = document.getElementById('tarjeta-nino');
  const thumb = document.getElementById('switch-thumb');
  const emoji = document.getElementById('switch-emoji');

  detenerAudio();

  if (modoAdulto) {
    tAdulto.classList.add('activo'); tNino.classList.remove('activo');
    if (thumb) thumb.style.transform = "translateX(0px)";
    if (emoji) emoji.textContent = "📊";
  } else {
    tNino.classList.add('activo'); tAdulto.classList.remove('activo');
    if (thumb) thumb.style.transform = "translateX(32px)";
    if (emoji) emoji.textContent = "🧸";
  }
}

function mostrarToast(msg, icono = "✨") {
  const toast = document.getElementById('toast');
  const tIcon = document.getElementById('toast-icon');
  const tMsg = document.getElementById('toast-msg');

  if (!toast) return;
  tIcon.textContent = icono;
  tMsg.textContent = msg;

  toast.classList.add('ver');
  setTimeout(() => { toast.classList.remove('ver'); }, 2800);
}

function centrarMiUbicacion() {
  if (!navigator.geolocation) {
    mostrarToast("Tu navegador no soporta GPS", "📍");
    return;
  }
  const btn = document.getElementById('btn-ubicacion');
  if (btn) btn.textContent = "⏳";

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      if (btn) btn.textContent = "📍";
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      if (marcadorUsuario) mapa.removeLayer(marcadorUsuario);

      const uIcon = L.divIcon({
        html: `<div style="background:#2980B9; width:20px; height:20px; border-radius:50%; border:3px solid white; box-shadow:0 0 10px rgba(0,0,0,0.4);"></div>`,
        className: '', iconSize: [20, 20], iconAnchor: [10, 10]
      });

      marcadorUsuario = L.marker([lat, lng], { icon: uIcon }).addTo(mapa)
        .bindPopup("<b class='p-2 block text-center text-xs text-pizarra'>¡Estás aquí! 🌲</b>")
        .openPopup();

      mapa.flyTo([lat, lng], 13, { animate: true, duration: 1.8 });
    },
    () => {
      if (btn) btn.textContent = "📍";
      mostrarToast("No pudimos acceder al GPS", "❌");
    },
    { enableHighAccuracy: true, timeout: 7000 }
  );
}