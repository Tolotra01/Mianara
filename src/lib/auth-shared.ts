/** Types et libellés partagés entre serveur et navigateur (sans dépendance serveur). */
export type Role = "admin" | "office" | "supervisor" | "candidate" | "school";

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administration",
  office: "Office du Bacc",
  supervisor: "Surveillant",
  candidate: "Candidat",
  school: "Établissement",
};
