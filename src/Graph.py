import pandas as pd
import networkx as nx
from ast import literal_eval

df = pd.read_csv("../Data/calles_de_medellin_con_acoso.csv", sep=";")
road_graph = nx.DiGraph()

df['name'] = df['name'].ffill()
df['harassmentRisk'] = df['harassmentRisk'].ffill()
l_min = min(df['length'])
l_max = max(df['length'])

for fila in df.itertuples():

    name = fila.name
    origin = literal_eval(fila.origin)
    destination = literal_eval(fila.destination)
    length = fila.length
    oneway = fila.oneway
    harassmentRisk = fila.harassmentRisk
    geometry = fila.geometry

    road_graph.add_edge( origin,
                         destination,
                         name = name,
                         length = length,
                         harassmentRisk = harassmentRisk,
                         geometry = geometry
                         )
    if not oneway:
        road_graph.add_edge( destination,
                             origin,
                             name = name,
                             length = length,
                             harassmentRisk = harassmentRisk,
                             geometry = geometry
                             )

