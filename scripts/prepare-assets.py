"""Prepare local web assets from a READ-ONLY copy of the shared Drive folder.
Usage: python scripts/prepare-assets.py /path/to/downloaded/TP-Final
Only writes frontend/public/assets; never modifies source files.
"""
import argparse,hashlib,json
from pathlib import Path
from PIL import Image,ImageOps
import pillow_heif
pillow_heif.register_heif_opener()
def main():
    parser=argparse.ArgumentParser();parser.add_argument('source',type=Path);args=parser.parse_args();source=args.source.resolve();out=Path(__file__).resolve().parents[1]/'frontend/public/assets'
    if not source.is_dir():raise SystemExit('No existe la carpeta de referencias.')
    (out/'photos').mkdir(parents=True,exist_ok=True);manifest=[]
    for file in sorted(source.rglob('*')):
        if not file.is_file():continue
        target=None
        if file.suffix.lower()=='.heic':
            target=out/'photos'/(file.stem+'.webp');image=ImageOps.exif_transpose(Image.open(file)).convert('RGB');image.thumbnail((1200,1200));image.save(target,quality=82)
        if target:manifest.append({'source':str(file.relative_to(source)),'sourceSha256':hashlib.sha256(file.read_bytes()).hexdigest(),'asset':str(target.relative_to(out)).replace('\\','/'),'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
    (out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8');print(f'{len(manifest)} recursos preparados. Fuentes sin modificar.')
if __name__=='__main__':main()
