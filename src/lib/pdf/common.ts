import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, type PDFFont, type PDFPage, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";

export const A4 = { width: 595.28, height: 841.89 };
export const MARGIN = 42;

export const C = {
  ink: rgb(0.07, 0.14, 0.11),
  muted: rgb(0.31, 0.37, 0.34),
  line: rgb(0.86, 0.89, 0.87),
  vert: rgb(0.055, 0.42, 0.31),
  vertSoft: rgb(0.9, 0.95, 0.93),
  mena: rgb(0.76, 0.29, 0.17),
  soleil: rgb(0.95, 0.7, 0.24),
  soleilSoft: rgb(0.996, 0.957, 0.863),
  white: rgb(1, 1, 1),
  black: rgb(0, 0, 0),
};

/**
 * Les polices standard du PDF ne couvrent que le jeu WinAnsi : on remplace les
 * rares caractères absents (apostrophes typographiques, espaces fines…).
 */
export function safe(text: string | null | undefined): string {
  return (text ?? "")
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[   ]/g, " ")
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E -ÿ€]/g, "");
}

export type Fonts = { regular: PDFFont; bold: PDFFont; mono: PDFFont; monoBold: PDFFont };

export async function newDocument(title: string) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(title);
  pdf.setAuthor("Mianara — Office du Bac");
  pdf.setCreator("Mianara");
  const fonts: Fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    mono: await pdf.embedFont(StandardFonts.Courier),
    monoBold: await pdf.embedFont(StandardFonts.CourierBold),
  };
  const logo = await pdf.embedPng(
    await readFile(path.join(process.cwd(), "public/brand/mianara-logo-horizontal-400px.png")),
  );
  return { pdf, fonts, logo };
}

/** QR noir sur blanc, marge de 4 modules, jamais stylisé (charte v2). */
export async function qrPng(pdf: PDFDocument, value: string) {
  const png = await QRCode.toBuffer(value, {
    type: "png",
    margin: 4,
    width: 480,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#FFFFFF" },
  });
  return pdf.embedPng(png);
}

/** Bandeau lamba en pied de document (charte v2 : 8 à 24 px). */
export function lambaBand(page: PDFPage, y = 0, height = 12) {
  const stripes: [number, keyof typeof C][] = [
    [24, "vert"],
    [4, "white"],
    [6, "vert"],
    [4, "white"],
    [6, "soleil"],
    [4, "white"],
    [6, "vert"],
    [4, "white"],
    [12, "mena"],
    [4, "white"],
    [6, "vert"],
    [4, "white"],
    [24, "vert"],
    [4, "white"],
    [4, "ink"],
    [4, "white"],
  ];
  let x = 0;
  while (x < page.getWidth()) {
    for (const [w, color] of stripes) {
      page.drawRectangle({ x, y, width: w, height, color: C[color] });
      x += w;
      if (x >= page.getWidth()) break;
    }
  }
}

export function text(
  page: PDFPage,
  value: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color = C.ink,
) {
  page.drawText(safe(value), { x, y, font, size, color });
}

/** Texte coupé sur plusieurs lignes ; renvoie la position y sous le dernier trait. */
export function wrap(
  page: PDFPage,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  font: PDFFont,
  size: number,
  color = C.ink,
  leading = 1.35,
) {
  const words = safe(value).split(/\s+/);
  let line = "";
  for (const word of words) {
    const tryLine = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(tryLine, size) > maxWidth && line) {
      page.drawText(line, { x, y, font, size, color });
      y -= size * leading;
      line = word;
    } else line = tryLine;
  }
  if (line) {
    page.drawText(line, { x, y, font, size, color });
    y -= size * leading;
  }
  return y;
}

export function siteUrl() {
  return (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}
