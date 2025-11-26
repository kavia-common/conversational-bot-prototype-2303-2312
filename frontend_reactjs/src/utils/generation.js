const THEME = {
  primary: '#2563EB', // blue
  secondary: '#F59E0B', // amber
  error: '#EF4444',
  background: '#f9fafb',
  surface: '#ffffff',
  text: '#111827',
  subtle: '#6b7280',
  border: 'rgba(17, 24, 39, 0.08)',
  gradient: 'linear-gradient(180deg, rgba(37, 99, 235, 0.06), rgba(249, 250, 251, 0))'
};

/**
 * PUBLIC_INTERFACE
 * generateSiteFromPrompt builds a complete standalone HTML document string
 * based on the provided prompt. It intentionally avoids including React,
 * bundler artifacts, <script> tags, or any <iframe> elements.
 */
export function generateSiteFromPrompt(prompt, options = {}) {
  /** This is a public function to generate a prototype HTML page string from a user prompt on the client. It must not include iframes or app bundles. */
  const p = (prompt || '').toLowerCase();

  // Detect layout hints
  const wantsDark = p.includes('dark');
  const wantsLanding = p.includes('landing') || p.includes('homepage') || p.includes('home');
  const wantsPortfolio = p.includes('portfolio') || p.includes('work') || p.includes('projects');
  const wantsSaaS = p.includes('saas') || p.includes('dashboard') || p.includes('product');
  const wantsBlog = p.includes('blog') || p.includes('article') || p.includes('news');
  const wantsContact = p.includes('contact');

  const accent = THEME.secondary;
  const primary = THEME.primary;

  // Title extraction heuristic
  let extracted = 'Your Prototype';
  const fromFor = p.match(/for (.+?)(\.|,|$)/);
  if (fromFor && fromFor[1]) {
    extracted = fromFor[1].trim();
  } else {
    const firstPiece = p.split(/[.|,|-]/)[0];
    if (firstPiece && firstPiece.trim()) {
      extracted = firstPiece.trim();
    }
  }
  const title = options.title || extracted;

  // Sections
  const sections = [];
  if (wantsLanding || wantsSaaS) sections.push('features', 'cta');
  if (wantsPortfolio) sections.push('projects');
  if (wantsBlog) sections.push('articles');
  if (wantsContact) sections.push('contact');
  if (sections.length === 0) sections.push('features', 'cta');

  const heroSubtitle = wantsSaaS
    ? 'Ship modern experiences with speed and confidence.'
    : wantsPortfolio
    ? 'Showcase of selected works and experiments.'
    : wantsBlog
    ? 'Insights, tutorials, and updates.'
    : 'Turn ideas into interactive prototypes.';

  // Minimal CSS following Ocean Professional
  const baseCss = `
    :root {
      --primary: ${primary};
      --secondary: ${accent};
      --text: ${THEME.text};
      --muted: ${THEME.subtle};
      --bg: ${THEME.background};
      --surface: ${THEME.surface};
      --ring: rgba(37, 99, 235, 0.35);
      --border: ${THEME.border};
    }
    * { box-sizing: border-box; }
    html, body { padding: 0; margin: 0; }
    body {
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, Apple Color Emoji, Segoe UI Emoji;
      color: var(--text);
      background: ${wantsDark ? '#0b1220' : 'var(--bg)'};
      line-height: 1.6;
    }
    a { color: var(--primary); text-decoration: none; }
    .container { width: min(1100px, 92vw); margin: 0 auto; }
    .navbar {
      position: sticky; top: 0; z-index: 20;
      background: ${wantsDark ? '#0e1628' : 'rgba(255,255,255,0.86)'};
      backdrop-filter: saturate(180%) blur(10px);
      border-bottom: 1px solid var(--border);
    }
    .navbar-inner {
      display: flex; align-items: center; justify-content: space-between;
      height: 64px;
    }
    .brand {
      display: flex; align-items: center; gap: 10px; font-weight: 700; letter-spacing: 0.2px;
      color: ${wantsDark ? '#e5e7eb' : 'var(--text)'};
    }
    .brand-dot {
      width: 10px; height: 10px; border-radius: 50%;
      background: radial-gradient(circle at 30% 30%, var(--secondary), var(--primary));
      box-shadow: 0 0 0 3px rgba(37,99,235,0.12), 0 6px 20px rgba(37,99,235,0.35);
    }
    .nav-actions a {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 8px 12px; border-radius: 10px; border: 1px solid var(--border);
      background: ${wantsDark ? '#0b1220' : 'var(--surface)'};
      color: inherit; font-weight: 600;
      transition: transform .15s ease, box-shadow .2s ease, border-color .2s ease;
    }
    .nav-actions a:hover { transform: translateY(-1px); border-color: rgba(37,99,235,0.35); box-shadow: 0 8px 24px rgba(37,99,235,0.15); }

    .hero {
      background: ${wantsDark ? 'linear-gradient(180deg, rgba(37,99,235,0.1), rgba(17,24,39,0))' : THEME.gradient};
      padding: 72px 0 40px;
      border-bottom: 1px solid var(--border);
    }
    .hero h1 {
      font-size: clamp(28px, 4vw, 46px);
      line-height: 1.1;
      margin: 0 0 10px 0;
      letter-spacing: -0.02em;
    }
    .hero p {
      margin: 8px 0 22px 0; color: var(--muted); font-size: clamp(14px, 2vw, 18px);
    }
    .cta-group { display: flex; gap: 12px; flex-wrap: wrap; }
    .btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      padding: 10px 14px; border: none; border-radius: 12px; font-weight: 700; cursor: pointer;
      transition: transform .15s ease, box-shadow .2s ease, background .2s ease, color .2s ease;
    }
    .btn-primary {
      background: linear-gradient(180deg, var(--primary), #1e4fbf);
      color: white; box-shadow: 0 8px 24px rgba(37,99,235,0.35);
    }
    .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 12px 28px rgba(37,99,235,0.45); }
    .btn-secondary {
      background: ${wantsDark ? '#0b1220' : 'var(--surface)'}; color: var(--text); border: 1px solid var(--border);
    }
    .section { padding: 42px 0; }
    .section h2 { font-size: 22px; margin: 0 0 16px 0; }
    .grid {
      display: grid; gap: 16px;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }
    .card {
      background: ${wantsDark ? '#0e1628' : 'var(--surface)'};
      border: 1px solid var(--border);
      border-radius: 14px; padding: 16px;
      transition: transform .15s ease, box-shadow .2s ease, border-color .2s ease;
      box-shadow: 0 6px 20px rgba(17,24,39,0.05);
    }
    .card:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(17,24,39,0.08); border-color: rgba(37,99,235,0.25); }
    .footer { padding: 30px 0 50px; color: var(--muted); font-size: 14px; }
  `;

  // Feature cards content
  const features = [
    { title: 'Fast Setup', desc: 'Get started in seconds with a clean foundation.' },
    { title: 'Ocean Aesthetic', desc: 'Blue accents with warm amber highlights.' },
    { title: 'Responsive', desc: 'Layouts adapt gracefully across screen sizes.' },
    { title: 'Accessible', desc: 'Semantics and contrast considered from start.' }
  ];

  const projects = [
    { title: 'Aurora UI', desc: 'Component sketches for a design system.' },
    { title: 'Pulse Analytics', desc: 'Minimal analytics landing concept.' },
    { title: 'Wave CMS', desc: 'Lightweight content hub prototype.' }
  ];

  const articles = [
    { title: 'Designing with Restraint', desc: 'Why less truly is more in early prototypes.' },
    { title: 'Color Systems', desc: 'Picking palettes that scale with your product.' },
    { title: 'Speed to Value', desc: 'Prioritizing flows that deliver immediate impact.' }
  ];

  const sectionHtml = {
    features: `
      <section class="section container" aria-labelledby="features-title">
        <h2 id="features-title">Features</h2>
        <div class="grid">
          ${features
            .map(
              (f) => `
            <article class="card" role="article">
              <h3>${f.title}</h3>
              <p>${f.desc}</p>
            </article>`
            )
            .join('')}
        </div>
      </section>
    `,
    projects: `
      <section class="section container" aria-labelledby="projects-title">
        <h2 id="projects-title">Selected Projects</h2>
        <div class="grid">
          ${projects
            .map(
              (p) => `
            <article class="card" role="article">
              <h3>${p.title}</h3>
              <p>${p.desc}</p>
            </article>`
            )
            .join('')}
        </div>
      </section>
    `,
    articles: `
      <section class="section container" aria-labelledby="articles-title">
        <h2 id="articles-title">Recent Articles</h2>
        <div class="grid">
          ${articles
            .map(
              (a) => `
            <article class="card" role="article">
              <h3>${a.title}</h3>
              <p>${a.desc}</p>
            </article>`
            )
            .join('')}
        </div>
      </section>
    `,
    cta: `
      <section class="section container" aria-labelledby="cta-title">
        <h2 id="cta-title">Ready to explore?</h2>
        <p style="color: var(--muted); margin-bottom: 16px;">Start shaping your idea with a live prototype.</p>
        <div class="cta-group">
          <a class="btn btn-primary" href="#" role="button" aria-label="Get Started">Get Started</a>
          <a class="btn btn-secondary" href="#" role="button" aria-label="Learn More">Learn More</a>
        </div>
      </section>
    `,
    contact: `
      <section class="section container" aria-labelledby="contact-title">
        <h2 id="contact-title">Contact</h2>
        <p style="color: var(--muted); margin-bottom: 16px;">We'd love to hear from you. Reach out and let's build.</p>
        <div class="card">
          <form onsubmit="event.preventDefault(); alert('This is a static prototype.');" aria-label="Contact form">
            <div style="display:grid; gap: 10px;">
              <label>
                Name
                <input style="width:100%; padding:10px; border-radius:10px; border:1px solid var(--border);" placeholder="Your name" />
              </label>
              <label>
                Email
                <input type="email" style="width:100%; padding:10px; border-radius:10px; border:1px solid var(--border);" placeholder="you@example.com" />
              </label>
              <label>
                Message
                <textarea rows="4" style="width:100%; padding:10px; border-radius:10px; border:1px solid var(--border);" placeholder="Tell us about your idea"></textarea>
              </label>
              <button class="btn btn-primary" type="submit">Send</button>
            </div>
          </form>
        </div>
      </section>
    `
  };

  const selectedSections = sections.map((s) => sectionHtml[s]).join('\n');

  const html = `
<!doctype html>
<html lang="en">
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${title}</title>
<style>${baseCss}</style>
<body>
  <nav class="navbar" aria-label="Primary">
    <div class="container navbar-inner">
      <div class="brand"><span class="brand-dot" aria-hidden="true"></span>${title}</div>
      <div class="nav-actions" role="navigation" aria-label="Navbar actions">
        <a href="#">Docs</a>
        <a href="#">Contact</a>
      </div>
    </div>
  </nav>

  <header class="hero">
    <div class="container">
      <h1>${title}</h1>
      <p>${heroSubtitle}</p>
      <div class="cta-group">
        <a class="btn btn-primary" href="#" aria-label="Primary Call To Action">Start now</a>
        <a class="btn btn-secondary" href="#" aria-label="Secondary Call To Action">Learn More</a>
      </div>
    </div>
  </header>

  <main>
    ${selectedSections}
  </main>

  <footer class="footer container">
    © ${new Date().getFullYear()} Prototype. Built with Ocean Professional style.
  </footer>
</body>
</html>
  `;
  return html;
}

/**
 * PUBLIC_INTERFACE
 * sanitizeGeneratedHtml removes scripts, iframes, inline event handlers, certain link rels,
 * and defensive toolbar placeholders to ensure safe rendering in Preview via srcDoc.
 */
export function sanitizeGeneratedHtml(html) {
  /** Public function: sanitize generated HTML to ensure safe preview. */
  if (!html || typeof html !== 'string') return '';
  let out = html;
  out = out.replace(/<script[\s\S]*?<\/script>/gi, '');
  out = out.replace(/<script[^>]*\/>/gi, '');
  out = out.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');
  out = out.replace(/<iframe[^>]*\/>/gi, '');
  out = out.replace(/\son\w+="[^"]*"/gi, '').replace(/\son\w+='[^']*'/gi, '');
  out = out.replace(/id\s*=\s*["']root["']/gi, 'id="preview-root"');
  out = out.replace(/<link[^>]+rel=["']?(?:preload|modulepreload|stylesheet|prefetch|preconnect)["']?[^>]*>/gi, '');
  out = out.replace(/<[^>]+(?:data-app-ui|data-preview-toolbar|class=["'][^"']*(?:app-toolbar|preview-toolbar|app-placeholder)[^"']*["'])[^>]*>[\s\S]*?<\/[^>]+>/gi, '');
  return out.trim();
}
