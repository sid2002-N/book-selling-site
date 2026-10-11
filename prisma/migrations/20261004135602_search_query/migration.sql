-- CreateTable
CREATE TABLE "search_query" (
    "id" UUID NOT NULL,
    "term" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "results_count" INTEGER NOT NULL,
    "user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_query_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "search_query_normalized_created_at_idx" ON "search_query"("normalized", "created_at");

-- CreateIndex
CREATE INDEX "search_query_created_at_idx" ON "search_query"("created_at");
