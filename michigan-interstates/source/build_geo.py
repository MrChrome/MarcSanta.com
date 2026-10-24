import json, math, sys
import networkx as nx
from shapely.geometry import shape, LineString, Polygon, MultiPolygon, box, mapping
from shapely.ops import unary_union
sys.path.insert(0, "/home/claude/mi")
from segments import S

DL = sys.argv[1]
OUT = sys.argv[2]
K = math.cos(math.radians(44.5))
X0, Y0, SC = -90.6, 48.4, 100.0  # projection origin & scale (svg units per degree lat)

def proj(lon, lat):
    return ((lon - X0) * K * SC, (Y0 - lat) * SC)

import shapefile
names = {s["route"].split("-")[1] for s in S}
lines = {n: [] for n in names}
_r = shapefile.Reader(f"{DL}/na")
for sr in _r.iterShapeRecords():
    d = sr.record.as_dict()
    if d["class"] != "Interstate" or d["type"] not in ("Freeway", "Tollway") or d["state"] != "Michigan" or d["number"] not in names:
        continue
    pts = sr.shape.points; parts = list(sr.shape.parts) + [len(pts)]
    for i in range(len(parts) - 1):
        lines[d["number"]].append(pts[parts[i]:parts[i + 1]])

def dist(a, b):
    return math.hypot((a[0] - b[0]) * K, a[1] - b[1])

graphs = {}
for n, ls in lines.items():
    G = nx.Graph()
    ends = []
    for l in ls:
        pts = [(round(x, 5), round(y, 5)) for x, y in l]
        for u, v in zip(pts, pts[1:]):
            G.add_edge(u, v, w=dist(u, v))
        ends += [pts[0], pts[-1]]
    # bridge small gaps between pieces
    nodes = list(G.nodes)
    for e in ends:
        for v in nodes:
            d = dist(e, v)
            if 0 < d < 0.02 and not G.has_edge(e, v):
                G.add_edge(e, v, w=d * 3)
    graphs[n] = G

def nearest(G, lat, lon):
    best, bd = None, 1e9
    for v in G.nodes:
        d = dist(v, (lon, lat))
        if d < bd:
            best, bd = v, d
    return best, bd

out = []
for i, s in enumerate(S):
    n = s["route"].split("-")[1]
    G = graphs.get(n)
    path = None
    if G is not None and G.number_of_nodes():
        a, da = nearest(G, *s["a"])
        b, db = nearest(G, *s["b"])
        if da < 0.06 and db < 0.06:
            try:
                path = nx.shortest_path(G, a, b, weight="w")
                L = sum(dist(u, v) for u, v in zip(path, path[1:]))
                straight = dist((s["a"][1], s["a"][0]), (s["b"][1], s["b"][0]))
                if L > 1.8 * straight + 0.05:
                    print("LONG", s["route"], s["frm"], "->", s["to"], round(L, 3), round(straight, 3))
                    path = None
            except nx.NetworkXNoPath:
                print("NOPATH -> using all-route graph", s["route"], s["frm"], s["to"])
                GA = nx.compose_all(list(graphs.values()))
                for u in list(GA.nodes):
                    pass
                path = nx.shortest_path(GA, a, b, weight="w") if nx.has_path(GA, a, b) else None
        else:
            print("FAR", s["route"], s["frm"], s["to"], round(da, 3), round(db, 3))
    if not path or len(path) < 2:
        print("  fallback straight:", s["route"], s["frm"], "->", s["to"])
        path = [(s["a"][1], s["a"][0]), (s["b"][1], s["b"][0])]
        # snap ends to the graph if close, so lines meet
    xy = [proj(x, y) for x, y in path]
    d = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in xy)
    mid = xy[len(xy) // 2]
    # length in svg units for label priority
    L = sum(math.hypot(x2 - x1, y2 - y1) for (x1, y1), (x2, y2) in zip(xy, xy[1:]))
    # angle at middle for possible label rotation
    j = max(1, len(xy) // 2)
    (x1, y1), (x2, y2) = xy[j - 1], xy[min(j, len(xy) - 1)]
    out.append(dict(id=i, route=s["route"], frm=s["frm"], to=s["to"], year=s["year"], note=s["note"],
                    approx=s["approx"], d=d, mx=round(mid[0], 1), my=round(mid[1], 1), len=round(L, 1)))

# ---------- close junction gaps ----------
# Natural Earth lines often stop short of the Interstate they meet. Where a segment end is
# labeled with another route ("I-75, S Flint"), extend it to the nearest point on that route.
def snap_junctions(out, lo=0.3, hi=6.0):
    import re
    def pts(d): return [tuple(map(float, p)) for p in re.findall(r"(-?[\d.]+),(-?[\d.]+)", d)]
    def foot(p, a, b):
        dx, dy = b[0] - a[0], b[1] - a[1]; L = dx * dx + dy * dy
        t = 0 if L == 0 else max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L))
        q = (a[0] + t * dx, a[1] + t * dy)
        return math.dist(p, q), q
    P = {s["id"]: pts(s["d"]) for s in out}
    for s in out:
        xy = list(P[s["id"]])
        for at, lab in ((0, s["frm"]), (-1, s["to"])):
            m = re.match(r"(I-\d+)", lab)
            if not m or m.group(1) == s["route"]:
                continue
            cands = [foot(xy[at], a, b) for t in out if t["route"] == m.group(1) for a, b in zip(P[t["id"]], P[t["id"]][1:])]
            if not cands:
                continue
            gap, q = min(cands)
            if gap <= lo:
                continue
            # if the line already crosses that route near this end, trim back to the crossing instead
            order = range(len(xy)) if at == 0 else range(len(xy) - 1, -1, -1)
            run, prev, cut = 0.0, None, None
            for k in order:
                if prev is not None:
                    run += math.dist(xy[k], xy[prev])
                if run > hi:
                    break
                if min(foot(xy[k], a, b)[0] for t in out if t["route"] == m.group(1) for a, b in zip(P[t["id"]], P[t["id"]][1:])) <= lo:
                    cut = k
                    break
                prev = k
            if cut is not None and 0 < (cut if at == 0 else len(xy) - 1 - cut) < len(xy) - 1:
                s["len"] = round(s["len"] - run, 1)
                xy = xy[cut:] if at == 0 else xy[:cut + 1]
            elif gap < hi:
                q = (round(q[0], 1), round(q[1], 1))
                xy = [q] + xy if at == 0 else xy + [q]
                s["len"] = round(s["len"] + gap, 1)
        s["d"] = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in xy)
    return out

snap_junctions(out)

# ---------- base map: states, lakes ----------
states = json.load(open(f"{DL}/states.geojson"))
lakes = json.load(open(f"{DL}/lakes.geojson"))
VIEW = box(-90.6, 41.3, -77.5, 48.4)

def poly_d(geom):
    geom = geom.intersection(VIEW).simplify(0.003, preserve_topology=True)
    polys = [geom] if isinstance(geom, Polygon) else [g for g in getattr(geom, "geoms", []) if isinstance(g, Polygon)]
    parts = []
    for p in polys:
        if p.area < 0.0005:
            continue
        for ring in [p.exterior] + list(p.interiors):
            pts = [proj(x, y) for x, y in ring.coords]
            parts.append("M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts) + "Z")
    return "".join(parts)

base = {}
neighbors = []
for f in states["features"]:
    p = f["properties"]
    nm = p.get("name")
    if p.get("adm0_a3") not in ("USA", "CAN"):
        continue
    g = shape(f["geometry"])
    if not g.intersects(VIEW):
        continue
    if nm == "Michigan":
        base["michigan"] = poly_d(g)
    else:
        neighbors.append(poly_d(g))
base["neighbors"] = "".join(neighbors)
lk = []
for f in lakes["features"]:
    g = shape(f["geometry"])
    if g.intersects(VIEW) and g.area > 0.01:
        lk.append(poly_d(g))
base["lakes"] = "".join(lk)

# city labels
cities = [("Detroit", 42.331, -83.046), ("Grand Rapids", 42.963, -85.668), ("Lansing", 42.733, -84.556),
          ("Flint", 43.012, -83.687), ("Kalamazoo", 42.292, -85.587), ("Saginaw", 43.419, -83.951),
          ("Ann Arbor", 42.281, -83.743), ("Jackson", 42.246, -84.401), ("Battle Creek", 42.321, -85.180),
          ("Muskegon", 43.234, -86.248), ("Port Huron", 42.971, -82.425), ("Benton Harbor", 42.117, -86.454),
          ("Bay City", 43.594, -83.889), ("Monroe", 41.916, -83.398), ("Grayling", 44.661, -84.715),
          ("Gaylord", 45.027, -84.674), ("Mackinaw City", 45.784, -84.728), ("St. Ignace", 45.866, -84.727),
          ("Sault Ste. Marie", 46.495, -84.345), ("Holland", 42.788, -86.109), ("West Branch", 44.276, -84.239),
          ("Pontiac", 42.639, -83.291), ("Toledo", 41.654, -83.537), ("Brighton", 42.529, -83.780)]
base["cities"] = [dict(n=n, x=round(proj(lo, la)[0], 1), y=round(proj(lo, la)[1], 1)) for n, la, lo in cities]
x0, y0 = proj(-90.6, 48.4); x1, y1 = proj(-81.9, 41.3)
base["viewBox"] = [round(x0, 1), round(y0, 1), round(x1 - x0, 1), round(y1 - y0, 1)]
json.dump(dict(segments=out, base=base), open(OUT, "w"))
print("segments", len(out), "bytes", len(json.dumps(dict(segments=out, base=base))))
