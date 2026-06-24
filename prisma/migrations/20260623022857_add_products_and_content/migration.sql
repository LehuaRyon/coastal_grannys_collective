-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "origin" TEXT,
    "process" TEXT,
    "elevation" TEXT,
    "roast" TEXT,
    "notes" TEXT[],
    "prices" JSONB,
    "freq" TEXT,
    "period" TEXT,
    "features" TEXT[],
    "options" TEXT[],
    "gradient" TEXT,
    "icon" TEXT,
    "badge" TEXT,
    "badgeClass" TEXT,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteContent" (
    "id" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_type_idx" ON "Product"("type");

-- CreateIndex
CREATE INDEX "Product_position_idx" ON "Product"("position");

-- CreateIndex
CREATE INDEX "SiteContent_page_idx" ON "SiteContent"("page");

-- CreateIndex
CREATE UNIQUE INDEX "SiteContent_page_key_key" ON "SiteContent"("page", "key");
