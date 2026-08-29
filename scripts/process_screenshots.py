from PIL import Image
import os

SCREENSHOTS_DIR = "/Users/kundan/Downloads/ORBITGUARD/docs/screenshots"
ASSETS_DIR = "/Users/kundan/Downloads/ORBITGUARD/docs/assets"

def process_screenshots():
    # 1. 3D Space View Card
    img_3d = Image.open(f"{SCREENSHOTS_DIR}/01_space_view_3d.png")
    w, h = img_3d.size
    crop_3d = img_3d.crop((20, 65, w - 20, h - 35))
    crop_3d.save(f"{ASSETS_DIR}/shot_space_view_card.png", "PNG")

    # 2. Conjunction Matrix Card
    img_table = Image.open(f"{SCREENSHOTS_DIR}/02_conjunctions_table.png")
    # Crop around the matrix table area
    crop_table = img_table.crop((20, 160, w - 20, 560))
    crop_table.save(f"{ASSETS_DIR}/shot_conjunction_matrix_card.png", "PNG")

    # 3. 2D Ground Track Card
    img_map = Image.open(f"{SCREENSHOTS_DIR}/04_map2d_view.png")
    crop_map = img_map.crop((20, 65, w - 20, h - 35))
    crop_map.save(f"{ASSETS_DIR}/shot_map2d_card.png", "PNG")

    print("Processed high-res cards")

if __name__ == "__main__":
    process_screenshots()
