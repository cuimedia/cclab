-- CreateTable
CREATE TABLE "WaFloatConfig" (
    "shop" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaFloatConfig_pkey" PRIMARY KEY ("shop")
);
