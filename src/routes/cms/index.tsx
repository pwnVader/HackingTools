import { Wordpress, Joomla, Drupal } from '../../components/CmsIcons';
import { ShieldAlert } from 'lucide-react';
import SectionIndex from '../SectionIndex';
 
export default function CmsIndex() {
  return (
    <SectionIndex
      cwd="~/cms-audit"
      command="ls -la"
      title="CMS Audit"
      intro="Auditoría pasiva de sitios construidos sobre CMS conocidos. No explota nada — solo observa lo que el sitio expone públicamente. Usa solo sobre sitios que te pertenecen o donde tengas permiso."
      tools={[
        {
          to: '/cms/wordpress',
          command: './wp-audit',
          title: 'WordPress',
          description: 'Cabeceras HTTP, endpoints expuestos, enumeración de usuarios, versión y score de riesgo. Export a MD/HTML/PDF/JSON.',
          icon: <Wordpress className="h-6 w-6" />,
        },
        {
          to: '/cms/joomla',
          command: './joomla-audit',
          title: 'Joomla',
          description: 'Detección pasiva serverless de versión del núcleo, manifiestos expuestos (.xml), plantillas de configuración, directorios administrativos expuestos y análisis estricto de cabeceras HTTP.',
          icon: <Joomla className="h-6 w-6" />,
        },
        {
          to: '/cms/drupal',
          command: './drupal-audit',
          title: 'Drupal',
          description: 'Detección pasiva de versión core mediante CHANGELOG, instaladores activos, fugas de configuración críticas (.php, .bak) y cumplimiento de directivas de seguridad HTTP.',
          icon: <Drupal className="h-6 w-6" />,
        },
        {
          to: '#',
          command: './atlassian-audit',
          title: 'Atlassian Audit',
          description: 'Auditoría de seguridad pasiva y validación de versión expuesta para Confluence y Jira. Refs CVE y OWASP.',
          status: 'soon',
          icon: <ShieldAlert className="h-5 w-5" />,
        },
        {
          to: '#',
          command: './liferay-audit',
          title: 'Liferay Audit',
          description: 'Validación de cabeceras HTTP, endpoints de API expuestos y análisis de configuración en portales Liferay.',
          status: 'soon',
          icon: <ShieldAlert className="h-5 w-5" />,
        },
      ]}
    />
  );
}
