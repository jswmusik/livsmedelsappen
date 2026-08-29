import { chromium } from "playwright";
import { db } from "../lib/db";
import { WILLYS_CATEGORY_URLS, scrapeCategoryPage } from "./chains/willys";
import { scrapeIcaStoreOffers } from "./chains/ica";
import type { ScrapedItem } from "./types";
import { delayFor, isWithinAllowedWindow, sleep } from "./politeness";

const USER_AGENT =
  "LivsmedelsappBot/1.0 (privat hushallsbruk; kontakt: johan.wikstrom@ungdomsappen.se)";

async function saveScrapedItems(chain: string, storeIds: string[], items: ScrapedItem[]) {
  const mappings = await db.productMapping.findMany({
    where: {
      chain,
      externalProductKey: { in: items.map((i) => i.externalProductKey) },
    },
  });
  const mappingByKey = new Map(mappings.map((m) => [m.externalProductKey, m.productId]));

  let matched = 0;
  let unmatched = 0;

  for (const item of items) {
    const productId = mappingByKey.get(item.externalProductKey);

    if (productId) {
      matched++;
      for (const storeId of storeIds) {
        await db.priceObservation.create({
          data: {
            productId,
            storeId,
            regularPrice: item.regularPrice,
            memberPrice: item.memberPrice,
            unit: item.unit,
          },
        });
      }
    } else {
      unmatched++;
      // En UnmatchedScrapeItem är hushållsspecifik, men mappning görs per kedja.
      // Vi skapar en rad per hushåll som har en aktiv butik för kedjan.
      const households = await db.store.findMany({
        where: { id: { in: storeIds } },
        select: { householdId: true },
        distinct: ["householdId"],
      });
      for (const { householdId } of households) {
        await db.unmatchedScrapeItem.upsert({
          where: {
            householdId_chain_externalProductKey: {
              householdId,
              chain,
              externalProductKey: item.externalProductKey,
            },
          },
          update: {
            lastSeenPrice: item.regularPrice,
            lastSeenAt: new Date(),
          },
          create: {
            householdId,
            chain,
            externalProductKey: item.externalProductKey,
            externalName: item.name,
            lastSeenPrice: item.regularPrice,
            lastSeenAt: new Date(),
          },
        });
      }
    }
  }

  return { matched, unmatched };
}

async function runWillys() {
  if (!isWithinAllowedWindow("WILLYS")) {
    console.log("WILLYS: utanför tillåtet tidsfönster (04:00-08:45 UTC), hoppar över.");
    return;
  }

  const stores = await db.store.findMany({
    where: { chain: "WILLYS", isEnabled: true },
  });
  if (stores.length === 0) {
    console.log("WILLYS: inga aktiva butiker att scrapa, hoppar över.");
    return;
  }
  const storeIds = stores.map((s) => s.id);

  console.log(`WILLYS: scrapar ${WILLYS_CATEGORY_URLS.length} kategorisidor...`);
  const browser = await chromium.launch();
  const page = await browser.newPage({ userAgent: USER_AGENT });

  let allItems: ScrapedItem[] = [];
  for (let i = 0; i < WILLYS_CATEGORY_URLS.length; i++) {
    if (i > 0) await sleep(delayFor("WILLYS"));
    const url = WILLYS_CATEGORY_URLS[i];
    try {
      const items = await scrapeCategoryPage(page, url);
      console.log(`  ${url} -> ${items.length} varor`);
      allItems = allItems.concat(items);
    } catch (error) {
      console.error(`  Misslyckades att scrapa ${url}:`, error);
    }
  }

  await browser.close();

  const { matched, unmatched } = await saveScrapedItems("WILLYS", storeIds, allItems);
  await db.store.updateMany({
    where: { id: { in: storeIds } },
    data: { lastScrapedAt: new Date() },
  });

  console.log(`WILLYS: klart. ${matched} matchade varor, ${unmatched} omatchade.`);
}

async function runIca() {
  if (!isWithinAllowedWindow("ICA")) {
    console.log("ICA: utanför tillåtet tidsfönster, hoppar över.");
    return;
  }

  const stores = await db.store.findMany({
    where: { chain: "ICA", isEnabled: true },
  });
  if (stores.length === 0) {
    console.log("ICA: inga aktiva butiker att scrapa, hoppar över.");
    return;
  }

  console.log(`ICA: scrapar ${stores.length} butik(er)...`);
  const browser = await chromium.launch();
  const page = await browser.newPage({ userAgent: USER_AGENT });

  let totalMatched = 0;
  let totalUnmatched = 0;

  for (let i = 0; i < stores.length; i++) {
    if (i > 0) await sleep(delayFor("ICA"));
    const store = stores[i];
    try {
      const items = await scrapeIcaStoreOffers(page, store.url);
      console.log(`  ${store.name} -> ${items.length} erbjudanden`);
      const { matched, unmatched } = await saveScrapedItems("ICA", [store.id], items);
      totalMatched += matched;
      totalUnmatched += unmatched;
      await db.store.update({
        where: { id: store.id },
        data: { lastScrapedAt: new Date() },
      });
    } catch (error) {
      console.error(`  Misslyckades att scrapa ${store.name}:`, error);
    }
  }

  await browser.close();
  console.log(`ICA: klart. ${totalMatched} matchade varor, ${totalUnmatched} omatchade.`);
}

export async function runScraper() {
  await runWillys();
  await runIca();
  // COOP, LIDL läggs till i kommande steg.
}
