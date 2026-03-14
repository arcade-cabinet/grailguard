/**
 * Stub for react-native imports that R3F or other libraries may reference.
 * These are no-ops on web.
 */
export const Platform = {
  OS: 'web' as const,
  select: (obj: Record<string, unknown>) => obj.web ?? obj.default,
};

export const PixelRatio = {
  get: () => 1,
  getFontScale: () => 1,
  getPixelSizeForLayoutSize: (layoutSize: number) => layoutSize,
  roundToNearestPixel: (layoutSize: number) => layoutSize,
};

export const Dimensions = {
  get: () => ({ width: window.innerWidth, height: window.innerHeight, scale: 1, fontScale: 1 }),
  addEventListener: () => ({ remove: () => {} }),
};

export const StyleSheet = {
  create: <T extends Record<string, unknown>>(styles: T) => styles,
  flatten: (style: unknown) => style,
};

export const View = 'div';
export const Text = 'span';
export const Image = 'img';
