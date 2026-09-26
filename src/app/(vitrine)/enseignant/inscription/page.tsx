import type { Metadata } from "next";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { requireDb } from "@/db";
import { subjects } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { Container } from "@/components/ui";
import { registerTeacher } from "../actions";

export const metadata: Metadata = { title: "Inscription enseignant" };

export default async function TeacherRegistration({ searchParams }: PageProps<"/enseignant/inscription">) {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "teacher" ? "/enseignant" : "/connexion");
  const { erreur } = await searchParams;
  const subjectList = await requireDb().select({ code: subjects.code, name: subjects.name }).from(subjects).orderBy(asc(subjects.name));
  return <Container className="max-w-2xl py-12">
    <h1 className="t-h1">Inscription enseignant</h1>
    <p className="mt-2 text-muted">Créez votre compte gratuitement. Vous pourrez vous connecter immédiatement ; les offres resteront invisibles avant la vérification de votre profil.</p>
    {erreur && <p role="alert" className="mt-4 rounded-xl bg-danger-soft p-3 text-danger">
      {erreur === "identifiant" ? "Cet identifiant est déjà utilisé." : erreur === "limite" ? "Trop de tentatives d'inscription. Réessayez plus tard." : "Vérifiez les informations saisies."}
    </p>}
    <form action={registerTeacher} className="mt-6 grid gap-4 rounded-2xl border border-line bg-raised p-6">
      <label className="grid gap-1">Nom complet<input className="field-input" name="fullName" required minLength={3} maxLength={100} /></label>
      <label className="grid gap-1">Identifiant<input className="field-input" name="username" required minLength={4} maxLength={40} autoComplete="username" /></label>
      <label className="grid gap-1">Matière enseignée<select className="field-input" name="subjectCode" required defaultValue="">
        <option value="" disabled>Sélectionnez une matière</option>{subjectList.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
      </select></label>
      <label className="grid gap-1">Mot de passe (10 caractères minimum)<input className="field-input" name="password" type="password" required minLength={10} maxLength={128} autoComplete="new-password" /></label>
      <button className="rounded-xl bg-vert px-4 py-3 font-bold text-on-vert">Créer mon compte</button>
    </form>
    <p className="mt-4 text-sm">Déjà inscrit·e ? <Link className="font-bold text-vert underline" href="/connexion">Se connecter</Link></p>
  </Container>;
}
