import type { Metadata } from "next";
import { Building, GraduationCap, School, ShieldCheck } from "lucide-react";
import { LoginArt } from "@/components/illustrations/Spots";
import { Container } from "@/components/ui";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Connexion" };

const SPACES = [
  { icon: GraduationCap, label: "Candidat" },
  { icon: School, label: "Établissement" },
  { icon: Building, label: "Office du Bac" },
  { icon: ShieldCheck, label: "Administration" },
];

export default function ConnexionPage() {
  return (
    <Container className="py-12">
      <div className="grid overflow-hidden rounded-4xl border border-line bg-raised shadow-md md:grid-cols-2">
        <div className="flex flex-col justify-between bg-vert-soft p-8 md:p-12">
          <div>
            <p className="t-overline text-mena">Espace personnel</p>
            <h1 className="t-h1 mt-2">Tongasoa indray !</h1>
            <p className="mt-2 text-muted">Une seule porte d&apos;entrée pour chaque espace.</p>
          </div>
          <div className="mx-auto my-6 w-full max-w-sm">
            <LoginArt />
          </div>
          <ul className="grid grid-cols-2 gap-2">
            {SPACES.map((s) => (
              <li
                key={s.label}
                className="flex items-center gap-2 rounded-2xl bg-raised/80 px-3 py-2 font-semibold"
              >
                <s.icon className="size-5 text-vert" aria-hidden />
                {s.label}
              </li>
            ))}
          </ul>
        </div>
        <div className="p-8 md:p-12">
          <h2 className="t-h2">Connexion</h2>
          <p className="mt-1 text-muted">Avec les identifiants de votre convocation.</p>
          <div className="mt-8">
            <LoginForm />
          </div>
          <div className="mt-8 rounded-2xl bg-sunken p-5">
            <p className="font-bold">Pas encore de compte ?</p>
            <p className="mt-1 text-muted">
              Vous n&apos;avez rien à créer : votre compte est ouvert par l&apos;Office du Bac à partir de la
              liste envoyée par votre lycée. Vos identifiants figurent sur votre convocation.
            </p>
          </div>
        </div>
      </div>
    </Container>
  );
}
