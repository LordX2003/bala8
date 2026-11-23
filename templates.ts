import type { TemplatePreset } from "@/types/analyzer";

export const DEFAULT_NORMAL_HTML = `<header class="site-header">
  <a href="#hero" class="brand">
    <span class="brand-badge">⚡</span>
    <span class="brand-name">أكاديمية أفق</span>
  </a>
  <nav class="nav-links">
    <a href="#features" class="nav-link">المميزات</a>
    <a href="#tracks" class="nav-link">المسارات</a>
    <a href="https://example.com/register" target="_blank" rel="noopener" class="btn-outline">إنشاء حساب</a>
  </nav>
</header>

<section class="hero" id="hero">
  <span class="eyebrow">منصة تدريب تفاعلية • دفعة 2026</span>
  <h1>صمّم واجهات رقمية تواكب المعايير العالمية</h1>
  <p>بيئة عملية متكاملة تجمع بين التصميم الحديث وتجربة المستخدم الاحترافية وسرعة الأداء.</p>
  <div class="hero-actions">
    <a href="#tracks" class="btn-primary" id="exploreBtn">
      <span class="btn-icon">🚀</span>
      <span>استكشف المسارات</span>
    </a>
    <button type="button" class="btn-secondary" id="demoBtn" aria-controls="tracks">
      <span>▶</span>
      <span>عرض تجريبي</span>
    </button>
  </div>
</section>

<section class="features-grid" id="features">
  <article class="feature-card">
    <span class="feature-num">01</span>
    <h3>تصميم متجاوب دقيق</h3>
    <p>تخطيطات مرنة تتكيف تلقائياً مع شاشات سطح المكتب والتابلت والهواتف الذكية.</p>
  </article>
  <article class="feature-card">
    <span class="feature-num">02</span>
    <h3>معايير وصول عالمية</h3>
    <p>تباين لوني مدروس ومساحات لمس مريحة وهيكلة دلالية واضحة لجميع المستخدمين.</p>
  </article>
  <article class="feature-card" id="tracks">
    <span class="feature-num">03</span>
    <h3>مشاريع تطبيقية حية</h3>
    <p>بناء معرض أعمال احترافي يؤهلك مباشرة لمتطلبات سوق العمل التقني.</p>
  </article>
</section>`;

export const DEFAULT_NORMAL_CSS = `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
body {
  font-family: 'Cairo', system-ui, sans-serif;
  background: #f8fafc;
  color: #0f172a;
  direction: rtl;
  line-height: 1.7;
}
.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1120px;
  margin: 0 auto;
  padding: 18px 28px;
  border-bottom: 1px solid #e2e8f0;
  background: rgba(255, 255, 255, 0.9);
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: #0f172a;
  font-weight: 800;
  font-size: 20px;
}
.brand-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #eff6ff;
  color: #2563eb;
}
.nav-links {
  display: flex;
  align-items: center;
  gap: 18px;
}
.nav-link {
  color: #475569;
  text-decoration: none;
  font-weight: 600;
  font-size: 15px;
  padding: 8px 12px;
  border-radius: 8px;
}
.btn-outline {
  color: #2563eb;
  border: 1.5px solid #bfdbfe;
  background: #eff6ff;
  text-decoration: none;
  font-weight: 700;
  font-size: 14px;
  padding: 9px 18px;
  border-radius: 10px;
}
.hero {
  max-width: 820px;
  margin: 0 auto;
  padding: 64px 24px 44px;
  text-align: center;
}
.eyebrow {
  display: inline-block;
  padding: 6px 16px;
  border-radius: 999px;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 16px;
}
.hero h1 {
  font-size: 38px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.3;
  margin-bottom: 14px;
}
.hero p {
  font-size: 17px;
  color: #475569;
  max-width: 620px;
  margin: 0 auto 28px;
}
.hero-actions {
  display: flex;
  justify-content: center;
  gap: 14px;
  flex-wrap: wrap;
}
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 13px 28px;
  background: #2563eb;
  color: #ffffff;
  text-decoration: none;
  border-radius: 12px;
  font-weight: 700;
  font-size: 15px;
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.24);
}
.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 13px 24px;
  background: #ffffff;
  color: #1e293b;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
}
.features-grid {
  max-width: 1120px;
  margin: 0 auto;
  padding: 20px 28px 64px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
@media (max-width: 820px) {
  .features-grid {
    grid-template-columns: 1fr;
  }
  .hero h1 {
    font-size: 28px;
  }
}
.feature-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 26px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
}
.feature-num {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #2563eb;
  font-weight: 800;
  font-size: 13px;
  margin-bottom: 12px;
}
.feature-card h3 {
  font-size: 18px;
  color: #0f172a;
  margin-bottom: 8px;
}
.feature-card p {
  font-size: 14px;
  color: #475569;
}`;

export const DEFAULT_NORMAL_JS = `const demoBtn = document.getElementById('demoBtn');
if (demoBtn) {
  demoBtn.addEventListener('click', () => {
    console.log('تم تشغيل العرض التجريبي التفاعلي!');
    const tracks = document.getElementById('tracks');
    if (tracks) tracks.scrollIntoView({ behavior: 'smooth' });
  });
}`;

export const DEFAULT_BLOGGER_XML = `<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE html>
<html b:version='2' class='v2' dir='rtl' lang='ar' xmlns='http://www.w3.org/1999/xhtml' xmlns:b='http://www.google.com/2005/gml/b' xmlns:data='http://www.google.com/2005/gml/data' xmlns:expr='http://www.google.com/2005/gml/expr'>
<head>
  <link href='https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&amp;display=swap' rel='stylesheet'/>
  <b:skin><![CDATA[
    body { font-family: 'Cairo', sans-serif; background: #f0f4f8; margin: 0; padding: 48px 24px; direction: rtl; }
    .card { max-width: 640px; margin: 0 auto; background: #ffffff; padding: 36px; border-radius: 18px; box-shadow: 0 12px 32px rgba(15,23,42,0.08); text-align: center; }
    h1 { color: #0f172a; margin: 0 0 10px; font-size: 28px; }
    p { color: #475569; margin: 0 0 22px; font-size: 16px; }
    .actions { display: flex; justify-content: center; gap: 12px; }
    .btn { padding: 12px 28px; background: #2563eb; color: #ffffff; border: none; border-radius: 10px; font-size: 15px; font-weight: 700; cursor: pointer; text-decoration: none; display: inline-block; }
    .btn-ghost { padding: 12px 24px; background: #eff6ff; color: #1d4ed8; border-radius: 10px; font-size: 15px; font-weight: 700; text-decoration: none; display: inline-block; }
  ]]></b:skin>
</head>
<body>
  <b:section class='main' id='main' showaddelement='no'>
    <b:widget id='Blog1' locked='true' title='Blog Posts' type='Blog' version='2'>
      <b:includable id='main'>
        <div class='card'>
          <h1><data:blog.title/></h1>
          <p>قالب بلوجر تجريبي جاهز للفحص وتعديل الألوان والنصوص والروابط فوراً</p>
          <div class='actions'>
            <a class='btn' expr:href='data:blog.homepageUrl'>الصفحة الرئيسية</a>
            <a class='btn-ghost' href='https://www.blogger.com' rel='noopener' target='_blank'>لوحة تحكم بلوجر</a>
          </div>
        </div>
      </b:includable>
    </b:widget>
  </b:section>
</body>
</html>`;

export const UX_LAB_HTML = `<main class="shop-shell" dir="rtl">
  <header class="shop-bar">
    <a href="#broken-home" class="brand">متجر أطياف</a>
    <button class="tiny-icon-btn" id="cartBtn"></button>
  </header>

  <section class="hero-card">
    <span class="promo-pill">خصم حصري 30%</span>
    <h1 class="hero-title">سماعة لاسلكية عازلة للضوضاء</h1>
    <p class="low-contrast-note">شحن مجاني خلال 24 ساعة لجميع المحافظات مع ضمان عامين</p>
    <p class="micro-terms">* تطبق الشروط والأحكام على الطلبات الفردية فقط.</p>
    <div class="cta-row">
      <button class="buy-btn" id="buyBtn">أضف إلى السلة — 1,499 ج.م</button>
      <a href="#" class="details-link">التفاصيل</a>
    </div>
  </section>
</main>`;

export const UX_LAB_CSS = `body {
  font-family: 'Cairo', Tahoma, sans-serif;
  background: #f8fafc;
  margin: 0;
  padding: 36px 24px;
  direction: rtl;
}
.shop-shell {
  max-width: 620px;
  margin: 0 auto;
}
.shop-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}
.brand {
  font-weight: 800;
  font-size: 20px;
  color: #0f172a;
  text-decoration: none;
}
.tiny-icon-btn {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  cursor: pointer;
}
.hero-card {
  background: #ffffff;
  padding: 32px;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
}
.promo-pill {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 999px;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 13px;
  font-weight: 700;
}
.hero-title {
  color: #0f172a;
  font-size: 26px;
  margin: 14px 0 8px;
}
.low-contrast-note {
  color: #cbd5e1;
  font-size: 15px;
  margin: 0 0 8px;
}
.micro-terms {
  color: #64748b;
  font-size: 10px;
  margin: 0 0 20px;
}
.cta-row {
  display: flex;
  gap: 12px;
  align-items: center;
}
.buy-btn {
  padding: 12px 22px;
  background: #2563eb;
  color: #ffffff;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}
.details-link {
  padding: 4px 8px;
  color: #334155;
  font-size: 13px;
  text-decoration: underline;
}`;

export const UX_LAB_JS = `const buyBtn = document.getElementById('buyBtn');
if (buyBtn) {
  buyBtn.addEventListener('click', () => {
    console.log('تمت إضافة المنتج إلى السلة بنجاح!');
    buyBtn.textContent = '✓ تمت الإضافة للسلة';
  });
}`;

export const KIOGRAPHY_BLOGGER_XML = `<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE html>
<html b:css='false' b:defaultwidgetversion='2' b:layoutsVersion='3' dir='rtl' lang='ar' xmlns='http://www.w3.org/1999/xhtml' xmlns:b='http://www.google.com/2005/gml/b' xmlns:data='http://www.google.com/2005/gml/data' xmlns:expr='http://www.google.com/2005/gml/expr'>
<head>
  <meta charset='UTF-8'/>
  <meta content='width=device-width, initial-scale=1.0, viewport-fit=cover' name='viewport'/>
  <title><data:blog.pageTitle/></title>
  <link href='https://fonts.googleapis.com' rel='preconnect'/>
  <link crossorigin='anonymous' href='https://fonts.gstatic.com' rel='preconnect'/>
  <link href='https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&amp;family=Cinzel:wght@500;700;900&amp;display=swap' rel='stylesheet'/>
  <link href='https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css' rel='stylesheet'/>
  <b:skin><![CDATA[
    :root {
      --gold:#C9A961;--gold-light:#E8D5A3;--gold-pale:#F4E4B1;--gold-dark:#A67C3D;--gold-deep:#8B6B2E;
      --dark-bg:#0A0E14;--dark-card:#131820;--dark-elevated:#1A2029;
      --text-main:#E6EDF3;--text-sub:#8B949E;
      --border-gold:rgba(201,169,97,.22);--border-soft:rgba(255,255,255,.06);
      --radius-sm:10px;--radius-md:16px;--radius-lg:22px;--radius-pill:100px;
      --transition:.3s cubic-bezier(.4,0,.2,1);
      --container:1140px;
    }
    *,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Cairo','Segoe UI',Tahoma,sans-serif;
      background: var(--dark-bg);
      background-image: radial-gradient(circle at 15% 20%,rgba(201,169,97,.06),transparent 40%), radial-gradient(circle at 85% 80%,rgba(201,169,97,.04),transparent 40%);
      color: var(--text-main);
      direction: rtl;
      line-height: 1.7;
      min-height: 100vh;
    }
    a { color: var(--gold); text-decoration: none; transition: color var(--transition); }
    a:hover { color: var(--gold-light); }
    .kg-container { width: 100%; max-width: var(--container); margin: 0 auto; padding: 0 24px; }
    .kg-top-strip { height: 3px; background: linear-gradient(90deg,var(--gold-dark),var(--gold),var(--gold-dark)); position: fixed; top: 0; left: 0; right: 0; z-index: 1000; }
    .kg-header { position: sticky; top: 3px; z-index: 100; background: rgba(10,14,20,.95); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border-gold); }
    .kg-header-inner { display: flex; align-items: center; justify-content: space-between; padding: 10px 24px; max-width: var(--container); margin: 0 auto; gap: 12px; position: relative; }
    .kg-logo { display: flex; align-items: center; gap: 10px; }
    .kg-logo-svg { width: 48px; height: 48px; filter: drop-shadow(0 0 8px rgba(201,169,97,.4)); }
    .kg-logo-text { display: flex; flex-direction: column; line-height: 1.1; }
    .kg-brand { font-family: 'Cinzel',serif; font-size: 1.25rem; font-weight: 900; letter-spacing: 2px; color: var(--gold-light); }
    .kg-tagline { font-size: .62rem; letter-spacing: 2px; color: var(--text-sub); text-transform: uppercase; margin-top: 2px; }
    .kg-nav-toggle { display: inline-flex; align-items: center; justify-content: center; width: 42px; height: 42px; border-radius: var(--radius-sm); background: rgba(201,169,97,.08); border: 1px solid var(--border-gold); color: var(--gold); cursor: pointer; }
    .kg-nav { display: none; position: absolute; top: 100%; right: 0; left: 0; background: var(--dark-card); border-bottom: 1px solid var(--border-gold); padding: 12px 16px; flex-direction: column; gap: 6px; }
    .kg-nav.open { display: flex; }
    .kg-nav a { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: var(--radius-sm); color: var(--text-main); font-weight: 600; font-size: .88rem; border: 1px solid transparent; }
    .kg-nav a i { color: var(--gold); }
    .kg-nav a:hover { background: rgba(201,169,97,.08); border-color: var(--border-gold); color: var(--gold-light); }
    @media(min-width:1024px) {
      .kg-nav-toggle { display: none; }
      .kg-nav { display: flex !important; position: static; flex-direction: row; background: transparent; border: none; padding: 0; gap: 6px; }
    }
    .kg-hero { text-align: center; padding: 44px 0 28px; }
    .kg-eyebrow { display: inline-flex; align-items: center; gap: 8px; padding: 6px 16px; border: 1px solid var(--border-gold); border-radius: var(--radius-pill); background: rgba(201,169,97,.06); color: var(--gold); font-size: .74rem; font-weight: 700; margin-bottom: 16px; }
    .kg-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--gold); box-shadow: 0 0 8px var(--gold); }
    .kg-hero h1 { font-family: 'Cinzel','Cairo',serif; font-size: 2.5rem; font-weight: 900; line-height: 1.3; margin-bottom: 12px; color: var(--gold-light); }
    .kg-hero-sub { color: var(--text-sub); font-size: 1.05rem; max-width: 640px; margin: 0 auto 16px; }
    .kg-hero-authors { display: inline-flex; align-items: center; gap: 8px; color: var(--gold-light); font-weight: 700; font-size: .88rem; padding: 8px 18px; background: rgba(201,169,97,.06); border: 1px solid var(--border-gold); border-radius: var(--radius-pill); }
    .kg-stats { display: grid; grid-template-columns: repeat(2,1fr); gap: 12px; margin: 24px 0 28px; }
    @media(min-width:768px) { .kg-stats { grid-template-columns: repeat(5,1fr); } }
    .kg-stat { background: var(--dark-card); border: 1px solid var(--border-soft); border-radius: var(--radius-md); padding: 18px 12px; text-align: center; }
    .kg-stat i { color: var(--gold); font-size: 1.3rem; margin-bottom: 6px; display: block; }
    .kg-stat-value { font-family: 'Cinzel','Cairo',serif; font-size: 1.45rem; font-weight: 900; color: var(--gold-light); }
    .kg-stat-label { font-size: .75rem; color: var(--text-sub); }
    .kg-tabs-wrap { background: rgba(10,14,20,.98); border: 1px solid var(--border-gold); border-radius: var(--radius-md); padding: 10px; margin-bottom: 24px; }
    .kg-tabs { display: flex; gap: 8px; overflow-x: auto; justify-content: center; flex-wrap: wrap; }
    .kg-tab { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; border-radius: var(--radius-pill); background: rgba(255,255,255,.02); border: 1px solid var(--border-soft); color: var(--text-sub); font-family: inherit; font-size: .85rem; font-weight: 700; cursor: pointer; }
    .kg-tab i { color: var(--gold); }
    .kg-tab.active { background: linear-gradient(135deg,var(--gold),var(--gold-dark)); color: var(--dark-bg); border-color: var(--gold); }
    .kg-tab.active i { color: var(--dark-bg); }
    .kg-panel { display: none; }
    .kg-panel.active { display: block; }
    .kg-card { background: var(--dark-card); border: 1px solid var(--border-gold); border-radius: var(--radius-lg); padding: 28px; margin-bottom: 20px; }
    .kg-section-title { font-size: 1.3rem; color: var(--gold-light); margin-bottom: 16px; padding-bottom: 10px; border-bottom: 1px solid var(--border-gold); display: flex; align-items: center; gap: 10px; }
    .kg-section-title i { color: var(--gold); }
    .kg-grid-4 { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
    .kg-goal { background: var(--dark-card); border: 1px solid var(--border-soft); border-radius: var(--radius-md); padding: 18px; }
    .kg-goal-num { display: inline-block; color: var(--gold); padding: 2px 12px; border: 1px solid var(--border-gold); border-radius: var(--radius-pill); font-weight: 800; margin-bottom: 8px; }
    .kg-goal h3 { color: var(--gold-light); font-size: 1rem; margin-bottom: 6px; }
    .kg-goal p { color: var(--text-sub); font-size: .85rem; }
    .kg-team-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; }
    .kg-team-card { background: var(--dark-card); border: 1px solid var(--border-soft); border-radius: var(--radius-md); padding: 20px 14px; text-align: center; display: flex; flex-direction: column; align-items: center; }
    .kg-team-avatar { display: inline-flex; align-items: center; justify-content: center; width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(135deg,var(--gold),var(--gold-dark)); color: var(--dark-bg); font-weight: 900; margin-bottom: 10px; }
    .kg-team-name { font-size: .95rem; color: var(--gold-light); margin-bottom: 6px; }
    .kg-team-role { display: inline-block; padding: 3px 10px; border-radius: var(--radius-pill); background: rgba(201,169,97,.08); border: 1px solid var(--border-gold); color: var(--gold); font-size: .7rem; font-weight: 700; margin-bottom: 12px; }
    .kg-team-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; width: 100%; padding: 9px 16px; border-radius: var(--radius-pill); background: linear-gradient(135deg,var(--gold),var(--gold-dark)); color: var(--dark-bg) !important; font-weight: 700; font-size: .8rem; }
    .kg-cta { text-align: center; padding: 30px 20px; background: linear-gradient(135deg,rgba(201,169,97,.1),var(--dark-card)); border: 1px solid var(--border-gold); border-radius: var(--radius-lg); margin-top: 24px; }
    .kg-cta h3 { font-size: 1.35rem; color: var(--gold-light); margin-bottom: 8px; }
    .kg-cta p { color: var(--text-sub); margin-bottom: 16px; }
    .kg-btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 28px; border-radius: var(--radius-pill); background: linear-gradient(135deg,var(--gold),var(--gold-dark)); color: var(--dark-bg) !important; font-weight: 800; }
    .kg-posts-section { padding: 28px 0; }
    .kg-posts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; }
    .kg-post-card { background: var(--dark-card); border: 1px solid var(--border-soft); border-radius: var(--radius-md); padding: 20px; display: block; color: inherit !important; }
    .kg-post-card h3 { color: var(--gold-light); margin-bottom: 8px; font-size: 1.05rem; }
    .kg-post-meta { font-size: .75rem; color: var(--gold); margin-bottom: 8px; }
    .kg-post-snippet { font-size: .86rem; color: var(--text-sub); }
    .kg-footer { border-top: 1px solid var(--border-gold); background: var(--dark-card); padding: 28px 0 20px; margin-top: 36px; text-align: center; }
    .kg-footer-links { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin: 12px 0; }
    .kg-footer-links a { color: var(--text-sub); font-size: .85rem; display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; }
    .kg-footer-links a i { color: var(--gold); }
  ]]></b:skin>
</head>
<body>
<div class='kg-top-strip'></div>
<header class='kg-header'>
  <div class='kg-header-inner'>
    <a class='kg-logo' expr:href='data:blog.homepageUrl' title='KIOGRAPHY'>
      <svg aria-hidden='true' class='kg-logo-svg' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'>
        <circle cx='60' cy='60' fill='rgba(201,169,97,0.1)' r='54' stroke='#C9A961' stroke-width='3'/>
        <path d='M 38 28 L 38 92 M 38 58 L 70 28 M 38 58 Q 55 76 84 90' fill='none' stroke='#C9A961' stroke-linecap='round' stroke-width='7'/>
        <circle cx='76' cy='52' fill='#C9A961' r='20'/>
      </svg>
      <div class='kg-logo-text'>
        <span class='kg-brand'>KIOGRAPHY</span>
        <span class='kg-tagline'>Explore • Discover • Document</span>
      </div>
    </a>
    <button aria-controls='kgNav' class='kg-nav-toggle' id='kgNavBtn' onclick='kgToggleNav()' type='button'>
      <i class='fas fa-bars'></i>
    </button>
    <nav class='kg-nav' id='kgNav'>
      <a href='#kgTabs'><i class='fas fa-list-check'></i> المحتوى</a>
      <a href='#kgTabs' onclick='kgOpenTab("team", event)'><i class='fas fa-user-tie'></i> القادة</a>
      <a href='#kgCTA'><i class='fas fa-paper-plane'></i> سجّل الآن</a>
      <a expr:href='data:blog.homepageUrl'><i class='fas fa-home'></i> الرئيسية</a>
    </nav>
  </div>
</header>

<main>
  <b:if cond='data:view.isHomepage'>
    <div class='kg-container'>
      <section class='kg-hero'>
        <div class='kg-eyebrow'><span class='kg-eyebrow-dot'></span> برنامج تدريبي متكامل • مجانًا</div>
        <h1>دورة تأهيل أخصائي GIS محترف</h1>
        <p class='kg-hero-sub'>خلاصة أربع سنوات من الخبرة في نظم المعلومات الجغرافية</p>
        <div class='kg-hero-authors'><i class='fas fa-user-tie'></i> إعداد: أ.م/ محمد صلاح خليل</div>
      </section>

      <div class='kg-stats'>
        <div class='kg-stat'><i class='fas fa-layer-group'></i><div class='kg-stat-value'>3</div><div class='kg-stat-label'>مستويات</div></div>
        <div class='kg-stat'><i class='fas fa-book'></i><div class='kg-stat-value'>77</div><div class='kg-stat-label'>درس</div></div>
        <div class='kg-stat'><i class='fas fa-clock'></i><div class='kg-stat-value'>200</div><div class='kg-stat-label'>ساعة مكثفة</div></div>
        <div class='kg-stat'><i class='fas fa-hourglass-half'></i><div class='kg-stat-value'>أقل من سنة</div><div class='kg-stat-label'>إجمالي المدة</div></div>
        <div class='kg-stat'><i class='fas fa-gift'></i><div class='kg-stat-value'>مجانًا</div><div class='kg-stat-label'>التكلفة</div></div>
      </div>

      <div class='kg-tabs-wrap' id='kgTabs'>
        <div class='kg-tabs' role='tablist'>
          <button aria-controls='tab-intro' class='kg-tab active' data-tab='intro' type='button'><i class='fas fa-book-open'></i> مقدمة</button>
          <button aria-controls='tab-goals' class='kg-tab' data-tab='goals' type='button'><i class='fas fa-bullseye'></i> الأهداف</button>
          <button aria-controls='tab-team' class='kg-tab' data-tab='team' type='button'><i class='fas fa-user-tie'></i> القادة</button>
        </div>
      </div>

      <div class='kg-panel active' id='tab-intro'>
        <div class='kg-card'>
          <h2 class='kg-section-title'><i class='fas fa-quote-right'></i> مقدمة عن الدورة</h2>
          <p>دورة تدريبية متخصصة في <strong>نظم المعلومات الجغرافية (GIS)</strong> تهدف إلى تخريج أخصائي نظم معلومات جغرافية محترف ومواكب لمتطلبات سوق العمل في مصر ودول الخليج.</p>
        </div>
      </div>

      <div class='kg-panel' id='tab-goals'>
        <div class='kg-grid-4'>
          <div class='kg-goal'><span class='kg-goal-num'>01</span><h3>مادة علمية مبسطة</h3><p>توفير مادة علمية وعملية قوية للمتدرب بشكل مبسّط في مدة أقل من سنة.</p></div>
          <div class='kg-goal'><span class='kg-goal-num'>02</span><h3>فرصة عمل حر</h3><p>ضمّ المتدربين المتميزين إلى فريق العمل بعد إتمام الدورة.</p></div>
          <div class='kg-goal'><span class='kg-goal-num'>03</span><h3>مساعدة في التوظيف</h3><p>شهادات معتمدة من جهات رسمية وبناء سيرة ذاتية قوية.</p></div>
          <div class='kg-goal'><span class='kg-goal-num'>04</span><h3>المنفعة المتبادلة</h3><p>محتوى مجاني بالكامل مقابل تنفيذ تطبيقات عملية لكسب الخبرة.</p></div>
        </div>
      </div>

      <div class='kg-panel' id='tab-team'>
        <div class='kg-team-grid'>
          <div class='kg-team-card'><div class='kg-team-avatar'>01</div><h3 class='kg-team-name'>محمد رضا محمد</h3><span class='kg-team-role'>تيم ليدر</span><a class='kg-team-btn' href='https://chat.whatsapp.com/DC46lUwSVjd5TOXkdjP9nV' rel='noopener' target='_blank'><i class='fab fa-whatsapp'></i> انضم إلى فريق</a></div>
          <div class='kg-team-card'><div class='kg-team-avatar'>02</div><h3 class='kg-team-name'>روان الصادق</h3><span class='kg-team-role'>تيم ليدر</span><a class='kg-team-btn' href='https://chat.whatsapp.com/KXSusQcCukuBlaBY1NtWkq' rel='noopener' target='_blank'><i class='fab fa-whatsapp'></i> انضم إلى فريق</a></div>
          <div class='kg-team-card'><div class='kg-team-avatar'>03</div><h3 class='kg-team-name'>بسنت محمد حسني</h3><span class='kg-team-role'>تيم ليدر</span><a class='kg-team-btn' href='https://chat.whatsapp.com/ID2OIGhb59T2daKl9QN9sY' rel='noopener' target='_blank'><i class='fab fa-whatsapp'></i> انضم إلى فريق</a></div>
          <div class='kg-team-card'><div class='kg-team-avatar'>04</div><h3 class='kg-team-name'>سارة هريدي محمد</h3><span class='kg-team-role'>تيم ليدر</span><a class='kg-team-btn' href='https://chat.whatsapp.com/LD3jEJijdkDGY7m0ShcD6W' rel='noopener' target='_blank'><i class='fab fa-whatsapp'></i> انضم إلى فريق</a></div>
        </div>
      </div>

      <div class='kg-cta' id='kgCTA'>
        <h3>ابدأ رحلتك نحو الاحتراف</h3>
        <p>انضم إلى الدورة وابنِ مستقبلك في مجال نظم المعلومات الجغرافية</p>
        <a class='kg-btn' href='https://kxk222.blogspot.com/' rel='noopener' target='_blank'><i class='fas fa-paper-plane'></i> سجّل الآن</a>
      </div>
    </div>
  </b:if>

  <b:section class='kg-main-section' id='main' showaddelement='no'>
    <b:widget id='Blog1' locked='true' title='رسائل المدونة الإلكترونية' type='Blog' version='2' visible='true'>
      <b:includable id='main' var='top'>
        <b:if cond='data:view.isHomepage'>
          <div class='kg-container kg-posts-section'>
            <h2 class='kg-section-title'><i class='fas fa-newspaper'></i> أحدث المقالات</h2>
            <div class='kg-posts-grid'>
              <b:loop values='data:posts' var='post'>
                <a class='kg-post-card' expr:href='data:post.url'>
                  <h3><data:post.title/></h3>
                  <div class='kg-post-meta'><i class='fas fa-clock'></i> <data:post.date/></div>
                  <p class='kg-post-snippet'><data:post.snippets.short/></p>
                </a>
              </b:loop>
            </div>
          </div>
        </b:if>
        <b:if cond='data:view.isSingleItem'>
          <div class='kg-container kg-posts-section'>
            <div class='kg-card'>
              <h1 class='kg-section-title'><data:post.title/></h1>
              <div class='kg-post-meta'><data:post.date/></div>
              <div><data:post.body/></div>
            </div>
          </div>
        </b:if>
      </b:includable>
    </b:widget>
  </b:section>
</main>

<footer class='kg-footer'>
  <div class='kg-container'>
    <div class='kg-brand'>KIOGRAPHY</div>
    <div class='kg-footer-links'>
      <a expr:href='data:blog.homepageUrl'><i class='fas fa-home'></i> الرئيسية</a>
      <a href='https://hxxxx2.blogspot.com/' rel='noopener' target='_blank'><i class='fas fa-file-alt'></i> عرض المحتوى</a>
      <a href='https://habibastorexx.blogspot.com/2026/09/blog-post_224.html' rel='noopener' target='_blank'><i class='fas fa-users'></i> عرض الأعضاء</a>
    </div>
  </div>
</footer>

<script>
//<![CDATA[
(function(){
  var nav = document.getElementById('kgNav');
  window.kgToggleNav = function(){ if (nav) nav.classList.toggle('open'); };
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.kg-tab'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('.kg-panel'));
  window.kgOpenTab = function(name, ev){
    if (ev && ev.preventDefault) ev.preventDefault();
    tabs.forEach(function(t){ t.classList.toggle('active', t.getAttribute('data-tab') === name); });
    panels.forEach(function(p){ p.classList.toggle('active', p.id === 'tab-' + name); });
    try { sessionStorage.setItem('kgTab', name); } catch(e){}
  };
  tabs.forEach(function(t){
    t.addEventListener('click', function(){ window.kgOpenTab(this.getAttribute('data-tab')); });
  });
})();
//]]>
</script>
</body>
</html>`;

export const PRESETS: TemplatePreset[] = [
  {
    id: "normal-default",
    label: "أكاديمية أفق (صفحة هبوط متكاملة)",
    description: "واجهة ويب حديثة بأزرار وروابط داخلية وخارجية وعناصر مركّبة",
    mode: "normal",
    normalHtml: DEFAULT_NORMAL_HTML,
    normalCss: DEFAULT_NORMAL_CSS,
    normalJs: DEFAULT_NORMAL_JS,
  },
  {
    id: "normal-ux-lab",
    label: "مختبر فحص UX (متجر أطياف)",
    description: "يحتوي على حالات اختبار للتباين والروابط المكسورة وأحجام الأزرار",
    mode: "normal",
    normalHtml: UX_LAB_HTML,
    normalCss: UX_LAB_CSS,
    normalJs: UX_LAB_JS,
  },
  {
    id: "blogger-kiography",
    label: "قالب KIOGRAPHY الكامل (XML)",
    description: "قالب بلوجر احترافي بتبويبات تفاعلية وروابط واتساب وأيقونات",
    mode: "blogger",
    bloggerXml: KIOGRAPHY_BLOGGER_XML,
  },
  {
    id: "blogger-default",
    label: "قالب بلوجر الأساسي المبسط (XML)",
    description: "هيكل XML نظيف لتجربة b:skin و data:blog.title والروابط الديناميكية",
    mode: "blogger",
    bloggerXml: DEFAULT_BLOGGER_XML,
  },
];
