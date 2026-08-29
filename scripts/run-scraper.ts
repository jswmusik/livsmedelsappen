import "dotenv/config";
import { runScraper } from "../src/scraper/runner";

runScraper()
  .then(() => {
    console.log("Scraper klar.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Scraper misslyckades:", error);
    process.exit(1);
  });
