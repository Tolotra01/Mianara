"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  /** Retard en ms — pour décaler les éléments d'une même rangée. */
  delay?: number;
  className?: string;
};

/**
 * Révélation au défilement, sans dépendance.
 *
 * Un seul `IntersectionObserver` bascule un attribut `data-shown`, et tout le
 * mouvement est décrit en CSS (cf. `.reveal` dans globals.css). L'observateur
 * se déconnecte dès la première apparition : un élément ne s'anime qu'une fois.
 *
 * Pourquoi pas Framer Motion : le paquet pèse une trentaine de kilo-octets
 * gzip pour un simple fondu + translation, alors que la charte demande des
 * transitions de 150–200 ms et que le budget de poids du site est ici serré.
 * Le résultat tient dans ~1 ko et s'appuie sur `transform`/`opacity`, donc
 * composées sur le GPU.
 *
 * Le masquage initial est déclaré sous `@media (scripting: enabled)` : sans
 * JavaScript, aucun contenu ne reste invisible.
 */
export function Reveal({ children, delay = 0, className = "" }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setShown(true);
          observer.disconnect();
        }
      },
      // Le `rootMargin` négatif déclenche un peu avant que l'élément n'entre
      // dans l'écran : l'animation a ainsi le temps d'être finie.
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-shown={shown ? "true" : undefined}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={`reveal ${className}`.trim()}
    >
      {children}
    </div>
  );
}