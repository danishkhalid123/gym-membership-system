-- DropForeignKey
ALTER TABLE `attendance` DROP FOREIGN KEY `attendance_user_id_fkey`;

-- DropIndex
DROP INDEX `attendance_user_id_fkey` ON `attendance`;

-- CreateTable
CREATE TABLE `machine` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `status` ENUM('AVAILABLE', 'MAINTENANCE', 'BROKEN') NOT NULL DEFAULT 'AVAILABLE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
