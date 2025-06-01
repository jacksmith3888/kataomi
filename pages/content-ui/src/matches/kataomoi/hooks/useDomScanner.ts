import { injectStylesIntoShadowRoot } from '../styles';
import { useCallback } from 'react';
import type { WordFoundCallback, ScanNodeFunction } from '../types';

const KATAKANA_REGEX =
  /[\u30A1-\u30FA\u30FD-\u30FF][\u3099\u309A\u30A1-\u30FF]*[\u3099\u309A\u30A1-\u30FA\u30FC-\u30FF]|[\uFF66-\uFF6F\uFF71-\uFF9D][\uFF65-\uFF9F]*[\uFF66-\uFF9F]/;
const EXCLUDE_TAGS = new Set(['ruby', 'script', 'style', 'select', 'textarea', 'noscript', 'code', 'pre']);
const EXCLUDE_CLASSES = new Set(['yt-live-chat-author-chip']);

export const useDomScanner = function (onWordFound: WordFoundCallback): { scanNode: ScanNodeFunction } {
  const addRubyToTextNode = useCallback(
    (textNode: Text): boolean => {
      const nodeValue = textNode.nodeValue;
      if (!nodeValue) return false;

      const match = KATAKANA_REGEX.exec(nodeValue);
      if (!match) return false;

      const matchedWord = match[0];

      // Avoid processing already created ruby text (e.g., if parent is <rt>)
      if (textNode.parentElement && textNode.parentElement.tagName === 'RT') {
        return false;
      }
      // Avoid processing inside our own ruby elements
      let current: Node | null = textNode.parentElement;
      while (current) {
        if (current.nodeName === 'RUBY' && (current as HTMLElement).querySelector('rt.kataomoi-rt')) {
          return false;
        }
        if (current instanceof HTMLElement && Array.from(current.classList).some(cls => EXCLUDE_CLASSES.has(cls))) {
          return false; // Avoid processing if parent or ancestor has excluded class
        }
        current = current.parentElement;
      }

      const rubyElement = document.createElement('ruby');
      rubyElement.className = 'kataomoi-ruby';
      rubyElement.appendChild(document.createTextNode(matchedWord));

      const rtElement = document.createElement('rt');
      rtElement.className = 'kataomoi-rt';
      rtElement.setAttribute('data-rt', ''); // Placeholder
      rubyElement.appendChild(rtElement);

      // Call the callback provided by the main component
      // This callback will handle cache checking and queueing
      onWordFound(matchedWord, rtElement);

      const afterTextNode = textNode.splitText(match.index);
      if (textNode.parentNode) {
        textNode.parentNode.insertBefore(rubyElement, afterTextNode);
      }
      afterTextNode.nodeValue = afterTextNode.nodeValue?.substring(matchedWord.length) || '';

      // If there's more text after the inserted ruby, recursively process it
      if (afterTextNode.nodeValue.length > 0) {
        addRubyToTextNode(afterTextNode); // Recursive call for the rest of the text node
      }

      return true;
    },
    [onWordFound],
  );

  const scanNodeRecursively = useCallback(
    (node: Node) => {
      if (!node.parentNode && !(node instanceof ShadowRoot)) return;

      let inBody = false;
      if (node instanceof ShadowRoot) {
        inBody = node.host && document.body.contains(node.host);
      } else {
        inBody = document.body.contains(node);
      }
      if (!inBody && !(node instanceof DocumentFragment)) return; // Allow DocumentFragment

      switch (node.nodeType) {
        case Node.ELEMENT_NODE: {
          const element = node as HTMLElement;
          if (
            EXCLUDE_TAGS.has(element.tagName.toLowerCase()) ||
            element.isContentEditable ||
            element.closest('ruby') ||
            Array.from(element.classList).some(cls => EXCLUDE_CLASSES.has(cls)) ||
            element.closest(
              Array.from(EXCLUDE_CLASSES)
                .map(cls => `.${cls}`)
                .join(','),
            )
          ) {
            return;
          }
          if (element.shadowRoot) {
            injectStylesIntoShadowRoot(element.shadowRoot);
            scanNode(element.shadowRoot); // scanNode is the exported function
          }
          Array.from(node.childNodes).forEach(scanNodeRecursively);
          break;
        }
        case Node.TEXT_NODE:
          addRubyToTextNode(node as Text);
          break;
      }
    },
    [addRubyToTextNode],
  ); // scanNode will be defined below

  // Define scanNode to be callable from outside and recursively
  const scanNode: ScanNodeFunction = useCallback(
    (elementOrShadowRoot: Element | ShadowRoot) => {
      if (elementOrShadowRoot instanceof ShadowRoot) {
        injectStylesIntoShadowRoot(elementOrShadowRoot);
        Array.from(elementOrShadowRoot.childNodes).forEach(scanNodeRecursively);
      } else if (elementOrShadowRoot.nodeType === Node.ELEMENT_NODE) {
        // If it's an element, scan its children
        Array.from(elementOrShadowRoot.childNodes).forEach(scanNodeRecursively);
      }
      // If elementOrShadowRoot is a text node itself (though type is Element | ShadowRoot)
      // this case is unlikely given the type, but DOM can be tricky.
      // The recursive calls handle text nodes within elements.
    },
    [scanNodeRecursively],
  );

  return { scanNode };
};
