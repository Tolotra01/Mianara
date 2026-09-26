"use server";

import { and, eq, isNull } from "drizzle-orm";
import { refresh } from "next/cache";
import { requireDb } from "@/db";
import { notifications } from "@/db/schema-gestion";
import { getCurrentUser } from "@/lib/auth";

export async function markAllNotificationsRead() {
  const user = await getCurrentUser();
  if (!user) return;
  await requireDb()
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
  refresh();
}
