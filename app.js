let mapa;
let marcadorUsuario = null; // Guarda el pin del GPS del usuario
let aves = [];
let aveActual = null;
let modoAdulto = true;
let fotosActuales = [];
let fotoIndex = 0;
let audioObjeto = null;
let vozActiva = false;

// Variables globales de paginación para el Álbum
let paginaActualAlbum = 1;
const avesPorPagina = 10;

document.addEventListener("DOMContentLoaded", () => {
  cargarBaseDeDatos();
});

// EVITA LA CACHÉ: Añade un número único de tiempo para obligar al navegador a leer el aves.json real de 50 aves
function cargarBaseDeDatos() {
  fetch(`aves.json?t=${new Date().getTime()}`)
    .then(response => {
      if (!response.ok) throw new Error("Error al cargar aves.json");
      return response.json();
    })
    .then(data => {
      aves = data;
      
      // Actualizar el contador en la interfaz
      const txtContador = document.getElementById('contador-aves');
      if (txtContador) {
        txtContador.textContent = `🐦 ${aves.length} aves`;
      }
      
      initMapa();
      renderizarAlbum(); 
      
      if(aves.length > 0) {
        seleccionarAve(aves[0], false); // Carga inicial sin mover bruscamente el mapa
      }
    })
    .catch(err => console.error("Error cargando aves.json: ", err));
}

function initMapa() {
  mapa = L.map('map').setView([-33.4489, -70.6693], 6);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(mapa);

  aves.forEach(ave => {
    const pinHtml = `
      <div class="ave-pin" style="background:${ave.pinColor || '#1E8449'};">
        <span class="ave-pin-emoji">${ave.emoji || '🐦'}</span>
      </div>
    `;
    
    const customIcon = L.divIcon({
      html: pinHtml,
      className: '',
      iconSize: [38, 38],
      iconAnchor: [19, 38]
    });

    const coords = ave.coordenadasEjemplo || [-33.4489, -70.6693];
    const marker = L.marker(coords, { icon: customIcon }).addTo(mapa);
    
    marker.on('click', () => {
      seleccionarAve(ave, true);
    });
  });
}

function seleccionarAve(ave, moverMapa = true) {
  aveActual = ave;
  
  // PARTE DE ADULTO: Estructura original intacta (Hábitat, Conservación y Avistamientos)
  document.getElementById('adulto-emoji').textContent = ave.emoji || '🐦';
  document.getElementById('adulto-nombre').textContent = ave.nombreComun || ave.nombre;
  document.getElementById('adulto-cientifico').textContent = ave.nombreCientifico || '';
  
  // Mantiene tus llamados exactos de la propiedad original datosAdulto
  document.getElementById('adulto-habitat').textContent = ave.datosAdulto?.habitat || ave.habitat || 'Sin datos';
  document.getElementById('adulto-conservacion').textContent = ave.datosAdulto?.estadoConservacion || ave.conservacion || 'Sin datos';

  // PARTE DE NIÑO: Adaptable a ambos formatos de propiedad por seguridad
  document.getElementById('nino-emoji').textContent = ave.emoji || '🐦';
  document.getElementById('nino-nombre').textContent = ave.nombreComun || ave.nombre;
  document.getElementById('nino-superpoder').textContent = ave.datosNino?.superpoder || ave.superpoder || '¡Puede volar muy alto!';

  // Limpieza de hilos de reproducción de audios y textos previos
  if(audioObjeto) { audioObjeto.pause(); audioObjeto = null; }
  document.getElementById('btn-audio-a').textContent = "🔊 Escuchar Canto";
  window.speechSynthesis?.cancel();
  vozActiva = false;
  document.getElementById('btn-voz-nino').textContent = "🐦 ¡Háblame!";

  if (moverMapa && mapa && ave.coordenadasEjemplo) {
    mapa.flyTo(ave.coordenadasEjemplo, 9, {
      animate: true,
      duration: 1.5
    });
  }

  // Búsqueda dinámica de imágenes en la API de iNaturalist usando el nombre científico
  obtenerFotosINaturalist(ave.nombreCientifico);
}

// CONEXIÓN DIRECTA CON LA API DE INATURALIST
function obtenerFotosINaturalist(nombreCientifico) {
  const contenedorAdulto = document.getElementById('car-adulto');
  const contenedorNino = document.getElementById('car-nino');
  
  if (contenedorAdulto) contenedorAdulto.innerHTML = `<div class="text-white text-xs p-4 text-center">Buscando fotos reales...</div>`;
  if (contenedorNino) contenedorNino.innerHTML = `<div class="text-pizarra text-xs p-4 text-center">Buscando fotos reales...</div>`;

  if (!nombreCientifico) {
    ponerImagenPorDefecto();
    return;
  }

  fetch(`https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(nombreCientifico)}&per_page=1`)
    .then(res => res.json())
    .then(data => {
      if(data.results && data.results.length > 0 && data.results[0].taxon_photos && data.results[0].taxon_photos.length > 0) {
        // Obtenemos hasta un máximo de 5 fotos de la comunidad de iNaturalist
        fotosActuales = data.results[0].taxon_photos.slice(0, 5).map(p => p.photo.medium_url);
      } else {
        ponerImagenPorDefecto();
      }
      fotoIndex = 0;
      dibujarCarrusel();
    })
    .catch(() => {
      ponerImagenPorDefecto();
    });
}

function ponerImagenPorDefecto() {
  fotosActuales = ["https://images.unsplash.com/photo-1484557052118-f32bd25b45b5?w=500"];
  fotoIndex = 0;
  dibujarCarrusel();
}

function dibujarCarrusel() {
  const contA = document.getElementById('car-adulto');
  const contN = document.getElementById('car-nino');
  const dotsA = document.getElementById('car-dots-adulto');
  const dotsN = document.getElementById('car-dots-nino');

  if(!contA || !contN) return;

  contA.innerHTML = ""; contN.innerHTML = "";
  if (dotsA) dotsA.innerHTML = "";
  if (dotsN) dotsN.innerHTML = "";

  fotosActuales.forEach((url, index) => {
    const claseActiva = index === fotoIndex ? 'activo' : '';
    contA.innerHTML += `<div class="car-slide ${claseActiva}"><img src="${url}" alt="Foto Ave"></div>`;
    contN.innerHTML += `<div class="car-slide ${claseActiva}"><img src="${url}" alt="Foto Ave"></div>`;

    const dotActivo = index === fotoIndex ? 'activo' : '';
    if(dotsA) dotsA.innerHTML += `<div class="car-dot ${dotActivo}" onclick="irAFoto(${index})"></div>`;
    if(dotsN) dotsN.innerHTML += `<div class="car-dot ${dotActivo}" onclick="irAFoto(${index})"></div>`;
  });
}

function carMover(direccion) {
  if (fotosActuales.length === 0) return;
  fotoIndex += direccion;
  if (fotoIndex >= fotosActuales.length) fotoIndex = 0;
  if (fotoIndex < 0) fotoIndex = fotosActuales.length - 1;
  dibujarCarrusel();
}

function irAFoto(index) {
  fotoIndex = index;
  dibujarCarrusel();
}

function renderizarAlbum() {
  const grid = document.getElementById('album-grid');
  if(!grid) return;
  grid.innerHTML = "";

  const inicio = (paginaActualAlbum - 1) * avesPorPagina;
  const fin = inicio + avesPorPagina;
  const avesPagina = aves.slice(inicio, fin);

  avesPagina.forEach(ave => {
    const nombre = ave.nombreComun || ave.nombre || "Ave";
    grid.innerHTML += `
      <div class="border border-gray-100 p-3 rounded-xl text-center bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors" 
           onclick="event.stopPropagation(); seleccionarAvePorId('${ave.id}')">
        <div class="text-3xl mb-1">${ave.emoji || '🐦'}</div>
        <div class="font-black text-sm text-pizarra leading-tight">${nombre}</div>
        <div class="text-xs text-pizarra/50 italic">${ave.nombreCientifico || ''}</div>
      </div>
    `;
  });

  const totalPaginas = Math.ceil(aves.length / avesPorPagina) || 1;
  const txtPag = document.getElementById('txt-paginacion');
  if (txtPag) txtPag.textContent = `Página ${paginaActualAlbum} de ${totalPaginas}`;
  
  const btnAnt = document.getElementById('btn-pag-ant');
  const btnSig = document.getElementById('btn-pag-sig');
  if (btnAnt) btnAnt.disabled = paginaActualAlbum === 1;
  if (btnSig) btnSig.disabled = paginaActualAlbum === totalPaginas;
}

function cambiarPaginaAlbum(direccion) {
  paginaActualAlbum += direccion;
  renderizarAlbum();
}

function seleccionarAvePorId(id) {
  const encontrado = aves.find(a => String(a.id) === String(id));
  if(encontrado) {
    seleccionarAve(encontrado, true);
    document.getElementById('app-header').scrollIntoView({ behavior: 'smooth' });
  }
}

function toggleModo() {
  modoAdulto = !modoAdulto;
  const tAdulto = document.getElementById('tarjeta-adulto');
  const tNino = document.getElementById('tarjeta-nino');
  const lbl = document.getElementById('label-modo');
  const thumb = document.getElementById('switch-thumb');

  if(modoAdulto) {
    tAdulto.classList.remove('oculta'); tAdulto.classList.add('visible');
    tNino.classList.remove('visible'); tNino.classList.add('oculta');
    lbl.textContent = "Adulto 📊"; thumb.style.transform = "translateX(0px)";
  } else {
    tAdulto.classList.remove('visible'); tAdulto.classList.add('oculta');
    tNino.classList.remove('oculta'); tNino.classList.add('visible');
    lbl.textContent = "Niño 🧸"; thumb.style.transform = "translateX(28px)";
  }
}

function toggleAudio() {
  if(!aveActual || !aveActual.sonidoUrl) return;
  const btn = document.getElementById('btn-audio-a');
  if(audioObjeto && !audioObjeto.paused) {
    audioObjeto.pause();
    btn.textContent = "🔊 Escuchar Canto";
  } else {
    if(!audioObjeto) audioObjeto = new Audio(aveActual.sonidoUrl);
    audioObjeto.play();
    btn.textContent = "⏸ Pausar Canto";
    audioObjeto.onended = () => btn.textContent = "🔊 Escuchar Canto";
  }
}

function abrirTab(tabName, boton) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('activo'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('activa'));
  document.getElementById(`panel-${tabName}`).classList.add('activo');
  boton.classList.add('activa');
}

function toggleVoz() {
  if(!aveActual) return;
  const btn = document.getElementById('btn-voz-nino');
  if(vozActiva) {
    window.speechSynthesis?.cancel();
    vozActiva = false;
    btn.textContent = "🐦 ¡Háblame!";
  } else {
    const nombre = aveActual.nombreComun || aveActual.nombre || "Ave";
    const frase = aveActual.fraseNino || `Hola, soy el ${nombre}`;
    const superpoder = aveActual.datosNino?.superpoder || aveActual.superpoder || 'volar muy alto';
    const texto = `${frase}. ¡Mi superpoder es: ${superpoder}!`;
    
    const ut = new SpeechSynthesisUtterance(texto);
    ut.lang = 'es-CL';
    ut.onend = () => {
      vozActiva = false;
      btn.textContent = "🐦 ¡Háblame!";
    };
    window.speechSynthesis?.speak(ut);
    vozActiva = true;
    btn.textContent = "⏸ Detener Voz";
  }
}

function centrarMiUbicacion() {
  if (!navigator.geolocation) {
    alert("Tu navegador o teléfono no soporta la geolocalización.");
    return;
  }

  const btnUbicacion = document.getElementById('btn-ubicacion');
  btnUbicacion.textContent = "⏳";

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      btnUbicacion.textContent = "📍";

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
      btnUbicacion.textContent = "📍";
      console.error("Error de GPS: ", error);
      alert("No se pudo obtener tu ubicación. Asegúrate de activar el GPS.");
    },
    { enableHighAccuracy: true, timeout: 7000 }
  );
}