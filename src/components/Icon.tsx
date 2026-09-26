import {
  AlarmClock,
  Calendar,
  CalendarDays,
  Camera,
  CircleAlert,
  Compass,
  FileCheck,
  FilePen,
  Files,
  FolderOpen,
  IdCard,
  type LucideIcon,
  MapPin,
  Moon,
  PencilRuler,
  PhoneOff,
  Receipt,
  School,
  ScrollText,
  SearchCheck,
  ShieldAlert,
  Target,
} from "lucide-react";

/** Icônes référencées par nom dans la base (dossier_items.icon, tips.icon). */
const ICONS: Record<string, LucideIcon> = {
  "alarm-clock": AlarmClock,
  "calendar-days": CalendarDays,
  camera: Camera,
  "circle-alert": CircleAlert,
  compass: Compass,
  "file-check": FileCheck,
  "file-pen": FilePen,
  files: Files,
  "folder-open": FolderOpen,
  "id-card": IdCard,
  "map-pin": MapPin,
  moon: Moon,
  "pencil-ruler": PencilRuler,
  "phone-off": PhoneOff,
  receipt: Receipt,
  school: School,
  "scroll-text": ScrollText,
  "search-check": SearchCheck,
  "shield-alert": ShieldAlert,
  target: Target,
};

export function Icon({ name, className }: { name: string; className?: string }) {
  const Cmp = ICONS[name] ?? Calendar;
  return <Cmp className={className} aria-hidden />;
}
