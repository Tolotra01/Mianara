import {
  Bird,
  Bubble,
  Cloud,
  HighlandHouse,
  Jacaranda,
  P,
  Ravinala,
  Sparkle,
  Student,
  TaxiBrousse,
} from "./parts";

/**
 * Scène d'accueil : matin sur les Hautes Terres. Deux élèves en uniforme
 * partent vers le Bac ; un taxi-brousse passe sur la route de latérite.
 */
export function HeroScene({ greeting = "Salama !" }: { greeting?: string }) {
  return (
    <svg viewBox="0 0 720 520" className="ill h-auto w-full" role="img" aria-labelledby="hero-title">
      <title id="hero-title">
        Deux élèves en uniforme sur les Hautes Terres, sous un soleil levant, avec des ravinala et un
        taxi-brousse.
      </title>

      <rect width="720" height="520" fill="var(--ill-sky)" />

      {/* Soleil levant */}
      <circle cx="470" cy="230" r="135" fill={P.soleil} className="a-glow" />
      <circle cx="470" cy="230" r="92" fill={P.soleil} />

      {/* Nuages et oiseaux */}
      <Cloud
        x={0}
        y={90}
        scale={1.1}
        className="a-travel"
        style={{ "--from": "-120px", "--to": "840px", "--dur": "70s" } as React.CSSProperties}
      />
      <Cloud
        x={0}
        y={150}
        scale={0.7}
        className="a-travel"
        style={
          { "--from": "-120px", "--to": "840px", "--dur": "95s", "--delay": "-50s" } as React.CSSProperties
        }
      />
      <g className="a-float">
        <Bird x={560} y={110} />
        <Bird x={585} y={128} scale={0.7} />
        <Bird x={538} y={132} scale={0.6} />
      </g>

      {/* Collines lointaines */}
      <path
        d="M0 300 C100 250 180 272 260 248 C360 218 430 262 520 242 C600 224 660 250 720 236 L720 520 L0 520 Z"
        fill="var(--ill-hill-far)"
      />

      {/* Rizières en terrasses */}
      <path
        d="M0 340 C120 298 220 326 330 300 C450 272 560 318 720 290 L720 520 L0 520 Z"
        fill="var(--ill-hill-mid)"
      />
      <g stroke="var(--ill-paddy)" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.9">
        <path d="M20 352 C110 322 200 344 300 322" />
        <path d="M30 372 C120 344 210 364 320 342" />
        <path d="M40 390 C130 366 220 384 330 362" />
      </g>

      {/* Village */}
      <Jacaranda x={440} y={312} scale={0.9} />
      <HighlandHouse x={480} y={318} />
      <HighlandHouse x={590} y={304} scale={0.72} />
      <Ravinala x={672} y={320} scale={0.75} />
      <Ravinala x={395} y={330} scale={0.55} />

      {/* Route de latérite */}
      <path
        d="M0 404 C240 396 480 396 720 402 L720 454 C480 448 240 448 0 454 Z"
        fill="var(--ill-laterite-light)"
      />
      <path
        d="M0 430 C240 424 480 424 720 428"
        stroke={P.paper}
        strokeWidth="2.5"
        strokeDasharray="18 16"
        fill="none"
        opacity="0.6"
      />
      <TaxiBrousse
        x={0}
        y={442}
        scale={1.05}
        className="a-travel"
        style={{ "--from": "-120px", "--to": "860px", "--dur": "22s" } as React.CSSProperties}
      />

      {/* Premier plan */}
      <path d="M0 452 C240 446 480 446 720 452 L720 520 L0 520 Z" fill="var(--ill-hill-near)" />
      <Ravinala x={92} y={500} scale={1.45} />

      <Student
        x={322}
        y={512}
        scale={1.5}
        hair="braids"
        bottom="skirt"
        wave
        skin={P.skin[0]}
        className="a-bob"
      />
      <Student
        x={432}
        y={514}
        scale={1.56}
        hair="short"
        bottom="pants"
        hold="book"
        bag
        skin={P.skin[2]}
        className="a-bob"
        style={{ animationDelay: "-1.4s" }}
      />

      <Bubble x={270} y={262} width={96} className="a-float">
        {greeting}
      </Bubble>
      <Sparkle x={520} y={352} r={10} className="a-float" />
      <Sparkle x={222} y={330} r={7} fill={P.mena} className="a-float" />
    </svg>
  );
}
