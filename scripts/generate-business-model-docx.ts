/**
 * Genere le Business Model Canvas de Mianara au format Word (.docx).
 *
 *   npx tsx --conditions=react-server scripts/generate-business-model-docx.ts
 *
 * Un .docx est une archive ZIP de fichiers OOXML. Plutot que d'ajouter une
 * dependance (`docx`, `jszip`), on ecrit l'archive avec `zlib` : le format
 * ZIP tient en une Portsie de CRC32 et quelques en-tetes.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateRawSync } from "node:zlib";
import {
  ACTIVITIES,
  CHANNELS,
  COSTS,
  INK,
  LINE,
  MUTED,
  PARTNERS,
  RELATIONSHIP,
  RESOURCES,
  REVENUE,
  SEGMENTS,
  SUBTITLE,
  TITLE,
  VALUE,
  VERT,
  VERT_SOFT,
  type Block,
} from "./business-model-content";

/* --------------------------------------------------------------------- ZIP */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

type Entry = { name: string; data: Buffer };

/** Archive ZIP minimale (methode « deflate », sans repertoire). */
function zip(entries: Entry[]): Buffer {
  const locals: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;

  for (const e of entries) {
    const name = Buffer.from(e.name, "utf8");
    const comp = deflateRawSync(e.data, { level: 9 });
    const crc = crc32(e.data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(0, 10); // mod time
    local.writeUInt16LE(0x2821, 12); // mod date (2000-01-01, fixe : sortie reproductible)
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comp.length, 18);
    local.writeUInt32LE(e.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28); // extra
    locals.push(local, name, comp);

    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4); // version made by
    dir.writeUInt16LE(20, 6); // version needed
    dir.writeUInt16LE(0, 8);
    dir.writeUInt16LE(8, 10);
    dir.writeUInt16LE(0, 12);
    dir.writeUInt16LE(0x2821, 14);
    dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(comp.length, 20);
    dir.writeUInt32LE(e.data.length, 24);
    dir.writeUInt16LE(name.length, 28);
    dir.writeUInt16LE(0, 30); // extra
    dir.writeUInt16LE(0, 32); // comment
    dir.writeUInt16LE(0, 34); // disk
    dir.writeUInt16LE(0, 36); // internal attrs
    dir.writeUInt32LE(0, 38); // external attrs
    dir.writeUInt32LE(offset, 42);
    central.push(dir, name);

    offset += local.length + name.length + comp.length;
  }

  const localBuf = Buffer.concat(locals);
  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(localBuf.length, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([localBuf, centralBuf, end]);
}

/* ------------------------------------------------------------------- OOXML */

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Paragraphe : style, texte, options. */
function p(text: string, opts: { size?: number; bold?: boolean; color?: string; before?: number; after?: number; bullet?: boolean } = {}) {
  const { size = 14, bold = false, color = INK, before = 0, after = 40, bullet = false } = opts;
  const sz = Math.round(size * 2); // demi-points
  const ind = bullet ? '<w:ind w:left="113" w:hanging="113"/>' : "";
  const num = bullet ? '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>' : "";
  return (
    `<w:p><w:pPr><w:spacing w:before="${before}" w:after="${after}" w:line="216" w:lineRule="auto"/>${ind}${num}</w:pPr>` +
    `<w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>` +
    (bold ? "<w:b/>" : "") +
    `<w:color w:val="${color}"/></w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`
  );
}

/** Contenu d'une cellule du canevas : titre ombré, puces, note. */
function cell(block: Block, w: number, opts: { vMerge?: "restart" | "continue"; span?: number } = {}) {
  const { vMerge, span } = opts;
  const wAttr = `<w:tcW w:w="${Math.round(w * 20)}" w:type="dxa"/>`;
  const vm = vMerge ? `<w:vMerge w:val="${vMerge}"/>` : vMerge === undefined ? "" : "<w:vMerge/>";
  const gs = span ? `<w:gridSpan w:val="${span}"/>` : "";
  const shade = `<w:shd w:val="clear" w:color="auto" w:fill="${VERT_SOFT}"/>`;
  const body =
    p(block.title, { size: 8.5, bold: true, color: VERT, after: 50 }) +
    block.bullets.map((b) => p(b, { size: 7.5, after: 20, bullet: true })).join("") +
    (block.note ? p(block.note, { size: 6.5, color: MUTED, before: 40, after: 0 }) : "");
  // La bordure basse du titre ombré tient le lecteur : un filet vert 2,5 pt.
  const borders = `<w:tcBorders><w:bottom w:val="single" w:sz="18" w:color="${VERT}"/></w:tcBorders>`;
  return (
    `<w:tc><w:tcPr>${wAttr}${vm}${gs}${borders}${shade}</w:tcPr>${body}</w:tc>`
  );
}

const COLS = [98, 92, 118, 100, 103]; // largeurs en points, comme le PDF
const W = COLS.reduce((a, b) => a + b, 0) + 4 * 6; // + gouttieres

function table(): string {
  const grid = `<w:tblGrid>${COLS.map((c) => `<w:gridCol w:w="${Math.round(c * 20)}"/>`).join("")}</w:tblGrid>`;
  const borders =
    `<w:tblBorders>` +
    ["top", "left", "bottom", "right", "insideH", "insideV"]
      .map((s) => `<w:${s} w:val="single" w:sz="4" w:color="${LINE}"/>`)
      .join("") +
    `</w:tblBorders>`;
  const pr =
    `<w:tblPr><w:tblW w:w="${Math.round(W * 20)}" w:type="dxa"/><w:tblLayout w:type="fixed"/>${borders}` +
    `<w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="80" w:type="dxa"/>` +
    `<w:bottom w:w="60" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr>`;

  // Rangée 1 : les cinq blocs principaux. Activités, Valeur et Segments se
  // prolongent en rangée 2 ; Partenariats et Relations cèdent la place.
  const r1 =
    `<w:tr><w:trPr><w:cantSplit/></w:trPr>` +
    cell(PARTNERS, COLS[0], { vMerge: "restart" }) +
    cell(ACTIVITIES, COLS[1], { vMerge: "restart" }) +
    cell(VALUE, COLS[2], { vMerge: "restart" }) +
    cell(RELATIONSHIP, COLS[3], { vMerge: "restart" }) +
    cell(SEGMENTS, COLS[4], { vMerge: "restart" }) +
    `</w:tr>`;

  const empty = (w: number) => `<w:tc><w:tcPr><w:tcW w:w="${Math.round(w * 20)}" w:type="dxa"/></w:tcPr>${p("")}</w:tc>`;
  const r2 =
    `<w:tr><w:trPr><w:cantSplit/></w:trPr>` +
    cell(RESOURCES, COLS[0]) +
    empty(COLS[1]).replace("<w:tcPr>", '<w:tcPr><w:vMerge w:val="continue"/>') +
    empty(COLS[2]).replace("<w:tcPr>", '<w:tcPr><w:vMerge w:val="continue"/>') +
    cell(CHANNELS, COLS[3]) +
    empty(COLS[4]).replace("<w:tcPr>", '<w:tcPr><w:vMerge w:val="continue"/>') +
    `</w:tr>`;

  // Rangée du bas : coûts sur 3 colonnes, revenus sur 2.
  const r3 =
    `<w:tr><w:trPr><w:cantSplit/></w:trPr>` +
    cell(COSTS, COLS[0] + COLS[1] + COLS[2], { span: 3 }) +
    cell(REVENUE, COLS[3] + COLS[4], { span: 2 }) +
    `</w:tr>`;

  return `<w:tbl>${pr}${grid}${r1}${r2}${r3}</w:tbl>`;
}

function document(): string {
  const body =
    p(TITLE, { size: 20, bold: true, color: VERT, after: 20 }) +
    p(SUBTITLE, { size: 9, color: MUTED, after: 160 }) +
    table() +
    // Word exige un paragraphe apres un tableau, sinon il fusionne les tableaux
    // voisins et la mise en page saute.
    p("") +
    p("Mianara — modèle d’affaires — document de travail interne. Canevas d’Osterwalder, 9 blocs.", {
      size: 7,
      color: MUTED,
      before: 120,
      after: 0,
    });

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
    `<w:body>${body}` +
    // Mise en page A4 portrait, marges de 1,2 cm : la grille tient en largeur.
    `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>` +
    `<w:pgMar w:top="680" w:right="680" w:bottom="680" w:left="680" w:header="0" w:footer="0" w:gutter="0"/>` +
    `</w:sectPr></w:body></w:document>`
  );
}

const CONTENT_TYPES =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
  `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
  `<Default Extension="xml" ContentType="application/xml"/>` +
  `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
  `<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>` +
  `<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>` +
  `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>` +
  `<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>` +
  `</Types>`;

const ROOT_RELS =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
  `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>` +
  `<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>` +
  `</Relationships>`;

const DOC_RELS =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
  `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>` +
  `</Relationships>`;

const STYLES =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
  `<w:docDefaults><w:rPrDefault><w:rPr>` +
  `<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="15"/><w:szCs w:val="15"/>` +
  `<w:color w:val="${INK}"/><w:lang w:val="fr-FR"/>` +
  `</w:rPr></w:rPrDefault>` +
  `<w:pPrDefault><w:pPr><w:spacing w:after="40" w:line="216" w:lineRule="auto"/></w:pPr></w:pPrDefault>` +
  `</w:docDefaults>` +
  `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>` +
  `</w:styles>`;

/** Numerotation des puces : une seule liste, deux niveaux, puce ronde. */
const NUMBERING =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
  `<w:abstractNum w:abstractNumId="0">` +
  `<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/>` +
  `<w:lvlText w:val="·"/><w:lvlJc w:val="left"/>` +
  `<w:pPr><w:ind w:left="113" w:hanging="113"/></w:pPr>` +
  `<w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:hint="default"/><w:color w:val="${VERT}"/></w:rPr>` +
  `</w:lvl></w:abstractNum>` +
  `<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>` +
  `</w:numbering>`;

const CORE =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ` +
  `xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" ` +
  `xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">` +
  `<dc:title>${esc(TITLE)} — Mianara</dc:title>` +
  `<dc:creator>Mianara</dc:creator><cp:lastModifiedBy>Mianara</cp:lastModifiedBy>` +
  `<dc:language>fr-FR</dc:language>` +
  `</cp:coreProperties>`;

const APP =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">` +
  `<Application>Mianara</Application></Properties>`;

const xml = (s: string) => Buffer.from(s, "utf8");

/* ------------------------------------------------------------------ rendu */

mkdirSync("docs", { recursive: true });
const out = zip([
  { name: "[Content_Types].xml", data: xml(CONTENT_TYPES) },
  { name: "_rels/.rels", data: xml(ROOT_RELS) },
  { name: "docProps/core.xml", data: xml(CORE) },
  { name: "docProps/app.xml", data: xml(APP) },
  { name: "word/_rels/document.xml.rels", data: xml(DOC_RELS) },
  { name: "word/document.xml", data: xml(document()) },
  { name: "word/styles.xml", data: xml(STYLES) },
  { name: "word/numbering.xml", data: xml(NUMBERING) },
]);
const file = "docs/mianara-business-model.docx";
writeFileSync(file, out);
console.log("Genere :", file, `(${(out.length / 1024).toFixed(1)} Ko)`);
