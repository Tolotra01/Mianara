import { z } from "zod";

/**
 * Indicatifs mobiles malgaches acceptés. La liste s'allonge à mesure que de
 * nouveaux préfixes sont ouverts ; un numéro hors liste est refusé.
 */
export const PHONE_PREFIXES = ["032", "037", "033", "034", "038", "036"] as const;

const PHONE_LENGTH = 10;

const PHONE_MESSAGE = `Numéro malgache : ${PHONE_LENGTH} chiffres commençant par ${PHONE_PREFIXES.join(", ")}.`;

/** Retire les séparateurs de saisie : « 032 12 345 67 » devient « 0321234567 ». */
export function normalizePhone(raw: string): string {
  return raw.replace(/[\s.\-()/]/g, "");
}

/** Dix chiffres, et un indicatif connu. */
export function isValidPhone(raw: string): boolean {
  const digits = normalizePhone(raw);
  return digits.length === PHONE_LENGTH && PHONE_PREFIXES.some((p) => digits.startsWith(p));
}

/**
 * Champ téléphone facultatif : vide accepté, sinon 10 chiffres à indicatif connu.
 * Renvoie le numéro normalisé, ou `null` si le champ est laissé vide.
 */
export const phoneField = () =>
  z
    .string()
    .trim()
    .transform(normalizePhone)
    .refine((v) => v === "" || isValidPhone(v), { message: PHONE_MESSAGE })
    .optional()
    .transform((v) => v || null);

/** Motif déduit de la liste d'indicatifs, séparateurs de saisie tolérés. */
const PHONE_PATTERN = `(?:${PHONE_PREFIXES.join("|")})[\\s.-]?\\d{2}[\\s.-]?\\d{3}[\\s.-]?\\d{2}`;

/** Attributs du champ de saisie, pour rejeter le clavier inadapté dès le navigateur. */
export const PHONE_INPUT = {
  type: "tel",
  inputMode: "numeric",
  autoComplete: "tel",
  maxLength: 14,
  pattern: PHONE_PATTERN,
  title: PHONE_MESSAGE,
} as const;
