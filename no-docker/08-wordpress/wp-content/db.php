<?php
/**
 * Database drop-in: runs WordPress on SQLite when no MySQL database is configured.
 *
 * WordPress loads this file right before it creates $wpdb. When wp-config.php
 * defines DB_NAME the file does nothing and the regular MySQL connection is used.
 * Otherwise the bundled SQLite Database Integration plugin provides the database,
 * stored as a single file under wp-content/database/.
 */

if (defined('DB_NAME') && DB_NAME !== '') {
    return;
}

$cinar_sqlite_driver = __DIR__ . '/plugins/sqlite-database-integration/wp-includes/sqlite/db.php';
if (!file_exists($cinar_sqlite_driver)) {
    wp_die(
        'No DB_NAME is set and the SQLite Database Integration plugin is missing from wp-content/plugins/sqlite-database-integration.',
        'Database not configured'
    );
}

// Mirrors the drop-in the plugin generates itself (db.copy), so its admin screens and health checks recognise it.
define('SQLITE_DB_DROPIN_VERSION', '1.8.0');

// The driver needs a database name for its MySQL compatibility layer.
if (!defined('DB_NAME')) {
    define('DB_NAME', 'cinar');
}

// Location of the SQLite file: the plugin derives FQDBDIR from DB_DIR and FQDB from DB_DIR + DB_FILE.
if (!defined('DB_DIR')) {
    define('DB_DIR', __DIR__ . '/database');
}
if (!defined('DB_FILE')) {
    define('DB_FILE', '.ht.sqlite');
}

if (!defined('DATABASE_TYPE')) {
    define('DATABASE_TYPE', 'sqlite');
}
if (!defined('DB_ENGINE')) {
    define('DB_ENGINE', 'sqlite');
}

require_once $cinar_sqlite_driver;
