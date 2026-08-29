import math
from PIL import Image, ImageDraw, ImageFont
import os

OUTPUT_DIR = "/Users/kundan/Downloads/ORBITGUARD/docs/assets"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def create_sih_logo(width=800, height=280):
    img = Image.new("RGBA", (width, height), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)

    # Draw Brain/Bulb Emblem on Left (radius ~ 70)
    cx, cy = 100, 140
    r = 65

    # Radiating ticks
    for angle_deg in [-140, -100, -60, -20, 20, 60, 100, 140]:
        rad = math.radians(angle_deg)
        x1 = cx + (r + 14) * math.cos(rad)
        y1 = cy + (r + 14) * math.sin(rad)
        x2 = cx + (r + 28) * math.cos(rad)
        y2 = cy + (r + 28) * math.sin(rad)
        draw.line([(x1, y1), (x2, y2)], fill=(100, 116, 139, 255), width=4)

    # Left half: Orange Brain (#F97316)
    draw.pieslice([cx - r, cy - r, cx + r, cy + r], 90, 270, fill=(249, 115, 22, 255))
    # Right half: Green Binary (#10B981)
    draw.pieslice([cx - r, cy - r, cx + r, cy + r], 270, 90, fill=(16, 185, 129, 255))

    # Center dividing line
    draw.line([(cx, cy - r), (cx, cy + r)], fill=(255, 255, 255, 255), width=3)

    # Circuit traces on orange side (white lines/nodes)
    draw.line([(cx - 15, cy - 35), (cx - 40, cy - 35)], fill=(255, 255, 255, 255), width=3)
    draw.ellipse([cx - 44, cy - 39, cx - 36, cy - 31], fill=(255, 255, 255, 255))
    draw.line([(cx - 15, cy), (cx - 45, cy)], fill=(255, 255, 255, 255), width=3)
    draw.ellipse([cx - 49, cy - 4, cx - 41, cy + 4], fill=(255, 255, 255, 255))
    draw.line([(cx - 15, cy + 35), (cx - 35, cy + 35)], fill=(255, 255, 255, 255), width=3)
    draw.ellipse([cx - 39, cy + 31, cx - 31, cy + 39], fill=(255, 255, 255, 255))

    # Binary text on green side
    binary_font_size = 13
    try:
        font_bin = ImageFont.truetype("/System/Library/Fonts/Monaco.ttf", binary_font_size)
    except:
        font_bin = ImageFont.load_default()

    draw.text((cx + 10, cy - 48), "1010", fill=(255, 255, 255, 255), font=font_bin)
    draw.text((cx + 10, cy - 26), "0101", fill=(255, 255, 255, 255), font=font_bin)
    draw.text((cx + 10, cy - 4), "1010", fill=(255, 255, 255, 255), font=font_bin)
    draw.text((cx + 10, cy + 18), "0101", fill=(255, 255, 255, 255), font=font_bin)
    draw.text((cx + 10, cy + 40), "010", fill=(255, 255, 255, 255), font=font_bin)

    # Bulb base at bottom
    base_top = cy + r + 2
    draw.rectangle([cx - 24, base_top, cx + 24, base_top + 16], fill=(71, 85, 105, 255))
    draw.rectangle([cx - 18, base_top + 18, cx + 18, base_top + 28], fill=(71, 85, 105, 255))
    draw.rectangle([cx - 10, base_top + 30, cx + 10, base_top + 36], fill=(51, 65, 85, 255))

    try:
        font_sih_base = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 13)
    except:
        font_sih_base = ImageFont.load_default()
    draw.text((cx - 14, base_top + 1), "SIH", fill=(255, 255, 255, 255), font=font_sih_base)

    # Text next to logo: SMART INDIA HACKATHON 2026
    try:
        font_title = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 36)
        font_sub = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 30)
    except:
        font_title = ImageFont.load_default()
        font_sub = ImageFont.load_default()

    draw.text((210, 80), "SMART INDIA", fill=(26, 54, 93, 255), font=font_title)
    draw.text((210, 125), "HACKATHON", fill=(26, 54, 93, 255), font=font_title)
    draw.text((210, 170), "2026", fill=(26, 54, 93, 255), font=font_sub)

    img.save(f"{OUTPUT_DIR}/sih_logo_header.png", "PNG")
    print("Saved SIH header logo")

if __name__ == "__main__":
    create_sih_logo()
