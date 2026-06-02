"use client";

/**
 * Éditeur de **profil** (le seul composant client du dashboard). Le profil décrit l'utilisatrice
 * dans le vocabulaire des offres (logiciels/spécialités/niveau/lieu/mode) → scoring de correspondance.
 *
 * Persistance : `localStorage` (source de vérité, sans compte) **+** un cookie miroir pour que le
 * rendu serveur puisse trier « pour moi » et afficher le score. À l'enregistrement on écrit les deux
 * puis `router.refresh()` re-render le serveur avec le nouveau profil.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EXPERIENCES, MODES_TRAVAIL } from "@/domain/offre";
import { PROFIL_VIDE, ProfilSchema, type Profil } from "@/domain/profil";
import { libelleExperience, libelleMode, libelleSpecialite, t } from "@/lib/i18n";

const CLE = "profil";
const champ =
  "rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-sky-500 focus:outline-none";

function ecrireCookie(p: Profil) {
  const val = encodeURIComponent(JSON.stringify(p));
  document.cookie = `${CLE}=${val}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}
function effacerCookie() {
  document.cookie = `${CLE}=; path=/; max-age=0; SameSite=Lax`;
}

/** Bouton-puce de sélection multiple (logiciels / spécialités). */
function Puce({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        on
          ? "bg-sky-600 text-white"
          : "border border-zinc-700 text-zinc-300 hover:border-zinc-500"
      }`}
    >
      {children}
    </button>
  );
}

export function ProfilPanel({
  logiciels,
  specialites,
  pays,
}: {
  logiciels: string[];
  specialites: string[];
  pays: string[];
}) {
  const router = useRouter();
  const [profil, setProfil] = useState<Profil>(PROFIL_VIDE);

  // Charge le profil depuis localStorage au montage.
  useEffect(() => {
    try {
      const brut = localStorage.getItem(CLE);
      if (brut) {
        const r = ProfilSchema.safeParse(JSON.parse(brut));
        // Chargement client-only (localStorage indispo en SSR) → setState en effet est ici correct
        // (évite tout mismatch d'hydratation : rendu vide d'abord, puis hydraté avec le profil).
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (r.success) setProfil(r.data);
      }
    } catch {
      /* profil illisible → on garde le vide */
    }
  }, []);

  const bascule = (cle: "logiciels" | "specialites", v: string) =>
    setProfil((p) => {
      const set = new Set(p[cle]);
      if (set.has(v)) set.delete(v);
      else set.add(v);
      return { ...p, [cle]: [...set] };
    });

  const enregistrer = () => {
    localStorage.setItem(CLE, JSON.stringify(profil));
    ecrireCookie(profil);
    router.refresh();
  };
  const effacer = () => {
    localStorage.removeItem(CLE);
    effacerCookie();
    setProfil(PROFIL_VIDE);
    router.refresh();
  };

  // Union facette + sélection courante (garde visibles des choix absents de la vue filtrée).
  const optsLogi = [...new Set([...logiciels, ...profil.logiciels])];
  const optsSpe = [...new Set([...specialites, ...profil.specialites])];

  return (
    <details className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 [&_summary]:cursor-pointer">
      <summary className="text-sm font-medium text-zinc-200">{t.profil.ouvrir}</summary>
      <p className="mt-2 text-xs text-zinc-500">{t.profil.aide}</p>

      <div className="mt-3 space-y-3">
        <div>
          <div className="mb-1 text-xs text-zinc-400">{t.profil.logiciels}</div>
          <div className="flex flex-wrap gap-1.5">
            {optsLogi.map((l) => (
              <Puce key={l} on={profil.logiciels.includes(l)} onClick={() => bascule("logiciels", l)}>
                {l}
              </Puce>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1 text-xs text-zinc-400">{t.profil.specialites}</div>
          <div className="flex flex-wrap gap-1.5">
            {optsSpe.map((s) => (
              <Puce key={s} on={profil.specialites.includes(s)} onClick={() => bascule("specialites", s)}>
                {libelleSpecialite(s)}
              </Puce>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            className={champ}
            aria-label={t.profil.experience}
            value={profil.experience ?? ""}
            onChange={(e) => setProfil((p) => ({ ...p, experience: (e.target.value || null) as Profil["experience"] }))}
          >
            <option value="">{t.profil.experience} {t.profil.indefini}</option>
            {EXPERIENCES.map((x) => (
              <option key={x} value={x}>{libelleExperience(x)}</option>
            ))}
          </select>

          <select
            className={champ}
            aria-label={t.profil.pays}
            value={profil.pays ?? ""}
            onChange={(e) => setProfil((p) => ({ ...p, pays: e.target.value || null }))}
          >
            <option value="">{t.profil.pays} {t.profil.indefini}</option>
            {pays.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <select
            className={champ}
            aria-label={t.profil.mode}
            value={profil.mode ?? ""}
            onChange={(e) => setProfil((p) => ({ ...p, mode: (e.target.value || null) as Profil["mode"] }))}
          >
            <option value="">{t.profil.mode} {t.profil.indefini}</option>
            {MODES_TRAVAIL.map((m) => (
              <option key={m} value={m}>{libelleMode(m)}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={enregistrer}
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
          >
            {t.profil.enregistrer}
          </button>
          <button
            type="button"
            onClick={effacer}
            className="px-2 py-2 text-sm text-zinc-400 hover:text-zinc-200 hover:underline"
          >
            {t.profil.effacer}
          </button>
        </div>
      </div>
    </details>
  );
}
