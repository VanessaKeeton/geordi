/** Walk a DOM tree including open shadow roots (depth-first, document order). */
export function forEachNode(root: Node, visit: (node: Node) => void): void {
  visit(root);

  const childNodes =
    root instanceof Document
      ? root.documentElement?.childNodes
      : root.childNodes;

  if (childNodes) {
    for (const child of childNodes) {
      forEachNode(child, visit);
    }
  }

  if (root instanceof Element && root.shadowRoot) {
    for (const child of root.shadowRoot.childNodes) {
      forEachNode(child, visit);
    }
  }
}

/** querySelectorAll that pierces open shadow roots. */
export function queryAllDeep(root: ParentNode, selector: string): Element[] {
  const results: Element[] = [];
  const start =
    root instanceof Document ? root.documentElement! : (root as Node);

  forEachNode(start, (node) => {
    if (node instanceof Element && node.matches(selector)) {
      results.push(node);
    }
  });

  return results;
}

/** Collect text nodes in document order, including inside shadow roots. */
export function collectTextNodesDeep(root: ParentNode): Text[] {
  const nodes: Text[] = [];
  const start =
    root instanceof Document ? root.documentElement! : (root as Node);

  forEachNode(start, (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      nodes.push(node as Text);
    }
  });

  return nodes;
}

/** Ancestor elements for a node, crossing shadow root boundaries. */
export function ancestorElements(node: Node): Element[] {
  const elements: Element[] = [];
  let current: Node | null = node.parentNode;

  while (current) {
    if (current instanceof Element) {
      elements.push(current);
      current = current.parentNode;
      continue;
    }

    if (current instanceof ShadowRoot) {
      elements.push(current.host);
      current = current.host.parentNode;
      continue;
    }

    current = current.parentNode;
  }

  return elements;
}

/** True when an element is explicitly hidden (not merely zero-size). */
export function isHiddenElement(el: Element): boolean {
  const view = el.ownerDocument.defaultView;
  if (!view) return true;

  const style = view.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return true;
  if (parseFloat(style.opacity) === 0) return true;
  if (el.getAttribute("aria-hidden") === "true") return true;

  return false;
}
