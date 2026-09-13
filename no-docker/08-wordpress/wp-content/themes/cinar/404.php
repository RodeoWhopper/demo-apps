<?php get_header(); ?>

<section class="page-head">
    <div class="container">
        <p class="page-head__eyebrow">404</p>
        <h1>Bu sayfa planda yok.</h1>
    </div>
</section>
<div class="container narrow prose">
    <p>Aradığınız adres taşınmış veya hiç var olmamış olabilir.</p>
    <p><a class="button" href="<?php echo esc_url(home_url('/')); ?>">Anasayfaya dön</a></p>
</div>

<?php get_footer(); ?>
