// ==========================================
// ESTADO GLOBAL DE LA APP
// ==========================================
let infoAves = [];          // Aquí se cargarán las 54 aves del aves.json
let aveSeleccionada = null;  // Ave que se muestra actualmente en pantalla
let imagenesActuales = [];  // URLs de las fotos devueltas por iNaturalist
let idxImagenActual = 0;    // Índice del carrusel de fotos

// ==========================================
// 1. CARGA DE LA BASE DE DATOS (aves.json)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  fetch("aves.json")
    .then(response => {
      if (!response.ok) throw new Error("No se pudo cargar el archivo aves.json");
      return response.json();
    })
    .then(data => {
      infoAves = data;
      console.log(`✅ Base de datos cargada: ${infoAves.length} aves detectadas.`);
      
      // Actualizar contadores visuales de tu index original
      const contador = document.getElementById("contador-aves");
      if (contador) contador.innerText = `🐦 ${infoAves.length} aves`;

      // Inicializar funciones del mapa y cargar el ave por defecto (ej: la primera)
      inicializarMapaConAves();
      seleccionarAve(infoAves[0].id);
    })
    .catch(error => {
      console.error("❌ Error al inicializar la base de datos:", error);
    });
});

// ==========================================
// 2. CONEXIÓN CON LA API DE iNATURALIST
// ==========================================
async function cargarImagenesINaturalist(nombreCientifico) {
  // Limpiamos el carrusel actual y mostramos un estado de carga rápido
  const contenedorAdulto = document.getElementById("car-adulto");
  const contenedorNino = document.getElementById("car-nino");
  
  if (contenedorAdulto) contenedorAdulto.innerHTML = `<div class="car-placeholder text-white text-xs p-4 flex items-center justify-center h-full">🔍 Buscando fotos reales en iNaturalist...</div>`;
  if (contenedorNino) contenedorNino.innerHTML = `<div class="car-placeholder text-pizarra text-xs p-4 flex items-center justify-center h-full">🎨 Buscando fotitos...</div>`;

  // Codificamos el nombre científico para la URL (Ej: "Tachuris rubrigastra")
  const query = encodeURIComponent(nombreCientifico);
  const urlAPI = `https://api.inaturalist.org/v1/taxa?q=${query}&per_page=1`;

  try {
    const respuesta = await fetch(urlAPI);
    const datos = await respuesta.json();

    imagenesActuales = []; // Reiniciamos el contenedor de URLs
    idxImagenActual = 0;

    // Estructura de iNaturalist: resultados -> taxon -> taxon_photos
    if (datos.results && datos.results[0] && datos.results[0].taxon_photos) {
      const fotosRepasadas = datos.results[0].taxon_photos;
      
      // Filtramos y convertimos las imágenes a tamaño "medium" o "large" para que no se vean pixeladas
      imagenesActuales = fotosRepasadas.map(p => {
        let urlOriginal = p.photo.url;
        // iNaturalist por defecto da la versión "square". Reemplazamos por "medium"
        return urlOriginal.replace("square", "medium");
      });
    }

    // Si la API no encontró fotos, usamos una de respaldo para que la app no quede en blanco
    if (imagenesActuales.length === 0) {
      imagenesActuales.push("https://images.unsplash.com/photo-1444464666168-49d633b86797?w=600");
    }

    // Dibujar el carrusel en la interfaz con los resultados reales
    renderizarCarrusel();

  } catch (error) {
    console.error(`❌ Error conectando con iNaturalist para ${nombreCientifico}:`, error);
    imagenesActuales = ["https://images.unsplash.com/photo-1444464666168-49d633b86797?w=600"];
    renderizarCarrusel();
  }
}

// ==========================================
// 3. RENDERIZADO DEL CARRUSEL EN ADULTO Y NIÑO
// ==========================================
function renderizarCarrusel() {
  const contenedorAdulto = document.getElementById("car-adulto");
  const contenedorNino = document.getElementById("car-nino");
  const dotsAdulto = document.getElementById("car-dots-adulto");
  const dotsNino = document.getElementById("car-dots-nino");

  // Limpiar contenedores
  if (contenedorAdulto) contenedorAdulto.innerHTML = "";
  if (contenedorNino) contenedorNino.innerHTML = "";
  if (dotsAdulto) dotsAdulto.innerHTML = "";
  if (dotsNino) dotsNino.innerHTML = "";

  // Generar cada slide fotográfico
  imagenesActuales.forEach((url, index) => {
    const esActivo = index === idxImagenActual ? "activo" : "";

    // Inyección en Modo Adulto
    if (contenedorAdulto) {
      const slideA = document.createElement("div");
      slideA.className = `car-slide ${esActivo}`;
      slideA.innerHTML = `<img src="${url}" alt="Foto ${index + 1}" class="w-full h-full object-cover">`;
      contenedorAdulto.appendChild(slideA);

      const dotA = document.createElement("div");
      dotA.className = `car-dot ${esActivo}`;
      dotA.onclick = () => irAImagen(index);
      dotsAdulto.appendChild(dotA);
    }

    // Inyección en Modo Niño
    if (contenedorNino) {
      const slideN = document.createElement("div");
      slideN.className = `car-slide ${esActivo}`;
      slideN.innerHTML = `<img src="${url}" alt="Foto infantil ${index + 1}" class="w-full h-full object-cover">`;
      contenedorNino.appendChild(slideN);

      const dotN = document.createElement("div");
      dotN.className = `car-dot ${esActivo}`;
      dotN.onclick = () => irAImagen(index);
      dotsNino.appendChild(dotN);
    }
  });
}

// Controles de navegación manual por clicks o flechas (izq/der)
function carMover(direccion) {
  if (imagenesActuales.length <= 1) return;
  
  idxImagenActual += direccion;
  if (idxImagenActual >= imagenesActuales.length) idxImagenActual = 0;
  if (idxImagenActual < 0) idxImagenActual = imagenesActuales.length - 1;
  
  actualizarSlidesVisibles();
}

function irAImagen(index) {
  idxImagenActual = index;
  actualizarSlidesVisibles();
}

function actualizarSlidesVisibles() {
  // Manejo de clases dinámicas 'activo' para los elementos inyectados
  const contenedores = ["car-adulto", "car-nino"];
  contenedores.forEach(id => {
    const contenedor = document.getElementById(id);
    if (contenedor) {
      const slides = contenedor.getElementsByClassName("car-slide");
      const dots = document.getElementById(id === "car-adulto" ? "car-dots-adulto" : "car-dots-nino").getElementsByClassName("car-dot");
      
      for (let i = 0; i < slides.length; i++) {
        slides[i].classList.remove("activo");
        if (dots[i]) dots[i].classList.remove("activo");
      }
      if (slides[idxImagenActual]) slides[idxImagenActual].classList.add("activo");
      if (dots[idxImagenActual]) dots[idxImagenActual].classList.add("activo");
    }
  });
}

// ==========================================
// 4. SELECCIÓN Y CONFIGURACIÓN DEL AVE EN PANTALLA
// ==========================================
function seleccionarAve(idAve) {
  const ave = infoAves.find(a => a.id === idAve);
  if (!ave) return;

  aveSeleccionada = ave;

  // 1. Actualizar textos e información en la Tarjeta de Adultos
  document.getElementById("adulto-nombre").innerText = ave.nombreComun || ave.nombre;
  document.getElementById("adulto-cientifico").innerText = ave.nombreCientifico;
  document.getElementById("adulto-emoji").innerText = ave.emoji || "🐦";
  document.getElementById("adulto-habitat").innerText = ave.habitat || "Sin descripción de hábitat disponible.";
  
  const badgeZona = document.getElementById("adulto-zona");
  if (badgeZona) badgeZona.innerText = `📍 ${ave.zona || 'Chile'}`;

  const conservacionTexto = document.getElementById("adulto-conservacion-texto");
  if (conservacionTexto) conservacionTexto.innerText = ave.conservacion || "Preocupación Menor";

  // 2. Actualizar textos e información en la Tarjeta de Niños
  document.getElementById("nino-nombre").innerText = ave.nombreComun || ave.nombre;
  document.getElementById("nino-emoji").innerText = ave.emoji || "🐦";
  document.getElementById("nino-superpoder").innerText = ave.superpoder || "¡Volar alto y cantar muy fuerte! 🚀";
  
  const ninoDato = document.getElementById("nino-dato");
  if (ninoDato) ninoDato.innerText = ave.datoCurioso || "Le encanta pasear por los cielos chilenos.";

  // 3. LLAMAR A LA API DE iNATURALIST USANDO EL NOMBRE CIENTÍFICO PERFECTO
  cargarImagenesINaturalist(ave.nombreCientifico);
}

// Función de marcador de posición para evitar errores si tu código llama al mapa antes de integrarlo por completo
function inicializarMapaConAves() {
  console.log("🗺️ Listo para inicializar marcadores del mapa con las 54 aves.");
  // Aquí va la lógica de tus pines de Leaflet.js mapeando sobre `infoAves`
}
