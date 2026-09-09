"""Извлекает растровые картинки из PDF концепта в tools/_tmp/pdf/. Запуск: python tools/extract_pdf_images.py <pdf>"""
import sys, pathlib
import pypdfium2 as pdfium

out = pathlib.Path("tools/_tmp/pdf"); out.mkdir(parents=True, exist_ok=True)
pdf = pdfium.PdfDocument(sys.argv[1])
n = 0
for pi in range(len(pdf)):
    page = pdf[pi]
    for obj in page.get_objects(max_depth=4):
        if obj.type == pdfium.raw.FPDF_PAGEOBJ_IMAGE:
            try:
                bm = obj.get_bitmap(render=False).to_pil().convert("RGB")
            except Exception:
                continue
            if bm.width < 200 or bm.height < 200:
                continue
            n += 1
            bm.save(out / f"p{pi+1:02d}-{n:03d}-{bm.width}x{bm.height}.jpg", "JPEG", quality=88)
print("extracted", n)
