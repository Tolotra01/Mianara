import type { Metadata } from "next";
import { Download, IdCard, Info } from "lucide-react";
import QRCode from "qrcode";
import { candidateQrText } from "@/lib/pdf/convocation";
import { Alert, Card, LinkButton, Mono, PageHeader } from "@/components/app/ui";
import { requireCandidate } from "@/lib/auth";

export const metadata: Metadata = { title: "Ma convocation" };

export default async function ConvocationPage() {
  const { candidate: c } = await requireCandidate();
  const qr = await QRCode.toDataURL((await candidateQrText(c.id)) ?? c.qrToken, {
    margin: 4,
    width: 360,
    errorCorrectionLevel: "M",
  });
  return (
    <>
      <PageHeader
        title="Ma convocation"
        description="Imprimez-la ou gardez-la sur votre téléphone : elle est scannée à chaque épreuve."
        actions={
          <LinkButton href={`/api/convocations/${c.id}?telecharger`} prefetch={false}>
            <Download className="size-5" /> Télécharger le PDF
          </LinkButton>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Card padded={false}>
          <iframe
            src={`/api/convocations/${c.id}`}
            title="Aperçu de la convocation"
            className="h-[78vh] min-h-[560px] w-full bg-sunken"
          />
        </Card>
        <div className="space-y-6">
          <Card title="Mon QR code">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qr}
              alt="QR code de ma convocation"
              className="anim-scale mx-auto w-full max-w-64 rounded-xl border border-line bg-white"
            />
            <p className="mt-3 text-center">
              <Mono>{c.matricule}</Mono>
            </p>
          </Card>
          <Alert tone="info" title="Le jour de l'épreuve">
            Présentez-vous 30 minutes avant, avec cette convocation et une pièce d&apos;identité. Aucun retard
            n&apos;est accepté.
          </Alert>
          <Alert tone="warning" title="Une erreur sur votre convocation ?">
            <span className="inline-flex items-start gap-1">
              <IdCard className="mt-0.5 size-4 shrink-0" /> Nom, date de naissance ou série : seul
              l&apos;Office du Bac peut les corriger. Présentez-vous avec vos pièces.
            </span>
          </Alert>
          <p className="flex items-start gap-2 text-sm text-muted">
            <Info className="mt-0.5 size-4 shrink-0" /> Le QR code est signé électroniquement : une
            convocation modifiée est détectée au scan.
          </p>
        </div>
      </div>
    </>
  );
}
