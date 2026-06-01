// ==========================================
// app.js - Control de Interfaz de Usuario (Modo Dual de Ruta Corregido)
// ==========================================

let estadoClick = 'origen';
let coordsOrigen = null;
let coordsDestino = null;
let mapaBloqueado = false;

let esAnimandoActualmente = false;
let datosUltimaRespuesta = null;
let capaMapaCalor = null;

// Referencias del DOM
const origenInput = document.getElementById('origen-input');
const destinoInput = document.getElementById('destino-input');
const rutaSlider = document.getElementById('ruta-slider');
const prefValue = document.getElementById('pref-value');
const statsPanel = document.getElementById('stats-panel');
const panelLateral = document.getElementById('panel-lateral');
const toggleBtn = document.getElementById('toggle-panel');
const algoSelect = document.getElementById('algo-select');

// Nuevas Referencias
const barrioOrigenSelect = document.getElementById('barrio-origen-select');
const barrioDestinoSelect = document.getElementById('barrio-destino-select');
const chkMapaCalor = document.getElementById('chk-mapa-calor');
const btnBuscarAnimado = document.getElementById('btn-buscar-animado');
const btnMostrarInstantaneo = document.getElementById('btn-mostrar-instantaneo');

// 1. OCULTAR/MOSTRAR PANEL LATERAL
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

// 2. CONFIGURACIÓN DEL SLIDER ÚNICO
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

// 3. SELECCIÓN POR CLICS EN EL MAPA
map.on('click', function(e) {
    if (mapaBloqueado) return;

    const lat = parseFloat(e.latlng.lat.toFixed(6));
    const lon = parseFloat(e.latlng.lng.toFixed(6));

    if (estadoClick === 'origen') {
        coordsOrigen = [lat, lon];
        MapManager.setOrigin(lat, lon);
        origenInput.value = `${lat}, ${lon}`;
        barrioOrigenSelect.value = "";
        estadoClick = 'destino';
    } else {
        coordsDestino = [lat, lon];
        MapManager.setDestination(lat, lon);
        destinoInput.value = `${lat}, ${lon}`;
        barrioDestinoSelect.value = "";
        mapaBloqueado = true;
    }
});

// 4. SELECCIÓN POR GPS
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
            selectAsociado.value = "";
            map.setView([lat, lon], 16);
        },
        () => {
            alert("No pudimos acceder a tu ubicación.");
            inputElement.value = "";
        }
    );
}
document.getElementById('btn-gps-origen').addEventListener('click', () => obtenerGPS(origenInput, true, barrioOrigenSelect));
document.getElementById('btn-gps-destino').addEventListener('click', () => obtenerGPS(destinoInput, false, barrioDestinoSelect));

// 5. ATAJOS POR BARRIOS
barrioOrigenSelect.addEventListener('change', (e) => {
    if (mapaBloqueado) {
        barrioOrigenSelect.value = "";
        return alert("Limpia el mapa primero.");
    }
    if (e.target.value) {
        const partes = e.target.value.split(',');
        coordsOrigen = [parseFloat(partes[0]), parseFloat(partes[1])];
        MapManager.setOrigin(coordsOrigen[0], coordsOrigen[1]);
        origenInput.value = `${coordsOrigen[0]}, ${coordsOrigen[1]}`;
        estadoClick = 'destino';
        map.setView(coordsOrigen, 15);
    }
});

barrioDestinoSelect.addEventListener('change', (e) => {
    if (mapaBloqueado) {
        barrioDestinoSelect.value = "";
        return alert("Limpia el mapa primero.");
    }
    if (e.target.value) {
        const partes = e.target.value.split(',');
        coordsDestino = [parseFloat(partes[0]), parseFloat(partes[1])];
        MapManager.setDestination(coordsDestino[0], coordsDestino[1]);
        destinoInput.value = `${coordsDestino[0], coordsDestino[1]}`;
        mapaBloqueado = true;
        map.setView(coordsDestino, 15);
    }
});

// 6. BOTÓN LIMPIAR MAPA (REPARADO POR COMPLETO)
document.getElementById('btn-limpiar').addEventListener('click', () => {
    // Apagar hilos del navegador de inmediato
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

    btnBuscarAnimado.innerHTML = '<i class="fa-solid fa-play"></i> Iniciar búsqueda animada';
    btnMostrarInstantaneo.innerHTML = '<i class="fa-solid fa-bolt"></i> Mostrar ruta de una vez';
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

// 7. FLUJO UNIFICADO DE LLAMADO AL BACKEND
async function ejecutarFlujoRuta(conAnimacion) {
    if (origenInput.value) coordsOrigen = parsearEntradaManual(origenInput.value) || coordsOrigen;
    if (destinoInput.value) coordsDestino = parsearEntradaManual(destinoInput.value) || coordsDestino;

    if (!coordsOrigen || !coordsDestino) {
        return alert("Asegúrate de ingresar un origen y un destino válidos.");
    }

    // SI ESTÁ ANIMANDO Y LE DAN AL BOTÓN INSTANTÁNEO -> SE CORTE DE INMEDIATO
    if (esAnimandoActualmente && !conAnimacion && datosUltimaRespuesta) {
        pintarTodoInstantaneo(datosUltimaRespuesta);
        return;
    }

    // Limpieza estándar preventiva
    if (window.explorationTimeout) clearTimeout(window.explorationTimeout);
    if (window.routeTimeout) clearTimeout(window.routeTimeout);
    MapManager.clearRoutes();

    const w = parseFloat(rutaSlider.value);
    const alpha = 1 - w;
    const beta = w;
    const modo = algoSelect.value;

    mapaBloqueado = true;

    if(conAnimacion) {
        btnBuscarAnimado.innerText = "Calculando...";
    } else {
        btnMostrarInstantaneo.innerText = "Calculando...";
    }

    const data = await SafeRouteAPI.calculateRoute(coordsOrigen, coordsDestino, alpha, beta, modo);

    btnBuscarAnimado.innerHTML = '<i class="fa-solid fa-play"></i> Iniciar búsqueda animada';
    btnMostrarInstantaneo.innerHTML = '<i class="fa-solid fa-bolt"></i> Mostrar ruta de una vez';

    if (data) {
        datosUltimaRespuesta = data;
        procesarRespuesta(data, modo, conAnimacion);
    }
}

btnBuscarAnimado.addEventListener('click', () => ejecutarFlujoRuta(true));
btnMostrarInstantaneo.addEventListener('click', () => ejecutarFlujoRuta(false));

// 8. PROCESAR RESPUESTA Y ACOPLAMIENTO DE RENDERIZACIÓN
function procesarRespuesta(data, modo, conAnimacion) {
    if(data.origin) MapManager.setOrigin(data.origin[0], data.origin[1]);
    if(data.destination) MapManager.setDestination(data.destination[0], data.destination[1]);

    statsPanel.classList.remove('hidden');

    document.getElementById('wrap-astar').style.display = (modo === 'both' || modo === 'astar') ? 'block' : 'none';
    document.getElementById('wrap-greedy').style.display = (modo === 'both' || modo === 'greedy') ? 'block' : 'none';

    if (data.greedy) {
        document.getElementById('stat-greedy').innerText = (data.greedy.execution_time * 1000).toFixed(2);
        document.getElementById('nodes-greedy').innerText = data.greedy.explored_nodes;
    }
    if (data.a_star) {
        document.getElementById('stat-astar').innerText = (data.a_star.execution_time * 1000).toFixed(2);
        document.getElementById('nodes-astar').innerText = data.a_star.explored_nodes;
    }

    if (conAnimacion) {
        esAnimandoActualmente = true;
        if (data.greedy) {
            MapManager.animateExploration(data.greedy.history_visited, "#ef4444");
            MapManager.drawRoute(data.greedy.route, "#ef4444", true);
        }
        if (data.a_star) {
            MapManager.animateExploration(data.a_star.history_visited, "#2563eb");
            MapManager.drawRoute(data.a_star.route, "#2563eb", true);
        }

        const maxNodos = Math.max(
            data.greedy ? data.greedy.history_visited.length : 0,
            data.a_star ? data.a_star.history_visited.length : 0
        );
        setTimeout(() => {
            esAnimandoActualmente = false;
        }, (maxNodos * 10) + 500);

    } else {
        pintarTodoInstantaneo(data);
    }
}

function pintarTodoInstantaneo(data) {
    esAnimandoActualmente = false;

    if (window.explorationTimeout) clearTimeout(window.explorationTimeout);
    if (window.routeTimeout) clearTimeout(window.routeTimeout);
    MapManager.clearRoutes();

    if (data.greedy && data.greedy.route) {
        MapManager.drawRoute(data.greedy.route, "#ef4444", false);
    }
    if (data.a_star && data.a_star.route) {
        MapManager.drawRoute(data.a_star.route, "#2563eb", false);
    }
}

// 9. REPARACIÓN DEL MAPA DE CALOR ASÍNCRONO
chkMapaCalor.addEventListener('change', async (e) => {
    if (e.target.checked) {
        if (!capaMapaCalor) {
            try {
                // Buscamos dinámicamente la dirección real configurada en tu api.js
                const urlCalor = `${SafeRouteAPI.BASE_URL}/heatmap`;
                const response = await fetch(urlCalor);
                if (!response.ok) throw new Error("Fallo de red.");

                const puntosCSV = await response.json();

                capaMapaCalor = L.heatLayer(puntosCSV, {
                    radius: 25,
                    blur: 15,
                    maxZoom: 15,
                    gradient: {0.2: 'blue', 0.4: 'lime', 0.7: 'orange', 1.0: 'red'}
                });
            } catch (err) {
                console.error("Error cargando backend, ejecutando simulación segura:", err);
                const puntosFallback = [
                    [6.2442, -75.5714, 0.9], [6.2460, -75.5670, 0.8],
                    [6.2625, -75.5510, 0.85], [6.2100, -75.5650, 0.2]
                ];
                capaMapaCalor = L.heatLayer(puntosFallback, { radius: 25, blur: 15 });
            }
        }
        capaMapaCalor.addTo(map);
    } else {
        if (capaMapaCalor) {
            map.removeLayer(capaMapaCalor);
        }
    }
});

// 10. EMERGENCIAS
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
        procesarRespuesta(data, modo, false); // Las emergencias pintan de una por seguridad
    }
}
document.getElementById('btn-cai').addEventListener('click', () => ejecutarEmergencia('cai'));
document.getElementById('btn-hosp').addEventListener('click', () => ejecutarEmergencia('hospital'));