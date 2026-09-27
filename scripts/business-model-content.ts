/**
 * Contenu du Business Model Canvas de Mianara, partage par les generateurs PDF
 * (scripts/generate-business-model.ts) et Word (scripts/generate-business-model-docx.ts).
 *
 * Les accents sont ici conservation : le PDF les supprime (les polices standard
 * de pdf-lib ne couvrent que le jeu WinAnsi), le .docx les conserve.
 */
export type Block = { title: string; bullets: string[]; note?: string };

export const TITLE = "Business Model Canvas";
export const SUBTITLE =
  "Mianara — plateforme d’orientation et de gestion de la session du Baccalauréat à Madagascar";

/** Charte v2, en hexadécimal, telle que `src/lib/pdf/common.ts` la définit. */
export const INK = "12241C";
export const MUTED = "4F5E57";
export const VERT = "0E6B4F";
export const VERT_SOFT = "E6F2EE";
export const LINE = "DBE3DF";

export const SEGMENTS: Block = {
  title: "1. Segments de clientèle",
  bullets: [
    "Élèves de terminale, Bac général et technique (16-18 ans) : cœur de cible",
    "Candidats libres (inscription individuelle)",
    "Écoles : direction et secrétariat des lycées",
    "Offices du Bac des 6 universités : segment payeur",
    "Surveillants et personnel d’épreuve (accès terrain)",
    "Administration nationale : supervision et cadre réglementaire",
  ],
  note: "Le particulier ne paie jamais : la monétisation passe par l’institution qui a le budget.",
};

export const VALUE: Block = {
  title: "2. Propositions de valeur",
  bullets: [
    "Élèves : un seul endroit pour séries, coefficients, dossier, dates et résultats",
    "Chaque information est sourcée, datée, et signalée « à confirmer » quand elle ne l’est pas",
    "Assistant IA 24h/24, en français et en malagasy, qui dit ce qu’il ne sait pas",
    "Convocation, demande de relevé et de diplôme en ligne, sans déplacement",
    "Écoles et Offices : toute la session dans un seul outil, au lieu de fichiers dispersés",
    "Moins de ressaisie, traçabilité complète via un journal d’audit (RG-17)",
    "Aucune installation : un navigateur et un identifiant",
  ],
  note: "Mianara n’est pas un site officiel : l’Office du Bac reste la source de vérité.",
};

export const CHANNELS: Block = {
  title: "3. Canaux",
  bullets: [
    "Site vitrine public, optimisé pour la recherche et le partage WhatsApp/Facebook",
    "Espace connecté web, avec un tableau de bord par rôle",
    "Assistant IA embarqué : widget flottant présent sur toutes les pages",
    "QR code imprimé sur la convocation, scan au contrôle d’entrée",
    "Notifications dans l’application (e-mail prévu en phase 2)",
  ],
};

export const RELATIONSHIP: Block = {
  title: "4. Relations avec le client",
  bullets: [
    "Élèves : 100 % autonome, sans compte pour la vitrine, compte candidat pour l’espace",
    "Écoles : portail dédié, envoi par lots, suivi envoyé / incomplet / validé",
    "Offices : back-office complet, avec délégation de droits et lecture seule pour l’admin",
    "Notification à chaque changement d’état d’une demande ou d’un dossier",
  ],
  note: "Relation transactionnelle : la confiance repose sur l’exactitude, pas sur le contrat.",
};


export const REVENUE: Block = {
  title: "5. Flux de revenus",
  bullets: [
    "Commission sur les frais de documents : relevé 10 000 Ar, diplôme 20 000 Ar",
    "Abonnement annuel de l’Office du Bac, par université",
    "Abonnement école en option premium : exports, multi-utilisateurs, tableaux de bord",
    "Parrainages d’opérateurs de mobile money et de banques",
    "Subventions et appels à projets (numérisation, coopérations)",
  ],
  note: "Mianara ne fixe jamais les frais : l’Office les fixe, Mianara prélève sa part.",
};

export const RESOURCES: Block = {
  title: "6. Ressources clés",
  bullets: [
    "Le référentiel propriétaire du Bac : séries, coefficients, calendrier, barèmes",
    "La base de session : candidats, notes, dossiers, demandes, paiements",
    "La plateforme : Next.js, Drizzle ORM, PostgreSQL Neon",
    "L’équipe contenu, qui rédige et fait valider les informations",
    "Le prompt système et le corpus de référence de l’assistant",
    "La conformité : décret 2021-242, règles RG-05 à RG-17",
  ],
  note: "Le référentiel est l’actif : il se constitue année après année et ne se copie pas.",
};

export const ACTIVITIES: Block = {
  title: "7. Activités clés",
  bullets: [
    "Veille et mise à jour du référentiel officiel du Bac",
    "Rédaction, proposition et validation éditoriale des actualités",
    "Génération IA avec garde-fous : refus hors sujet, aucune invention",
    "Traitement des dossiers d’inscription, de l’école vers l’Office",
    "Création des identités, des matricules et des convocations PDF avec QR",
    "Saisie des notes et délibération par l’Office",
    "Demandes de relevé et de diplôme : paiement et retrait",
  ],
};

export const PARTNERS: Block = {
  title: "8. Partenariats clés",
  bullets: [
    "Les 6 Offices du Bac : validation des données, agrément, relation payante",
    "Ministère de l’Éducation Nationale : cadre réglementaire",
    "Lycées partenaires : relais de terrain et sourcing des candidats",
    "Mobile money : MVola, Orange Money, Airtel Money (1 à 2 % par transaction)",
    "Hébergement : Neon pour PostgreSQL, Vercel pour l’application",
    "Fournisseur d’IA pour l’assistant conversationnel",
    "Banques, pour les virements et les demandes de relevé",
  ],
};

export const COSTS: Block = {
  title: "9. Structures de coûts",
  bullets: [
    "Infrastructure cloud : base de données, hébergement, bande passante",
    "Coût de l’IA, à la question posée : marginal face au reste",
    "Commissions de paiement mobile : 1 à 2 % par transaction",
    "Équipe : développement, rédaction et modération du contenu",
    "Maintenance réglementaire, à chaque année scolaire",
    "Support et assistance aux écoles et aux Offices",
  ],
};
