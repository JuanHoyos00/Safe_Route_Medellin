// ==========================================
// map.js - Lógica visual de Leaflet (Líneas continuas y colores fuertes)
// ==========================================

const map = L.map('mapa', {
    preferCanvas: true
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

    // Ruta final (Línea sólida y gruesa para AMBOS algoritmos)
    drawRoute(routeCoords, colorHex) {
        const polyline = L.polyline(routeCoords, {
            color: colorHex,
            weight: 7, // Bien gruesa
            opacity: 1.0, // Cero transparencia
            lineCap: 'round',
            lineJoin: 'round'
        }).addTo(map);

        // Brillo blanco de fondo para que resalte incluso en el mapa de calor
        const glow = L.polyline(routeCoords, {
            color: '#ffffff', weight: 12, opacity: 0.6, lineCap: 'round', lineJoin: 'round'
        }).addTo(map);

        currentLayers.push(glow, polyline);
        return polyline;
    },

    // LA CARRERA (Colores Neón Fuertes)
    animateRace(historyA, historyG, callbackTermino) {
        const currentAnimId = ++animationCounter;

        const layerA = L.layerGroup().addTo(map);
        const layerG = L.layerGroup().addTo(map);
        currentLayers.push(layerA, layerG);

        let indexA = 0;
        let indexG = 0;

        const totalFrames = 120;
        const chunkA = Math.ceil((historyA ? historyA.length : 0) / totalFrames) || 1;
        const chunkG = Math.ceil((historyG ? historyG.length : 0) / totalFrames) || 1;

        // COLORES SÚPER FUERTES
        const colorPulpo = "#00ffff";  // Cian eléctrico brillante (A*)
        const colorCulebra = "#ff0055"; // Rojo/Fucsia muy fuerte (Greedy)

        function drawFrame() {
            if (currentAnimId !== animationCounter) return;

            let siguenPintando = false;

            if (historyA && indexA < historyA.length) {
                const sliceA = historyA.slice(indexA, indexA + chunkA);
                L.polyline(sliceA, {
                    color: colorPulpo,
                    weight: 3,
                    opacity: 0.5 // Subimos opacidad para que se vea claro el "pulpo"
                }).addTo(layerA);
                indexA += chunkA;
                siguenPintando = true;
            }

            if (historyG && indexG < historyG.length) {
                const sliceG = historyG.slice(indexG, indexG + chunkG);
                L.polyline(sliceG, {
                    color: colorCulebra,
                    weight: 4,
                    opacity: 0.9 // Casi sólido para la culebra
                }).addTo(layerG);
                indexG += chunkG;
                siguenPintando = true;
            }

            if (siguenPintando) {
                requestAnimationFrame(drawFrame);
            } else {
                // Al terminar, bajamos la luz de la búsqueda un poco y llamamos la ruta final
                layerA.eachLayer(l => l.setStyle({ opacity: 0.15 }));
                layerG.eachLayer(l => l.setStyle({ opacity: 0.3 }));
                if (callbackTermino) callbackTermino();
            }
        }

        requestAnimationFrame(drawFrame);
    },

    // MAPA DE CALOR: Parámetros forzados para que sea ultra visible
    renderHeatmap(puntos) {
        return L.heatLayer(puntos, {
            radius: 35,       // Más grande para tapar bien la zona
            blur: 30,         // Suavizado
            maxZoom: 16,
            max: 1.0,
            minOpacity: 0.6,  // Nunca será invisible
            gradient: {
                0.3: '#2563eb', // Azul
                0.5: '#10b981', // Verde
                0.7: '#f59e0b', // Naranja
                1.0: '#ef4444'  // Rojo Fuerte
            }
        });
    }
};