import "server-only";
import { cookies } from "next/headers";
import { dict, isLang, LANG_COOKIE, type Lang } from "./i18n";

/** Langue choisie par le visiteur (cookie), français par défaut. */
export async function getLang(): Promise<Lang> {
  const value = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(value) ? value : "fr";
}

export async function getDict() {
  const lang = await getLang();
  return { lang, t: dict[lang] };
}
