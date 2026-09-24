import { hasRichTextContent, readableRichText } from '@/lib/rich-text-content';

const serialized = JSON.stringify({
  root: {
    children: [
      { children: [{ text: 'Plan the work', type: 'text' }], type: 'paragraph' },
      { children: [{ text: 'Write the update', type: 'text' }], type: 'paragraph' },
    ],
    type: 'root',
  },
});

describe('workspace rich-text compatibility', () => {
  it('renders legacy Lexical content as readable text', () => {
    expect(readableRichText(serialized)).toBe('Plan the work\nWrite the update');
  });

  it('preserves plaintext and rejects an empty serialized editor state', () => {
    expect(readableRichText('Plain progress')).toBe('Plain progress');
    expect(hasRichTextContent('Plain progress')).toBe(true);
    expect(hasRichTextContent(JSON.stringify({ root: { children: [], type: 'root' } }))).toBe(false);
  });

  it('does not mistake arbitrary JSON for an editor document', () => {
    expect(readableRichText('{"note":"keep this literal"}')).toBe('{"note":"keep this literal"}');
  });
});
