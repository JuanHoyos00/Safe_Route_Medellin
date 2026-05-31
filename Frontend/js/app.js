// ==========================================
// app.js - Control de Interfaz de Usuario
// ==========================================

let estadoClick = 'origen';
let coordsOrigen = null;
let coordsDestino = null;
let mapaBloqueado = false; // <--- NUEVO: Control para no llenar de líneas

// Referencias del DOM
const origenInput = document.getElementById('origen-input');
const destinoInput = document.getElementById('destino-input');
const rutaSlider = document.getElementById('ruta-slider');
const prefValue = document.getElementById('pref-value');
const statsPanel = document.getElementById('stats-panel');
const panelLateral = document.getElementById('panel-lateral');
const toggleBtn = document.getElementById('toggle-panel');
const algoSelect = document.getElementById('algo-select'); // <--- NUEVO

// 1. LÓGICA DE OCULTAR/MOSTRAR PANEL
if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
        panelLateral.classList.toggle('oculto');
        const icono = toggleBtn.querySelector('i');
        if (panelLateral.classList.contains('oculto')) {
            icono.classList.replace('fa-chevron-left', 'fa-chevron-right');
        } else {
            icono.classList.replace('fa-chevron-right', 'fa-chevron-left');
        }
        setTimeout(() => map.invalidateSize(), 300);
    });
}

// 2. LÓGICA DEL SLIDER ÚNICO
if (rutaSlider) {
    rutaSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (val === 0) prefValue.innerText = "Solo Rapidez";
        else if (val === 1) prefValue.innerText = "Solo Seguridad";
        else if (val < 0.5) prefValue.innerText = "Prioriza Rapidez";
        else if (val > 0.5) prefValue.innerText = "Prioriza Seguridad";
        else prefValue.innerText = "Balanceada";
    });
}

// 3. CLICS EN EL MAPA (CON BLOQUEO)
map.on('click', function(e) {
    if (mapaBloqueado) {
        return alert("Ya elegiste los puntos. Haz clic en 'Limpiar Mapa' para seleccionar otra ruta.");
    }

    const lat = parseFloat(e.latlng.lat.toFixed(6));
    const lon = parseFloat(e.latlng.lng.toFixed(6));

    if (estadoClick === 'origen') {
        coordsOrigen = [lat, lon];
        MapManager.setOrigin(lat, lon);
        origenInput.value = `${lat}, ${lon}`;
        estadoClick = 'destino';
    } else {
        coordsDestino = [lat, lon];
        MapManager.setDestination(lat, lon);
        destinoInput.value = `${lat}, ${lon}`;

        // ¡Bloqueamos el mapa al tener ambos puntos!
        mapaBloqueado = true;
    }
});

// 4. LÓGICA DE GPS (CON BLOQUEO)
function obtenerGPS(inputElement, esOrigen) {
    if (mapaBloqueado) return alert("Limpia el mapa primero.");
    if (!navigator.geolocation) return alert("Tu navegador no soporta GPS.");

    inputElement.value = "Buscando...";
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            if (esOrigen) {
                coordsOrigen = [lat, lon];
                MapManager.setOrigin(lat, lon);
                estadoClick = 'destino';
            } else {
                coordsDestino = [lat, lon];
                MapManager.setDestination(lat, lon);
                mapaBloqueado = true; // Bloquear si ya hay destino
            }
            inputElement.value = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
            map.setView([lat, lon], 16);
        },
        (error) => alert("No pudimos acceder a tu ubicación.")
    );
}

document.getElementById('btn-gps-origen').addEventListener('click', () => obtenerGPS(origenInput, true));
document.getElementById('btn-gps-destino').addEventListener('click', () => obtenerGPS(destinoInput, false));

// 5. LIMPIAR MAPA
document.getElementById('btn-limpiar').addEventListener('click', () => {
    MapManager.clearRoutes();
    map.eachLayer((layer) => {
        if (layer instanceof L.Marker) map.removeLayer(layer);
    });
    coordsOrigen = null;
    coordsDestino = null;
    origenInput.value = "";
    destinoInput.value = "";
    estadoClick = 'origen';
    mapaBloqueado = false; // Desbloqueamos el mapa
    statsPanel.classList.add('hidden');
});

function parsearEntradaManual(texto) {
    const partes = texto.replace(/[^\d.,-]/g, '').split(',');
    if (partes.length >= 2) {
        const lat = parseFloat(partes[0]);
        const lon = parseFloat(partes[1]);
        if (!isNaN(lat) && !isNaN(lon)) return [lat, lon];
    }
    return null;
}

// 7. BOTÓN PRINCIPAL: CALCULAR RUTAS
document.getElementById('btn-calcular').addEventListener('click', async () => {
    if (origenInput.value) coordsOrigen = parsearEntradaManual(origenInput.value) || coordsOrigen;
    if (destinoInput.value) coordsDestino = parsearEntradaManual(destinoInput.value) || coordsDestino;

    if (!coordsOrigen || !coordsDestino) {
        return alert("Asegúrate de ingresar un origen y un destino válidos.");
    }

    const w = parseFloat(rutaSlider.value);
    const alpha = 1 - w;
    const beta = w;
    const modo = algoSelect.value; // Leemos qué algoritmo quiere el usuario

    MapManager.clearRoutes();
    document.getElementById('btn-calcular').innerText = "Calculando...";
    mapaBloqueado = true; // Por si escribieron a mano, bloqueamos

    const data = await SafeRouteAPI.calculateRoute(coordsOrigen, coordsDestino, alpha, beta, modo);
    document.getElementById('btn-calcular').innerHTML = '<i class="fa-solid fa-route"></i> Calcular Ruta Segura';

    if (data) procesarRespuesta(data, modo);
});

// 8. BOTONES DE EMERGENCIA
async function ejecutarEmergencia(tipo) {
    if (origenInput.value) coordsOrigen = parsearEntradaManual(origenInput.value) || coordsOrigen;
    if (!coordsOrigen) return alert("Primero define tu origen.");

    const w = parseFloat(rutaSlider.value);
    const alpha = 1 - w;
    const beta = w;
    const modo = algoSelect.value;

    MapManager.clearRoutes();
    mapaBloqueado = true;

    const data = await SafeRouteAPI.calculateEmergencyRoute(coordsOrigen, tipo, alpha, beta, modo);

    if (data && data.emergency_info) {
        coordsDestino = [data.emergency_info.lat, data.emergency_info.lon];
        MapManager.setDestination(coordsDestino[0], coordsDestino[1], true);
        destinoInput.value = `${coordsDestino[0].toFixed(6)}, ${coordsDestino[1].toFixed(6)}`;
        procesarRespuesta(data, modo);
    }
}

document.getElementById('btn-cai').addEventListener('click', () => ejecutarEmergencia('cai'));
document.getElementById('btn-hosp').addEventListener('click', () => ejecutarEmergencia('hospital'));

// 9. FUNCIÓN PARA PINTAR ANIMACIONES
function procesarRespuesta(data, modo) {
    if(data.origin) MapManager.setOrigin(data.origin[0], data.origin[1]);
    if(data.destination) MapManager.setDestination(data.destination[0], data.destination[1]);

    statsPanel.classList.remove('hidden');

    // Ocultar o mostrar resultados según el algoritmo elegido
    document.getElementById('wrap-astar').style.display = (modo === 'both' || modo === 'astar') ? 'block' : 'none';
    document.getElementById('wrap-greedy').style.display = (modo === 'both' || modo === 'greedy') ? 'block' : 'none';

    if (data.greedy) {
        MapManager.animateExploration(data.greedy.history_visited, "#ef4444");
        MapManager.drawRoute(data.greedy.route, "#ef4444", true);
        document.getElementById('stat-greedy').innerText = (data.greedy.execution_time * 1000).toFixed(2);
        document.getElementById('nodes-greedy').innerText = data.greedy.explored_nodes;
    }

    if (data.a_star) {
        MapManager.animateExploration(data.a_star.history_visited, "#2563eb");
        MapManager.drawRoute(data.a_star.route, "#2563eb", false);
        // Borramos el fitBounds para que la cámara no salte y disfrutes la animación
        document.getElementById('stat-astar').innerText = (data.a_star.execution_time * 1000).toFixed(2);
        document.getElementById('nodes-astar').innerText = data.a_star.explored_nodes;
    }
}