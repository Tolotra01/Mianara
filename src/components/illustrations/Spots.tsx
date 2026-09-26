/**
 * Petites illustrations (240 × 180) pour les cartes du guide et des actualités.
 * Fond en « tache » teintée (tokens *-soft), objets en aplats de la marque.
 */
import type { ReactNode } from "react";
import { Bust, P, Ravinala, Sparkle, Student } from "./parts";

type SpotProps = { className?: string; title?: string };

function Spot({ bg, className, title, children }: SpotProps & { bg: string; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 240 180"
      className={`ill h-auto w-full ${className ?? ""}`}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <path
        d="M36 40 C62 6 150 2 196 28 C232 48 236 116 206 146 C176 176 84 180 46 156 C8 132 10 74 36 40 Z"
        fill={bg}
      />
      {children}
    </svg>
  );
}

const TXT = { fontFamily: "var(--font-jakarta), system-ui, sans-serif", fontWeight: 800 } as const;

/* ---------- Séries ---------- */

export function SerieLArt(props: SpotProps) {
  return (
    <Spot bg="var(--tany-mena-soft)" {...props}>
      {/* Livre ouvert */}
      <path
        d="M120 138 C98 124 70 122 44 128 L44 72 C70 66 98 68 120 82 Z"
        fill={P.white}
        stroke={P.menaDark}
        strokeWidth="2"
      />
      <path
        d="M120 138 C142 124 170 122 196 128 L196 72 C170 66 142 68 120 82 Z"
        fill={P.white}
        stroke={P.menaDark}
        strokeWidth="2"
      />
      <path
        d="M40 132 C68 126 98 128 120 142 C142 128 172 126 200 132 L200 138 C172 132 142 134 120 148 C98 134 68 132 40 138 Z"
        fill={P.mena}
      />
      <g stroke={P.line} strokeWidth="3" strokeLinecap="round">
        <path d="M56 86 L104 90 M56 98 L104 102 M56 110 L94 113" />
        <path d="M136 90 L184 86 M136 102 L184 98 M146 113 L184 110" />
      </g>
      {/* Bulles de langues */}
      <g className="a-float">
        <rect x="30" y="28" width="58" height="30" rx="15" fill={P.vert} />
        <text x="59" y="48" textAnchor="middle" fontSize="13" fill={P.white} {...TXT}>
          Salama
        </text>
      </g>
      <g className="a-float" style={{ animationDelay: "-1.6s" }}>
        <rect x="96" y="14" width="52" height="30" rx="15" fill={P.soleil} />
        <text x="122" y="34" textAnchor="middle" fontSize="13" fill={P.ink} {...TXT}>
          Hello
        </text>
      </g>
      <g className="a-float" style={{ animationDelay: "-3s" }}>
        <rect x="156" y="30" width="58" height="30" rx="15" fill={P.mena} />
        <text x="185" y="50" textAnchor="middle" fontSize="13" fill={P.white} {...TXT}>
          Bonjour
        </text>
      </g>
      {/* Plume */}
      <path d="M200 64 C214 70 218 90 206 104 L196 96 C206 88 206 76 200 64 Z" fill={P.vert} />
      <path d="M206 104 L188 124" stroke={P.ink} strokeWidth="2" strokeLinecap="round" />
    </Spot>
  );
}

export function SerieSArt(props: SpotProps) {
  return (
    <Spot bg="var(--vert-soft)" {...props}>
      {/* Atome */}
      <g
        stroke={P.vert}
        strokeWidth="3"
        fill="none"
        className="a-sway"
        style={{ transformOrigin: "50% 50%" }}
      >
        <ellipse cx="66" cy="70" rx="34" ry="13" />
        <ellipse cx="66" cy="70" rx="34" ry="13" transform="rotate(60 66 70)" />
        <ellipse cx="66" cy="70" rx="34" ry="13" transform="rotate(-60 66 70)" />
      </g>
      <circle cx="66" cy="70" r="7" fill={P.mena} />
      {/* Erlenmeyer */}
      <path
        d="M130 40 L152 40 L152 72 L180 134 Q183 142 174 142 L108 142 Q99 142 102 134 L130 72 Z"
        fill={P.white}
        stroke={P.ink}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M116 106 L166 106 L176 132 Q178 137 172 137 L110 137 Q104 137 106 132 Z" fill={P.vertLight} />
      <rect x="126" y="34" width="30" height="8" rx="3" fill={P.ink} />
      <g fill={P.vertLight}>
        <circle cx="141" cy="90" r="4" className="a-float" />
        <circle cx="150" cy="78" r="3" className="a-float" style={{ animationDelay: "-1s" }} />
        <circle cx="134" cy="64" r="2.5" className="a-float" style={{ animationDelay: "-2s" }} />
      </g>
      {/* Feuille (SVT) */}
      <path d="M186 60 C212 46 222 70 206 96 C186 96 176 80 186 60 Z" fill={P.vert} />
      <path d="M190 90 L206 64" stroke={P.vertDark} strokeWidth="2" strokeLinecap="round" />
      {/* Formule */}
      <text x="40" y="140" fontSize="20" fill={P.ink} {...TXT}>
        x²
      </text>
      <text x="68" y="140" fontSize="18" fill={P.mena} {...TXT}>
        π
      </text>
      <Sparkle x={200} y={30} r={8} className="a-float" />
    </Spot>
  );
}

export function SerieOSEArt(props: SpotProps) {
  return (
    <Spot bg="var(--soleil-soft)" {...props}>
      {/* Graphique en barres */}
      <path d="M46 146 L200 146" stroke={P.ink} strokeWidth="3" strokeLinecap="round" />
      <rect x="58" y="108" width="24" height="38" rx="4" fill={P.mena} />
      <rect x="92" y="86" width="24" height="60" rx="4" fill={P.soleil} />
      <rect x="126" y="62" width="24" height="84" rx="4" fill={P.vert} />
      <path
        d="M60 96 L100 74 L130 52 L168 30"
        stroke={P.ink}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="6 6"
        className="a-dash"
      />
      <path
        d="M156 28 L170 29 L166 42"
        stroke={P.ink}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Pièces */}
      <g className="a-float">
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <ellipse cx="182" cy={132 - i * 9} rx="18" ry="6" fill={P.menaDark} />
            <ellipse cx="182" cy={129 - i * 9} rx="18" ry="6" fill={P.soleil} />
          </g>
        ))}
        <text x="182" y="115" textAnchor="middle" fontSize="9" fill={P.ink} {...TXT}>
          Ar
        </text>
      </g>
      {/* Épingle de carte */}
      <path d="M200 58 C200 44 222 44 222 58 C222 70 211 80 211 80 C211 80 200 70 200 58 Z" fill={P.vert} />
      <circle cx="211" cy="58" r="4" fill={P.white} />
    </Spot>
  );
}

/* ---------- Guide ---------- */

export function DossierArt(props: SpotProps) {
  return (
    <Spot bg="var(--soleil-soft)" {...props}>
      <path
        d="M50 58 L96 58 L106 68 L190 68 Q196 68 196 74 L196 146 Q196 152 190 152 L50 152 Q44 152 44 146 L44 64 Q44 58 50 58 Z"
        fill={P.soleil}
      />
      {/* Feuilles qui dépassent */}
      <rect
        x="70"
        y="36"
        width="80"
        height="100"
        rx="4"
        fill={P.white}
        stroke={P.line}
        strokeWidth="2"
        transform="rotate(-6 110 86)"
      />
      <rect x="84" y="30" width="80" height="100" rx="4" fill={P.white} stroke={P.line} strokeWidth="2" />
      <g stroke={P.line} strokeWidth="4" strokeLinecap="round">
        <path d="M98 52 L148 52 M98 66 L140 66 M98 80 L148 80" />
      </g>
      {/* Photo d'identité */}
      <rect x="126" y="88" width="28" height="34" rx="3" fill="#E6F2EC" stroke={P.vert} strokeWidth="2" />
      <circle cx="140" cy="102" r="6" fill={P.skin[1]} />
      <path d="M130 120 C130 110 150 110 150 120 Z" fill={P.vert} />
      <path d="M44 96 L196 96 L196 146 Q196 152 190 152 L50 152 Q44 152 44 146 Z" fill="#F5C45E" />
      {/* Validé */}
      <g className="a-float">
        <circle cx="186" cy="50" r="18" fill={P.vert} />
        <path
          d="M177 50 L184 57 L196 44"
          stroke={P.white}
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </Spot>
  );
}

export function CalendrierArt(props: SpotProps) {
  return (
    <Spot bg="var(--info-soft)" {...props}>
      <rect x="54" y="40" width="132" height="116" rx="12" fill={P.white} stroke={P.ink} strokeWidth="3" />
      <path d="M54 52 Q54 40 66 40 L174 40 Q186 40 186 52 L186 70 L54 70 Z" fill={P.mena} />
      <rect x="80" y="30" width="8" height="22" rx="4" fill={P.ink} />
      <rect x="152" y="30" width="8" height="22" rx="4" fill={P.ink} />
      <g fill={P.line}>
        {[0, 1, 2, 3, 4].map((c) =>
          [0, 1, 2].map((r) => (
            <rect key={`${c}-${r}`} x={68 + c * 22} y={82 + r * 22} width="14" height="12" rx="3" />
          )),
        )}
      </g>
      <circle cx="119" cy="110" r="15" fill="none" stroke={P.vert} strokeWidth="4" className="a-float" />
      <rect x="112" y="104" width="14" height="12" rx="3" fill={P.vert} />
      <g className="a-float" style={{ animationDelay: "-2s" }}>
        <circle cx="196" cy="42" r="16" fill={P.soleil} />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <path
            key={a}
            d="M196 18 L196 12"
            stroke={P.soleil}
            strokeWidth="3"
            strokeLinecap="round"
            transform={`rotate(${a} 196 42)`}
          />
        ))}
      </g>
    </Spot>
  );
}

export function CoefficientsArt(props: SpotProps) {
  return (
    <Spot bg="var(--vert-soft)" {...props}>
      <path d="M120 40 L120 146 M92 150 L148 150" stroke={P.ink} strokeWidth="5" strokeLinecap="round" />
      <g className="a-sway" style={{ transformOrigin: "50% 0%" }}>
        <path d="M58 56 L182 48" stroke={P.ink} strokeWidth="5" strokeLinecap="round" />
        <path
          d="M58 56 L40 100 M58 56 L76 100 M182 48 L164 92 M182 48 L200 92"
          stroke={P.ink}
          strokeWidth="2"
        />
        <path d="M34 100 L82 100 Q78 114 58 114 Q38 114 34 100 Z" fill={P.mena} />
        <path d="M158 92 L206 92 Q202 106 182 106 Q162 106 158 92 Z" fill={P.vert} />
        <rect x="44" y="72" width="28" height="28" rx="6" fill={P.soleil} />
        <text x="58" y="93" textAnchor="middle" fontSize="18" fill={P.ink} {...TXT}>
          5
        </text>
        <rect x="170" y="74" width="24" height="18" rx="5" fill={P.white} stroke={P.ink} strokeWidth="2" />
        <text x="182" y="88" textAnchor="middle" fontSize="13" fill={P.ink} {...TXT}>
          2
        </text>
      </g>
      <circle cx="120" cy="40" r="8" fill={P.soleil} stroke={P.ink} strokeWidth="3" />
    </Spot>
  );
}

export function PreparerArt(props: SpotProps) {
  return (
    <Spot bg="var(--tany-mena-soft)" {...props}>
      {/* Lampe */}
      <path
        d="M150 146 L170 146 M160 146 L160 104 L186 70"
        stroke={P.ink}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M170 56 L206 72 L194 92 Z" fill={P.vert} />
      <path d="M196 90 L150 140 L120 140 Z" fill={P.soleil} opacity="0.35" className="a-glow" />
      {/* Pile de livres */}
      <rect x="44" y="126" width="98" height="20" rx="3" fill={P.vert} />
      <rect x="52" y="108" width="86" height="18" rx="3" fill={P.mena} />
      <rect x="46" y="92" width="80" height="16" rx="3" fill={P.navy} />
      <rect x="60" y="130" width="40" height="4" rx="2" fill={P.soleil} />
      <rect x="66" y="112" width="30" height="4" rx="2" fill={P.soleil} />
      {/* Planning */}
      <g className="a-float">
        <rect x="56" y="30" width="70" height="52" rx="6" fill={P.white} stroke={P.ink} strokeWidth="2.5" />
        {[0, 1, 2].map((r) => (
          <g key={r}>
            <rect x="64" y={40 + r * 13} width="9" height="9" rx="2" fill={r < 2 ? P.vert : P.line} />
            <rect x="78" y={42 + r * 13} width="38" height="5" rx="2.5" fill={P.line} />
          </g>
        ))}
      </g>
    </Spot>
  );
}

export function JourJArt(props: SpotProps) {
  return (
    <Spot bg="var(--soleil-soft)" {...props}>
      {/* Pupitre */}
      <path
        d="M36 118 L204 118 L196 128 L44 128 Z"
        fill={P.wood}
        stroke={P.ink}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M54 128 L54 160 M186 128 L186 160" stroke={P.ink} strokeWidth="4" strokeLinecap="round" />
      {/* Copie */}
      <path
        d="M84 116 L100 70 L162 78 L148 122 Z"
        fill={P.white}
        stroke={P.ink}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <g stroke={P.line} strokeWidth="3" strokeLinecap="round">
        <path d="M104 84 L150 90 M100 96 L146 102 M96 108 L128 112" />
      </g>
      {/* Crayon */}
      <g transform="rotate(-35 160 100)">
        <rect x="150" y="96" width="48" height="9" rx="2" fill={P.soleil} />
        <path d="M150 96 L140 100.5 L150 105 Z" fill={P.wood} />
        <rect x="192" y="96" width="6" height="9" fill={P.mena} />
      </g>
      {/* Réveil 7 h */}
      <g className="a-float">
        <circle cx="62" cy="64" r="26" fill={P.white} stroke={P.ink} strokeWidth="3" />
        <path d="M62 64 L62 46 M62 64 L52 70" stroke={P.ink} strokeWidth="3" strokeLinecap="round" />
        <circle cx="62" cy="64" r="3" fill={P.mena} />
        <circle cx="42" cy="40" r="7" fill={P.mena} />
        <circle cx="82" cy="40" r="7" fill={P.mena} />
      </g>
      <text x="200" y="60" textAnchor="middle" fontSize="22" fill={P.vert} {...TXT}>
        7 h
      </text>
    </Spot>
  );
}

export function ResultatsArt(props: SpotProps) {
  return (
    <Spot bg="var(--vert-soft)" {...props}>
      {/* Tableau d'affichage */}
      <rect x="44" y="34" width="118" height="112" rx="8" fill={P.white} stroke={P.ink} strokeWidth="3" />
      <rect x="44" y="34" width="118" height="22" rx="8" fill={P.vert} />
      <rect x="44" y="48" width="118" height="8" fill={P.vert} />
      {[0, 1, 2, 3].map((r) => (
        <g key={r}>
          <rect x="56" y={68 + r * 18} width="62" height="7" rx="3.5" fill={P.line} />
          <rect
            x="126"
            y={66 + r * 18}
            width="26"
            height="11"
            rx="5.5"
            fill={r === 1 ? P.soleil : "#E6F2EC"}
          />
        </g>
      ))}
      {/* Élève ravie */}
      <Student x={192} y={170} scale={0.62} hair="puffs" bottom="skirt" wave skin={P.skin[3]} />
      <Sparkle x={176} y={34} r={9} className="a-float" />
      <Sparkle x={214} y={62} r={6} fill={P.mena} className="a-float" />
      <Sparkle x={28} y={60} r={6} className="a-float" />
    </Spot>
  );
}

export function ApresArt(props: SpotProps) {
  return (
    <Spot bg="var(--info-soft)" {...props}>
      {/* Panneau d'orientation */}
      <path d="M120 60 L120 160" stroke={P.trunk} strokeWidth="7" strokeLinecap="round" />
      <path d="M124 56 L190 56 L204 70 L190 84 L124 84 Z" fill={P.vert} />
      <path d="M116 92 L54 92 L40 106 L54 120 L116 120 Z" fill={P.mena} />
      <path d="M124 126 L176 126 L188 138 L176 150 L124 150 Z" fill={P.soleil} />
      <g stroke={P.white} strokeWidth="3.5" strokeLinecap="round">
        <path d="M138 70 L180 70" />
        <path d="M60 106 L104 106" />
      </g>
      <path d="M136 138 L168 138" stroke={P.ink} strokeWidth="3.5" strokeLinecap="round" />
      {/* Toque */}
      <g className="a-float">
        <path d="M60 44 L100 30 L140 44 L100 58 Z" fill={P.ink} />
        <path d="M76 50 L76 64 Q100 74 124 64 L124 50 L100 58 Z" fill="#23392F" />
        <path d="M134 46 L134 66" stroke={P.soleil} strokeWidth="2.5" />
        <circle cx="134" cy="68" r="3.5" fill={P.soleil} />
      </g>
    </Spot>
  );
}

export function HelpArt(props: SpotProps) {
  return (
    <Spot bg="var(--vert-soft)" {...props}>
      <Student
        x={84}
        y={172}
        scale={0.86}
        hair="afro"
        bottom="pants"
        hold="phone"
        skin={P.skin[1]}
        className="a-bob"
      />
      <g className="a-float">
        <rect x="120" y="26" width="92" height="56" rx="18" fill={P.white} stroke={P.ink} strokeWidth="2.5" />
        <path
          d="M136 80 L130 96 L150 82"
          fill={P.white}
          stroke={P.ink}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <rect x="132" y="76" width="22" height="6" fill={P.white} />
        <text x="166" y="66" textAnchor="middle" fontSize="36" fill={P.vert} {...TXT}>
          ?
        </text>
      </g>
      <g className="a-float" style={{ animationDelay: "-2s" }}>
        <g stroke={P.soleil} strokeWidth="3" strokeLinecap="round">
          <path d="M196 88 L196 80" />
          <path d="M172 100 L166 95" />
          <path d="M220 100 L226 95" />
        </g>
        <circle cx="196" cy="118" r="18" fill={P.soleil} />
        <rect x="189" y="134" width="14" height="10" rx="2" fill={P.ink} />
        <path
          d="M190 122 L193 114 L196 121 L199 114 L202 122"
          stroke={P.ink}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </Spot>
  );
}

export function LoginArt(props: SpotProps) {
  return (
    <Spot bg="var(--vert-soft)" {...props}>
      {/* Téléphone */}
      <rect x="86" y="22" width="78" height="140" rx="14" fill={P.ink} />
      <rect x="93" y="34" width="64" height="112" rx="6" fill={P.paper} />
      <circle cx="125" cy="72" r="18" fill={P.vert} />
      <rect x="117" y="68" width="16" height="13" rx="3" fill={P.white} />
      <path d="M120 68 L120 63 Q125 56 130 63 L130 68" stroke={P.white} strokeWidth="2.5" fill="none" />
      <rect x="103" y="102" width="44" height="8" rx="4" fill={P.line} />
      <rect x="103" y="116" width="44" height="12" rx="6" fill={P.vert} />
      {/* Clé */}
      <g className="a-float">
        <circle cx="190" cy="120" r="14" fill="none" stroke={P.soleil} strokeWidth="6" />
        <path
          d="M178 128 L150 150 M160 142 L166 148 M154 146 L158 150"
          stroke={P.soleil}
          strokeWidth="6"
          strokeLinecap="round"
        />
      </g>
      <Sparkle x={58} y={50} r={9} className="a-float" />
      <Sparkle x={200} y={46} r={6} fill={P.mena} className="a-float" />
    </Spot>
  );
}

export function NotFoundArt(props: SpotProps) {
  return (
    <Spot bg="var(--soleil-soft)" {...props}>
      <path
        d="M40 150 C90 140 150 140 206 150"
        stroke={P.ink}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <Student
        x={120}
        y={150}
        scale={0.78}
        hair="bun"
        bottom="pants"
        hold="book"
        skin={P.skin[0]}
        className="a-bob"
      />
      <g className="a-float">
        <text x="58" y="70" textAnchor="middle" fontSize="40" fill={P.mena} {...TXT}>
          ?
        </text>
        <text x="186" y="60" textAnchor="middle" fontSize="30" fill={P.vert} {...TXT}>
          ?
        </text>
      </g>
    </Spot>
  );
}

/** Portrait de l'assistant en grand (page Aide, accueil). */
export function AssistantArt(props: SpotProps) {
  return (
    <Spot bg="var(--vert-soft)" {...props}>
      <g transform="translate(0 6)">
        <Bust x={96} y={82} scale={1.9} hair="bun" skin={P.skin[1]} shirt={P.vert} />
      </g>
      <g className="a-float">
        <rect x="146" y="30" width="72" height="34" rx="17" fill={P.white} stroke={P.ink} strokeWidth="2.5" />
        {[0, 1, 2].map((i) => (
          <circle
            key={i}
            cx={166 + i * 16}
            cy="47"
            r="4.5"
            fill={P.vert}
            className="a-typing"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </g>
      <g className="a-float" style={{ animationDelay: "-2.2s" }}>
        <rect x="160" y="92" width="58" height="30" rx="15" fill={P.soleil} />
        <text x="189" y="112" textAnchor="middle" fontSize="12" fill={P.ink} {...TXT}>
          FR · MG
        </text>
      </g>
      <Sparkle x={38} y={50} r={8} className="a-float" />
    </Spot>
  );
}

/** Page Guide : un grand livre ouvert d'où pousse un ravinala, et une élève qui lit. */
export function GuideArt(props: SpotProps) {
  return (
    <Spot bg="var(--soleil-soft)" {...props}>
      <circle cx="104" cy="96" r="30" fill={P.soleil} />
      <Ravinala x={104} y={128} scale={0.55} />
      <path d="M104 150 C84 138 58 136 34 142 L34 124 C58 118 84 120 104 132 Z" fill={P.mena} />
      <path d="M104 150 C124 138 150 136 174 142 L174 124 C150 118 124 120 104 132 Z" fill={P.mena} />
      <path
        d="M104 156 C84 144 58 142 34 148 L34 142 C58 136 84 138 104 150 C124 138 150 136 174 142 L174 148 C150 142 124 144 104 156 Z"
        fill={P.menaDark}
      />
      <Student
        x={200}
        y={172}
        scale={0.7}
        hair="braids"
        bottom="skirt"
        hold="book"
        skin={P.skin[3]}
        className="a-bob"
      />
      <Sparkle x={40} y={60} r={8} className="a-float" />
      <Sparkle x={166} y={40} r={6} fill={P.mena} className="a-float" />
    </Spot>
  );
}

/** Page Actualités : un journal « Vaovao » et un mégaphone. */
export function NewsHeroArt(props: SpotProps) {
  return (
    <Spot bg="var(--info-soft)" {...props}>
      <g transform="rotate(-5 110 96)">
        <rect x="46" y="34" width="120" height="120" rx="6" fill={P.white} stroke={P.ink} strokeWidth="3" />
        <text x="60" y="60" fontSize="18" fill={P.ink} {...TXT}>
          Vaovao
        </text>
        <rect x="60" y="70" width="44" height="34" rx="3" fill={P.soleil} />
        <circle cx="82" cy="86" r="8" fill={P.vert} />
        <g fill={P.line}>
          <rect x="112" y="72" width="40" height="5" rx="2.5" />
          <rect x="112" y="84" width="40" height="5" rx="2.5" />
          <rect x="112" y="96" width="30" height="5" rx="2.5" />
          <rect x="60" y="114" width="92" height="5" rx="2.5" />
          <rect x="60" y="126" width="92" height="5" rx="2.5" />
          <rect x="60" y="138" width="60" height="5" rx="2.5" />
        </g>
      </g>
      <g className="a-float">
        <path d="M168 88 L204 66 L204 128 L168 106 Z" fill={P.mena} />
        <rect x="156" y="86" width="14" height="22" rx="3" fill={P.menaDark} />
        <path d="M212 80 Q222 97 212 114" stroke={P.mena} strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M162 108 L168 126" stroke={P.ink} strokeWidth="5" strokeLinecap="round" />
      </g>
      <Sparkle x={200} y={40} r={8} className="a-float" />
    </Spot>
  );
}

export const NEWS_ART = {
  reforme: ApresArt,
  calendrier: CalendrierArt,
  coefficients: CoefficientsArt,
  inscription: DossierArt,
  sport: JourJArt,
  resultats: ResultatsArt,
} as const;

export const SERIE_ART = { L: SerieLArt, S: SerieSArt, OSE: SerieOSEArt } as const;
