"""Build PWA icons: RummerLab logo with HUSBANDRY badge stacked underneath."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1] / 'static'
LOGO = Image.open(ROOT / 'rummerlab_logo_transparent.png').convert('RGBA')
BG = (245, 247, 250, 255)  # matches manifest background_color
BADGE = (29, 95, 184, 255)  # --accent
BADGE_TEXT = (255, 255, 255, 255)


def load_font(px: int) -> ImageFont.ImageFont:
	for name in (
		'C:/Windows/Fonts/segoeuib.ttf',
		'C:/Windows/Fonts/arialbd.ttf',
		'C:/Windows/Fonts/arial.ttf',
	):
		try:
			return ImageFont.truetype(name, px)
		except OSError:
			pass
	return ImageFont.load_default()


def fit_logo(max_w: int, max_h: int) -> Image.Image:
	lw, lh = LOGO.size
	scale = min(max_w / lw, max_h / lh)
	return LOGO.resize((max(1, int(lw * scale)), max(1, int(lh * scale))), Image.Resampling.LANCZOS)


def make_icon(size: int, *, rgb_only: bool = False) -> Image.Image:
	canvas = Image.new('RGBA', (size, size), BG)
	pad = max(8, int(size * 0.08))
	badge_h = max(22, int(size * 0.145))
	gap = max(6, int(size * 0.045))
	logo_max_w = size - pad * 2
	logo_max_h = size - pad * 2 - badge_h - gap
	logo = fit_logo(logo_max_w, logo_max_h)
	lx = (size - logo.width) // 2
	ly = pad + max(0, (logo_max_h - logo.height) // 2)
	canvas.alpha_composite(logo, (lx, ly))

	badge_w = min(int(size * 0.78), max(logo.width, int(size * 0.55)))
	bx0 = (size - badge_w) // 2
	by0 = ly + logo.height + gap
	bx1, by1 = bx0 + badge_w, by0 + badge_h
	draw = ImageDraw.Draw(canvas)
	radius = max(4, badge_h // 3)
	draw.rounded_rectangle((bx0, by0, bx1, by1), radius=radius, fill=BADGE)

	text = 'HUSBANDRY'
	font_size = max(10, int(badge_h * 0.55))
	font = load_font(font_size)
	bbox = draw.textbbox((0, 0), text, font=font)
	tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
	while font_size > 8 and (tw > badge_w - badge_h * 0.45 or th > badge_h * 0.72):
		font_size -= 1
		font = load_font(font_size)
		bbox = draw.textbbox((0, 0), text, font=font)
		tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
	tx = bx0 + (badge_w - tw) // 2 - bbox[0]
	ty = by0 + (badge_h - th) // 2 - bbox[1]
	draw.text((tx, ty), text, font=font, fill=BADGE_TEXT)

	return canvas.convert('RGB') if rgb_only else canvas


def main() -> None:
	for size, name, rgb in (
		(192, 'icon-192.png', False),
		(512, 'icon-512.png', False),
		(180, 'apple-touch-icon.png', True),
	):
		out = ROOT / name
		img = make_icon(size, rgb_only=rgb)
		img.save(out, 'PNG')
		print(f'wrote {out} {img.size} {img.mode}')


if __name__ == '__main__':
	main()
