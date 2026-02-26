import type { Value } from '@udecode/plate';

// Editor content type - Slate/Plate document format
export type EditorContent = Value;

// Text node with formatting marks
export interface TextNode {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  spoiler?: boolean;
  private?: boolean;
}

// Base element node type
export interface BaseNode {
  id?: string;
  type: string;
  children: (TextNode | BaseNode)[];
}

// Paragraph node
export interface ParagraphNode extends BaseNode {
  type: 'p';
}

// Heading node
export interface HeadingNode extends BaseNode {
  type: 'h1' | 'h2' | 'h3';
}

// Blockquote node
export interface BlockquoteNode extends BaseNode {
  type: 'blockquote';
}

// Code block node
export interface CodeBlockNode extends BaseNode {
  type: 'code_block';
  lang?: string;
}

// List nodes
export interface BulletedListNode extends BaseNode {
  type: 'ul';
}

export interface NumberedListNode extends BaseNode {
  type: 'ol';
}

export interface ListItemNode extends BaseNode {
  type: 'li';
}

// Toggle node
export interface ToggleNode extends BaseNode {
  type: 'toggle';
  open?: boolean;
}

// Callout node
export interface CalloutNode extends BaseNode {
  type: 'callout';
  variant?: 'info' | 'warning' | 'error' | 'success';
  icon?: string;
}

// Table nodes
export interface TableNode extends BaseNode {
  type: 'table';
  colSizes?: number[];
}

export interface TableRowNode extends BaseNode {
  type: 'tr';
}

export interface TableCellNode extends BaseNode {
  type: 'td' | 'th';
}

// Image node
export interface ImageNode extends BaseNode {
  type: 'img';
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}

// Link node
export interface LinkNode extends BaseNode {
  type: 'a';
  url: string;
}

// Mention node (for @object links)
export interface MentionNode extends BaseNode {
  type: 'mention';
  objectId: string;
  objectTitle: string;
}

// Mention input node (while typing @)
export interface MentionInputNode extends BaseNode {
  type: 'mention_input';
  trigger: string;
}

// Private block node (content only visible to owner)
export interface PrivateBlockNode extends BaseNode {
  type: 'private_block';
}

// Union of all node types
export type EditorNode =
  | ParagraphNode
  | HeadingNode
  | BlockquoteNode
  | CodeBlockNode
  | BulletedListNode
  | NumberedListNode
  | ListItemNode
  | ToggleNode
  | CalloutNode
  | TableNode
  | TableRowNode
  | TableCellNode
  | ImageNode
  | LinkNode
  | MentionNode
  | MentionInputNode
  | PrivateBlockNode;

// Props for element components
export interface ElementProps {
  attributes: Record<string, unknown>;
  children: React.ReactNode;
  element: EditorNode;
}

// Props for leaf/mark components
export interface LeafProps {
  attributes: Record<string, unknown>;
  children: React.ReactNode;
  leaf: TextNode;
}
