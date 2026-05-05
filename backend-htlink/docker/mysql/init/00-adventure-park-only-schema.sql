SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ==========================================
-- Adventure Park Only Schema
-- ==========================================

CREATE TABLE IF NOT EXISTS `alembic_version` (
  `version_num` varchar(32) NOT NULL,
  PRIMARY KEY (`version_num`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `plans` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `name` varchar(120) NOT NULL,
  `features_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_plans_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tenants` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `plan_id` bigint DEFAULT NULL,
  `name` varchar(200) NOT NULL,
  `code` varchar(80) NOT NULL,
  `default_locale` varchar(10) NOT NULL DEFAULT 'vi',
  `fallback_locale` varchar(10) NOT NULL DEFAULT 'en',
  `settings_json` json DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tenants_code` (`code`),
  KEY `ix_tenants_plan_id` (`plan_id`),
  CONSTRAINT `fk_tenants_plan` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `locales` (
  `code` varchar(10) NOT NULL,
  `name` varchar(100) NOT NULL,
  `native_name` varchar(100) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `admin_users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint DEFAULT NULL,
  `email` varchar(190) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(180) NOT NULL,
  `role` varchar(20) NOT NULL DEFAULT 'ADMIN',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_admin_users_tenant_email` (`tenant_id`, `email`),
  KEY `ix_admin_users_tenant_id` (`tenant_id`),
  CONSTRAINT `fk_admin_users_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `media_files` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint NOT NULL,
  `uploader_id` bigint DEFAULT NULL,
  `kind` varchar(20) NOT NULL,
  `mime_type` varchar(120) DEFAULT NULL,
  `file_key` varchar(255) NOT NULL,
  `original_filename` varchar(255) DEFAULT NULL,
  `width` int DEFAULT NULL,
  `height` int DEFAULT NULL,
  `size_bytes` bigint DEFAULT NULL,
  `alt_text` varchar(300) DEFAULT NULL,
  `source` varchar(20) DEFAULT 'park',
  `entity_type` varchar(50) DEFAULT NULL,
  `entity_id` bigint DEFAULT NULL,
  `folder` varchar(100) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_media_files_tenant_kind` (`tenant_id`, `kind`),
  KEY `ix_media_files_uploader_id` (`uploader_id`),
  KEY `ix_media_files_entity_lookup` (`entity_type`, `entity_id`),
  CONSTRAINT `fk_media_files_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_media_files_uploader` FOREIGN KEY (`uploader_id`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `activity_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `resource_type` varchar(50) DEFAULT NULL,
  `resource_id` bigint DEFAULT NULL,
  `details_json` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_activity_logs_user_id` (`user_id`),
  KEY `ix_activity_logs_created_at` (`created_at`),
  CONSTRAINT `fk_activity_logs_user` FOREIGN KEY (`user_id`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- Park Core
-- ==========================================

CREATE TABLE IF NOT EXISTS `park_settings` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint NOT NULL,
  `park_name` varchar(255) NOT NULL,
  `slogan` varchar(500) DEFAULT NULL,
  `primary_color` varchar(30) NOT NULL DEFAULT '#0f766e',
  `secondary_color` varchar(30) NOT NULL DEFAULT '#f59e0b',
  `background_color` varchar(30) NOT NULL DEFAULT '#ffffff',
  `phone` varchar(50) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `support_phone` varchar(50) DEFAULT NULL,
  `booking_url` varchar(500) DEFAULT NULL,
  `messenger_url` varchar(500) DEFAULT NULL,
  `facebook_url` varchar(255) DEFAULT NULL,
  `instagram_url` varchar(255) DEFAULT NULL,
  `youtube_url` varchar(255) DEFAULT NULL,
  `tiktok_url` varchar(255) DEFAULT NULL,
  `logo_media_id` bigint DEFAULT NULL,
  `favicon_media_id` bigint DEFAULT NULL,
  `cover_image_media_id` bigint DEFAULT NULL,
  `meta_image_media_id` bigint DEFAULT NULL,
  `meta_title` varchar(255) DEFAULT NULL,
  `meta_description` varchar(500) DEFAULT NULL,
  `meta_keywords` varchar(500) DEFAULT NULL,
  `operating_hours` json DEFAULT NULL,
  `settings_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_park_settings_tenant_id` (`tenant_id`),
  CONSTRAINT `fk_park_settings_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_park_settings_logo` FOREIGN KEY (`logo_media_id`) REFERENCES `media_files` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_park_settings_favicon` FOREIGN KEY (`favicon_media_id`) REFERENCES `media_files` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_park_settings_cover` FOREIGN KEY (`cover_image_media_id`) REFERENCES `media_files` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_park_settings_meta_image` FOREIGN KEY (`meta_image_media_id`) REFERENCES `media_files` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `park_page_settings` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint NOT NULL,
  `page_code` varchar(50) NOT NULL,
  `is_displaying` tinyint(1) NOT NULL DEFAULT '1',
  `vr360_link` varchar(1000) DEFAULT NULL,
  `vr_title` varchar(255) DEFAULT NULL,
  `settings_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_park_page_settings_tenant_page` (`tenant_id`, `page_code`),
  KEY `ix_park_page_settings_page_code` (`page_code`),
  CONSTRAINT `fk_park_page_settings_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- Park Locations
-- ==========================================

CREATE TABLE IF NOT EXISTS `park_locations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `address` varchar(500) DEFAULT NULL,
  `opening_hours` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `google_maps_url` varchar(1000) DEFAULT NULL,
  `primary_image_media_id` bigint DEFAULT NULL,
  `vr360_link` varchar(1000) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `display_order` int NOT NULL DEFAULT '0',
  `attributes_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_park_locations_tenant_code` (`tenant_id`, `code`),
  KEY `ix_park_locations_tenant_id` (`tenant_id`),
  KEY `ix_park_locations_display_order` (`display_order`),
  CONSTRAINT `fk_park_locations_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_park_locations_primary_image` FOREIGN KEY (`primary_image_media_id`) REFERENCES `media_files` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `park_location_translations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `location_id` bigint NOT NULL,
  `locale` varchar(10) NOT NULL,
  `name` varchar(255) NOT NULL,
  `address` varchar(500) DEFAULT NULL,
  `description` text,
  `visitor_notes` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_park_location_translations_location_locale` (`location_id`, `locale`),
  KEY `ix_park_location_translations_locale` (`locale`),
  CONSTRAINT `fk_park_location_translations_location` FOREIGN KEY (`location_id`) REFERENCES `park_locations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_park_location_translations_locale` FOREIGN KEY (`locale`) REFERENCES `locales` (`code`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `park_location_media` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `location_id` bigint NOT NULL,
  `media_id` bigint NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_park_location_media_location_media` (`location_id`, `media_id`),
  CONSTRAINT `fk_park_location_media_location` FOREIGN KEY (`location_id`) REFERENCES `park_locations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_park_location_media_media` FOREIGN KEY (`media_id`) REFERENCES `media_files` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- Park Zones / Areas
-- ==========================================

CREATE TABLE IF NOT EXISTS `park_spaces` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint NOT NULL,
  `location_id` bigint DEFAULT NULL,
  `code` varchar(50) NOT NULL,
  `primary_image_media_id` bigint DEFAULT NULL,
  `amenities_json` json DEFAULT NULL,
  `capacity` int DEFAULT NULL,
  `area_size` varchar(50) DEFAULT NULL,
  `map_x` decimal(10,4) DEFAULT NULL,
  `map_y` decimal(10,4) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `display_order` int NOT NULL DEFAULT '0',
  `attributes_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_park_spaces_tenant_code` (`tenant_id`, `code`),
  KEY `ix_park_spaces_location_id` (`location_id`),
  KEY `ix_park_spaces_display_order` (`display_order`),
  CONSTRAINT `fk_park_spaces_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_park_spaces_location` FOREIGN KEY (`location_id`) REFERENCES `park_locations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_park_spaces_primary_image` FOREIGN KEY (`primary_image_media_id`) REFERENCES `media_files` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `park_space_translations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `space_id` bigint NOT NULL,
  `locale` varchar(10) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_park_space_translations_space_locale` (`space_id`, `locale`),
  KEY `ix_park_space_translations_locale` (`locale`),
  CONSTRAINT `fk_park_space_translations_space` FOREIGN KEY (`space_id`) REFERENCES `park_spaces` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_park_space_translations_locale` FOREIGN KEY (`locale`) REFERENCES `locales` (`code`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `park_space_media` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `space_id` bigint NOT NULL,
  `media_id` bigint NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_park_space_media_space_media` (`space_id`, `media_id`),
  CONSTRAINT `fk_park_space_media_space` FOREIGN KEY (`space_id`) REFERENCES `park_spaces` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_park_space_media_media` FOREIGN KEY (`media_id`) REFERENCES `media_files` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- Park Attractions
-- ==========================================

CREATE TABLE IF NOT EXISTS `park_attractions` (
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
  UNIQUE KEY `uq_park_attractions_tenant_code` (`tenant_id`, `code`),
  KEY `ix_park_attractions_space_id` (`space_id`),
  KEY `ix_park_attractions_type` (`attraction_type`),
  KEY `ix_park_attractions_experience_type` (`experience_type`),
  KEY `ix_park_attractions_display_order` (`display_order`),
  CONSTRAINT `fk_park_attractions_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_park_attractions_space` FOREIGN KEY (`space_id`) REFERENCES `park_spaces` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_park_attractions_primary_image` FOREIGN KEY (`primary_image_media_id`) REFERENCES `media_files` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `park_attraction_translations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `attraction_id` bigint NOT NULL,
  `locale` varchar(10) NOT NULL,
  `name` varchar(255) NOT NULL,
  `short_description` varchar(500) DEFAULT NULL,
  `description` text,
  `safety_notes` text,
  `experience_notes` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_park_attraction_translations_attraction_locale` (`attraction_id`, `locale`),
  KEY `ix_park_attraction_translations_locale` (`locale`),
  CONSTRAINT `fk_park_attraction_translations_attraction` FOREIGN KEY (`attraction_id`) REFERENCES `park_attractions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_park_attraction_translations_locale` FOREIGN KEY (`locale`) REFERENCES `locales` (`code`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `park_attraction_media` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `attraction_id` bigint NOT NULL,
  `media_id` bigint NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_park_attraction_media_attraction_media` (`attraction_id`, `media_id`),
  CONSTRAINT `fk_park_attraction_media_attraction` FOREIGN KEY (`attraction_id`) REFERENCES `park_attractions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_park_attraction_media_media` FOREIGN KEY (`media_id`) REFERENCES `media_files` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- Park Ticket Types
-- ==========================================

CREATE TABLE IF NOT EXISTS `park_ticket_types` (
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
  UNIQUE KEY `uq_park_ticket_types_tenant_code` (`tenant_id`, `code`),
  KEY `ix_park_ticket_types_ticket_type` (`ticket_type`),
  KEY `ix_park_ticket_types_audience_type` (`audience_type`),
  KEY `ix_park_ticket_types_validity_type` (`validity_type`),
  KEY `ix_park_ticket_types_display_order` (`display_order`),
  CONSTRAINT `fk_park_ticket_types_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_park_ticket_types_primary_image` FOREIGN KEY (`primary_image_media_id`) REFERENCES `media_files` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `park_ticket_type_translations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `ticket_type_id` bigint NOT NULL,
  `locale` varchar(10) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `terms_and_conditions` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_park_ticket_type_translations_ticket_locale` (`ticket_type_id`, `locale`),
  KEY `ix_park_ticket_type_translations_locale` (`locale`),
  CONSTRAINT `fk_park_ticket_type_translations_ticket` FOREIGN KEY (`ticket_type_id`) REFERENCES `park_ticket_types` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_park_ticket_type_translations_locale` FOREIGN KEY (`locale`) REFERENCES `locales` (`code`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `park_ticket_type_media` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `ticket_type_id` bigint NOT NULL,
  `media_id` bigint NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_park_ticket_type_media_ticket_media` (`ticket_type_id`, `media_id`),
  CONSTRAINT `fk_park_ticket_type_media_ticket` FOREIGN KEY (`ticket_type_id`) REFERENCES `park_ticket_types` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_park_ticket_type_media_media` FOREIGN KEY (`media_id`) REFERENCES `media_files` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- Park Services
-- ==========================================

CREATE TABLE IF NOT EXISTS `park_services` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint NOT NULL,
  `code` varchar(50) NOT NULL,
  `service_type` varchar(50) NOT NULL COMMENT 'food, support, transport, rental, medical, locker, restroom, other',
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
  UNIQUE KEY `uq_park_services_tenant_code` (`tenant_id`, `code`),
  KEY `ix_park_services_service_type` (`service_type`),
  KEY `ix_park_services_display_order` (`display_order`),
  CONSTRAINT `fk_park_services_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_park_services_primary_image` FOREIGN KEY (`primary_image_media_id`) REFERENCES `media_files` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `park_service_translations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `service_id` bigint NOT NULL,
  `locale` varchar(10) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_park_service_translations_service_locale` (`service_id`, `locale`),
  KEY `ix_park_service_translations_locale` (`locale`),
  CONSTRAINT `fk_park_service_translations_service` FOREIGN KEY (`service_id`) REFERENCES `park_services` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_park_service_translations_locale` FOREIGN KEY (`locale`) REFERENCES `locales` (`code`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `park_service_media` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `service_id` bigint NOT NULL,
  `media_id` bigint NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_park_service_media_service_media` (`service_id`, `media_id`),
  CONSTRAINT `fk_park_service_media_service` FOREIGN KEY (`service_id`) REFERENCES `park_services` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_park_service_media_media` FOREIGN KEY (`media_id`) REFERENCES `media_files` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- Park Events
-- ==========================================

CREATE TABLE IF NOT EXISTS `park_events` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint NOT NULL,
  `code` varchar(50) NOT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `start_time` varchar(10) DEFAULT NULL,
  `end_time` varchar(10) DEFAULT NULL,
  `location_id` bigint DEFAULT NULL,
  `space_id` bigint DEFAULT NULL,
  `location_text` varchar(500) DEFAULT NULL,
  `registration_url` varchar(1000) DEFAULT NULL,
  `max_participants` int DEFAULT NULL,
  `primary_image_media_id` bigint DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'upcoming',
  `is_featured` tinyint(1) NOT NULL DEFAULT '0',
  `display_order` int NOT NULL DEFAULT '0',
  `attributes_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_park_events_tenant_code` (`tenant_id`, `code`),
  KEY `ix_park_events_location_id` (`location_id`),
  KEY `ix_park_events_space_id` (`space_id`),
  KEY `ix_park_events_status` (`status`),
  CONSTRAINT `fk_park_events_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_park_events_location` FOREIGN KEY (`location_id`) REFERENCES `park_locations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_park_events_space` FOREIGN KEY (`space_id`) REFERENCES `park_spaces` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_park_events_primary_image` FOREIGN KEY (`primary_image_media_id`) REFERENCES `media_files` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `park_event_translations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `event_id` bigint NOT NULL,
  `locale` varchar(10) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `details` longtext,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_park_event_translations_event_locale` (`event_id`, `locale`),
  KEY `ix_park_event_translations_locale` (`locale`),
  CONSTRAINT `fk_park_event_translations_event` FOREIGN KEY (`event_id`) REFERENCES `park_events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_park_event_translations_locale` FOREIGN KEY (`locale`) REFERENCES `locales` (`code`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `park_event_media` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `event_id` bigint NOT NULL,
  `media_id` bigint NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_park_event_media_event_media` (`event_id`, `media_id`),
  CONSTRAINT `fk_park_event_media_event` FOREIGN KEY (`event_id`) REFERENCES `park_events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_park_event_media_media` FOREIGN KEY (`media_id`) REFERENCES `media_files` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- Park Careers
-- ==========================================

CREATE TABLE IF NOT EXISTS `park_careers` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint NOT NULL,
  `code` varchar(50) NOT NULL,
  `job_type` varchar(50) DEFAULT NULL,
  `experience_required` varchar(255) DEFAULT NULL,
  `salary_min` decimal(12,2) DEFAULT NULL,
  `salary_max` decimal(12,2) DEFAULT NULL,
  `salary_text` varchar(255) DEFAULT NULL,
  `deadline` date DEFAULT NULL,
  `contact_email` varchar(255) DEFAULT NULL,
  `contact_phone` varchar(50) DEFAULT NULL,
  `application_url` varchar(1000) DEFAULT NULL,
  `location_id` bigint DEFAULT NULL,
  `primary_image_media_id` bigint DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'open',
  `display_order` int NOT NULL DEFAULT '0',
  `is_urgent` tinyint(1) NOT NULL DEFAULT '0',
  `attributes_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_park_careers_tenant_code` (`tenant_id`, `code`),
  KEY `ix_park_careers_location_id` (`location_id`),
  KEY `ix_park_careers_status` (`status`),
  CONSTRAINT `fk_park_careers_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_park_careers_location` FOREIGN KEY (`location_id`) REFERENCES `park_locations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_park_careers_primary_image` FOREIGN KEY (`primary_image_media_id`) REFERENCES `media_files` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `park_career_translations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `career_id` bigint NOT NULL,
  `locale` varchar(10) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `requirements` text,
  `benefits` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_park_career_translations_career_locale` (`career_id`, `locale`),
  KEY `ix_park_career_translations_locale` (`locale`),
  CONSTRAINT `fk_park_career_translations_career` FOREIGN KEY (`career_id`) REFERENCES `park_careers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_park_career_translations_locale` FOREIGN KEY (`locale`) REFERENCES `locales` (`code`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `park_career_media` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `career_id` bigint NOT NULL,
  `media_id` bigint NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_park_career_media_career_media` (`career_id`, `media_id`),
  CONSTRAINT `fk_park_career_media_career` FOREIGN KEY (`career_id`) REFERENCES `park_careers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_park_career_media_media` FOREIGN KEY (`media_id`) REFERENCES `media_files` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- Park Promotions
-- ==========================================

CREATE TABLE IF NOT EXISTS `park_promotions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint NOT NULL,
  `code` varchar(50) NOT NULL,
  `promotion_type` varchar(50) DEFAULT NULL,
  `discount_type` varchar(20) DEFAULT NULL,
  `discount_value` decimal(10,2) DEFAULT NULL,
  `valid_from` date DEFAULT NULL,
  `valid_to` date DEFAULT NULL,
  `min_order_value` decimal(10,2) DEFAULT NULL,
  `max_discount` decimal(10,2) DEFAULT NULL,
  `usage_limit` int DEFAULT NULL,
  `usage_count` int NOT NULL DEFAULT '0',
  `primary_image_media_id` bigint DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `is_featured` tinyint(1) NOT NULL DEFAULT '0',
  `display_order` int NOT NULL DEFAULT '0',
  `attributes_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_park_promotions_tenant_code` (`tenant_id`, `code`),
  KEY `ix_park_promotions_status` (`status`),
  KEY `ix_park_promotions_valid_dates` (`valid_from`, `valid_to`),
  CONSTRAINT `fk_park_promotions_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_park_promotions_primary_image` FOREIGN KEY (`primary_image_media_id`) REFERENCES `media_files` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `park_promotion_translations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `promotion_id` bigint NOT NULL,
  `locale` varchar(10) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `terms_and_conditions` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_park_promotion_translations_promotion_locale` (`promotion_id`, `locale`),
  KEY `ix_park_promotion_translations_locale` (`locale`),
  CONSTRAINT `fk_park_promotion_translations_promotion` FOREIGN KEY (`promotion_id`) REFERENCES `park_promotions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_park_promotion_translations_locale` FOREIGN KEY (`locale`) REFERENCES `locales` (`code`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `park_promotion_media` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `promotion_id` bigint NOT NULL,
  `media_id` bigint NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_park_promotion_media_promotion_media` (`promotion_id`, `media_id`),
  CONSTRAINT `fk_park_promotion_media_promotion` FOREIGN KEY (`promotion_id`) REFERENCES `park_promotions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_park_promotion_media_media` FOREIGN KEY (`media_id`) REFERENCES `media_files` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- Park Achievements
-- ==========================================

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

-- ==========================================
-- Park Content Sections
-- ==========================================

CREATE TABLE IF NOT EXISTS `park_content_sections` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint NOT NULL,
  `section_type` varchar(50) NOT NULL,
  `page_code` varchar(50) NOT NULL,
  `icon` varchar(100) DEFAULT NULL,
  `image_media_id` bigint DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `display_order` int NOT NULL DEFAULT '0',
  `attributes_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_park_content_sections_page_section` (`page_code`, `section_type`),
  KEY `ix_park_content_sections_display_order` (`display_order`),
  CONSTRAINT `fk_park_content_sections_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_park_content_sections_image` FOREIGN KEY (`image_media_id`) REFERENCES `media_files` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `park_content_section_translations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `section_id` bigint NOT NULL,
  `locale` varchar(10) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `content` longtext,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_park_content_section_translations_section_locale` (`section_id`, `locale`),
  KEY `ix_park_content_section_translations_locale` (`locale`),
  CONSTRAINT `fk_park_content_section_translations_section` FOREIGN KEY (`section_id`) REFERENCES `park_content_sections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_park_content_section_translations_locale` FOREIGN KEY (`locale`) REFERENCES `locales` (`code`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- Park Visitor Information
-- ==========================================

CREATE TABLE IF NOT EXISTS `park_visitor_info_categories` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint NOT NULL,
  `page_code` varchar(50) NOT NULL DEFAULT 'visitor_info',
  `category_code` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `icon` varchar(100) DEFAULT NULL,
  `item_layout` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `display_order` int NOT NULL DEFAULT '0',
  `attributes_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_park_visitor_info_categories_tenant_page_category` (`tenant_id`, `page_code`, `category_code`),
  KEY `ix_park_visitor_info_categories_page_code` (`page_code`),
  KEY `ix_park_visitor_info_categories_display_order` (`display_order`),
  CONSTRAINT `fk_park_visitor_info_categories_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `park_visitor_info_category_translations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `category_id` bigint NOT NULL,
  `locale` varchar(10) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_park_visitor_info_category_translations_category_locale` (`category_id`, `locale`),
  KEY `ix_park_visitor_info_category_translations_locale` (`locale`),
  CONSTRAINT `fk_park_visitor_info_category_translations_category` FOREIGN KEY (`category_id`) REFERENCES `park_visitor_info_categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_park_visitor_info_category_translations_locale` FOREIGN KEY (`locale`) REFERENCES `locales` (`code`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `park_visitor_info_items` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `category_id` bigint NOT NULL,
  `item_type` varchar(50) NOT NULL DEFAULT 'text',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `display_order` int NOT NULL DEFAULT '0',
  `attributes_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_park_visitor_info_items_item_type` (`item_type`),
  KEY `ix_park_visitor_info_items_display_order` (`display_order`),
  CONSTRAINT `fk_park_visitor_info_items_category` FOREIGN KEY (`category_id`) REFERENCES `park_visitor_info_categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `park_visitor_info_item_translations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `item_id` bigint NOT NULL,
  `locale` varchar(10) NOT NULL,
  `title` varchar(255) NOT NULL,
  `subtitle` varchar(255) DEFAULT NULL,
  `description` text,
  `content` longtext,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_park_visitor_info_item_translations_item_locale` (`item_id`, `locale`),
  KEY `ix_park_visitor_info_item_translations_locale` (`locale`),
  CONSTRAINT `fk_park_visitor_info_item_translations_item` FOREIGN KEY (`item_id`) REFERENCES `park_visitor_info_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_park_visitor_info_item_translations_locale` FOREIGN KEY (`locale`) REFERENCES `locales` (`code`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
