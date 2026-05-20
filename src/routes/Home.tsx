import {
  Network,
  ShieldAlert,
  Sparkles,
  ExternalLink,
  Lock,
} from 'lucide-react';
import Prompt from '../components/Prompt';
import ToolCard from '../components/ToolCard';
import Terminal from '../components/Terminal';
import { GithubIcon, KaliIcon } from '../components/CustomIcons';
import { cn } from '../lib/cn';

export default function Home() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="flex flex-col">
        <Prompt cwd="~" command="./toolkit --info" className="mb-8" />
        <div className="space-y-6 mt-2">
          <h1 className="text-4xl sm:text-6xl md:text-8xl font-extrabold tracking-tight text-textPrimary leading-tight font-mono">
            Toolkit serverless de{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-500">
              Ciberseguridad.
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
            description={
              <span>
                Subnet calculator, reverse shells multi-lenguaje y arquitecto de túneles (Chisel · SSH · Ligolo).{' '}
                <span className="block mt-1.5 text-xs text-zinc-400/80">
                  + C2 Malleable Profile Builder
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 border border-orange-500/30 bg-orange-500/10 px-1.5 py-0.5 rounded ml-2 mt-2 inline-block">Coming Soon</span>
                </span>
              </span>
            }
            icon={<Network className="h-5 w-5" />}
          />
          <ToolCard
            to="/cms"
            command="cd cms-audit/"
            title="CMS Audit"
            description={
              <span>
                Auditoría pasiva de WordPress, Joomla y Drupal con refs OWASP/CWE/CVE y reportes profesionales.{' '}
                <span className="block mt-1.5 text-xs text-zinc-400/80">
                  + Atlassian (Confluence/Jira) y Liferay
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 border border-orange-500/30 bg-orange-500/10 px-1.5 py-0.5 rounded ml-2 mt-2 inline-block">Coming Soon</span>
                </span>
              </span>
            }
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

      {/* Fastfetch Section */}
      <section className="space-y-4">
        <Prompt cwd="~" command="fastfetch" />
        <div className="flex flex-col md:flex-row gap-8 items-start my-6 p-4 bg-[#0f111a]/50 rounded-lg border border-white/5 font-mono max-w-3xl mx-auto w-full">
          {/* Columna Izquierda (Logo) */}
          <pre className="text-orange-500 font-mono text-[10px] md:text-xs leading-none select-none shrink-0" aria-hidden="true">
{`..............
            ..,;:ccc,.
          ......''';lxO.
.....''''..........,:ld;
           .';;;:::;,,.x,
      ..'''.            0Xxoc:,.  ...
  ....                ,ONkc;,;cokOdc',.
 .                   OMo           ':ddo.
                    dMc               :OO;
                    0M.                 .:o.
                    ;Wd
                     ;XO,
                       ,d0Odlc;,..
                           ..',;:cdOOd::,.
                                    .:d;.'::.
                                       'd,  .'
                                         ;l   ..
                                          .o
                                            c
                                            .'
                                             .`}
          </pre>

          {/* Columna Derecha (Info de Usuario) */}
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-base font-bold text-orange-400">
              root@pwnvader
            </p>
            <p className="text-text-muted/60 select-none leading-none">--------------------------------</p>

            <div className="space-y-0.5 pt-1 text-xs sm:text-sm">
              <a
                href="https://pwnvader.com"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-baseline gap-1 sm:gap-2 rounded px-1.5 -mx-1.5 py-0.5 transition-colors hover:bg-bg-elevated/40"
              >
                <span className="font-bold shrink-0 text-orange-400" style={{ minWidth: '12ch' }}>Portfolio:</span>
                <span className="text-text-secondary group-hover:text-text-primary transition-colors truncate">
                  pwnvader.com
                </span>
              </a>

              <a
                href="https://docs.pwnvader.com"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-baseline gap-1 sm:gap-2 rounded px-1.5 -mx-1.5 py-0.5 transition-colors hover:bg-bg-elevated/40"
              >
                <span className="font-bold shrink-0 text-orange-400" style={{ minWidth: '12ch' }}>Docs:</span>
                <span className="text-text-secondary group-hover:text-text-primary transition-colors truncate">
                  docs.pwnvader.com <span className="text-text-muted ml-1.5 sm:ml-2">· writeups</span>
                </span>
              </a>

              <a
                href="https://www.linkedin.com/in/jesuspromero/"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-baseline gap-1 sm:gap-2 rounded px-1.5 -mx-1.5 py-0.5 transition-colors hover:bg-bg-elevated/40"
              >
                <span className="font-bold shrink-0 text-orange-400" style={{ minWidth: '12ch' }}>LinkedIn:</span>
                <span className="text-text-secondary group-hover:text-text-primary transition-colors truncate">
                  jesuspromero <span className="text-text-muted ml-1.5 sm:ml-2">· 2.3K</span>
                </span>
              </a>
              
              <a
                href="https://www.tiktok.com/@pwnvader"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-baseline gap-1 sm:gap-2 rounded px-1.5 -mx-1.5 py-0.5 transition-colors hover:bg-bg-elevated/40"
              >
                <span className="font-bold shrink-0 text-orange-400" style={{ minWidth: '12ch' }}>TikTok:</span>
                <span className="text-text-secondary group-hover:text-text-primary transition-colors truncate">
                  @pwnvader <span className="text-text-muted ml-1.5 sm:ml-2">· 28.3K</span>
                </span>
              </a>
              
              <a
                href="https://github.com/pwnvader"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-baseline gap-1 sm:gap-2 rounded px-1.5 -mx-1.5 py-0.5 transition-colors hover:bg-bg-elevated/40"
              >
                <span className="font-bold shrink-0 text-orange-400" style={{ minWidth: '12ch' }}>GitHub:</span>
                <span className="text-text-secondary group-hover:text-text-primary transition-colors truncate">
                  pwnvader
                </span>
              </a>
              
              <a
                href="https://medium.com/@pwnvader"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-baseline gap-1 sm:gap-2 rounded px-1.5 -mx-1.5 py-0.5 transition-colors hover:bg-bg-elevated/40"
              >
                <span className="font-bold shrink-0 text-orange-400" style={{ minWidth: '12ch' }}>Medium:</span>
                <span className="text-text-secondary group-hover:text-text-primary transition-colors truncate">
                  @pwnvader
                </span>
              </a>
              
              <a
                href="https://tryhackme.com/p/pwnVader"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-baseline gap-1 sm:gap-2 rounded px-1.5 -mx-1.5 py-0.5 transition-colors hover:bg-bg-elevated/40"
              >
                <span className="font-bold shrink-0 text-orange-400" style={{ minWidth: '12ch' }}>TryHackMe:</span>
                <span className="text-text-secondary group-hover:text-text-primary transition-colors truncate">
                  pwnVader <span className="text-text-muted ml-1.5 sm:ml-2">· Top 1%</span>
                </span>
              </a>
              
              <a
                href="https://app.hackthebox.com/users/1247070"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-baseline gap-1 sm:gap-2 rounded px-1.5 -mx-1.5 py-0.5 transition-colors hover:bg-bg-elevated/40"
              >
                <span className="font-bold shrink-0 text-orange-400" style={{ minWidth: '12ch' }}>HackTheBox:</span>
                <span className="text-text-secondary group-hover:text-text-primary transition-colors truncate">
                  pwnVader
                </span>
              </a>
              
              <a
                href="mailto:contacto@pwnvader.com"
                className="group flex items-baseline gap-1 sm:gap-2 rounded px-1.5 -mx-1.5 py-0.5 transition-colors hover:bg-bg-elevated/40"
              >
                <span className="font-bold shrink-0 text-orange-400" style={{ minWidth: '12ch' }}>Email:</span>
                <span className="text-text-secondary group-hover:text-text-primary transition-colors truncate">
                  contacto@pwnvader.com
                </span>
              </a>
            </div>
            
            {/* Color palette row — fastfetch signature */}
            <div className="flex flex-wrap gap-1.5 pt-3" aria-hidden="true">
              <span className="w-5 h-2.5 bg-[#1e1e2e] border border-border/40"></span>
              <span className="w-5 h-2.5 bg-[#f38ba8]"></span>
              <span className="w-5 h-2.5 bg-[#a6e3a1]"></span>
              <span className="w-5 h-2.5 bg-[#f9e2af]"></span>
              <span className="w-5 h-2.5 bg-[#89b4fa]"></span>
              <span className="w-5 h-2.5 bg-[#cba6f7]"></span>
              <span className="w-5 h-2.5 bg-[#94e2d5]"></span>
              <span className="w-5 h-2.5 bg-[#cdd6f4]"></span>
            </div>
          </div>
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
              Una de las tres propiedades del ecosistema <span className="text-orange-400 font-semibold">pwnVader</span>.
              Cada dominio cumple un rol específico — este es el laboratorio donde corren las
              herramientas, los otros dos viven en los enlaces de abajo.
            </p>

            {/* Ecosystem trinity table */}
            <div className="grid gap-2 pt-1">
              <EcosystemRow
                href="https://pwnvader.com"
                domain="pwnvader.com"
                role="portfolio"
                description="Perfil profesional, certificaciones y servicios de pentesting."
              />
              <EcosystemRow
                href="https://hacking.pwnvader.com"
                domain="hacking.pwnvader.com"
                role="lab"
                description="Suite serverless de herramientas tácticas (estás aquí)."
                current
              />
              <EcosystemRow
                href="https://docs.pwnvader.com"
                domain="docs.pwnvader.com"
                role="docs"
                description="Writeups de HTB/THM, metodologías OWASP y guías paso a paso."
              />
            </div>

            <p className="text-text-secondary leading-relaxed pt-3 border-t border-bg-line/40">
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

      {/* Quick links — ecosystem + socials */}
      <section className="space-y-3">
        <div className="text-[10px] uppercase tracking-[0.16em] text-text-muted font-mono">
          Ecosistema pwnVader
        </div>
        <div className="grid gap-3 sm:grid-cols-3 text-sm">
          <QuickLink
            href="https://pwnvader.com"
            label="pwnvader.com"
            sublabel="portfolio"
            icon={<KaliIcon className="h-5 w-5" />}
          />
          <QuickLink
            href="https://docs.pwnvader.com"
            label="docs.pwnvader.com"
            sublabel="writeups · metodologías"
            icon={<ExternalLink className="h-5 w-5" />}
            accent
          />
          <QuickLink
            href="https://github.com/pwnVader"
            label="github.com/pwnVader"
            sublabel="source code"
            icon={<GithubIcon className="h-5 w-5" />}
          />
        </div>
      </section>
    </div>
  );
}

function QuickLink({
  href,
  label,
  sublabel,
  icon,
  accent = false,
}: {
  href: string;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className={cn(
        'flex items-center gap-3 rounded-xl border bg-bg-card px-4 py-3.5 text-text-secondary transition-all duration-300 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-orange-500/40',
        accent
          ? 'border-orange-500/30 hover:border-orange-500/60 hover:text-orange-400 hover:shadow-[0_0_20px_-8px_rgba(251,146,60,0.6)]'
          : 'border-bg-line hover:border-accent/60 hover:text-accent hover:shadow-glow'
      )}
    >
      <span
        className={cn(
          'transition-colors duration-300 flex-shrink-0',
          accent ? 'text-orange-400' : 'text-accent'
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div className="font-mono font-medium truncate">{label}</div>
        {sublabel && (
          <div className="text-[10px] uppercase tracking-wider text-text-muted font-mono mt-0.5 truncate">
            {sublabel}
          </div>
        )}
      </div>
    </a>
  );
}

function EcosystemRow({
  href,
  domain,
  role,
  description,
  current = false,
}: {
  href: string;
  domain: string;
  role: string;
  description: string;
  current?: boolean;
}) {
  const Wrapper = (props: { children: React.ReactNode }) =>
    current ? (
      <div className="grid grid-cols-[auto_1fr] gap-3 items-baseline rounded-md border border-orange-500/30 bg-orange-500/5 px-3 py-2">
        {props.children}
      </div>
    ) : (
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className="grid grid-cols-[auto_1fr] gap-3 items-baseline rounded-md border border-bg-line/60 bg-bg-elevated/20 px-3 py-2 transition hover:border-orange-500/40 hover:bg-orange-500/5"
      >
        {props.children}
      </a>
    );

  return (
    <Wrapper>
      <div className="flex flex-col items-start min-w-0">
        <span
          className={cn(
            'font-mono text-xs font-semibold truncate max-w-full',
            current ? 'text-orange-400' : 'text-text-primary'
          )}
        >
          {domain}
        </span>
        <span className="text-[9px] uppercase tracking-[0.14em] text-text-muted font-mono mt-0.5">
          {role}
          {current && <span className="text-orange-400 ml-1.5">· estás aquí</span>}
        </span>
      </div>
      <p className="text-[11px] text-text-secondary leading-relaxed font-mono">
        {description}
      </p>
    </Wrapper>
  );
}

