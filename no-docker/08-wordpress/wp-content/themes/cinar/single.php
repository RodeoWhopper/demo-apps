<?php get_header(); ?>

<?php while (have_posts()) : the_post(); ?>
    <?php if (get_post_type() === 'project') :
        $types    = get_the_terms(get_the_ID(), 'project_type');
        $facts    = [
            'Konum'     => get_post_meta(get_the_ID(), 'cinar_location', true),
            'Yıl'       => get_post_meta(get_the_ID(), 'cinar_year', true),
            'İşveren'   => get_post_meta(get_the_ID(), 'cinar_client', true),
            'Alan'      => get_post_meta(get_the_ID(), 'cinar_area', true),
        ];
        ?>
        <article <?php post_class('project'); ?>>
            <div class="project__hero" style="background: <?php echo esc_attr(cinar_project_gradient(get_the_ID())); ?>;">
                <?php if (has_post_thumbnail()) { the_post_thumbnail('full'); } ?>
            </div>
            <div class="container project__layout">
                <aside class="project__facts">
                    <?php if ($types && !is_wp_error($types)) : ?>
                        <p class="page-head__eyebrow"><?php echo esc_html(implode(' · ', wp_list_pluck($types, 'name'))); ?></p>
                    <?php endif; ?>
                    <h1><?php the_title(); ?></h1>
                    <dl>
                        <?php foreach ($facts as $label => $value) : if (!$value) { continue; } ?>
                            <dt><?php echo esc_html($label); ?></dt>
                            <dd><?php echo esc_html($value); ?></dd>
                        <?php endforeach; ?>
                    </dl>
                    <a class="back-link" href="<?php echo esc_url(get_post_type_archive_link('project')); ?>">← Tüm projeler</a>
                </aside>
                <div class="prose project__content">
                    <?php the_content(); ?>
                </div>
            </div>
        </article>
    <?php else : ?>
        <article <?php post_class('post'); ?>>
            <div class="container narrow">
                <p class="page-head__eyebrow"><?php echo esc_html(get_the_date()); ?></p>
                <h1><?php the_title(); ?></h1>
                <div class="prose"><?php the_content(); ?></div>
            </div>
        </article>
    <?php endif; ?>
<?php endwhile; ?>

<?php get_footer(); ?>
