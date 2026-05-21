# src/app.py
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
import uvicorn

# Importaciones adaptadas estrictamente a tu estructura de archivos
from Graph import road_graph, l_min, l_max
from Pathfinding_A_Star_Algorithm import algorithm_a_star
from Pathfinding_Greedy_Algorithm import algorithm_greedy

app = FastAPI()
templates = Jinja2Templates(directory="templates")


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    # CORRECCIÓN CRÍTICA: En las nuevas versiones se debe pasar el diccionario
    # de contexto obligatoriamente usando la clave "context" y como un argumento nombrado de Starlette.
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={"request": request}
    )


@app.get("/api/calcular-ruta")
async def calcular_ruta(orig_lat: float, orig_lon: float, dest_lat: float, dest_lon: float, alpha: float, beta: float):
    origen = (orig_lon, orig_lat)
    destino = (dest_lon, dest_lat)

    # 1. Ejecución del algoritmo A* Seguro
    ruta_a_star, costo_a_star, nodos_a_star, hist_a_star = algorithm_a_star(
        road_graph, origen, destino, alpha, beta, l_min, l_max
    )

    # 2. Ejecución del algoritmo Greedy por Vecino Más Cercano
    ruta_greedy, costo_greedy, hist_greedy = algorithm_greedy(
        road_graph, origen, destination=destino, alpha=alpha, beta=beta, l_min=l_min, l_max=l_max
    )

    # Formateo de coordenadas de (Longitud, Latitud) a [Latitud, Longitud] para Leaflet.js
    fmt_a_star = [[lat, lon] for lon, lat in ruta_a_star] if ruta_a_star else None
    fmt_greedy = [[lat, lon] for lon, lat in ruta_greedy] if ruta_greedy else None

    fmt_hist_a_star = [[lat, lon] for lon, lat in hist_a_star] if hist_a_star else []
    fmt_hist_greedy = [[lat, lon] for lon, lat in hist_greedy] if hist_greedy else []

    return JSONResponse({
        "a_star": {
            "ruta": fmt_a_star,
            "costo": costo_a_star,
            "explorados": nodos_a_star,
            "historial": fmt_hist_a_star
        },
        "greedy": {
            "ruta": fmt_greedy,
            "costo": costo_greedy,
            "explorados": len(ruta_greedy) if ruta_greedy else 0,
            "historial": fmt_hist_greedy
        }
    })


if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)