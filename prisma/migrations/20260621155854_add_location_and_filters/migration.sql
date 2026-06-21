-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "isVeg" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "costForTwo" INTEGER,
ADD COLUMN     "cuisines" TEXT[],
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "isPureVeg" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lng" DOUBLE PRECISION;
