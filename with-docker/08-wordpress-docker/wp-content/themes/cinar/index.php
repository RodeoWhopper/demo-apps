<?php get_header(); ?>

<section class="page-head">
    <div class="container">
        <h1><?php echo is_home() ? 'Günce' : wp_kses_post(get_the_archive_title()); ?></h1>
    </div>
</section>

<div class="container narrow">
    <?php if (have_posts()) : ?>
        <?php while (have_posts()) : the_post(); ?>
            <article <?php post_class('post-teaser'); ?>>
                <p class="page-head__eyebrow"><?php echo esc_html(get_the_date()); ?></p>
                <h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
                <div class="prose"><?php the_excerpt(); ?></div>
            </article>
        <?php endwhile; ?>
        <div class="pagination"><?php the_posts_pagination(); ?></div>
    <?php else : ?>
        <p class="empty">İçerik bulunamadı.</p>
    <?php endif; ?>
</div>

<?php get_footer(); ?>
