<?php get_header(); ?>

<section class="page-head">
    <div class="container">
        <p class="page-head__eyebrow">Portfolyo</p>
        <h1><?php echo is_tax('project_type') ? esc_html(single_term_title('', false)) : 'Projeler'; ?></h1>
        <?php
        $terms = get_terms(['taxonomy' => 'project_type', 'hide_empty' => true]);
        if ($terms && !is_wp_error($terms)) : ?>
            <ul class="filter-list">
                <li><a class="<?php echo is_tax() ? '' : 'is-active'; ?>" href="<?php echo esc_url(get_post_type_archive_link('project')); ?>">Tümü</a></li>
                <?php foreach ($terms as $term) : ?>
                    <li><a class="<?php echo is_tax('project_type', $term->slug) ? 'is-active' : ''; ?>" href="<?php echo esc_url(get_term_link($term)); ?>"><?php echo esc_html($term->name); ?></a></li>
                <?php endforeach; ?>
            </ul>
        <?php endif; ?>
    </div>
</section>

<section class="projects">
    <div class="container">
        <?php if (have_posts()) : ?>
            <div class="project-grid">
                <?php while (have_posts()) : the_post(); cinar_project_card(get_post()); endwhile; ?>
            </div>
            <div class="pagination"><?php the_posts_pagination(['mid_size' => 2]); ?></div>
        <?php else : ?>
            <p class="empty">Bu kategoride henüz proje yok.</p>
        <?php endif; ?>
    </div>
</section>

<?php get_footer(); ?>
