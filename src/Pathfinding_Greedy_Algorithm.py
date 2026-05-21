# src/algorithm_greedy.py

def algorithm_greedy(graph, origin, destination, alpha, beta, l_min, l_max):
    if origin not in graph or destination not in graph:
        return None, float('inf'), []

    visited = set()
    route = [origin]
    current_node = origin
    total_cost = 0.0

    # --- NUEVO: Historial cronológico de exploración ---
    history_visited = []

    while current_node != destination:
        visited.add(current_node)
        local_options = []

        for neighbor in graph.neighbors(current_node):
            if neighbor not in visited:
                edge_data = graph.get_edge_data(current_node, neighbor)
                real_length = edge_data['length']

                if l_max == l_min:
                    normalized_length = 0.0
                else:
                    normalized_length = (real_length - l_min) / (l_max - l_min)

                edge_cost = (alpha * normalized_length) + (beta * edge_data['harassmentRisk'])
                local_options.append((neighbor, edge_cost))

                # Registramos este vecino como un nodo evaluado por Greedy
                history_visited.append(neighbor)

        local_options.sort(key=lambda x: x[1])

        if not local_options:
            return None, float('inf'), history_visited

        best_neighbor, best_cost = local_options[0]
        route.append(best_neighbor)
        total_cost += best_cost
        current_node = best_neighbor

    return route, total_cost, history_visited