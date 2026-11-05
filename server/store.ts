import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { State } from "../shared/domain.ts";
import { seed } from "./seed.ts";
export class Store {
  db: DatabaseSync;
  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(
      "PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL)",
    );
    this.db
      .prepare("INSERT OR IGNORE INTO state VALUES(1, ?)")
      .run(JSON.stringify({ organization: seed, tasks: [] }));
  }
  read(): State {
    return JSON.parse(
      (
        this.db.prepare("SELECT data FROM state WHERE id=1").get() as {
          data: string;
        }
      ).data,
    );
  }
  update(fn: (state: State) => void) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const state = this.read();
      fn(state);
      this.db
        .prepare("UPDATE state SET data=? WHERE id=1")
        .run(JSON.stringify(state));
      this.db.exec("COMMIT");
      return state;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  close() {
    this.db.close();
  }
}
