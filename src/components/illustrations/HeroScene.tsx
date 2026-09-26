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
 * Scène d'accueil, en panorama : matin sur les Hautes Terres. Le relief —
 * collines lointaines, rizières en terrasses, route de latérite — et les
 * ravinala couvrent toute la largeur ; le village, les deux élèves et le
 * taxi-brousse occupent la moitié droite, le titre la moitié gauche.
 *
 * Le viewBox est large (1400 × 457) et le svg est monté en `slice` : le décor
 * est recadré par son conteneur plutôt que déformé. `YMax` ancre le premier
 * plan (route, élèves) pour que le ciel soit la seule partie rognée quand la
 * fenêtre est plus large que 3:1.
 *
 * La hauteur du viewBox va jusqu'à y=540, le bas exact du décor : plus haute,
 * elle laisserait une bande vide sous les élèves — visible en écran large, où
 * `slice` rogne les côtés mais garde le bas du viewBox. Le fond reste donc
 * transparent (hérité de `.hero-band`) plutôt que blanc.
 */
export function HeroScene({
  greeting = "Salama !",
  className,
  framing = "wide",
  people = true,
}: {
  greeting?: string;
  className?: string;
  framing?: "mobile" | "wide";
  /** Sans les élèves ni la bulle : décor seul, pour les en-têtes des autres pages. */
  people?: boolean;
}) {
  const titleId = `hero-title-${framing}-${people ? "p" : "d"}`;

  return (
    <svg
      viewBox="10 83 1400 457"
      preserveAspectRatio={`${framing === "mobile" ? "xMax" : "xMid"}YMax slice`}
      className={`ill h-full w-full ${className ?? ""}`}
      role={people ? "img" : undefined}
      aria-labelledby={people ? titleId : undefined}
      aria-hidden={people ? undefined : true}
    >
      {people && (
        <title id={titleId}>
          Matin sur les Hautes Terres : collines lointaines, rizières en terrasses et route de latérite bordée
          de ravinala ; deux élèves en uniforme attendent un taxi-brousse.
        </title>
      )}

      <rect width="1440" height="540" fill="var(--ill-sky)" />

      {/* Soleil levant, dégagé vers la droite pour laisser le titre au calme */}
      <circle cx="1218" cy="196" r="152" fill={P.soleil} className="a-glow" />
      <circle cx="1218" cy="196" r="104" fill={P.soleil} />

      {/* Nuages et oiseaux */}
      <Cloud
        x={0}
        y={74}
        scale={1.15}
        className="a-travel"
        style={{ "--from": "-260px", "--to": "1720px", "--dur": "80s" } as React.CSSProperties}
      />
      <Cloud
        x={0}
        y={142}
        scale={0.8}
        className="a-travel"
        style={
          { "--from": "-260px", "--to": "1720px", "--dur": "105s", "--delay": "-55s" } as React.CSSProperties
        }
      />
      <Cloud
        x={0}
        y={192}
        scale={0.62}
        className="a-travel"
        style={
          { "--from": "-260px", "--to": "1720px", "--dur": "125s", "--delay": "-92s" } as React.CSSProperties
        }
      />
      <g className="a-float">
        <Bird x={1128} y={96} />
        <Bird x={1166} y={118} scale={0.7} />
        <Bird x={1096} y={124} scale={0.6} />
      </g>

      {/* Collines lointaines, de bout en bout */}
      <path
        d="M0 268 C160 226 300 250 440 224 C580 198 700 244 840 222 C980 200 1120 232 1260 212 C1340 200 1400 216 1440 208 L1440 540 L0 540 Z"
        fill="var(--ill-hill-far)"
      />

      {/* Rizières en terrasses, de bout en bout */}
      <path
        d="M0 312 C180 274 340 302 520 278 C700 254 860 298 1040 272 C1200 248 1340 286 1440 266 L1440 540 L0 540 Z"
        fill="var(--ill-hill-mid)"
      />
      <g stroke="var(--ill-paddy)" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.9">
        <path d="M0 330 C180 300 340 322 520 300 C700 278 860 314 1040 292 C1200 272 1340 302 1440 288" />
        <path d="M0 352 C180 324 340 344 520 322 C700 302 860 336 1040 314 C1200 296 1340 324 1440 310" />
        <path d="M0 372 C180 348 340 364 520 344 C700 326 860 356 1040 336 C1200 320 1340 344 1440 332" />
        <path d="M0 390 C180 370 340 382 520 364 C700 348 860 374 1040 356 C1200 342 1340 362 1440 352" />
      </g>

      {/* Village sur la crête des rizières */}
      <Jacaranda x={690} y={302} scale={0.95} />
      <HighlandHouse x={726} y={308} />
      <HighlandHouse x={826} y={296} scale={0.72} />

      {/* Ravinala dispersés sur toute la largeur */}
      <Ravinala x={620} y={452} scale={0.5} />
      <Ravinala x={866} y={446} scale={0.46} />
      <Ravinala x={1156} y={462} scale={0.7} />
      <Ravinala x={436} y={466} scale={0.56} />
      <Ravinala x={175} y={502} scale={1.25} />
      <Ravinala x={1285} y={498} scale={1.2} />

      {/* Route de latérite, de bout en bout */}
      <path
        d="M0 398 C300 388 640 392 940 386 C1160 382 1320 388 1440 384 L1440 446 C1320 450 1160 446 940 450 C640 454 300 450 0 456 Z"
        fill="var(--ill-laterite-light)"
      />
      <path
        d="M0 424 C300 416 640 420 940 414 C1160 410 1320 416 1440 412"
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
        style={{ "--from": "-200px", "--to": "1680px", "--dur": "26s" } as React.CSSProperties}
      />

      {/* Premier plan */}
      <path
        d="M0 452 C300 446 640 450 940 444 C1160 440 1320 446 1440 442 L1440 540 L0 540 Z"
        fill="var(--ill-hill-near)"
      />

      {people && (
        <>
          <Student
            x={980}
            y={538}
            scale={1.5}
            hair="braids"
            bottom="skirt"
            wave
            skin={P.skin[0]}
            className="a-bob"
          />
          <Student
            x={1092}
            y={540}
            scale={1.56}
            hair="short"
            bottom="pants"
            hold="book"
            bag
            skin={P.skin[2]}
            className="a-bob"
            style={{ animationDelay: "-1.4s" }}
          />

          <Bubble x={890} y={318} width={96} className="a-float">
            {greeting}
          </Bubble>
          <Sparkle x={944} y={356} r={9} className="a-float" />
          <Sparkle x={1268} y={332} r={7} fill={P.mena} className="a-float" />
        </>
      )}
    </svg>
  );
}
