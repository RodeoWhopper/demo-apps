<?php get_header(); ?>

<?php while (have_posts()) : the_post(); ?>
    <article <?php post_class('page-article'); ?>>
        <section class="page-head">
            <div class="container">
                <h1><?php the_title(); ?></h1>
            </div>
        </section>
        <div class="container narrow prose">
            <?php the_content(); ?>
        </div>
    </article>
<?php endwhile; ?>

<?php get_footer(); ?>
