<?php use function Bakkal\e; ?>
<div class="w-full max-w-md mx-auto text-center bg-white rounded-xl border border-olive-100 shadow-sm p-10">
  <div class="text-6xl font-black text-olive-300"><?= (int) $code ?></div>
  <h2 class="mt-2 text-xl font-semibold"><?= e($heading) ?></h2>
  <p class="mt-2 text-sm text-olive-600"><?= e($message) ?></p>
  <?php if (!empty($exception)): ?>
    <pre class="mt-4 text-left text-xs bg-olive-50 p-3 rounded overflow-x-auto"><?= e($exception->getMessage() . "\n" . $exception->getTraceAsString()) ?></pre>
  <?php endif; ?>
  <a href="/" class="inline-block mt-6 text-sm text-olive-700 underline">Ana sayfa</a>
</div>
