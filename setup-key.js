import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { writeFile } from "node:fs/promises";

const rl = createInterface({ input, output });

console.log("\nMassive API key setup\n");
console.log("Paste your Massive API key below. It will be saved only to local .env.");
console.log("Do not paste it into ChatGPT/Codex chat.\n");

const key = (await rl.question("Massive API key: ")).trim();
rl.close();

if (!key || key.length < 12) {
  console.error("\nNo valid-looking key was entered. Nothing was changed.");
  process.exit(1);
}

const env = [
  "DATA_PROVIDER=massive",
  `MASSIVE_API_KEY=${key}`,
  "WATCHLIST=SMH,NVDA,AMD,MU,AVGO,INTC,QQQ,SPY",
  "HVL_VALUE=7495",
  "",
].join("\n");

await writeFile(".env", env, "utf8");

console.log("\nDone. Your .env file is configured.");
console.log("Next run: node server.js");
