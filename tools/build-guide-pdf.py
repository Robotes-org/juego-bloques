#!/usr/bin/env python3
"""Builds GUIA-PROFESOR.pdf from GUIA-PROFESOR.md in the robotes.org document style.

    python3 tools/build-guide-pdf.py

Follows ~/marca/manual/07-aplicaciones.md section 7.4: 25 mm margins, a cover with the
vertical logo, "robotes.org" and the title as a running header from page 2, page number
in the footer, and the brand fonts embedded in the PDF.

Needs python-markdown, Google Chrome, and a connection: Space Grotesk and Inter are
pulled from Google Fonts at print time so Chrome can embed them. The game itself never
loads them; this is only for the printed guide.
"""

import os
import re
import subprocess
import sys
import tempfile

import markdown

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "GUIA-PROFESOR.md")
OUT = os.path.join(ROOT, "GUIA-PROFESOR.pdf")
TOKENS = os.path.join(ROOT, "assets", "tokens.css")
LOGO = os.path.join(ROOT, "assets", "logo", "logo-vertical.svg")

DOC_TITLE = "Ruta Robot · Guía para el profesor"
MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
          "septiembre", "octubre", "noviembre", "diciembre"]

CSS = """
@page {
  size: A4;
  margin: 25mm 25mm 22mm;
  @top-left { content: "robotes.org"; font: 400 8.5pt "Inter", sans-serif; color: var(--rb-grafito); }
  @top-right { content: "%(title)s"; font: 400 8.5pt "Inter", sans-serif; color: var(--rb-grafito); }
  @bottom-right { content: counter(page); font: 400 8.5pt "Inter", sans-serif; color: var(--rb-grafito); }
}
@page :first {
  @top-left { content: none; } @top-right { content: none; } @bottom-right { content: none; }
}

html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body {
  margin: 0; background: var(--rb-blanco); color: var(--rb-pizarra);
  font-family: var(--rb-font-texto); font-size: 10pt; line-height: 1.55;
}

/* Cover: vertical logo, the title in Space Grotesk --rb-text-3xl, month and year. */
.cover {
  height: 247mm; display: flex; flex-direction: column; justify-content: space-between;
  break-after: page;
}
.cover .logo { width: 44mm; }
.cover .logo svg { display: block; width: 100%%; height: auto; }
.cover .eyebrow {
  font-family: var(--rb-font-titulo); font-weight: 600; font-size: 9pt;
  letter-spacing: 0.05em; text-transform: uppercase; color: var(--rb-grafito); margin: 0 0 4mm;
}
.cover h1 {
  font-family: var(--rb-font-titulo); font-weight: 600; font-size: 39px;
  line-height: 1.15; letter-spacing: -0.015em; margin: 0 0 4mm;
}
.cover .lede { font-size: 13pt; color: var(--rb-grafito); max-width: 32em; margin: 0; }
.cover .rule { width: 28mm; height: 4px; border-radius: 2px; background: var(--rb-amarillo-chispa); margin: 8mm 0; }
.cover .date { font-size: 10pt; color: var(--rb-grafito); margin: 0; }

h2, h3 { font-family: var(--rb-font-titulo); font-weight: 600; line-height: 1.15; break-after: avoid; }
h2 {
  font-size: 18pt; letter-spacing: -0.015em; margin: 9mm 0 3mm;
  padding-top: 3mm; border-top: 1px solid var(--rb-niebla);
}
h2:first-of-type { border-top: 0; padding-top: 0; margin-top: 0; }
h3 { font-size: 12.5pt; margin: 6mm 0 2mm; }
h2 + p, h3 + p { break-before: avoid; }
p, li { max-width: var(--rb-medida); }
p { margin: 0 0 2.5mm; }
ul { padding-left: 5mm; margin: 0 0 3mm; }
li { margin-bottom: 1.5mm; }
strong { font-weight: 600; }
em { font-style: italic; }
a { color: var(--rb-azul-taller); text-decoration: underline; text-underline-offset: 0.15em; }
hr { display: none; }

table { border-collapse: collapse; width: 100%%; margin: 2mm 0 4mm; font-size: 9.5pt; break-inside: avoid; }
th, td { text-align: left; vertical-align: top; padding: 1.8mm 2.5mm; border-bottom: 1px solid var(--rb-niebla); }
th { font-family: var(--rb-font-titulo); font-weight: 600; background: var(--rb-papel); }

/* One level, or one curriculum block, never splits across pages. */
section.block { break-inside: avoid; }
li, p { orphans: 3; widows: 3; }
"""


def month_year():
    import datetime
    d = datetime.date.today()
    return "%s de %d" % (MONTHS[d.month - 1], d.year)


def build_html():
    with open(SRC, encoding="utf-8") as f:
        md = f.read()

    # The cover carries the title, so the H1 and its intro paragraph move there.
    m = re.match(r"# (.+?)\n\n(.+?)\n\n", md, re.S)
    if not m:
        sys.exit("GUIA-PROFESOR.md no empieza con '# Título' y un párrafo.")
    intro = " ".join(m.group(2).split())
    md = md[m.end():]

    body = markdown.markdown(md, extensions=["tables", "sane_lists"])
    # Wrap every H3 with what follows it, up to the next heading, so it stays together.
    parts = re.split(r"(?=<h[23][ >])", body)
    body = "".join('<section class="block">%s</section>' % p if p.startswith("<h3") else p
                   for p in parts)

    with open(TOKENS, encoding="utf-8") as f:
        tokens = f.read()
    with open(LOGO, encoding="utf-8") as f:
        logo = f.read()

    return """<!DOCTYPE html>
<html lang="es-CL"><head><meta charset="utf-8"><title>%(title)s</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,600;0,700;1,400&family=Space+Grotesk:wght@600;700&display=block">
<style>%(tokens)s</style><style>%(css)s</style></head><body>
<div class="cover">
  <div class="logo">%(logo)s</div>
  <div>
    <p class="eyebrow">Guía para el profesor · 3º y 4º básico</p>
    <h1>Ruta Robot</h1>
    <p class="lede">%(intro)s</p>
    <div class="rule"></div>
    <p class="date">%(date)s</p>
  </div>
</div>
%(body)s
</body></html>""" % {
        "title": DOC_TITLE, "tokens": tokens, "css": CSS % {"title": DOC_TITLE},
        "logo": logo, "intro": intro, "date": month_year().capitalize(), "body": body,
    }


def main():
    with tempfile.TemporaryDirectory() as tmp:
        page = os.path.join(tmp, "guia.html")
        with open(page, "w", encoding="utf-8") as f:
            f.write(build_html())
        subprocess.run([
            "google-chrome", "--headless=new", "--no-sandbox", "--disable-gpu",
            "--no-pdf-header-footer", "--virtual-time-budget=15000",
            "--print-to-pdf=" + OUT, "file://" + page,
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("✓ " + os.path.relpath(OUT, ROOT))


if __name__ == "__main__":
    main()
