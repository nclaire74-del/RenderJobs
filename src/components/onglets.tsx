/**
 * Onglets du flux : « Cœur de métier » (défaut) et « Offres connexes ».
 * `hors_scope` n'apparaît jamais (R-1). Chaque onglet conserve les filtres
 * courants et affiche son nombre d'offres.
 * Composant serveur pur (navigation par liens → URL partageable).
 */
import Link from "next/link";
import type { FiltreOffres, Vue } from "@/lib/offres-repo";
import { VUES } from "@/lib/offres-repo";
import { construireHref } from "@/lib/url";
import { t } from "@/lib/i18n";

export function Onglets({
  filtre,
  comptes,
}: {
  filtre: FiltreOffres;
  comptes: Record<Vue, number>;
}) {
  return (
    <nav className="flex gap-1 border-b border-zinc-800">
      {VUES.map((vue) => {
        const actif = filtre.vue === vue;
        // Changer d'onglet remet la pagination à zéro mais garde les filtres.
        const href = construireHref(filtre, { vue, page: 1 });
        return (
          <Link
            key={vue}
            href={href}
            aria-current={actif ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              actif
                ? "border-sky-500 text-zinc-100"
                : "border-transparent text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
            }`}
          >
            {t.vue[vue]}
            <span
              className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                actif ? "bg-sky-500/20 text-sky-300" : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {comptes[vue]}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
