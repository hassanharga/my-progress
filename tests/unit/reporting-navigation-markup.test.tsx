import { renderToStaticMarkup } from 'react-dom/server';

import ApplicationNavigation from '@/components/dashboard/ApplicationNavigation';

describe('reporting navigation markup', () => {
  it.each(['wide', 'medium', 'narrow'] as const)('shows Insights in %s navigation', (placement) => {
    const html = renderToStaticMarkup(<ApplicationNavigation pathname="/insights" placement={placement} />);
    expect(html).toContain('href="/insights"');
    expect(html.match(/<a\b[^>]*href="\/insights"[^>]*>/)?.[0]).toContain('aria-current="page"');
    expect(html.match(/<a\b[^>]*href="\/dashboard"[^>]*>/)?.[0]).not.toContain('aria-current="page"');
  });

  it('exposes Reports under mobile More with native keyboard and touch semantics', () => {
    const html = renderToStaticMarkup(<ApplicationNavigation pathname="/reports" placement="narrow" />);
    expect(html).toMatch(/<details\b/);
    expect(html).toMatch(/<summary\b[^>]*>.*More.*<\/summary>/);
    expect(html.match(/<a\b[^>]*href="\/reports"[^>]*>/)?.[0]).toContain('aria-current="page"');
    expect(html).toContain('data-current="true"');
    const settings = html.match(/<a\b[^>]*href="\/settings"[^>]*>/)?.[0];
    expect(settings).toBeDefined();
    expect(settings).not.toContain('aria-current="page"');
  });

  it('does not mark Insights current on the Reports route', () => {
    const html = renderToStaticMarkup(<ApplicationNavigation pathname="/reports" placement="wide" />);
    expect(html.match(/<a\b[^>]*href="\/insights"[^>]*>/)?.[0]).not.toContain('aria-current="page"');
  });

  it('keeps Reports inside More and inactive away from Reports', () => {
    const html = renderToStaticMarkup(<ApplicationNavigation pathname="/dashboard" placement="narrow" />);
    expect(html).toContain('href="/reports"');
    expect(html.match(/<a\b[^>]*href="\/reports"[^>]*>/)?.[0]).not.toContain('aria-current="page"');
    expect(html).not.toMatch(/<summary\b[^>]*data-current="true"/);
  });
});
