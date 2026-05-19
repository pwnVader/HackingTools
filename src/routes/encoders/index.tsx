import { Wand2 } from 'lucide-react';
import { EmojiIcon } from '../../components/CustomIcons';
import SectionIndex from '../SectionIndex';

export default function EncodersIndex() {
  return (
    <SectionIndex
      cwd="~/encoders"
      command="ls -la"
      title="Encoders"
      intro="Codificadores y decodificadores ejecutados 100% en tu navegador. Tu input nunca sale del cliente. Incluye una feature distintiva para ocultar mensajes invisibles dentro de un emoji."
      tools={[
        {
          to: '/encoders/recipes',
          command: './recipes',
          title: 'Recipes',
          description: 'Base64, URL, Hex, ROT13, JWT decode, hashes (MD5/SHA-1/SHA-256/SHA-512) y más. Encadenables como CyberChef.',
          icon: <Wand2 className="h-5 w-5" />,
        },
        {
          to: '/encoders/emoji-stego',
          command: './emoji-stego',
          title: 'Emoji Stego',
          description: 'Esconde mensajes arbitrarios dentro de un emoji usando Unicode tag chars. El receptor solo ve el emoji.',
          icon: <EmojiIcon className="h-5 w-5" />,
        },
      ]}
    />
  );
}
