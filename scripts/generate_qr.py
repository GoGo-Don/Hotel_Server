"""
Generate QR code PNGs for hotel room service URLs.

Usage:
    pip install qrcode[pil] pillow
    python generate_qr.py --base-url https://yourhotel.com --rooms 101-250
    python generate_qr.py --base-url https://yourhotel.com --rooms 101,102,201,202
    python generate_qr.py --base-url http://localhost:3000 --rooms 101-110

Output:
    ./qr_output/qr_room_101.png  (one file per room)
"""

import argparse
import os
import sys

try:
    import qrcode
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Install dependencies first:  pip install qrcode[pil] pillow")
    sys.exit(1)


def parse_rooms(rooms_arg: str) -> list[str]:
    """Accept '101-110' (range) or '101,102,201' (list)."""
    if "-" in rooms_arg and "," not in rooms_arg:
        parts = rooms_arg.split("-")
        if len(parts) == 2 and parts[0].isdigit() and parts[1].isdigit():
            return [str(r) for r in range(int(parts[0]), int(parts[1]) + 1)]
    return [r.strip() for r in rooms_arg.split(",")]


def make_qr_with_label(url: str, room: str, size: int = 400) -> Image.Image:
    """
    Generate a QR code image with the room number as a caption below.
    """
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB")

    # Resize QR to target size
    qr_img = qr_img.resize((size, size), Image.LANCZOS)

    # Add label below
    label_height = 50
    final = Image.new("RGB", (size, size + label_height), "white")
    final.paste(qr_img, (0, 0))

    draw = ImageDraw.Draw(final)
    label = f"Room {room}"

    # Try to use a nice font; fall back to default
    font = None
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
    except Exception:
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 22)
        except Exception:
            font = ImageFont.load_default()

    # Centre the text
    bbox = draw.textbbox((0, 0), label, font=font)
    text_w = bbox[2] - bbox[0]
    x = (size - text_w) // 2
    y = size + (label_height - (bbox[3] - bbox[1])) // 2
    draw.text((x, y), label, fill="black", font=font)

    return final


def main():
    parser = argparse.ArgumentParser(description="Generate hotel room QR codes")
    parser.add_argument(
        "--base-url",
        required=True,
        help="Base URL of your hotel app, e.g. https://hotel.example.com",
    )
    parser.add_argument(
        "--rooms",
        required=True,
        help="Room numbers: range '101-250' or list '101,102,201'",
    )
    parser.add_argument(
        "--output-dir",
        default="qr_output",
        help="Directory to save QR PNGs (default: ./qr_output)",
    )
    parser.add_argument(
        "--size",
        type=int,
        default=400,
        help="QR image size in pixels (default: 400)",
    )
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")
    rooms = parse_rooms(args.rooms)
    os.makedirs(args.output_dir, exist_ok=True)

    print(f"Generating {len(rooms)} QR codes → {args.output_dir}/")
    for room in rooms:
        url = f"{base_url}/room/{room}"
        img = make_qr_with_label(url, room, size=args.size)
        filename = os.path.join(args.output_dir, f"qr_room_{room}.png")
        img.save(filename)
        print(f"  ✓ {filename}  →  {url}")

    print(f"\nDone. {len(rooms)} files saved to ./{args.output_dir}/")


if __name__ == "__main__":
    main()
