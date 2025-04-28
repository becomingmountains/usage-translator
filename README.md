# Usage Translator

## Environment

- **Node.js**: `v22.14.0`
- **npm**: `v10.9.2`
- **TypeScript**: `^5.8.3`

It supports two run modes:

- Outputting SQL statements only (default)
- Inserting directly into a local SQLite database (`usage.db`) using the `--sqlite` flag

## How to Run

1. Install dependencies:

```bash
npm install
```

2. Run the app:

### Option A: Generate SQL only (default)

Prints SQL INSERT statements to the console without modifying any database.

```bash
npm start
```

### Option B: Insert into SQLite database (Requires SQLite set up below)

```bash
npm start -- --sqlite
```

## Setting up SQLite (if not already installed)

### Ubuntu / Debian

```bash
sudo apt update
sudo apt install sqlite3
```

### macOS

```bash
brew install sqlite3
```

### Verify Installation

```bash
sqlite3 --version
```

### Create Database

```bash
sqlite3 usage.db
```

### Create Tables

Note: You do not need to manually create the tables. The app will automatically create `chargeable` and `domains` tables in `usage.db` if they do not already exist.

```bash
CREATE TABLE chargeable (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  partnerID INTEGER,
  product TEXT,
  partnerPurchasedPlanID TEXT,
  plan TEXT,
  usage INTEGER
);

CREATE TABLE domains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  partnerPurchasedPlanID TEXT,
  domain TEXT
);
```

## Input Files

Make sure the following files are placed in the correct directories:

- `data/Sample_Report.csv` – CSV file containing usage data.
- `data/typemap.json` – Maps `PartNumber` to product names.
- `config/unit_reduction_rules.json` – Maps PartNumber to unit reduction factors.
- `config/skipped_partners.json` – List of PartnerIDs to ignore during processing.

## Pre-Generated Output Files

In case the program cannot be executed in your environment, the following files are included as part of the deliverables:

### `outputs/chargeable_insert.sql`

Contains a bulk SQL `INSERT INTO` statement for the `chargeable` table. Each row corresponds to a valid usage entry from the CSV input, normalized and mapped according to the specification.

### `outputs/domains_insert.sql`

Contains a bulk SQL `INSERT INTO` statement for the `domains` table. Only distinct domain names are included, with one associated `partnerPurchasedPlanID` per domain, as required by the acceptance criteria.

### `outputs/product_stats.txt`

A plain text summary showing the total `itemCount` accumulated for each product type.

You can run the `.sql` files manually against a SQLite-compatible database to verify expected outcomes.
