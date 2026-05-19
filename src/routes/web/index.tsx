import { ShieldOff } from 'lucide-react';
import SectionIndex from '../SectionIndex';

export default function WebIndex() {
  return (
    <SectionIndex
      cwd="~/web"
      command="ls -la"
      title="Web"
      intro="Herramientas ofensivas para superficie web: editores de tokens, manipulación de claims y otros vectores de auth. Más próximamente."
      tools={[
        {
          to: '/web/jwt',
          command: './jwt-attacker',
          title: 'JWT Attacker',
          description:
            'Editor visual de JWT con ataques de un clic: alg:none, escalada de privilegios (detecta campos role/admin/scope y sugiere mutaciones).',
          icon: <ShieldOff className="h-5 w-5" />,
        },
      ]}
    />
  );
}
