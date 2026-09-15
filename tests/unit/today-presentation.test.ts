import { TODAY_PRESENTATION } from '@/app/dashboard/today-presentation';

describe('Today presentation', () => {
  it('names the compatibility dashboard Today without making it indexable', () => {
    expect(TODAY_PRESENTATION).toEqual({
      title: 'Today',
      description: 'Plan and track work for your current project.',
      robots: { index: false, follow: false },
    });
  });
});
