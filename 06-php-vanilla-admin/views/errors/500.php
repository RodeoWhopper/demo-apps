<?= \Bakkal\View::partial('errors/_error', ['code' => 500, 'heading' => 'Sunucu hatası', 'message' => 'Beklenmeyen bir hata oluştu.', 'exception' => $exception ?? null]) ?>
