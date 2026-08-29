import type { Page } from "playwright";
import type { ScrapedItem } from "../types";

// ICA har butiksspecifika priser (franchise). Erbjudandesidan visar bara
// varor som just nu har en kampanj - inte hela sortimentet - men ger ett
// stabilt produkt-id (data-promotion-id) utan inloggning.

const COOKIE_SELECTOR = "button:has-text('Godkänn'), button:has-text('Acceptera')";

export function offersUrlFromStoreUrl(storeUrl: string): string {
  const withoutQuery = storeUrl.split("?")[0];
  const segments = withoutQuery.split("/").filter(Boolean);
  const slug = segments[segments.length - 1];
  return `https://www.ica.se/erbjudanden/${slug}/`;
}

function parseOrdinariePris(text: string): number | null {
  // "Ord.pris 43:95-44:95 kr" eller "Ord.pris 34:02 kr" -> lägsta värdet
  const match = text.match(/Ord\.?pris\s+(\d+)[:,.](\d{2})/);
  if (!match) return null;
  return Number(`${match[1]}.${match[2]}`);
}

function parseCampaignUnitPrice(text: string): number | null {
  // "3 för 100 kr", "2 för 100:-" osv -> pris per styck
  const match = text.match(/(\d+)\s*för\s*(\d+)(?:[:,.](\d{2}))?\s*(?:kr|:-)/i);
  if (!match) return null;
  const count = Number(match[1]);
  const wholeKr = Number(match[2]);
  const decimals = match[3] ? Number(match[3]) / 100 : 0;
  if (count === 0) return null;
  return Math.round(((wholeKr + decimals) / count) * 100) / 100;
}

function isStammisOffer(card: { querySelector: (s: string) => Element | null }): boolean {
  const el = card.querySelector("[class*='stammis' i]");
  return !!el && /stammis/i.test(el.textContent || "");
}

export async function scrapeIcaStoreOffers(
  page: Page,
  storeUrl: string
): Promise<ScrapedItem[]> {
  const url = offersUrlFromStoreUrl(storeUrl);
  await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
  try {
    await page.click(COOKIE_SELECTOR, { timeout: 5_000 });
  } catch {
    // ingen cookiebanner synlig
  }
  await page.waitForTimeout(1_500);

  // Ladda alla erbjudanden (skrollande lista, samma mönster som Willys).
  let previousCount = -1;
  let stableRounds = 0;
  for (let i = 0; i < 80 && stableRounds < 3; i++) {
    const count = await page.locator("article.offer-card").count();
    stableRounds = count === previousCount ? stableRounds + 1 : 0;
    previousCount = count;
    await page.mouse.wheel(0, 1_200);
    await page.waitForTimeout(800);
  }

  const rawCards = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll("article.offer-card"));
    return cards.map((card) => ({
      externalProductKey: card.getAttribute("data-promotion-id"),
      name: card.getAttribute("data-promotion-name"),
      brand: card.getAttribute("data-promotion-brand"),
      isStammis: !!card.querySelector("[class*='stammis' i]"),
      fullText: card.textContent ?? "",
    }));
  });

  const items: ScrapedItem[] = [];
  for (const raw of rawCards) {
    if (!raw.externalProductKey || !raw.name) continue;

    const ordinariePris = parseOrdinariePris(raw.fullText);
    const campaignPrice = parseCampaignUnitPrice(raw.fullText);
    if (ordinariePris === null && campaignPrice === null) continue;

    const regularPrice = ordinariePris ?? campaignPrice!;
    const memberPrice =
      campaignPrice !== null && raw.isStammis ? campaignPrice : null;
    const publicSalePrice =
      campaignPrice !== null && !raw.isStammis ? campaignPrice : null;

    items.push({
      externalProductKey: raw.externalProductKey,
      name: raw.brand ? `${raw.name} (${raw.brand})` : raw.name,
      regularPrice: publicSalePrice ?? regularPrice,
      memberPrice,
      unit: "st",
    });
  }

  return items;
}
