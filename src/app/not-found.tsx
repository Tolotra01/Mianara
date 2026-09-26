import { NotFoundArt } from "@/components/illustrations/Spots";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ButtonLink, Container } from "@/components/ui";
import { getDict } from "@/lib/lang";

export default async function NotFound() {
  const { lang, t } = await getDict();
  return (
    <>
      <SiteHeader t={t} lang={lang} />
      <main className="flex-1">
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
      </main>
      <SiteFooter t={t} />
    </>
  );
}
