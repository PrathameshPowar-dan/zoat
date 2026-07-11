-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "preferredCuisines" TEXT[],
ADD COLUMN     "preferredLanguage" TEXT,
ADD COLUMN     "profilePictureUrl" TEXT;
