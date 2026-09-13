</main>
<footer class="site-footer">
    <div class="container site-footer__inner">
        <div class="site-footer__brand">
            <strong><?php bloginfo('name'); ?></strong>
            <p><?php bloginfo('description'); ?></p>
        </div>
        <div class="site-footer__contact">
            <p>Kordonboyu Cad. No: 14, Alsancak / İzmir</p>
            <p><a href="mailto:merhaba@cinar.local">merhaba@cinar.local</a> · +90 232 000 00 00</p>
        </div>
        <div class="site-footer__meta">
            <p>&copy; <?php echo esc_html(date_i18n('Y')); ?> <?php bloginfo('name'); ?></p>
            <p><a href="<?php echo esc_url(wp_login_url()); ?>">Yönetim</a></p>
        </div>
    </div>
</footer>
<?php wp_footer(); ?>
</body>
</html>
