import KatakanaTranslator from '@src/matches/kataomoi/KatakanaTranslator';
import { createRoot } from 'react-dom/client';
// import '@src/tailwind-input.css'; // Assuming this might be needed later or handled by main build

// Create a container for the translator
const container = document.createElement('div');
container.id = 'katakana-translator-root'; // Reverted ID for consistency
document.body.appendChild(container);

// Render the translator
const root = createRoot(container);
root.render(<KatakanaTranslator />);

console.log('[Katakana Translator] Component rendered');

// Hot Module Replacement (HMR) - Remove this snippet to remove HMR.
// Learn more: https://www.snowpack.dev/concepts/hot-module-replacement
if (import.meta.hot) {
  // @ts-expect-error HMR types might not be fully configured
  import.meta.hot.accept();
}
