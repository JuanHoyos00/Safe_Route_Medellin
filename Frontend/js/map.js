// ==========================================
// map.js - Lógica visual de Leaflet
// ==========================================

// 1. INICIALIZAR EL MAPA (¡preferCanvas es vital para el rendimiento!)
const map = L.map('mapa', {
    preferCanvas: true
}).setView([6.2442, -75.5812], 13); // Centro de Medellín

// Usamos el mapa de CartoDB (Limpio y elegante, ideal para pintar rutas encima)
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; CartoDB',
    maxZoom: 19
}).addTo(map);

// Variables globales del mapa
let markerOrigen = null;
let markerDestino = null;
let currentLayers = []; // Guardará las rutas para borrarlas fácilmente
let animationCounter = 0; // Para cancelar animaciones viejas si el usuario pide otra ruta rápida

// Iconos personalizados (usamos FontAwesome en HTML, aquí puntos de colores)
const originIcon = L.divIcon({ className: 'custom-icon origin-icon', html: '<div style="background:#2563eb; width:15px; height:15px; border-radius:50%; border:2px solid white; box-shadow:0 0 5px rgba(0,0,0,0.5);"></div>' });
const destIcon = L.divIcon({ className: 'custom-icon dest-icon', html: '<div style="background:#ef4444; width:15px; height:15px; border-radius:50%; border:2px solid white; box-shadow:0 0 5px rgba(0,0,0,0.5);"></div>' });
const emergIcon = L.divIcon({ className: 'custom-icon emerg-icon', html: '<div style="background:#10b981; width:18px; height:18px; border-radius:50%; border:2px solid white; box-shadow:0 0 10px rgba(0,0,0,0.8);"></div>' });

const MapManager = {
    setOrigin(lat, lon) {
        if (markerOrigen) map.removeLayer(markerOrigen);
        markerOrigen = L.marker([lat, lon], { icon: originIcon }).addTo(map);
    },

    setDestination(lat, lon, isEmergency = false) {
        if (markerDestino) map.removeLayer(markerDestino);
        markerDestino = L.marker([lat, lon], { icon: isEmergency ? emergIcon : destIcon }).addTo(map);
    },

    clearRoutes() {
        // Borra todas las líneas y animaciones del mapa
        currentLayers.forEach(layer => map.removeLayer(layer));
        currentLayers = [];
        animationCounter++; // Detiene cualquier animación en curso
    },

    drawRoute(routeCoords, color, isDashed = false) {
        const polyline = L.polyline(routeCoords, {
            color: color,
            weight: 5,
            opacity: 0.8,
            dashArray: isDashed ? '10, 10' : null
        }).addTo(map);
        currentLayers.push(polyline);
        return polyline;
    },

    // LA JOYA DE LA CORONA: Animación por Chunking
    animateExploration(history, colorHex) {
        const currentAnimId = ++animationCounter;

        // Creamos un grupo (layerGroup) para no saturar el DOM
        const historyLayer = L.layerGroup().addTo(map);
        currentLayers.push(historyLayer);

        let index = 0;
        const chunkSize = 50; // Dibuja 50 líneas por cada fotograma

        function drawChunk() {
            // Si el usuario canceló o pidió otra ruta, abortar
            if (currentAnimId !== animationCounter) return;

            const chunk = history.slice(index, index + chunkSize);

            // Leaflet dibuja múltiples líneas de una vez si le pasamos un arreglo de segmentos
            const multiLine = L.polyline(chunk, {
                color: colorHex,
                weight: 2,
                opacity: 0.15 // Casi transparente
            }).addTo(historyLayer);

            index += chunkSize;

            // Si aún faltan nodos por explorar, pedimos el siguiente frame
            if (index < history.length) {
                requestAnimationFrame(drawChunk);
            }
        }

        // Iniciar motor de animación
        requestAnimationFrame(drawChunk);
    }
};