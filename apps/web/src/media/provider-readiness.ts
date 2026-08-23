/**
 * Placeholder media-provider gate: every provider is treated as picker-ready.
 * Real readiness probing is a follow-up; this seam keeps the call shape stable
 * in NewProjectPanel until then.
 */
export const isMediaProviderPickerReady = (..._args: unknown[]): boolean => true;
