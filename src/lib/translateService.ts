/**
 * Professional Translation Service using LibreTranslate
 * Base URL: https://translate.argosopentech.com
 */

const LIBRE_TRANSLATE_BASE_URL = 'https://translate.argosopentech.com';

// Standard supported language codes we map across the Book A Celebrity platform
export interface LanguageOption {
  code: string;
  name: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' }
];

/**
 * Detect language of a given text using the LibreTranslate detect API
 */
export async function detectLanguage(text: string): Promise<string> {
  if (!text || !text.trim()) return 'en';

  try {
    const response = await fetch(`${LIBRE_TRANSLATE_BASE_URL}/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text })
    });

    if (!response.ok) {
      throw new Error(`Detect API error status: ${response.status}`);
    }

    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      const bestMatch = data[0];
      // Keep only language codes that are exactly 2 letters, and handle falling back
      const lang = bestMatch.language || 'en';
      return lang;
    }
    return 'en';
  } catch (error) {
    console.warn('[TranslationService] detectLanguage failed, falling back to "en":', error);
    return 'en';
  }
}

/**
 * Translate a piece of text to a target language using LibreTranslate translate API
 */
export async function translateText(
  text: string,
  targetLanguage: string,
  sourceLanguage?: string
): Promise<{ translatedText: string; sourceLanguage: string }> {
  if (!text || !text.trim()) {
    return { translatedText: '', sourceLanguage: sourceLanguage || 'en' };
  }

  // If source and target are the same, skip translation
  const sourceLang = sourceLanguage || await detectLanguage(text);
  if (sourceLang === targetLanguage) {
    return { translatedText: text, sourceLanguage: sourceLang };
  }

  try {
    const response = await fetch(`${LIBRE_TRANSLATE_BASE_URL}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: sourceLang,
        target: targetLanguage,
        format: 'text',
        api_key: ''
      })
    });

    if (!response.ok) {
      throw new Error(`Translate API error status: ${response.status}`);
    }

    const data = await response.json();
    if (data && data.translatedText) {
      return {
        translatedText: data.translatedText,
        sourceLanguage: sourceLang
      };
    }

    throw new Error('No translatedText property in translation API response');
  } catch (error) {
    console.error('[TranslationService] translateText failed:', error);
    throw new Error('Translation unavailable. Please try again later.');
  }
}

/**
 * Get country flag emoji based on two-letter language code
 */
export function getLanguageFlag(code: string): string {
  const record = SUPPORTED_LANGUAGES.find(l => l.code === code);
  return record ? record.flag : '🌐';
}

/**
 * Get display language name based on two-letter language code
 */
export function getLanguageName(code: string): string {
  const record = SUPPORTED_LANGUAGES.find(l => l.code === code);
  return record ? record.name : code.toUpperCase();
}
