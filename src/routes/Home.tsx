import { Network, ShieldAlert, Sparkles, Github, ExternalLink, Lock } from 'lucide-react';
import Prompt from '../components/Prompt';
import ToolCard from '../components/ToolCard';
import Terminal from '../components/Terminal';

export default function Home() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="space-y-5">
        <Prompt cwd="~" command="./toolkit --info" />
        <div className="max-w-2xl space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold text-fg leading-tight">
            Toolkit serverless de <span className="text-accent-yellow">ciberseguridad</span>.
          </h1>
          <p className="text-base text-fg-muted leading-relaxed">
            Todo corre en tu navegador — sin telemetría, sin backend, sin cuentas.
            Pensado para CTFs, laboratorios y auditorías autorizadas.
          </p>
        </div>
      </section>

      {/* Tools */}
      <section className="space-y-6">
        <div>
          <Prompt cwd="~" command="ls /opt/tools" />
          <h2 className="mt-3 text-xl font-semibold text-fg">Herramientas</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <ToolCard
            to="/networking"
            command="cd networking/"
            title="Networking"
            description="Calculadora de subnetting IPv4 (network, broadcast, hosts, máscara, wildcard) y generador de reverse shells multi-lenguaje con encoding URL/Base64."
            icon={<Network className="h-5 w-5" />}
          />
          <ToolCard
            to="/cms"
            command="cd cms-audit/"
            title="CMS Audit"
            description="Auditoría pasiva de WordPress: cabeceras de seguridad, endpoints expuestos, enumeración de usuarios, versión y score de riesgo. Más CMS en camino."
            icon={<ShieldAlert className="h-5 w-5" />}
          />
          <ToolCard
            to="/encoders"
            command="cd encoders/"
            title="Encoders"
            description="Recetas tipo CyberChef (base64, URL, hex, hash, JWT, rot) y una feature distintiva: ocultar mensajes invisibles dentro de un emoji."
            icon={<Sparkles className="h-5 w-5" />}
          />
        </div>
      </section>

      {/* About / readme */}
      <section className="space-y-4">
        <Prompt cwd="~" command="cat README.md | head -20" />
        <Terminal title="readme.md">
          <div className="space-y-4 text-sm">
            <p className="text-fg">
              <span className="text-accent-yellow">#</span> hacking.pwnvader.com
            </p>
            <p className="text-fg-muted leading-relaxed">
              Subdominio hermano de{' '}
              <a
                href="https://pwnvader.com"
                target="_blank"
                rel="noreferrer noopener"
                className="text-accent-blue hover:underline inline-flex items-center gap-1"
              >
                pwnvader.com <ExternalLink className="h-3 w-3" />
              </a>
              . Mientras el principal es mi tarjeta como pentester, este es el laboratorio donde libero herramientas para la comunidad.
            </p>
            <p className="text-fg-muted leading-relaxed">
              <span className="text-accent-yellow">$</span> Stack: React + Vite + Tailwind, hosteado en GitHub Pages.
              El proxy CORS del auditor de CMS corre en un Cloudflare Worker propio — tú no configuras nada.
            </p>
            <div className="flex items-start gap-2 pt-2 border-t border-bg-line/60">
              <Lock className="h-4 w-4 text-accent-red flex-shrink-0 mt-0.5" />
              <p className="text-fg-muted leading-relaxed">
                <span className="text-accent-red font-medium">Disclaimer:</span> uso educativo y auditorías
                autorizadas únicamente. No uses el auditor de CMS contra sitios sobre los que no tengas permiso.
              </p>
            </div>
          </div>
        </Terminal>
      </section>

      {/* Quick links */}
      <section className="grid gap-3 sm:grid-cols-3 text-sm">
        <QuickLink href="https://pwnvader.com" label="pwnvader.com" icon={<ExternalLink className="h-4 w-4" />} />
        <QuickLink href="https://github.com/pwnVader" label="github.com/pwnVader" icon={<Github className="h-4 w-4" />} />
        <QuickLink href="https://linkedin.com/in/jesusperezromero" label="linkedin/jesusperezromero" icon={<ExternalLink className="h-4 w-4" />} />
      </section>
    </div>
  );
}

function QuickLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="flex items-center gap-3 rounded-lg border border-bg-line bg-bg-card px-4 py-3 text-fg-muted transition hover:border-accent-blue/40 hover:text-accent-blue"
    >
      <span className="text-accent-blue">{icon}</span>
      <span className="font-mono">{label}</span>
    </a>
  );
}
