"""Extract plot data from 'Main List.pdf' and 'extra details.pdf' (RFP) into src/data/plots.json.

Main List is the source of truth for block, day, dates, price and map link; the RFP adds the
approach road and N/S/E/W surroundings. Disagreements are recorded per plot in `conflicts`.
Run: python scripts/extract.py   (from the app folder or anywhere)
"""
import json
import re
import sys
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[2]
APP = Path(__file__).resolve().parents[1]
OUT = APP / "src" / "data" / "plots.json"
OVERRIDES = json.loads((APP / "scripts" / "overrides.json").read_text(encoding="utf-8"))

COLS = ["sl", "block", "unit", "area", "use", "price", "rate", "emd", "approach", "N", "S", "E", "W"]

REPLACEMENTS = [
    ("Propert y", "Property"), ("Proper ty", "Property"), ("Drainag e", "Drainage"),
    ("Kalavedi ka", "Kalavedika"), ("Narro w", "Narrow"), ("30Roa d", "30' Road"),
    ("’", "'"), ("Reside ntial", "Residential"), ("Resident ial", "Residential"),
]


def num(s):
    s = (s or "").replace(",", "").strip()
    try:
        return float(s) if s else None
    except ValueError:
        return None


def norm_unit(s):
    s = re.sub(r"\s+", " ", (s or "").replace("\n", " ")).strip()
    s = re.sub(r"-\s+", "-", s)
    m = re.match(r"(?i)pump\s*house\s*(\d)", s)
    if m:
        return f"Pump House {m.group(1)}"
    m = re.match(r"(?i)(LIG|MIG)\s*-?\s*(\d+)", s)
    if m:
        return f"{m.group(1).upper()}-{int(m.group(2))}"
    return s


def clean(s):
    s = re.sub(r"\s+", " ", (s or "").replace("\n", " ")).strip()
    for a, b in REPLACEMENTS:
        s = s.replace(a, b)
    s = re.sub(r"\b(\d{2}) ?'? ?Road", r"\1' Road", s)
    s = re.sub(r"(LIG|MIG)\s*-\s*(\d)", r"\1-\2", s)
    s = re.sub(r"(LIG|MIG) (\d)", r"\1-\2", s)
    s = re.sub(r"(\d)\s*&\s*(\d)", r"\1 & \2", s)
    return s


def dms_to_dec(s):
    parts = re.findall(r"(\d+)\D+?(\d+)'\s*([\d.]+)\"?\s*,?\s*([NSEW])", s or "")
    out = []
    for d, m, sec, h in parts:
        v = int(d) + int(m) / 60 + float(sec) / 3600
        out.append(round(-v if h in "SW" else v, 6))
    return out if len(out) == 2 else None


# ---------------------------------------------------------------- Main List
def main_list():
    # Block/coordinate cells are merged vertically and the label can sit in any row of the group
    # (even on the next page), so rows with an empty block cell remember the next label as well.
    rows, block, coord, link, annex, block_page = [], None, None, None, None, -1
    with pdfplumber.open(ROOT / "Main List.pdf") as pdf:
        for pno, p in enumerate(pdf.pages):
            for t in p.extract_tables():
                for r in t:
                    c0 = r[0] or ""
                    if "Annexure 1" in c0:
                        annex = 1
                    if "Annexure 2" in c0:
                        annex = 2
                    if len(r) < 13 or not re.fullmatch(r"\d+", c0.strip()):
                        continue
                    b = (r[1] or "").replace("\n", " ").strip()
                    if b:
                        block, block_page = b, pno
                    if r[11] and r[11].strip():
                        coord = r[11]
                    if r[12] and r[12].strip():
                        link = r[12]
                    rows.append(dict(
                        annex=annex, sl=int(c0), blockRaw=block, ownBlock=bool(b),
                        unitRaw=r[2], area=num(r[3]), landUse=clean(r[4]), price=num(r[5]),
                        rate=num(r[6]), emd=num(r[7]), day=int((r[8] or "0").strip() or 0),
                        emdDate=(r[9] or "").strip(), auctionDate=(r[10] or "").strip(),
                        coordRaw=coord, linkRaw=link))
    # the next explicit block label after a row whose own block cell was empty
    nxt = None
    for r in reversed(rows):
        r["nextBlock"] = nxt
        if r["ownBlock"]:
            nxt = r["blockRaw"]
    return rows


# ---------------------------------------------------------------- RFP annexures
def cellify(ws, col):
    cells = {}
    for w in ws:
        cells.setdefault(col(w["x0"]), []).append(w)
    res = {}
    for c, lst in cells.items():
        lst.sort(key=lambda w: (round(w["top"] / 3), w["x0"]))
        res[c] = " ".join(w["text"] for w in lst)
    return res


def rfp():
    out, last_bounds, annex = [], None, None
    with pdfplumber.open(ROOT / "extra details.pdf") as pdf:
        # Annexure I table spans PDF pages 37-50, Annexure II pages 51-63 (1-based)
        for pi in range(36, 63):
            p = pdf.pages[pi]
            annex = 1 if pi < 50 else 2
            vx = sorted(set(round(r["x0"]) for r in p.rects if r["width"] < 2 and r["height"] > 5))
            bounds = vx if len(vx) >= 14 else last_bounds
            last_bounds = bounds

            def col(x, b=bounds):
                for i in range(len(b) - 1):
                    if b[i] - 1 <= x < b[i + 1] - 1:
                        return i
                return None

            words = p.extract_words()
            note = next((w["top"] for w in words if w["text"].startswith("NOTE")), 760)
            limit = min(note, 760)
            words = [w for w in words if 15 < w["top"] < limit and col(w["x0"]) is not None]
            anchors = sorted([w for w in words if col(w["x0"]) == 0 and re.fullmatch(r"\d+", w["text"])],
                             key=lambda w: w["top"])
            hl = sorted(set(round(r["top"]) for r in p.rects if r["height"] < 2 and r["width"] > 20))
            edges = []
            for i, a in enumerate(anchors):
                above = [h for h in hl if h <= a["top"]]
                below = [h for h in hl if h > a["top"] + 3]
                prev_b = anchors[i - 1]["bottom"] if i else None
                next_t = anchors[i + 1]["top"] if i + 1 < len(anchors) else None
                top = max(above) - 3 if above else ((prev_b + a["top"]) / 2 if i else 15)
                bot = min(below) - 3 if below else ((a["bottom"] + next_t) / 2 if next_t else min(limit, a["top"] + 70))
                if prev_b is not None and top < prev_b:
                    top = (prev_b + a["top"]) / 2
                if next_t is not None and bot > next_t:
                    bot = (a["bottom"] + next_t) / 2
                edges.append((top, bot))
            # a row split across a page break continues at the top of the next page
            first_top = edges[0][0] if edges else limit
            cont = [w for w in words if w["top"] < first_top]
            header_like = any(w["text"] in ("Sl", "Property", "Bloc", "Blo", "Unit") for w in cont)
            if cont and out and not header_like:
                for k, v in cellify(cont, col).items():
                    if v and k < len(COLS):
                        out[-1][COLS[k]] = (out[-1].get(COLS[k], "") + " " + v).strip()
            for top, bot in edges:
                ws = [w for w in words if top <= w["top"] < bot]
                rec = {COLS[k]: v for k, v in cellify(ws, col).items() if k < len(COLS)}
                rec.update(annex=annex, page=pi + 1)
                out.append(rec)
    for r in out:
        for k in COLS:
            r[k] = clean(r.get(k, ""))
    return out


def unit_key(unit, block):
    u = norm_unit(unit)
    if re.match(r"(?i)auto", block or ""):
        b = re.search(r"(\d)", block).group(1)
        return f"Autonagar B{b}" + (f"-{u}" if u in ("A", "B") else "")
    return u


def main():
    ml = main_list()
    rf = rfp()
    for r in ml:
        r["unit"] = unit_key(r["unitRaw"], r["blockRaw"])
    rfmap = {}
    for r in rf:
        r["key"] = unit_key(r["unit"], r["block"])
        rfmap.setdefault(r["key"], []).append(r)

    # coordinates per (annexure, block) taken from rows whose block label is on the same page
    block_geo = {}
    for r in ml:
        if r["ownBlock"]:
            block_geo.setdefault((r["annex"], r["blockRaw"]), (r["coordRaw"], r["linkRaw"]))
            block_geo.setdefault((None, r["blockRaw"]), (r["coordRaw"], r["linkRaw"]))

    plots, problems = [], []
    for r in ml:
        ov = OVERRIDES.get(f"{r['unit']}|{r['annex']}", {})
        cands = rfmap.get(r["unit"], [])
        match = next((c for c in cands if c["annex"] == r["annex"]), cands[0] if cands else None)
        conflicts = []
        block = r["blockRaw"]
        coord_raw, link_raw = r["coordRaw"], r["linkRaw"]
        if match is None:
            problems.append(f"no RFP row for {r['unit']}")
            match = {}
        else:
            mb = match.get("block", "")
            if mb and not re.match(r"(?i)auto", mb) and mb.upper() != (block or "").upper():
                if not r["ownBlock"] and (r["nextBlock"] or "").upper() == mb.upper():
                    # parse artifact: merged block label lies on the next page; RFP has the real block
                    block = mb
                    coord_raw, link_raw = block_geo.get((r["annex"], mb)) or block_geo.get((None, mb)) or (coord_raw, link_raw)
                else:
                    conflicts.append(f"RFP (Annexure {'I' if match['annex'] == 1 else 'II'}) shows Block {mb}")
            mrate = num(match.get("rate", ""))
            if mrate and abs(mrate - r["rate"]) > 1:
                conflicts.append(f"RFP rate differs: Rs {match['rate']}/sq.yd")
        rov = {k[4:]: v for k, v in ov.items() if k.startswith("rfp_")}
        sur = {d: rov.get(d, match.get(d, "")) for d in "NSEW"}
        approach = rov.get("approach", match.get("approach", ""))
        coords = dms_to_dec(coord_raw)
        link_coords = dms_to_dec(re.sub(r"\s+", "", link_raw or "").split("q=")[-1])
        if coords and link_coords and (abs(coords[0] - link_coords[0]) > 1e-3 or abs(coords[1] - link_coords[1]) > 1e-3):
            conflicts.append("Main List coordinates column repeats Block 6's position; the map link "
                             "(used here) points to a different spot. Verify on site.")
            coords = link_coords
        # The auction day follows the dates printed against the plot (the RFP annexure agrees)
        day = 2 if r["auctionDate"].startswith("16") else 1
        if day != r["annex"]:
            conflicts.append(f"Main List prints this plot in its Day {r['annex']} table, but its dates are "
                             f"EMD {r['emdDate']} / auction {r['auctionDate']}; the RFP lists it under "
                             f"Annexure {'I' if day == 1 else 'II'}. Shown here as Day {day}.")
        conflicts += ov.get("conflicts", [])
        auto = r["unit"].startswith("Autonagar")
        if auto:
            block = r["unit"].split("-")[0]
        land = "Industrial" if "Industrial" in r["landUse"] else r["landUse"]
        plots.append(dict(
            id=re.sub(r"[^A-Za-z0-9]+", "-", r["unit"]).strip("-").lower(),
            unit=r["unit"], block=block, day=day, listedInDayTable=r["annex"], sl=r["sl"],
            area=r["area"], landUse=land, reservePrice=r["price"], rate=r["rate"], emd=r["emd"],
            emdLastDate=r["emdDate"], auctionDate=r["auctionDate"],
            coords=coords,
            approach=approach, surroundings=sur, conflicts=conflicts, rfpPage=match.get("page"),
        ))

    d1 = sum(p["listedInDayTable"] == 1 for p in plots)
    d2 = sum(p["listedInDayTable"] == 2 for p in plots)
    print("Day1", d1, "Day2", d2, "total", len(plots))
    if (d1, d2) != (243, 216):
        problems.append("row counts wrong")
    for p in plots:
        if abs(p["area"] * p["rate"] - p["reservePrice"]) > 1000:
            problems.append(f"price mismatch {p['unit']} {p['area']}*{p['rate']} != {p['reservePrice']}")
        if not all(p["surroundings"].values()):
            problems.append(f"missing surroundings {p['unit']} {p['surroundings']}")
        if not p["approach"]:
            problems.append(f"missing approach {p['unit']}")
        if not p["coords"]:
            problems.append(f"missing coords {p['unit']}")
    ids = [p["id"] for p in plots]
    if len(set(ids)) != len(ids):
        problems.append("duplicate ids")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(plots, indent=1, ensure_ascii=False), encoding="utf-8")
    print("plots with conflicts:", sum(bool(p["conflicts"]) for p in plots))
    for x in problems:
        print("PROBLEM", x)
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
