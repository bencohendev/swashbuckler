import type { Value } from '@udecode/plate';

interface SlateNode {
  type?: string;
  text?: string;
  private?: boolean;
  children?: SlateNode[];
  [key: string]: unknown;
}

/**
 * Recursively removes private content from an editor value tree.
 * - Removes `private_block` elements entirely
 * - Removes text nodes with `private: true` mark
 * - Ensures parent elements retain at least one `{ text: '' }` child (Slate invariant)
 */
export function stripPrivateContent(value: Value): Value {
  return stripNodes(value as SlateNode[]) as Value;
}

function stripNodes(nodes: SlateNode[]): SlateNode[] {
  const result: SlateNode[] = [];

  for (const node of nodes) {
    // Remove private_block elements entirely
    if (node.type === 'private_block') {
      continue;
    }

    // Remove text nodes with private mark
    if ('text' in node && node.text !== undefined) {
      if (node.private) {
        continue;
      }
      result.push(node);
      continue;
    }

    // Recursively filter children of element nodes
    if (node.children) {
      const filteredChildren = stripNodes(node.children);
      // Slate requires at least one child — insert empty text if all children were removed
      const children = filteredChildren.length > 0 ? filteredChildren : [{ text: '' }];
      result.push({ ...node, children });
    } else {
      result.push(node);
    }
  }

  return result;
}
