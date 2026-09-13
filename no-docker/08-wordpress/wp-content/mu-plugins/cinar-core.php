<?php
/**
 * Plugin Name: Çınar Core
 * Description: Registers the "project" post type and "project_type" taxonomy, exposes a REST health route, disables XML-RPC and provisions the demo content on first run. Loaded automatically as a must-use plugin.
 * Version: 1.1.0
 * Author: Çınar Mimarlık Studio
 */

if (!defined('ABSPATH')) {
    exit;
}

const CINAR_SEED_VERSION = '1';

add_action('init', function (): void {
    register_post_type('project', [
        'labels' => [
            'name'          => 'Projeler',
            'singular_name' => 'Proje',
            'add_new_item'  => 'Yeni Proje Ekle',
            'edit_item'     => 'Projeyi Düzenle',
            'all_items'     => 'Tüm Projeler',
            'archives'      => 'Projeler',
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

// GET /wp-json/cinar/v1/health -> lightweight uptime probe (503 when the database does not answer).
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

/*
 * First-run provisioning. Once WordPress is installed, the first request activates the
 * theme and creates the pages, sample projects and primary menu; the cinar_seed_version
 * option marks the work as done. Every step is idempotent, so re-running is harmless.
 */
function cinar_seed_pending(): bool
{
    return !wp_installing()
        && get_option('cinar_seed_version') !== CINAR_SEED_VERSION
        && is_blog_installed();
}

// Runs before the templating constants are resolved so the theme switch applies to the current
// request, and before post types register so they pick up the permalink structure.
add_action('setup_theme', function (): void {
    if (!cinar_seed_pending()) {
        return;
    }
    if (get_option('stylesheet') !== 'cinar' && wp_get_theme('cinar')->exists()) {
        switch_theme('cinar');
    }
    cinar_ensure_permalinks();
});

// The installer probes the site for pretty permalinks and falls back to plain ones when the probe
// fails (this plugin strips the X-Pingback header it looks for), so re-assert them once it is done.
add_action('wp_install', function (): void {
    cinar_ensure_permalinks();
    // Regenerated on the next request, when post types register with the structure already in place.
    delete_option('rewrite_rules');
});

function cinar_ensure_permalinks(): void
{
    global $wp_rewrite;

    if (get_option('permalink_structure') !== '/%postname%/') {
        $wp_rewrite->set_permalink_structure('/%postname%/');
    }
}

add_action('init', function (): void {
    if (!cinar_seed_pending()) {
        return;
    }
    // add_option() refuses an existing row, which keeps parallel first requests from seeding twice.
    if (!add_option('cinar_seed_lock', time(), '', false)) {
        return;
    }
    try {
        cinar_seed();
        update_option('cinar_seed_version', CINAR_SEED_VERSION);
    } finally {
        delete_option('cinar_seed_lock');
    }
}, 20);

function cinar_seed(): void
{
    update_option('blogname', 'Çınar Mimarlık');
    update_option('blogdescription', 'İzmir merkezli mimarlık ve iç mekân tasarım stüdyosu');
    update_option('timezone_string', 'Europe/Istanbul');
    update_option('date_format', 'j F Y');
    update_option('blog_public', 1);

    $admins = get_users(['role' => 'administrator', 'orderby' => 'ID', 'order' => 'ASC', 'number' => 1, 'fields' => 'ID']);
    $author = $admins ? (int) $admins[0] : 0;

    $pages = [];
    foreach (cinar_seed_pages() as $slug => $page) {
        $pages[$slug] = cinar_seed_page($slug, $page['title'], $page['content'], $author);
    }

    $sample = get_page_by_path('sample-page', OBJECT, 'page');
    if ($sample instanceof WP_Post) {
        wp_delete_post($sample->ID, true);
    }

    update_option('show_on_front', 'page');
    update_option('page_on_front', $pages['anasayfa']);

    $types = [];
    foreach (['konut' => 'Konut', 'kultur' => 'Kültür', 'ticari' => 'Ticari', 'kentsel' => 'Kentsel Tasarım'] as $slug => $name) {
        $types[$slug] = cinar_seed_term($slug, $name);
    }

    foreach (cinar_seed_projects() as $slug => $project) {
        cinar_seed_project($slug, $project, $types, $author);
    }

    cinar_seed_menu($pages);

    flush_rewrite_rules(false);
}

function cinar_seed_page(string $slug, string $title, string $content, int $author): int
{
    $existing = get_page_by_path($slug, OBJECT, 'page');
    if ($existing instanceof WP_Post) {
        return $existing->ID;
    }

    $id = wp_insert_post([
        'post_type'    => 'page',
        'post_status'  => 'publish',
        'post_author'  => $author,
        'post_name'    => $slug,
        'post_title'   => $title,
        'post_content' => $content,
    ], true);

    return is_wp_error($id) ? 0 : (int) $id;
}

function cinar_seed_term(string $slug, string $name): int
{
    $term = get_term_by('slug', $slug, 'project_type');
    if ($term instanceof WP_Term) {
        return $term->term_id;
    }

    $result = wp_insert_term($name, 'project_type', ['slug' => $slug]);

    return is_wp_error($result) ? 0 : (int) $result['term_id'];
}

function cinar_seed_project(string $slug, array $project, array $types, int $author): void
{
    if (get_page_by_path($slug, OBJECT, 'project') instanceof WP_Post) {
        return;
    }

    $id = wp_insert_post([
        'post_type'    => 'project',
        'post_status'  => 'publish',
        'post_author'  => $author,
        'post_name'    => $slug,
        'post_title'   => $project['title'],
        'post_excerpt' => $project['excerpt'],
        'post_content' => $project['content'],
        'meta_input'   => [
            'cinar_location' => $project['location'],
            'cinar_year'     => $project['year'],
            'cinar_client'   => $project['client'],
            'cinar_area'     => $project['area'],
        ],
    ], true);

    if (!is_wp_error($id) && !empty($types[$project['type']])) {
        wp_set_object_terms((int) $id, [$types[$project['type']]], 'project_type');
    }
}

function cinar_seed_menu(array $pages): void
{
    $menu = wp_get_nav_menu_object('primary');
    if ($menu instanceof WP_Term) {
        $menu_id = $menu->term_id;
    } else {
        $menu_id = wp_create_nav_menu('Primary');
        if (is_wp_error($menu_id)) {
            return;
        }
        $items = [
            ['menu-item-type' => 'post_type', 'menu-item-object' => 'page', 'menu-item-object-id' => $pages['anasayfa'], 'menu-item-title' => 'Anasayfa'],
            ['menu-item-type' => 'post_type_archive', 'menu-item-object' => 'project', 'menu-item-title' => 'Projeler'],
            ['menu-item-type' => 'post_type', 'menu-item-object' => 'page', 'menu-item-object-id' => $pages['hakkimizda']],
            ['menu-item-type' => 'post_type', 'menu-item-object' => 'page', 'menu-item-object-id' => $pages['iletisim']],
        ];
        foreach ($items as $position => $item) {
            wp_update_nav_menu_item($menu_id, 0, $item + ['menu-item-status' => 'publish', 'menu-item-position' => $position + 1]);
        }
    }

    $locations = (array) get_theme_mod('nav_menu_locations', []);
    $locations['primary'] = $menu_id;
    set_theme_mod('nav_menu_locations', $locations);
}

function cinar_seed_pages(): array
{
    return [
        'anasayfa' => [
            'title'   => 'Anasayfa',
            'content' => <<<'HTML'
<p>Çınar Mimarlık; konut, kültür ve ticari yapılar için iklime duyarlı, ölçeğine saygılı ve zamanla güzelleşen mimari çözümler üretir. Aşağıda stüdyonun seçilmiş işlerini bulabilirsiniz.</p>
HTML,
        ],
        'hakkimizda' => [
            'title'   => 'Hakkımızda',
            'content' => <<<'HTML'
<p>Çınar Mimarlık 2011 yılında İzmir Alsancak'ta kuruldu. On iki kişilik ekibimiz mimar, iç mimar ve peyzaj tasarımcılarından oluşuyor.</p><h2>Yaklaşımımız</h2><p>Her projeye yerinde gözlemle başlarız: sokağın ritmi, hâkim rüzgâr, komşu yapıların yüksekliği ve malzemesi tasarım kararlarımızı belirler. Yerel taş, ahşap ve pişmiş toprak gibi malzemeleri çağdaş detaylarla yeniden yorumlarız.</p><h2>Hizmetler</h2><ul><li>Mimari tasarım ve uygulama projeleri</li><li>İç mekân tasarımı</li><li>Kentsel tasarım ve peyzaj</li><li>Restorasyon ve yeniden işlevlendirme</li></ul>
HTML,
        ],
        'iletisim' => [
            'title'   => 'İletişim',
            'content' => <<<'HTML'
<p>Projeniz hakkında konuşmak için bize yazın; ilk görüşme ücretsizdir.</p><h2>Stüdyo</h2><p>Kordonboyu Cad. No: 14<br>Alsancak / İzmir</p><p>E-posta: <a href="mailto:merhaba@cinar.local">merhaba@cinar.local</a><br>Telefon: +90 232 000 00 00</p><h2>Çalışma Saatleri</h2><p>Hafta içi 09:00 – 18:00</p>
HTML,
        ],
    ];
}

function cinar_seed_projects(): array
{
    return [
        'kordon-konutlari' => [
            'title'    => 'Kordon Konutları',
            'type'     => 'konut',
            'location' => 'Alsancak, İzmir',
            'year'     => '2024',
            'client'   => 'Özel',
            'area'     => '3.400 m²',
            'excerpt'  => 'Körfeze bakan, doğal havalandırmalı 18 daireli konut bloğu.',
            'content'  => <<<'HTML'
<p>Kordon Konutları, İzmir'in tarihi sahil şeridinde yer alan 18 daireli bir konut bloğudur. Derin balkonlar ve hareketli ahşap panjurlar, batı cephesini yaz güneşinden korurken körfez manzarasını kesintisiz bırakır.</p><h2>Tasarım Kararları</h2><p>Zemin katta yükseltilmiş bir avlu, sokakla konut arasında yarı kamusal bir eşik oluşturur. Taşıyıcı sistem betonarme; cephede yerel andezit taşı ve termal işlemli çam kullanılmıştır.</p><blockquote>Amaç, her dairenin en az iki yöne açılması ve mekanik soğutmaya ihtiyaç duymamasıydı.</blockquote>
HTML,
        ],
        'selcuk-kutuphanesi' => [
            'title'    => 'Selçuk Halk Kütüphanesi',
            'type'     => 'kultur',
            'location' => 'Selçuk, İzmir',
            'year'     => '2023',
            'client'   => 'Selçuk Belediyesi',
            'area'     => '1.900 m²',
            'excerpt'  => 'Antik kent yolunda, avlulu ve tamamen gün ışığıyla aydınlanan bir halk kütüphanesi.',
            'content'  => <<<'HTML'
<p>Efes'e giden yol üzerinde konumlanan kütüphane, üç avlu etrafında düzenlenmiş tek katlı bir yapıdır. Okuma salonları kuzeye açılır; çatıdaki testere dişi ışıklıklar gün boyu homojen bir aydınlık sağlar.</p><h2>Program</h2><ul><li>Yetişkin ve çocuk okuma salonları</li><li>120 kişilik etkinlik salonu</li><li>Yerel tarih arşivi</li><li>Kafe ve açık hava okuma bahçesi</li></ul><p>Yapı, sıkıştırılmış toprak duvarlar ve ahşap makas çatı ile inşa edilmiştir.</p>
HTML,
        ],
        'bostanli-pazar-yeri' => [
            'title'    => 'Bostanlı Pazar Yeri ve Çarşı',
            'type'     => 'ticari',
            'location' => 'Karşıyaka, İzmir',
            'year'     => '2022',
            'client'   => 'Karşıyaka Belediyesi',
            'area'     => '5.600 m²',
            'excerpt'  => 'Haftanın iki günü pazar, diğer günler açık çarşı ve etkinlik alanı olarak çalışan hafif çelik örtü.',
            'content'  => <<<'HTML'
<p>Bostanlı'daki mevcut pazar yeri, mahalle ölçeğinde bir kamusal örtüye dönüştürüldü. 60 metre açıklıklı çelik strüktür, altındaki alanı kolonsuz bırakarak pazar günü dışında konser ve spor etkinliklerine izin verir.</p><h2>Sürdürülebilirlik</h2><p>Çatıdaki 1.200 m² fotovoltaik panel örtünün yıllık enerji ihtiyacını karşılar; yağmur suyu toplanarak zemin yıkamada kullanılır.</p>
HTML,
        ],
        'urla-bag-evi' => [
            'title'    => 'Urla Bağ Evi',
            'type'     => 'konut',
            'location' => 'Urla, İzmir',
            'year'     => '2021',
            'client'   => 'Özel',
            'area'     => '280 m²',
            'excerpt'  => 'Bağın ortasında, taş duvarlar ve ahşap saçaklarla tanımlanan tek katlı hafta sonu evi.',
            'content'  => <<<'HTML'
<p>Urla'daki bir bağ arazisi için tasarlanan ev, iki kalın taş duvar arasında uzanan tek bir hacimden oluşur. Güneye bakan derin saçak, kış güneşini içeri alırken yaz güneşini keser.</p><p>Bütün iç mekân doğramaları ve mobilyalar yerel ustalarla birlikte meşe ağacından üretildi. Yapı şebekeden bağımsız çalışır: güneş enerjisi, sarnıç ve biyolojik arıtma.</p>
HTML,
        ],
    ];
}
