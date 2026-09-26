import { getCurrentUser } from "@/lib/auth";
import { canAccessCandidate } from "@/lib/access";
import { convocationPdf } from "@/lib/pdf/convocation";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return new Response("Connexion requise", { status: 401 });
  if (user.mustChangePassword && user.role === "candidate")
    return new Response("Changez d'abord votre mot de passe", { status: 403 });
  if (!(await canAccessCandidate(user, id))) return new Response("Accès refusé", { status: 403 });

  const pdf = await convocationPdf(id);
  if (!pdf) return new Response("Introuvable", { status: 404 });
  const download = new URL(request.url).searchParams.has("telecharger");
  return new Response(Buffer.from(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `${download ? "attachment" : "inline"}; filename="convocation-${id.slice(0, 8)}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}
