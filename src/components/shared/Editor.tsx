import { useState, type FC } from 'react';
import { SerializedEditorState, SerializedLexicalNode } from 'lexical';

import { Editor as ShadCNEditor } from '@/components/blocks/editor-00/editor';

type Props = {
  onChange?: (value: string) => void;
  defaultValue?: string;
  disabled?: boolean;
};

const initialValue = {
  root: {
    children: [
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: '',
            type: 'text',
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1,
      },
    ],
    direction: 'ltr',
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
} as unknown as SerializedEditorState;

const Editor: FC<Props> = ({ onChange, defaultValue, disabled }) => {
  const [editorState, setEditorState] = useState<SerializedEditorState>(
    defaultValue ? JSON.parse(defaultValue) : initialValue
  );

  const onChangeContent = (value: SerializedEditorState<SerializedLexicalNode>): void => {
    setEditorState(value);

    const stringifiedJSON = JSON.stringify(value);
    onChange?.(stringifiedJSON);
  };

  return (
    <div className="flex">
      <ShadCNEditor editorSerializedState={editorState} onSerializedChange={onChangeContent} disabled={disabled} />
    </div>
  );
};

export default Editor;
