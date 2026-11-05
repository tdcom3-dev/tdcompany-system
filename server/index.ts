import { resolve } from "node:path";
import { Store } from "./store.ts";
import { Runner } from "./runner.ts";
import { createProvider } from "./provider.ts";
import { createApp } from "./app.ts";
const dataDir = resolve(process.env.DATA_DIR || ".data");
const store = new Store(resolve(dataDir, "company.sqlite"));
const assetDir = resolve(dataDir, "artifacts");
const runner = new Runner(store, createProvider(assetDir));
const port = Number(process.env.PORT || 3001);
createApp(store, runner, assetDir).listen(port, "127.0.0.1", () =>
  console.log(`TD Company server ready on port ${port}`),
);
