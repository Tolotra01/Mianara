import bcrypt from "bcryptjs";

export const hashPassword = (password: string) => bcrypt.hash(password, 11);
export const checkPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

/** Règle de mot de passe fort (CAN-02) : 8 caractères, une lettre et un chiffre au moins. */
export function passwordProblem(password: string): string | null {
  if (password.length < 8) return "Au moins 8 caractères.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Au moins une lettre et un chiffre.";
  return null;
}
