const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Running PageSpeed Insights for:', formattedUrl);

    const apiKey = Deno.env.get('GOOGLE_PAGESPEED_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Google PageSpeed API key is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const baseUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed`;
    const params = `url=${encodeURIComponent(formattedUrl)}&category=performance&category=seo&category=accessibility&category=best-practices&key=${apiKey}`;

    // Fetch both mobile and desktop strategies in parallel
    const [mobileRes, desktopRes] = await Promise.all([
      fetch(`${baseUrl}?${params}&strategy=mobile`),
      fetch(`${baseUrl}?${params}&strategy=desktop`),
    ]);

    if (!mobileRes.ok) {
      const errText = await mobileRes.text();
      console.error('PageSpeed API error:', errText);
      return new Response(
        JSON.stringify({ success: false, error: `PageSpeed API error: ${mobileRes.status}` }),
        { status: mobileRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mobileData = await mobileRes.json();
    const desktopData = await desktopRes.json();

    // Extract scores (0-1 range -> 0-100)
    const mobileCategories = mobileData.lighthouseResult?.categories || {};
    const desktopCategories = desktopData.lighthouseResult?.categories || {};

    // Extract Core Web Vitals from mobile (primary)
    const audits = mobileData.lighthouseResult?.audits || {};

    const coreWebVitals = {
      lcp: {
        value: audits['largest-contentful-paint']?.numericValue || 0,
        displayValue: audits['largest-contentful-paint']?.displayValue || 'N/A',
        score: audits['largest-contentful-paint']?.score || 0,
        title: 'Largest Contentful Paint',
      },
      fid: {
        value: audits['max-potential-fid']?.numericValue || 0,
        displayValue: audits['max-potential-fid']?.displayValue || 'N/A',
        score: audits['max-potential-fid']?.score || 0,
        title: 'Max Potential FID',
      },
      cls: {
        value: audits['cumulative-layout-shift']?.numericValue || 0,
        displayValue: audits['cumulative-layout-shift']?.displayValue || 'N/A',
        score: audits['cumulative-layout-shift']?.score || 0,
        title: 'Cumulative Layout Shift',
      },
      fcp: {
        value: audits['first-contentful-paint']?.numericValue || 0,
        displayValue: audits['first-contentful-paint']?.displayValue || 'N/A',
        score: audits['first-contentful-paint']?.score || 0,
        title: 'First Contentful Paint',
      },
      tbt: {
        value: audits['total-blocking-time']?.numericValue || 0,
        displayValue: audits['total-blocking-time']?.displayValue || 'N/A',
        score: audits['total-blocking-time']?.score || 0,
        title: 'Total Blocking Time',
      },
      si: {
        value: audits['speed-index']?.numericValue || 0,
        displayValue: audits['speed-index']?.displayValue || 'N/A',
        score: audits['speed-index']?.score || 0,
        title: 'Speed Index',
      },
    };

    // Page load time
    const loadTime = audits['interactive']?.numericValue || 0;
    const loadTimeDisplay = audits['interactive']?.displayValue || 'N/A';

    // Gather top opportunities
    const opportunities = Object.values(audits)
      .filter((a: any) => a.details?.type === 'opportunity' && a.score !== null && a.score < 1)
      .map((a: any) => ({
        title: a.title,
        description: a.description,
        savings: a.details?.overallSavingsMs ? `${Math.round(a.details.overallSavingsMs)} ms` : undefined,
      }))
      .slice(0, 8);

    // Gather diagnostics
    const diagnostics = Object.values(audits)
      .filter((a: any) => a.details?.type === 'table' && a.score !== null && a.score < 1 && !a.details?.overallSavingsMs)
      .map((a: any) => ({
        title: a.title,
        description: a.description,
        displayValue: a.displayValue,
      }))
      .slice(0, 6);

    const result = {
      success: true,
      url: formattedUrl,
      fetchedAt: new Date().toISOString(),
      mobile: {
        performance: Math.round((mobileCategories.performance?.score || 0) * 100),
        seo: Math.round((mobileCategories.seo?.score || 0) * 100),
        accessibility: Math.round((mobileCategories.accessibility?.score || 0) * 100),
        bestPractices: Math.round((mobileCategories['best-practices']?.score || 0) * 100),
      },
      desktop: {
        performance: Math.round((desktopCategories.performance?.score || 0) * 100),
        seo: Math.round((desktopCategories.seo?.score || 0) * 100),
        accessibility: Math.round((desktopCategories.accessibility?.score || 0) * 100),
        bestPractices: Math.round((desktopCategories['best-practices']?.score || 0) * 100),
      },
      coreWebVitals,
      loadTime: { value: loadTime, displayValue: loadTimeDisplay },
      opportunities,
      diagnostics,
    };

    // Calculate overall score (weighted avg of mobile scores)
    const overallScore = Math.round(
      result.mobile.performance * 0.35 +
      result.mobile.seo * 0.25 +
      result.mobile.accessibility * 0.25 +
      result.mobile.bestPractices * 0.15
    );

    console.log(`PageSpeed analysis complete: overall ${overallScore}`);

    return new Response(
      JSON.stringify({ ...result, overallScore }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('PageSpeed error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
