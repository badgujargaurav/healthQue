-- migration generated from current schema for table: clinics
CREATE TABLE `clinics` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `address` text,
  `phone` varchar(15) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `schedule` text,
  `doctor_id` int DEFAULT NULL,
  `description` text,
  PRIMARY KEY (`id`),
  KEY `idx_clinics_doctor_id` (`doctor_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
