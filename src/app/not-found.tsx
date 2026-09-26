import { NotFoundArt } from "@/components/illustrations/Spots";
import { ButtonLink, Container } from "@/components/ui";

export default function NotFound() {
  return (
    <Container className="flex flex-col items-center py-16 text-center">
      <div className="w-full max-w-sm">
        <NotFoundArt />
      </div>
      <h1 className="t-h1 mt-6">Cette page s&apos;est perdue en route</h1>
      <p className="mt-2 text-muted">Elle a peut-être pris le mauvais taxi-brousse.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/">Retour à l&apos;accueil</ButtonLink>
        <ButtonLink href="/guide" variant="secondary">
          Ouvrir le guide
        </ButtonLink>
      </div>
    </Container>
  );
}
