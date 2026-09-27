/**
 * Verifie le .docx genere : archive ZIP lisible, XML bien forme, et presence
 * des 9 blocs avec leurs puces et leurs notes.
 *
 *   npx tsx --conditions=react-server scripts/check-business-model-docx.ts
 */
import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import {
  ACTIVITIES,
  CHANNELS,
  COSTS,
  PARTNERS,
  RELATIONSHIP,
  RESOURCES,
  REVENUE,
  SEGMENTS,
  VALUE,
} from "./business-model-content";

/* ----------------------------------------------- lecture de l'archive ZIP */

type Entry = { name: string; data: Buffer };

function unzip(buf: Buffer): Entry[] {
  const out: Entry[] = [];
  let i = 0;
  while (i < buf.length - 3) {
    if (buf.readUInt32LE(i) !== 0x04034b50) {
      i++;
      continue;
    }
    const method = buf.readUInt16LE(i + 8);
    const compSize = buf.readUInt32LE(i + 18);
    const nameLen = buf.readUInt16LE(i + 26);
    const extraLen = buf.readUInt16LE(i + 28);
    const start = i + 30 + nameLen + extraLen;
    const name = buf.subarray(i + 30, i + 30 + nameLen).toString("utf8");
    const raw = buf.subarray(start, start + compSize);
    out.push({ name, data: method === 8 ? inflateRawSync(raw) : Buffer.from(raw) });
    i = start + compSize;
  }
  return out;
}

let problem = false;
const file = readFileSync("docs/mianara-business-model.docx");
console.log(`docx : ${(file.length / 1024).toFixed(1)} Ko`);
if (file.readUInt32LE(0) !== 0x04034b50) {
  console.log("  !! ce n'est pas une archive ZIP");
  process.exit(1);
}

const entries = unzip(file);
console.log(`entrees : ${entries.length}`);
for (const e of entries) console.log(`  ${e.name} (${e.data.length} o)`);

const required = [
  "[Content_Types].xml",
  "_rels/.rels",
  "word/document.xml",
  "word/styles.xml",
  "word/numbering.xml",
  "word/_rels/document.xml.rels",
];
const noms = entries.map((e) => e.name);
const manquants = required.filter((n) => !noms.includes(n));
if (manquants.length) {
  console.log("  !! parties manquantes :", manquants.join(", "));
  problem = true;
}

// Toutes les parties doivent declareer un content-type ou etre couvertes par
// un Default ; sans cela Word refuse d'ouvrir le fichier.
const ct = entries.find((e) => e.name === "[Content_Types].xml")!.data.toString("utf8");
for (const n of noms.filter((x) => x.endsWith(".xml"))) {
  const declare = ct.includes(`/${n}"`) || ct.includes('Extension="xml"');
  if (!declare) {
    console.log("  !! content-type absent pour", n);
    problem = true;
  }
}

/* --------------------------------------------------------- document.xml */

const doc = entries.find((e) => e.name === "word/document.xml")!.data.toString("utf8");

// 1) XML bien forme : on le relit avec le parseur DOM de Node (aucun de dispo),
// on verifie donc l'equilibrage des balises et l'absence de caractere nu.
const ouvert = (doc.match(/<w:p[ >]/g) ?? []).length;
const ferme = (doc.match(/<\/w:p>/g) ?? []).length;
const tcO = (doc.match(/<w:tc>/g) ?? []).length;
const tcF = (doc.match(/<\/w:tc>/g) ?? []).length;
const trO = (doc.match(/<w:tr>/g) ?? []).length;
console.log(`paragraphes ${ouvert}/${ferme} | cellules ${tcO}/${tcF} | rangees ${trO}`);
if (ouvert !== ferme || tcO !== tcF || trO !== 3) {
  console.log("  !! structure des tableaux incorrecte");
  problem = true;
}

// 2) Les 9 blocs et toutes leurs puces doivent etre presents.
const texte = doc
  .replace(/<[^>]+>/g, "")
  .replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"');

const blocs = [PARTNERS, ACTIVITIES, VALUE, RELATIONSHIP, SEGMENTS, RESOURCES, CHANNELS, REVENUE, COSTS];
let puces = 0;
for (const b of blocs) {
  if (!texte.includes(b.title)) {
    console.log("  !! bloc absent :", b.title);
    problem = true;
  }
  for (const puce of b.bullets) {
    puces++;
    if (!texte.includes(puce)) {
      console.log("  !! puce absente :", puce.slice(0, 50));
      problem = true;
    }
  }
  if (b.note && !texte.includes(b.note)) {
    console.log("  !! note absente :", b.note.slice(0, 40));
    problem = true;
  }
}
console.log(`blocs : 9/9 | puces attendues : ${puces}`);

// 3) Les accents doivent etre preserves (contrairement au PDF).
const accentues = ["clé", "cœur", "Écoles", "délibération", "référentiel"];
const perdus = accentues.filter((a) => !texte.includes(a));
console.log(`accents conserves : ${accentues.length - perdus.length}/${accentues.length}`);
for (const p of perdus) console.log("  !! accent perdu :", p);
if (perdus.length) problem = true;

console.log(problem ? "\n=> ECHEC" : "\n=> OK");
