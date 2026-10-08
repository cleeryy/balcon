-- AlterTable
ALTER TABLE "CheckLog" ADD COLUMN "backend" TEXT;
ALTER TABLE "CheckLog" ADD COLUMN "contentHash" TEXT;
ALTER TABLE "CheckLog" ADD COLUMN "errorKind" TEXT;
ALTER TABLE "CheckLog" ADD COLUMN "fetchMs" INTEGER;
ALTER TABLE "CheckLog" ADD COLUMN "htmlBytes" INTEGER;
ALTER TABLE "CheckLog" ADD COLUMN "httpStatus" INTEGER;
ALTER TABLE "CheckLog" ADD COLUMN "parseMs" INTEGER;
ALTER TABLE "CheckLog" ADD COLUMN "selectorMatches" INTEGER;
ALTER TABLE "CheckLog" ADD COLUMN "textBytes" INTEGER;

-- CreateTable
CREATE TABLE "ValuePoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "watchId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'value',
    "value" TEXT NOT NULL,
    "numeric" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ValuePoint_watchId_fkey" FOREIGN KEY ("watchId") REFERENCES "Watch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Watch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "selector" TEXT,
    "ignoreRegex" TEXT,
    "intervalMin" INTEGER NOT NULL DEFAULT 30,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "webhookUrl" TEXT,
    "email" TEXT,
    "tags" TEXT NOT NULL DEFAULT '',
    "valueRegex" TEXT,
    "discordWebhookUrl" TEXT,
    "slackWebhookUrl" TEXT,
    "checkWindows" TEXT,
    "pausedUntil" DATETIME,
    "nextCheckAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Watch" ("active", "createdAt", "email", "id", "ignoreRegex", "intervalMin", "nextCheckAt", "selector", "title", "updatedAt", "url", "webhookUrl") SELECT "active", "createdAt", "email", "id", "ignoreRegex", "intervalMin", "nextCheckAt", "selector", "title", "updatedAt", "url", "webhookUrl" FROM "Watch";
DROP TABLE "Watch";
ALTER TABLE "new_Watch" RENAME TO "Watch";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ValuePoint_watchId_createdAt_idx" ON "ValuePoint"("watchId", "createdAt");
