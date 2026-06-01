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

# === RESOLUCIÓN ABSOLUTA DE RUTAS ===
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CSV_PATH = os.path.join(BASE_DIR, "Data", "unified_medellin_data.csv")

# Fallbacks de seguridad por si el entorno virtual cambia el directorio de trabajo
if not os.path.exists(CSV_PATH):
    CSV_PATH = "Data/unified_medellin_data.csv"
if not os.path.exists(CSV_PATH):
    CSV_PATH = "unified_medellin_data.csv"

GRAPH: Any = None
NODES_LIST: List[Any] = []
DATA_TREE: Any = None
EMERGENCY_LOCATOR: Any = None

@asynccontextmanager
async def lifespan(_fastapi_app: FastAPI):
    global GRAPH, NODES_LIST, DATA_TREE, EMERGENCY_LOCATOR

    print(f"[API] Cargando grafo para Medellín desde {CSV_PATH}...")
    try:
        GRAPH = build_medellin_graph(CSV_PATH)
        NODES_LIST = list(GRAPH.nodes)

        from scipy.spatial import KDTree
        DATA_TREE = KDTree(NODES_LIST)
        print(f"[API] Grafo cargado exitosamente. {len(NODES_LIST)} nodos indexados.")
    except Exception as e:
        print(f"[ERROR CRÍTICO] No se pudo cargar el grafo: {e}")

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
    tipo_emergencia: str
    alpha: float
    beta: float
    mode: str = "both"

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
            "history_visited": a_star_history, # Se inyecta directo porque el algoritmo ya lo formatea
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
            "history_visited": greedy_history, # Se inyecta directo
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
        raise HTTPException(status_code=400, detail="Tipo de emergencia inválido.")

    if not nearest_emergency:
        raise HTTPException(status_code=500, detail="No se pudieron cargar los datos.")

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

@app.get("/api/heatmap")
def get_heatmap_data():
    try:
        df = pd.read_csv(CSV_PATH)
        df_clean = df[['lat', 'lon', 'combined_cost']].dropna()

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
        return {"error": f"Fallo al procesar CSV: {str(e)}"}