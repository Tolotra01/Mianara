import type { CSSProperties, ReactNode } from "react";
import { Bird, Cloud, HighlandHouse, Jacaranda, P, Ravinala, Sparkle } from "./parts";

/**
 * Décors des en-têtes de pages. Chaque page a le sien, tiré de ce qui la
 * définit (le guide est un parcours, les séries trois chemins, les
 * coefficients une balance…), toujours dans un paysage malgache.
 *
 * Même cadrage que la scène d'accueil : viewBox 1400 × 457 monté en `slice`
 * et ancré en bas. Le côté gauche reste calme (le titre s'y pose, sous le
 * voile) ; les repères occupent la moitié droite, entre x = 640 et 1380, qui
 * reste visible aussi dans la bande basse du mobile (cadrage `xMax`).
 */

export type SceneName =
  | "guide"
  | "series"
  | "coefficients"
  | "dossier"
  | "calendrier"
  | "preparer"
  | "jourj"
  | "suite"
  | "actualites"
  | "aide"
  | "resultats";

const TXT = { fontFamily: "var(--font-jakarta), system-ui, sans-serif", fontWeight: 800 } as const;

const FAR =
  "M0 268 C160 226 300 250 440 224 C580 198 700 244 840 222 C980 200 1120 232 1260 212 C1340 200 1400 216 1440 208 L1440 540 L0 540 Z";
const MID =
  "M0 312 C180 274 340 302 520 278 C700 254 860 298 1040 272 C1200 248 1340 286 1440 266 L1440 540 L0 540 Z";
const NEAR = "M0 452 C300 446 640 450 940 444 C1160 440 1320 446 1440 442 L1440 540 L0 540 Z";

/** Ciel en aplats superposés (pas de dégradé) : la couleur se réchauffe vers l'horizon. */
function SkyBands({ bands }: { bands: string[] }) {
  return (
    <>
      <rect width="1440" height="540" fill={bands[0]} />
      {bands.slice(1).map((c, i) => (
        <rect key={c + i} y={150 + i * 46} width="1440" height="540" fill={c} />
      ))}
    </>
  );
}

function Frame({
  framing,
  className,
  sky,
  children,
}: {
  framing: "mobile" | "wide";
  className?: string;
  sky: string[];
  children: ReactNode;
}) {
  return (
    <svg
      viewBox="10 83 1400 457"
      preserveAspectRatio={`${framing === "mobile" ? "xMax" : "xMid"}YMax slice`}
      className={`ill h-full w-full ${className ?? ""}`}
      aria-hidden
    >
      <SkyBands bands={sky} />
      {children}
    </svg>
  );
}

function Hills({ far, mid, near, nearY = 0 }: { far: string; mid: string; near: string; nearY?: number }) {
  return (
    <>
      <path d={FAR} fill={far} />
      <path d={MID} fill={mid} />
      <path d={NEAR} fill={near} transform={nearY ? `translate(0 ${nearY})` : undefined} />
    </>
  );
}

/** Étoiles à positions fixes (rendu identique serveur / client). */
function Stars({ count = 40, maxY = 260 }: { count?: number; maxY?: number }) {
  return (
    <g fill={P.paper}>
      {Array.from({ length: count }, (_, i) => {
        const x = (i * 263 + 97) % 1440;
        const y = 90 + ((i * 131 + 53) % (maxY - 90));
        const r = i % 5 === 0 ? 1.8 : i % 3 === 0 ? 1.3 : 0.9;
        return <circle key={i} cx={x} cy={y} r={r} opacity={i % 4 === 0 ? 0.9 : 0.55} />;
      })}
    </g>
  );
}

/** Route en perspective : de (x0, y0) large de w0 jusqu'à (x1, y1) large de w1, courbée de `bend`. */
function Road({
  from,
  to,
  bend = [0, 0],
  fill,
  dash,
}: {
  from: [number, number, number];
  to: [number, number, number];
  bend?: [number, number];
  fill: string;
  dash?: string;
}) {
  const [x0, y0, w0] = from;
  const [x1, y1, w1] = to;
  const cx = (x0 + x1) / 2 + bend[0];
  const cy = (y0 + y1) / 2 + bend[1];
  const d = `M${x0 - w0 / 2} ${y0} Q${cx - (w0 + w1) / 4} ${cy} ${x1 - w1 / 2} ${y1} L${x1 + w1 / 2} ${y1} Q${cx + (w0 + w1) / 4} ${cy} ${x0 + w0 / 2} ${y0} Z`;
  return (
    <>
      <path d={d} fill={fill} />
      {dash && (
        <path
          d={`M${x0} ${y0} Q${cx} ${cy} ${x1} ${y1}`}
          stroke={dash}
          strokeWidth="2.5"
          strokeDasharray="16 14"
          fill="none"
          opacity="0.55"
        />
      )}
    </>
  );
}

/** Drapeau malgache sur son mât, pied du mât en (x, y). */
function MadaFlag({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x="-1.5" y="-110" width="3" height="110" fill="#C9CFCB" />
      <g className="a-sway-slow" style={{ transformOrigin: "0% 50%" }}>
        <rect x="1.5" y="-108" width="16" height="30" fill={P.white} />
        <rect x="17.5" y="-108" width="30" height="15" fill="#D6263B" />
        <rect x="17.5" y="-93" width="30" height="15" fill="#0B8A4A" />
      </g>
    </g>
  );
}

function Baobab({
  x,
  y,
  scale = 1,
  trunk = "#6B4A3A",
  crown = "#3F5A3A",
}: {
  x: number;
  y: number;
  scale?: number;
  trunk?: string;
  crown?: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M-15 0 C-18 -42 -13 -92 -8 -122 L8 -122 C13 -92 18 -42 15 0 Z" fill={trunk} />
      <path d="M6 -120 C11 -90 15 -44 15 0 L8 0 C9 -44 7 -90 3 -120 Z" fill="#00000026" />
      <g stroke={trunk} strokeWidth="4.5" strokeLinecap="round" fill="none">
        <path d="M-5 -118 L-22 -140" />
        <path d="M0 -121 L-2 -150" />
        <path d="M5 -118 L24 -138" />
        <path d="M-12 -130 L-20 -154" />
        <path d="M14 -128 L16 -156" />
      </g>
      <g fill={crown}>
        <ellipse cx="-24" cy="-144" rx="12" ry="7" />
        <ellipse cx="-2" cy="-155" rx="13" ry="7.5" />
        <ellipse cx="26" cy="-142" rx="12" ry="7" />
        <ellipse cx="-20" cy="-158" rx="9" ry="5.5" />
        <ellipse cx="17" cy="-160" rx="10" ry="6" />
      </g>
    </g>
  );
}

function Pennant({
  x,
  y,
  scale = 1,
  n,
  color,
}: {
  x: number;
  y: number;
  scale?: number;
  n?: number;
  color: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x="-1.6" y="-62" width="3.2" height="62" fill={P.wood} />
      <path d="M1.6 -62 L34 -52 L1.6 -42 Z" fill={color} />
      {n !== undefined && (
        <text x="13" y="-47.5" fontSize="11" textAnchor="middle" fill={P.white} style={TXT}>
          {n}
        </text>
      )}
      <ellipse cx="0" cy="0" rx="7" ry="2" fill="#00000030" />
    </g>
  );
}

/* ---------- Guide : le parcours en sept étapes ---------- */

function GuideScene() {
  const stops: [number, number, number][] = [
    [560, 505, 1.35],
    [720, 452, 1.12],
    [842, 412, 0.94],
    [930, 380, 0.8],
    [992, 356, 0.67],
    [1036, 337, 0.56],
    [1066, 322, 0.47],
  ];
  const colors = [P.mena, P.soleil, P.vertLight, P.mena, P.soleil, P.vertLight, P.mena];
  return (
    <>
      <circle cx="1150" cy="300" r="120" fill={P.soleil} opacity="0.18" className="a-glow" />
      <circle cx="1150" cy="300" r="78" fill={P.soleil} />
      <g className="a-float">
        <Bird x={1010} y={180} />
        <Bird x={1046} y={200} scale={0.7} />
      </g>
      <Hills far="#3E3148" mid="#553A45" near="#6A4535" />
      <Road from={[520, 540, 250]} to={[1078, 312, 10]} bend={[70, 40]} fill="#B8653F" dash={P.paper} />
      <Baobab x={1210} y={440} scale={1.35} />
      <Baobab x={1330} y={470} scale={1.9} />
      <Baobab x={880} y={338} scale={0.55} />
      <Baobab x={1130} y={330} scale={0.5} />
      <Baobab x={420} y={500} scale={1.5} />
      {stops.map(([x, y, s], i) => (
        <Pennant key={i} x={x + 150 * s} y={y} scale={s} n={i + 1} color={colors[i]} />
      ))}
      <Sparkle x={1084} y={292} r={9} className="a-float" />
    </>
  );
}

/* ---------- Séries : trois chemins ---------- */

function Signboard({ y, label, color, dir }: { y: number; label: string; color: string; dir: -1 | 0 | 1 }) {
  const rot = dir * 16;
  const w = label.length > 1 ? 58 : 44;
  const x0 = dir < 0 ? -w - 4 : dir > 0 ? 4 : -w / 2;
  const tip =
    dir < 0
      ? `M${x0} ${y} L${x0 - 10} ${y + 9} L${x0} ${y + 18} Z`
      : `M${x0 + w} ${y} L${x0 + w + 10} ${y + 9} L${x0 + w} ${y + 18} Z`;
  return (
    <g transform={`rotate(${rot} 0 ${y + 9})`}>
      <rect x={x0} y={y} width={w} height="18" rx="2" fill={color} />
      <path d={tip} fill={color} />
      <text x={x0 + w / 2} y={y + 13.5} fontSize="12" textAnchor="middle" fill={P.white} style={TXT}>
        {label}
      </text>
    </g>
  );
}

function SeriesScene() {
  return (
    <>
      <circle cx="1270" cy="170" r="46" fill={P.soleil} />
      <Cloud x={980} y={160} scale={0.9} className="a-float" />
      <Hills far="#25493D" mid="#2D6A50" near="#2F8A63" />
      {/* Une route monte jusqu'au carrefour, puis se sépare en trois chemins */}
      <Road from={[1010, 545, 150]} to={[1000, 430, 54]} fill="#A8684A" />
      <Road from={[990, 432, 36]} to={[700, 300, 6]} bend={[-30, 40]} fill="#A8684A" />
      <Road from={[1000, 432, 36]} to={[972, 288, 6]} bend={[0, 0]} fill="#A8684A" />
      <Road from={[1010, 432, 36]} to={[1252, 298, 6]} bend={[30, 40]} fill="#A8684A" />
      <ellipse cx="1000" cy="434" rx="40" ry="10" fill="#A8684A" />
      {/* Au bout de chaque route, un fanion à la couleur de la série */}
      <Pennant x={694} y={300} scale={0.55} color={P.mena} />
      <Pennant x={968} y={287} scale={0.55} color={P.vertLight} />
      <Pennant x={1254} y={297} scale={0.55} color={P.soleil} />
      <Ravinala x={560} y={470} scale={1.1} />
      <Ravinala x={1330} y={500} scale={1.35} />
      {/* Poteau indicateur au carrefour */}
      <g transform="translate(1086 470)">
        <rect x="-3" y="-120" width="6" height="120" fill={P.wood} />
        <Signboard y={-116} label="L" color={P.mena} dir={-1} />
        <Signboard y={-92} label="S" color={P.vert} dir={0} />
        <Signboard y={-66} label="OSE" color="#C98A12" dir={1} />
        <ellipse cx="0" cy="0" rx="14" ry="3" fill="#00000030" />
      </g>
    </>
  );
}

/* ---------- Coefficients : le poids de chaque matière ---------- */

function Sack({
  x,
  y,
  s = 1,
  n,
  color = "#E8DCC0",
}: {
  x: number;
  y: number;
  s?: number;
  n: number;
  color?: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-18 0 C-22 -18 -18 -36 -10 -42 L10 -42 C18 -36 22 -18 18 0 Z" fill={color} />
      <path d="M-10 -42 L-6 -50 L6 -50 L10 -42 Z" fill="#CDBE9C" />
      <path d="M-9 -44 L9 -44" stroke={P.menaDark} strokeWidth="2" />
      <text x="0" y="-12" fontSize="18" textAnchor="middle" fill={P.menaDark} style={TXT}>
        {n}
      </text>
    </g>
  );
}

function Parasol({ x, y, s = 1, a, b }: { x: number; y: number; s?: number; a: string; b: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-2" y="-70" width="4" height="70" fill={P.wood} />
      <path d="M-50 -58 L0 -86 L50 -58 Z" fill={a} />
      <path d="M-25 -58 L0 -86 L-8 -58 Z M8 -58 L0 -86 L25 -58 Z" fill={b} />
      <rect x="-40" y="-28" width="80" height="28" rx="2" fill="#7A5236" />
      <g fill={P.soleil}>
        <circle cx="-26" cy="-32" r="6" />
        <circle cx="-14" cy="-33" r="6" />
      </g>
      <g fill={P.mena}>
        <circle cx="12" cy="-32" r="6" />
        <circle cx="24" cy="-32" r="6" />
      </g>
    </g>
  );
}

function CoefficientsScene() {
  return (
    <>
      <circle cx="1180" cy="150" r="40" fill={P.soleilLight} />
      <Cloud x={880} y={170} scale={0.8} className="a-float" />
      <Hills far="#1F4A48" mid="#2A6452" near="#6A4A35" nearY={-10} />
      <Parasol x={760} y={440} s={1} a={P.mena} b={P.paper} />
      <Parasol x={1300} y={448} s={1.15} a={P.vert} b={P.soleil} />
      {/* Grande balance romaine : le côté lourd (coefficient 5) penche */}
      <g transform="translate(1030 520)">
        <rect x="-5" y="-190" width="10" height="190" fill="#5A4636" />
        <rect x="-40" y="-8" width="80" height="10" rx="3" fill="#4A3A2E" />
        <g transform="rotate(-10 0 -186)">
          <rect x="-120" y="-190" width="240" height="8" rx="4" fill="#8C6A4A" />
          <circle cx="0" cy="-186" r="9" fill={P.soleil} />
          {/* Plateau gauche */}
          <g transform="translate(-112 -182) rotate(10)">
            <path d="M0 0 L-34 78 M0 0 L34 78" stroke="#C9B89A" strokeWidth="2" />
            <path d="M-44 78 L44 78 Q40 92 0 92 Q-40 92 -44 78 Z" fill="#8C6A4A" />
            <Sack x={0} y={80} s={1.25} n={5} />
          </g>
          {/* Plateau droit */}
          <g transform="translate(112 -182) rotate(10)">
            <path d="M0 0 L-30 70 M0 0 L30 70" stroke="#C9B89A" strokeWidth="2" />
            <path d="M-40 70 L40 70 Q36 83 0 83 Q-36 83 -40 70 Z" fill="#8C6A4A" />
            <Sack x={0} y={72} s={0.7} n={1} />
          </g>
        </g>
      </g>
      {/* Sacs de riz posés au sol, du plus lourd au plus léger */}
      <Sack x={1170} y={528} s={1.05} n={4} />
      <Sack x={1216} y={530} s={0.85} n={3} />
      <Sack x={860} y={528} s={0.95} n={2} />
    </>
  );
}

/* ---------- Dossier : les pièces à déposer ---------- */

function Paper({
  x,
  y,
  r = 0,
  s = 1,
  className,
  style,
}: {
  x: number;
  y: number;
  r?: number;
  s?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <g className={className} style={style}>
      <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
        <rect x="-12" y="-16" width="24" height="32" rx="2" fill={P.paper} />
        <path d="M-7 -8 L7 -8 M-7 -2 L7 -2 M-7 4 L3 4" stroke={P.line} strokeWidth="2" />
        <circle cx="6" cy="10" r="3" fill={P.mena} opacity="0.7" />
      </g>
    </g>
  );
}

function DossierScene() {
  return (
    <>
      <circle cx="1290" cy="160" r="40" fill={P.soleilLight} opacity="0.9" />
      <Hills far="#22405A" mid="#2B5566" near="#2F6E58" />
      <Jacaranda x={760} y={452} scale={1.3} />
      <Jacaranda x={1330} y={456} scale={1.4} />
      {/* Office du Bacc : façade à colonnes, marches, fronton */}
      <g transform="translate(860 470)">
        <rect x="0" y="-150" width="360" height="150" fill="#E9E1D0" />
        <path d="M-16 -150 L180 -214 L376 -150 Z" fill="#C9BFA9" />
        <path d="M20 -156 L180 -206 L340 -156 Z" fill="#DDD3BE" />
        <rect x="-10" y="-156" width="380" height="8" fill="#BFB49C" />
        {[30, 100, 250, 320].map((x) => (
          <rect key={x} x={x - 9} y="-146" width="18" height="140" fill={P.white} />
        ))}
        <rect x="150" y="-110" width="60" height="110" rx="30" fill={P.glass} />
        <rect x="110" y="-140" width="140" height="22" rx="3" fill={P.vert} />
        <text x="180" y="-124" fontSize="13" textAnchor="middle" fill={P.white} style={TXT}>
          OFFICE DU BACC
        </text>
        <rect x="-20" y="-6" width="400" height="8" fill="#BFB49C" />
        <rect x="-34" y="2" width="428" height="8" fill="#A99E86" />
        <MadaFlag x={180} y={-212} scale={0.8} />
      </g>
      {/* Boîte aux lettres */}
      <g transform="translate(1260 480)">
        <rect x="-3" y="-44" width="6" height="44" fill="#4A4A4A" />
        <rect x="-18" y="-76" width="36" height="34" rx="6" fill={P.soleil} />
        <rect x="-10" y="-64" width="20" height="4" rx="2" fill={P.ink} />
      </g>
      {/* Les pièces du dossier volent vers l'Office */}
      <Paper x={640} y={260} r={-14} s={1.1} className="a-float" />
      <Paper x={740} y={215} r={10} className="a-float" style={{ animationDelay: "-1s" }} />
      <Paper x={830} y={250} r={-6} s={0.9} className="a-float" style={{ animationDelay: "-2s" }} />
      <Paper x={960} y={200} r={16} s={0.8} className="a-float" style={{ animationDelay: "-0.5s" }} />
    </>
  );
}

/* ---------- Calendrier : le temps qui passe ---------- */

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

function CalendrierScene() {
  const x0 = 640;
  const x1 = 1380;
  const sag = (t: number) => 190 + Math.sin(Math.PI * t) * 46;
  return (
    <>
      {/* Course du soleil : lever, zénith, coucher */}
      <path
        d="M660 320 Q1010 20 1360 320"
        stroke={P.soleilLight}
        strokeWidth="2"
        strokeDasharray="4 10"
        fill="none"
        opacity="0.6"
      />
      <circle cx="1010" cy="170" r="22" fill={P.soleilLight} opacity="0.35" />
      <circle cx="1260" cy="236" r="14" fill={P.soleilLight} opacity="0.25" />
      <circle cx="790" cy="236" r="14" fill={P.soleilLight} opacity="0.25" />
      <circle cx="1290" cy="300" r="120" fill={P.soleil} opacity="0.16" className="a-glow" />
      <circle cx="1290" cy="300" r="74" fill={P.soleil} />
      <Hills far="#44304E" mid="#2F5A4E" near="#2F7A5A" />
      <g stroke="#4F9A6A" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.9">
        <path d="M0 340 C180 310 340 332 520 310 C700 288 860 324 1040 302 C1200 282 1340 312 1440 298" />
        <path d="M0 370 C180 344 340 362 520 342 C700 322 860 354 1040 334 C1200 316 1340 342 1440 330" />
        <path d="M0 400 C180 378 340 392 520 374 C700 356 860 384 1040 366 C1200 350 1340 372 1440 362" />
      </g>
      {/* Guirlande des douze mois entre deux mâts */}
      <rect x={x0 - 3} y="180" width="6" height="280" fill={P.wood} />
      <rect x={x1 - 3} y="180" width="6" height="280" fill={P.wood} />
      <path
        d={`M${x0} 190 Q${(x0 + x1) / 2} ${190 + 92} ${x1} 190`}
        stroke={P.paper}
        strokeWidth="1.5"
        fill="none"
        opacity="0.7"
      />
      {MONTHS.map((m, i) => {
        const t = (i + 0.5) / MONTHS.length;
        const x = x0 + (x1 - x0) * t;
        const y = sag(t);
        const c = [P.mena, P.soleil, P.vertLight][i % 3];
        return (
          <g key={i} className="a-sway-slow" style={{ transformOrigin: "50% 0%" }}>
            <path d={`M${x - 16} ${y} L${x + 16} ${y} L${x} ${y + 34} Z`} fill={c} />
            <text x={x} y={y + 15} fontSize="12" textAnchor="middle" fill={P.white} style={TXT}>
              {m}
            </text>
          </g>
        );
      })}
      <HighlandHouse x={880} y={452} scale={0.9} />
      <Ravinala x={1000} y={480} scale={0.9} />
      <Ravinala x={1340} y={500} scale={1.2} />
    </>
  );
}

/* ---------- Réviser : le travail du soir ---------- */

function PreparerScene() {
  return (
    <>
      <Stars count={46} maxY={300} />
      {/* Croissant de lune */}
      <circle cx="1240" cy="170" r="44" fill="#F3E7C4" />
      <circle cx="1262" cy="156" r="40" fill="#121D33" />
      <Hills far="#17243A" mid="#1B2F3D" near="#203A30" />
      <Jacaranda x={780} y={456} scale={1.4} />
      {/* Maison dont les fenêtres restent allumées */}
      <g transform="translate(900 470) scale(1.9)">
        <circle cx="16" cy="-49" r="18" fill={P.soleil} opacity="0.18" className="a-glow" />
        <circle cx="56" cy="-49" r="18" fill={P.soleil} opacity="0.18" className="a-glow" />
      </g>
      <HighlandHouse x={900} y={470} scale={1.9} />
      <g transform="translate(900 470) scale(1.9)" fill={P.soleilLight}>
        <rect x="10" y="-56" width="12" height="14" />
        <rect x="50" y="-56" width="12" height="14" />
        <path d="M16 -56 L16 -42 M56 -56 L56 -42" stroke={P.wood} strokeWidth="1.2" />
        {/* Lampe de bureau devant la fenêtre gauche */}
        <path d="M12 -44 L14 -50 L18 -50" stroke={P.ink} strokeWidth="1" fill="none" />
        <path d="M16 -52 L21 -52 L19 -49 Z" fill={P.ink} />
      </g>
      {/* Pile de livres au pied de la maison */}
      <g transform="translate(1100 470)">
        <rect x="-26" y="-12" width="52" height="12" rx="2" fill={P.mena} />
        <rect x="-22" y="-23" width="44" height="11" rx="2" fill={P.vertLight} />
        <rect x="-24" y="-33" width="48" height="10" rx="2" fill={P.soleil} />
      </g>
      <Ravinala x={1330} y={500} scale={1.3} />
      {/* Lucioles */}
      {[
        [700, 380],
        [1030, 330],
        [1180, 400],
        [1280, 350],
        [860, 300],
      ].map(([x, y], i) => (
        <g key={i} className="a-float" style={{ animationDelay: `${-i * 0.7}s` }}>
          <Sparkle x={x} y={y} r={5} fill={P.soleilLight} />
        </g>
      ))}
    </>
  );
}

/* ---------- Jour J : le lycée à 7 h ---------- */

function JourJScene() {
  return (
    <>
      <circle cx="1330" cy="250" r="60" fill={P.soleil} opacity="0.9" />
      <Hills far="#2A4C54" mid="#2F6454" near="#2F7E5C" />
      {/* Brume du matin */}
      <rect x="0" y="300" width="1440" height="26" fill={P.paper} opacity="0.07" />
      <rect x="0" y="336" width="1440" height="16" fill={P.paper} opacity="0.05" />
      {/* Le lycée */}
      <g transform="translate(700 476)">
        <rect x="0" y="-120" width="560" height="120" fill="#EDE4D2" />
        <path d="M-18 -120 L20 -150 L540 -150 L578 -120 Z" fill={P.brick} />
        {/* Pignon central et son horloge : 7 h */}
        <path d="M220 -120 L280 -190 L340 -120 Z" fill="#E2D6BF" />
        <path d="M208 -118 L280 -202 L352 -118" stroke={P.brick} strokeWidth="10" fill="none" />
        <circle cx="280" cy="-150" r="22" fill={P.white} stroke={P.ink} strokeWidth="3" />
        <path
          d="M280 -150 L280 -166 M280 -150 L269 -144"
          stroke={P.ink}
          strokeWidth="3"
          strokeLinecap="round"
        />
        {[30, 90, 150, 380, 440, 500].map((x) => (
          <g key={x}>
            <rect x={x} y="-100" width="36" height="40" fill={P.glass} />
            <path d={`M${x + 18} -100 L${x + 18} -60`} stroke="#EDE4D2" strokeWidth="2" />
          </g>
        ))}
        <rect x="245" y="-84" width="70" height="84" fill={P.roof} />
        <rect x="230" y="-112" width="100" height="20" rx="3" fill={P.vert} />
        <text x="280" y="-97" fontSize="13" textAnchor="middle" fill={P.white} style={TXT}>
          LYCÉE
        </text>
        <MadaFlag x={280} y={-200} scale={0.6} />
      </g>
      {/* Grille de l'entrée */}
      <g stroke="#C9CFCB" strokeWidth="3">
        {Array.from({ length: 14 }, (_, i) => (
          <path key={i} d={`M${700 + i * 14} 510 L${700 + i * 14} 474`} />
        ))}
        {Array.from({ length: 14 }, (_, i) => (
          <path key={i} d={`M${1080 + i * 14} 510 L${1080 + i * 14} 474`} />
        ))}
      </g>
      <Ravinala x={620} y={500} scale={1.2} />
    </>
  );
}

/* ---------- Résultats (guide) : et la suite ---------- */

function Cap({
  x,
  y,
  r = 0,
  s = 1,
  className,
  style,
}: {
  x: number;
  y: number;
  r?: number;
  s?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <g className={className} style={style}>
      <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
        <path d="M-26 0 L0 -12 L26 0 L0 12 Z" fill={P.ink} />
        <path d="M-14 5 L-14 16 Q0 24 14 16 L14 5 L0 12 Z" fill="#1F3A30" />
        <path d="M0 0 L20 8 L20 22" stroke={P.soleil} strokeWidth="2" fill="none" />
        <circle cx="20" cy="24" r="3" fill={P.soleil} />
      </g>
    </g>
  );
}

function SuiteScene() {
  return (
    <>
      <circle cx="1120" cy="320" r="130" fill={P.soleil} opacity="0.16" className="a-glow" />
      <circle cx="1120" cy="320" r="86" fill={P.soleil} />
      <Hills far="#3C2A44" mid="#4B3448" near="#3E5A3A" />
      {/* L'université à l'horizon */}
      <g transform="translate(1050 300)">
        <rect x="0" y="-40" width="140" height="40" fill="#E8DCC6" />
        <path d="M44 -40 Q70 -86 96 -40 Z" fill="#D8C8A8" />
        <rect x="66" y="-92" width="8" height="10" fill="#D8C8A8" />
        {[14, 36, 104, 126].map((x) => (
          <rect key={x} x={x - 4} y="-34" width="8" height="30" fill="#C4B292" />
        ))}
      </g>
      <Road from={[900, 545, 220]} to={[1120, 302, 10]} bend={[40, 20]} fill="#C77A58" dash={P.paper} />
      <Ravinala x={1330} y={500} scale={1.3} />
      <Ravinala x={700} y={480} scale={1.05} />
      {/* Les toques s'envolent */}
      <Cap x={760} y={250} r={-18} s={1.2} className="a-float" />
      <Cap x={880} y={190} r={12} className="a-float" style={{ animationDelay: "-1.2s" }} />
      <Cap x={1000} y={230} r={-8} s={0.9} className="a-float" style={{ animationDelay: "-0.6s" }} />
      <Cap x={1270} y={200} r={20} s={1.1} className="a-float" style={{ animationDelay: "-1.8s" }} />
      {[
        [820, 300, P.mena],
        [940, 150, P.vertLight],
        [1060, 180, P.soleilLight],
        [1200, 150, P.mena],
        [1340, 260, P.vertLight],
        [700, 180, P.soleilLight],
      ].map(([x, y, c], i) => (
        <rect
          key={i}
          x={x as number}
          y={y as number}
          width="8"
          height="4"
          rx="1"
          fill={c as string}
          transform={`rotate(${i * 37} ${x} ${y})`}
          className="a-float"
        />
      ))}
    </>
  );
}

/* ---------- Actualités : le tableau d'affichage de la place ---------- */

/** Communiqué punaisé : feuille, bandeau de titre, lignes de texte. */
function Notice({
  x,
  y,
  w,
  h,
  r = 0,
  head,
  label,
  pin,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  r?: number;
  head: string;
  label?: string;
  pin: string;
}) {
  const lines = Math.max(1, Math.floor((h - 34) / 10));
  return (
    <g transform={`rotate(${r} ${x + w / 2} ${y})`}>
      <rect x={x + 3} y={y + 3} width={w} height={h} fill="#00000030" />
      <rect x={x} y={y} width={w} height={h} fill={P.paper} />
      <rect x={x} y={y} width={w} height="20" fill={head} />
      {label && (
        <text x={x + w / 2} y={y + 14} fontSize="10.5" textAnchor="middle" fill={P.white} style={TXT}>
          {label}
        </text>
      )}
      {Array.from({ length: lines }, (_, i) => (
        <rect
          key={i}
          x={x + 8}
          y={y + 30 + i * 10}
          width={i === lines - 1 ? w * 0.45 : w - 16}
          height="3.5"
          rx="1.5"
          fill="#C9CFCB"
        />
      ))}
      <circle cx={x + w / 2} cy={y + 4} r="4" fill={pin} />
      <circle cx={x + w / 2 - 1} cy={y + 3} r="1.2" fill="#FFFFFF80" />
    </g>
  );
}

function ActualitesScene() {
  return (
    <>
      <circle cx="1290" cy="160" r="44" fill={P.soleilLight} />
      <Cloud x={920} y={150} scale={0.9} className="a-float" />
      <g className="a-float">
        <Bird x={1130} y={130} />
        <Bird x={1164} y={150} scale={0.7} />
      </g>
      <Hills far="#22435A" mid="#2B5B5A" near="#2F7A5A" />
      <HighlandHouse x={640} y={446} scale={1.1} />
      <Jacaranda x={1330} y={456} scale={1.35} />

      {/* Tableau d'affichage de la place, couvert de communiqués */}
      <g transform="translate(780 486)">
        <rect x="18" y="-60" width="10" height="60" fill="#5A4636" />
        <rect x="372" y="-60" width="10" height="60" fill="#5A4636" />
        <path d="M-14 -262 L200 -300 L414 -262 Z" fill={P.roof} />
        <rect x="0" y="-262" width="400" height="206" rx="4" fill="#7A5236" />
        <rect x="12" y="-250" width="376" height="182" fill="#C9A77A" />
        <Notice x={30} y={-240} w={92} h={112} r={-3} head={P.mena} label="URGENT" pin={P.mena} />
        <Notice x={140} y={-236} w={108} h={78} r={2} head={P.vert} label="BACC 2027" pin={P.soleil} />
        <Notice x={266} y={-242} w={100} h={96} r={-2} head={P.navy} label="COMMUNIQUÉ" pin={P.vertLight} />
        <Notice x={146} y={-148} w={96} h={70} r={-4} head={P.soleil} label="DATES" pin={P.mena} />
        <Notice x={40} y={-118} w={80} h={44} r={3} head={P.glass} pin={P.soleil} />
        <Notice x={262} y={-136} w={110} h={58} r={2} head={P.menaDark} label="RÉSULTATS" pin={P.navy} />
      </g>

      {/* Radio posée sur un banc : elle diffuse les nouvelles */}
      <g transform="translate(1250 500)">
        <rect x="-50" y="-30" width="100" height="8" rx="2" fill="#8C6A4A" />
        <rect x="-44" y="-22" width="6" height="22" fill="#6B4A3A" />
        <rect x="38" y="-22" width="6" height="22" fill="#6B4A3A" />
        <rect x="-26" y="-62" width="52" height="32" rx="6" fill={P.mena} />
        <circle cx="-10" cy="-46" r="9" fill={P.ink} />
        <circle cx="-10" cy="-46" r="4" fill="#3A4A43" />
        <rect x="4" y="-54" width="16" height="6" rx="2" fill={P.soleilLight} />
        <path d="M14 -62 L26 -86" stroke="#C9CFCB" strokeWidth="2" strokeLinecap="round" />
        <g stroke={P.soleilLight} strokeWidth="3" fill="none" strokeLinecap="round" className="a-glow">
          <path d="M34 -70 Q42 -58 34 -46" />
          <path d="M44 -78 Q56 -58 44 -38" opacity="0.6" />
        </g>
        {/* Pile de journaux */}
        <g transform="translate(-100 0)">
          <rect x="-24" y="-10" width="48" height="10" fill={P.paper} />
          <rect x="-22" y="-18" width="46" height="8" fill="#E6E0D2" />
          <rect x="-24" y="-26" width="48" height="8" fill={P.paper} />
          <path d="M-18 -22 L10 -22" stroke={P.ink} strokeWidth="1.5" />
          <path d="M-24 -14 L24 -14" stroke={P.mena} strokeWidth="2" />
        </g>
      </g>
    </>
  );
}

/* ---------- Aide : le phare qui guide ---------- */

function AideScene() {
  return (
    <>
      <Stars count={18} maxY={200} />
      <circle cx="760" cy="180" r="30" fill="#F3E7C4" opacity="0.9" />
      {/* Mer en bandes */}
      <rect x="0" y="330" width="1440" height="220" fill="#1F3D5A" />
      <rect x="0" y="380" width="1440" height="170" fill="#234866" />
      <rect x="0" y="440" width="1440" height="110" fill="#285373" />
      <g stroke="#6F93B3" strokeWidth="2" strokeLinecap="round" opacity="0.5" className="a-dash">
        <path d="M600 360 L660 360 M760 400 L840 400 M620 470 L700 470 M900 350 L950 350" />
      </g>
      {/* Falaise et phare */}
      <path
        d="M1080 540 L1100 400 C1140 360 1200 340 1260 336 C1340 334 1400 350 1440 360 L1440 540 Z"
        fill="#2B3A36"
      />
      <path
        d="M1100 400 C1140 360 1200 340 1260 336 L1270 350 C1210 356 1150 376 1110 410 Z"
        fill="#3A4E47"
      />
      <g transform="translate(1240 340)">
        {/* Faisceau */}
        <g className="a-glow" style={{ transformOrigin: "0% 50%" }}>
          <path d="M0 -168 L-330 -210 L-330 -130 Z" fill={P.soleilLight} opacity="0.18" />
        </g>
        <path d="M-18 0 L-12 -150 L12 -150 L18 0 Z" fill={P.white} />
        {[-24, -74, -124].map((y) => (
          <path
            key={y}
            d={`M${-17 + (y / -150) * 5} ${y} L${17 - (y / -150) * 5} ${y} L${16.4 - (y / -150) * 5} ${y - 22} L${-16.4 + (y / -150) * 5} ${y - 22} Z`}
            fill={P.mena}
          />
        ))}
        <rect x="-16" y="-156" width="32" height="8" fill={P.ink} />
        <rect x="-10" y="-178" width="20" height="22" fill={P.soleilLight} className="a-glow" />
        <path d="M-14 -178 L0 -194 L14 -178 Z" fill={P.mena} />
      </g>
      {/* Pirogue à voile guidée par le phare */}
      <g className="a-bob">
        <g transform="translate(840 440)">
          <path d="M-60 0 Q0 18 60 0 L52 -8 L-52 -8 Z" fill="#6B4A3A" />
          <rect x="-2" y="-110" width="4" height="102" fill={P.wood} />
          <path d="M2 -106 Q40 -60 44 -14 L2 -14 Z" fill={P.paper} />
        </g>
      </g>
    </>
  );
}

/* ---------- Résultats : feu d'artifice de la proclamation ---------- */

function Burst({
  x,
  y,
  r,
  color,
  delay = 0,
}: {
  x: number;
  y: number;
  r: number;
  color: string;
  delay?: number;
}) {
  return (
    <g className="a-glow" style={{ animationDelay: `${delay}s`, transformOrigin: `${x}px ${y}px` }}>
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2;
        const x1 = x + Math.cos(a) * r * 0.35;
        const y1 = y + Math.sin(a) * r * 0.35;
        const x2 = x + Math.cos(a) * r;
        const y2 = y + Math.sin(a) * r;
        return (
          <g key={i}>
            <path
              d={`M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`}
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle
              cx={(x + Math.cos(a) * r * 1.15).toFixed(1)}
              cy={(y + Math.sin(a) * r * 1.15).toFixed(1)}
              r="2.4"
              fill={color}
            />
          </g>
        );
      })}
    </g>
  );
}

function ResultatsScene() {
  return (
    <>
      <Stars count={40} maxY={320} />
      <Burst x={900} y={190} r={56} color={P.soleil} />
      <Burst x={1120} y={140} r={70} color={P.mena} delay={-1.5} />
      <Burst x={1310} y={230} r={48} color={P.vertLight} delay={-3} />
      <Burst x={760} y={120} r={36} color={P.soleilLight} delay={-2.2} />
      <path d="M1120 300 L1120 212" stroke={P.mena} strokeWidth="2" strokeDasharray="4 6" opacity="0.6" />
      <path d="M900 330 L900 250" stroke={P.soleil} strokeWidth="2" strokeDasharray="4 6" opacity="0.6" />
      <Hills far="#17243A" mid="#1C3040" near="#22402F" />
      {/* Lumières de la ville sur les collines */}
      <g fill={P.soleilLight}>
        {Array.from({ length: 34 }, (_, i) => (
          <rect
            key={i}
            x={640 + ((i * 97) % 760)}
            y={300 + ((i * 53) % 110)}
            width="4"
            height="4"
            opacity={i % 3 ? 0.8 : 0.4}
          />
        ))}
      </g>
      <Ravinala x={1330} y={500} scale={1.3} />
      <Ravinala x={640} y={490} scale={1.1} />
    </>
  );
}

const SCENES: Record<SceneName, { sky: string[]; draw: () => ReactNode }> = {
  guide: { sky: ["#2A2440", "#3A2C4A", "#553550", "#7A4A48"], draw: GuideScene },
  series: { sky: ["#16303A", "#1C3D48", "#244C58"], draw: SeriesScene },
  coefficients: { sky: ["#153846", "#1B4555", "#225364"], draw: CoefficientsScene },
  dossier: { sky: ["#18304A", "#1F3B56", "#284964"], draw: DossierScene },
  calendrier: { sky: ["#281F3E", "#3A2648", "#56304F", "#7A4150"], draw: CalendrierScene },
  preparer: { sky: ["#0E1729", "#111C32", "#15223D"], draw: PreparerScene },
  jourj: { sky: ["#1B3640", "#23474F", "#2F5A5E"], draw: JourJScene },
  suite: { sky: ["#271D38", "#3C2746", "#5C3448", "#864A47"], draw: SuiteScene },
  actualites: { sky: ["#15304A", "#1B3C56", "#244A64"], draw: ActualitesScene },
  aide: { sky: ["#18233B", "#1F2E4C", "#293B5E"], draw: AideScene },
  resultats: { sky: ["#0C1426", "#101B31", "#14223C"], draw: ResultatsScene },
};

/** Décor d'en-tête propre à une page. */
export function PageScene({
  name,
  framing = "wide",
  className,
}: {
  name: SceneName;
  framing?: "mobile" | "wide";
  className?: string;
}) {
  const scene = SCENES[name];
  return (
    <Frame framing={framing} className={className} sky={scene.sky}>
      {scene.draw()}
    </Frame>
  );
}

/** Décor d'un article, selon son thème. */
export const NEWS_SCENE = {
  reforme: "actualites",
  calendrier: "calendrier",
  coefficients: "coefficients",
  inscription: "dossier",
  sport: "jourj",
  resultats: "resultats",
} as const satisfies Record<string, SceneName>;
