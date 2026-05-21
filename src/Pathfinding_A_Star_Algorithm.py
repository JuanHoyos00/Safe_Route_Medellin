# src/algorithm_a_star.py
import math
import heapq


def heuristic_haversine(current_node, destination_node, alpha, l_min, l_max):
    lon_1, lat_1 = current_node
    lon_2, lat_2 = destination_node
    earth_radius = 6371000.0

    phi_1 = math.radians(lat_1)
    phi_2 = math.radians(lat_2)
    delta_phi = math.radians(lat_2 - lat_1)
    delta_lambda = math.radians(lon_2 - lon_1)

    haversine_val = (math.sin(delta_phi / 2) ** 2 + math.cos(phi_1) * math.cos(phi_2) * math.sin(delta_lambda / 2) ** 2)
    angular_dist = 2 * math.atan2(math.sqrt(haversine_val), math.sqrt(1 - haversine_val))
    distance = earth_radius * angular_dist

    if distance <= l_min:
        normalized_distance = 0.0
    else:
        if l_max == l_min:
            normalized_distance = 0.0
        else:
            normalized_distance = (distance - l_min) / (l_max - l_min)

    if normalized_distance > 1:
        normalized_distance = 1

    return alpha * normalized_distance


def algorithm_a_star(graph, origin, destination, alpha, beta, l_min, l_max):
    if origin not in graph or destination not in graph:
        return None, float('inf'), 0, []

    priority_queue = []
    g_score = {nodo: float('inf') for nodo in graph.nodes}
    g_score[origin] = 0

    f_score = {nodo: float('inf') for nodo in graph.nodes}
    f_score[origin] = heuristic_haversine(origin, destination, alpha, l_min, l_max)

    heapq.heappush(priority_queue, (f_score[origin], origin))
    previous_path = {}
    explored_nodes = 0
    closed_set = set()

    # --- NUEVO: Historial cronológico de exploración ---
    history_visited = []

    while priority_queue:
        current_f, current_node = heapq.heappop(priority_queue)

        if current_node in closed_set:
            continue

        closed_set.add(current_node)
        # Grabamos el nodo en el orden exacto en que fue evaluado
        history_visited.append(current_node)
        explored_nodes += 1

        if current_node == destination:
            route = []
            total_cost = g_score[destination]
            current = destination
            while current in previous_path:
                route.append(current)
                current = previous_path[current]
            route.append(origin)
            route.reverse()
            # Retornamos también el historial de exploración
            return route, total_cost, explored_nodes, history_visited

        for neighbor in graph.neighbors(current_node):
            edge_data = graph.get_edge_data(current_node, neighbor)
            real_length = edge_data['length']

            if l_max == l_min:
                normalized_length = 0.0
            else:
                normalized_length = (real_length - l_min) / (l_max - l_min)

            edge_cost = (alpha * normalized_length) + (beta * edge_data['harassmentRisk'])
            tentative_g_score = g_score[current_node] + edge_cost

            if tentative_g_score < g_score[neighbor]:
                previous_path[neighbor] = current_node
                g_score[neighbor] = tentative_g_score
                f_score[neighbor] = tentative_g_score + heuristic_haversine(neighbor, destination, alpha, l_min, l_max)
                heapq.heappush(priority_queue, (f_score[neighbor], neighbor))

    return None, float('inf'), explored_nodes, history_visited