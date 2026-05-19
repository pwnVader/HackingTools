import { Wordpress, Joomla, Drupal } from '../../components/CmsIcons';
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
          description: 'Próximamente: checks de versión, plugins/extensions expuestos, archivos sensibles.',
          status: 'soon',
          icon: <Joomla className="h-6 w-6" />,
        },
        {
          to: '/cms/drupal',
          command: './drupal-audit',
          title: 'Drupal',
          description: 'Próximamente: detección de versión, módulos, archivos CHANGELOG y configuración expuesta.',
          status: 'soon',
          icon: <Drupal className="h-6 w-6" />,
        },
      ]}
    />
  );
}
