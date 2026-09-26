import type { Tone } from "@/components/app/ui";

/** Libellés lisibles des actions du journal d'audit. */
const ACTIONS: Record<string, string> = {
  connexion: "Connexion",
  deconnexion: "Déconnexion",
  "connexion.echec": "Échec de connexion",
  "connexion.verrouillage": "Compte verrouillé (trop d'essais)",
  "compte.changer_mot_de_passe": "Changement de mot de passe",
  "compte.modifier_coordonnees": "Modification des coordonnées",
  "candidat.enregistrer": "Enregistrement d'un candidat",
  "candidat.modifier": "Modification d'un candidat",
  "candidat.reinitialiser_mot_de_passe": "Nouveau mot de passe candidat",
  "candidat.reactiver": "Réactivation d'un compte candidat",
  "candidats.repartir_salles": "Répartition dans les salles",
  "centre.creer": "Création d'un centre",
  "centre.supprimer": "Suppression d'un centre",
  "salle.creer": "Création d'une salle",
  "salle.supprimer": "Suppression d'une salle",
  "surveillant.creer": "Création d'un surveillant",
  "surveillant.affecter": "Affectation d'un surveillant",
  "epreuve.creer": "Ajout d'une épreuve",
  "epreuve.modifier": "Modification d'une épreuve",
  "epreuve.supprimer": "Suppression d'une épreuve",
  "edt.publier": "Publication de l'emploi du temps",
  "scan.entry": "Scan : entrée en salle",
  "scan.exit": "Scan : sortie temporaire",
  "scan.return": "Scan : retour en salle",
  "scan.end": "Scan : fin d'épreuve",
  "scan.fraud": "Scan : fraude",
  "scan.doc_delivery": "Scan : remise de document",
  "notes.saisir": "Saisie de notes",
  "resultats.deliberer": "Délibération",
  "resultats.publier": "Publication des résultats",
  "resultats.depublier": "Retrait de la publication",
  "demande.creer": "Demande de document",
  "demande.valider": "Validation d'une demande",
  "demande.rejeter": "Rejet d'une demande",
  "demande.planifier": "Date de retrait fixée",
  "demande.remettre": "Remise d'un document",
  "liste_noire.ajouter": "Ajout en liste noire",
  "liste_noire.lever": "Levée de liste noire",
  "office.creer": "Création d'un Office",
  "office.modifier": "Modification d'un Office",
  "agent.creer": "Création d'un agent Office",
  "session.modifier": "Paramètres de session",
  "actualite.creer": "Publication d'une actualité",
  "actualite.modifier": "Modification d'une actualité",
  "actualite.archiver": "Archivage d'une actualité",
  "actualite.proposer": "Proposition d'actualité",
  "actualite.valider": "Publication d'une actualité proposée",
  "actualite.refuser": "Refus d'une actualité proposée",
  "office.visiter": "Visite d'un Office (consultation)",
  "ecole.creer": "Création d'une école",
  "ecole.modifier": "Modification d'une école",
  "ecole.compte": "Création d'un compte école",
  "dossier.creer": "Dossier créé par l'école",
  "dossier.modifier": "Dossier modifié par l'école",
  "dossier.supprimer": "Brouillon supprimé",
  "dossiers.envoyer": "Envoi de dossiers à l'Office",
  "dossier.valider": "Dossier validé",
  "dossier.renvoyer": "Dossier renvoyé (incomplet)",
  "dossier.refuser": "Dossier refusé",
};

export const actionLabel = (action: string) => ACTIONS[action] ?? action;

export const CANDIDATE_STATUS: Record<string, { label: string; tone: Tone }> = {
  active: { label: "Inscrit", tone: "info" },
  admitted: { label: "Admis", tone: "success" },
  failed: { label: "Ajourné", tone: "neutral" },
  fraud: { label: "Fraude", tone: "danger" },
  absent: { label: "Absent", tone: "warning" },
  disabled: { label: "Compte désactivé", tone: "neutral" },
};

export const REQUEST_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "En attente", tone: "warning" },
  validated: { label: "Validée", tone: "info" },
  pickup_scheduled: { label: "Retrait fixé", tone: "brand" },
  delivered: { label: "Retirée", tone: "success" },
  rejected: { label: "Rejetée", tone: "danger" },
};

export const PAYMENT_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "À vérifier", tone: "warning" },
  verified: { label: "Paiement vérifié", tone: "success" },
  rejected: { label: "Paiement refusé", tone: "danger" },
};

export const DOC_LABEL: Record<string, string> = { transcript: "Relevé de notes", diploma: "Diplôme" };

export const PAYMENT_METHOD: Record<string, string> = {
  mvola: "MVola",
  orange_money: "Orange Money",
  airtel_money: "Airtel Money",
  bank_transfer: "Virement bancaire",
};
