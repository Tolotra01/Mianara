import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CircleStop } from "lucide-react";
import { AutoRefresh } from "@/components/app/AutoRefresh";
import { ConfirmAction } from "@/components/app/ConfirmAction";
import { Card, PageHeader, StatusBadge } from "@/components/app/ui";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/bac-rules";
import { sessionFor, sessionMessages } from "@/lib/services/learning";
import { closeTeacherSession } from "../../actions";
import { ChatBox } from "../ChatBox";

export const metadata: Metadata = { title: "Tutorat" };

export default async function TutoratChatPage({ params }: PageProps<"/enseignant/tutorat/[id]">) {
  const user = await requireUser(["teacher"]);
  const session = await sessionFor((await params).id, user);
  if (!session) notFound();
  const messages = await sessionMessages(session.s.id, "teacher");
  const open = session.s.status === "active";
  return (
    <>
      <PageHeader
        back={{ href: "/enseignant/tutorat", label: "Tutorat" }}
        eyebrow={`${session.subjectName} · ${session.title}`}
        title={session.pupil}
        description={
          session.s.activatedAt ? `Séance ouverte le ${formatDateTime(session.s.activatedAt)}.` : undefined
        }
        actions={
          <>
            {open ? <AutoRefresh seconds={8} /> : <StatusBadge tone="neutral">Terminée</StatusBadge>}
            {open && (
              <ConfirmAction
                action={closeTeacherSession}
                fields={{ sessionId: session.s.id }}
                variant="secondary"
                size="sm"
                icon={<CircleStop className="size-4" />}
                label="Clôturer"
                title="Clôturer cette séance ?"
                description="L'élève est prévenu ; le fil reste consultable en lecture seule."
              />
            )}
          </>
        }
      />
      <Card padded={false}>
        <ChatBox
          sessionId={session.s.id}
          open={open}
          messages={messages.map((m) => ({
            id: m.id,
            sender: m.sender,
            text: m.text,
            time: formatDateTime(m.createdAt),
          }))}
        />
      </Card>
    </>
  );
}
