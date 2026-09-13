<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<header class="site-header">
    <div class="container site-header__inner">
        <a class="brand" href="<?php echo esc_url(home_url('/')); ?>" rel="home">
            <span class="brand__mark" aria-hidden="true">Ç</span>
            <span class="brand__name"><?php bloginfo('name'); ?></span>
        </a>
        <nav class="site-nav" aria-label="<?php esc_attr_e('Primary', 'cinar'); ?>">
            <?php
            wp_nav_menu([
                'theme_location' => 'primary',
                'container'      => false,
                'menu_class'     => 'site-nav__list',
                'fallback_cb'    => 'cinar_fallback_menu',
                'depth'          => 1,
            ]);
            ?>
        </nav>
    </div>
</header>
<main class="site-main" id="main">
