import { Workflow } from 'lucide-react';
import { CalculatorIcon, BashIcon } from '../../components/CustomIcons';
import SectionIndex from '../SectionIndex';

export default function NetworkingIndex() {
  return (
    <SectionIndex
      cwd="~/networking"
      command="ls -la"
      title="Networking"
      intro="Herramientas de red para CTFs y pentesting interno: cálculo de subredes, reverse shells listas para copiar y diseño de túneles para pivotaje."
      tools={[
        {
          to: '/networking/subnet',
          command: './subnet-calc',
          title: 'Subnet Calculator',
          description: 'IPv4 + CIDR → network, broadcast, hosts, máscara, wildcard, binario y clase. Cálculo instantáneo en cliente.',
          icon: <CalculatorIcon className="h-5 w-5" />,
        },
        {
          to: '/networking/revshell',
          command: './revshell-gen',
          title: 'Reverse Shell Generator',
          description: 'Más de 20 plantillas (Bash, Python, PHP, PowerShell, nc…) con encoding URL/Base64/PS-enc, listeners y TTY upgrades.',
          icon: <BashIcon className="h-5 w-5" />,
        },
        {
          to: '/networking/tunneling',
          command: './pivoting-architect',
          title: 'Pivoting Architect',
          description: 'Diseñador 3-columnas (Kali → Pivot → Target) para Chisel, SSH (-D/-L/-R) y Ligolo-ng. Comandos exactos por nodo.',
          icon: <Workflow className="h-5 w-5" />,
        },
      ]}
    />
  );
}
