import fs from "fs-extra";
import path from "path";
import csv from "csv-parser";
import Database from "better-sqlite3";
import { Entry, TypeMap } from "./types";

const useSQLite = process.argv.includes("--sqlite");

const UNIT_REDUCTION_RULES: Record<string, number> = JSON.parse(
  fs.readFileSync(path.join("config", "unit_reduction_rules.json"), "utf8")
);

const skippedPartnerIds: string[] = JSON.parse(
  fs.readFileSync(path.join("config", "skipped_partners.json"), "utf8")
);

const SKIPPED_PARTNER_IDS = new Set(skippedPartnerIds);

const typemap: TypeMap = JSON.parse(
  fs.readFileSync(path.join("data", "typemap.json"), "utf8")
);

const chargeableRows: string[] = [];
const domainSet = new Set<string>();
const domainRows: string[] = [];
const productStats: Record<string, number> = {};

fs.createReadStream(path.join("data", "Sample_Report.csv"))
  .pipe(csv())
  .on("data", (row: Entry) => {
    const { PartnerID, PartNumber, itemCount, plan, accountGuid, domains } =
      row;

    if (
      !PartNumber ||
      !itemCount ||
      Number(itemCount) <= 0 ||
      SKIPPED_PARTNER_IDS.has(PartnerID)
    ) {
      return;
    }

    const product = typemap[PartNumber];
    if (!product) {
      console.error(`Unknown PartNumber: ${PartNumber}`);
      return;
    }

    // Require cleaned accountGuid to be exactly 32 chars
    const partnerPurchasedPlanID = accountGuid.replace(/[^a-zA-Z0-9]/g, "");
    if (partnerPurchasedPlanID.length !== 32) {
      return;
    }

    const reduction = UNIT_REDUCTION_RULES[PartNumber] || 1;
    const usage = Math.floor(Number(itemCount) / reduction);
    if (reduction > 1) console.log(UNIT_REDUCTION_RULES[PartNumber]);

    chargeableRows.push(
      `(${PartnerID}, '${product}', '${partnerPurchasedPlanID}', '${plan}', ${usage})`
    );

    const productTotal = productStats[product] || 0;
    productStats[product] = productTotal + Number(itemCount);

    // Keep first partnerPurchasedPlanID per domain for determinism
    if (!domainSet.has(domains)) {
      domainSet.add(domains);
      domainRows.push(`('${partnerPurchasedPlanID}', '${domains}')`);
    }
  })
  .on("end", () => {
    if (useSQLite) {
      const db = new Database("usage.db");

      db.exec(`
            CREATE TABLE IF NOT EXISTS chargeable (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                partnerID INTEGER,
                product TEXT,
                partnerPurchasedPlanID TEXT,
                plan TEXT,
                usage INTEGER
            );

            CREATE TABLE IF NOT EXISTS domains (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                partnerPurchasedPlanID TEXT,
                domain TEXT
            );
        `);

      if (chargeableRows.length > 0) {
        const insertSQL = `
            INSERT INTO chargeable (partnerID, product, partnerPurchasedPlanID, plan, usage) VALUES
            ${chargeableRows.join(",\n")}
        ;`;
        try {
          db.exec(insertSQL);
          console.log("Inserted into chargeable table");
        } catch (err) {
          console.error("Failed to insert into chargeable table:", err);
        }
      }

      if (domainRows.length > 0) {
        const insertSQL = `
      INSERT INTO domains (partnerPurchasedPlanID, domain) VALUES
      ${domainRows.join(",\n")}
    ;`;
        try {
          db.exec(insertSQL);
          console.log("Inserted into domains table");
        } catch (err) {
          console.error("Failed to insert into domains table:", err);
        }
      }
    } else {
      console.log("--- SQL OUTPUT ---\n");
      console.log(
        "INSERT INTO chargeable (partnerID, product, partnerPurchasedPlanID, plan, usage) VALUES"
      );
      console.log(chargeableRows.join(",\n") + ";\n");
      console.log(
        "INSERT INTO domains (partnerPurchasedPlanID, domain) VALUES"
      );
      console.log(domainRows.join(",\n") + ";\n");
    }
  });
