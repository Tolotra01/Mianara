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

/** Assombrit une couleur hexadécimale (ombres en aplat, sans dégradé). */
function shade(hex: string, factor = 0.8): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) =>
    Math.round(v * factor)
      .toString(16)
      .padStart(2, "0");
  return `#${c((n >> 16) & 255)}${c((n >> 8) & 255)}${c(n & 255)}`;
}

/** Symétrique d'un tracé par rapport à l'axe du corps (x = 30). */
const MIRROR = "matrix(-1 0 0 1 60 0)";

const SHIRT_SHADE = "#E4EAE6";

/** Tête légèrement agrandie, ancrée au menton : un visage plus lisible et plus chaleureux. */
const HEAD_SCALE = "translate(30 29.4) scale(1.1) translate(-30 -29.4)";
const SOLE = "#3A4A43";

/* Bras tombant côté gauche du dessin : épaule, coude, poignet, main.
   Le bras droit est le même tracé passé en miroir. */
const ARM_DOWN =
  "M20.2 42 C18.8 49 17.9 55 17.6 60.5 C17.5 66 17.6 71.5 17.4 76.8 L13.8 76.8 C13.5 71.5 13.2 66 13.3 60 C13.4 54.5 14.2 48.5 15.6 42 Z";
const HAND_DOWN =
  "M13.4 76 C12.4 78.6 12.5 82.2 14.3 83.8 C15.9 85.1 17.9 84.2 18.1 81.6 C18.3 79.6 17.9 77.6 17.6 76 Z";
const SLEEVE = "M21.2 36.4 C17.6 36.9 15 39.4 14.3 43.4 L13.4 50.2 C15.6 51.5 18 51.7 20.2 51.1 L21.6 44 Z";

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
  const skinShade = shade(skin, 0.8);
  const rightArm = wave ? "wave" : hold === "book" ? "book" : hold === "phone" ? "phone" : "down";

  return (
    <g transform={place(pos, 30, 158)}>
      {/* Ombre au sol */}
      <ellipse cx="30" cy="157" rx="17" ry="2.4" fill="#000" opacity="0.14" />
      <g className={className} style={style}>
        <g transform={HEAD_SCALE}>
          <HairBack hair={hair} />
        </g>

        {/* Sac à dos (dépasse derrière l'épaule gauche) */}
        {bag && (
          <>
            <rect x="9.5" y="40" width="13" height="30" rx="5" fill={P.mena} />
            <rect x="9.5" y="58" width="13" height="7" rx="2.5" fill={P.menaDark} />
          </>
        )}

        {/* Jambes et bas */}
        {bottom === "skirt" ? <SkirtLegs skin={skin} skinShade={skinShade} /> : <Pants />}
        <Shoes />

        {/* Bras gauche (tombant), derrière le torse */}
        <path d={ARM_DOWN} fill={skin} />
        <path
          d="M17.6 60.5 C17.5 66 17.6 71.5 17.4 76.8 L16.2 76.8 C16.4 70 16.4 65 16.2 60.5 Z"
          fill={skinShade}
        />
        <path d={HAND_DOWN} fill={skin} />
        <path d="M15.2 79.6 L15.6 83.2" stroke={skinShade} strokeWidth="0.7" strokeLinecap="round" />

        {/* Cou */}
        <rect x="26.6" y="24" width="6.8" height="13" rx="2.6" fill={skin} />
        <path d="M26.6 27.5 Q30 31.5 33.4 27.5 L33.4 31 Q30 33.6 26.6 31 Z" fill={skinShade} />

        {/* Chemise d'uniforme, rentrée à la taille */}
        <path
          d="M17.4 44 C17.4 38.6 20.4 35.6 25.2 35 L34.8 35 C39.6 35.6 42.6 38.6 42.6 44 L41.4 71 C41.2 76.5 40.6 80 40.4 83 L19.6 83 C19.4 80 18.8 76.5 18.6 71 Z"
          fill={P.white}
          stroke={P.line}
          strokeWidth="0.8"
        />
        <path
          d="M37.6 36 C40.6 37.6 42.6 40.4 42.6 44 L41.4 71 C41.2 76.5 40.6 80 40.4 83 L37.4 83 C38.4 74 38.6 56 37.6 36 Z"
          fill={SHIRT_SHADE}
        />
        <path
          d="M22 70 Q25 72.5 28.4 71.2 M33 76 Q36 77.6 39 76.4"
          stroke={P.line}
          strokeWidth="0.7"
          fill="none"
          strokeLinecap="round"
        />
        {/* Encolure : peau en V, puis col */}
        <path d="M26.4 35 L30 40.4 L33.6 35 Z" fill={skin} />
        <path
          d="M24.2 34.4 L30 40.6 L26.6 45 L22.6 36.4 Z"
          fill={P.paper}
          stroke={P.line}
          strokeWidth="0.7"
          strokeLinejoin="round"
        />
        <path
          d="M35.8 34.4 L30 40.6 L33.4 45 L37.4 36.4 Z"
          fill={P.paper}
          stroke={P.line}
          strokeWidth="0.7"
          strokeLinejoin="round"
        />
        <path d="M30 41 L30 82" stroke={P.line} strokeWidth="0.7" />
        <g fill="#C9D1CC">
          <circle cx="30.9" cy="50" r="0.85" />
          <circle cx="30.9" cy="60" r="0.85" />
          <circle cx="30.9" cy="70" r="0.85" />
        </g>
        {/* Poche de poitrine */}
        <path
          d="M34 47 L38.6 47 L38.4 52.4 Q36.3 53.6 34.2 52.4 Z"
          fill="none"
          stroke={P.line}
          strokeWidth="0.7"
        />
        {bottom === "pants" && <Belt />}

        {/* Manche gauche */}
        <path d={SLEEVE} fill={P.white} stroke={P.line} strokeWidth="0.8" />
        <path d="M14 47.6 Q16.8 49 20.4 48.4" stroke={P.line} strokeWidth="0.7" fill="none" />

        {/* Bretelles du sac */}
        {bag && (
          <>
            <path
              d="M22.6 36 C21.8 44 21.6 52 22.4 61"
              stroke={P.menaDark}
              strokeWidth="2.6"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M37.4 36 C38.2 44 38.4 52 37.6 61"
              stroke={P.menaDark}
              strokeWidth="2.6"
              strokeLinecap="round"
              fill="none"
            />
          </>
        )}

        <RightArm pose={rightArm} skin={skin} skinShade={skinShade} />

        {/* Tête */}
        <Head skin={skin} skinShade={skinShade} hair={hair} />
      </g>
    </g>
  );
}

function Pants() {
  return (
    <>
      <path
        d="M18.8 81 L41.2 81 C41.9 96 42.4 121 42.3 149 L32.8 149 L30.5 100 L29.5 100 L27.2 149 L17.7 149 C17.6 121 18.1 96 18.8 81 Z"
        fill={P.navy}
      />
      {/* Plis et ombre intérieure des jambes */}
      <path
        d="M30.5 100 L32.8 149 L35 149 L31.6 99 Z M29.5 100 L27.2 149 L25 149 L28.6 99 Z"
        fill={P.navyDark}
        opacity="0.55"
      />
      <g stroke={P.navyDark} strokeWidth="0.8" strokeLinecap="round" fill="none">
        <path d="M30 84 L30 97" />
        <path d="M22.8 104 L22.4 146" opacity="0.6" />
        <path d="M37.2 104 L37.6 146" opacity="0.6" />
        <path d="M18.2 141 Q22.6 143 27.1 141" opacity="0.5" />
        <path d="M32.9 141 Q37.4 143 42 141" opacity="0.5" />
      </g>
    </>
  );
}

function SkirtLegs({ skin, skinShade }: { skin: string; skinShade: string }) {
  const leg =
    "M20.4 108 C20.2 117 20.6 125 21.6 131.5 C22.2 137 21.9 143 22 148.5 L26.4 148.5 C26.5 143 26.8 137.5 27.3 131.5 C27.9 124.5 28 116 27.8 108 Z";
  return (
    <>
      {[undefined, MIRROR].map((t) => (
        <g key={t ?? "g"} transform={t}>
          <path d={leg} fill={skin} />
          <path
            d="M26 112 C26.4 120 26.3 126 25.6 131.5 C25.2 136 25.1 142 25.1 148.5 L26.4 148.5 C26.5 143 26.8 137.5 27.3 131.5 C27.9 124.5 28 116 27.8 112 Z"
            fill={skinShade}
          />
          {/* Chaussette blanche */}
          <path d="M21.8 141.5 L26.6 141.5 L26.4 149 L22 149 Z" fill={P.white} />
          <path d="M21.8 143 L26.6 143" stroke={P.line} strokeWidth="0.6" />
        </g>
      ))}
      {/* Jupe plissée */}
      <path d="M18.6 80 L41.4 80 L47.2 112.5 Q30 116 12.8 112.5 Z" fill={P.navy} />
      <path d="M36 80 L41.4 80 L47.2 112.5 Q43.5 113.4 40 113.9 Z" fill={P.navyDark} opacity="0.45" />
      <g stroke={P.navyDark} strokeWidth="0.9" strokeLinecap="round">
        <path d="M24.2 84 L21 114.3" />
        <path d="M30 84 L30 115" />
        <path d="M35.8 84 L39 114.3" />
      </g>
      <rect x="18.4" y="79.6" width="23.2" height="3.6" rx="1.2" fill={P.navyDark} />
    </>
  );
}

function Shoes() {
  const shoe =
    "M16.4 154 C16.4 151.6 18.4 149.6 21.4 149.6 L26.4 149.6 C27.6 149.6 28.2 150.4 28.2 151.6 L28.2 154.6 C28.2 156 27.2 156.8 25.6 156.8 L18 156.8 C17 156.8 16.4 155.8 16.4 154 Z";
  return (
    <>
      {[undefined, MIRROR].map((t) => (
        <g key={t ?? "s"} transform={t}>
          <path d={shoe} fill={P.ink} />
          <path
            d="M16.5 155.4 L28.2 155.4 C28 156.3 27 156.8 25.6 156.8 L18 156.8 C17.2 156.8 16.7 156.3 16.5 155.4 Z"
            fill={SOLE}
          />
          <path
            d="M18.8 151.6 Q20.6 150.9 22.4 151.4"
            stroke="#FFFFFF40"
            strokeWidth="0.8"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      ))}
    </>
  );
}

function Belt() {
  return (
    <>
      <rect x="19.2" y="80.4" width="21.6" height="3.4" rx="1" fill={P.ink} />
      <rect
        x="28.2"
        y="80.1"
        width="3.8"
        height="4"
        rx="0.8"
        fill="none"
        stroke={P.soleil}
        strokeWidth="0.9"
      />
    </>
  );
}

function RightArm({
  pose,
  skin,
  skinShade,
}: {
  pose: "down" | "book" | "phone" | "wave";
  skin: string;
  skinShade: string;
}) {
  const sleeve = <path d={SLEEVE} fill={P.white} stroke={P.line} strokeWidth="0.8" />;

  if (pose === "down") {
    return (
      <g transform={MIRROR}>
        <path d={ARM_DOWN} fill={skin} />
        <path d="M13.3 60 C13.2 66 13.5 71.5 13.8 76.8 L15 76.8 C14.8 70 14.8 65 15 60 Z" fill={skinShade} />
        <path d={HAND_DOWN} fill={skin} />
        <path d="M15.2 79.6 L15.6 83.2" stroke={skinShade} strokeWidth="0.7" strokeLinecap="round" />
        {sleeve}
        <path d="M14 47.6 Q16.8 49 20.4 48.4" stroke={P.line} strokeWidth="0.7" fill="none" />
      </g>
    );
  }

  if (pose === "wave") {
    return (
      <g className="a-wave" style={{ transformOrigin: "0% 100%" }}>
        {/* Bras levé : épaule, coude plié, main ouverte */}
        <path
          d="M39.6 42 C42.6 37.6 45.4 33.4 46.8 28.8 C47.8 24.6 48.4 20.4 48.8 16.4 L52.6 16.8 C52.4 21.2 51.6 25.8 50.6 30.2 C49.2 35.4 46.4 40.4 43.2 44.6 Z"
          fill={skin}
        />
        <path
          d="M48.8 16.4 C48.4 20.4 47.8 24.6 46.8 28.8 L48.2 29.4 C49.2 25 49.8 20.6 50.2 16.6 Z"
          fill={skinShade}
        />
        {/* Main : paume, pouce et doigts */}
        <path
          d="M48.4 17.4 C47.4 15.4 47.6 12.6 48.4 10.4 L48.8 7.2 C48.9 6.1 50.3 6.1 50.3 7.2 L50.4 9.6 L50.8 5.9 C50.9 4.8 52.4 4.8 52.4 5.9 L52.4 9.6 L53.2 6.6 C53.5 5.5 54.9 5.8 54.7 6.9 L54 10.8 L55 9.4 C55.6 8.6 56.8 9.2 56.4 10.1 L54.4 15 C53.8 16.8 52.8 17.8 51.4 18 Z"
          fill={skin}
        />
        <path
          d="M48.6 13 C47.2 12.6 46.2 11.4 46.2 10.2 C46.2 9.4 47.2 9.2 47.8 9.8 L48.8 11"
          fill={skin}
          stroke={skinShade}
          strokeWidth="0.5"
        />
        {/* Manche relevée */}
        <path
          d="M37.6 36.4 C41.4 35.6 44.4 37 45.8 39.8 L43 45.6 C41 45 39.2 43.8 38 42.4 Z"
          fill={P.white}
          stroke={P.line}
          strokeWidth="0.8"
        />
      </g>
    );
  }

  const forearm =
    pose === "book"
      ? "M42.8 58 C43.4 62.6 40.8 64.8 36.6 65.4 L33.2 65.6 L33 61.8 L36.2 61.6 C38.8 61.2 40.2 60.2 40.6 57.4 Z"
      : "M42.8 56.4 C43.4 60.4 41.4 62.6 37.8 62.8 L35 62.9 L34.8 59.2 L37.4 59 C39.2 58.8 40.2 58.1 40.6 55.8 Z";

  return (
    <>
      {pose === "book" ? (
        <g transform="rotate(-6 29.5 62)">
          <rect x="21" y="51" width="17.5" height="22" rx="1.6" fill={P.mena} />
          <rect x="21" y="51" width="3.2" height="22" rx="1" fill={P.menaDark} />
          <rect x="27" y="56" width="8.4" height="2" rx="1" fill={P.soleil} />
          <rect x="27" y="60" width="6" height="1.4" rx="0.7" fill={P.soleilLight} opacity="0.7" />
        </g>
      ) : (
        <g transform="rotate(-8 34 56)">
          <rect x="30" y="47" width="9.4" height="16" rx="2.2" fill={P.ink} />
          <rect x="31.2" y="48.6" width="7" height="12" rx="1.2" fill={P.soleilLight} />
        </g>
      )}
      {/* Bras plié : de l'épaule au coude, puis l'avant-bras revient vers le torse */}
      <path d="M39.8 43 C41 48.6 41.8 53.4 42.2 58.6 L46 58.2 C46.2 53 45.8 48 44.4 42 Z" fill={skin} />
      <path d={forearm} fill={skin} />
      <path
        d={
          pose === "book"
            ? "M40.6 63.6 C38.8 64.8 37 65.2 35 65.5"
            : "M40.6 61.4 C39.2 62.4 37.8 62.8 36 62.9"
        }
        stroke={skinShade}
        strokeWidth="0.9"
        fill="none"
        strokeLinecap="round"
      />
      {/* Main qui tient l'objet : doigts repliés par-dessus */}
      <path
        d={
          pose === "book"
            ? "M34.6 60.8 C32.4 60.2 30.4 61.2 30.2 63.2 C30 65.2 31.8 66.6 34 66.4 L35.4 66.2 Z"
            : "M36.2 58.4 C34 57.8 32 58.8 31.8 60.8 C31.6 62.8 33.4 64.2 35.6 64 L37 63.8 Z"
        }
        fill={skin}
      />
      <path
        d={
          pose === "book"
            ? "M31 62.6 L33.6 62.6 M30.8 64.4 L33.4 64.6"
            : "M32.6 60.2 L35.2 60.2 M32.4 62 L35 62.2"
        }
        stroke={skinShade}
        strokeWidth="0.6"
        strokeLinecap="round"
      />
      <g transform={MIRROR}>
        <path d={SLEEVE} fill={P.white} stroke={P.line} strokeWidth="0.8" />
      </g>
    </>
  );
}

/** Tête : oreilles, visage à mâchoire douce, traits, cheveux devant. */
function Head({ skin, skinShade, hair }: { skin: string; skinShade: string; hair: Hair }) {
  return (
    <g transform={HEAD_SCALE}>
      <ellipse cx="20.3" cy="18.4" rx="2" ry="2.9" fill={skin} />
      <ellipse cx="39.7" cy="18.4" rx="2" ry="2.9" fill={skin} />
      <path
        d="M20.3 17.2 Q21 18.4 20.5 19.8 M39.7 17.2 Q39 18.4 39.5 19.8"
        stroke={skinShade}
        strokeWidth="0.7"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M20.4 16 C20.4 8.6 24.6 5 30 5 C35.4 5 39.6 8.6 39.6 16 C39.6 21 38.3 24.8 35.8 27.4 C34.1 29.1 32.2 29.8 30 29.8 C27.8 29.8 25.9 29.1 24.2 27.4 C21.7 24.8 20.4 21 20.4 16 Z"
        fill={skin}
      />
      <Face skinShade={skinShade} />
      <HairFront hair={hair} />
    </g>
  );
}

function Face({ skinShade }: { skinShade: string }) {
  return (
    <>
      {/* Sourcils */}
      <g fill={P.hair}>
        <path d="M23.4 14.6 Q25.8 12.8 28.4 13.8 L28.2 14.8 Q25.9 14.1 23.8 15.4 Z" />
        <path d="M36.6 14.6 Q34.2 12.8 31.6 13.8 L31.8 14.8 Q34.1 14.1 36.2 15.4 Z" />
      </g>
      {/* Yeux : blanc, iris, reflet — ils clignent ensemble */}
      <g className="a-blink">
        <ellipse cx="26" cy="18" rx="2" ry="1.45" fill={P.white} />
        <ellipse cx="34" cy="18" rx="2" ry="1.45" fill={P.white} />
        <circle cx="26.2" cy="18.1" r="1.2" fill={P.ink} />
        <circle cx="33.8" cy="18.1" r="1.2" fill={P.ink} />
        <circle cx="26.6" cy="17.6" r="0.42" fill={P.white} />
        <circle cx="34.2" cy="17.6" r="0.42" fill={P.white} />
      </g>
      <g stroke={P.ink} strokeWidth="0.75" strokeLinecap="round" fill="none">
        <path d="M23.8 17.6 Q26 15.9 28.3 17.3" />
        <path d="M36.2 17.6 Q34 15.9 31.7 17.3" />
      </g>
      {/* Nez */}
      <path
        d="M30.6 19.4 C31.2 20.8 31.6 21.8 31.4 22.4 C30.9 23 29.8 23.1 28.8 22.6"
        stroke={skinShade}
        strokeWidth="0.9"
        fill="none"
        strokeLinecap="round"
      />
      {/* Bouche souriante, dents visibles */}
      <path d="M26.6 24.6 Q30 28.2 33.4 24.6 Q30 25.5 26.6 24.6 Z" fill="#6B2418" />
      <path d="M27.4 24.9 Q30 25.7 32.6 24.9 L32.3 25.5 Q30 26.2 27.7 25.5 Z" fill={P.white} />
      <path
        d="M28.2 26.9 Q30 27.9 31.8 26.9"
        stroke="#8A3A2A"
        strokeWidth="0.5"
        fill="none"
        strokeLinecap="round"
        opacity="0.6"
      />
      {/* Joues */}
      <ellipse cx="23.4" cy="22.6" rx="1.9" ry="1.2" fill={P.mena} opacity="0.2" />
      <ellipse cx="36.6" cy="22.6" rx="1.9" ry="1.2" fill={P.mena} opacity="0.2" />
    </>
  );
}

/* Tresses : une suite de mèches croisées, terminées par une perle. */
function Plait({ x, drift }: { x: number; drift: number }) {
  return (
    <g>
      {Array.from({ length: 8 }, (_, i) => (
        <ellipse
          key={i}
          cx={x + drift * i}
          cy={20 + i * 3.5}
          rx="2.3"
          ry="2"
          fill={i % 2 ? "#2A201B" : P.hair}
          transform={`rotate(${i % 2 ? 20 : -20} ${x + drift * i} ${20 + i * 3.5})`}
        />
      ))}
      <circle cx={x + drift * 8} cy={48.6} r="1.5" fill={P.soleil} />
    </g>
  );
}

/** Cheveux qui passent derrière la tête et le corps. */
function HairBack({ hair }: { hair: Hair }) {
  switch (hair) {
    case "afro":
      return (
        <>
          <circle cx="30" cy="13.5" r="15.5" fill={P.hair} />
          <g fill="#2A201B">
            <circle cx="20" cy="6" r="1.4" />
            <circle cx="39" cy="5" r="1.2" />
            <circle cx="43" cy="14" r="1.3" />
            <circle cx="16.5" cy="15" r="1.1" />
          </g>
        </>
      );
    case "braids":
      return (
        <>
          <Plait x={21.4} drift={0} />
          <Plait x={38.6} drift={0} />
        </>
      );
    default:
      return null;
  }
}

function HairFront({ hair }: { hair: Hair }) {
  // Calotte avec raie au milieu, qui dégage le front.
  const cap =
    "M19.8 17.6 C19 7.2 24.4 3.8 30 3.8 C35.6 3.8 41 7.2 40.2 17.6 C39.2 12.8 36.8 10.2 33.2 9.4 Q31.4 10.8 30 9.8 Q28.6 10.8 26.8 9.4 C23.2 10.2 20.8 12.8 19.8 17.6 Z";
  const shine = (
    <path d="M24 6.8 Q27 5.4 30 5.6" stroke="#FFFFFF2E" strokeWidth="1" fill="none" strokeLinecap="round" />
  );
  switch (hair) {
    case "short":
      return (
        <>
          <path
            d="M19.8 17 C19.2 7.6 24.2 3.8 30 3.8 C35.8 3.8 40.8 7.6 40.2 17 C39.6 13.4 38.4 11.4 36.6 10.6 C33 11.8 27 11.8 23.4 10.6 C21.6 11.4 20.4 13.4 19.8 17 Z"
            fill={P.hair}
          />
          <path
            d="M20 16.4 L20.6 20 M40 16.4 L39.4 20"
            stroke={P.hair}
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          {shine}
        </>
      );
    case "afro":
      return (
        <path
          d="M19.6 15.8 C19.2 7 23.8 2.4 30 2.4 C36.2 2.4 40.8 7 40.4 15.8 C37.4 12.6 33.8 11.6 30 11.6 C26.2 11.6 22.6 12.6 19.6 15.8 Z"
          fill={P.hair}
        />
      );
    case "braids":
      return (
        <>
          <path d={cap} fill={P.hair} />
          {shine}
        </>
      );
    case "bun":
      return (
        <>
          <circle cx="30" cy="2.8" r="5.4" fill={P.hair} />
          <path
            d="M26 5.6 Q30 7.4 34 5.6"
            stroke={P.mena}
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
          />
          <path d={cap} fill={P.hair} />
          {shine}
        </>
      );
    case "puffs":
      return (
        <>
          <circle cx="19.2" cy="6.4" r="5.8" fill={P.hair} />
          <circle cx="40.8" cy="6.4" r="5.8" fill={P.hair} />
          <path d={cap} fill={P.hair} />
          <path
            d="M22.2 4.4 L24.6 7.6 M37.8 4.4 L35.4 7.6"
            stroke={P.soleil}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          {shine}
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
  const skinShade = shade(skin, 0.8);
  return (
    <g transform={place(pos, 30, 18)}>
      <g transform={HEAD_SCALE}>
        <HairBack hair={hair} />
      </g>
      <path d="M7 62 C7 45 15.5 37 30 37 C44.5 37 53 45 53 62 Z" fill={shirt} />
      <path d="M44 42 C49.6 46 53 52 53 62 L47 62 C47 54 46.2 47.6 44 42 Z" fill={shade(shirt, 0.82)} />
      <path d="M25.2 37 L30 44 L34.8 37 Z" fill={skin} />
      <path
        d="M23.4 36.6 L30 44.2 L26.4 47 L21.6 38.4 Z M36.6 36.6 L30 44.2 L33.6 47 L38.4 38.4 Z"
        fill={P.white}
      />
      <rect x="26.6" y="24" width="6.8" height="13.5" rx="2.6" fill={skin} />
      <path d="M26.6 27.5 Q30 31.5 33.4 27.5 L33.4 31 Q30 33.6 26.6 31 Z" fill={skinShade} />
      <Head skin={skin} skinShade={skinShade} hair={hair} />
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
