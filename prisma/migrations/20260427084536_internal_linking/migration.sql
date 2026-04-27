-- CreateTable
CREATE TABLE "LinkAnalysisJob" (
    "id" TEXT NOT NULL,
    "sitoId" TEXT NOT NULL,
    "stato" TEXT NOT NULL DEFAULT 'in_coda',
    "fase" TEXT NOT NULL DEFAULT 'in_coda',
    "progresso" INTEGER NOT NULL DEFAULT 0,
    "totalePost" INTEGER NOT NULL DEFAULT 0,
    "postProcessati" INTEGER NOT NULL DEFAULT 0,
    "errore" TEXT,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aggiornatoIl" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkAnalysisJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkSuggestion" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "sitoId" TEXT NOT NULL,
    "fontePostId" INTEGER NOT NULL,
    "fonteTitolo" TEXT NOT NULL,
    "fonteUrl" TEXT NOT NULL,
    "targetPostId" INTEGER NOT NULL,
    "targetTitolo" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "anchorText" TEXT NOT NULL,
    "contesto" TEXT NOT NULL,
    "motivazione" TEXT NOT NULL,
    "stato" TEXT NOT NULL DEFAULT 'pendente',
    "appliedAt" TIMESTAMP(3),
    "errore" TEXT,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LinkSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LinkSuggestion_jobId_idx" ON "LinkSuggestion"("jobId");

-- CreateIndex
CREATE INDEX "LinkSuggestion_sitoId_idx" ON "LinkSuggestion"("sitoId");

-- AddForeignKey
ALTER TABLE "LinkAnalysisJob" ADD CONSTRAINT "LinkAnalysisJob_sitoId_fkey" FOREIGN KEY ("sitoId") REFERENCES "Sito"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkSuggestion" ADD CONSTRAINT "LinkSuggestion_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "LinkAnalysisJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
