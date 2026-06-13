// ==========================================
// CONFIGURACIÓN GLOBAL Y ESTADO DE LA APP
// ==========================================
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

// MODIFICACIÓN CRÍTICA: Forzar la lectura y limpiar caché local vieja
function cargarBaseDeDatos() {
  fetch('aves.json')
    .then(response => {
      if (!response.ok) throw new Error("Error al leer el archivo aves.json");
      return response.json();
    })
    .then(data => {
      // Guardamos la lista real del JSON de manera global
      aves = data;
      
      // LÓGICA DE CONTROL: Guardamos y validamos en localStorage para evitar que el navegador use datos viejos
      const avesEnMemoria = localStorage.getItem('aves_chile_data');
      if (avesEnMemoria) {
        const memoriaParseada = JSON.parse(avesEnMemoria);
        // Si los datos guardados en el navegador difieren en tamaño (ej. tenías 10 y ahora hay 50)
        if (memoriaParseada.length !== aves.length) {
          console.log(`[Base de Datos] Actualizando caché vieja de ${memoriaParseada.length} a ${aves.length} aves.`);
          localStorage.setItem('aves_chile_data', JSON.stringify(aves));
        }
      } else {
        localStorage.setItem('aves_chile_data', JSON.stringify(aves));
      }

      // Actualizar contador en la interfaz de usuario
      document.getElementById('contador-aves').textContent = `🐦 ${aves.length} aves`;
      
      // Inicializar el mapa y los componentes visuales
      initMapa();
      renderizarAlbum(); 
      
      if(aves.length > 0) {
        seleccionarAve(aves[0], false); // Iniciamos sin mover el mapa al arrancar
      }
    })
    .catch(err => {
      console.error("Error cargando aves.json: ", err);
      // Respaldo de emergencia por si el JSON falla temporalmente
      const respaldo = localStorage.getItem('aves_chile_data');
      if (respaldo) {
        aves = JSON.parse(respaldo);
        document.getElementById('contador-aves').textContent = `🐦 ${aves.length} aves`;
        initMapa();
        renderizarAlbum();
        if(aves.length > 0) seleccionarAve(aves[0], false);
      }
    });
}

function initMapa() {
  mapa = L.map('map').setView([-33.4489, -70.6693], 6);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(mapa);

  aves.forEach(ave => {
    const pinHtml = `
      <div class="ave-pin" style="background:${ave.pinColor || '#1E8449'};">
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
      seleccionarAve(ave, true); // Al hacer clic en el mapa, centramos suavemente
    });
  });
}

// moverMapa es un interruptor. Si es true, el mapa "vuela" hacia el ave.
function seleccionarAve(ave, moverMapa = true) {
  aveActual = ave;
  
  // Elementos Adulto
  document.getElementById('adulto-emoji').textContent = ave.emoji;
  document.getElementById('adulto-nombre').textContent = ave.nombreComun;
  document.getElementById('adulto-cientifico').textContent = ave.nombreCientifico;
  document.getElementById('adulto-habitat').textContent = ave.datosAdulto?.habitat || 'Sin datos';
  document.getElementById('adulto-conservacion').textContent = ave.datosAdulto?.estadoConservacion || 'Sin datos';

  // Elementos Niño
  document.getElementById('nino-emoji').textContent = ave.emoji;
  document.getElementById('nino-nombre').textContent = ave.nombreComun;
  document.getElementById('nino-superpoder').textContent = ave.datosNino?.superpoder || '¡Descubriendo!';

  // Reseteo de sonidos y voces activas
  if(audioObjeto) { audioObjeto.pause(); audioObjeto = null; }
  document.getElementById('btn-audio-a').textContent = "🔊 Escuchar Canto";
  window.speechSynthesis?.cancel();
  vozActiva = false;
  document.getElementById('btn-voz-nino').textContent = "🐦 ¡Háblame!";

  // Efecto de auto-zoom y vuelo dinámico en el mapa
  if (moverMapa && mapa) {
    mapa.flyTo(ave.coordenadasEjemplo, 9, {
      animate: true,
      duration: 1.5 // Duración del vuelo en segundos
    });
  }

  obtenerFotosINaturalist(ave.nombreCientifico);
}

function obtenerFotosINaturalist(nombreCientifico) {
  const contenedorAdulto = document.getElementById('car-adulto');
  const contenedorNino = document.getElementById('car-nino');
  
  if (contenedorAdulto) contenedorAdulto.innerHTML = `<div class="text-white text-xs p-4">Buscando fotos...</div>`;
  if (contenedorNino) contenedorNino.innerHTML = `<div class="text-pizarra text-xs p-4">Buscando fotos...</div>`;

  fetch(`https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(nombreCientifico)}&per_page=1`)
    .then(res => res.json())
    .then(data => {
      if(data.results && data.results.length > 0 && data.results[0].taxon_photos) {
        fotosActuales = data.results[0].taxon_photos.slice(0, 5).map(p => p.photo.medium_url);
      } else {
        fotosActuales = ["https://images.unsplash.com/photo-1484557052118-f32bd25b45b5?w=500"];
      }
      fotoIndex = 0;
      dibujarCarrusel();
    })
    .catch(() => {
      fotosActuales = ["https://images.unsplash.com/photo-1484557052118-f32bd25b45b5?w=500"];
      fotoIndex = 0;
      dibujarCarrusel();
    });
}

function dibujarCarrusel() {
  const contA = document.getElementById('car-adulto');
  const contN = document.getElementById('car-nino');
  const dotsA = document.getElementById('car-dots-adulto');
  const dotsN = document.getElementById('car-dots-nino');

  if(!contA || !contN) return;

  contA.innerHTML = ""; contN.innerHTML = "";
  dotsA.innerHTML = ""; dotsN.innerHTML = "";

  fotosActuales.forEach((url, index) => {
    const claseActiva = index === fotoIndex ? 'activo' : '';
    contA.innerHTML += `<div class="car-slide ${claseActiva}"><img src="${url}" alt="foto"></div>`;
    contN.innerHTML += `<div class="car-slide ${claseActiva}"><img src="${url}" alt="foto"></div>`;

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
    grid.innerHTML += `
      <div class="border border-gray-100 p-3 rounded-xl text-center bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors" 
           onclick="event.stopPropagation(); seleccionarAvePorId('${ave.id}')">
        <div class="text-3xl mb-1">${ave.emoji}</div>
        <div class="font-black text-sm text-pizarra">${ave.nombreComun}</div>
        <div class="text-xs text-pizarra/50 italic">${ave.nombreCientifico}</div>
      </div>
    `;
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
  // Aseguramos la búsqueda comparando strings o enteros de forma flexible
  const encontrado = aves.find(a => String(a.id) === String(id));
  if(encontrado) {
    seleccionarAve(encontrado, true); // Activa el vuelo del mapa hacia el ave seleccionada
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
    const frase = aveActual.fraseNino || `Hola, soy el ${aveActual.nombreComun}`;
    const superpoder = aveActual.datosNino?.superpoder || 'volar muy alto';
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

// Geolocalización GPS Real por Navegador
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
      alert("No se pudo obtener tu ubicación. Asegúrate de activar el GPS y dar permisos a la página.");
    },
    { enableHighAccuracy: true, timeout: 7000 }
  );
}
