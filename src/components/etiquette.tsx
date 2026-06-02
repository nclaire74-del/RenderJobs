/**
 * Petite étiquette (badge) réutilisable pour les métadonnées d'une offre :
 * logiciel, spécialité, contrat, niveau, mode de travail.
 * Composant serveur pur (aucune interactivité).
 */
import type { ReactNode } from "react";

type Ton = "neutre" | "logiciel" | "accent";

const TONS: Record<Ton, string> = {
  neutre: "bg-zinc-800 text-zinc-300 ring-1 ring-inset ring-zinc-700",
  // Logiciels = signal différenciant du produit → mis en valeur.
  logiciel: "bg-sky-950 text-sky-300 ring-1 ring-inset ring-sky-800",
  accent: "bg-amber-950 text-amber-300 ring-1 ring-inset ring-amber-800",
};

export function Etiquette({
  children,
  ton = "neutre",
}: {
  children: ReactNode;
  ton?: Ton;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${TONS[ton]}`}
    >
      {children}
    </span>
  );
}
