import React from 'react';

function createPrimitive(name: string) {
  return ({ children, ...props }: Record<string, unknown>) =>
    React.createElement(name, props, children as React.ReactNode);
}

export const View = createPrimitive('View');
export const Text = createPrimitive('Text');
export const TouchableOpacity = createPrimitive('TouchableOpacity');
export const ScrollView = createPrimitive('ScrollView');
export const Modal = createPrimitive('Modal');
export const TextInput = createPrimitive('TextInput');
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
