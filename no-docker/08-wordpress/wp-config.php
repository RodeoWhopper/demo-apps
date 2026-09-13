<?php
/**
 * WordPress configuration. Every value can be overridden through environment
 * variables; the defaults below are enough to run the site locally.
 */

// ** Database ** //
// Without a DB_NAME the wp-content/db.php drop-in serves the site from SQLite instead of MySQL.
if (getenv('DB_NAME')) {
    define('DB_NAME', getenv('DB_NAME'));
}
define('DB_USER',     getenv('DB_USER') ?: '');
define('DB_PASSWORD', getenv('DB_PASSWORD') ?: '');
define('DB_HOST',     getenv('DB_HOST') ?: '127.0.0.1');
define('DB_CHARSET',  'utf8mb4');
define('DB_COLLATE',  '');

$table_prefix = getenv('DB_TABLE_PREFIX') ?: 'wp_';

// ** URLs ** //
define('WP_HOME',    rtrim(getenv('WP_HOME') ?: 'http://localhost:8008', '/'));
define('WP_SITEURL', rtrim(getenv('WP_SITEURL') ?: WP_HOME, '/'));

// ** Authentication keys and salts ** //
// The fallbacks only let a fresh checkout start; supply your own values through the environment.
define('AUTH_KEY',         getenv('AUTH_KEY') ?: 'lC5b9%RWEQDrl1*BbE-6A5i+0QzmTB=zC(Fnpx;bAO:K8H>MY?}}F,{YZbh2qMR+');
define('SECURE_AUTH_KEY',  getenv('SECURE_AUTH_KEY') ?: '{GX@(-n+xd<.>FHV[)HSe)Wt^mMZ@Ic{~?C,Km95:xkSsuw?Pe<>~a)sk);!iM,J');
define('LOGGED_IN_KEY',    getenv('LOGGED_IN_KEY') ?: '=Sa7a??AuQhc=@7g.2Cs~GOSQt1:*K~e}Q6}UpXAt)Ht5Epe}c%_-e7@:-2fAQol');
define('NONCE_KEY',        getenv('NONCE_KEY') ?: 'nB0PLoO)c2}aAE{~0OdNC5%aqO48[d(%A(R)ybjTQy}~*OqD=2Ri[aACmJARf7n{');
define('AUTH_SALT',        getenv('AUTH_SALT') ?: 'SD*m:.Bu*rxXW}>VwAgdl,{hN%C1.CYBzRlPEx*wQqn>G,MgN4r:n~q=[YV8=.Zg');
define('SECURE_AUTH_SALT', getenv('SECURE_AUTH_SALT') ?: ';btiS(OSTusMxA3tPyHn-mlbqnZ]=aCKGhDl4pvZqKC!7O{-Xo~ZeQe3:*8K<7_k');
define('LOGGED_IN_SALT',   getenv('LOGGED_IN_SALT') ?: '4j@]Ny-Tg03i<*asba*vJG:4MCR1_Tsiq.??6CcAQZtTTx.HsKp3UOWIaxtrCWE0');
define('NONCE_SALT',       getenv('NONCE_SALT') ?: '3[ZIDXetI2*W!vO^xXpYwp@<-}[?@}(%6HxN1WaW!+cX<42Cx:RB;:6)=p3a3%gU');

// ** Debugging ** //
define('WP_DEBUG', filter_var(getenv('WP_DEBUG') ?: 'false', FILTER_VALIDATE_BOOLEAN));

/* That's all, stop editing! Happy publishing. */

if (!defined('ABSPATH')) {
    define('ABSPATH', __DIR__ . '/');
}

require_once ABSPATH . 'wp-settings.php';
