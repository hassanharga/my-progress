import { type FC } from 'react';

interface InlineHTMLProps {
  html: string;
}

const InlineHTML: FC<InlineHTMLProps> = ({ html }) => {
  return <div className="ql-content" dangerouslySetInnerHTML={{ __html: html }} />;
};

export default InlineHTML;
