-- AlterTable
ALTER TABLE "Address" ADD COLUMN     "label" TEXT NOT NULL DEFAULT 'Home',
ADD COLUMN     "landmark" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "receiverName" TEXT;
