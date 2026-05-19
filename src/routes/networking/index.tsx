import { CalculatorIcon, BashIcon } from '../../components/CustomIcons';
import SectionIndex from '../SectionIndex';

export default function NetworkingIndex() {
  return (
    <SectionIndex
      cwd="~/networking"
      command="ls -la"
      title="Networking"
      intro="Herramientas de red para CTFs y pentesting interno: cálculo rápido de subredes y generador de reverse shells listas para copiar."
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
      ]}
    />
  );
}
