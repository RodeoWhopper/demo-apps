<?php
/**
 * Plugin Name: Çınar Core
 * Description: Registers the "project" post type and "project_type" taxonomy, exposes a REST health route and disables XML-RPC. Loaded automatically as a must-use plugin.
 * Version: 1.0.0
 * Author: Çınar Mimarlık Studio
 */

if (!defined('ABSPATH')) {
    exit;
}

add_action('init', function (): void {
    register_post_type('project', [
        'labels' => [
            'name'          => 'Projeler',
            'singular_name' => 'Proje',
            'add_new_item'  => 'Yeni Proje Ekle',
            'edit_item'     => 'Projeyi Düzenle',
            'all_items'     => 'Tüm Projeler',
        ],
        'public'       => true,
        'has_archive'  => 'projeler',
        'rewrite'      => ['slug' => 'projeler', 'with_front' => false],
        'menu_icon'    => 'dashicons-building',
        'menu_position'=> 5,
        'supports'     => ['title', 'editor', 'excerpt', 'thumbnail', 'custom-fields', 'revisions'],
        'show_in_rest' => true,
    ]);

    register_taxonomy('project_type', 'project', [
        'labels' => [
            'name'          => 'Proje Türleri',
            'singular_name' => 'Proje Türü',
        ],
        'hierarchical'      => true,
        'public'            => true,
        'rewrite'           => ['slug' => 'proje-turu', 'with_front' => false],
        'show_admin_column' => true,
        'show_in_rest'      => true,
    ]);

    foreach (['location', 'year', 'client', 'area'] as $key) {
        register_post_meta('project', 'cinar_' . $key, [
            'type'              => 'string',
            'single'            => true,
            'show_in_rest'      => true,
            'sanitize_callback' => 'sanitize_text_field',
            'auth_callback'     => static fn(): bool => current_user_can('edit_posts'),
        ]);
    }
});

// Rewrite rules for the CPT need a one-time flush; guarded so it never runs during install.
add_action('init', function (): void {
    if (defined('WP_INSTALLING') && WP_INSTALLING) {
        return;
    }
    if (get_option('cinar_core_rewrite_version') !== '1') {
        flush_rewrite_rules(false);
        update_option('cinar_core_rewrite_version', '1');
    }
}, 99);

// Hardening: XML-RPC off, no pingback advertising.
add_filter('xmlrpc_enabled', '__return_false');
add_filter('pings_open', '__return_false');
add_filter('wp_headers', function (array $headers): array {
    unset($headers['X-Pingback']);
    return $headers;
});

// GET /wp-json/cinar/v1/health -> used as the container healthcheck.
add_action('rest_api_init', function (): void {
    register_rest_route('cinar/v1', '/health', [
        'methods'             => WP_REST_Server::READABLE,
        'permission_callback' => '__return_true',
        'callback'            => function (): WP_REST_Response {
            global $wpdb;
            $db_ok = $wpdb->get_var('SELECT 1') === '1';
            return new WP_REST_Response([
                'status'    => $db_ok ? 'ok' : 'degraded',
                'site'      => get_bloginfo('name'),
                'wordpress' => get_bloginfo('version'),
                'time'      => gmdate('c'),
            ], $db_ok ? 200 : 503);
        },
    ]);
});
