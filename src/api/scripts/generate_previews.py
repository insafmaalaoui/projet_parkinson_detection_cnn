#!/usr/bin/env python3
"""Batch-generate PNG previews for existing DICOM files in backend/uploads.

Usage:
  python generate_previews.py

This will scan the `uploads` directory adjacent to this script's parent package
and write PNGs into `uploads/previews/` for any `*.dcm` files that don't yet
have a corresponding PNG.

Requires: pydicom, pillow, numpy
Install: pip install pydicom pillow numpy
"""
import os
import sys
from pathlib import Path

try:
    from pydicom import dcmread
    from PIL import Image
    import numpy as np
except Exception as e:
    print("Missing dependencies. Run: pip install pydicom pillow numpy")
    raise


def ensure_previews_dir(uploads_dir: Path) -> Path:
    previews = uploads_dir / "previews"
    previews.mkdir(parents=True, exist_ok=True)
    return previews


def generate_preview(dcm_path: Path, png_path: Path) -> bool:
    try:
        ds = dcmread(str(dcm_path))
        arr = ds.pixel_array.astype(float)
        if arr.max() == arr.min():
            norm = (arr * 0).astype('uint8')
        else:
            norm = ((arr - arr.min()) / (arr.max() - arr.min()) * 255.0).astype('uint8')

        img = Image.fromarray(norm)
        # convert to a compatible mode
        if img.mode != 'RGB' and img.mode != 'L':
            img = img.convert('L')

        img.save(str(png_path))
        return True
    except Exception as e:
        print(f"Failed to generate preview for {dcm_path.name}: {e}")
        return False


def main():
    base = Path(__file__).resolve().parents[1]  # project backend/.. parent
    uploads = base / 'uploads'
    if not uploads.exists():
        print(f"Uploads directory not found: {uploads}")
        sys.exit(1)

    previews = ensure_previews_dir(uploads)

    dcm_files = sorted([p for p in uploads.iterdir() if p.is_file() and p.suffix.lower() == '.dcm'])
    if not dcm_files:
        print("No .dcm files found in uploads/")
        return

    print(f"Found {len(dcm_files)} DICOM files. Generating previews into {previews}")
    created = 0
    skipped = 0
    failed = 0
    for d in dcm_files:
        png_name = d.stem + '.png'
        png_path = previews / png_name
        if png_path.exists():
            skipped += 1
            continue
        ok = generate_preview(d, png_path)
        if ok:
            created += 1
        else:
            failed += 1

    print(f"Done. created={created}, skipped={skipped}, failed={failed}")


if __name__ == '__main__':
    main()
