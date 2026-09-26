import {
  Activity,
  Award,
  Ban,
  Bell,
  Building,
  Building2,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  DoorOpen,
  FileStack,
  FileText,
  Home,
  LayoutDashboard,
  type LucideIcon,
  Newspaper,
  ScrollText,
  Settings2,
  ShieldCheck,
  Ticket,
  UserCog,
  Users,
} from "lucide-react";
import type { Role } from "@/lib/auth-shared";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badgeKey?: "requests" | "notifications";
};
export type NavGroup = { label?: string; items: NavItem[] };

export const NAV: Record<Role, NavGroup[]> = {
  office: [
    { items: [{ href: "/office", label: "Tableau de bord", icon: LayoutDashboard }] },
    {
      label: "Candidats",
      items: [
        { href: "/office/candidats", label: "Candidats", icon: Users },
        { href: "/office/liste-noire", label: "Liste noire", icon: Ban },
      ],
    },
    {
      label: "Session",
      items: [
        { href: "/office/session", label: "Emploi du temps", icon: CalendarClock },
        { href: "/office/centres", label: "Centres et salles", icon: Building2 },
        { href: "/office/surveillants", label: "Surveillants", icon: ShieldCheck },
        { href: "/office/epreuves", label: "Épreuves en direct", icon: Activity },
      ],
    },
    {
      label: "Après les épreuves",
      items: [
        { href: "/office/notes", label: "Notes et résultats", icon: ClipboardList },
        { href: "/office/demandes", label: "Demandes", icon: FileStack, badgeKey: "requests" },
      ],
    },
  ],
  candidate: [
    {
      items: [
        { href: "/candidat", label: "Accueil", icon: Home },
        { href: "/candidat/convocation", label: "Ma convocation", icon: Ticket },
        { href: "/candidat/epreuves", label: "Mes épreuves", icon: CalendarDays },
        { href: "/candidat/resultats", label: "Mes résultats", icon: Award },
        { href: "/candidat/demandes", label: "Relevé et diplôme", icon: FileText },
        { href: "/candidat/notifications", label: "Notifications", icon: Bell, badgeKey: "notifications" },
        { href: "/compte", label: "Mon compte", icon: UserCog },
      ],
    },
  ],
  supervisor: [
    {
      items: [
        { href: "/surveillant", label: "Mes salles", icon: DoorOpen },
        { href: "/compte", label: "Mon compte", icon: UserCog },
      ],
    },
  ],
  admin: [
    { items: [{ href: "/admin", label: "Tableau de bord", icon: LayoutDashboard }] },
    {
      label: "Pilotage",
      items: [
        { href: "/admin/offices", label: "Offices du Bac", icon: Building },
        { href: "/admin/session", label: "Paramètres de session", icon: Settings2 },
        { href: "/admin/actualites", label: "Actualités", icon: Newspaper },
        { href: "/admin/journal", label: "Journal d'audit", icon: ScrollText },
      ],
    },
  ],
};
