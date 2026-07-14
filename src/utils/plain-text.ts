type LexicalNode = {
  text?: string;
  type?: string;
  children?: LexicalNode[];
};

type LexicalRoot = {
  root: {
    children: LexicalNode[];
  };
};

/**
 * Extracts plain text from a Lexical serialized editor state JSON string.
 * Walks the node tree and concatenates all text nodes, joining
 * block-level children (paragraphs, list items) with newlines.
 * Returns empty string for null/undefined/empty input.
 */
export const lexicalToPlainText = (serializedState: string | null | undefined): string => {
  if (!serializedState) return '';

  let parsed: LexicalRoot;
  try {
    parsed = JSON.parse(serializedState) as LexicalRoot;
  } catch {
    return serializedState;
  }

  if (!parsed?.root?.children) return '';

  const extractFromNode = (node: LexicalNode): string => {
    if (node.text != null) return node.text;
    if (node.children) return node.children.map(extractFromNode).join('');
    return '';
  };

  return parsed.root.children
    .map(extractFromNode)
    .join('\n')
    .trim();
};
