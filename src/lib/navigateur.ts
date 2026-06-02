/**
 * Brique **navigateur** partagée (Playwright / Chromium headless) pour les **sites durs** —
 * ceux protégés par Cloudflare/anti-bot ou rendus en JavaScript, qu'un simple `fetch` ne peut lire
 * (cf. ADR-0026). Réutilisable par les connecteurs « Tier 3/4 » (AWN, etc.).
 *
 * ⚠️ **Import dynamique** de `playwright` : ses binaires natifs ne doivent pas entrer dans le bundle
 * Next (la route cron importe la chaîne des connecteurs). Chargé uniquement à l'exécution (cron/tsx).
 *
 * Politesse : un navigateur **jetable par appel** (simple, suffisant pour 1 page de liste par source) ;
 * throttle/retry à la charge de l'appelant si besoin. UA réaliste, locale EN.
 */
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export interface HtmlRenduOptions {
  /** Pause après chargement, pour laisser Cloudflare/JS finir (ms). Défaut 3500. */
  attendreMs?: number;
  /** Condition d'attente de navigation. Défaut « domcontentloaded ». */
  waitUntil?: "load" | "domcontentloaded" | "networkidle" | "commit";
  /** Délai max de navigation (ms). Défaut 45000. */
  timeoutMs?: number;
}

/**
 * Récupère le **HTML rendu** d'une URL via Chromium headless (contourne Cloudflare/JS).
 * Lance puis ferme un navigateur jetable. Lève si la navigation échoue.
 */
export async function htmlRendu(url: string, opts: HtmlRenduOptions = {}): Promise<string> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({ userAgent: USER_AGENT, locale: "en-US" });
    const page = await ctx.newPage();
    await page.goto(url, {
      waitUntil: opts.waitUntil ?? "domcontentloaded",
      timeout: opts.timeoutMs ?? 45000,
    });
    if (opts.attendreMs !== 0) await page.waitForTimeout(opts.attendreMs ?? 3500);
    return await page.content();
  } finally {
    await browser.close();
  }
}

/**
 * Récupère le HTML rendu de **plusieurs URLs** en **un seul** lancement de navigateur, mais avec un
 * **contexte neuf par URL** (plus discret) et une **pause** entre chaque (politesse). Une URL en échec
 * donne `null` à sa position (résilience). Idéal pour une recherche multi-requêtes (ex. Indeed).
 */
export async function htmlRenduLot(
  urls: string[],
  opts: HtmlRenduOptions & { pauseEntreMs?: number } = {},
): Promise<(string | null)[]> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const out: (string | null)[] = [];
  try {
    for (let i = 0; i < urls.length; i++) {
      const ctx = await browser.newContext({ userAgent: USER_AGENT, locale: "fr-FR" });
      try {
        const page = await ctx.newPage();
        await page.goto(urls[i], {
          waitUntil: opts.waitUntil ?? "domcontentloaded",
          timeout: opts.timeoutMs ?? 45000,
        });
        if (opts.attendreMs !== 0) await page.waitForTimeout(opts.attendreMs ?? 3500);
        out.push(await page.content());
      } catch {
        out.push(null);
      } finally {
        await ctx.close();
      }
      if (i < urls.length - 1) {
        await new Promise((r) => setTimeout(r, opts.pauseEntreMs ?? 1500));
      }
    }
    return out;
  } finally {
    await browser.close();
  }
}
