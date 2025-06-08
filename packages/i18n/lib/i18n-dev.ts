// IT WILL BE ADJUSTED TO YOUR LANGUAGE DURING BUILD TIME, DON'T MOVE BELOW IMPORT TO OTHER LINE
import localeJSON from '../locales/en/messages.json' with { type: 'json' };
import type { I18nValueType, LocalesJSONType } from './types.js';

const translate = (key: keyof LocalesJSONType, substitutions?: string | string[]) => {
  const localeValues = localeJSON[key] as I18nValueType;
  if (!localeValues) {
    return key;
  }
  let message = localeValues.message;

  /**
   * This is a placeholder replacement logic that more closely imitates the behavior
   * of the Chrome extension i18n API.
   * @url https://developer.chrome.com/docs/extensions/how-to/ui/localization-message-formats#placeholders
   */
  // First, handle named placeholders
  if (localeValues.placeholders) {
    Object.entries(localeValues.placeholders).forEach(([placeholderName, { content }]) => {
      if (content) {
        // Replace the named placeholder e.g., $COUNT$ with its content e.g., $1
        message = message.replace(new RegExp(`\\$${placeholderName}\\$`, 'gi'), content);
      }
    });
  }

  // Then, handle numbered substitutions like $1, $2
  if (substitutions) {
    const subsArray = Array.isArray(substitutions) ? substitutions : [substitutions];
    subsArray.forEach((sub, i) => {
      // Replace $1, $2, etc. with the substitution strings
      message = message.replace(new RegExp(`\\$${i + 1}`, 'g'), sub);
    });
  }

  return message;
};

export const t = translate;
