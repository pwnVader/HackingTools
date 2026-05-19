import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Prompt from './components/Prompt';

import Home from './routes/Home';
import NetworkingIndex from './routes/networking';
import Subnet from './routes/networking/Subnet';
import RevShell from './routes/networking/RevShell';
import CmsIndex from './routes/cms';
import Wordpress from './routes/cms/Wordpress';
import EncodersIndex from './routes/encoders';
import Recipes from './routes/encoders/Recipes';
import EmojiStego from './routes/encoders/EmojiStego';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />

        <Route path="networking">
          <Route index element={<NetworkingIndex />} />
          <Route path="subnet" element={<Subnet />} />
          <Route path="revshell" element={<RevShell />} />
        </Route>

        <Route path="cms">
          <Route index element={<CmsIndex />} />
          <Route path="wordpress" element={<Wordpress />} />
        </Route>

        <Route path="encoders">
          <Route index element={<EncodersIndex />} />
          <Route path="recipes" element={<Recipes />} />
          <Route path="emoji-stego" element={<EmojiStego />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

function NotFound() {
  return (
    <div>
      <Prompt cwd="~" command="cat $REQUESTED_PATH" />
      <pre className="mt-4 text-accent-red">
{`error: command not found

la página que buscas no existe.
> regresa a /  o usa el menú superior.`}
      </pre>
    </div>
  );
}
