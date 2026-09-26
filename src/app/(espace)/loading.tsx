/** Squelette affiché pendant le chargement d'une page de l'espace. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Chargement">
      <div className="skeleton h-4 w-28" />
      <div className="skeleton mt-3 h-9 w-72" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-32 rounded-2xl" />
        ))}
      </div>
      <div className="skeleton mt-6 h-80 rounded-2xl" />
    </div>
  );
}
