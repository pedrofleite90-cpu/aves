// Dentro de la función seleccionarAve(idAve)...
const contenedorCalendario = document.getElementById("adulto-calendario");

if (contenedorCalendario) {
  contenedorCalendario.innerHTML = ""; // Limpiamos el contenedor anterior
  
  const nombresMeses = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  
  nombresMeses.forEach((mes, index) => {
    const numeroMes = index + 1;
    // Verificamos si el mes actual está dentro del array de avistamiento del ave
    const seAvista = ave.mesesAvistamiento.includes(numeroMes);
    
    // Creamos el indicador visual (ej: un circulito o cuadrito por mes)
    const elementoMes = document.createElement("span");
    elementoMes.innerText = mes;
    elementoMes.className = `inline-block text-xs font-bold px-2 py-1 rounded mr-1 ${
      seAvista ? "bg-verde text-white" : "bg-pizarra-claro text-pizarra opacity-40"
    }`;
    
    contenedorCalendario.appendChild(elementoMes);
  });
}
