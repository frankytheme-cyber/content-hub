-- CreateEnum
CREATE TYPE "StatoSession" AS ENUM ('IN_ATTESA', 'IN_CORSO', 'COMPLETATA', 'FALLITA');

-- CreateEnum
CREATE TYPE "StatoArticolo" AS ENUM ('BOZZA', 'REVISIONE', 'APPROVATO', 'PUBBLICATO');

-- CreateEnum
CREATE TYPE "StatoJob" AS ENUM ('IN_CODA', 'IN_ESECUZIONE', 'COMPLETATO', 'FALLITO');

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stato" "StatoSession" NOT NULL DEFAULT 'IN_ATTESA',
    "categoria" TEXT NOT NULL,
    "argomento" TEXT NOT NULL,
    "fonti" TEXT[],
    "ricercaJson" JSONB,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkInterno" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "testo" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "LinkInterno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Articolo" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titolo" TEXT NOT NULL,
    "stato" "StatoArticolo" NOT NULL DEFAULT 'BOZZA',
    "pubblicatoIl" TIMESTAMP(3),
    "wpPostId" INTEGER,
    "versioneScelta" TEXT,

    CONSTRAINT "Articolo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Versione" (
    "id" TEXT NOT NULL,
    "articoloId" TEXT NOT NULL,
    "indice" INTEGER NOT NULL,
    "tono" TEXT NOT NULL,
    "corpo" TEXT NOT NULL,
    "noteRevisione" TEXT,
    "seoJson" JSONB NOT NULL DEFAULT '{}',
    "immagineUrl" TEXT,
    "immagineCreditUrl" TEXT,
    "punteggio" DOUBLE PRECISION,

    CONSTRAINT "Versione_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT NOT NULL,
    "stato" "StatoJob" NOT NULL DEFAULT 'IN_CODA',
    "fase" TEXT,
    "errore" TEXT,
    "completatoIl" TIMESTAMP(3),

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Articolo_slug_key" ON "Articolo"("slug");

-- AddForeignKey
ALTER TABLE "LinkInterno" ADD CONSTRAINT "LinkInterno_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Articolo" ADD CONSTRAINT "Articolo_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Versione" ADD CONSTRAINT "Versione_articoloId_fkey" FOREIGN KEY ("articoloId") REFERENCES "Articolo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
