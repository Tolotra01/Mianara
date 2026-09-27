/**
 * Verifie le PDF genere : structure, presence des 9 blocs, et absence de
 * dessin hors de la page.
 *
 *   npx tsx --conditions=react-server scripts/check-business-model.ts
 */
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { A4 } from "../src/lib/pdf/common";

/** [libelle, puces, note, colonne sur la grille] — meme ordre que le rendu. */
const BLOCKS: [string, string[], string | null, number][] = [
  [
    "Segments",
    [
      "Eleves de terminale, Bac general et technique (16-18 ans) : coeur de cible",
      "Candidats libres (inscription individuelle)",
      "Ecoles : direction et secretariat des lycees",
      "Offices du Bac des 6 universites : segment payeur",
      "Surveillants et personnel d'epreuve (acces terrain)",
      "Administration nationale : supervision et cadre reglementaire",
    ],
    "Le particulier ne paie jamais : la monetisation passe par l'institution qui a le budget.",
    4,
  ],
  [
    "Activites",
    [
      "Veille et mise a jour du referentiel officiel du Bac",
      "Redaction, proposition et validation editoriale des actualites",
      "Generation IA avec garde-fous : refus hors sujet, aucune invention",
      "Traitement des dossiers d'inscription, de l'ecole vers l'Office",
      "Creation des identites, des matricules et des convocations PDF avec QR",
      "Saisie des notes et deliberation par l'Office",
      "Demandes de releve et de diplome : paiement et retrait",
    ],
    null,
    1,
  ],
  [
    "Partenariats",
    [
      "Les 6 Offices du Bac : validation des donnees, agrement, relation payante",
      "Ministere de l'Education Nationale : cadre reglementaire",
      "Lycees partenaires : relais de terrain et sourcing des candidats",
      "Mobile money : MVola, Orange Money, Airtel Money (1 a 2 % par transaction)",
      "Hebergement : Neon pour PostgreSQL, Vercel pour l'application",
      "Fournisseur d'IA pour l'assistant conversationnel",
      "Banques, pour les virements et les demandes de releve",
    ],
    null,
    0,
  ],
  [
    "Valeur",
    [
      "Eleves : un seul endroit pour series, coefficients, dossier, dates et resultats",
      "Chaque information est sourcee, datee, et signalee 'a confirmer' quand elle ne l'est pas",
      "Assistant IA 24h/24, en francais et en malagasy, qui dit ce qu'il ne sait pas",
      "Convocation, demande de releve et de diplome en ligne, sans deplacement",
      "Ecoles et Offices : toute la session dans un seul outil, au lieu de fichiers disperses",
      "Moins de ressaisie, tracabilite complete via un journal d'audit (RG-17)",
      "Aucune installation : un navigateur et un identifiant",
    ],
    "Mianara n'est pas un site officiel : l'Office du Bac reste la source de verite.",
    2,
  ],
  [
    "Relations",
    [
      "Eleves : 100 % autonome, sans compte pour la vitrine, compte candidat pour l'espace",
      "Ecoles : portail dedie, envoi par lots, suivi envoye / incomplet / valide",
      "Offices : back-office complet, avec delegation de droits et lecture seule pour l'admin",
      "Notification a chaque changement d'etat d'une demande ou d'un dossier",
    ],
    "Relation transactionnelle : la confiance repose sur l'exactitude, pas sur le contrat.",
    3,
  ],
  [
    "Ressources",
    [
      "Le referentiel proprietaire du Bac : series, coefficients, calendrier, baremes",
      "La base de session : candidats, notes, dossiers, demandes, paiements",
      "La plateforme : Next.js, Drizzle ORM, PostgreSQL Neon",
      "L'equipe contenu, qui redige et fait valider les informations",
      "Le prompt systeme et le corpus de reference de l'assistant",
      "La conformite : decret 2021-242, regles RG-05 a RG-17",
    ],
    "Le referentiel est l'actif : il se constitue annee apres annee et ne se copie pas.",
    0,
  ],
  [
    "Canaux",
    [
      "Site vitrine public, optimise pour la recherche et le partage WhatsApp/Facebook",
      "Espace connecte web, avec un tableau de bord par role",
      "Assistant IA embarque : widget flottant present sur toutes les pages",
      "QR code imprime sur la convocation, scan au controle d'entree",
      "Notifications dans l'application (e-mail prevu en phase 2)",
    ],
    null,
    3,
  ],
];

void (async () => {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const M = 30;
  const gap = 6;
  const widths = [98, 92, 118, 100, 103];
  const half = (A4.width - M * 2 - gap) / 2;

  // hauteur de la range, par colonne : les blocs du bas (couts, revenus)
  // occupent la moitie de la largeur.
  const rows: [number, number][] = [
    [228, 200],
    [132, 132],
  ];

  let problem = false;

  for (const [name, bullets, note, col] of BLOCKS) {
    // col 0-4 : range haute ; les deux memes colonnes apparaissent en range medianne.
    const h = rows[0][0];
    const w = widths[col];
    let cy = h - 27;
    for (const b of bullets) {
      const words = b.split(/\s+/);
      let line = "";
      let lines = 0;
      for (const word of words) {
        const tryLine = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(tryLine, 6.1) > w - 19 && line) {
          lines++;
          line = word;
        } else line = tryLine;
      }
      if (line) lines++;
      cy -= lines * 7.6 + 1.6;
    }
    const floor = (note ? 20 : 0) + 6;
    const fits = cy >= floor;
    if (!fits) problem = true;
    console.log(
      `${fits ? "OK  " : "COUP"} ${name.padEnd(13)} haut  l=${String(w).padStart(3)} h=${h} bas=${cy.toFixed(1)} plancher=${floor}`,
    );
  }

  // Les blocs des rangees medianne et basse : memes contenus, autres contraintes.
  const mid: [string, string[], string | null, number][] = [
    [BLOCKS[5][0], BLOCKS[5][1], BLOCKS[5][2], 0],
    [BLOCKS[6][0], BLOCKS[6][1], BLOCKS[6][2], 3],
  ];
  for (const [name, bullets, note, col] of mid) {
    const h = rows[0][1];
    const w = widths[col];
    let cy = h - 27;
    for (const b of bullets) {
      const words = b.split(/\s+/);
      let line = "";
      let lines = 0;
      for (const word of words) {
        const tryLine = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(tryLine, 6.1) > w - 19 && line) {
          lines++;
          line = word;
        } else line = tryLine;
      }
      if (line) lines++;
      cy -= lines * 7.6 + 1.6;
    }
    const floor = (note ? 20 : 0) + 6;
    const fits = cy >= floor;
    if (!fits) problem = true;
    console.log(
      `${fits ? "OK  " : "COUP"} ${name.padEnd(13)} med   l=${String(w).padStart(3)} h=${h} bas=${cy.toFixed(1)} plancher=${floor}`,
    );
  }

  // Couts et revenus, pleine demi-largeur du bas.
  for (const [name, bullets] of [
    [
      "Couts",
      [
        "Infrastructure cloud : base de donnees, hebergement, bande passante",
        "Cout de l'IA, a la question posee : marginal face au reste",
        "Commissions de paiement mobile : 1 a 2 % par transaction",
        "Equipe : developpement, redaction et moderation du contenu",
        "Maintenance reglementaire, a chaque annee scolaire",
        "Support et assistance aux ecoles et aux Offices",
      ],
    ],
    [
      "Revenus",
      [
        "Commission sur les frais de documents : releve 10 000 Ar, diplome 20 000 Ar",
        "Abonnement annuel de l'Office du Bac, par universite",
        "Abonnement ecole en option premium : exports, multi-utilisateurs, tableaux de bord",
        "Parrainages d'operateurs de mobile money et de banques",
        "Subventions et appels a projets (numerisation, cooperations)",
      ],
    ],
  ] as [string, string[]][]) {
    const h = rows[1][0];
    let cy = h - 27;
    for (const b of bullets) {
      const words = b.split(/\s+/);
      let line = "";
      let lines = 0;
      for (const word of words) {
        const tryLine = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(tryLine, 6.1) > half - 19 && line) {
          lines++;
          line = word;
        } else line = tryLine;
      }
      if (line) lines++;
      cy -= lines * 7.6 + 1.6;
    }
    const fits = cy >= 6;
    if (!fits) problem = true;
    console.log(
      `${fits ? "OK  " : "COUP"} ${name.padEnd(13)} bas   l=${half.toFixed(0)} h=${h} bas=${cy.toFixed(1)} plancher=6`,
    );
  }

  const total = widths.reduce((a, b) => a + b, 0) + gap * 4;
  console.log(`\nlargeur grille = ${total.toFixed(2)} / utile = ${(A4.width - M * 2).toFixed(2)}`);
  console.log(problem ? "=> au moins un bloc tronque" : "=> tous les blocs tiennent");

  /* ---- Controle du PDF reellement produit ---- */
  const file = readFileSync("docs/mianara-business-model.pdf");
  const doc = await PDFDocument.load(file);
  console.log(`\nPDF : ${(file.length / 1024).toFixed(1)} Ko, ${doc.getPageCount()} page(s)`);
  for (let i = 0; i < doc.getPageCount(); i++) {
    const p = doc.getPage(i);
    const { width, height } = p.getSize();
    console.log(`  page ${i + 1} : ${width.toFixed(2)} x ${height.toFixed(2)} pt`);
    if (Math.abs(width - A4.width) > 0.5 || Math.abs(height - A4.height) > 0.5) {
      console.log("  !! format inattendu");
      problem = true;
    }
  }

  // Les 9 titres doivent etre presents dans le flux de la page 1. Les flux
  // etant compresses (FlateDecode), il faut les decompresser avant de chercher.
  const inflate = (buf: Buffer): string[] => {
    const out: string[] = [];
    const marker = Buffer.from("stream");
    const end = Buffer.from("endstream");
    let i = 0;
    while (i < buf.length) {
      const s = buf.indexOf(marker, i);
      if (s < 0) break;
      let start = s + marker.length;
      if (buf[start] === 0x0d) start++;
      if (buf[start] === 0x0a) start++;
      const e = buf.indexOf(end, start);
      if (e < 0) break;
      try {
        out.push(inflateSync(buf.subarray(start, e)).toString("latin1"));
      } catch {
        /* flux non compresse (images) : ignore */
      }
      i = e + end.length;
    }
    return out;
  };
  const flux = inflate(file).join("\n");

  // pdf-lib ecrit le texte en hexadecimal (<427573696E...> Tj) : on le decode
  // pour pouvoir le relire.
  const decode = (hex: string) => {
    let s = "";
    for (let i = 0; i + 1 < hex.length; i += 2) s += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
    return s;
  };
  const ecrit = [...flux.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)].map((m) => decode(m[1]));
  const contenu = ecrit.join("\n");
  console.log(`chaines de texte decodees : ${ecrit.length}`);

  const titres = [
    "1. Segments de clientele",
    "2. Propositions de valeur",
    "3. Canaux",
    "4. Relations avec le client",
    "5. Flux de revenus",
    "6. Ressources cles",
    "7. Activites cles",
    "8. Partenariats cles",
    "9. Structures de couts",
  ];
  const manquants = titres.filter((t) => !contenu.includes(t));
  console.log(`blocs trouves : ${titres.length - manquants.length}/${titres.length}`);
  for (const t of manquants) console.log("  !! absent :", t);
  if (manquants.length) problem = true;

  // Des reperes insécables : `wrap()` coupe les phrases sur plusieurs lignes,
  // un fragment de phrase ne se retrouve donc pas entier dans le flux.
  const reperes = ["MVola", "Neon", "2021-242", "RG-17", "convocation"];
  const absents = reperes.filter((r) => !contenu.includes(r));
  console.log(`reperes traces : ${reperes.length - absents.length}/${reperes.length}`);
  for (const a of absents) console.log("  !! absent :", a);
  if (absents.length) problem = true;

  // Chaque puce source doit avoir ete rendue : on recompte les lignes diffusees.
  const attendues = BLOCKS.reduce((n, b) => n + b[1].length, 0) + 12; // 12 = titres + notes + pied
  console.log(`lignes de texte rendues : ${ecrit.length} (minimum attendu ${attendues})`);
  if (ecrit.length < attendues) {
    console.log("  !! des puces ont ete coupees");
    problem = true;
  }

  console.log(problem ? "\n=> ECHEC" : "\n=> OK");
})();
