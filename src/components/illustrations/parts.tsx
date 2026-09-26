/**
 * Éléments d'illustration Mianara, en aplats (pas de dégradés, charte v2) :
 * élèves en uniforme, ravinala, maison des Hautes Terres, taxi-brousse…
 * Les personnages gardent des proportions humaines et un visage lisible.
 */
import type { CSSProperties, ReactNode } from "react";

/** Palette fixe des illustrations (couleurs de marque + teintes de décor). */
export const P = {
  vert: "#0E6B4F",
  vertLight: "#15875F",
  vertDark: "#0A4A37",
  mena: "#C2492B",
  menaDark: "#8F331D",
  soleil: "#F2B33D",
  soleilLight: "#F7CF7A",
  ink: "#12241D",
  paper: "#F8F6F1",
  white: "#FFFFFF",
  line: "#D5DCD7",
  navy: "#24365F",
  navyDark: "#1A2848",
  brick: "#B8472A",
  roof: "#4A2419",
  wood: "#EADBC0",
  glass: "#2F4F63",
  trunk: "#8C7B69",
  hair: "#1B1512",
  jacaranda: "#9B80CF",
  skin: ["#8D5A3B", "#A86E47", "#6E4430", "#C48A5E"],
} as const;

type Pos = { x: number; y: number; scale?: number; flip?: boolean };

function place({ x, y, scale = 1, flip }: Pos, ox: number, oy: number) {
  return `translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale}) translate(${-ox} ${-oy})`;
}

/* ------------------------------------------------------------------ */
/* Élève                                                              */
/* ------------------------------------------------------------------ */

export type Hair = "braids" | "short" | "bun" | "afro" | "puffs";

type StudentProps = Pos & {
  skin?: string;
  hair?: Hair;
  bottom?: "skirt" | "pants";
  hold?: "book" | "phone" | "none";
  wave?: boolean;
  bag?: boolean;
  className?: string;
  style?: CSSProperties;
};

/** Élève debout, pieds centrés en (x, y). Hauteur ≈ 158 × scale. */
export function Student({
  skin = P.skin[0],
  hair = "short",
  bottom = "pants",
  hold = "none",
  wave = false,
  bag = false,
  className,
  style,
  ...pos
}: StudentProps) {
  return (
    <g transform={place(pos, 30, 158)}>
      <g className={className} style={style}>
        {/* Cheveux derrière la tête */}
        {hair === "afro" && <circle cx="30" cy="14" r="14.5" fill={P.hair} />}
        {hair === "braids" && (
          <g stroke={P.hair} strokeWidth="4" strokeLinecap="round" fill="none" strokeDasharray="3.2 1.2">
            <path d="M21.5 17 C18 27 18.5 38 20 47" />
            <path d="M38.5 17 C42 27 41.5 38 40 47" />
          </g>
        )}

        {/* Sac à dos */}
        {bag && <rect x="10" y="40" width="12" height="28" rx="4.5" fill={P.mena} />}

        {/* Jambes et bas */}
        {bottom === "skirt" ? (
          <>
            <g stroke={skin} strokeWidth="6" strokeLinecap="round">
              <path d="M24 108 L23.5 149" />
              <path d="M36 108 L36.5 149" />
            </g>
            <g stroke={P.white} strokeWidth="6.4" strokeLinecap="round">
              <path d="M23.5 145 L23.5 149" />
              <path d="M36.5 145 L36.5 149" />
            </g>
            <path d="M18 80 L42 80 L47.5 113 L12.5 113 Z" fill={P.navy} />
            <g stroke={P.navyDark} strokeWidth="1">
              <path d="M24 82 L21.5 112" />
              <path d="M30 82 L30 112" />
              <path d="M36 82 L38.5 112" />
            </g>
          </>
        ) : (
          <path d="M18.5 80 L41.5 80 L42.5 150 L32.5 150 L30 100 L27.5 150 L17.5 150 Z" fill={P.navy} />
        )}
        <rect x="16" y="149" width="13" height="7" rx="3.5" fill={P.ink} />
        <rect x="31" y="149" width="13" height="7" rx="3.5" fill={P.ink} />

        {/* Bras arrière (tombant) */}
        <path
          d="M18.5 40 C14.5 52 13.5 64 14.2 77"
          stroke={skin}
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M18.5 40 C16.6 45 15.8 49 15.5 53"
          stroke={P.white}
          strokeWidth="8.5"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="14.3" cy="79" r="3.6" fill={skin} />

        {/* Cou et chemise */}
        <rect x="26.5" y="25" width="7" height="11" rx="2" fill={skin} />
        <path
          d="M17 43 Q17 35.5 24 34.5 L36 34.5 Q43 35.5 43 43 L42 82 L18 82 Z"
          fill={P.white}
          stroke={P.line}
          strokeWidth="1"
        />
        <path d="M26.3 34.5 L30 39.5 L33.7 34.5 Z" fill={skin} />
        <path
          d="M24.5 34.2 L30 40 L27 44 Z M35.5 34.2 L30 40 L33 44 Z"
          fill={P.paper}
          stroke={P.line}
          strokeWidth="0.8"
        />
        <g fill={P.line}>
          <circle cx="30" cy="52" r="0.9" />
          <circle cx="30" cy="62" r="0.9" />
          <circle cx="30" cy="72" r="0.9" />
        </g>
        {bag && <path d="M20 36 L21.5 62" stroke={P.menaDark} strokeWidth="2.6" strokeLinecap="round" />}

        {/* Bras avant */}
        {wave ? (
          <g className="a-wave" style={{ transformOrigin: "0% 100%" }}>
            <path
              d="M41.5 40 C46 33 48.5 26 49.5 16"
              stroke={skin}
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M41.5 40 C43.5 36.5 45 34 46 31"
              stroke={P.white}
              strokeWidth="8.5"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="49.6" cy="12.5" r="3.8" fill={skin} />
          </g>
        ) : hold === "book" ? (
          <>
            <path
              d="M41.5 40 C45 50 45 58 42.5 64 C39 66 35 66 31.5 64.5"
              stroke={skin}
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M41.5 40 C43.2 44 44 48 44.2 52"
              stroke={P.white}
              strokeWidth="8.5"
              strokeLinecap="round"
              fill="none"
            />
            <rect x="21" y="52" width="17" height="21" rx="1.6" fill={P.mena} />
            <rect x="21" y="52" width="3" height="21" rx="1" fill={P.menaDark} />
            <rect x="27" y="57" width="8" height="2" rx="1" fill={P.soleil} />
            <circle cx="31" cy="64.5" r="3.6" fill={skin} />
          </>
        ) : hold === "phone" ? (
          <>
            <path
              d="M41.5 40 C45 50 45 57 42 61 C39 62.5 36.5 62 34.5 60.5"
              stroke={skin}
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M41.5 40 C43.2 44 44 48 44.2 52"
              stroke={P.white}
              strokeWidth="8.5"
              strokeLinecap="round"
              fill="none"
            />
            <rect x="29.5" y="49" width="9" height="15" rx="2" fill={P.ink} />
            <rect x="30.8" y="50.6" width="6.4" height="11" rx="1" fill={P.soleilLight} />
            <circle cx="34.5" cy="60.5" r="3.4" fill={skin} />
          </>
        ) : (
          <>
            <path
              d="M41.5 40 C45.5 52 46.5 64 45.8 77"
              stroke={skin}
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M41.5 40 C43.4 45 44.2 49 44.5 53"
              stroke={P.white}
              strokeWidth="8.5"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="45.7" cy="79" r="3.6" fill={skin} />
          </>
        )}

        {/* Tête */}
        <circle cx="20.6" cy="19.5" r="2.2" fill={skin} />
        <circle cx="39.4" cy="19.5" r="2.2" fill={skin} />
        <ellipse cx="30" cy="18" rx="9.6" ry="11" fill={skin} />
        <Face />
        <HairFront hair={hair} />
      </g>
    </g>
  );
}

function Face() {
  return (
    <>
      <g className="a-blink">
        <ellipse cx="26.2" cy="18.8" rx="1.15" ry="1.45" fill={P.ink} />
        <ellipse cx="33.8" cy="18.8" rx="1.15" ry="1.45" fill={P.ink} />
      </g>
      <g stroke={P.ink} strokeWidth="0.9" strokeLinecap="round" fill="none">
        <path d="M24.2 15.4 Q26.2 14.3 28.1 15.1" />
        <path d="M31.9 15.1 Q33.8 14.3 35.8 15.4" />
      </g>
      <path
        d="M30.2 20.6 Q31.4 22.8 29.7 23.2"
        stroke="#00000033"
        strokeWidth="0.9"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M27 25.2 Q30 28.8 33 25.2 Z" fill="#7A2E1F" />
      <circle cx="24" cy="23.3" r="1.7" fill={P.mena} opacity="0.22" />
      <circle cx="36" cy="23.3" r="1.7" fill={P.mena} opacity="0.22" />
    </>
  );
}

function HairFront({ hair }: { hair: Hair }) {
  const cap =
    "M20.4 18 C19.4 6.5 25.8 3.6 30 3.6 C34.2 3.6 40.6 6.5 39.6 18 C38.2 11.2 34.3 9.2 30 9.2 C25.7 9.2 21.8 11.2 20.4 18 Z";
  switch (hair) {
    case "short":
      return (
        <path
          d="M20.6 16.5 C20 7 25.8 4.8 30 4.8 C34.4 4.8 40.2 7 39.4 16.5 C37 12 33.4 10.6 30 10.6 C26.4 10.6 22.8 12 20.6 16.5 Z"
          fill={P.hair}
        />
      );
    case "afro":
      return (
        <path
          d="M19.8 15 C21 8.5 25.5 6.8 30 6.8 C34.5 6.8 39 8.5 40.2 15 C37 11.5 33.5 10.8 30 10.8 C26.5 10.8 23 11.5 19.8 15 Z"
          fill={P.hair}
        />
      );
    case "braids":
      return (
        <>
          <path d={cap} fill={P.hair} />
          <path d="M30 3.8 L30 9" stroke={P.skin[1]} strokeWidth="0.8" opacity="0.6" />
        </>
      );
    case "bun":
      return (
        <>
          <circle cx="30" cy="3.2" r="5" fill={P.hair} />
          <path d={cap} fill={P.hair} />
        </>
      );
    case "puffs":
      return (
        <>
          <circle cx="20" cy="6.5" r="5.2" fill={P.hair} />
          <circle cx="40" cy="6.5" r="5.2" fill={P.hair} />
          <path d={cap} fill={P.hair} />
        </>
      );
  }
}

/** Buste souriant (avatar de l'assistant, vignettes). Centre du visage en (x, y). */
export function Bust({
  skin = P.skin[1],
  hair = "bun",
  shirt = P.vert,
  ...pos
}: Pos & { skin?: string; hair?: Hair; shirt?: string }) {
  return (
    <g transform={place(pos, 30, 18)}>
      {hair === "afro" && <circle cx="30" cy="14" r="14.5" fill={P.hair} />}
      {hair === "braids" && (
        <g stroke={P.hair} strokeWidth="4" strokeLinecap="round" fill="none" strokeDasharray="3.2 1.2">
          <path d="M21.5 17 C18 27 18.5 38 20 44" />
          <path d="M38.5 17 C42 27 41.5 38 40 44" />
        </g>
      )}
      <path d="M8 60 C8 44 16 37 30 37 C44 37 52 44 52 60 Z" fill={shirt} />
      <path d="M25.5 37 L30 43 L34.5 37 Z" fill={skin} />
      <rect x="26.5" y="25" width="7" height="12" rx="2" fill={skin} />
      <circle cx="20.6" cy="19.5" r="2.2" fill={skin} />
      <circle cx="39.4" cy="19.5" r="2.2" fill={skin} />
      <ellipse cx="30" cy="18" rx="9.6" ry="11" fill={skin} />
      <Face />
      <HairFront hair={hair} />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Décor                                                              */
/* ------------------------------------------------------------------ */

const LEAF_ANGLES = [-78, -62, -46, -30, -15, 0, 15, 30, 46, 62, 78];

/** Ravinala (arbre du voyageur), base du tronc en (x, y). Hauteur ≈ 150 × scale. */
export function Ravinala({ sway = true, ...pos }: Pos & { sway?: boolean }) {
  return (
    <g transform={place(pos, 0, 0)}>
      <path d="M-5.5 0 L-3.6 -72 L3.6 -72 L5.5 0 Z" fill={P.trunk} />
      <g stroke="#6F6152" strokeWidth="1" opacity="0.7">
        {[-12, -26, -40, -54].map((y) => (
          <path key={y} d={`M-4.6 ${y} L4.6 ${y}`} />
        ))}
      </g>
      <g className={sway ? "a-sway-slow" : undefined} style={{ transformOrigin: "50% 92%" }}>
        {LEAF_ANGLES.map((a, i) => {
          const len = 1 - Math.abs(a) / 300;
          return (
            <g key={a} transform={`translate(0 -72) rotate(${a}) scale(${len})`}>
              <path d="M0 0 L0 -30" stroke="#5B7F4E" strokeWidth="2.4" strokeLinecap="round" />
              <path
                d="M0 -28 C-8.5 -36 -9.5 -62 0 -80 C9.5 -62 8.5 -36 0 -28 Z"
                fill={i % 2 ? P.vert : P.vertLight}
              />
              <path d="M0 -30 L0 -78" stroke={P.vertDark} strokeWidth="1" opacity="0.6" />
              <path
                d="M0 -44 L-6 -50 M0 -56 L6 -62 M0 -64 L-4.5 -69"
                stroke={P.paper}
                strokeWidth="0.9"
                opacity="0.55"
              />
            </g>
          );
        })}
      </g>
    </g>
  );
}

/** Jacaranda en fleur, base en (x, y). */
export function Jacaranda(pos: Pos) {
  return (
    <g transform={place(pos, 0, 0)}>
      <path
        d="M-3 0 L-2 -34 L-12 -52 M-2 -34 L8 -56 M-1.5 -40 L0 -60"
        stroke={P.trunk}
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <g fill={P.jacaranda}>
        <circle cx="-14" cy="-58" r="14" />
        <circle cx="4" cy="-68" r="17" />
        <circle cx="18" cy="-54" r="13" />
        <circle cx="-2" cy="-50" r="12" />
      </g>
      <g fill="#B8A2E0">
        <circle cx="-10" cy="-64" r="4" />
        <circle cx="8" cy="-76" r="5" />
        <circle cx="20" cy="-58" r="3.5" />
      </g>
    </g>
  );
}

/** Maison à étage des Hautes Terres, avec varangue. Coin bas-gauche en (x, y). */
export function HighlandHouse(pos: Pos) {
  return (
    <g transform={place(pos, 0, 0)}>
      <rect x="0" y="-62" width="72" height="62" fill={P.brick} />
      <path d="M-7 -62 L36 -100 L79 -62 Z" fill={P.roof} />
      <rect x="31" y="-86" width="10" height="10" rx="1" fill={P.wood} />
      {/* Fenêtres de l'étage */}
      {[10, 50].map((x) => (
        <g key={x}>
          <rect x={x} y="-56" width="12" height="14" fill={P.glass} stroke={P.wood} strokeWidth="2" />
          <path d={`M${x + 6} -56 L${x + 6} -42`} stroke={P.wood} strokeWidth="1.2" />
        </g>
      ))}
      {/* Varangue */}
      <rect x="-3" y="-36" width="78" height="4" fill={P.wood} />
      {[0, 17, 34, 51, 68].map((x) => (
        <rect key={x} x={x} y="-32" width="3.5" height="32" fill={P.wood} />
      ))}
      <path d="M0 -24 L72 -24" stroke={P.wood} strokeWidth="1.5" />
      <rect x="30" y="-24" width="12" height="24" fill={P.roof} />
    </g>
  );
}

/** Taxi-brousse chargé, roues au sol en (x, y). Longueur ≈ 92 × scale. */
export function TaxiBrousse({
  className,
  style,
  ...pos
}: Pos & { className?: string; style?: CSSProperties }) {
  return (
    <g className={className} style={style}>
      <g transform={place(pos, 44, 0)}>
        {/* Bagages sur le toit */}
        <rect x="6" y="-48" width="16" height="11" rx="2" fill={P.soleil} />
        <rect x="23" y="-51" width="20" height="14" rx="3" fill={P.vert} />
        <rect x="44" y="-47" width="14" height="10" rx="2" fill={P.mena} />
        <rect x="59" y="-45" width="10" height="8" rx="2" fill={P.navy} />
        <path d="M4 -37 L72 -37" stroke={P.ink} strokeWidth="1.5" />
        <path d="M14 -48 L30 -37 M34 -51 L50 -37" stroke={P.wood} strokeWidth="1" />
        {/* Carrosserie */}
        <path
          d="M0 -8 L0 -31 Q0 -37 6 -37 L66 -37 Q72 -37 75 -31 L84 -19 Q88 -17 88 -12 L88 -8 Z"
          fill="#F4EFE4"
        />
        <rect x="0" y="-20" width="88" height="4" fill={P.mena} />
        <rect x="0" y="-15" width="88" height="2" fill={P.vert} />
        {[5, 19, 33, 47].map((x) => (
          <rect key={x} x={x} y="-33" width="12" height="10" rx="1.5" fill={P.glass} />
        ))}
        <path d="M62 -33 L71 -33 L79 -22 L62 -22 Z" fill={P.glass} />
        <rect x="84" y="-13" width="4" height="3" rx="1" fill={P.soleil} />
        <rect x="-1" y="-10" width="90" height="3" rx="1.5" fill={P.ink} opacity="0.8" />
        {/* Roues */}
        {[18, 68].map((x) => (
          <g key={x}>
            <circle cx={x} cy="-5" r="7" fill={P.ink} />
            <g className="a-wheel">
              <circle cx={x} cy="-5" r="3" fill="#9AA5A0" />
              <path d={`M${x - 3} -5 L${x + 3} -5 M${x} -8 L${x} -2`} stroke={P.ink} strokeWidth="1" />
            </g>
          </g>
        ))}
      </g>
    </g>
  );
}

export function Cloud({ className, style, ...pos }: Pos & { className?: string; style?: CSSProperties }) {
  return (
    <g className={className} style={style}>
      <g transform={place(pos, 0, 0)} fill="var(--ill-cloud)">
        <rect x="-34" y="-12" width="70" height="16" rx="8" />
        <circle cx="-10" cy="-14" r="13" />
        <circle cx="10" cy="-18" r="16" />
      </g>
    </g>
  );
}

export function Bird({ x, y, scale = 1 }: Pos) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${scale})`}
      d="M-8 0 Q-4 -5 0 0 Q4 -5 8 0"
      stroke={P.ink}
      strokeWidth="1.6"
      fill="none"
      strokeLinecap="round"
    />
  );
}

/** Bulle de dialogue avec un texte court. */
export function Bubble({
  x,
  y,
  children,
  width = 70,
  className,
}: {
  x: number;
  y: number;
  children: ReactNode;
  width?: number;
  className?: string;
}) {
  return (
    <g className={className}>
      <g transform={`translate(${x} ${y})`}>
        <rect
          x={-width / 2}
          y="-30"
          width={width}
          height="26"
          rx="13"
          fill={P.white}
          stroke={P.ink}
          strokeWidth="1.5"
        />
        <path
          d="M-6 -4.8 L-2 4 L4 -4.8"
          fill={P.white}
          stroke={P.ink}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <rect x="-7" y="-6.5" width="12" height="3" fill={P.white} />
        <text
          x="0"
          y="-12.5"
          textAnchor="middle"
          fontSize="12"
          fontWeight="800"
          fill={P.ink}
          fontFamily="var(--font-jakarta), system-ui, sans-serif"
        >
          {children}
        </text>
      </g>
    </g>
  );
}

/** Petite étoile à quatre branches (récompense, étincelle). */
export function Sparkle({
  x,
  y,
  r = 6,
  fill = P.soleil,
  className,
}: {
  x: number;
  y: number;
  r?: number;
  fill?: string;
  className?: string;
}) {
  return (
    <g className={className}>
      <path
        transform={`translate(${x} ${y})`}
        d={`M0 ${-r} Q${r * 0.18} ${-r * 0.18} ${r} 0 Q${r * 0.18} ${r * 0.18} 0 ${r} Q${-r * 0.18} ${r * 0.18} ${-r} 0 Q${-r * 0.18} ${-r * 0.18} 0 ${-r} Z`}
        fill={fill}
      />
    </g>
  );
}
