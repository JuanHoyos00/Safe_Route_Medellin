// ==========================================
// app.js - Control de Interfaz de Usuario Avanzado
// ==========================================

let estadoClick = 'origen';
let coordsOrigen = null;
let coordsDestino = null;
let mapaBloqueado = false;

// Variables globales para el manejo de animaciones y datos temporales
let esAnimandoActualmente = false;
let datosUltimaRespuesta = null; // Guardará el JSON del backend para el botón "Mostrar ya de una"
let capaMapaCalor = null;        // Instancia del mapa de calor de Leaflet

// Referencias del DOM
const origenInput = document.getElementById('origen-input');
const destinoInput = document.getElementById('destino-input');
const rutaSlider = document.getElementById('ruta-slider');
const prefValue = document.getElementById('pref-value');
const statsPanel = document.getElementById('stats-panel');
const panelLateral = document.getElementById('panel-lateral');
const toggleBtn = document.getElementById('toggle-panel');
const algoSelect = document.getElementById('algo-select');

// Nuevas Referencias del DOM
const barrioOrigenSelect = document.getElementById('barrio-origen-select');
const barrioDestinoSelect = document.getElementById('barrio-destino-select');
const chkMapaCalor = document.getElementById('chk-mapa-calor');
const chkAnimarRuta = document.getElementById('chk-animar-ruta');
const btnSaltarAnimacion = document.getElementById('btn-saltar-animacion');

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

// 3. CLICS EN EL MAPA (CON SINCRONIZACIÓN)
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
        barrioOrigenSelect.value = ""; // Sincroniza: quita la selección por barrio
        estadoClick = 'destino';
    } else {
        coordsDestino = [lat, lon];
        MapManager.setDestination(lat, lon);
        destinoInput.value = `${lat}, ${lon}`;
        barrioDestinoSelect.value = ""; // Sincroniza
        mapaBloqueado = true;
    }
});

// 4. LÓGICA DE GPS (CON SINCRONIZACIÓN)
function obtenerGPS(inputElement, esOrigen, selectAsociado) {
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
                mapaBloqueado = true;
            }
            inputElement.value = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
            selectAsociado.value = ""; // Sincroniza: Limpia el atajo por barrio ya que usó GPS
            map.setView([lat, lon], 16);
        },
        (error) => alert("No pudimos acceder a tu ubicación.")
    );
}

document.getElementById('btn-gps-origen').addEventListener('click', () => obtenerGPS(origenInput, true, barrioOrigenSelect));
document.getElementById('btn-gps-destino').addEventListener('click', () => obtenerGPS(destinoInput, false, barrioDestinoSelect));

// 4.1 NUEVO: LOGICA DE ATAJOS POR BARRIOS (CON SINCRONIZACIÓN)
barrioOrigenSelect.addEventListener('change', (e) => {
    if (mapaBloqueado) {
        barrioOrigenSelect.value = "";
        return alert("Limpia el mapa primero.");
    }
    if (e.target.value) {
        const partes = e.target.value.split(',');
        const lat = parseFloat(partes[0]);
        const lon = parseFloat(partes[1]);
        coordsOrigen = [lat, lon];
        MapManager.setOrigin(lat, lon);
        origenInput.value = `${lat}, ${lon}`;
        estadoClick = 'destino';
        map.setView(coordsOrigen, 14);
    }
});

barrioDestinoSelect.addEventListener('change', (e) => {
    if (mapaBloqueado) {
        barrioDestinoSelect.value = "";
        return alert("Limpia el mapa primero.");
    }
    if (e.target.value) {
        const partes = e.target.value.split(',');
        const lat = parseFloat(partes[0]);
        const lon = parseFloat(partes[1]);
        coordsDestino = [lat, lon];
        MapManager.setDestination(lat, lon);
        destinoInput.value = `${lat}, ${lon}`;
        mapaBloqueado = true;
        map.setView(coordsDestino, 14);
    }
});

// 5. LIMPIAR MAPA (RESTABLECE TODO)
document.getElementById('btn-limpiar').addEventListener('click', () => {
    // Detener animaciones si las hay corriendo en MapManager de fondo
    if (window.explorationTimeout) clearTimeout(window.explorationTimeout);
    if (window.routeTimeout) clearTimeout(window.routeTimeout);

    MapManager.clearRoutes();
    map.eachLayer((layer) => {
        if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    coordsOrigen = null;
    coordsDestino = null;
    datosUltimaRespuesta = null;
    esAnimandoActualmente = false;

    origenInput.value = "";
    destinoInput.value = "";
    barrioOrigenSelect.value = "";
    barrioDestinoSelect.value = "";

    estadoClick = 'origen';
    mapaBloqueado = false;
    statsPanel.classList.add('hidden');
    btnSaltarAnimacion.classList.add('hidden');
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

    // Si le da calcular a mitad de una animación vieja, limpiamos intervalos
    if (window.explorationTimeout) clearTimeout(window.explorationTimeout);
    if (window.routeTimeout) clearTimeout(window.routeTimeout);

    const w = parseFloat(rutaSlider.value);
    const alpha = 1 - w;
    const beta = w;
    const modo = algoSelect.value;

    MapManager.clearRoutes();
    document.getElementById('btn-calcular').innerText = "Calculando...";
    mapaBloqueado = true;

    const data = await SafeRouteAPI.calculateRoute(coordsOrigen, coordsDestino, alpha, beta, modo);
    document.getElementById('btn-calcular').innerHTML = '<i class="fa-solid fa-route"></i> Calcular Ruta Segura';

    if (data) {
        datosUltimaRespuesta = data; // Guardamos en memoria por si quiere "saltar"
        procesarRespuesta(data, modo);
    }
});

// 8. BOTONES DE EMERGENCIA
async function ejecutarEmergencia(tipo) {
    if (origenInput.value) coordsOrigen = parsearEntradaManual(origenInput.value) || coordsOrigen;
    if (!coordsOrigen) return alert("Primero define tu origen.");

    if (window.explorationTimeout) clearTimeout(window.explorationTimeout);
    if (window.routeTimeout) clearTimeout(window.routeTimeout);

    const w = parseFloat(rutaSlider.value);
    const alpha = 1 - w;
    const beta = w;
    const modo = algoSelect.value;

    MapManager.clearRoutes();
    mapaBloqueado = true;

    const data = await SafeRouteAPI.calculateEmergencyRoute(coordsOrigen, tipo, alpha, beta, modo);

    if (data && data.emergency_info) {
        datosUltimaRespuesta = data;
        coordsDestino = [data.emergency_info.lat, data.emergency_info.lon];
        MapManager.setDestination(coordsDestino[0], coordsDestino[1], true);
        destinoInput.value = `${coordsDestino[0].toFixed(6)}, ${coordsDestino[1].toFixed(6)}`;
        barrioDestinoSelect.value = "";
        procesarRespuesta(data, modo);
    }
}

document.getElementById('btn-cai').addEventListener('click', () => ejecutarEmergencia('cai'));
document.getElementById('btn-hosp').addEventListener('click', () => ejecutarEmergencia('hospital'));

// 9. FUNCIÓN PARA PROCESAR LA RESPUESTA (CON INTERRUPTOR DE ANIMACIÓN)
function procesarRespuesta(data, modo) {
    if(data.origin) MapManager.setOrigin(data.origin[0], data.origin[1]);
    if(data.destination) MapManager.setDestination(data.destination[0], data.destination[1]);

    statsPanel.classList.remove('hidden');

    document.getElementById('wrap-astar').style.display = (modo === 'both' || modo === 'astar') ? 'block' : 'none';
    document.getElementById('wrap-greedy').style.display = (modo === 'both' || modo === 'greedy') ? 'block' : 'none';

    // Actualizar datos de texto de rendimiento de una
    if (data.greedy) {
        document.getElementById('stat-greedy').innerText = (data.greedy.execution_time * 1000).toFixed(2);
        document.getElementById('nodes-greedy').innerText = data.greedy.explored_nodes;
    }
    if (data.a_star) {
        document.getElementById('stat-astar').innerText = (data.a_star.execution_time * 1000).toFixed(2);
        document.getElementById('nodes-astar').innerText = data.a_star.explored_nodes;
    }

    const activarAnimacion = chkAnimarRuta.checked;

    if (activarAnimacion) {
        esAnimandoActualmente = true;
        btnSaltarAnimacion.classList.remove('hidden'); // Mostramos botón de salto rápido

        // Ejecutar con animación nativa de MapManager
        if (data.greedy) {
            MapManager.animateExploration(data.greedy.history_visited, "#ef4444");
            MapManager.drawRoute(data.greedy.route, "#ef4444", true);
        }
        if (data.a_star) {
            MapManager.animateExploration(data.a_star.history_visited, "#2563eb");
            MapManager.drawRoute(data.a_star.route, "#2563eb", false);
        }

        // Programar cuando se asume que termina la animación para ocultar el botón
        // Usamos un estimado basado en la longitud de nodos de exploración
        const maxNodos = Math.max(
            data.greedy ? data.greedy.history_visited.length : 0,
            data.a_star ? data.a_star.history_visited.length : 0
        );
        setTimeout(() => {
            esAnimandoActualmente = false;
            btnSaltarAnimacion.classList.add('hidden');
        }, maxNodos * 10 + 1000); // Mismo paso del time que use tu map.js

    } else {
        // MODO INSTANTÁNEO: Pintar todo de una vez sin pasar por history_visited
        pintarTodoInstantaneo(data);
    }
}

// FUNCIÓN AUXILIAR PARA DIBUJAR DE UNA SOLA VEZ
function pintarTodoInstantaneo(data) {
    esAnimandoActualmente = false;
    btnSaltarAnimacion.classList.add('hidden');

    // Forzar limpieza de hilos de animación que queden colgados
    if (window.explorationTimeout) clearTimeout(window.explorationTimeout);
    if (window.routeTimeout) clearTimeout(window.routeTimeout);
    MapManager.clearRoutes();

    if (data.greedy && data.greedy.route) {
        // Creamos la polilínea directa usando Leaflet global ya que MapManager oculta la opción instantánea
        let poly = L.polyline(data.greedy.route, {color: "#ef4444", weight: 5, opacity: 0.8}).addTo(map);
        window.greedyRouteLines = window.greedyRouteLines || [];
        window.greedyRouteLines.push(poly);
    }
    if (data.a_star && data.a_star.route) {
        let poly = L.polyline(data.a_star.route, {color: "#2563eb", weight: 5, opacity: 0.8}).addTo(map);
        window.astarRouteLines = window.astarRouteLines || [];
        window.astarRouteLines.push(poly);
        map.fitBounds(poly.getBounds()); // Centrar cámara al final
    }
}

// ESCUCHADOR DEL BOTÓN "MOSTRAR YA DE UNA"
btnSaltarAnimacion.addEventListener('click', () => {
    if (esAnimandoActualmente && datosUltimaRespuesta) {
        pintarTodoInstantaneo(datosUltimaRespuesta);
    }
});

// 10. NUEVO: CONFIGURACIÓN DEL MAPA DE CALOR (ZONAS DE RIESGO MEDELLÍN)
// Estructura: [lat, lon, intensidad_riesgo]
const puntosCalorMedellin = [
    [6.2442, -75.5714, 0.9], // Centro (Riesgo Alto)
    [6.2460, -75.5670, 0.85], // El de Estación San Antonio
    [6.2625, -75.5510, 0.8],  // Manrique Central
    [6.2680, -75.5650, 0.75], // Aranjuez
    [6.2530, -75.5860, 0.4],  // Laureles (Riesgo Bajo-Medio)
    [6.2100, -75.5650, 0.2]   // El Poblado (Riesgo Bajo)
];

chkMapaCalor.addEventListener('change', (e) => {
    if (e.target.checked) {
        // Inicializar si no existe
        if (!capaMapaCalor) {
            capaMapaCalor = L.heatLayer(puntosCalorMedellin, {
                radius: 35,
                blur: 20,
                maxZoom: 16,
                gradient: {0.2: 'blue', 0.4: 'lime', 0.7: 'orange', 1.0: 'red'}
            });
        }
        capaMapaCalor.addTo(map);
    } else {
        if (capaMapaCalor) {
            map.removeLayer(capaCalor);
            // Si el código del plugin cambia, el método estándar de Leaflet es:
            map.removeLayer(capaMapaCalor);
        }
    }
});