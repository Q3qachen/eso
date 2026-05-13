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
  `type`       VARCHAR(50)  NOT NULL DEFAULT '药水',
  `image`      MEDIUMTEXT,
  `tags`       TEXT,
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 默认标签
INSERT IGNORE INTO `potion_tags` (`name`) VALUES
  ('血上限'), ('耐上限'), ('魔上限'),
  ('血回复'), ('耐回复'), ('魔回复');

-- 默认条目（糖果骷髅头）
INSERT IGNORE INTO `potion_items` (`name`, `type`, `image`, `tags`) VALUES
  ('蛊惑的糖果骷髅头', '食物', 'img/sugar-skulls.png',
   '["血上限","耐上限","魔上限","血回复"]');
