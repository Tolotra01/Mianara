/** Transition d'entrée à chaque changement de page du site public. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="anim-page">{children}</div>;
}
