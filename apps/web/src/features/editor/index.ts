// Configuration
export { editorPlugins, initialEditorValue } from './lib/plate-config';

// Plugins
export { SpoilerPlugin, SpoilerMark } from './plugins/spoiler-plugin';
export { PrivateBlockPlugin, PrivateMarkPlugin, PrivateBlockElement, PrivateMark } from './plugins/private-plugin';
export { TemplateVariablePlugin } from './plugins/template-variable-plugin';

// Store
export { useEditorStore } from './store';

// Lib
export { stripPrivateContent } from './lib/stripPrivateContent';

// Hooks
export { useAutoSave } from './hooks/useAutoSave';

// Element components
export {
  ParagraphElement,
  H1Element,
  H2Element,
  H3Element,
  BlockquoteElement,
  CodeBlockElement,
  CodeLineElement,
  BulletedListElement,
  NumberedListElement,
  ListItemElement,
  ToggleElement,
  CalloutElement,
  TableElement,
  TableRowElement,
  TableCellElement,
  TableHeaderCellElement,
  ImageElement,
  LinkElement,
  MentionElement,
  MentionInputElement,
  TemplateVariableElement,
} from './components/elements';

// Mark components
export {
  BoldMark,
  ItalicMark,
  UnderlineMark,
  StrikethroughMark,
  CodeMark,
} from './components/marks';

// Menu components
export { SlashMenu } from './components/SlashMenu';
export { MentionInput } from './components/MentionInput';

// Main editor component
export { Editor } from './components/Editor';
export { EditorModeContext } from './components/Editor';
export type { CollaborationOptions, EditorHandle } from './components/Editor';

// Types
export type {
  EditorContent,
  TextNode,
  BaseNode,
  ParagraphNode,
  HeadingNode,
  BlockquoteNode,
  CodeBlockNode,
  BulletedListNode,
  NumberedListNode,
  ListItemNode,
  ToggleNode,
  CalloutNode,
  TableNode,
  TableRowNode,
  TableCellNode,
  ImageNode,
  LinkNode,
  MentionNode,
  MentionInputNode,
  PrivateBlockNode,
  EditorNode,
  ElementProps,
  LeafProps,
} from './types';
