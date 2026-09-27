/**
 * Genere le Business Model Canvas de Mianara (modele d'Osterwalder) en PDF.
 *
 *   npx tsx --conditions=react-server scripts/generate-business-model.ts
 *
 * Le rendu reprend la charte v2 du projet : memes couleurs, meme bandeau lamba,
 * memes polices standard que les convocations et les tickets.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import type { PDFFont, PDFPage } from "pdf-lib";
import { C, lambaBand, newDocument, text, wrap, A4 } from "../src/lib/pdf/common";

type Block = { title: string; bullets: string[]; note?: string };

/* ----------------------------------------------------------------- contenu */

const SEGMENTS: Block = {
  title: "1. Segments de clientele",
  bullets: [
    "Eleves de terminale, Bac general et technique (16-18 ans) : coeur de cible",
    "Candidats libres (inscription individuelle)",
    "Ecoles : direction et secretariat des lycees",
    "Offices du Bac des 6 universites : segment payeur",
    "Surveillants et personnel d'epreuve (acces terrain)",
    "Administration nationale : supervision et cadre reglementaire",
  ],
  note: "Le particulier ne paie jamais : la monetisation passe par l'institution qui a le budget.",
};

const VALUE: Block = {
  title: "2. Propositions de valeur",
  bullets: [
    "Eleves : un seul endroit pour series, coefficients, dossier, dates et resultats",
    "Chaque information est sourcee, datee, et signalee 'a confirmer' quand elle ne l'est pas",
    "Assistant IA 24h/24, en francais et en malagasy, qui dit ce qu'il ne sait pas",
    "Convocation, demande de releve et de diplome en ligne, sans deplacement",
    "Ecoles et Offices : toute la session dans un seul outil, au lieu de fichiers disperses",
    "Moins de ressaisie, tracabilite complete via un journal d'audit (RG-17)",
    "Aucune installation : un navigateur et un identifiant",
  ],
  note: "Mianara n'est pas un site officiel : l'Office du Bac reste la source de verite.",
};

const CHANNELS: Block = {
  title: "3. Canaux",
  bullets: [
    "Site vitrine public, optimise pour la recherche et le partage WhatsApp/Facebook",
    "Espace connecte web, avec un tableau de bord par role",
    "Assistant IA embarque : widget flottant present sur toutes les pages",
    "QR code imprime sur la convocation, scan au controle d'entree",
    "Notifications dans l'application (e-mail prevu en phase 2)",
  ],
};

const RELATIONSHIP: Block = {
  title: "4. Relations avec le client",
  bullets: [
    "Eleves : 100 % autonome, sans compte pour la vitrine, compte candidat pour l'espace",
    "Ecoles : portail dedie, envoi par lots, suivi envoye / incomplet / valide",
    "Offices : back-office complet, avec delegation de droits et lecture seule pour l'admin",
    "Notification a chaque changement d'etat d'une demande ou d'un dossier",
  ],
  note: "Relation transactionnelle : la confiance repose sur l'exactitude, pas sur le contrat.",
};

const REVENUE: Block = {
  title: "5. Flux de revenus",
  bullets: [
    "Commission sur les frais de documents : releve 10 000 Ar, diplome 20 000 Ar",
    "Abonnement annuel de l'Office du Bac, par universite",
    "Abonnement ecole en option premium : exports, multi-utilisateurs, tableaux de bord",
    "Parrainages d'operateurs de mobile money et de banques",
    "Subventions et appels a projets (numerisation, cooperations)",
  ],
  note: "Mianara ne fixe jamais les frais : l'Office les fixe, Mianara preleve sa part.",
};

const RESOURCES: Block = {
  title: "6. Ressources cles",
  bullets: [
    "Le referentiel proprietaire du Bac : series, coefficients, calendrier, baremes",
    "La base de session : candidats, notes, dossiers, demandes, paiements",
    "La plateforme : Next.js, Drizzle ORM, PostgreSQL Neon",
    "L'equipe contenu, qui redige et fait valider les informations",
    "Le prompt systeme et le corpus de reference de l'assistant",
    "La conformite : decret 2021-242, regles RG-05 a RG-17",
  ],
  note: "Le referentiel est l'actif : il se constitue annee apres annee et ne se copie pas.",
};

const ACTIVITIES: Block = {
  title: "7. Activites cles",
  bullets: [
    "Veille et mise a jour du referentiel officiel du Bac",
    "Redaction, proposition et validation editoriale des actualites",
    "Generation IA avec garde-fous : refus hors sujet, aucune invention",
    "Traitement des dossiers d'inscription, de l'ecole vers l'Office",
    "Creation des identites, des matricules et des convocations PDF avec QR",
    "Saisie des notes et deliberation par l'Office",
    "Demandes de releve et de diplome : paiement et retrait",
  ],
};

const PARTNERS: Block = {
  title: "8. Partenariats cles",
  bullets: [
    "Les 6 Offices du Bac : validation des donnees, agrement, relation payante",
    "Ministere de l'Education Nationale : cadre reglementaire",
    "Lycees partenaires : relais de terrain et sourcing des candidats",
    "Mobile money : MVola, Orange Money, Airtel Money (1 a 2 % par transaction)",
    "Hebergement : Neon pour PostgreSQL, Vercel pour l'application",
    "Fournisseur d'IA pour l'assistant conversationnel",
    "Banques, pour les virements et les demandes de releve",
  ],
};

const COSTS: Block = {
  title: "9. Structures de couts",
  bullets: [
    "Infrastructure cloud : base de donnees, hebergement, bande passante",
    "Cout de l'IA, a la question posee : marginal face au reste",
    "Commissions de paiement mobile : 1 a 2 % par transaction",
    "Equipe : developpement, redaction et moderation du contenu",
    "Maintenance reglementaire, a chaque annee scolaire",
    "Support et assistance aux ecoles et aux Offices",
  ],
};

/* ------------------------------------------------------------------ helpers */

function box(
  page: PDFPage,
  b: Block,
  x: number,
  y: number,
  w: number,
  h: number,
  fonts: { regular: PDFFont; bold: PDFFont },
) {
  page.drawRectangle({ x, y, width: w, height: h, color: C.white, borderColor: C.line, borderWidth: 0.8 });
  page.drawRectangle({ x, y: y + h - 17, width: w, height: 17, color: C.vertSoft });
  page.drawRectangle({ x, y: y + h - 17, width: 2.5, height: 17, color: C.vert });
  text(page, b.title, x + 7, y + h - 12, fonts.bold, 7.6, C.vert);

  let cy = y + h - 27;
  const size = 6.1;
  const leading = 7.6;
  const noteH = b.note ? 20 : 0;

  for (const bullet of b.bullets) {
    if (cy < y + noteH + 6) break;
    page.drawCircle({ x: x + 8.5, y: cy + 2, size: 1.2, color: C.vert });
    cy = wrap(page, bullet, x + 13, cy, w - 19, fonts.regular, size, C.ink, leading / size) + 1.6;
  }

  if (b.note) {
    page.drawLine({
      start: { x: x + 6, y: y + 15 },
      end: { x: x + w - 6, y: y + 15 },
      thickness: 0.5,
      color: C.line,
    });
    wrap(page, b.note, x + 7, y + 9, w - 14, fonts.regular, 5.5, C.muted, 6.6);
  }
}



/* -------------------------------------------------------------------- rendu */

async function main() {
  const { pdf, fonts, logo } = await newDocument("Mianara - Business Model Canvas");
  const page = pdf.addPage([A4.width, A4.height]);
  const M = 30;
  const W = A4.width - M * 2;

  page.drawImage(logo, {
    x: M,
    y: A4.height - 58,
    width: (logo.width / logo.height) * 22,
    height: 22,
  });
  const t = "Business Model Canvas";
  text(page, t, A4.width - M - fonts.bold.widthOfTextAtSize(t, 15), A4.height - 52, fonts.bold, 15, C.vert);
  text(page, "Mianara", M, A4.height - 76, fonts.bold, 8, C.muted);
  text(
    page,
    "Plateforme d'orientation et de gestion de la session du Baccalaureat a Madagascar",
    M + 48,
    A4.height - 76,
    fonts.regular,
    8,
    C.muted,
  );
  page.drawLine({
    start: { x: M, y: A4.height - 88 },
    end: { x: M + W, y: A4.height - 88 },
    thickness: 1,
    color: C.vert,
  });

  // Grille a 5 colonnes, conformement au canevas d'Osterwalder.
  const gap = 6;
  const widths = [98, 92, 118, 100, 103];
  const xs: number[] = [];
  let cx = M;
  for (const cw of widths) {
    xs.push(cx);
    cx += cw + gap;
  }

  const topY = A4.height - 118;
  const topH = 228;
  const midY = topY - topH - gap;
  // 200 pt : la rangée medianne doit aussi accueillir la note de « Ressources ».
  const midH = 200;
  const botY = midY - midH - gap;
  const botH = 132;

  box(page, PARTNERS, xs[0], topY, widths[0], topH, fonts);
  box(page, ACTIVITIES, xs[1], topY, widths[1], topH, fonts);
  box(page, VALUE, xs[2], topY, widths[2], topH, fonts);
  box(page, RELATIONSHIP, xs[3], topY, widths[3], topH, fonts);
  box(page, SEGMENTS, xs[4], topY, widths[4], topH, fonts);

  box(page, RESOURCES, xs[0], midY, widths[0], midH, fonts);
  box(page, CHANNELS, xs[3], midY, widths[3], midH, fonts);

  const half = (W - gap) / 2;
  box(page, COSTS, M, botY, half, botH, fonts);
  box(page, REVENUE, M + half + gap, botY, half, botH, fonts);

  lambaBand(page);
  text(page, "Mianara - modele d'affaires - document de travail interne", M, 22, fonts.regular, 7, C.muted);
  const right = "Canevas d'Osterwalder - 9 blocs";
  text(page, right, A4.width - M - fonts.regular.widthOfTextAtSize(right, 7), 22, fonts.regular, 7, C.muted);

  mkdirSync("docs", { recursive: true });
  const file = "docs/mianara-business-model.pdf";
  writeFileSync(file, await pdf.save());
  console.log("Genere :", file);
}

void main();
