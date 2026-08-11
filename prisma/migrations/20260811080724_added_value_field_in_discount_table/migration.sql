/*
  Warnings:

  - Added the required column `value` to the `discounts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `discounts` ADD COLUMN `value` INTEGER NOT NULL;
