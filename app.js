// ==========================================
// CONFIGURACIÓN GLOBAL Y ESTADO DE LA APP
// ==========================================
let mapa = null;
let marcadoresGroup = null;
let todasLasAves = [];
let modoActual = 'adulto'; // 'adulto' o 'nino'

// Coordenadas iniciales del mapa (Centro de Chile)
const CHILE_CENTRO = [-35.675147, -71.542969];
const ZOOM_INICIAL = 5;

// ==========================================
// 1. CARGA DE DATOS (MIGRACIÓN A 50 AVES)
// ==========================================
async function inicializarDatos() {
    try {
        // Traer el archivo aves.json actualizado
        const respuesta = await fetch('aves.json');
        if (!respuesta.ok) throw new Error("No se pudo obtener el archivo aves.json");
        const avesNuevas = await respuesta.json();
        
        // Verificar almacenamiento local (localStorage)
        const memoriaLocal = localStorage.getItem('aves_data');
        
        if (memoriaLocal) {
            const avesGuardadas = JSON.parse(memoriaLocal);
            
            // SI DETECTA QUE PASAMOS DE 10 A 50 AVES, SE ACTUALIZA AUTOMÁTICAMENTE
            if (avesGuardadas.length !== avesNuevas.length) {
                console.log(`[Base de Datos] Sincronizando de ${avesGuardadas.length} a ${avesNuevas.length} aves.`);
                localStorage.setItem('aves_data', JSON.stringify(avesNuevas));
                todasLasAves = avesNuevas;
            } else {
                todasLasAves = avesGuardadas;
            }
        } else {
            // Primera ejecución de la app
            localStorage.setItem('aves_data', JSON.stringify(avesNuevas));
            todasLasAves = avesNuevas;
        }
        
        // Renderizar la interfaz inicial
        actualizarListaAves(todasLasAves);
        actualizarMapa(todasLasAves);
        actualizarContadores();

    } catch (error) {
        console.error("Error crítico al inicializar la aplicación:", error);
        alert("Hubo un problema al cargar la base de datos de aves.");
    }
}

// ==========================================
// 2. CONFIGURACIÓN DEL MAPA (LEAFLET)
// ==========================================
function inicializarMapa() {
    // Evitar duplicación si ya está inicializado
    if (mapa !== null) return;

    mapa = L.map('mapa', {
        center: CHILE_CENTRO,
        zoom: ZOOM_INICIAL,
        minZoom: 4,
        maxZoom: 12
    });

    // Capa de mapa estilizada y limpia (CartoDB Positron)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(mapa);

    // Grupo contenedor para poder limpiar/recalcular marcadores fácilmente
    marcadoresGroup = L.layerGroup().addTo(mapa);
}

function actualizarMapa(avesAFiltrar) {
    if (!marcadoresGroup) return;
    marcadoresGroup.clearLayers();

    // Mapeo aproximado de zonas a coordenadas para posicionar los pines en el mapa
    const coordenadasZonas = {
        "Centro-Sur": [-36.5, -72.0],
        "Sur (Bosque Templado)": [-41.5, -72.5],
        "Todo Chile": [-33.4, -70.6],
        "Centro-Sur y Juan Fernández": [-33.6, -78.8],
        "Sur y Patagonia": [-45.5, -72.0],
        "Centro-Sur (Migratorio)": [-38.0, -72.2],
        "Cordillera de los Andes": [-33.0, -70.2],
        "Centro-Sur y Patagonia": [-43.0, -71.5],
        "Norte-Centro-Sur": [-29.5, -70.5],
        "Altiplano y Patagonia": [-18.5, -69.2],
        "Norte Chico y Centro (Endémica)": [-30.0, -71.0],
        "Sur (Bosque Nativo)": [-40.0, -73.0],
        "Sur (Bosques de Araucaria y Coigüe)": [-38.5, -71.3],
        "Todo el litoral e internacionales": [-32.0, -71.5],
        "Centro-Sur y lagos australes": [-39.5, -72.0],
        "Humedales costeros (Chiloé)": [-42.5, -73.7],
        "Centro-Sur y Canales Australes": [-46.0, -74.0],
        "Costas de todo Chile (Migratoria)": [-25.0, -70.5],
        "Todo el litoral costero": [-36.8, -73.1],
        "Litoral marino": [-30.3, -71.6],
        "Costas del Norte y Centro": [-23.5, -70.4],
        "Islotes costeros Norte y Centro": [-29.0, -71.5],
        "Canales y Costas del Sur": [-53.0, -70.9],
        "Norte Chico a Centro-Sur": [-31.5, -71.2],
        "Bofedales del Altiplano": [-19.2, -69.0],
        "Humedales del Centro y Sur": [-37.3, -73.0],
        "Extremo Austral y Patagonia": [-51.5, -72.5],
        "Lagos y lagunas de todo Chile": [-35.2, -71.8],
        "Cordillera y Extremo Austral": [-49.0, -73.0],
        "Atacama al extremo austral": [-27.3, -70.3],
        "Atacama a Tierra del Fuego": [-44.0, -71.8],
        "Antofagasta a Región de Aysén": [-34.0, -71.0],
        "Bosques del Sur y Patagonia": [-42.0, -72.8],
        "Atacama a la Región de Aysén": [-32.5, -71.1]
    };

    avesAFiltrar.forEach(ave => {
        const coords = coordenadasZonas[ave.zona] || CHILE_CENTRO;
        
        // Agregar una pequeña variación (jitter) para que los pines de la misma zona no se tapen por completo
        const latVariacion = coords[0] + (Math.random() - 0.5) * 0.4;
        const lngVariacion = coords[1] + (Math.random() - 0.5) * 0.4;

        // Generar el HTML del pin usando su propiedad pinColor nativa de aves.json
        const pinHTML = `
            <div style="
                background-color: ${ave.pinColor}; 
                width: 36px; 
                height: 36px; 
                border-radius: 50% 50% 50% 0; 
                transform: rotate(-45deg); 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                border: 2px solid white; 
                box-shadow: 0px 2px 5px rgba(0,0,0,0.4);">
                <span style="transform: rotate(45deg); font-size: 16px;">${ave.emoji}</span>
            </div>`;

        const customIcon = L.divIcon({
            html: pinHTML,
            className: 'custom-bird-pin',
            iconSize: [36, 36],
            iconAnchor: [18, 36],
            popupAnchor: [0, -36]
        });

        // Crear ventana flotante (Popup)
        const contenidoPopup = `
            <div class="p-2 text-center font-sans">
                <span class="text-2xl">${ave.emoji}</span>
                <h4 class="font-bold text-gray-800 text-sm mt-1">${ave.nombre}</h4>
                <p class="text-xs italic text-gray-500">${ave.nombreCientifico}</p>
                <button onclick="verDetalleAve(${ave.id})" class="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs py-1 px-3 rounded-full transition shadow">
                    Ver Avistamiento
                </button>
            </div>
        `;

        L.marker([latVariacion, lngVariacion], { icon: customIcon })
            .bindPopup(contenidoPopup)
            .addTo(marcadoresGroup);
    });
}

// ==========================================
// 3. RENDERIZADO DE LA INTERFAZ DE USUARIO
// ==========================================
function actualizarListaAves(avesAMostrar) {
    const contenedor = document.getElementById('lista-aves');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    if (avesAMostrar.length === 0) {
        contenedor.innerHTML = `
            <div class="col-span-full text-center py-8 text-gray-500">
                ⚠️ No se encontraron aves que coincidan con la búsqueda o filtro.
            </div>`;
        return;
    }

    avesAMostrar.forEach(ave => {
        const tarjeta = document.createElement('div');
        tarjeta.className = "bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition border border-gray-100 flex flex-col justify-between cursor-pointer";
        tarjeta.setAttribute('onclick', `verDetalleAve(${ave.id})`);

        tarjeta.innerHTML = `
            <div>
                <div class="flex justify-between items-start mb-2">
                    <span class="text-3xl bg-gray-50 p-2 rounded-xl">${ave.emoji}</span>
                    <span class="text-xs px-2 py-1 rounded-full font-medium" style="background-color: ${ave.pinColor}22; color: ${ave.pinColor}">
                        ${ave.zona.split('(')[0].trim()}
                    </span>
                </div>
                <h3 class="font-bold text-gray-800 text-base mb-0.5">${ave.nombre}</h3>
                <p class="text-xs italic text-gray-400 mb-2">${ave.nombreCientifico}</p>
            </div>
            <div class="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center text-xs">
                <span class="text-gray-500 font-medium">📋 ${ave.conservacion}</span>
                <span class="text-indigo-600 font-semibold hover:underline">Ver ficha →</span>
            </div>
        `;
        contenedor.appendChild(tarjeta);
    });
}

function actualizarContadores() {
    const badgeTotal = document.getElementById('contador-total');
    if (badgeTotal) {
        badgeTotal.textContent = `${todasLasAves.length} Especies`;
    }
}

// ==========================================
// 4. VISTA DE DETALLES Y MODOS (ADULTO / NIÑO)
// ==========================================
function verDetalleAve(id) {
    const ave = todasLasAves.find(a => a.id === id);
    if (!ave) return;

    // Cambiar a la vista/pestaña de detalle (Lógica de tu HTML)
    mostrarPestaña('vista-detalle');

    // Elementos comunes
    document.getElementById('detalle-emoji').textContent = ave.emoji;
    document.getElementById('detalle-nombre').textContent = ave.nombre;
    document.getElementById('detalle-cientifico').textContent = ave.nombreCientifico;
    document.getElementById('detalle-zona').textContent = ave.zona;
    document.getElementById('detalle-conservacion').textContent = ave.conservacion;

    // Configurar paneles específicos según el modo activo
    const panelAdulto = document.getElementById('info-modo-adulto');
    const panelNino = document.getElementById('info-modo-nino');

    if (modoActual === 'adulto') {
        panelAdulto.classList.remove('hidden');
        panelNino.classList.add('hidden');
        document.getElementById('detalle-habitat').textContent = ave.habitat;
    } else {
        panelAdulto.classList.add('hidden');
        panelNino.classList.remove('hidden');
        document.getElementById('nino-superpoder').textContent = ave.superpoder;
        document.getElementById('nino-curioso').textContent = ave.datoCurioso;
        document.getElementById('nino-color').textContent = ave.colorFavorito;
    }

    // Configurar el botón de audio con una API simulada o el lector de voz de la sección niños
    const btnVoz = document.getElementById('btn-hablame');
    if (btnVoz) {
        btnVoz.onclick = () => {
            const textoAEscuchar = `${ave.nombre}. Mi superpoder es: ${ave.superpoder}. ¿Sabías qué? ${ave.datoCurioso}`;
            const proferencia = new SpeechSynthesisUtterance(textoAEscuchar);
            proferencia.lang = 'es-CL';
            window.speechSynthesis.cancel(); // Detener audios anteriores
            window.speechSynthesis.speak(proferencia);
        };
    }
}

// ==========================================
// 5. FILTROS, BUSCADOR Y CAMBIO DE MODOS
// ==========================================
function filtrarAves() {
    const busqueda = document.getElementById('buscador')?.value.toLowerCase() || '';
    const zonaFiltro = document.getElementById('filtro-zona')?.value || 'todas';

    const avesFiltradas = todasLasAves.filter(ave => {
        const coincideBusqueda = ave.nombre.toLowerCase().includes(busqueda) || 
                                 ave.nombreCientifico.toLowerCase().includes(busqueda);
        const coincideZona = zonaFiltro === 'todas' || ave.zona.toLowerCase().includes(zonaFiltro.toLowerCase());
        
        return coincideBusqueda && coincideZona;
    });

    actualizarListaAves(avesFiltradas);
    actualizarMapa(avesFiltradas);
}

function cambiarModo(modo) {
    modoActual = modo;
    const btnAdulto = document.getElementById('modo-adulto');
    const btnNino = document.getElementById('modo-nino');

    if (modo === 'adulto') {
        btnAdulto?.classList.add('bg-indigo-600', 'text-white');
        btnAdulto?.classList.remove('bg-gray-100', 'text-gray-600');
        btnNino?.classList.add('bg-gray-100', 'text-gray-600');
        btnNino?.classList.remove('bg-amber-500', 'text-white');
    } else {
        btnNino?.classList.add('bg-amber-500', 'text-white');
        btnNino?.classList.remove('bg-gray-100', 'text-gray-600');
        btnAdulto?.classList.add('bg-gray-100', 'text-gray-600');
        btnAdulto?.classList.remove('bg-indigo-600', 'text-white');
    }
    
    // Si hay un ave abierta en detalle al cambiar de modo, refrescar sus campos dinámicos
    const tituloDetalle = document.getElementById('detalle-nombre')?.textContent;
    if (tituloDetalle) {
        const aveActual = todasLasAves.find(a => a.nombre === tituloDetalle);
        if (aveActual) verDetalleAve(aveActual.id);
    }
}

// Control nativo de navegación por pestañas de la interfaz HTML
function mostrarPestaña(idPestaña) {
    const vistas = ['vista-mapa', 'vista-lista', 'vista-detalle'];
    vistas.forEach(v => {
        const el = document.getElementById(v);
        if (el) {
            if (v === idPestaña) el.classList.remove('hidden');
            else el.classList.add('hidden');
        }
    });

    // Forzar el redibujado de Leaflet si regresamos al mapa (arregla bugs visuales de cajas grises)
    if (idPestaña === 'vista-mapa' && mapa) {
        setTimeout(() => mapa.invalidateSize(), 100);
    }
}

// ==========================================
// 6. DETONADORES EN EL EVENTO LOAD
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar mapa Leaflet básico
    inicializarMapa();

    // Cargar y validar JSON dinámico de 50 aves
    inicializarDatos();

    // Asignar escuchas al buscador y selectores si existen en el DOM
    document.getElementById('buscador')?.addEventListener('input', filtrarAves);
    document.getElementById('filtro-zona')?.addEventListener('change', filtrarAves);
});