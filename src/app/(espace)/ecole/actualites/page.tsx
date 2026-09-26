import type { Metadata } from "next";
import { ProposalsPage } from "@/components/app/ProposalsPage";
import { requireSchool } from "@/lib/auth";

export const metadata: Metadata = { title: "Proposer une actualité" };

export default async function Page() {
  const user = await requireSchool();
  return <ProposalsPage userId={user.id} />;
}
