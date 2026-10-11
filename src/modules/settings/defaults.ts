/**
 * Store settings with defaults (docs/DATABASE.md `setting`). Values marked "seed default" are
 * placeholders for open owner decisions (OQ-3, OQ-4) and are editable in admin settings.
 */
export const SETTING_DEFAULTS = {
  "store.name": "KRM.lib",
  "store.tagline": "Knowledge Resource & Management. Practical knowledge for a better you.",
  "store.quote": "A small library for a bigger tomorrow.",
  "store.supportEmail": "support@krmlib.local",
  "store.legalName": "",
  "store.taxId": "",
  "store.address": "",
  "currency.default": "INR",
  "currency.enabled": ["INR", "USD"],
  "checkout.guestEnabled": true,
  /** OQ-7: provider defaults by billing country; the customer may override. */
  "payments.razorpayCountries": ["IN"],
  "payments.razorpayEnabled": true,
  "payments.stripeEnabled": true,
  /** OQ-3 seed default. */
  "refunds.windowDays": 30,
  "refunds.revokeAccessOnRefund": true,
  /** OQ-4 seed defaults. */
  "downloads.limitPerProduct": 5,
  "downloads.signedUrlTtlSeconds": 60,
  "downloads.requireVerifiedEmail": true,
  "reviews.requireModeration": true,
  "feature.creatorSystem": false,
  "system.maintenanceMode": false,
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;
export type SettingValue<K extends SettingKey> = (typeof SETTING_DEFAULTS)[K] extends readonly string[]
  ? string[]
  : (typeof SETTING_DEFAULTS)[K] extends boolean
    ? boolean
    : (typeof SETTING_DEFAULTS)[K] extends number
      ? number
      : string;
