// ==========================================
// map.js - Lógica visual de Leaflet (Optimizada y Sincronizada)
// ==========================================

const map = L.map('mapa', {
    preferCanvas: true // Fundamental para aguantar miles de líneas del "Pulpo"
}).setView([6.2442, -75.5812], 13);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; CartoDB',
    maxZoom: 19
}).addTo(map);

let markerOrigen = null;
let markerDestino = null;
let currentLayers = [];
let animationCounter = 0;

const originIcon = L.divIcon({ className: 'custom-icon origin-icon', html: '<div style="background:#2563eb; width:15px; height:15px; border-radius:50%; border:2px solid white; box-shadow:0 0 5px rgba(0,0,0,0.5);"></div>' });
const destIcon = L.divIcon({ className: 'custom-icon dest-icon', html: '<div style="background:#ef4444; width:15px; height:15px; border-radius:50%; border:2px solid white; box-shadow:0 0 5px rgba(0,0,0,0.5);"></div>' });

const MapManager = {
    setOrigin(lat, lon) {
        if (markerOrigen) map.removeLayer(markerOrigen);
        markerOrigen = L.marker([lat, lon], { icon: originIcon }).addTo(map);
    },

    setDestination(lat, lon) {
        if (markerDestino) map.removeLayer(markerDestino);
        markerDestino = L.marker([lat, lon], { icon: destIcon }).addTo(map);
    },

    clearRoutes() {
        currentLayers.forEach(layer => map.removeLayer(layer));
        currentLayers = [];
        animationCounter++;
    },

    // Dibuja la ruta final sólida
    drawRoute(routeCoords, color, isDashed = false) {
        const polyline = L.polyline(routeCoords, {
            color: color,
            weight: 6, // Ruta final más gruesa para que resalte
            opacity: 1.0,
            dashArray: isDashed ? '12, 12' : null,
            lineCap: 'round'
        }).addTo(map);

        // Efecto de brillo/sombra para resaltar sobre el mapa de calor
        const glow = L.polyline(routeCoords, {
            color: '#ffffff', weight: 10, opacity: 0.5, lineCap: 'round'
        }).addTo(map);

        currentLayers.push(glow, polyline);
        return polyline;
    },

    // LA CARRERA SINCRONIZADA: Pulpo (A*) vs Culebra (Greedy)
    animateRace(historyA, historyG, callbackTermino) {
        const currentAnimId = ++animationCounter;

        const layerA = L.layerGroup().addTo(map); // Capa del Pulpo
        const layerG = L.layerGroup().addTo(map); // Capa de la Culebra
        currentLayers.push(layerA, layerG);

        let indexA = 0;
        let indexG = 0;

        // Calculamos cuántos pasos debe dar cada uno por fotograma para terminar parejos
        // Como A* visita muchos más nodos, pintará más lineas por frame (más rápido)
        const totalFrames = 120; // La animación durará aprox 2 segundos (a 60fps)
        const chunkA = Math.ceil((historyA ? historyA.length : 0) / totalFrames) || 1;
        const chunkG = Math.ceil((historyG ? historyG.length : 0) / totalFrames) || 1;

        // Colores Neón para contrastar con el mapa de calor
        const colorPulpo = "#00e5ff";  // Cian brillante para A*
        const colorCulebra = "#ff00aa"; // Fucsia/Magenta para Greedy

        function drawFrame() {
            if (currentAnimId !== animationCounter) return; // Cancelar si el usuario limpia mapa

            let siguenPintando = false;

            // Pintar los tentáculos del Pulpo (A*)
            if (historyA && indexA < historyA.length) {
                const sliceA = historyA.slice(indexA, indexA + chunkA);
                L.polyline(sliceA, {
                    color: colorPulpo,
                    weight: 2,
                    opacity: 0.15 // Transparente para que parezca una nube/mancha
                }).addTo(layerA);
                indexA += chunkA;
                siguenPintando = true;
            }

            // Pintar el rastro de la Culebra (Greedy)
            if (historyG && indexG < historyG.length) {
                const sliceG = historyG.slice(indexG, indexG + chunkG);
                L.polyline(sliceG, {
                    color: colorCulebra,
                    weight: 3,
                    opacity: 0.6 // Más sólido para que parezca una culebra moviéndose
                }).addTo(layerG);
                indexG += chunkG;
                siguenPintando = true;
            }

            if (siguenPintando) {
                requestAnimationFrame(drawFrame);
            } else {
                // CUANDO TERMINAN LA CARRERA, ATENUAMOS LA BÚSQUEDA Y PINTAMOS LA RUTA FINAL
                layerA.eachLayer(l => l.setStyle({ opacity: 0.05 }));
                layerG.eachLayer(l => l.setStyle({ opacity: 0.2 }));
                if (callbackTermino) callbackTermino();
            }
        }

        requestAnimationFrame(drawFrame);
    },

    // OPTIMIZACIÓN DEL MAPA DE CALOR
    renderHeatmap(puntosCSV) {
        return L.heatLayer(puntosCSV, {
            radius: 20,       // Menos radio evita parches gigantes
            blur: 25,         // Más blur suaviza las transiciones entre colores
            maxZoom: 14,      // Evita que al hacer zoom in los puntos desaparezcan
            max: 1.0,         // Asegura que el costo 1.0 sea el límite superior estricto
            minOpacity: 0.4,  // Evita que las zonas de bajo riesgo queden invisibles
            gradient: {
                0.2: '#3b82f6', // Azul (Seguro)
                0.5: '#22c55e', // Verde (Normal)
                0.7: '#f59e0b', // Naranja (Peligro Medio)
                1.0: '#ef4444'  // Rojo (Peligro Alto)
            }
        });
    }
};