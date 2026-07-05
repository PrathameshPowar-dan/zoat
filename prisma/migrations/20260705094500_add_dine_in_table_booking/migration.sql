-- CreateEnum
CREATE TYPE "TableBookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- AlterTable
ALTER TABLE "Restaurant"
ADD COLUMN "supportsDineIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "dineInCapacity" INTEGER;

-- CreateTable
CREATE TABLE "TableBooking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "bookingDateTime" TIMESTAMP(3) NOT NULL,
    "partySize" INTEGER NOT NULL,
    "specialRequest" TEXT,
    "status" "TableBookingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TableBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TableBooking_restaurantId_bookingDateTime_idx" ON "TableBooking"("restaurantId", "bookingDateTime");

-- CreateIndex
CREATE INDEX "TableBooking_userId_createdAt_idx" ON "TableBooking"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "TableBooking" ADD CONSTRAINT "TableBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableBooking" ADD CONSTRAINT "TableBooking_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
