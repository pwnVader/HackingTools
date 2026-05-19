import { KeyRound } from 'lucide-react';
import SectionIndex from '../SectionIndex';

export default function CrackingIndex() {
  return (
    <SectionIndex
      cwd="~/cracking"
      command="ls -la"
      title="Cracking"
      intro="Constructores de comandos para herramientas de cracking offline. La ejecución ocurre en tu máquina con GPU/CPU — aquí sólo se arma la línea, sin tocar contraseñas."
      tools={[
        {
          to: '/cracking/hashcat',
          command: './hashcat-mask',
          title: 'Hashcat Mask Builder',
          description:
            'Buscador de hash modes (-m), constructor visual de máscaras (apila ?u ?l ?d ?s + literales) y comando completo listo para copiar.',
          icon: <KeyRound className="h-5 w-5" />,
        },
      ]}
    />
  );
}
