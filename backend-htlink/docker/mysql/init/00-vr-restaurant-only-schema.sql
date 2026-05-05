SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ==========================================
-- VR Restaurant Only Schema
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
  `default_locale` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'vi',
  `fallback_locale` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'en',
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
  `source` varchar(20) DEFAULT 'restaurant',
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
-- Restaurant Core
-- ==========================================

CREATE TABLE IF NOT EXISTS `restaurant_settings` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint NOT NULL,
  `restaurant_name` varchar(255) NOT NULL,
  `slogan` varchar(500) DEFAULT NULL,
  `primary_color` varchar(20) NOT NULL DEFAULT '#6f4e37',
  `secondary_color` varchar(20) NOT NULL DEFAULT '#d4a574',
  `background_color` varchar(20) NOT NULL DEFAULT '#ffffff',
  `phone` varchar(50) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `phone_number` varchar(50) DEFAULT NULL,
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
  `business_hours` json DEFAULT NULL,
  `settings_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_restaurant_settings_tenant_id` (`tenant_id`),
  CONSTRAINT `fk_restaurant_settings_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_restaurant_settings_logo` FOREIGN KEY (`logo_media_id`) REFERENCES `media_files` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_restaurant_settings_favicon` FOREIGN KEY (`favicon_media_id`) REFERENCES `media_files` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_restaurant_settings_cover` FOREIGN KEY (`cover_image_media_id`) REFERENCES `media_files` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_restaurant_settings_meta_image` FOREIGN KEY (`meta_image_media_id`) REFERENCES `media_files` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restaurant_page_settings` (
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
  UNIQUE KEY `uq_restaurant_page_settings_tenant_page` (`tenant_id`, `page_code`),
  KEY `ix_restaurant_page_settings_page_code` (`page_code`),
  CONSTRAINT `fk_restaurant_page_settings_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restaurant_branches` (
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
  UNIQUE KEY `uq_restaurant_branches_tenant_code` (`tenant_id`, `code`),
  KEY `ix_restaurant_branches_tenant_id` (`tenant_id`),
  KEY `ix_restaurant_branches_display_order` (`display_order`),
  CONSTRAINT `fk_restaurant_branches_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_restaurant_branches_primary_image` FOREIGN KEY (`primary_image_media_id`) REFERENCES `media_files` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restaurant_branch_translations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `branch_id` bigint NOT NULL,
  `locale` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) NOT NULL,
  `address` varchar(500) DEFAULT NULL,
  `description` text,
  `amenities_text` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_restaurant_branch_translations_branch_locale` (`branch_id`, `locale`),
  KEY `ix_restaurant_branch_translations_locale` (`locale`),
  CONSTRAINT `fk_restaurant_branch_translations_branch` FOREIGN KEY (`branch_id`) REFERENCES `restaurant_branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_restaurant_branch_translations_locale` FOREIGN KEY (`locale`) REFERENCES `locales` (`code`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restaurant_branch_media` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `branch_id` bigint NOT NULL,
  `media_id` bigint NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_restaurant_branch_media_branch_media` (`branch_id`, `media_id`),
  CONSTRAINT `fk_restaurant_branch_media_branch` FOREIGN KEY (`branch_id`) REFERENCES `restaurant_branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_restaurant_branch_media_media` FOREIGN KEY (`media_id`) REFERENCES `media_files` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restaurant_menu_categories` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint NOT NULL,
  `code` varchar(50) NOT NULL,
  `icon_media_id` bigint DEFAULT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_restaurant_menu_categories_tenant_code` (`tenant_id`, `code`),
  KEY `ix_restaurant_menu_categories_tenant_id` (`tenant_id`),
  CONSTRAINT `fk_restaurant_menu_categories_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_restaurant_menu_categories_icon` FOREIGN KEY (`icon_media_id`) REFERENCES `media_files` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restaurant_menu_category_translations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `category_id` bigint NOT NULL,
  `locale` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_restaurant_menu_category_translations_category_locale` (`category_id`, `locale`),
  KEY `ix_restaurant_menu_category_translations_locale` (`locale`),
  CONSTRAINT `fk_restaurant_menu_category_translations_category` FOREIGN KEY (`category_id`) REFERENCES `restaurant_menu_categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_restaurant_menu_category_translations_locale` FOREIGN KEY (`locale`) REFERENCES `locales` (`code`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restaurant_menu_items` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint NOT NULL,
  `category_id` bigint NOT NULL,
  `code` varchar(50) NOT NULL,
  `price` decimal(12,2) DEFAULT NULL,
  `original_price` decimal(12,2) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'available',
  `sizes` json DEFAULT NULL,
  `tags` json DEFAULT NULL,
  `calories` int DEFAULT NULL,
  `primary_image_media_id` bigint DEFAULT NULL,
  `is_bestseller` tinyint(1) NOT NULL DEFAULT '0',
  `is_new` tinyint(1) NOT NULL DEFAULT '0',
  `is_seasonal` tinyint(1) NOT NULL DEFAULT '0',
  `display_order` int NOT NULL DEFAULT '0',
  `attributes_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_restaurant_menu_items_tenant_code` (`tenant_id`, `code`),
  KEY `ix_restaurant_menu_items_category_id` (`category_id`),
  CONSTRAINT `fk_restaurant_menu_items_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_restaurant_menu_items_category` FOREIGN KEY (`category_id`) REFERENCES `restaurant_menu_categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_restaurant_menu_items_primary_image` FOREIGN KEY (`primary_image_media_id`) REFERENCES `media_files` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restaurant_menu_item_translations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `item_id` bigint NOT NULL,
  `locale` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `ingredients` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_restaurant_menu_item_translations_item_locale` (`item_id`, `locale`),
  KEY `ix_restaurant_menu_item_translations_locale` (`locale`),
  CONSTRAINT `fk_restaurant_menu_item_translations_item` FOREIGN KEY (`item_id`) REFERENCES `restaurant_menu_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_restaurant_menu_item_translations_locale` FOREIGN KEY (`locale`) REFERENCES `locales` (`code`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restaurant_menu_item_media` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `item_id` bigint NOT NULL,
  `media_id` bigint NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_restaurant_menu_item_media_item_media` (`item_id`, `media_id`),
  CONSTRAINT `fk_restaurant_menu_item_media_item` FOREIGN KEY (`item_id`) REFERENCES `restaurant_menu_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_restaurant_menu_item_media_media` FOREIGN KEY (`media_id`) REFERENCES `media_files` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restaurant_events` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint NOT NULL,
  `code` varchar(50) NOT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `start_time` varchar(10) DEFAULT NULL,
  `end_time` varchar(10) DEFAULT NULL,
  `branch_id` bigint DEFAULT NULL,
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
  UNIQUE KEY `uq_restaurant_events_tenant_code` (`tenant_id`, `code`),
  KEY `ix_restaurant_events_branch_id` (`branch_id`),
  CONSTRAINT `fk_restaurant_events_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_restaurant_events_branch` FOREIGN KEY (`branch_id`) REFERENCES `restaurant_branches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_restaurant_events_primary_image` FOREIGN KEY (`primary_image_media_id`) REFERENCES `media_files` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restaurant_event_translations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `event_id` bigint NOT NULL,
  `locale` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `details` longtext,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_restaurant_event_translations_event_locale` (`event_id`, `locale`),
  KEY `ix_restaurant_event_translations_locale` (`locale`),
  CONSTRAINT `fk_restaurant_event_translations_event` FOREIGN KEY (`event_id`) REFERENCES `restaurant_events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_restaurant_event_translations_locale` FOREIGN KEY (`locale`) REFERENCES `locales` (`code`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restaurant_event_media` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `event_id` bigint NOT NULL,
  `media_id` bigint NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_restaurant_event_media_event_media` (`event_id`, `media_id`),
  CONSTRAINT `fk_restaurant_event_media_event` FOREIGN KEY (`event_id`) REFERENCES `restaurant_events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_restaurant_event_media_media` FOREIGN KEY (`media_id`) REFERENCES `media_files` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restaurant_careers` (
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
  `branch_id` bigint DEFAULT NULL,
  `primary_image_media_id` bigint DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'open',
  `display_order` int NOT NULL DEFAULT '0',
  `is_urgent` tinyint(1) NOT NULL DEFAULT '0',
  `attributes_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_restaurant_careers_tenant_code` (`tenant_id`, `code`),
  CONSTRAINT `fk_restaurant_careers_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_restaurant_careers_branch` FOREIGN KEY (`branch_id`) REFERENCES `restaurant_branches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_restaurant_careers_primary_image` FOREIGN KEY (`primary_image_media_id`) REFERENCES `media_files` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restaurant_career_translations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `career_id` bigint NOT NULL,
  `locale` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `requirements` text,
  `benefits` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_restaurant_career_translations_career_locale` (`career_id`, `locale`),
  KEY `ix_restaurant_career_translations_locale` (`locale`),
  CONSTRAINT `fk_restaurant_career_translations_career` FOREIGN KEY (`career_id`) REFERENCES `restaurant_careers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_restaurant_career_translations_locale` FOREIGN KEY (`locale`) REFERENCES `locales` (`code`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restaurant_career_media` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `career_id` bigint NOT NULL,
  `media_id` bigint NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_restaurant_career_media_career_media` (`career_id`, `media_id`),
  CONSTRAINT `fk_restaurant_career_media_career` FOREIGN KEY (`career_id`) REFERENCES `restaurant_careers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_restaurant_career_media_media` FOREIGN KEY (`media_id`) REFERENCES `media_files` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restaurant_promotions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint NOT NULL,
  `code` varchar(50) NOT NULL,
  `promotion_type` varchar(20) NOT NULL DEFAULT 'percentage',
  `discount_value` decimal(12,2) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `applicable_menu_items` json DEFAULT NULL,
  `applicable_categories` json DEFAULT NULL,
  `applicable_branches` json DEFAULT NULL,
  `min_purchase_amount` decimal(12,2) DEFAULT NULL,
  `primary_image_media_id` bigint DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `is_featured` tinyint(1) NOT NULL DEFAULT '0',
  `display_order` int NOT NULL DEFAULT '0',
  `attributes_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_restaurant_promotions_tenant_code` (`tenant_id`, `code`),
  CONSTRAINT `fk_restaurant_promotions_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_restaurant_promotions_primary_image` FOREIGN KEY (`primary_image_media_id`) REFERENCES `media_files` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restaurant_promotion_translations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `promotion_id` bigint NOT NULL,
  `locale` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `terms_and_conditions` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_restaurant_promotion_translations_promotion_locale` (`promotion_id`, `locale`),
  KEY `ix_restaurant_promotion_translations_locale` (`locale`),
  CONSTRAINT `fk_restaurant_promotion_translations_promotion` FOREIGN KEY (`promotion_id`) REFERENCES `restaurant_promotions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_restaurant_promotion_translations_locale` FOREIGN KEY (`locale`) REFERENCES `locales` (`code`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restaurant_promotion_media` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `promotion_id` bigint NOT NULL,
  `media_id` bigint NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_restaurant_promotion_media_promotion_media` (`promotion_id`, `media_id`),
  CONSTRAINT `fk_restaurant_promotion_media_promotion` FOREIGN KEY (`promotion_id`) REFERENCES `restaurant_promotions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_restaurant_promotion_media_media` FOREIGN KEY (`media_id`) REFERENCES `media_files` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restaurant_achievements` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint NOT NULL,
  `code` varchar(50) NOT NULL,
  `achievement_type` varchar(50) DEFAULT NULL,
  `issuer` varchar(255) DEFAULT NULL,
  `awarded_at` date DEFAULT NULL,
  `location_text` varchar(255) DEFAULT NULL,
  `reference_url` varchar(1000) DEFAULT NULL,
  `primary_image_media_id` bigint DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `is_featured` tinyint(1) NOT NULL DEFAULT '0',
  `display_order` int NOT NULL DEFAULT '0',
  `attributes_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_restaurant_achievements_tenant_code` (`tenant_id`, `code`),
  KEY `ix_restaurant_achievements_type` (`achievement_type`),
  KEY `ix_restaurant_achievements_display_order` (`display_order`),
  CONSTRAINT `fk_restaurant_achievements_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_restaurant_achievements_primary_image` FOREIGN KEY (`primary_image_media_id`) REFERENCES `media_files` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restaurant_achievement_translations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `achievement_id` bigint NOT NULL,
  `locale` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_restaurant_achievement_translations_achievement_locale` (`achievement_id`, `locale`),
  KEY `ix_restaurant_achievement_translations_locale` (`locale`),
  CONSTRAINT `fk_restaurant_achievement_translations_achievement` FOREIGN KEY (`achievement_id`) REFERENCES `restaurant_achievements` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_restaurant_achievement_translations_locale` FOREIGN KEY (`locale`) REFERENCES `locales` (`code`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restaurant_achievement_media` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `achievement_id` bigint NOT NULL,
  `media_id` bigint NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_restaurant_achievement_media_achievement_media` (`achievement_id`, `media_id`),
  CONSTRAINT `fk_restaurant_achievement_media_achievement` FOREIGN KEY (`achievement_id`) REFERENCES `restaurant_achievements` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_restaurant_achievement_media_media` FOREIGN KEY (`media_id`) REFERENCES `media_files` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restaurant_spaces` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint NOT NULL,
  `code` varchar(50) NOT NULL,
  `primary_image_media_id` bigint DEFAULT NULL,
  `amenities_json` json DEFAULT NULL,
  `capacity` int DEFAULT NULL,
  `area_size` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `display_order` int NOT NULL DEFAULT '0',
  `attributes_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_restaurant_spaces_tenant_code` (`tenant_id`, `code`),
  KEY `ix_restaurant_spaces_display_order` (`display_order`),
  CONSTRAINT `fk_restaurant_spaces_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_restaurant_spaces_primary_image` FOREIGN KEY (`primary_image_media_id`) REFERENCES `media_files` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restaurant_space_translations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `space_id` bigint NOT NULL,
  `locale` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_restaurant_space_translations_space_locale` (`space_id`, `locale`),
  KEY `ix_restaurant_space_translations_locale` (`locale`),
  CONSTRAINT `fk_restaurant_space_translations_space` FOREIGN KEY (`space_id`) REFERENCES `restaurant_spaces` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_restaurant_space_translations_locale` FOREIGN KEY (`locale`) REFERENCES `locales` (`code`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restaurant_space_media` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `space_id` bigint NOT NULL,
  `media_id` bigint NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_restaurant_space_media_space_media` (`space_id`, `media_id`),
  CONSTRAINT `fk_restaurant_space_media_space` FOREIGN KEY (`space_id`) REFERENCES `restaurant_spaces` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_restaurant_space_media_media` FOREIGN KEY (`media_id`) REFERENCES `media_files` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restaurant_services` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint NOT NULL,
  `code` varchar(50) NOT NULL,
  `service_type` varchar(50) NOT NULL,
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
  UNIQUE KEY `uq_restaurant_services_tenant_code` (`tenant_id`, `code`),
  KEY `ix_restaurant_services_service_type` (`service_type`),
  CONSTRAINT `fk_restaurant_services_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_restaurant_services_primary_image` FOREIGN KEY (`primary_image_media_id`) REFERENCES `media_files` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restaurant_service_translations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `service_id` bigint NOT NULL,
  `locale` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_restaurant_service_translations_service_locale` (`service_id`, `locale`),
  KEY `ix_restaurant_service_translations_locale` (`locale`),
  CONSTRAINT `fk_restaurant_service_translations_service` FOREIGN KEY (`service_id`) REFERENCES `restaurant_services` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_restaurant_service_translations_locale` FOREIGN KEY (`locale`) REFERENCES `locales` (`code`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restaurant_service_media` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `service_id` bigint NOT NULL,
  `media_id` bigint NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_restaurant_service_media_service_media` (`service_id`, `media_id`),
  CONSTRAINT `fk_restaurant_service_media_service` FOREIGN KEY (`service_id`) REFERENCES `restaurant_services` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_restaurant_service_media_media` FOREIGN KEY (`media_id`) REFERENCES `media_files` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restaurant_attractions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint NOT NULL,
  `space_id` bigint DEFAULT NULL,
  `code` varchar(50) NOT NULL,
  `attraction_type` varchar(50) NOT NULL,
  `experience_type` varchar(50) DEFAULT NULL,
  `thrill_level` varchar(20) DEFAULT NULL,
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

CREATE TABLE IF NOT EXISTS `restaurant_ticket_types` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint NOT NULL,
  `code` varchar(50) NOT NULL,
  `ticket_type` varchar(50) NOT NULL,
  `audience_type` varchar(50) DEFAULT NULL,
  `validity_type` varchar(50) DEFAULT NULL,
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

CREATE TABLE IF NOT EXISTS `restaurant_content_sections` (
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
  KEY `ix_restaurant_content_sections_page_section` (`page_code`, `section_type`),
  KEY `ix_restaurant_content_sections_display_order` (`display_order`),
  CONSTRAINT `fk_restaurant_content_sections_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_restaurant_content_sections_image` FOREIGN KEY (`image_media_id`) REFERENCES `media_files` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restaurant_content_section_translations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `section_id` bigint NOT NULL,
  `locale` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `content` longtext,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_restaurant_content_section_translations_section_locale` (`section_id`, `locale`),
  KEY `ix_restaurant_content_section_translations_locale` (`locale`),
  CONSTRAINT `fk_restaurant_content_section_translations_section` FOREIGN KEY (`section_id`) REFERENCES `restaurant_content_sections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_restaurant_content_section_translations_locale` FOREIGN KEY (`locale`) REFERENCES `locales` (`code`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
