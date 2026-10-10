-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
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
    "ownerId" TEXT,
    "nextCheckAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Watch_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Watch" ("active", "checkWindows", "createdAt", "discordWebhookUrl", "email", "id", "ignoreRegex", "intervalMin", "nextCheckAt", "pausedUntil", "selector", "slackWebhookUrl", "tags", "title", "updatedAt", "url", "valueRegex", "webhookUrl") SELECT "active", "checkWindows", "createdAt", "discordWebhookUrl", "email", "id", "ignoreRegex", "intervalMin", "nextCheckAt", "pausedUntil", "selector", "slackWebhookUrl", "tags", "title", "updatedAt", "url", "valueRegex", "webhookUrl" FROM "Watch";
DROP TABLE "Watch";
ALTER TABLE "new_Watch" RENAME TO "Watch";
CREATE INDEX "Watch_ownerId_idx" ON "Watch"("ownerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
