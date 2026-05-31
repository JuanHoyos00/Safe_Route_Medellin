import heapq
from Backend.utils.math_utils import heuristic_haversine


def algorithm_greedy(graph, origin, destination, alpha, beta):
    if origin not in graph or destination not in graph:
        return None, float('inf'), []

    graph_attributes = getattr(graph, 'graph', {})
    max_city_distance = graph_attributes.get('max_city_distance', 1.0)

    priority_queue = []
    initial_priority = heuristic_haversine(origin, destination, alpha, max_city_distance)

    heapq.heappush(priority_queue, (initial_priority, origin, [origin], 0.0))

    closed_set = set()
    history_visited = []

    while priority_queue:
        current_priority, current_node, current_route, current_cost = heapq.heappop(priority_queue)

        if current_node in closed_set:
            continue

        closed_set.add(current_node)

        parent_node = current_route[-2] if len(current_route) > 1 else current_node
        history_visited.append((parent_node, current_node))

        if current_node == destination:
            return current_route, current_cost, history_visited

        for neighbor in graph.neighbors(current_node):
            if neighbor not in closed_set:
                edge_data = graph.get_edge_data(current_node, neighbor)

                normalized_length = edge_data['normalized_length']

                base_risk = edge_data['harassmentRisk']
                cameras = edge_data.get('cameras_count', 0)
                incidents = edge_data.get('incidents_count', 0)

                dynamic_risk = base_risk + (0.05 * incidents) - (0.2 * cameras)
                dynamic_risk = max(0.0, min(1.0, dynamic_risk))

                edge_cost = (alpha * normalized_length) + (beta * dynamic_risk)
                h_score = heuristic_haversine(neighbor, destination, alpha, max_city_distance)
                priority_score = edge_cost + h_score

                heapq.heappush(priority_queue,
                               (priority_score, neighbor, current_route + [neighbor], current_cost + edge_cost))

    return None, float('inf'), history_visited