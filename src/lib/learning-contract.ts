import { z } from "zod";

export const coachingPaymentInput = z.object({
  listingId: z.uuid(),
  transactionReference: z.string().trim().min(4).max(120).regex(/^[\p{L}\p{N}._/-]+$/u),
}).strict();

export const coachingMessageInput = z.object({ text: z.string().trim().min(1).max(4000) }).strict();

export type LearningItemRecord = {
  id: string;
  kind: "course" | "training" | "coaching";
  subjectCode: string;
  title: string;
  description: string;
  content: string;
  priceAmount: number | null;
  durationMinutes: number | null;
};

export function presentLearningItem(item: LearningItemRecord, hasApprovedPurchase: boolean) {
  const purchased = item.priceAmount === null || item.priceAmount === 0 || hasApprovedPurchase;
  return {
    id: item.id,
    kind: item.kind,
    subjectCode: item.subjectCode,
    title: item.title,
    description: item.description,
    content: purchased ? item.content : item.description,
    priceAmount: item.priceAmount,
    currency: "MGA" as const,
    durationMinutes: item.durationMinutes,
    purchased,
  };
}

export function presentCoachingMessage(message: {
  id: string;
  sender: "teacher" | "candidate";
  text: string;
  createdAt: string;
}) {
  return { id: message.id, sender: message.sender, text: message.text, createdAt: message.createdAt };
}
