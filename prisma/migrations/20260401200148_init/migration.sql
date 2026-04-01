-- CreateTable
CREATE TABLE "AdminUser" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "login" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isSuperadmin" BOOLEAN NOT NULL DEFAULT false,
    "access" TEXT NOT NULL DEFAULT '{"orders":true,"stats":true,"contacts":true,"menu":true}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "menuDate" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "weight" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'lunch',
    "composition" TEXT NOT NULL DEFAULT '',
    "calories" INTEGER NOT NULL DEFAULT 0,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "quantity" INTEGER NOT NULL DEFAULT 50
);

-- CreateTable
CREATE TABLE "Order" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "number" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "pickupDate" TEXT NOT NULL,
    "pickupTime" TEXT NOT NULL,
    "comment" TEXT,
    "total" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderId" INTEGER NOT NULL,
    "menuItemId" INTEGER,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_login_key" ON "AdminUser"("login");

-- CreateIndex
CREATE INDEX "MenuItem_menuDate_idx" ON "MenuItem"("menuDate");

-- CreateIndex
CREATE UNIQUE INDEX "Order_number_key" ON "Order"("number");
