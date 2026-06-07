import sys
from pathlib import Path
from PIL import Image
from rembg import remove

def process(src: str):
    src_path = Path(src)
    img = Image.open(src_path)

    removed = remove(img)

    bbox = removed.split()[3].getbbox()
    cropped = removed.crop(bbox)

    white_bg = Image.new("RGB", cropped.size, (255, 255, 255))
    white_bg.paste(cropped, mask=cropped.split()[3])

    out_path = src_path.parent / f"{src_path.stem}_rembg.jpg"
    white_bg.save(out_path)
    print(f"saved: {out_path}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage: uv run test_rembg.py <image_path>")
        sys.exit(1)
    process(sys.argv[1])
