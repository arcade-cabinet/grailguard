import './global.css';
import { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { DatabaseProvider } from './db/DatabaseProvider';

const MainMenu = lazy(() => import('./app/index').then((m) => ({ default: m.MainMenu })));
const GameScreen = lazy(() => import('./app/game').then((m) => ({ default: m.GameScreen })));
const CodexScreen = lazy(() => import('./app/codex').then((m) => ({ default: m.CodexScreen })));
const DoctrineScreen = lazy(() =>
  import('./app/doctrine').then((m) => ({ default: m.DoctrineScreen })),
);
const SettingsScreen = lazy(() =>
  import('./app/settings').then((m) => ({ default: m.SettingsScreen })),
);
const HistoryScreen = lazy(() =>
  import('./app/history').then((m) => ({ default: m.HistoryScreen })),
);

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <BrowserRouter>
    <DatabaseProvider>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<MainMenu />} />
          <Route path="/game" element={<GameScreen />} />
          <Route path="/codex" element={<CodexScreen />} />
          <Route path="/doctrine" element={<DoctrineScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/history" element={<HistoryScreen />} />
        </Routes>
      </Suspense>
    </DatabaseProvider>
  </BrowserRouter>,
);
