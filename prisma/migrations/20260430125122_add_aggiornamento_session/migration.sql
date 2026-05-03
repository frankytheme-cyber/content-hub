-- CreateEnum
CREATE TYPE "SessioneTipo" AS ENUM ('CREAZIONE', 'AGGIORNAMENTO');

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "contenutoOriginale" TEXT,
ADD COLUMN     "focusAggiornamento" TEXT,
ADD COLUMN     "tipo" "SessioneTipo" NOT NULL DEFAULT 'CREAZIONE',
ADD COLUMN     "wpPostId" INTEGER,
ADD COLUMN     "wpPostUrl" TEXT;
