import {
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  StrikethroughPlugin,
  CodePlugin,
} from '@udecode/plate-basic-marks/react';
import { HeadingPlugin } from '@udecode/plate-heading/react';
import { BlockquotePlugin } from '@udecode/plate-block-quote/react';
import { CodeBlockPlugin } from '@udecode/plate-code-block/react';
import { ListPlugin } from '@udecode/plate-list/react';
import { TogglePlugin } from '@udecode/plate-toggle/react';
import { CalloutPlugin } from '@udecode/plate-callout/react';
import { TablePlugin } from '@udecode/plate-table/react';
import { ImagePlugin } from '@udecode/plate-media/react';
import { LinkPlugin } from '@udecode/plate-link/react';
import { SlashPlugin } from '@udecode/plate-slash-command/react';
import { MentionPlugin, MentionInputPlugin } from '@udecode/plate-mention/react';
import { DndPlugin } from '@udecode/plate-dnd';
import { AutoformatPlugin } from '@udecode/plate-autoformat/react';
import { IndentPlugin } from '@udecode/plate-indent/react';
import { NodeIdPlugin } from '@udecode/plate-node-id';
import { SpoilerPlugin } from '../plugins/spoiler-plugin';

// Plugin configuration for the editor
export const editorPlugins = [
  // Node IDs for collaboration and persistence
  NodeIdPlugin,

  // Basic formatting marks
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  StrikethroughPlugin,
  CodePlugin,
  SpoilerPlugin,

  // Block elements
  HeadingPlugin.configure({
    options: {
      levels: 3,
    },
  }),
  BlockquotePlugin,
  CodeBlockPlugin,
  ListPlugin,
  TogglePlugin,
  CalloutPlugin,
  TablePlugin,
  ImagePlugin,
  LinkPlugin,

  // Indentation
  IndentPlugin,

  // Commands and mentions
  SlashPlugin,
  MentionPlugin.configure({
    options: {
      triggerPreviousCharPattern: /^\s?$/,
    },
  }),
  MentionInputPlugin.configure({
    options: {
      trigger: '[[',
    },
  }),

  // Drag and drop
  DndPlugin.configure({
    options: {
      enableScroller: true,
    },
  }),

  // Autoformat (markdown-style shortcuts)
  AutoformatPlugin.configure({
    options: {
      rules: [
        // Bold
        {
          mode: 'mark',
          type: 'bold',
          match: '**',
        },
        // Italic
        {
          mode: 'mark',
          type: 'italic',
          match: '*',
        },
        {
          mode: 'mark',
          type: 'italic',
          match: '_',
        },
        // Strikethrough
        {
          mode: 'mark',
          type: 'strikethrough',
          match: '~~',
        },
        // Inline code
        {
          mode: 'mark',
          type: 'code',
          match: '`',
        },
        // Spoiler
        {
          mode: 'mark',
          type: 'spoiler',
          match: '||',
        },
        // Headings
        {
          mode: 'block',
          type: 'h1',
          match: '# ',
        },
        {
          mode: 'block',
          type: 'h2',
          match: '## ',
        },
        {
          mode: 'block',
          type: 'h3',
          match: '### ',
        },
        // Blockquote
        {
          mode: 'block',
          type: 'blockquote',
          match: '> ',
        },
        // Code block
        {
          mode: 'block',
          type: 'code_block',
          match: '```',
        },
        // Bulleted list
        {
          mode: 'block',
          type: 'ul',
          match: ['* ', '- '],
        },
        // Numbered list
        {
          mode: 'block',
          type: 'ol',
          match: ['1. ', '1) '],
        },
      ],
    },
  }),
];

// Initial editor value (empty document)
export const initialEditorValue = [
  {
    type: 'p',
    children: [{ text: '' }],
  },
];
