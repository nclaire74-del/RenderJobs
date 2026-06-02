/**
 * Route de collecte déclenchée par le cron (Vercel Cron en prod, ou un appel
 * planifié côté serveur). Lance `collectToutes()` et renvoie le rapport.
 *
 * Protection : en-tête `Authorization: Bearer <CRON_SECRET>` (convention Vercel
 * Cron). Sans secret valide → 401. Le secret vit dans `.env.local` (CRON_SECRET).
 *
 * Non cachée (POST/GET dynamiques) ; la collecte peut être longue (throttle
 * Adzuna) → maxDuration élevé (serveur auto-hébergé, pas de plafond Vercel).
 */
import { collectToutes } from "@/pipeline/collect";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function autorise(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // pas de secret configuré → on refuse par sécurité
  const entete = request.headers.get("authorization");
  return entete === `Bearer ${secret}`;
}

async function lancer(request: Request): Promise<Response> {
  if (!autorise(request)) {
    return Response.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const debut = Date.now();
  const rapports = await collectToutes();
  const dureeMs = Date.now() - debut;

  const aEchec = rapports.some((r) => r.erreur);
  return Response.json(
    {
      ok: !aEchec,
      dureeMs,
      total: rapports.reduce((n, r) => n + r.ecrites, 0),
      rapports,
    },
    { status: aEchec ? 207 : 200 },
  );
}

// Vercel Cron déclenche en GET ; on accepte aussi POST pour un déclenchement manuel.
export const GET = lancer;
export const POST = lancer;
