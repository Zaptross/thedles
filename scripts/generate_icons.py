#!/usr/bin/env python3
"""
Icon Generator for The 'Dles PWA

A data-driven icon generator that creates PWA icons and favicons
with a checker background pattern and customizable text.

Usage:
    python scripts/generate_icons.py

Configuration:
    Edit the CONFIG dict below to customize colors, text, sizes, and output.
"""

from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

# =============================================================================
# CONFIGURATION
# =============================================================================

CONFIG = {
    # Colors (hex format)
    "colors": {
        "orange": "#FF9800",
        "blue": "#2196F3",
        "black": "#000000",
        "white": "#FFFFFF",
    },
    
    # 2x2 checker pattern - positions are: top_left, top_right, bottom_right, bottom_left
    "checker_pattern": ["orange", "black", "blue", "black"],
    
    # Text configuration
    "text": {
        "content": "TD'S",           # Full text to render
        "large_char": "D",            # Character(s) to render at full size
        "large_char_index": 1,        # Index in content where large char starts
        "font_path": "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "text_color": "white",
        "stroke_color": "black",
    },
    
    # Icon variants to generate
    "icons": [
        {
            "name": "icon-512.png",
            "size": 512,
            "type": "full",           # full = checker + TD'S text
            "large_font_ratio": 0.55,
            "small_font_ratio": 0.20, # Reduced from 0.28
            "stroke_ratio": 1/64,
            "superscript_offset_ratio": 0.75,  # Offset from D top as fraction of small text height
        },
        {
            "name": "icon-192.png",
            "size": 192,
            "type": "full",
            "large_font_ratio": 0.55,
            "small_font_ratio": 0.20, # Reduced from 0.28
            "stroke_ratio": 1/64,
            "superscript_offset_ratio": 0.75,
        },
        {
            "name": "favicon-32.png",
            "size": 32,
            "type": "single_char",    # single_char = checker + one character
            "char": "D",
            "font_ratio": 0.65,
            "stroke_ratio": 1/32,
        },
        {
            "name": "favicon-16.png",
            "size": 16,
            "type": "checker_only",   # checker_only = just the pattern
        },
    ],
    
    # Output directory (relative to project root)
    "output_dir": "src/icons",
}

# =============================================================================
# ICON GENERATION FUNCTIONS
# =============================================================================

def get_color(name: str) -> str:
    """Resolve a color name to its hex value."""
    return CONFIG["colors"].get(name, name)


def draw_checker(draw: ImageDraw.Draw, size: int) -> None:
    """Draw the 2x2 checker pattern."""
    pattern = CONFIG["checker_pattern"]
    half = size // 2
    
    positions = [
        ([0, 0, half, half], pattern[0]),         # top-left
        ([half, 0, size, half], pattern[1]),      # top-right
        ([half, half, size, size], pattern[2]),   # bottom-right
        ([0, half, half, size], pattern[3]),      # bottom-left
    ]
    
    for rect, color_name in positions:
        draw.rectangle(rect, fill=get_color(color_name))


def load_font(size: int) -> ImageFont.FreeTypeFont:
    """Load the configured font at the specified size."""
    font_path = CONFIG["text"]["font_path"]
    try:
        return ImageFont.truetype(font_path, size)
    except OSError:
        print(f"Warning: Could not load font {font_path}, using default")
        return ImageFont.load_default()


def create_full_icon(size: int, icon_config: dict) -> Image.Image:
    """
    Create icon with checker background and TD'S text.
    Large character is centered, small characters are superscript-aligned.
    """
    img = Image.new('RGB', (size, size), get_color("black"))
    draw = ImageDraw.Draw(img)
    draw_checker(draw, size)
    
    text_cfg = CONFIG["text"]
    content = text_cfg["content"]
    large_char = text_cfg["large_char"]
    large_idx = text_cfg["large_char_index"]
    
    # Split text into parts
    before = content[:large_idx]
    after = content[large_idx + len(large_char):]
    
    # Font sizes
    large_font_size = int(size * icon_config["large_font_ratio"])
    small_font_size = int(size * icon_config["small_font_ratio"])
    stroke_width = max(1, int(size * icon_config["stroke_ratio"]))
    
    large_font = load_font(large_font_size)
    small_font = load_font(small_font_size)
    
    text_color = get_color(text_cfg["text_color"])
    stroke_color = get_color(text_cfg["stroke_color"])
    
    # Calculate dimensions
    large_bbox = draw.textbbox((0, 0), large_char, font=large_font)
    large_width = large_bbox[2] - large_bbox[0]
    large_height = large_bbox[3] - large_bbox[1]
    
    before_bbox = draw.textbbox((0, 0), before, font=small_font) if before else (0, 0, 0, 0)
    before_width = before_bbox[2] - before_bbox[0]
    before_height = before_bbox[3] - before_bbox[1]
    
    after_bbox = draw.textbbox((0, 0), after, font=small_font) if after else (0, 0, 0, 0)
    after_width = after_bbox[2] - after_bbox[0]
    
    # Center horizontally
    total_width = before_width + large_width + after_width
    start_x = (size - total_width) // 2
    
    # Vertical positioning - center large char, offset small chars from top
    large_y = (size - large_height) // 2 - large_bbox[1]
    offset_ratio = icon_config.get("superscript_offset_ratio", 0.25)
    small_y = large_y - before_bbox[1] + int(before_height * offset_ratio)
    
    # Draw text parts
    x = start_x
    
    if before:
        draw.text((x, small_y), before, font=small_font, fill=text_color,
                  stroke_width=stroke_width, stroke_fill=stroke_color)
        x += before_width
    
    draw.text((x, large_y), large_char, font=large_font, fill=text_color,
              stroke_width=stroke_width, stroke_fill=stroke_color)
    x += large_width
    
    if after:
        draw.text((x, small_y), after, font=small_font, fill=text_color,
                  stroke_width=stroke_width, stroke_fill=stroke_color)
    
    return img


def create_single_char_icon(size: int, icon_config: dict) -> Image.Image:
    """Create icon with checker background and a single character."""
    img = Image.new('RGB', (size, size), get_color("black"))
    draw = ImageDraw.Draw(img)
    draw_checker(draw, size)
    
    text_cfg = CONFIG["text"]
    char = icon_config["char"]
    font_size = int(size * icon_config["font_ratio"])
    stroke_width = max(1, int(size * icon_config["stroke_ratio"]))
    
    font = load_font(font_size)
    text_color = get_color(text_cfg["text_color"])
    stroke_color = get_color(text_cfg["stroke_color"])
    
    bbox = draw.textbbox((0, 0), char, font=font)
    char_width = bbox[2] - bbox[0]
    char_height = bbox[3] - bbox[1]
    
    x = (size - char_width) // 2
    y = (size - char_height) // 2 - bbox[1]
    
    draw.text((x, y), char, font=font, fill=text_color,
              stroke_width=stroke_width, stroke_fill=stroke_color)
    
    return img


def create_checker_only_icon(size: int, icon_config: dict) -> Image.Image:
    """Create icon with just the checker pattern."""
    img = Image.new('RGB', (size, size), get_color("black"))
    draw = ImageDraw.Draw(img)
    draw_checker(draw, size)
    return img


# =============================================================================
# MAIN
# =============================================================================

def generate_all_icons():
    """Generate all configured icons."""
    output_dir = Path(CONFIG["output_dir"])
    output_dir.mkdir(parents=True, exist_ok=True)
    
    generators = {
        "full": create_full_icon,
        "single_char": create_single_char_icon,
        "checker_only": create_checker_only_icon,
    }
    
    print(f"Generating icons to {output_dir}/")
    print("-" * 40)
    
    for icon_cfg in CONFIG["icons"]:
        name = icon_cfg["name"]
        size = icon_cfg["size"]
        icon_type = icon_cfg["type"]
        
        generator = generators.get(icon_type)
        if not generator:
            print(f"  ✗ {name}: Unknown type '{icon_type}'")
            continue
        
        img = generator(size, icon_cfg)
        path = output_dir / name
        img.save(path, "PNG")
        print(f"  ✓ {name} ({size}x{size}, {icon_type})")
    
    print("-" * 40)
    print("Done!")


if __name__ == "__main__":
    generate_all_icons()
