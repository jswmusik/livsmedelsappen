import type { Page } from "playwright";

export interface ScrapedItem {
  externalProductKey: string;
  name: string;
  regularPrice: number;
  memberPrice: number | null;
  unit: string;
}

// Willys visar priser för hela sortimentet nationellt (bekräftat manuellt) -
// ingen butiksväxling behövs för att se pris, till skillnad från ICA.
// Kategorisidor att bevaka. Fler kan läggas till efter behov.
export const WILLYS_CATEGORY_URLS = [
  "https://www.willys.se/sortiment/kott-chark-och-fagel/fagel",
];

const COOKIE_ACCEPT_SELECTOR = "#onetrust-accept-btn-handler";

function parsePriceAndUnit(text: string): { price: number; unit: string } | null {
  // Kampanjpriser visas hopklistrade utan decimaltecken, t.ex. "4990/st"
  // där de sista två siffrorna alltid är ören -> 49,90 kr.
  const match = text.match(/(\d+)\s*\/\s*(\w+)/);
  if (!match) return null;
  const [, digits, unit] = match;
  if (digits.length < 3) return null;
  const whole = digits.slice(0, -2);
  const decimals = digits.slice(-2);
  return { price: Number(`${whole}.${decimals}`), unit };
}

function parseOrdinariePris(text: string): { price: number; unit: string } | null {
  const match = text.match(/Ordinarie pris\s+(\d+)[,.](\d{2})\s*kr\s*\/\s*(\w+)/);
  if (!match) return null;
  return { price: Number(`${match[1]}.${match[2]}`), unit: match[3] };
}

function nameFromSlug(href: string): string {
  const slug = href.split("/").pop() || "";
  return slug.replace(/-\d+_[A-Z]+$/, "").replace(/-/g, " ");
}

function externalKeyFromSlug(href: string): string | null {
  const match = href.match(/-(\d+)_[A-Z]+$/);
  return match ? match[1] : null;
}

export async function scrapeCategoryPage(
  page: Page,
  url: string
): Promise<ScrapedItem[]> {
  await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
  try {
    await page.click(COOKIE_ACCEPT_SELECTOR, { timeout: 5_000 });
  } catch {
    // bannern var inte synlig, inget att göra
  }
  await page.waitForTimeout(1_500);

  // Sidan laddar produkter via "infinite scroll" som triggas av en
  // IntersectionObserver - hoppar man direkt till botten missas den, så vi
  // skrollar i mindre steg (en skärmhöjd i taget) tills antalet varor slutar
  // öka två gånger i rad.
  let previousCount = -1;
  let stableRounds = 0;
  for (let i = 0; i < 80 && stableRounds < 3; i++) {
    const count = await page.locator('[data-testid="product"]').count();
    stableRounds = count === previousCount ? stableRounds + 1 : 0;
    previousCount = count;
    await page.mouse.wheel(0, 1200);
    await page.waitForTimeout(800);
  }

  const rawItems = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('[data-testid="product"]'));
    return cards.map((card) => ({
      href: card.querySelector('a[href*="/produkt/"]')?.getAttribute("href") ?? null,
      general:
        card.querySelector('[data-testid="product-price-GENERAL"]')?.textContent?.trim() ?? null,
      loyalty:
        card.querySelector('[data-testid="product-price-LOYALTY"]')?.textContent?.trim() ?? null,
      // Varor helt utan pågående kampanj visar bara denna, utan en separat
      // "Ordinarie pris"-jämförelse (det finns inget att jämföra med).
      dfault:
        card.querySelector('[data-testid="product-price-DEFAULT"]')?.textContent?.trim() ?? null,
      fullText: card.textContent ?? "",
    }));
  });

  const items: ScrapedItem[] = [];
  for (const raw of rawItems) {
    if (!raw.href) continue;
    const externalProductKey = externalKeyFromSlug(raw.href);
    if (!externalProductKey) continue;

    const ordinarie = parseOrdinariePris(raw.fullText);
    const general = raw.general ? parsePriceAndUnit(raw.general) : null;
    const loyalty = raw.loyalty ? parsePriceAndUnit(raw.loyalty) : null;
    const dfault = raw.dfault ? parsePriceAndUnit(raw.dfault) : null;

    const regular = general ?? ordinarie ?? dfault;
    if (!regular) continue;

    items.push({
      externalProductKey,
      name: nameFromSlug(raw.href),
      regularPrice: regular.price,
      memberPrice: loyalty?.price ?? null,
      unit: regular.unit,
    });
  }

  return items;
}
