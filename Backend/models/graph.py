import os
import pandas as pd
import networkx as nx
from ast import literal_eval
from Backend.utils.math_utils import calculate_max_graph_distance


def build_medellin_graph(file_name="unified_medellin_data.csv"):

    base_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(base_dir, "..", "..", "Data", file_name)

    df = pd.read_csv(csv_path, sep=",")
    road_graph = nx.DiGraph()

    df['name'] = df['name'].ffill()
    df['harassmentRisk'] = df['harassmentRisk'].ffill()
    df['cameras_count'] = df['cameras_count'].fillna(0)
    df['incidents_count'] = df['incidents_count'].fillna(0)

    l_min = df['length'].min()
    l_max = df['length'].max()
    rango_length = l_max - l_min if l_max != l_min else 1.0

    for fila in df.itertuples():
        name = fila.name
        origin = literal_eval(fila.origin)
        destination = literal_eval(fila.destination)
        real_length = fila.length
        oneway = fila.oneway
        harassmentRisk = fila.harassmentRisk
        cameras = fila.cameras_count
        incidents = fila.incidents_count
        geometry = fila.geometry

        normalized_length = (real_length - l_min) / rango_length

        road_graph.add_edge(
            origin,
            destination,
            name=name,
            length=real_length,
            normalized_length=normalized_length,
            harassmentRisk=harassmentRisk,
            cameras_count=cameras,
            incidents_count=incidents,
            geometry=geometry
        )

        if not oneway:
            road_graph.add_edge(
                destination,
                origin,
                name=name,
                length=real_length,
                normalized_length=normalized_length,
                harassmentRisk=harassmentRisk,
                cameras_count=cameras,
                incidents_count=incidents,
                geometry=geometry
            )

    distancia_max = calculate_max_graph_distance(road_graph)

    graph_attributes = getattr(road_graph, 'graph', {})
    graph_attributes['max_city_distance'] = distancia_max

    return road_graph

