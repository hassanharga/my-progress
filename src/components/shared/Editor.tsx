import { useRef, useState, type FC } from 'react';
import ReactQuill from 'react-quill';

import 'react-quill/dist/quill.snow.css';

type Props = {
  onChange: (value: string) => void;
};

const Editor: FC<Props> = ({ onChange }) => {
  const [content, setContent] = useState('');

  const editorRef = useRef<ReactQuill | null>(null);

  const onChangeContent = (value: string): void => {
    setContent(value);
    onChange(value);
  };

  return <ReactQuill ref={editorRef} value={content || ''} onChange={onChangeContent} style={{ height: '150px' }} />;
};

export default Editor;
