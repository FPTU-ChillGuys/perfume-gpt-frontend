/** TTL (time-to-live) values in milliseconds. */
export const CACHE_TTL = {
  ONE_SECOND: 1_000,
  FIVE_SECONDS: 5_000,
  TEN_SECONDS: 10_000,
  THIRTY_SECONDS: 30_000,
  ONE_MINUTE: 60_000,
  FIVE_MINUTES: 5 * 60_000,
  TEN_MINUTES: 10 * 60_000,
  FIFTEEN_MINUTES: 15 * 60_000,
  THIRTY_MINUTES: 30 * 60_000,
  ONE_HOUR: 60 * 60_000,
  TWO_HOURS: 2 * 60 * 60_000,
  SIX_HOURS: 6 * 60 * 60_000,
  TWELVE_HOURS: 12 * 60 * 60_000,
  ONE_DAY: 24 * 60 * 60_000,
  THREE_DAYS: 3 * 24 * 60 * 60_000,
  ONE_WEEK: 7 * 24 * 60 * 60_000,
  TWO_WEEKS: 14 * 24 * 60 * 60_000,
  ONE_MONTH: 30 * 24 * 60 * 60_000,
  THREE_MONTHS: 90 * 24 * 60 * 60_000,
  SIX_MONTHS: 180 * 24 * 60 * 60_000,
  ONE_YEAR: 365 * 24 * 60 * 60_000,
} as const;

/** Shared cache keys for dexieCache. */
export const CACHE_KEYS = {
  CATEGORIES_LOOKUP: "categories_lookup",
  ALL_PRODUCTS_FOR_CATEGORY_FILTER: "all_products_for_category_filter",
  SURVEY_RESULT: "survey_result",
} as const;
