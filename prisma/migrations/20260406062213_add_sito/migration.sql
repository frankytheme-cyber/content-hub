-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "sitoId" TEXT;

-- CreateTable
CREATE TABLE "Sito" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "dominio" TEXT NOT NULL,
    "istruzioni" TEXT NOT NULL,
    "categorie" TEXT[],
    "wpSiteUrl" TEXT,
    "wpUsername" TEXT,
    "wpAppPassword" TEXT,

    CONSTRAINT "Sito_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sito_dominio_key" ON "Sito"("dominio");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_sitoId_fkey" FOREIGN KEY ("sitoId") REFERENCES "Sito"("id") ON DELETE SET NULL ON UPDATE CASCADE;
