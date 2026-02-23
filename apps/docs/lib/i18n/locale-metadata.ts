export type LocaleMetadata = {
  label: string;
  flag: string;
  htmlLang: string;
};

export const localeMetadata: Record<string, LocaleMetadata> = {
  gb: {
    label: 'English (UK)',
    flag: '\u{1F1EC}\u{1F1E7}',
    htmlLang: 'en-GB',
  },
  es: {
    label: 'Espa\u{00F1}ol',
    flag: '\u{1F1EA}\u{1F1F8}',
    htmlLang: 'es',
  },
};
