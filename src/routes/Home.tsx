import { Network, ShieldAlert, Sparkles, ExternalLink, Lock } from 'lucide-react';
import Prompt from '../components/Prompt';
import ToolCard from '../components/ToolCard';
import Terminal from '../components/Terminal';
import { GithubIcon, LinkedinIcon, KaliIcon } from '../components/CustomIcons';

export default function Home() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="flex flex-col">
        <Prompt cwd="~" command="./toolkit --info" className="mb-8" />
        <div className="space-y-6 mt-2">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-textPrimary leading-tight font-mono">
            Toolkit serverless de{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-400">
              ciberseguridad.
            </span>
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed max-w-2xl font-mono">
            Todo corre en tu navegador — sin telemetría, sin backend, sin cuentas.
            Pensado para CTFs, laboratorios y auditorías autorizadas.
          </p>
        </div>
      </section>

      {/* Tools */}
      <section className="space-y-6">
        <div>
          <Prompt cwd="~" command="ls /opt/tools" />
          <h2 className="mt-3 text-xl font-bold text-text-primary font-mono">Herramientas</h2>
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
          <div className="space-y-4 text-sm font-mono p-1">
            <p className="text-text-primary font-semibold">
              <span className="text-accent">#</span> hacking.pwnvader.com
            </p>
            <p className="text-text-secondary leading-relaxed">
              Subdominio hermano de{' '}
              <a
                href="https://pwnvader.com"
                target="_blank"
                rel="noreferrer noopener"
                className="text-accent hover:text-accent/80 hover:underline inline-flex items-center gap-1 font-semibold"
              >
                pwnvader.com <ExternalLink className="h-3 w-3" />
              </a>
              . Mientras el principal es mi tarjeta como pentester, este es el laboratorio donde libero herramientas para la comunidad.
            </p>
            <p className="text-text-secondary leading-relaxed">
              <span className="text-accent">$</span> Stack: React + Vite + Tailwind, hosteado en GitHub Pages.
              El proxy CORS del auditor de CMS corre en un Cloudflare Worker propio — tú no configuras nada.
            </p>
            <div className="flex items-start gap-2.5 pt-4 border-t border-bg-line/40">
              <Lock className="h-4 w-4 text-accent-red flex-shrink-0 mt-0.5" />
              <p className="text-text-secondary leading-relaxed text-xs">
                <span className="text-accent-red font-semibold">Disclaimer:</span> uso educativo y auditorías
                autorizadas únicamente. No uses el auditor de CMS contra sitios sobre los que no tengas permiso.
              </p>
            </div>
          </div>
        </Terminal>
      </section>

      {/* Quick links */}
      <section className="grid gap-4 sm:grid-cols-3 text-sm">
        <QuickLink href="https://pwnvader.com" label="pwnvader.com" icon={<KaliIcon className="h-5 w-5" />} />
        <QuickLink href="https://github.com/pwnVader" label="github.com/pwnVader" icon={<GithubIcon className="h-5 w-5" />} />
        <QuickLink href="https://linkedin.com/in/jesusperezromero" label="linkedin/jesusperezromero" icon={<LinkedinIcon className="h-5 w-5" />} />
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
      className="flex items-center gap-3 rounded-xl border border-bg-line bg-bg-card px-4 py-3.5 text-text-secondary transition-all duration-300 hover:border-accent/60 hover:text-accent hover:shadow-glow hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-accent/40"
    >
      <span className="text-accent transition-colors duration-300">{icon}</span>
      <span className="font-mono font-medium">{label}</span>
    </a>
  );
}

