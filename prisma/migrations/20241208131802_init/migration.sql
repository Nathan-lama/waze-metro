-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Marker" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Marker" ("id", "lat", "lng", "timestamp", "type") SELECT "id", "lat", "lng", "timestamp", "type" FROM "Marker";
DROP TABLE "Marker";
ALTER TABLE "new_Marker" RENAME TO "Marker";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
