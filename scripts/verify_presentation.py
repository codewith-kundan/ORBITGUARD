import fitz  # PyMuPDF
import os

PDF_PATH = "/Users/kundan/Downloads/ORBITGUARD/ORBITGUARD_SIH_2026_IDEA_PRESENTATION.pdf"
PREVIEW_DIR = "/Users/kundan/Downloads/ORBITGUARD/docs/pdf_previews"
os.makedirs(PREVIEW_DIR, exist_ok=True)

def verify_pdf():
    doc = fitz.open(PDF_PATH)
    page_count = len(doc)
    print(f"Total PDF Pages: {page_count} (Expected: 6)")
    assert page_count == 6, f"Error: PDF has {page_count} pages, expected 6!"

    for i, page in enumerate(doc):
        pix = page.get_pixmap(dpi=150)
        img_out = f"{PREVIEW_DIR}/page_{i+1}.png"
        pix.save(img_out)
        print(f"Page {i+1} rendered to {img_out} ({pix.width}x{pix.height})")

    print("\nAll 6 pages verified and rendered successfully!")

if __name__ == "__main__":
    verify_pdf()
