<?php
/**
 * Çınar Mimarlık theme bootstrap.
 */

if (!defined('ABSPATH')) {
    exit;
}

define('CINAR_THEME_VERSION', '1.0.0');

function cinar_setup(): void
{
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('custom-logo');
    add_theme_support('automatic-feed-links');
    add_theme_support('responsive-embeds');
    add_theme_support('html5', ['search-form', 'gallery', 'caption', 'style', 'script', 'navigation-widgets']);

    register_nav_menus([
        'primary' => __('Primary Menu', 'cinar'),
        'footer'  => __('Footer Menu', 'cinar'),
    ]);
}
add_action('after_setup_theme', 'cinar_setup');

function cinar_assets(): void
{
    wp_enqueue_style(
        'cinar-main',
        get_template_directory_uri() . '/assets/main.css',
        [],
        CINAR_THEME_VERSION
    );
}
add_action('wp_enqueue_scripts', 'cinar_assets');

/**
 * Fallback navigation used until the "primary" menu location is assigned.
 */
function cinar_fallback_menu(): void
{
    echo '<ul class="site-nav__list">';
    echo '<li><a href="' . esc_url(home_url('/')) . '">Anasayfa</a></li>';
    echo '<li><a href="' . esc_url(get_post_type_archive_link('project')) . '">Projeler</a></li>';
    foreach (get_pages(['sort_column' => 'menu_order']) as $page) {
        if ((int) get_option('page_on_front') === $page->ID) {
            continue;
        }
        echo '<li><a href="' . esc_url(get_permalink($page)) . '">' . esc_html($page->post_title) . '</a></li>';
    }
    echo '</ul>';
}

/**
 * Deterministic gradient used as a placeholder when a project has no featured image.
 */
function cinar_project_gradient(int $post_id): string
{
    $palettes = [
        'linear-gradient(135deg, #b5562c 0%, #e2a06b 100%)',
        'linear-gradient(135deg, #2f3e46 0%, #84a98c 100%)',
        'linear-gradient(135deg, #5f4b8b 0%, #c9b6e4 100%)',
        'linear-gradient(135deg, #1f4e5f 0%, #6fb1c9 100%)',
        'linear-gradient(135deg, #7a5c3a 0%, #d9c5a3 100%)',
    ];
    return $palettes[$post_id % count($palettes)];
}

/**
 * Renders a single project card. Used by the front page and the archive.
 */
function cinar_project_card(WP_Post $post): void
{
    $types    = get_the_terms($post, 'project_type');
    $location = get_post_meta($post->ID, 'cinar_location', true);
    $year     = get_post_meta($post->ID, 'cinar_year', true);
    ?>
    <article class="project-card">
        <a class="project-card__media" href="<?php echo esc_url(get_permalink($post)); ?>"
           style="background: <?php echo esc_attr(cinar_project_gradient($post->ID)); ?>;">
            <?php if (has_post_thumbnail($post)) : ?>
                <?php echo get_the_post_thumbnail($post, 'large'); ?>
            <?php else : ?>
                <span class="project-card__initial"><?php echo esc_html(mb_substr(get_the_title($post), 0, 1)); ?></span>
            <?php endif; ?>
        </a>
        <div class="project-card__body">
            <?php if ($types && !is_wp_error($types)) : ?>
                <p class="project-card__type"><?php echo esc_html(implode(' · ', wp_list_pluck($types, 'name'))); ?></p>
            <?php endif; ?>
            <h3 class="project-card__title"><a href="<?php echo esc_url(get_permalink($post)); ?>"><?php echo esc_html(get_the_title($post)); ?></a></h3>
            <p class="project-card__excerpt"><?php echo esc_html(get_the_excerpt($post)); ?></p>
            <?php if ($location || $year) : ?>
                <p class="project-card__meta"><?php echo esc_html(trim($location . ($location && $year ? ' — ' : '') . $year)); ?></p>
            <?php endif; ?>
        </div>
    </article>
    <?php
}
