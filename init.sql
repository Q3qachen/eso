-- 在宝塔面板「数据库」页面找到 achensanqi_com，点「管理」→「SQL」，粘贴并执行即可

CREATE TABLE IF NOT EXISTS `potion_tags` (
  `id`   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `potion_items` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(255) NOT NULL,
  `type`       VARCHAR(50)  NOT NULL DEFAULT '食物',
  `image`      MEDIUMTEXT,
  `tags`       TEXT,
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 默认标签
INSERT IGNORE INTO `potion_tags` (`name`) VALUES
  ('血上限'), ('耐上限'), ('魔上限'),
  ('血回复'), ('耐回复'), ('魔回复');

CREATE TABLE IF NOT EXISTS `equipment_items` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(255) NOT NULL,
  `role`       VARCHAR(20)  NOT NULL DEFAULT '输出',
  `image`      MEDIUMTEXT,
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 已建表后如需追加字段，执行：
-- ALTER TABLE `equipment_items` ADD COLUMN `role` VARCHAR(20) NOT NULL DEFAULT '输出' AFTER `name`;

