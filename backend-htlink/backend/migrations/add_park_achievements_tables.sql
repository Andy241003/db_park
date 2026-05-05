CREATE TABLE IF NOT EXISTS `park_achievements` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint NOT NULL,
  `code` varchar(50) NOT NULL,
  `achievement_type` varchar(50) DEFAULT NULL,
  `issuer` varchar(255) DEFAULT NULL,
  `awarded_at` date DEFAULT NULL,
  `location_text` varchar(500) DEFAULT NULL,
  `reference_url` varchar(1000) DEFAULT NULL,
  `primary_image_media_id` bigint DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `is_featured` tinyint(1) NOT NULL DEFAULT '0',
  `display_order` int NOT NULL DEFAULT '0',
  `attributes_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_park_achievements_tenant_code` (`tenant_id`, `code`),
  KEY `ix_park_achievements_type` (`achievement_type`),
  KEY `ix_park_achievements_awarded_at` (`awarded_at`),
  CONSTRAINT `fk_park_achievements_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_park_achievements_primary_image` FOREIGN KEY (`primary_image_media_id`) REFERENCES `media_files` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `park_achievement_translations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `achievement_id` bigint NOT NULL,
  `locale` varchar(10) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_park_achievement_translations_achievement_locale` (`achievement_id`, `locale`),
  KEY `ix_park_achievement_translations_locale` (`locale`),
  CONSTRAINT `fk_park_achievement_translations_achievement` FOREIGN KEY (`achievement_id`) REFERENCES `park_achievements` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_park_achievement_translations_locale` FOREIGN KEY (`locale`) REFERENCES `locales` (`code`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `park_achievement_media` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `achievement_id` bigint NOT NULL,
  `media_id` bigint NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_park_achievement_media_achievement_media` (`achievement_id`, `media_id`),
  CONSTRAINT `fk_park_achievement_media_achievement` FOREIGN KEY (`achievement_id`) REFERENCES `park_achievements` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_park_achievement_media_media` FOREIGN KEY (`media_id`) REFERENCES `media_files` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
