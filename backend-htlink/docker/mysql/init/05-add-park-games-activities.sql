CREATE TABLE IF NOT EXISTS `park_games_activities` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint NOT NULL,
  `code` varchar(50) NOT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `start_time` varchar(20) DEFAULT NULL,
  `end_time` varchar(20) DEFAULT NULL,
  `location_id` bigint DEFAULT NULL,
  `space_id` bigint DEFAULT NULL,
  `location_text` varchar(255) DEFAULT NULL,
  `registration_url` varchar(1000) DEFAULT NULL,
  `max_participants` int DEFAULT NULL,
  `primary_image_media_id` bigint DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'upcoming',
  `is_featured` tinyint(1) NOT NULL DEFAULT '0',
  `display_order` int NOT NULL DEFAULT '0',
  `attributes_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_park_games_activities_tenant_code` (`tenant_id`, `code`),
  KEY `ix_park_games_activities_status` (`status`),
  KEY `ix_park_games_activities_start_date` (`start_date`),
  KEY `ix_park_games_activities_display_order` (`display_order`),
  CONSTRAINT `fk_park_games_activities_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_park_games_activities_location` FOREIGN KEY (`location_id`) REFERENCES `park_locations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_park_games_activities_space` FOREIGN KEY (`space_id`) REFERENCES `park_spaces` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_park_games_activities_primary_image` FOREIGN KEY (`primary_image_media_id`) REFERENCES `media_files` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `park_game_activity_translations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `game_activity_id` bigint NOT NULL,
  `locale` varchar(10) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `details` longtext,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_park_game_activity_translations_activity_locale` (`game_activity_id`, `locale`),
  KEY `ix_park_game_activity_translations_locale` (`locale`),
  CONSTRAINT `fk_park_game_activity_translations_activity` FOREIGN KEY (`game_activity_id`) REFERENCES `park_games_activities` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_park_game_activity_translations_locale` FOREIGN KEY (`locale`) REFERENCES `locales` (`code`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `park_game_activity_media` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `game_activity_id` bigint NOT NULL,
  `media_id` bigint NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_park_game_activity_media_activity_media` (`game_activity_id`, `media_id`),
  CONSTRAINT `fk_park_game_activity_media_activity` FOREIGN KEY (`game_activity_id`) REFERENCES `park_games_activities` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_park_game_activity_media_media` FOREIGN KEY (`media_id`) REFERENCES `media_files` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
