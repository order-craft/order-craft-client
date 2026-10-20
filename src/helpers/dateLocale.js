import { enUS, fr, it } from 'date-fns/locale'

/**
 * Maps this app's language state ('English' | 'French' | 'Italian') to the
 * matching date-fns locale, so relative timestamps (formatDistanceToNow,
 * etc.) translate instead of always reading in English.
 */
export const getDateLocale = (language) => {
  if (language === 'French') return fr
  if (language === 'Italian') return it
  return enUS
}
