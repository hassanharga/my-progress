type SerializedNode = { children?: SerializedNode[]; root?: SerializedNode; text?: string; type?: string };

const isNode = (value: unknown): value is SerializedNode =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const nodeText = (node: SerializedNode): string => {
  if (typeof node.text === 'string') return node.text;
  if (!Array.isArray(node.children)) return '';

  const separator = node.type === 'root' || node.type === 'list' ? '\n' : '';
  return node.children.filter(isNode).map(nodeText).join(separator);
};

/** Existing tasks may contain either plaintext or serialized Lexical documents. */
export const readableRichText = (value: string | null | undefined): string => {
  if (!value) return '';
  try {
    const parsed: unknown = JSON.parse(value);
    if (isNode(parsed) && isNode(parsed.root) && parsed.root.type === 'root') {
      return nodeText(parsed.root).trim();
    }
  } catch {
    // Plaintext remains a supported stored format.
  }
  return value;
};

export const hasRichTextContent = (value: string | null | undefined): boolean =>
  Boolean(readableRichText(value).trim());
