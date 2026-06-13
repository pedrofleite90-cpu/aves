function obtenerFotosINaturalist(nombreCientifico) {
  const contenedorAdulto = document.getElementById('car-adulto');
  const contenedorNino = document.getElementById('car-nino');
  
  // Mostrar estados de carga limpios adaptados a tus estilos nativos
  if (contenedorAdulto) contenedorAdulto.innerHTML = `<div class="text-white text-xs p-4 h-full flex items-center justify-center">🔍 Buscando fotos reales...</div>`;
  if (contenedorNino) contenedorNino.innerHTML = `<div class="text-pizarra text-xs p-4 h-full flex items-center justify-center">🎨 Buscando fotitos...</div>`;

  // Consultamos el taxón en iNaturalist de forma exacta
  fetch(`https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(nombreCientifico)}&per_page=1`)
    .then(res => res.json())
    .then(data => {
      // 1. Verificamos rigurosamente que existan resultados y fotos asociadas al taxón
      if (data.results && data.results.length > 0 && data.results[0].taxon_photos && data.results[0].taxon_photos.length > 0) {
        
        // 2. Extraemos estrictamente un máximo de 3 fotos reales (.slice(0,3))
        fotosActuales = data.results[0].taxon_photos.slice(0, 3).map(p => {
          // El objeto real es p.photo.url
          let urlOriginal = p.photo.url;
          
          // 3. iNaturalist da por defecto tamaño 'square' (75x75). 
          // Lo cambiamos dinámicamente a 'medium' para que se adapte perfecto al celular sin pixelarse.
          return urlOriginal ? urlOriginal.replace("square", "medium") : "https://images.unsplash.com/photo-1484557052118-f32bd25b45b5?w=500";
        });

      } else {
        // Respaldo si el ave no tiene registros fotográficos públicos en iNaturalist
        fotosActuales = ["https://images.unsplash.com/photo-1484557052118-f32bd25b45b5?w=500"];
      }
      
      fotoIndex = 0;
      dibujarCarrusel();
    })
    .catch((err) => {
      console.error("Error conectando a iNaturalist:", err);
      // Respaldo en caso de error de red o desconexión de la API
      fotosActuales = ["https://images.unsplash.com/photo-1484557052118-f32bd25b45b5?w=500"];
      fotoIndex = 0;
      dibujarCarrusel();
    });
}