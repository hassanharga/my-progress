import { useState } from 'react';
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { ClickableLinkPlugin } from '@lexical/react/LexicalClickableLinkPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';

import { ContentEditable } from '@/components/editor/editor-ui/content-editable';
import { AutoLinkPlugin } from '@/components/editor/plugins/auto-link-plugin';
import { FloatingLinkEditorPlugin } from '@/components/editor/plugins/floating-link-editor-plugin';
import { LinkPlugin } from '@/components/editor/plugins/link-plugin';
import { BlockFormatDropDown } from '@/components/editor/plugins/toolbar/block-format-toolbar-plugin';
import { FormatBulletedList } from '@/components/editor/plugins/toolbar/block-format/format-bulleted-list';
import { FormatCheckList } from '@/components/editor/plugins/toolbar/block-format/format-check-list';
import { FormatHeading } from '@/components/editor/plugins/toolbar/block-format/format-heading';
import { FormatNumberedList } from '@/components/editor/plugins/toolbar/block-format/format-numbered-list';
import { FormatParagraph } from '@/components/editor/plugins/toolbar/block-format/format-paragraph';
import { FormatQuote } from '@/components/editor/plugins/toolbar/block-format/format-quote';
import { ClearFormattingToolbarPlugin } from '@/components/editor/plugins/toolbar/clear-formatting-toolbar-plugin';
import { ElementFormatToolbarPlugin } from '@/components/editor/plugins/toolbar/element-format-toolbar-plugin';
import { FontBackgroundToolbarPlugin } from '@/components/editor/plugins/toolbar/font-background-toolbar-plugin';
import { FontColorToolbarPlugin } from '@/components/editor/plugins/toolbar/font-color-toolbar-plugin';
import { FontFamilyToolbarPlugin } from '@/components/editor/plugins/toolbar/font-family-toolbar-plugin';
import { FontFormatToolbarPlugin } from '@/components/editor/plugins/toolbar/font-format-toolbar-plugin';
import { FontSizeToolbarPlugin } from '@/components/editor/plugins/toolbar/font-size-toolbar-plugin';
import { HistoryToolbarPlugin } from '@/components/editor/plugins/toolbar/history-toolbar-plugin';
import { LinkToolbarPlugin } from '@/components/editor/plugins/toolbar/link-toolbar-plugin';
import { SubSuperToolbarPlugin } from '@/components/editor/plugins/toolbar/subsuper-toolbar-plugin';
import { ToolbarPlugin } from '@/components/editor/plugins/toolbar/toolbar-plugin';

const placeholder = 'Start typing...';

export function Plugins({ disabled }: { disabled?: boolean }) {
  const [floatingAnchorElem, setFloatingAnchorElem] = useState<HTMLDivElement | null>(null);
  const [isLinkEditMode, setIsLinkEditMode] = useState<boolean>(false);

  const onRef = (_floatingAnchorElem: HTMLDivElement) => {
    if (_floatingAnchorElem !== null) {
      setFloatingAnchorElem(_floatingAnchorElem);
    }
  };

  return (
    <div className="relative">
      {/* toolbar plugins */}
      {disabled ? null : (
        <ToolbarPlugin>
          {() => (
            <div className="vertical-align-middle sticky top-0 z-10 flex gap-2 overflow-auto border-b p-1">
              <BlockFormatDropDown>
                <FormatParagraph />
                <FormatHeading levels={['h1', 'h2', 'h3']} />
                <FormatNumberedList />
                <FormatBulletedList />
                <FormatCheckList />
                <FormatQuote />
              </BlockFormatDropDown>
              <ClearFormattingToolbarPlugin />
              <ElementFormatToolbarPlugin />
              <FontColorToolbarPlugin />
              <FontBackgroundToolbarPlugin />
              <FontFamilyToolbarPlugin />
              <FontFormatToolbarPlugin />
              <FontSizeToolbarPlugin />
              <HistoryToolbarPlugin />
              <LinkToolbarPlugin setIsLinkEditMode={setIsLinkEditMode} />
              <SubSuperToolbarPlugin />
            </div>
          )}
        </ToolbarPlugin>
      )}

      <div className="relative">
        <RichTextPlugin
          contentEditable={
            <div className="">
              <div className="" ref={onRef}>
                <ContentEditable
                  placeholder={placeholder}
                  className={`ContentEditable__root relative block h-72 min-h-72 min-h-full overflow-auto px-8 py-4 focus:outline-none ${disabled ? 'read-only-display select-none!' : ''}`}
                />
              </div>
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <ListPlugin />
        <CheckListPlugin />
        <HistoryPlugin />
        <ClickableLinkPlugin />
        <AutoLinkPlugin />
        <LinkPlugin />

        <FloatingLinkEditorPlugin
          anchorElem={floatingAnchorElem}
          isLinkEditMode={isLinkEditMode}
          setIsLinkEditMode={setIsLinkEditMode}
        />
        {/* rest of the plugins */}
      </div>
    </div>
  );
}
