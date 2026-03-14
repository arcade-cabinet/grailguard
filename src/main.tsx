import './global.css';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { CodexScreen } from './app/codex';
import { DoctrineScreen } from './app/doctrine';
import { GameScreen } from './app/game';
import { HistoryScreen } from './app/history';
import { MainMenu } from './app/index';
import { SettingsScreen } from './app/settings';
import { DatabaseProvider } from './db/DatabaseProvider';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <BrowserRouter>
    <DatabaseProvider>
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/game" element={<GameScreen />} />
        <Route path="/codex" element={<CodexScreen />} />
        <Route path="/doctrine" element={<DoctrineScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="/history" element={<HistoryScreen />} />
      </Routes>
    </DatabaseProvider>
  </BrowserRouter>,
);
