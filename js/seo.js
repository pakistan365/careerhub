(function () {
  const SITE_URL = 'https://careerhub.pk';
  const DEFAULT_IMAGE = SITE_URL + '/assets/og-default.jpg';

  const ensureMeta = (attr, key, value) => {
    if (!value) return;
    let el = document.head.querySelector(`meta[${attr}="${key}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute('content', value);
  };

  const title = (document.title || 'CareerHub Pakistan').trim();
  const description = (document.querySelector('meta[name="description"]')?.content || 'Find scholarships, jobs, internships, exams and books in one place.').trim();
  const current = new URL(window.location.href);

  const canonicalPath = current.pathname.endsWith('/index.html') ? '/' : current.pathname;
  const canonicalUrl = `${SITE_URL}${canonicalPath}${current.search && canonicalPath === '/search.html' ? current.search : ''}`;

  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', canonicalUrl);

  ensureMeta('property', 'og:title', title);
  ensureMeta('property', 'og:description', description);
  ensureMeta('property', 'og:type', 'website');
  ensureMeta('property', 'og:url', canonicalUrl);
  ensureMeta('property', 'og:image', document.querySelector('meta[property="og:image"]')?.content || DEFAULT_IMAGE);

  ensureMeta('name', 'twitter:card', 'summary_large_image');
  ensureMeta('name', 'twitter:title', title);
  ensureMeta('name', 'twitter:description', description);
  ensureMeta('name', 'twitter:image', document.querySelector('meta[name="twitter:image"]')?.content || DEFAULT_IMAGE);

  const noIndexPages = new Set(['/search.html', '/favorites.html']);
  const robots = noIndexPages.has(current.pathname) ? 'noindex, follow' : 'index, follow, max-image-preview:large';
  ensureMeta('name', 'robots', robots);
})();
