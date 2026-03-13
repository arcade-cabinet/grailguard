const createMockFn = () => (typeof jest !== 'undefined' && jest.fn ? jest.fn() : () => {});

export const soundManager = {
  init: createMockFn(),
  playAmbience: createMockFn(),
  stopAmbience: createMockFn(),
  playMusic: createMockFn(),
  stopMusic: createMockFn(),
  playUiClick: createMockFn(),
  playBuild: createMockFn(),
  playCombat: createMockFn(),
  playGameOver: createMockFn(),
};