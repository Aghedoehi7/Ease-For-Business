from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageFont

base = Path(__file__).resolve().parent.parent
public_dir = base / 'public'
icons_dir = public_dir / 'icons'
screens_dir = public_dir / 'screenshots'
icons_dir.mkdir(exist_ok=True)
screens_dir.mkdir(exist_ok=True)

logo = Image.open(public_dir / 'logo.png').convert('RGBA')

for size in (192, 512):
    canvas = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    resized = ImageOps.fit(logo, (int(size * 0.92), int(size * 0.92)), method=Image.Resampling.LANCZOS)
    x = (size - resized.width) // 2
    y = (size - resized.height) // 2
    canvas.paste(resized, (x, y), resized)
    canvas.save(icons_dir / f'icon-{size}.png')

bg = (255, 247, 237, 255)
orange = (255, 106, 0, 255)
font_path = r'C:\Windows\Fonts\arialbd.ttf'

wide = Image.new('RGBA', (1280, 720), bg)
logo_scaled = ImageOps.contain(logo, (420, 420))
wide.paste(logo_scaled, ((1280 - logo_scaled.width) // 2, 40), logo_scaled)
font = ImageFont.truetype(font_path, 110)
text = 'Ease For Business'
text_img = Image.new('RGBA', wide.size, (0, 0, 0, 0))
draw = ImageDraw.Draw(text_img)
bbox = draw.textbbox((0, 0), text, font=font)
text_x = (1280 - (bbox[2] - bbox[0])) // 2
text_y = 470
draw.text((text_x, text_y), text, font=font, fill=orange)
wide = Image.alpha_composite(wide, text_img)
wide.save(screens_dir / 'wide.png')

mobile = Image.new('RGBA', (390, 844), bg)
logo_scaled = ImageOps.contain(logo, (260, 260))
mobile.paste(logo_scaled, ((390 - logo_scaled.width) // 2, 90), logo_scaled)
font_m = ImageFont.truetype(font_path, 56)
text_m = 'Ease For Business'
text_img_m = Image.new('RGBA', mobile.size, (0, 0, 0, 0))
draw_m = ImageDraw.Draw(text_img_m)
bbox_m = draw_m.textbbox((0, 0), text_m, font=font_m)
text_x_m = (390 - (bbox_m[2] - bbox_m[0])) // 2
text_y_m = 430
draw_m.text((text_x_m, text_y_m), text_m, font=font_m, fill=orange)
mobile = Image.alpha_composite(mobile, text_img_m)
mobile.save(screens_dir / 'mobile.png')

print('Generated icons and screenshots successfully')
