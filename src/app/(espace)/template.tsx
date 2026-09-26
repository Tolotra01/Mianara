/** Transition d'entrée à chaque changement de page de l'espace. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="anim-page">{children}</div>;
}
