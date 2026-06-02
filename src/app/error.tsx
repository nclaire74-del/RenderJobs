"use client";

/**
 * Frontière d'erreur du dashboard (Next App Router). Évite la page 500 brute si une requête DB
 * échoue : message clair + bouton « réessayer » (AUDIT §D). Composant client obligatoire.
 */
import { t } from "@/lib/i18n";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-20 text-center sm:px-6">
      <h1 className="text-xl font-semibold text-zinc-100">{t.erreur.titre}</h1>
      <p className="mt-2 text-sm text-zinc-400">{t.erreur.aide}</p>
      <button
        onClick={reset}
        className="mt-6 rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
      >
        {t.erreur.reessayer}
      </button>
    </main>
  );
}
