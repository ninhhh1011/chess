import { Routes, Route } from 'react-router-dom';
import { PrototypeShell } from './components/PrototypeShell';
import { GalleryPrototype } from './screens/GalleryPrototype';
import { HomePrototype } from './screens/HomePrototype';
import { LobbyPrototype } from './screens/LobbyPrototype';
import { PlayPrototype } from './screens/PlayPrototype';
import { ReviewPrototype } from './screens/ReviewPrototype';
import { ProgressPrototype } from './screens/ProgressPrototype';
import { ComponentsPrototype } from './screens/ComponentsPrototype';

export default function App() {
  return (
    <PrototypeShell>
      <Routes>
        <Route path="/" element={<GalleryPrototype />} />
        <Route path="/home" element={<HomePrototype />} />
        <Route path="/lobby" element={<LobbyPrototype />} />
        <Route path="/play" element={<PlayPrototype />} />
        <Route path="/review" element={<ReviewPrototype />} />
        <Route path="/progress" element={<ProgressPrototype />} />
        <Route path="/components" element={<ComponentsPrototype />} />
        <Route path="/screenshots" element={<GalleryPrototype />} />
      </Routes>
    </PrototypeShell>
  );
}
