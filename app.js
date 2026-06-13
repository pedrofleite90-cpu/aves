// Función para inicializar y cargar la base de datos de aves
async function cargarBaseDeDatos() {
    try {
        // 1. Ir a buscar el archivo aves.json actualizado con las 50 aves
        const respuesta = await fetch('aves.json');
        const avesNuevas = await respuesta.json();
        
        // 2. Obtener lo que está guardado actualmente en la memoria del navegador
        const avesEnMemoria = localStorage.getItem('aves_data');
        
        if (avesEnMemoria) {
            const avesParseadas = JSON.parse(avesEnMemoria);
            
            // Si la cantidad de aves en memoria es diferente a las 50 del JSON,
            // forzamos la actualización para que no se quede pegado en las 10 antiguas.
            if (avesParseadas.length !== avesNuevas.length) {
                console.log(`Actualizando base de datos de ${avesParseadas.length} a ${avesNuevas.length} aves.`);
                localStorage.setItem('aves_data', JSON.stringify(avesNuevas));
                return avesNuevas;
            }
            
            // Si ya son 50, respetamos la memoria por si el usuario ya marcó alguna como "descubierta"
            return avesParseadas;
        } else {
            // Si es la primera vez que se abre, guardamos las 50 aves directo
            localStorage.setItem('aves_data', JSON.stringify(avesNuevas));
            return avesNuevas;
        }
        
    } catch (error) {
        console.error("Error al cargar el archivo aves.json:", error);
    }
}