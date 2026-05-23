-- Tezkor (quick lists) feature

-- User-level "awaiting name input" state for the bot
ALTER TABLE "User"
  ADD COLUMN "botNamingListId" TEXT;

-- QuickList: a grouped collection of quick items.
CREATE TABLE "QuickList" (
  "id"               TEXT NOT NULL,
  "userId"           TEXT NOT NULL,
  "name"             TEXT NOT NULL,
  "source"           TEXT NOT NULL,
  "closedAt"         TIMESTAMP(3),
  "summaryChatId"    BIGINT,
  "summaryMessageId" INTEGER,
  "deletedAt"        TIMESTAMP(3),
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QuickList_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "QuickList_userId_deletedAt_idx" ON "QuickList"("userId", "deletedAt");
CREATE INDEX "QuickList_userId_closedAt_updatedAt_idx" ON "QuickList"("userId", "closedAt", "updatedAt");

ALTER TABLE "QuickList"
  ADD CONSTRAINT "QuickList_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- QuickListItem: a single line in a QuickList.
CREATE TABLE "QuickListItem" (
  "id"        TEXT NOT NULL,
  "listId"    TEXT NOT NULL,
  "text"      TEXT NOT NULL,
  "done"      BOOLEAN NOT NULL DEFAULT false,
  "order"     INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QuickListItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "QuickListItem_listId_idx" ON "QuickListItem"("listId");

ALTER TABLE "QuickListItem"
  ADD CONSTRAINT "QuickListItem_listId_fkey"
  FOREIGN KEY ("listId") REFERENCES "QuickList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
