/*
  Warnings:

  - The values [Fixed] on the enum `discounts_type` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `discounts` MODIFY `type` ENUM('fixed', 'Percent') NOT NULL;
