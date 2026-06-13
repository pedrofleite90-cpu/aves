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

function cargarBaseDeDatos() {
  fetch('aves.json')
    .then(response => response.json())
    .then(data => {
      aves = data;
      document.getElementById('contador-aves').textContent = `🐦 ${aves.length} aves`;
      
      // Inicializamos el mapa y renderizamos los componentes con la data ya lista
      initMapa();
      renderizarAlbum(); 
      
      if(aves.length > 0) {
        seleccionarAve(aves[0], false); // Iniciamos mostrando el primer ave sin mover bruscamente el mapa al cargar
      }
    })
    .catch(err => console.error("Error cargando aves.json: ", err));
}

// Generador de coordenadas simuladas distribuidas a lo largo de Chile según la zona geográfica de la especie
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
  // Evitamos inicializaciones duplicadas en memoria
  if (mapa && typeof mapa.remove === 'function') {
    mapa.remove();
  }

  // Centrado inicial de la vista general en Chile
  mapa = L.map('map').setView([-38.0000, -72.0000], 5);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(mapa);

  // Dibujamos de forma segura cada pin sobre el mapa ya construido
  aves.forEach(ave => {
    ave.coordenadasEjemplo = obtenerCoordenadasPorZona(ave);

    // Si tu JSON no define pinColor, usamos el verde bosque por defecto
    const colorPin = ave.pinColor || '#1E8449'; 
    
    // HTML estilizado del pin con el emoji flotante correspondiente
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
      seleccionarAve(ave, true); // Vuelo animado al pulsar el pin del mapa
    });
  });
}

function seleccionarAve(ave, moverMapa = true) {
  aveActual = ave;
  
  // Rellenar información de la interfaz de Adultos
  document.getElementById('adulto-emoji').textContent = ave.emoji;
  document.getElementById('adulto-nombre').textContent = ave.nombreComun;
  document.getElementById('adulto-cientifico').textContent = ave.nombreCientifico;
  document.getElementById('adulto-habitat').textContent = ave.habitat;
  document.getElementById('adulto-conservacion').textContent = ave.conservacion;

  // Rellenar información de la interfaz de Niños
  document.getElementById('nino-emoji').textContent = ave.emoji;
  document.getElementById('nino-nombre').textContent = ave.nombreComun;
  document.getElementById('nino-superpoder').textContent = ave.superpoder;

  // Detener reproducciones anteriores de voz o cantos para evitar solapamientos
  if(audioObjeto) { audioObjeto.pause(); audioObjeto = null; }
  document.getElementById('btn-audio-a').textContent = "🔊 Escuchar Canto";
  window.speechSynthesis?.cancel();
  vozActiva = false;
  document.getElementById('btn-voz-nino').textContent = "🐦 ¡Háblame!";

  // Desplazamiento dinámico de cámara en Leaflet
  if (moverMapa && mapa && ave.coordenadasEjemplo) {
    mapa.flyTo(ave.coordenadasEjemplo, 7, {
      animate: true,
      duration: 1.5 
    });
  }

  // Traer de forma inmediata las 3 fotos reales de iNaturalist
  obtenerFotosINaturalist(ave.nombreCientifico);
}

function obtenerFotosINaturalist(nombreCientifico) {
  const contenedorAdulto = document.getElementById('car-adulto');
  const contenedorNino = document.getElementById('car-nino');
  
  if (contenedorAdulto) contenedorAdulto.innerHTML = `<div class="text-white text-xs p-4 h-full flex items-center justify-center">🔍 Buscando fotos reales...</div>`;
  if (contenedorNino) contenedorNino.innerHTML = `<div class="text-pizarra text-xs p-4 h-full flex items-center justify-center">🎨 Buscando fotitos...</div>`;

  fetch(`https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(nombreCientifico)}&per_page=1`)
    .then(res => res.json())
    .then(data => {
      // Validamos la existencia de taxones y fotos en la respuesta
      if(data.results && data.results.length > 0 && data.results[0].taxon_photos && data.results[0].taxon_photos.length > 0) {
        
        // Mapeamos y extraemos estrictamente un tope de 3 imágenes reales (.slice(0, 3))
        fotosActuales = data.results[0].taxon_photos.slice(0, 3).map(p => {
          let urlFoto = p.photo.url; // Propiedad nativa de la API
          
          // Reemplazamos el tamaño miniatura 'square' por 'medium' para que no se pixelee en pantalla
          return urlFoto ? urlFoto.replace("square", "medium") : "https://images.unsplash.com/photo-1484557052118-f32bd25b45b5?w=500";
        });
        
      } else {
        // Imagen de respaldo si no hay registros públicos en la plataforma
        fotosActuales = ["https://images.unsplash.com/photo-1484557052118-f32bd25b45b5?w=500"];
      }
      fotoIndex = 0;
      dibujarCarrusel();
    })
    .catch(err => {
      console.error("Error al conectar con iNaturalist: ", err);
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