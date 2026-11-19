"""Prepara mapas CC0 del árbol del ascensor; conserva los originales en .local/."""
import hashlib
import json
import math
import random
import urllib.request
import zipfile
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / ".local/tree-sources"
ASSETS = ROOT / "frontend/public/assets"
OUTPUT = ASSETS / "vegetation"
LEAVES_URL = "https://acg-download.struffelproductions.com/file/ambientCG-Web/download/LeafSet001_bjepCPSF/LeafSet001_1K-JPG.zip"


def fetch(url, destination):
    if not destination.exists():
        request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(request, timeout=60) as response:
            destination.write_bytes(response.read())
    return destination


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def leaf_cluster():
    original = OUTPUT / "leaves-color.webp"
    leaf = Image.open(original).convert("RGBA").crop((45, 25, 263, 492))
    rng = random.Random(827)
    canvas = Image.new("RGBA", (512, 512))
    for i in range(36):
        angle = i * 2.39996
        radius = (i / 36) ** .5 * 155
        size = rng.randint(82, 122)
        stamp = leaf.resize((int(size * .46), size), Image.Resampling.LANCZOS)
        stamp = stamp.rotate(rng.uniform(-160, 160), Image.Resampling.BICUBIC, expand=True)
        at = (int(256 + math.cos(angle) * radius - stamp.width / 2),
              int(256 + math.sin(angle) * radius * .85 - stamp.height / 2))
        canvas.alpha_composite(stamp, at)
    canvas.save(OUTPUT / "leaves-cluster.webp", quality=90, method=6)
    return dict(asset="vegetation/leaves-cluster.webp", source="https://ambientcg.com/a/LeafSet001",
                author="Lennart Demes / ambientCG", license="CC0-1.0",
                licenseUrl="https://docs.ambientcg.com/license/", sourceSha256=sha(original),
                processing="36 recortes del mapa de hojas, agrupados con semilla 827 para el detalle lejano.")


def main():
    CACHE.mkdir(parents=True, exist_ok=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    entries = []
    for key, name in [("diff", "bark-color"), ("nor_gl", "bark-normal"), ("rough", "bark-roughness")]:
        url = f"https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/bark_brown_02/bark_brown_02_{key}_1k.jpg"
        original = fetch(url, CACHE / (key + ".jpg"))
        Image.open(original).convert("RGB").save(OUTPUT / (name + ".webp"), quality=90, method=6)
        entries.append(dict(source="https://polyhaven.com/a/bark_brown_02", download=url,
                            author="Rob Tuytel / Poly Haven", license="CC0-1.0",
                            licenseUrl="https://polyhaven.com/license", sourceSha256=sha(original),
                            asset="vegetation/" + name + ".webp"))
    archive = fetch(LEAVES_URL, CACHE / "leaves.zip")
    # Solo se leen mapas concretos del ZIP, sin extraer archivos ejecutables ni rutas del paquete.
    with zipfile.ZipFile(archive) as package:
        def image(name):
            with package.open("LeafSet001_1K-JPG_" + name + ".jpg") as stream:
                return Image.open(stream).copy()
        color = ImageEnhance.Color(image("Color").convert("RGB")).enhance(1.25)
        color = ImageEnhance.Brightness(color).enhance(1.3).convert("RGBA")
        # Retira el borde claro del fondo del atlas sin perder el contorno de la hoja.
        alpha = image("Opacity").convert("L").filter(ImageFilter.MinFilter(3))
        color.putalpha(alpha)
        color.save(OUTPUT / "leaves-color.webp", quality=92, method=6)
        image("NormalGL").save(OUTPUT / "leaves-normal.webp", quality=90, method=6)
    for name in ["leaves-color", "leaves-normal"]:
        entries.append(dict(source="https://ambientcg.com/a/LeafSet001",
                            download="https://ambientcg.com/get?file=LeafSet001_1K-JPG.zip",
                            author="Lennart Demes / ambientCG", license="CC0-1.0",
                            licenseUrl="https://docs.ambientcg.com/license/", sourceSha256=sha(archive),
                            asset="vegetation/" + name + ".webp",
                            processing="Color: saturación ×1,25, brillo ×1,3, alfa erosionado 1 px. Normal OpenGL sin modificar."))
    entries.append(leaf_cluster())
    manifest = ASSETS / "sources.json"
    catalogue = json.loads(manifest.read_text(encoding="utf-8"))
    names = {entry["asset"] for entry in entries}
    catalogue["assets"] = [entry for entry in catalogue["assets"] if entry["asset"] not in names]
    for entry in entries:
        asset = ASSETS / entry["asset"]
        entry.update(bytes=asset.stat().st_size, sha256=sha(asset))
        catalogue["assets"].append(entry)
        print(entry["asset"], entry["bytes"])
    manifest.write_text(json.dumps(catalogue, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
