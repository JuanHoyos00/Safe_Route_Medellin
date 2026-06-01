import os
import time
import pandas as pd
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Tuple

from Backend.models.graph import build_medellin_graph
from Backend.core.pathfinding_a_star_algorithm import algorithm_a_star
from Backend.core.pathfinding_greedy_algorithm import algorithm_greedy
from Backend.core.emergency_locator import EmergencyLocator

GRAPH: Any = None
NODES_LIST: List[Any] = []
DATA_TREE: Any = None
EMERGENCY_LOCATOR: Any = None


@asynccontextmanager
async def lifespan(_fastapi_app: FastAPI):
    global GRAPH, NODES_LIST, DATA_TREE, EMERGENCY_LOCATOR

    csv_path = "unified_medellin_data.csv"

    print(f"[API] Cargando grafo para Medellín...")
    GRAPH = build_medellin_graph(csv_path)
    NODES_LIST = list(GRAPH.nodes)


    from scipy.spatial import KDTree
    DATA_TREE = KDTree(NODES_LIST)
    print(f"[API] Grafo cargado exitosamente. {len(NODES_LIST)} nodos indexados.")

    print(f"[API] Iniciando Localizador de Emergencias...")
    EMERGENCY_LOCATOR = EmergencyLocator()

    yield
    print("[API] Servidor apagándose, liberando memoria...")


app = FastAPI(title="Medellin Safe Routing API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def find_nearest_node(lat: float, lon: float) -> Any:
    target = (lon, lat)
    _, index = DATA_TREE.query(target)
    return NODES_LIST[index]


class RouteRequest(BaseModel):
    origen: Tuple[float, float]
    destino: Tuple[float, float]
    alpha: float
    beta: float
    mode: str = "both"


class EmergencyRequest(BaseModel):
    origen: Tuple[float, float]
    tipo_emergencia: str  # "cai" o "hospital"
    alpha: float
    beta: float
    mode: str = "both"


@app.get("/api/heatmap")
def get_heatmap_data() -> List[List[float]]:
    heatmap_points = []

    if GRAPH is not None:
        for u, v, data in GRAPH.edges(data=True):
            lon, lat = u
            risk = data.get('harassmentRisk', 0.0)
            heatmap_points.append([lat, lon, risk])
    return heatmap_points


@app.post("/api/calculate-routes")
def calculate_routes(request: RouteRequest) -> Dict[str, Any]:
    start_lat, start_lon = request.origen[0], request.origen[1]
    end_lat, end_lon = request.destino[0], request.destino[1]

    origin_node = find_nearest_node(start_lat, start_lon)
    destination_node = find_nearest_node(end_lat, end_lon)

    mode = request.mode

    response_data: Dict[str, Any] = {
        "origin": [origin_node[1], origin_node[0]],
        "destination": [destination_node[1], destination_node[0]],
        "a_star": None,
        "greedy": None
    }

    if mode in ["astar", "both"]:
        start_time_ast = time.time()
        a_star_path, a_star_cost, a_star_explored, a_star_history = algorithm_a_star(
            GRAPH, origin_node, destination_node, request.alpha, request.beta
        )
        ast_time = time.time() - start_time_ast

        if not a_star_path:
            raise HTTPException(status_code=404, detail="No se encontró un camino viable con A*.")

        response_data["a_star"] = {
            "route": [[n[1], n[0]] for n in a_star_path],
            "history_visited": [[[padre[1], padre[0]], [hijo[1], hijo[0]]] for padre, hijo in a_star_history],
            "cost": a_star_cost,
            "explored_nodes": a_star_explored,
            "execution_time": ast_time
        }

    if mode in ["greedy", "both"]:
        start_time_gre = time.time()
        greedy_path, greedy_cost, greedy_history = algorithm_greedy(
            GRAPH, origin_node, destination_node, request.alpha, request.beta
        )
        gre_time = time.time() - start_time_gre

        if not greedy_path:
            raise HTTPException(status_code=404, detail="No se encontró un camino viable con Greedy.")

        response_data["greedy"] = {
            "route": [[n[1], n[0]] for n in greedy_path],
            "history_visited": [[[padre[1], padre[0]], [hijo[1], hijo[0]]] for padre, hijo in greedy_history],
            "cost": greedy_cost,
            "explored_nodes": len(greedy_history),
            "execution_time": gre_time
        }

    return response_data


@app.post("/api/emergency-route")
def calculate_emergency_route(request: EmergencyRequest) -> Dict[str, Any]:
    start_lat, start_lon = request.origen[0], request.origen[1]

    if request.tipo_emergencia == "cai":
        nearest_emergency = EMERGENCY_LOCATOR.get_nearest_cai(start_lon, start_lat)
    elif request.tipo_emergencia == "hospital":
        nearest_emergency = EMERGENCY_LOCATOR.get_nearest_hospital(start_lon, start_lat)
    else:
        raise HTTPException(status_code=400, detail="Tipo de emergencia inválido. Usa 'cai' o 'hospital'.")

    if not nearest_emergency:
        raise HTTPException(status_code=500, detail="No se pudieron cargar los datos de emergencia.")

    origin_node = find_nearest_node(start_lat, start_lon)
    destination_node = find_nearest_node(nearest_emergency['lat'], nearest_emergency['lon'])

    route_request = RouteRequest(
        origen=(origin_node[1], origin_node[0]),
        destino=(destination_node[1], destination_node[0]),
        alpha=request.alpha,
        beta=request.beta,
        mode=request.mode
    )

    response_data = calculate_routes(route_request)
    response_data["emergency_info"] = nearest_emergency

    return response_data

@app.get("/api/heatmap")  # Aseguramos el prefijo /api para acoplarse con SafeRouteAPI
def get_heatmap_data():
    try:
        # Encontrar la raíz del proyecto dinámicamente desde Backend/api/main.py
        current_dir = os.path.dirname(os.path.abspath(__file__))
        # Retrocedemos dos niveles hacia Safe_Route_Medellin y entramos a Data/
        csv_path = os.path.normpath(os.path.join(current_dir, "../../Data/unified_medellin_data.csv"))

        if not os.path.exists(csv_path):
            # Intento de respaldo si tu entorno de ejecución inicia directamente desde la raíz
            csv_path = "Data/unified_medellin_data.csv"

        df = pd.read_csv(csv_path)

        # Limpiamos nulos de geolocalización
        df_clean = df[['lat', 'lon', 'combined_cost']].dropna()

        # Si el set de datos es muy pesado, tomamos una muestra equilibrada para optimizar la carga del mapa
        if len(df_clean) > 8000:
            df_clean = df_clean.sample(n=4000, random_state=42)

        max_cost = df_clean['combined_cost'].max()
        min_cost = df_clean['combined_cost'].min()

        if max_cost != min_cost:
            df_clean['weight'] = (df_clean['combined_cost'] - min_cost) / (max_cost - min_cost)
        else:
            df_clean['weight'] = 0.5

        return df_clean[['lat', 'lon', 'weight']].values.tolist()

    except Exception as e:
        return {"error": f"Fallo al procesar CSV en la ruta establecida: {str(e)}"}