import math

def calculate_max_graph_distance(graph):
    nodes = list(graph.nodes)
    if not nodes:
        return 1.0

    extremes = [
        min(nodes, key=lambda x: x[0]),  # Oeste
        max(nodes, key=lambda x: x[0]),  # Este
        min(nodes, key=lambda x: x[1]),  # Sur
        max(nodes, key=lambda x: x[1])  # Norte
    ]

    max_distance = 0.0
    for extreme_node in extremes:
        for current_node in nodes:
            distance = haversine_distance(extreme_node, current_node)
            if distance > max_distance:
                max_distance = distance
    return max_distance


def haversine_distance(node1, node2):
    lon_1, lat_1 = node1
    lon_2, lat_2 = node2
    earth_radius = 6371000.0

    phi_1 = math.radians(lat_1)
    phi_2 = math.radians(lat_2)
    delta_phi = math.radians(lat_2 - lat_1)
    delta_lambda = math.radians(lon_2 - lon_1)

    a = (math.sin(delta_phi / 2) ** 2 +
         math.cos(phi_1) * math.cos(phi_2) * math.sin(delta_lambda / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return earth_radius * c

def heuristic_haversine(current_node, destination_node, alpha, max_city_distance):
    distance = haversine_distance(current_node, destination_node)
    normalized_distance = distance / max_city_distance

    if normalized_distance > 1.0:
        normalized_distance = 1.0

    return alpha * normalized_distance