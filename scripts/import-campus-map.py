"""Convert a local OSM API export into the campus's shared, metre-based layout.

Usage: python scripts/import-campus-map.py path/to/campus.osm
The source XML is kept outside Git; personal OSM contributor metadata is discarded.
"""

import argparse
import json
import math
import xml.etree.ElementTree as ET
from datetime import date
from pathlib import Path

ORIGIN = (-25.3251, -57.6387)
CAMPUS_ID = "130888813"


def inside(point, polygon):
    x, z = point
    result = False
    for (ax, az), (bx, bz) in zip(polygon, polygon[1:] + polygon[:1]):
        if (az > z) != (bz > z) and x < (bx - ax) * (z - az) / (bz - az) + ax:
            result = not result
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    args = parser.parse_args()
    root = ET.parse(args.source).getroot()
    nodes = {
        node.attrib["id"]: (float(node.attrib["lat"]), float(node.attrib["lon"]))
        for node in root.findall("node")
    }

    def points(way):
        result = []
        for node in way.findall("nd"):
            lat, lon = nodes[node.attrib["ref"]]
            result.append([
                round((lon - ORIGIN[1]) * 111320 * math.cos(math.radians(ORIGIN[0])), 2),
                round((ORIGIN[0] - lat) * 111320, 2),
            ])
        return result

    ways = root.findall("way")
    campus = next(way for way in ways if way.attrib["id"] == CAMPUS_ID)
    boundary = points(campus)
    min_x, max_x = min(p[0] for p in boundary), max(p[0] for p in boundary)
    min_z, max_z = min(p[1] for p in boundary), max(p[1] for p in boundary)
    data = {
        "source": {
            "provider": "OpenStreetMap contributors",
            "url": f"https://www.openstreetmap.org/way/{CAMPUS_ID}",
            "license": "https://www.openstreetmap.org/copyright",
            "retrieved": date.today().isoformat(),
        },
        "origin": {"latitude": ORIGIN[0], "longitude": ORIGIN[1]},
        "boundary": boundary,
        "buildings": [],
        "roads": [],
        "parking": [],
        "pitches": [],
    }
    for way in ways:
        tags = {tag.attrib["k"]: tag.attrib["v"] for tag in way.findall("tag")}
        coordinates = points(way)
        if not coordinates:
            continue
        centroid = [sum(p[i] for p in coordinates) / len(coordinates) for i in (0, 1)]
        in_campus = inside(centroid, boundary)
        feature = {"id": way.attrib["id"], "points": coordinates}
        if tags.get("name"):
            feature["name"] = tags["name"]
        if in_campus and tags.get("building"):
            feature["levels"] = int(tags.get("building:levels", "1"))
            data["buildings"].append(feature)
        elif in_campus and tags.get("amenity") == "parking":
            data["parking"].append(feature)
        elif in_campus and tags.get("leisure") == "pitch":
            data["pitches"].append(feature)
        elif tags.get("highway") and any(
            min_x - 22 <= x <= max_x + 22 and min_z - 22 <= z <= max_z + 22
            for x, z in coordinates
        ):
            # Include internal lanes and the immediately adjacent street segments.
            allowed = tags["highway"] in ("service", "footway", "path")
            named = tags.get("name", "")
            perimeter = any(word in named for word in ("Cantal", "Molinas", "Nicolás", "Belisario"))
            if (allowed and in_campus) or perimeter:
                feature["width"] = 3 if tags["highway"] in ("footway", "path") else 6 if allowed else 9
                # Keep a small contextual margin, rather than entire city streets.
                clipped = [p for p in coordinates if min_x - 70 <= p[0] <= max_x + 70 and min_z - 70 <= p[1] <= max_z + 70]
                if len(clipped) >= 2:
                    feature["points"] = clipped
                    data["roads"].append(feature)
    target = Path(__file__).resolve().parents[1] / "frontend/src/data/campus-layout.json"
    target.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: len(data[key]) for key in ("buildings", "roads", "parking", "pitches")}))


if __name__ == "__main__":
    main()
