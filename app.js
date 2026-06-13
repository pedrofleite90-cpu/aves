let mapa;
let marcadorUsuario = null; 
let aves = [];
let aveActual = null;
let modoAdulto = true;
let audioObjeto = null;
let vozActiva = false;

// VARIABLES DEL ÁLBUM Y GAMIFICACIÓN
let paginaActualAlbum = 1;
const avesPorPagina = 10;
// Cargamos las aves desbloqueadas desde el almacenamiento local del navegador
let avesDesbloqueadas = JSON.parse(localStorage.getItem('avesDesbloqueadas')) || [];

document.addEventListener("DOMContentLoaded", () => {
  // Insertamos los estilos CSS para las animaciones directamente
  inyectarEstilosAnimacion();
  cargarBaseDeDatos();
});

// FUNCIÓN NUEVA: Inyecta CSS de animaciones para que todo brille al desbloquear
function inyectarEstilosAnimacion() {
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes estallido {
      0% { transform: scale(1); filter: brightness(1); }
      50% { transform: scale(1.08); filter: brightness(1.3); box-shadow: 0 0 25px rgba(247, 220, 111, 0.6); }
      100% { transform: scale(1); filter: brightness(1); }
    }
    .animar-desbloqueo {
      animation: estallido 0.6s ease-in-out 2;
    }
    .tarjeta-bloqueada-estilo {
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .ave-desbloqueada-item {
      animation: estallido 0.5s ease-out 1;
    }
  `;
  document.head.appendChild(style);
}

function cargarBaseDeDatos() {
  fetch('aves.json')
    .then(response => response.json())
    .then(data => {
      aves = data;
      
      const txtContador = document.getElementById('contador-aves');
      if (txtContador) txtContador.textContent = `🐦 ${aves.length} aves`;
      
      initMapa();
      actualizarProgresoYMedallas(); 
      renderizarAlbum(); 
      
      if(aves.length > 0) {
        setTimeout(() => {
          seleccionarAve(aves[0], false);
        }, 50);
      }
    })
    .catch(err => console.error("Error cargando aves.json: ", err));
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

  const mapContainer = document.getElementById('map');
  if (!mapContainer) return;

  mapa = L.map('map').setView([-35.0000, -71.5000], 5);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(mapa);

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
  const elAdultoLine = document.getElementById('adulto-cientifico');
  const elAdultoHabitat = document.getElementById('adulto-habitat');
  const elAdultoConservacion = document.getElementById('adulto-conservacion');

  if (elAdultoEmoji) elAdultoEmoji.textContent = ave.emoji;
  if (elAdultoNombre) elAdultoNombre.textContent = ave.nombreComun || ave.nombre;
  if (elAdultoLine) elAdultoLine.textContent = ave.nombreCientifico;
  if (elAdultoHabitat) elAdultoHabitat.textContent = ave.habitat || "No especificado";
  if (elAdultoConservacion) elAdultoConservacion.textContent = ave.conservacion || "No evaluado";

  // === INYECCIÓN DE DATOS - MODO NIÑO ===
  const elNinoEmoji = document.getElementById('nino-emoji');
  const elNinoNombre = document.getElementById('nino-nombre');
  const elNinoSuperpoder = document.getElementById('nino-superpoder');

  if (elNinoEmoji) elNinoEmoji.textContent = ave.emoji;
  if (elNinoNombre) elNinoNombre.textContent = ave.nombreComun || ave.nombre;
  if (elNinoSuperpoder) elNinoSuperpoder.textContent = ave.superpoder || "¡Ser un ave genial! ✨";

  // Control de reproducción de audios anteriores
  if(audioObjeto) { audioObjeto.pause(); audioObjeto = null; }
  const btnAudioA = document.getElementById('btn-audio-a');
  if (btnAudioA) btnAudioA.textContent = "🔊 Escuchar Canto";
  
  window.speechSynthesis?.cancel();
  vozActiva = false;
  const btnVozNino = document.getElementById('btn-voz-nino');
  if (btnVozNino) btnVozNino.textContent = "🐦 ¡Háblame!";

  // ACTUALIZAR O CREAR EL BOTÓN DE DESBLOQUEO DE FORMA DINÁMICA
  actualizarBotonDesbloqueoDinamico();

  if (moverMapa && mapa && ave.coordenadasEjemplo) {
    mapa.flyTo(ave.coordenadasEjemplo, 7, { animate: true, duration: 1.2 });
  }
}

// FUNCIÓN NUEVA: Dibuja y gestiona el botón de registrar avistamiento en tiempo real
function actualizarBotonDesbloqueoDinamico() {
  // Buscamos un contenedor común en las tarjetas para inyectar el botón
  let btnRegistro = document.getElementById('btn-registro-manual-ave');
  
  if (!btnRegistro) {
    // Si no existe, lo insertamos justo arriba de los datos descriptivos de la tarjeta
    const contenedorTabs = document.querySelector('.tab-panel') || document.getElementById('tarjeta-adulto');
    if (contenedorTabs) {
      btnRegistro = document.createElement('button');
      btnRegistro.id = 'btn-registro-manual-ave';
      contenedorTabs.insertBefore(btnRegistro, contenedorTabs.firstChild);
    }
  }

  if (!btnRegistro || !aveActual) return;

  const estaDesbloqueada = avesDesbloqueadas.includes(Number(aveActual.id));

  if (estaDesbloqueada) {
    btnRegistro.className = "w-full mb-4 bg-gradient-to-r from-bosque to-hoja text-white font-black py-3 px-4 rounded-xl text-sm shadow-sm flex items-center justify-center gap-2 border border-bosque/20 cursor-default uppercase tracking-wider";
    btnRegistro.innerHTML = "<span>✅ ¡Especie Avistada y Coleccionada!</span>";
    btnRegistro.onclick = null; 
  } else {
    btnRegistro.className = "w-full mb-4 bg-gradient-to-r from-sol to-amber-500 hover:from-amber-500 hover:to-sol text-pizarra font-black py-3 px-4 rounded-xl text-sm shadow-md flex items-center justify-center gap-2 border border-sol animate-pulse transition-all transform hover:scale-[1.02]";
    btnRegistro.innerHTML = "<span>📸 Registrar Avistamiento ✨</span>";
    btnRegistro.onclick = () => {
      desbloquearAve(aveActual.id);
    };
  }
}

// LÓGICA DE JUEGO: DESBLOQUEAR AVES CON ANIMACIÓN SÚPER VISUAL
function desbloquearAve(id) {
  const aveId = Number(id);
  if (!avesDesbloqueadas.includes(aveId)) {
    avesDesbloqueadas.push(aveId);
    localStorage.setItem('avesDesbloqueadas', JSON.stringify(avesDesbloqueadas));
    
    // 1. Agregar efectos y clases de animación a las tarjetas principales
    const tAdulto = document.getElementById('tarjeta-adulto');
    const tNino = document.getElementById('tarjeta-nino');
    
    if (tAdulto) { tAdulto.classList.add('animar-desbloqueo'); setTimeout(() => tAdulto.classList.remove('animar-desbloqueo'), 1200); }
    if (tNino) { tNino.classList.add('animar-desbloqueo'); setTimeout(() => tNino.classList.remove('animar-desbloqueo'), 1200); }

    // 2. Refrescar los elementos de gamificación en el acto
    actualizarProgresoYMedallas();
    actualizarBotonDesbloqueoDinamico();
    renderizarAlbum(aveId); // Pasamos el ID para animar su aparición en el álbum
  }
}

function actualizarProgresoYMedallas() {
  if (aves.length === 0) return;
  
  const totalAves = aves.length;
  const totalDesbloqueadas = avesDesbloqueadas.length;
  const porcentaje = Math.round((totalDesbloqueadas / totalAves) * 100);

  let contenedorProgreso = document.getElementById('progreso-wrapper');
  
  if (!contenedorProgreso) {
    const albumGrid = document.getElementById('album-grid');
    if (albumGrid && albumGrid.parentNode) {
      contenedorProgreso = document.createElement('div');
      contenedorProgreso.id = 'progreso-wrapper';
      contenedorProgreso.className = 'mb-4 bg-white border border-gray-100 p-4 rounded-xl flex flex-col gap-2 shadow-sm';
      contenedorProgreso.innerHTML = `
        <div class="flex items-center justify-between font-black text-xs text-pizarra tracking-wider uppercase">
          <span id="txt-progreso-conteo">🏆 Descubiertas: 0 / 0</span>
          <span id="txt-medalla-rango" class="text-xs bg-sol/20 text-tierra px-2 py-1 rounded-md font-black">🥚 Huevo</span>
        </div>
        <div class="w-full bg-gray-100 h-3 rounded-full overflow-hidden border border-gray-200">
          <div id="barra-progreso-llenado" class="bg-gradient-to-r from-bosque via-hoja to-sol h-full transition-all duration-700" style="width: 0%"></div>
        </div>
      `;
      albumGrid.parentNode.insertBefore(contenedorProgreso, albumGrid);
    }
  }

  let medalla = "🥚 Explorador Principiante (Huevo)";
  if (porcentaje >= 25 && porcentaje < 50) medalla = "🐥 Observador Junior (Pichón)";
  if (porcentaje >= 50 && porcentaje < 75) medalla = "🦅 Guardián del Aire (Halcón)";
  if (porcentaje >= 75 && porcentaje < 100) medalla = "🇺🇦 Sabio del Bosque (Búho)";
  if (porcentaje === 100) medalla = "👑 ¡Cóndor Supremo de Chile! 🇨🇱";

  const elConteo = document.getElementById('txt-progreso-conteo');
  const elMedalla = document.getElementById('txt-medalla-rango');
  const elBarra = document.getElementById('barra-progreso-llenado');

  if (elConteo) elConteo.textContent = `🏆 Descubiertas: ${totalDesbloqueadas} / ${totalAves} (${porcentaje}%)`;
  if (elMedalla) elMedalla.textContent = medalla;
  if (elBarra) elBarra.style.width = `${porcentaje}%`;
}

// RENDERIZAR EL ÁLBUM CON CONTROL DE EFECTOS PARA EL AVE RECIÉN DESCUBIERTA
function renderizarAlbum(idRecienDesbloqueado = null) {
  const grid = document.getElementById('album-grid');
  if(!grid) return;
  grid.innerHTML = "";

  const inicio = (paginaActualAlbum - 1) * avesPorPagina;
  const fin = inicio + avesPorPagina;
  const avesPagina = aves.slice(inicio, fin);

  avesPagina.forEach(ave => {
    const estaDesbloqueada = avesDesbloqueadas.includes(Number(ave.id));
    const esLaNueva = Number(ave.id) === Number(idRecienDesbloqueado);
    const claseAnimacion = esLaNueva ? 'ave-desbloqueada-item border-2 border-sol' : 'border border-gray-100 bg-white';

    if (estaDesbloqueada) {
      grid.innerHTML += `
        <div class="p-3 rounded-xl text-center shadow-sm hover:shadow hover:bg-gray-50 cursor-pointer transition-all transform hover:scale-[1.03] ${claseAnimacion}" 
             onclick="event.stopPropagation(); seleccionarAvePorId(${ave.id})">
          <div class="text-3xl mb-1">${ave.emoji}</div>
          <div class="font-black text-sm text-pizarra">${ave.nombreComun || ave.nombre}</div>
          <div class="text-xs text-bosque font-extrabold uppercase tracking-widest mt-1" style="font-size: 9px;">✨ Descubierta</div>
        </div>
      `;
    } else {
      grid.innerHTML += `
        <div class="border border-gray-200 p-3 rounded-xl text-center bg-gray-100 opacity-60 filter grayscale cursor-not-allowed select-none tarjeta-bloqueada-estilo relative"
             onclick="event.stopPropagation(); alert('¡Haz clic sobre el pin de este ave en el mapa para registrarla! 🗺️')">
          <div class="absolute top-1 right-2 text-[10px] opacity-40">🔒</div>
          <div class="text-3xl mb-1 filter blur-[2px]">❓</div>
          <div class="font-bold text-xs text-gray-400 italic">Incógnita</div>
          <div class="text-pizarra/40 font-bold tracking-tighter mt-1" style="font-size: 8px; text-transform: uppercase;">Zona: ${ave.zona}</div>
        </div>
      `;
    }
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
        html: `<div style="background:#2980B9; width:20px; height:20px; border-radius:50%; border:3px solid white; box-shadow:0 0 10px rgba(0,0,0,0.4);\"></div>`,
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