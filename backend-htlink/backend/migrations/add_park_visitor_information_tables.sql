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
