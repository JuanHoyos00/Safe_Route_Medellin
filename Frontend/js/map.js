// ==========================================
// map.js - Lógica visual de Leaflet
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

    drawRoute(routeCoords, colorHex) {
        const polyline = L.polyline(routeCoords, {
            color: colorHex,
            weight: 7,
            opacity: 1.0,
            lineCap: 'round',
            lineJoin: 'round'
        }).addTo(map);

        const glow = L.polyline(routeCoords, {
            color: '#ffffff', weight: 12, opacity: 0.6, lineCap: 'round', lineJoin: 'round'
        }).addTo(map);

        currentLayers.push(glow, polyline);
        return polyline;
    },

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

        const colorPulpo = "#00ffff";
        const colorCulebra = "#ff0055";

        function drawFrame() {
            if (currentAnimId !== animationCounter) return;

            let siguenPintando = false;

            if (historyA && indexA < historyA.length) {
                const sliceA = historyA.slice(indexA, indexA + chunkA);
                sliceA.forEach(segmento => {
                    L.polyline(segmento, {
                        color: colorPulpo,
                        weight: 3,
                        opacity: 0.5
                    }).addTo(layerA);
                });
                indexA += chunkA;
                siguenPintando = true;
            }

            if (historyG && indexG < historyG.length) {
                const sliceG = historyG.slice(indexG, indexG + chunkG);
                sliceG.forEach(segmento => {
                    L.polyline(segmento, {
                        color: colorCulebra,
                        weight: 4,
                        opacity: 0.8
                    }).addTo(layerG);
                });
                indexG += chunkG;
                siguenPintando = true;
            }

            if (siguenPintando) {
                requestAnimationFrame(drawFrame);
            } else {
                layerA.eachLayer(l => l.setStyle({ opacity: 0.15 }));
                layerG.eachLayer(l => l.setStyle({ opacity: 0.3 }));
                if (callbackTermino) callbackTermino();
            }
        }

        requestAnimationFrame(drawFrame);
    },

    renderHeatmap(puntos) {
        return L.heatLayer(puntos, {
            radius: 20,
            blur: 25,
            maxZoom: 16,
            max: 3.0,
            minOpacity: 0.1,
            gradient: {
                0.4: '#00ff00', // Verde (Zonas seguras)
                0.7: '#ffff00', // Amarillo (Riesgo medio)
                0.9: '#ff8c00', // Naranja (Riesgo alto)
                1.0: '#ff0000'  // Rojo (Riesgo máximo)
            }
        });
    }
};