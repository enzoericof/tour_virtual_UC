"""Prepare local web assets from a READ-ONLY copy of the shared Drive folder.
Usage: python scripts/prepare-assets.py /path/to/downloaded/TP-Final
Only writes frontend/public/assets; never modifies source files.
"""
import argparse,hashlib,io,json,struct
from pathlib import Path
from PIL import Image,ImageOps
import pillow_heif
pillow_heif.register_heif_opener()
SCANS={'Persona.glb':'persona','Laboratorio - Planta Baja.glb':'laboratorio','Clase - Piso 3.glb':'aula-p3','Pasillo - Piso 3.glb':'pasillo-p3'}
def optimize_glb(source,destination):
    data=source.read_bytes()
    magic,version,total=struct.unpack_from('<III',data)
    if magic!=0x46546c67 or version!=2 or total!=len(data):raise ValueError('GLB inválido: '+source.name)
    length=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+length]);binary=data[28+length:]
    # Embedded images are replaced from the end to retain the original offsets.
    for image in sorted(doc.get('images',[]),key=lambda i:doc['bufferViews'][i['bufferView']].get('byteOffset',0),reverse=True):
        view=doc['bufferViews'][image['bufferView']];offset=view.get('byteOffset',0);size=view['byteLength']
        bitmap=Image.open(io.BytesIO(binary[offset:offset+size])).convert('RGB');bitmap.thumbnail((4096,4096));buffer=io.BytesIO();bitmap.save(buffer,format='JPEG',quality=88);replacement=buffer.getvalue();image_size=len(replacement);replacement+=b'\0'*((-image_size)%4)
        # GLB bufferViews begin at four-byte boundaries. Preserve any source padding.
        old_end=offset+size;next_offset=min([v.get('byteOffset',0) for v in doc['bufferViews'] if v.get('byteOffset',0)>=old_end]+[len(binary)])
        padded_size=next_offset-offset;delta=len(replacement)-padded_size
        binary=binary[:offset]+replacement+binary[next_offset:];view['byteLength']=image_size;image['mimeType']='image/jpeg'
        for other in doc['bufferViews']:
            if other.get('byteOffset',0)>=next_offset:other['byteOffset']+=delta
    doc['buffers'][0]['byteLength']=len(binary);encoded=json.dumps(doc,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4);binary+=b'\0'*((-len(binary))%4)
    destination.write_bytes(struct.pack('<III',magic,2,28+len(encoded)+len(binary))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(binary),0x004e4942)+binary)
def main():
    parser=argparse.ArgumentParser();parser.add_argument('source',type=Path);args=parser.parse_args();source=args.source.resolve();out=Path(__file__).resolve().parents[1]/'frontend/public/assets'
    if not source.is_dir():raise SystemExit('No existe la carpeta de referencias.')
    (out/'scans').mkdir(parents=True,exist_ok=True);(out/'photos').mkdir(exist_ok=True);manifest=[]
    for file in sorted(source.rglob('*')):
        if not file.is_file():continue
        target=None
        if file.name in SCANS:target=out/'scans'/(SCANS[file.name]+'.glb');optimize_glb(file,target)
        elif file.suffix.lower()=='.heic':
            target=out/'photos'/(file.stem+'.webp');image=ImageOps.exif_transpose(Image.open(file)).convert('RGB');image.thumbnail((1200,1200));image.save(target,quality=82)
        if target:manifest.append({'source':str(file.relative_to(source)),'sourceSha256':hashlib.sha256(file.read_bytes()).hexdigest(),'asset':str(target.relative_to(out)).replace('\\','/'),'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
    (out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8');print(f'{len(manifest)} recursos preparados. Fuentes sin modificar.')
if __name__=='__main__':main()
