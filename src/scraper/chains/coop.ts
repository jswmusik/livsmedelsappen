import type { Page } from "playwright";
import type { ScrapedItem } from "../types";

// Coop visar bara aktuella erbjudanden (inte hela sortimentet), men ger en
// EAN-kod direkt i produkt-URL:en - en stabil, kedjeoberoende identifierare.
export const COOP_OFFERS_URL = "https://www.coop.se/handla/aktuella-erbjudanden/";

const CARD_SELECTOR = "article";
const COOKIE_BUTTON_TEXT = "text=Acceptera alla cookies";

function eanFromHref(href: string): string | null {
  const match = href.match(/-(\d{8,14})$/);
  return match ? match[1] : null;
}

function parseOrdinariePris(text: string): number | null {
  const match = text.match(/Ord\.\s*pris\s+(\d+)[,.](\d{2})\s*kr/);
  if (!match) return null;
  return Number(`${match[1]}.${match[2]}`);
}

function parseMemberDeal(text: string): { price: number; unit: string } | null {
  const startIdx = text.indexOf("MEDLEMSPRIS");
  if (startIdx === -1) return null;
  const endIdx = text.indexOf("Ord. pris", startIdx);
  const dealText = text.slice(startIdx, endIdx === -1 ? undefined : endIdx);

  const forMatch = dealText.match(/(\d+)\s*för\s*(\d+)(?:[,.](\d{2}))?\s*kr/i);
  if (forMatch) {
    const count = Number(forMatch[1]);
    const wholeKr = Number(forMatch[2]);
    const decimals = forMatch[3] ? Number(forMatch[3]) / 100 : 0;
    if (count > 0) {
      return { price: Math.round(((wholeKr + decimals) / count) * 100) / 100, unit: "st" };
    }
  }

  const perUnitMatch = dealText.match(/(\d+)[,.](\d{2})\s*kr\s*\/\s*(\w+)/);
  if (perUnitMatch) {
    return {
      price: Number(`${perUnitMatch[1]}.${perUnitMatch[2]}`),
      unit: perUnitMatch[3],
    };
  }

  return null;
}

export async function scrapeCoopOffers(page: Page, url: string = COOP_OFFERS_URL): Promise<ScrapedItem[]> {
  await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
  try {
    await page.click(COOKIE_BUTTON_TEXT, { timeout: 6_000 });
  } catch {
    // bannern var inte synlig
  }
  await page.waitForTimeout(1_500);

  let previousCount = -1;
  let stableRounds = 0;
  for (let i = 0; i < 200 && stableRounds < 5; i++) {
    const count = await page.locator(CARD_SELECTOR).count();
    stableRounds = count === previousCount ? stableRounds + 1 : 0;
    previousCount = count;
    await page.mouse.wheel(0, 1_200);
    await page.waitForTimeout(1_000);
  }

  const rawCards = await page.evaluate((selector) => {
    const cards = Array.from(document.querySelectorAll(selector));
    return cards.map((card) => ({
      href: card.querySelector("a[href]")?.getAttribute("href") ?? null,
      fullText: card.textContent ?? "",
    }));
  }, CARD_SELECTOR);

  const items: ScrapedItem[] = [];
  for (const raw of rawCards) {
    if (!raw.href) continue;
    const externalProductKey = eanFromHref(raw.href);
    if (!externalProductKey) continue;

    const ordinariePris = parseOrdinariePris(raw.fullText);
    const memberDeal = parseMemberDeal(raw.fullText);
    if (ordinariePris === null && !memberDeal) continue;

    // Namnet står allra först i textinnehållet, före märke/storlek.
    const nameGuess = raw.fullText.split(".")[0].trim() || "Okänd vara";

    items.push({
      externalProductKey,
      name: nameGuess,
      regularPrice: ordinariePris ?? memberDeal!.price,
      memberPrice: memberDeal?.price ?? null,
      unit: memberDeal?.unit ?? "st",
    });
  }

  return items;
}
