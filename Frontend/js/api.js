// ==========================================
// api.js - Comunicación con el Backend
// ==========================================

const BASE_URL = 'http://localhost:8000/api';

const SafeRouteAPI = {
    async calculateRoute(origen, destino, alpha, beta, mode = "both") {
        try {
            const response = await fetch(`${BASE_URL}/calculate-routes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    origen: origen,
                    destino: destino,
                    alpha: parseFloat(alpha),
                    beta: parseFloat(beta),
                    mode: mode // <--- AHORA ENVIAMOS EL MODO DINÁMICO
                })
            });

            if (!response.ok) throw new Error("Error al calcular la ruta");
            return await response.json();

        } catch (error) {
            console.error("[API] Error:", error);
            alert("No se pudo calcular la ruta. Verifica el backend.");
            return null;
        }
    },

    async calculateEmergencyRoute(origen, tipo, alpha, beta) {
        try {
            const response = await fetch(`${BASE_URL}/emergency-route`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    origen: origen,
                    tipo_emergencia: tipo, // "cai" o "hospital"
                    alpha: parseFloat(alpha),
                    beta: parseFloat(beta),
                    mode: "both"
                })
            });

            if (!response.ok) throw new Error("Error en ruta de emergencia");
            return await response.json();

        } catch (error) {
            console.error("[API] Error:", error);
            alert("Error al buscar la emergencia.");
            return null;
        }
    }
};