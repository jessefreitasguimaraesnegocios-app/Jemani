"""Gera ícones web + Android a partir da arte Jemani (Liquid Glass)."""
from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

RAIZ = Path(__file__).resolve().parents[1]
FONTE = Path(
    r"C:\Users\jesse\.cursor\projects\c-Users-jesse-Desktop-Gian-jesse-main\assets"
    r"\c__Users_jesse_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_"
    r"Gemini_Generated_Image_8yepxj8yepxj8yep-0b615a05-7852-4ef5-8720-a846cf2e19a5.png"
)
FUNDO = (10, 10, 12, 255)


def eh_fundo(rgb: tuple[int, int, int]) -> bool:
    r, g, b = rgb[:3]
    if abs(r - g) > 22 or abs(g - b) > 22:
        return False
    medio = (r + g + b) / 3
    # checkerboard cinza claro / branco
    return medio >= 145


def remover_fundo_flood(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    w, h = rgba.size
    px = rgba.load()
    visitado = [[False] * w for _ in range(h)]
    fila: deque[tuple[int, int]] = deque()

    for x, y in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (w // 2, h - 1)]:
        if eh_fundo(px[x, y]):
            fila.append((x, y))
            visitado[y][x] = True

    while fila:
        x, y = fila.popleft()
        r, g, b, _a = px[x, y]
        if eh_fundo((r, g, b)):
            px[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and not visitado[ny][nx]:
                visitado[ny][nx] = True
                nr, ng, nb, _ = px[nx, ny]
                if eh_fundo((nr, ng, nb)):
                    fila.append((nx, ny))

    # limpa residual de checkerboard isolado
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a and eh_fundo((r, g, b)):
                px[x, y] = (0, 0, 0, 0)
    return rgba


def bbox_conteudo(img: Image.Image, limiar_alpha: int = 8) -> tuple[int, int, int, int]:
    alpha = img.split()[-1]
    bbox = alpha.point(lambda p: 255 if p > limiar_alpha else 0).getbbox()
    if not bbox:
        return (0, 0, img.width, img.height)
    return bbox


def quadrado_com_conteudo(img: Image.Image, margem: float = 0.02) -> Image.Image:
    left, top, right, bottom = bbox_conteudo(img)
    cw, ch = right - left, bottom - top
    lado = max(cw, ch)
    pad = int(lado * margem)
    lado += pad * 2
    canvas = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
    recorte = img.crop((left, top, right, bottom))
    ox = (lado - cw) // 2
    oy = (lado - ch) // 2
    canvas.paste(recorte, (ox, oy), recorte)
    return canvas


def com_fundo(img: Image.Image, cor=FUNDO) -> Image.Image:
    base = Image.new("RGBA", img.size, cor)
    return Image.alpha_composite(base, img.convert("RGBA")).convert("RGBA")


def mascarar_squircle(img: Image.Image, raio_rel: float = 0.22) -> Image.Image:
    w, h = img.size
    r = int(min(w, h) * raio_rel)
    mascara = Image.new("L", (w, h), 0)
    desenho = ImageDraw.Draw(mascara)
    desenho.rounded_rectangle((0, 0, w - 1, h - 1), radius=r, fill=255)
    out = img.convert("RGBA")
    out.putalpha(mascara)
    return out


def redimensionar(img: Image.Image, size: int) -> Image.Image:
    return img.resize((size, size), Image.Resampling.LANCZOS)


def salvar_png(img: Image.Image, destino: Path) -> None:
    destino.parent.mkdir(parents=True, exist_ok=True)
    img.save(destino, format="PNG", optimize=True)


def foreground_adaptativo(img: Image.Image, size: int) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    safe = int(size * 0.72)
    icon = redimensionar(img, safe)
    ox = (size - safe) // 2
    oy = (size - safe) // 2
    canvas.paste(icon, (ox, oy), icon)
    return canvas


def main() -> None:
    if not FONTE.exists():
        raise SystemExit(f"Fonte não encontrada: {FONTE}")

    bruto = Image.open(FONTE)
    print(f"Fonte: {bruto.size} {bruto.mode}")
    limpo = remover_fundo_flood(bruto)
    icon = quadrado_com_conteudo(limpo)
    icon = icon.filter(ImageFilter.SMOOTH)

    master = com_fundo(icon)
    master_squircle = com_fundo(mascarar_squircle(icon))

    salvar_png(master, RAIZ / "public" / "icons" / "jemani-app-icon.png")
    salvar_png(redimensionar(master_squircle, 512), RAIZ / "public" / "icons" / "icon-512.png")
    salvar_png(redimensionar(master_squircle, 192), RAIZ / "public" / "icons" / "icon-192.png")
    salvar_png(redimensionar(master_squircle, 180), RAIZ / "public" / "icons" / "apple-touch-icon.png")
    salvar_png(redimensionar(master_squircle, 64), RAIZ / "public" / "favicon.png")

    densidades = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }
    foreground = {
        "mipmap-mdpi": 108,
        "mipmap-hdpi": 162,
        "mipmap-xhdpi": 216,
        "mipmap-xxhdpi": 324,
        "mipmap-xxxhdpi": 432,
    }

    res = RAIZ / "android" / "app" / "src" / "main" / "res"
    for pasta, size in densidades.items():
        base = redimensionar(master_squircle, size)
        salvar_png(base, res / pasta / "ic_launcher.png")
        salvar_png(base, res / pasta / "ic_launcher_round.png")

    for pasta, size in foreground.items():
        fg = foreground_adaptativo(icon, size)
        salvar_png(fg, res / pasta / "ic_launcher_foreground.png")

    print("Ícones gerados com sucesso.")


if __name__ == "__main__":
    main()
