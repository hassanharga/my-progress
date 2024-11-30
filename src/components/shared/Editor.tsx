import { useRef, useState, type FC } from 'react';
import ReactQuill from 'react-quill';

import 'react-quill/dist/quill.snow.css';

type Props = {
  onChange: (value: string) => void;
  defaultValue?: string;
};

const Editor: FC<Props> = ({ onChange, defaultValue }) => {
  const [content, setContent] = useState(defaultValue || '');

  const editorRef = useRef<ReactQuill | null>(null);

  const onChangeContent = (value: string): void => {
    setContent(value);
    onChange(value);
  };

  return <ReactQuill ref={editorRef} value={content || ''} onChange={onChangeContent} className="custom-quill" />;
};

export default Editor;
