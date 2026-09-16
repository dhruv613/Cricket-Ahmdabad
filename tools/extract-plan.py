"""Extract site geometry from the architect's PDF as exact vector coordinates.

Scale is fixed by two independently dimensioned objects - the pickleball block
(24 x 19.2 m) and the volleyball run-off box (15 x 24 m) - both giving 5.2 pt/m,
and confirmed by the 100 M cricket ground circle measuring 100.08 m.

Origin is the cricket ground centre. +X east, +Z north (PDF y is top-down).
"""
import fitz, json

PT_PER_M = 5.2
doc = fitz.open(r"C:\Users\ASUS\Downloads\VASTRAL CRICKET GROUND.pdf")
paths = doc[0].get_drawings()

def near(c, t, e=.02):
    return c and all(abs(a - b) < e for a, b in zip(c, t))

def pts_of(p):
    out = []
    for it in p["items"]:
        if it[0] == "l": out += [(it[1].x, it[1].y), (it[2].x, it[2].y)]
        elif it[0] == "c": out += [(it[1].x, it[1].y), (it[4].x, it[4].y)]
        elif it[0] == "re":
            r = it[1]; out += [(r.x0, r.y0), (r.x1, r.y0), (r.x1, r.y1), (r.x0, r.y1)]
        elif it[0] == "qu":
            for q in it[1]: out.append((q.x, q.y))
    return out

def area(p):
    r = p["rect"]; return r.width * r.height

# Ground circle -> origin.
circle = max((p for p in paths if not p.get("fill")
              and abs(p["rect"].width - p["rect"].height) < 2
              and abs(p["rect"].width / PT_PER_M - 100) < 2), key=area)
CX = (circle["rect"].x0 + circle["rect"].x1) / 2
CY = (circle["rect"].y0 + circle["rect"].y1) / 2
print(f"# ground circle centre {CX:.2f},{CY:.2f}  diameter {circle['rect'].width/PT_PER_M:.2f} m")

def M(pt):
    return (round((pt[0] - CX) / PT_PER_M, 1), round((CY - pt[1]) / PT_PER_M, 1))

def dedup(seq, tol=0.6):
    out = []
    for p in seq:
        if not out or abs(p[0]-out[-1][0]) > tol or abs(p[1]-out[-1][1]) > tol:
            out.append(p)
    if len(out) > 1 and abs(out[0][0]-out[-1][0]) <= tol and abs(out[0][1]-out[-1][1]) <= tol:
        out.pop()
    return out

def report(label, p):
    print(f"\n{label}: {dedup([M(q) for q in pts_of(p)])}")

# Site boundary: the big multi-point stroked path enclosing the plot.
bnd = max((p for p in paths if not p.get("fill") and len(pts_of(p)) >= 8
           and 140 < p["rect"].width/PT_PER_M < 200 and 150 < p["rect"].height/PT_PER_M < 220), key=area)
report("siteBoundary", bnd)

# Road: the two long parallel strokes across the bottom.
road = sorted([p for p in paths if not p.get("fill") and len(pts_of(p)) == 2
               and p["rect"].width/PT_PER_M > 200 and p["rect"].y0 > CY], key=lambda p: p["rect"].y0)
for i, p in enumerate(road[:2]):
    report(f"roadEdge{i}", p)

COL = {"green":(0.843,0.922,0.824), "yellow":(0.969,0.949,0.506),
       "lavender":(0.808,0.8,0.902), "blue":(0.678,0.867,0.969), "paleyel":(0.973,0.965,0.69)}
for name, col in COL.items():
    g = sorted([p for p in paths if near(p.get("fill"), col)], key=area, reverse=True)
    print(f"\n--- {name}: {len(g)} paths, largest 4 ---")
    for p in g[:4]:
        r = p["rect"]
        print(f"  {r.width/PT_PER_M:7.2f} x {r.height/PT_PER_M:7.2f} m  centre {M(((r.x0+r.x1)/2,(r.y0+r.y1)/2))}"
              f"  pts {dedup([M(q) for q in pts_of(p)])}")
