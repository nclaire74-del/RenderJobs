/**
 * Authentification OAuth2 (client_credentials) pour les API France Travail.
 *
 * Endpoint token : POST https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire
 * Identifiants   : FRANCE_TRAVAIL_CLIENT_ID / FRANCE_TRAVAIL_CLIENT_SECRET (.env.local)
 *
 * Le **scope dépend de l'API** appelée (chaque API France Travail a le sien). Le scope est
 * donc un paramètre : ce module sert aussi bien l'API Offres d'emploi que, demain, ROME ou
 * Marché du travail. Le token est mis en cache **par scope**.
 */
import { z } from "zod";

const TOKEN_URL =
  "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire";

/** Scope de l'API Offres d'emploi v2 (celle utilisée par le connecteur d'offres). */
export const SCOPE_OFFRES = "api_offresdemploiv2 o2dsoffre";

const TokenResponse = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
});

// Cache mémoire des tokens, par scope (rafraîchi avant expiration, marge de 60 s).
const cacheParScope = new Map<string, { token: string; expiresAt: number }>();

export async function getAccessToken(
  scope: string = SCOPE_OFFRES,
): Promise<string> {
  const enCache = cacheParScope.get(scope);
  if (enCache && Date.now() < enCache.expiresAt) return enCache.token;

  const clientId = process.env.FRANCE_TRAVAIL_CLIENT_ID;
  const clientSecret = process.env.FRANCE_TRAVAIL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "FRANCE_TRAVAIL_CLIENT_ID / FRANCE_TRAVAIL_CLIENT_SECRET manquants (.env.local).",
    );
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `France Travail OAuth a échoué (${res.status}) : ${detail.slice(0, 300)}`,
    );
  }

  const parsed = TokenResponse.parse(await res.json());
  cacheParScope.set(scope, {
    token: parsed.access_token,
    expiresAt: Date.now() + (parsed.expires_in - 60) * 1000,
  });
  return parsed.access_token;
}

/** Réinitialise le cache (tests). */
export function resetTokenCache(): void {
  cacheParScope.clear();
}
