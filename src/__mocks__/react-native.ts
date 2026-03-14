/**
 * Mock for any remaining react-native imports in test code.
 * In the Vite/web build, react-native is no longer used.
 * This mock exists for backwards compatibility with tests
 * that may still reference the module name mapper.
 */
import React from 'react';

function createPrimitive(name: string) {
  return ({ children, ...props }: Record<string, unknown>) =>
    React.createElement(name, props, children as React.ReactNode);
}

export const View = createPrimitive('div');
export const Text = createPrimitive('span');
export const TouchableOpacity = createPrimitive('button');
export const ScrollView = createPrimitive('div');
export const Modal = createPrimitive('dialog');
export const TextInput = createPrimitive('input');
export const AppState = {
  addEventListener: () => ({
    remove: () => undefined,
  }),
};
export const PanResponder = {
  create: () => ({
    panHandlers: {},
  }),
};
export const Platform = {
  OS: 'web' as const,
  select: (obj: Record<string, unknown>) => obj.web ?? obj.default,
};
export const AccessibilityInfo = {
  announceForAccessibility: () => undefined,
};
