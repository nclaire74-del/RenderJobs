/**
 * Bascule d'ordre du flux : « fraîcheur » (défaut) ↔ « pour moi » (pertinence vs profil).
 * Visible seulement quand un profil est renseigné. État porté par l'URL (SSR, partageable).
 * Composant serveur pur.
 */
import Link from "next/link";
import type { FiltreOffres } from "@/lib/offres-repo";
import { construireHref } from "@/lib/url";
import { t } from "@/lib/i18n";

export function TriBar({ filtre }: { filtre: FiltreOffres }) {
  const courant = filtre.tri ?? "fraicheur";
  const onglet = (tri: "fraicheur" | "pour-moi", label: string) => {
    const actif = courant === tri;
    return (
      <Link
        href={construireHref(filtre, { tri: tri === "fraicheur" ? undefined : tri, page: 1 })}
        className={`rounded-full px-3 py-1 text-xs font-medium ${
          actif
            ? "bg-sky-600 text-white"
            : "border border-zinc-700 text-zinc-300 hover:border-zinc-500"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="mt-4 flex items-center gap-2 text-sm">
      <span className="text-zinc-500">{t.tri.libelle}</span>
      {onglet("fraicheur", t.tri.fraicheur)}
      {onglet("pour-moi", t.tri.pourMoi)}
    </div>
  );
}
