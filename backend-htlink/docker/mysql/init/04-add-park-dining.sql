CREATE TABLE IF NOT EXISTS `park_dining` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint NOT NULL,
  `code` varchar(50) NOT NULL,
  `dining_type` varchar(50) NOT NULL COMMENT 'restaurant, cafe, food_court, snack_bar, beverage_kiosk, dessert_shop, other',
  `availability` varchar(255) DEFAULT NULL,
  `price_information` varchar(255) DEFAULT NULL,
  `vr360_tour_url` varchar(1000) DEFAULT NULL,
  `booking_url` varchar(1000) DEFAULT NULL,
  `primary_image_media_id` bigint DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `display_order` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_park_dining_tenant_code` (`tenant_id`, `code`),
  KEY `ix_park_dining_dining_type` (`dining_type`),
  KEY `ix_park_dining_display_order` (`display_order`),
  CONSTRAINT `fk_park_dining_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_park_dining_primary_image` FOREIGN KEY (`primary_image_media_id`) REFERENCES `media_files` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `park_dining_translations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `dining_id` bigint NOT NULL,
  `locale` varchar(10) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_park_dining_translations_dining_locale` (`dining_id`, `locale`),
  KEY `ix_park_dining_translations_locale` (`locale`),
  CONSTRAINT `fk_park_dining_translations_dining` FOREIGN KEY (`dining_id`) REFERENCES `park_dining` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_park_dining_translations_locale` FOREIGN KEY (`locale`) REFERENCES `locales` (`code`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `park_dining_media` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `dining_id` bigint NOT NULL,
  `media_id` bigint NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_park_dining_media_dining_media` (`dining_id`, `media_id`),
  CONSTRAINT `fk_park_dining_media_dining` FOREIGN KEY (`dining_id`) REFERENCES `park_dining` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_park_dining_media_media` FOREIGN KEY (`media_id`) REFERENCES `media_files` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
