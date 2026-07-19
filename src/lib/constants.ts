/**
 * Platform values offered in the UI wherever a product/machine platform is
 * picked. Not a Keygen-enforced enum — Product.platforms and Machine.platform
 * are both freeform strings server-side (verified against the serializers) —
 * this is purely a keygen-ui convention, kept in one place so the options a
 * product declares support for and the options offered when tagging a
 * machine's platform can't drift apart.
 */
export const PLATFORM_OPTIONS = [
  'Windows',
  'macOS',
  'Linux',
  'iOS',
  'Android',
  'Web',
  'Docker',
  'Cloud',
] as const
