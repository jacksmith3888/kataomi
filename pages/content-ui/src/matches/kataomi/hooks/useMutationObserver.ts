import { injectStylesIntoShadowRoot } from '../styles';
import { useEffect } from 'react';
import type { ScanNodeFunction } from '../types';

export const useMutationObserver = function (scanNode: ScanNodeFunction, isEnabled: boolean): void {
  useEffect(() => {
    if (!isEnabled) return;

    console.log('[Katakana Translator] Initializing MutationObserver.');
    const observers: MutationObserver[] = [];

    const createObserverInstance = (target: Node | ShadowRoot) => {
      if (target instanceof ShadowRoot) {
        injectStylesIntoShadowRoot(target);
      }

      const observer = new MutationObserver(mutations => {
        // console.debug('[Katakana Translator] Mutation observed:', mutations);
        mutations.forEach(mutation => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                scanNode(node as Element); // Scan the new element and its children
                // Check for shadow roots in added node and its descendants
                if ((node as Element).shadowRoot) {
                  injectStylesIntoShadowRoot((node as Element).shadowRoot!);
                  createObserverInstance((node as Element).shadowRoot!);
                  scanNode((node as Element).shadowRoot!);
                }
                (node as Element).querySelectorAll('*').forEach(childElement => {
                  if (childElement.shadowRoot) {
                    injectStylesIntoShadowRoot(childElement.shadowRoot);
                    createObserverInstance(childElement.shadowRoot);
                    scanNode(childElement.shadowRoot);
                  }
                });
              } else if (node.nodeType === Node.TEXT_NODE) {
                // If a text node is added directly to an element, scan its parent
                if (node.parentNode && node.parentNode.nodeType === Node.ELEMENT_NODE) {
                  scanNode(node.parentNode as Element);
                }
              }
            });
          } else if (mutation.type === 'characterData') {
            // If text content of a node changes, scan its parent element
            if (mutation.target.parentNode && mutation.target.parentNode.nodeType === Node.ELEMENT_NODE) {
              scanNode(mutation.target.parentNode as Element);
            }
          }
        });
      });

      observer.observe(target, {
        childList: true,
        subtree: true,
        characterData: true,
      });
      observers.push(observer);
    };

    // Observe body
    createObserverInstance(document.body);

    // Observe existing shadow roots
    document.querySelectorAll('*').forEach(element => {
      if (element.shadowRoot) {
        injectStylesIntoShadowRoot(element.shadowRoot);
        createObserverInstance(element.shadowRoot);
        scanNode(element.shadowRoot); // Also scan them initially if missed
      }
    });

    return () => {
      console.log('[Katakana Translator] Disconnecting MutationObservers.');
      observers.forEach(observer => observer.disconnect());
    };
  }, [isEnabled, scanNode]);
};
