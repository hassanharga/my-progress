import { TODAY_PRESENTATION } from '@/app/dashboard/today-presentation';

describe('Today presentation', () => {
  it('describes the private cross-project Today cockpit without making it indexable', () => {
    expect(TODAY_PRESENTATION).toEqual({
      title: 'Today',
      description: "Plan and perform today's work across your projects.",
      robots: { index: false, follow: false },
    });
  });
});
