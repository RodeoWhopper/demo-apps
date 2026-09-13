<?php get_header(); ?>

<section class="hero">
    <div class="container hero__inner">
        <p class="hero__eyebrow">Mimarlık · İç Mekân · Kentsel Tasarım</p>
        <h1 class="hero__title">Işığı, malzemeyi ve zamanı<br>aynı çatı altında tasarlıyoruz.</h1>
        <p class="hero__lead">Çınar Mimarlık, İzmir merkezli bağımsız bir stüdyodur. Konut, kültür ve ticari yapılar için yerinde üretilmiş, iklime duyarlı ve kalıcı çözümler geliştiriyoruz.</p>
        <div class="hero__actions">
            <a class="button" href="<?php echo esc_url(get_post_type_archive_link('project')); ?>">Projeleri İncele</a>
            <a class="button button--ghost" href="<?php echo esc_url(home_url('/iletisim/')); ?>">Bize Ulaşın</a>
        </div>
    </div>
</section>

<?php if (have_posts()) : while (have_posts()) : the_post(); ?>
    <?php if (trim(get_the_content()) !== '') : ?>
        <section class="intro">
            <div class="container intro__inner prose">
                <?php the_content(); ?>
            </div>
        </section>
    <?php endif; ?>
<?php endwhile; endif; ?>

<section class="projects">
    <div class="container">
        <div class="section-head">
            <h2>Seçilmiş Projeler</h2>
            <a href="<?php echo esc_url(get_post_type_archive_link('project')); ?>">Tümünü gör →</a>
        </div>
        <?php
        $projects = new WP_Query([
            'post_type'      => 'project',
            'posts_per_page' => 6,
            'orderby'        => 'date',
            'order'          => 'DESC',
        ]);
        if ($projects->have_posts()) : ?>
            <div class="project-grid">
                <?php while ($projects->have_posts()) : $projects->the_post(); cinar_project_card(get_post()); endwhile; ?>
            </div>
        <?php else : ?>
            <p class="empty">Henüz proje eklenmedi. Yönetim panelinden <em>Projeler</em> menüsünü kullanın.</p>
        <?php endif; wp_reset_postdata(); ?>
    </div>
</section>

<section class="values">
    <div class="container values__grid">
        <div>
            <h3>Bağlam</h3>
            <p>Her proje bulunduğu sokağın ölçeği, rüzgârı ve komşularıyla başlar.</p>
        </div>
        <div>
            <h3>Malzeme</h3>
            <p>Yerel taş, ahşap ve pişmiş toprağı çağdaş detaylarla yeniden yorumlarız.</p>
        </div>
        <div>
            <h3>Süreklilik</h3>
            <p>Bakımı kolay, onarılabilir ve yıllar içinde güzelleşen yapılar hedefleriz.</p>
        </div>
    </div>
</section>

<?php get_footer(); ?>
