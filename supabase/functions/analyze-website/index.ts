const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface Finding {
  title: string;
  description: string;
  severity: 'pass' | 'warning' | 'error';
  category: string;
  recommendation?: string;
}

interface CategoryScore {
  name: string;
  score: number;
  description: string;
}

function analyzeHtml(html: string, url: string) {
  const findings: Finding[] = [];
  const lowerHtml = html.toLowerCase();

  // --- SEO Checks ---
  // Title tag
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/is);
  if (titleMatch && titleMatch[1].trim()) {
    const titleLen = titleMatch[1].trim().length;
    if (titleLen < 30) {
      findings.push({ title: 'Title tag too short', description: `Title is ${titleLen} characters. Recommended: 30-60.`, severity: 'warning', category: 'SEO', recommendation: 'Write a descriptive title between 30-60 characters.' });
    } else if (titleLen > 60) {
      findings.push({ title: 'Title tag too long', description: `Title is ${titleLen} characters. May be truncated in search results.`, severity: 'warning', category: 'SEO', recommendation: 'Keep title under 60 characters.' });
    } else {
      findings.push({ title: 'Title tag present', description: `Title: "${titleMatch[1].trim()}"`, severity: 'pass', category: 'SEO' });
    }
  } else {
    findings.push({ title: 'Missing title tag', description: 'No <title> tag found.', severity: 'error', category: 'SEO', recommendation: 'Add a descriptive <title> tag.' });
  }

  // Meta description
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/is);
  if (descMatch && descMatch[1].trim()) {
    const descLen = descMatch[1].trim().length;
    if (descLen < 70) {
      findings.push({ title: 'Meta description too short', description: `Description is ${descLen} characters.`, severity: 'warning', category: 'SEO', recommendation: 'Write a meta description between 70-160 characters.' });
    } else if (descLen > 160) {
      findings.push({ title: 'Meta description too long', description: `Description is ${descLen} characters.`, severity: 'warning', category: 'SEO', recommendation: 'Keep description under 160 characters.' });
    } else {
      findings.push({ title: 'Meta description present', description: 'Well-formatted meta description found.', severity: 'pass', category: 'SEO' });
    }
  } else {
    findings.push({ title: 'Missing meta description', description: 'No meta description found.', severity: 'error', category: 'SEO', recommendation: 'Add a meta description for better search results.' });
  }

  // Viewport meta
  if (lowerHtml.includes('name="viewport"') || lowerHtml.includes("name='viewport'")) {
    findings.push({ title: 'Viewport meta tag present', description: 'Page is configured for responsive display.', severity: 'pass', category: 'Performance' });
  } else {
    findings.push({ title: 'Missing viewport meta tag', description: 'No viewport meta tag found.', severity: 'error', category: 'Performance', recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.' });
  }

  // OG tags
  const hasOgTitle = lowerHtml.includes('property="og:title"') || lowerHtml.includes("property='og:title'");
  const hasOgDesc = lowerHtml.includes('property="og:description"') || lowerHtml.includes("property='og:description'");
  const hasOgImage = lowerHtml.includes('property="og:image"') || lowerHtml.includes("property='og:image'");
  if (hasOgTitle && hasOgDesc && hasOgImage) {
    findings.push({ title: 'Open Graph tags present', description: 'OG title, description, and image found.', severity: 'pass', category: 'SEO' });
  } else {
    const missing = [];
    if (!hasOgTitle) missing.push('og:title');
    if (!hasOgDesc) missing.push('og:description');
    if (!hasOgImage) missing.push('og:image');
    findings.push({ title: 'Missing Open Graph tags', description: `Missing: ${missing.join(', ')}`, severity: 'warning', category: 'SEO', recommendation: 'Add Open Graph tags for better social sharing.' });
  }

  // Heading hierarchy
  const h1Matches = html.match(/<h1[\s>]/gi) || [];
  if (h1Matches.length === 0) {
    findings.push({ title: 'Missing H1 tag', description: 'No H1 heading found.', severity: 'error', category: 'SEO', recommendation: 'Add exactly one H1 tag per page.' });
  } else if (h1Matches.length > 1) {
    findings.push({ title: 'Multiple H1 tags', description: `Found ${h1Matches.length} H1 tags.`, severity: 'warning', category: 'SEO', recommendation: 'Use only one H1 tag per page.' });
  } else {
    findings.push({ title: 'Single H1 tag', description: 'Proper heading hierarchy.', severity: 'pass', category: 'SEO' });
  }

  // --- Accessibility ---
  // Images without alt
  const imgTags = html.match(/<img[^>]*>/gi) || [];
  const imgsWithoutAlt = imgTags.filter(img => !img.includes('alt='));
  if (imgTags.length > 0) {
    if (imgsWithoutAlt.length === 0) {
      findings.push({ title: 'All images have alt text', description: `${imgTags.length} images checked.`, severity: 'pass', category: 'Accessibility' });
    } else {
      findings.push({ title: 'Images missing alt text', description: `${imgsWithoutAlt.length} of ${imgTags.length} images lack alt attributes.`, severity: 'error', category: 'Accessibility', recommendation: 'Add descriptive alt text to all images.' });
    }
  }

  // --- Performance ---
  // Large inline styles
  const styleBlocks = html.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || [];
  if (styleBlocks.length > 5) {
    findings.push({ title: 'Many inline style blocks', description: `Found ${styleBlocks.length} <style> blocks.`, severity: 'warning', category: 'Performance', recommendation: 'Consider consolidating CSS into external stylesheets.' });
  }

  // Script tags
  const scriptTags = html.match(/<script[^>]*src/gi) || [];
  if (scriptTags.length > 15) {
    findings.push({ title: 'Many external scripts', description: `Found ${scriptTags.length} external scripts.`, severity: 'warning', category: 'Performance', recommendation: 'Reduce the number of scripts or use lazy loading.' });
  } else if (scriptTags.length > 0) {
    findings.push({ title: 'Scripts loaded', description: `${scriptTags.length} external scripts found.`, severity: 'pass', category: 'Performance' });
  }

  // Charset
  if (lowerHtml.includes('charset=')) {
    findings.push({ title: 'Character encoding declared', description: 'Charset meta tag found.', severity: 'pass', category: 'Best Practices' });
  } else {
    findings.push({ title: 'Missing charset declaration', description: 'No charset meta tag.', severity: 'warning', category: 'Best Practices', recommendation: 'Add <meta charset="utf-8">.' });
  }

  // HTTPS
  if (url.startsWith('https://')) {
    findings.push({ title: 'HTTPS enabled', description: 'Site uses secure connection.', severity: 'pass', category: 'Security' });
  } else {
    findings.push({ title: 'Not using HTTPS', description: 'Site is served over HTTP.', severity: 'error', category: 'Security', recommendation: 'Enable HTTPS for security and SEO benefits.' });
  }

  // Lang attribute
  if (lowerHtml.includes('<html') && (lowerHtml.includes('lang="') || lowerHtml.includes("lang='"))) {
    findings.push({ title: 'Language attribute set', description: 'HTML lang attribute found.', severity: 'pass', category: 'Accessibility' });
  } else {
    findings.push({ title: 'Missing language attribute', description: 'No lang attribute on <html>.', severity: 'warning', category: 'Accessibility', recommendation: 'Add lang attribute to <html> tag.' });
  }

  // Calculate scores
  const categoryMap: Record<string, { pass: number; total: number }> = {};
  for (const f of findings) {
    if (!categoryMap[f.category]) categoryMap[f.category] = { pass: 0, total: 0 };
    categoryMap[f.category].total++;
    if (f.severity === 'pass') categoryMap[f.category].pass++;
  }

  const categoryDescriptions: Record<string, string> = {
    'SEO': 'Search engine optimization',
    'Performance': 'Page load and rendering',
    'Accessibility': 'Usability for all users',
    'Security': 'Security best practices',
    'Best Practices': 'Web development standards',
  };

  const categories: CategoryScore[] = Object.entries(categoryMap).map(([name, { pass, total }]) => ({
    name,
    score: Math.round((pass / total) * 100),
    description: categoryDescriptions[name] || name,
  }));

  const overallScore = Math.round(categories.reduce((sum, c) => sum + c.score, 0) / (categories.length || 1));

  return { overallScore, categories, findings };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, scrapeData } = await req.json();

    if (!url || !scrapeData) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL and scrapeData are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = scrapeData.data?.html || scrapeData.html || '';
    const result = analyzeHtml(html, url);

    console.log(`Analysis complete for ${url}: score ${result.overallScore}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Analysis error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
