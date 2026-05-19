import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Prompt from './components/Prompt';

import Home from './routes/Home';
import HistoryRoute from './routes/History';
import NetworkingIndex from './routes/networking';
import Subnet from './routes/networking/Subnet';
import RevShell from './routes/networking/RevShell';
import Tunneling from './routes/networking/Tunneling';
import CmsIndex from './routes/cms';
import Wordpress from './routes/cms/Wordpress';
import Joomla from './routes/cms/Joomla';
import Drupal from './routes/cms/Drupal';
import EncodersIndex from './routes/encoders';
import Recipes from './routes/encoders/Recipes';
import EmojiStego from './routes/encoders/EmojiStego';
import CrackingIndex from './routes/cracking';
import Hashcat from './routes/cracking/Hashcat';
import WebIndex from './routes/web';
import JwtAttacker from './routes/web/Jwt';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />

        <Route path="networking">
          <Route index element={<NetworkingIndex />} />
          <Route path="subnet" element={<Subnet />} />
          <Route path="revshell" element={<RevShell />} />
          <Route path="tunneling" element={<Tunneling />} />
        </Route>

        <Route path="cms">
          <Route index element={<CmsIndex />} />
          <Route path="wordpress" element={<Wordpress />} />
          <Route path="joomla" element={<Joomla />} />
          <Route path="drupal" element={<Drupal />} />
        </Route>

        <Route path="encoders">
          <Route index element={<EncodersIndex />} />
          <Route path="recipes" element={<Recipes />} />
          <Route path="emoji-stego" element={<EmojiStego />} />
        </Route>

        <Route path="cracking">
          <Route index element={<CrackingIndex />} />
          <Route path="hashcat" element={<Hashcat />} />
        </Route>

        <Route path="web">
          <Route index element={<WebIndex />} />
          <Route path="jwt" element={<JwtAttacker />} />
        </Route>

        <Route path="history" element={<HistoryRoute />} />

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
