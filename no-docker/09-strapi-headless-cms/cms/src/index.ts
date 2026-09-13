import type { Core } from '@strapi/strapi';

/**
 * Actions the anonymous "Public" role may call. Granted programmatically so the
 * decoupled frontend works on a fresh database without touching the admin UI.
 */
const PUBLIC_ACTIONS = [
  'api::article.article.find',
  'api::article.article.findOne',
  'api::category.category.find',
  'api::category.category.findOne',
  'api::author.author.find',
  'api::author.author.findOne',
];

async function grantPublicPermissions(strapi: Core.Strapi): Promise<void> {
  const role = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'public' } });
  if (!role) {
    strapi.log.warn('[bootstrap] users-permissions "public" role not found; skipping permission setup');
    return;
  }
  const permissions = strapi.db.query('plugin::users-permissions.permission');
  for (const action of PUBLIC_ACTIONS) {
    const existing = await permissions.findOne({ where: { action, role: role.id } });
    if (!existing) {
      await permissions.create({ data: { action, role: role.id } });
      strapi.log.info(`[bootstrap] granted public permission: ${action}`);
    }
  }
}

// --- Seed helpers (Strapi "blocks" rich-text AST) ---------------------------------------------
type Block = Record<string, unknown>;
const text = (t: string) => ({ type: 'text', text: t });
const p = (t: string): Block => ({ type: 'paragraph', children: [text(t)] });
const h = (t: string, level = 2): Block => ({ type: 'heading', level, children: [text(t)] });
const quote = (t: string): Block => ({ type: 'quote', children: [text(t)] });
const list = (items: string[], format: 'ordered' | 'unordered' = 'unordered'): Block => ({
  type: 'list',
  format,
  children: items.map((t) => ({ type: 'list-item', children: [text(t)] })),
});

const CATEGORIES = [
  { name: 'Mevsim Mutfağı', slug: 'mevsim-mutfagi' },
  { name: 'Üretici Hikâyeleri', slug: 'uretici-hikayeleri' },
];

const AUTHORS = [
  { name: 'Defne Arslan', bio: 'Ege köylerinde büyüdü; on yıldır yerel mutfak ve tohum kültürü üzerine yazıyor.' },
  { name: 'Kerem Toprak', bio: 'Eski aşçı, şimdi gezgin yazar. Küçük üreticilerle mutfak arasındaki yolu takip ediyor.' },
];

const ARTICLES = [
  {
    title: 'Enginar Mevsimi: Sapından Yaprağına',
    slug: 'enginar-mevsimi-sapindan-yapragina',
    excerpt: 'Nisan enginarını israfsız değerlendirmenin dört yolu ve zeytinyağlı klasiğe küçük bir dokunuş.',
    publishedDate: '2026-04-12',
    category: 'mevsim-mutfagi',
    author: 0,
    body: [
      p('Enginar, Ege sofrasının nisan habercisidir. Çoğu mutfakta yalnızca kalbi kullanılır; oysa sapı, dış yaprakları ve hatta çiçek tüyleri bile bir şeye dönüşebilir.'),
      h('Sapını Atmayın'),
      p('Soyulmuş enginar sapı, kalbi kadar tatlıdır. İnce dilimleyip limonlu suda bekletin; zeytinyağlı pilaki veya turşuya ekleyin.'),
      h('Klasik Zeytinyağlı, Bir Farkla'),
      list(['Enginarı bakla ve taze soğanla değil, yeşil sarımsak ve dereotu sapıyla pişirin.', 'Şekeri bırakın; bir tatlı kaşığı bal ekleyin.', 'Soğuk servis etmeden önce üzerine bol taze nane ve limon kabuğu rendeleyin.']),
      quote('Enginar acele sevmez. Kısık ateş ve sabır, tarifin yarısıdır.'),
    ],
  },
  {
    title: 'Bozcaada Domatesinin Peşinde',
    slug: 'bozcaada-domatesinin-pesinde',
    excerpt: 'Adada beş kuşaktır aynı tohumu saklayan Ayşe Hanım ile kurutulmuş domates üzerine bir sohbet.',
    publishedDate: '2026-08-03',
    category: 'uretici-hikayeleri',
    author: 1,
    body: [
      p('Bozcaada’nın rüzgârlı yamaçlarında yetişen küçük, etli domatesler adanın en eski sırrıdır. Ayşe Hanım tohumu babaannesinden aldı; her ağustos en güzel meyveleri gelecek yıl için ayırıyor.'),
      h('Kurutma Ritüeli'),
      p('Domatesler ikiye kesilir, kaya tuzu ile tuzlanır ve bez üzerinde üç gün güneşe bırakılır. Gece nemi almasın diye örtülür, sabah yeniden açılır.'),
      p('“Rüzgâr olmadan kurutulan domates tatlı olmaz,” diyor Ayşe Hanım. “Poyraz meyvenin suyunu alır, tadını bırakır.”'),
      h('Mutfakta'),
      list(['Kurutulmuş domatesi ılık suda on dakika bekletip zeytinyağı ve kekikle harmanlayın.', 'Ekmek hamuruna doğrayarak katın.', 'Kışlık makarna sosunda taze domates yerine kullanın.']),
    ],
  },
  {
    title: 'Kabak Çiçeği Dolması İçin Sabah Erken Kalkmak',
    slug: 'kabak-cicegi-dolmasi',
    excerpt: 'Çiçekler öğlene kadar kapanır; en iyi dolma, güneş doğarken toplanan çiçekten yapılır.',
    publishedDate: '2026-07-14',
    category: 'mevsim-mutfagi',
    author: 0,
    body: [
      p('Kabak çiçeği dolması yaz mutfağının en kısa ömürlü lezzetlerinden biridir. Çiçek sabah açılır, öğleden sonra kapanır; bu yüzden pazarda nadiren bulunur.'),
      h('İç Harcı'),
      list(['Bir su bardağı baldo pirinç', 'Bir demet taze nane ve dereotu', 'İki taze soğan, bir domates', 'Yarım çay bardağı zeytinyağı, bir tutam tarçın']),
      p('Harcı çiğ olarak doldurun; çiçeğin uçlarını içe kıvırın ve tencereye dik dizin. Üzerine ılık su ve limon suyu ekleyip yirmi dakika kısık ateşte pişirin.'),
      quote('Çiçeği yıkamayın; nemli bezle silin. Su, dolmanın kokusunu alır.'),
    ],
  },
  {
    title: 'Kars’ta Bir Gravyer Ustası',
    slug: 'karsta-bir-gravyer-ustasi',
    excerpt: 'Boğatepe köyünde 1900’lerden kalma mandırada peynir yapan Sevim Usta’nın günü şafakta başlıyor.',
    publishedDate: '2026-06-21',
    category: 'uretici-hikayeleri',
    author: 1,
    body: [
      p('Boğatepe, Kars’ın 2.300 metredeki köyü. Burada gravyer, İsviçreli ustaların yüz yıl önce bıraktığı yöntemle hâlâ bakır kazanlarda yapılıyor.'),
      h('Sütün Yolculuğu'),
      p('Sabah sağılan süt aynı gün işlenir. Sevim Usta kazanı odun ateşinde ısıtır, mayayı elle karıştırır ve teleme kesilince bez torbalara alır.'),
      p('Tekerlekler en az altı ay taş mahzende bekler. Her hafta çevrilir, tuzlu suyla silinir. “Peynir yaşayan bir şey,” diyor. “Bakmazsan küser.”'),
      h('Nasıl Yenir'),
      list(['Kalın dilimleyip yanına yayla balı ile', 'Rendeleyip kuymak benzeri mısır unlu tavaya', 'Sıcak ekmekle sade'], 'ordered'),
    ],
  },
  {
    title: 'Sonbahar Sofrası: Ayva, Kestane, Nar',
    slug: 'sonbahar-sofrasi-ayva-kestane-nar',
    excerpt: 'Ekim üçlüsüyle tuzlu-tatlı üç tarif: kestaneli lahana, narlı bulgur ve tuzlu ayva tatlısı.',
    publishedDate: '2026-10-05',
    category: 'mevsim-mutfagi',
    author: 1,
    body: [
      p('Sonbaharın ilk soğuğuyla pazar tezgâhları değişir. Domatesin yerini ayva, karpuzun yerini nar alır; kestane kokusu sokakları doldurur.'),
      h('Kestaneli Kapuska'),
      p('Lahanayı ince kıyıp soğanla kavurun; haşlanmış kestaneleri ikiye bölüp ekleyin. Bir tutam kimyon ve pul biber, üzerine limon.'),
      h('Narlı Bulgur Salatası'),
      p('Kaba bulguru ıslatıp nar taneleri, maydanoz, taze soğan ve nar ekşisiyle karıştırın. Kavrulmuş ceviz ile bitirin.'),
      h('Tuzlu Ayva Tatlısı'),
      p('Ayvayı çekirdeğiyle pişirin; şerbete bir çay kaşığı deniz tuzu ve bir çubuk tarçın ekleyin. Kaymak yerine yoğurt ile servis edin.'),
    ],
  },
];

async function seed(strapi: Core.Strapi): Promise<void> {
  const existing = await strapi.db.query('api::article.article').count();
  if (existing > 0) {
    return;
  }
  strapi.log.info('[bootstrap] empty database – seeding Tarla Journal sample content');

  // Loosely typed on purpose: generated content-type typings may not exist at compile time.
  const documents = strapi.documents as unknown as (uid: string) => any;

  const categoryIds: Record<string, string> = {};
  for (const c of CATEGORIES) {
    const doc = await documents('api::category.category').create({ data: c, status: 'published' });
    categoryIds[c.slug] = doc.documentId;
  }

  const authorIds: string[] = [];
  for (const a of AUTHORS) {
    const doc = await documents('api::author.author').create({ data: a, status: 'published' });
    authorIds.push(doc.documentId);
  }

  for (const a of ARTICLES) {
    await documents('api::article.article').create({
      data: {
        title: a.title,
        slug: a.slug,
        excerpt: a.excerpt,
        body: a.body,
        publishedDate: a.publishedDate,
        category: categoryIds[a.category],
        author: authorIds[a.author],
      },
      status: 'published',
    });
  }
  strapi.log.info(`[bootstrap] seeded ${CATEGORIES.length} categories, ${AUTHORS.length} authors, ${ARTICLES.length} articles`);
}

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await grantPublicPermissions(strapi);
    await seed(strapi);
  },
};
