import en from "./en";
import ko from "./ko";

const localeMap: { [key: string]: typeof en } = {
    en,
    ko,
};

/**
 * Returns the translation for the given key and language.
 * Falls back to English if the key is missing or language is unsupported.
 */
export function t(key: keyof typeof en, lang: string): string {
    const activeLocale = localeMap[lang] || localeMap.en;
    return activeLocale[key] || en[key] || key;
}
