-- Migration: Add adventure park core tables
-- Created: 2026-04-28
-- Description: Add dedicated tables for attractions and ticket types while reusing the existing restaurant-prefixed domain model.

SET NAMES utf8mb4;

-- ==========================================
-- PARK ATTRACTIONS
-- ==========================================

CREATE TABLE IF NOT EXISTS `restaurant_attractions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint NOT NULL,
  `space_id` bigint DEFAULT NULL,
  `code` varchar(50) NOT NULL,
  `attraction_type` varchar(50) NOT NULL COMMENT 'ride, show, poi, game, service_point, zone',
  `experience_type` varchar(50) DEFAULT NULL COMMENT 'thrill, family, kids, water, indoor, outdoor',
  `thrill_level` varchar(20) DEFAULT NULL COMMENT 'low, medium, high, extreme',
  `min_height_cm` int DEFAULT NULL,
  `max_height_cm` int DEFAULT NULL,
  `min_age` int DEFAULT NULL,
  `max_age` int DEFAULT NULL,
  `duration_minutes` int DEFAULT NULL,
  `operating_hours` varchar(255) DEFAULT NULL,
  `queue_notes` text,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `map_x` decimal(10,4) DEFAULT NULL,
  `map_y` decimal(10,4) DEFAULT NULL,
  `vr360_link` varchar(1000) DEFAULT NULL,
  `primary_image_media_id` bigint DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `is_featured` tinyint(1) NOT NULL DEFAULT '0',
  `display_order` int NOT NULL DEFAULT '0',
  `attributes_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_restaurant_attractions_tenant_code` (`tenant_id`, `code`),
  KEY `ix_restaurant_attractions_space_id` (`space_id`),
  KEY `ix_restaurant_attractions_type` (`attraction_type`),
  KEY `ix_restaurant_attractions_experience_type` (`experience_type`),
  KEY `ix_restaurant_attractions_display_order` (`display_order`),
  CONSTRAINT `fk_restaurant_attractions_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_restaurant_attractions_space` FOREIGN KEY (`space_id`) REFERENCES `restaurant_spaces` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_restaurant_attractions_primary_image` FOREIGN KEY (`primary_image_media_id`) REFERENCES `media_files` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restaurant_attraction_translations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `attraction_id` bigint NOT NULL,
  `locale` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) NOT NULL,
  `short_description` varchar(500) DEFAULT NULL,
  `description` text,
  `safety_notes` text,
  `experience_notes` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_restaurant_attraction_translations_attraction_locale` (`attraction_id`, `locale`),
  KEY `ix_restaurant_attraction_translations_locale` (`locale`),
  CONSTRAINT `fk_restaurant_attraction_translations_attraction` FOREIGN KEY (`attraction_id`) REFERENCES `restaurant_attractions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_restaurant_attraction_translations_locale` FOREIGN KEY (`locale`) REFERENCES `locales` (`code`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restaurant_attraction_media` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `attraction_id` bigint NOT NULL,
  `media_id` bigint NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_restaurant_attraction_media_attraction_media` (`attraction_id`, `media_id`),
  CONSTRAINT `fk_restaurant_attraction_media_attraction` FOREIGN KEY (`attraction_id`) REFERENCES `restaurant_attractions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_restaurant_attraction_media_media` FOREIGN KEY (`media_id`) REFERENCES `media_files` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- PARK TICKET TYPES
-- ==========================================

CREATE TABLE IF NOT EXISTS `restaurant_ticket_types` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint NOT NULL,
  `code` varchar(50) NOT NULL,
  `ticket_type` varchar(50) NOT NULL COMMENT 'admission, combo, fast_pass, add_on, membership',
  `audience_type` varchar(50) DEFAULT NULL COMMENT 'adult, child, family, group, senior',
  `validity_type` varchar(50) DEFAULT NULL COMMENT 'single_day, date_range, time_slot, open_date',
  `base_price` decimal(12,2) DEFAULT NULL,
  `sale_price` decimal(12,2) DEFAULT NULL,
  `currency_code` varchar(10) NOT NULL DEFAULT 'VND',
  `valid_from` date DEFAULT NULL,
  `valid_to` date DEFAULT NULL,
  `start_time` varchar(10) DEFAULT NULL,
  `end_time` varchar(10) DEFAULT NULL,
  `min_height_cm` int DEFAULT NULL,
  `max_height_cm` int DEFAULT NULL,
  `min_age` int DEFAULT NULL,
  `max_age` int DEFAULT NULL,
  `max_visits` int DEFAULT NULL,
  `primary_image_media_id` bigint DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `is_featured` tinyint(1) NOT NULL DEFAULT '0',
  `display_order` int NOT NULL DEFAULT '0',
  `attributes_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_restaurant_ticket_types_tenant_code` (`tenant_id`, `code`),
  KEY `ix_restaurant_ticket_types_ticket_type` (`ticket_type`),
  KEY `ix_restaurant_ticket_types_audience_type` (`audience_type`),
  KEY `ix_restaurant_ticket_types_validity_type` (`validity_type`),
  KEY `ix_restaurant_ticket_types_display_order` (`display_order`),
  CONSTRAINT `fk_restaurant_ticket_types_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_restaurant_ticket_types_primary_image` FOREIGN KEY (`primary_image_media_id`) REFERENCES `media_files` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restaurant_ticket_type_translations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `ticket_type_id` bigint NOT NULL,
  `locale` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `terms_and_conditions` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_restaurant_ticket_type_translations_ticket_locale` (`ticket_type_id`, `locale`),
  KEY `ix_restaurant_ticket_type_translations_locale` (`locale`),
  CONSTRAINT `fk_restaurant_ticket_type_translations_ticket` FOREIGN KEY (`ticket_type_id`) REFERENCES `restaurant_ticket_types` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_restaurant_ticket_type_translations_locale` FOREIGN KEY (`locale`) REFERENCES `locales` (`code`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restaurant_ticket_type_media` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `ticket_type_id` bigint NOT NULL,
  `media_id` bigint NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_restaurant_ticket_type_media_ticket_media` (`ticket_type_id`, `media_id`),
  CONSTRAINT `fk_restaurant_ticket_type_media_ticket` FOREIGN KEY (`ticket_type_id`) REFERENCES `restaurant_ticket_types` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_restaurant_ticket_type_media_media` FOREIGN KEY (`media_id`) REFERENCES `media_files` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
