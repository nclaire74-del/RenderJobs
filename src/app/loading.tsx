/**
 * Squelette de chargement du dashboard (Next App Router) : affiché pendant le rendu serveur
 * (requêtes DB) au lieu d'un écran blanc (AUDIT §D). Composant serveur pur.
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl animate-pulse px-4 py-8 sm:px-6">
      <div className="h-7 w-72 rounded bg-zinc-800" />
      <div className="mt-2 h-4 w-96 max-w-full rounded bg-zinc-900" />
      <div className="mt-6 h-9 w-64 rounded bg-zinc-900" />
      <div className="mt-4 h-10 w-full rounded bg-zinc-900" />
      <ul className="mt-5 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="h-28 rounded-xl border border-zinc-800 bg-zinc-900/60" />
        ))}
      </ul>
    </div>
  );
}
