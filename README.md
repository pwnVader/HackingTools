# hacking.pwnvader.com — Laboratorio de Ciberseguridad Serverless

Este repositorio contiene el código fuente de **hacking.pwnvader.com**, un laboratorio de herramientas técnicas de ciberseguridad y auditoría web ofensiva/defensiva de alto rendimiento que se ejecutan de manera 100% serverless dentro del navegador. 

Diseñado específicamente para analistas de seguridad, pentesters y entusiastas de CTF, este espacio reúne herramientas tácticas esenciales que optimizan y automatizan tareas rutinarias de reconocimiento, evasión de restricciones de red y encoding.

---

## 🛠️ Arquitectura y Stack Tecnológico

El proyecto está diseñado bajo un modelo completamente estático del lado del cliente, maximizando la privacidad y minimizando la latencia:

- **Core Framework**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) para interfaces reactivas estructuradas y robustas.
- **Build System**: [Vite](https://vitejs.dev/) para empaquetamiento ultrarrápido y óptimo.
- **Estilos & UI**: [Tailwind CSS](https://tailwindcss.com/) configurado bajo una estética premium *Graphite & Ember* y diseño táctico retro-CRT de baja fatiga ocular.
- **Servicios Backend (Serverless)**:
  - **Cloudflare Workers**: Proxy inverso y proxy CORS seguro y ligero para la auditoría y enumeración pasiva de CMS (WordPress, Joomla, Drupal) sin almacenar información en tránsito.
- **Deployment**: [GitHub Pages](https://pages.github.com/) mediante flujos integrados de integración y despliegue continuo (CI/CD) con GitHub Actions.

---

## 🔌 Módulos del Laboratorio

1. **Networking**: Calculadora dinámica de subnetting IPv4 con desglose binario de máscaras y generador interactivo de reverse shells multi-lenguaje.
2. **CMS Audit**: Auditoría pasiva automatizada de gestores de contenido (WordPress, Joomla y Drupal), analizando cabeceras de seguridad HTTP, detectando versiones exactas y enumerando directorios y archivos de configuración desprotegidos.
3. **Encoders & Emojis**: Conversión de recetas de codificación (CyberChef style) y ocultamiento esteganográfico de mensajes invisibles dentro de emojis a través de Unicode tag chars.

---

## 🌐 Ecosistema pwnVader

Para mantener la cohesión técnica e interlinking dentro de nuestra red, puedes navegar entre las diferentes plataformas del ecosistema:

- **[pwnvader.com](https://pwnvader.com)**: **Portafolio Principal** — Mi perfil profesional, certificaciones y trayectoria como Pentester y Consultor de Ciberseguridad.
- **[hacking.pwnvader.com](https://hacking.pwnvader.com)**: **Laboratorio Táctico** — Suite interactiva y serverless de herramientas ofensivas/defensivas *(este repositorio)*.
- **[docs.pwnvader.com](https://docs.pwnvader.com)**: **Base de Conocimientos** — Notas técnicas detalladas de vulnerabilidades, guías paso a paso de OPSEC y writeups de CTFs.

---

## ⚠️ Disclaimer / OPSEC

El uso de las herramientas de este laboratorio con fines ofensivos sobre sistemas sobre los cuales no se cuenta con autorización previa y por escrito es estrictamente ilegal y constituye un delito. 

Este proyecto ha sido desarrollado exclusivamente con propósitos educativos, de investigación técnica y para su uso en auditorías de seguridad autorizadas (Ethical Hacking y Red Teaming). El autor no se hace responsable del mal uso o de los daños derivados de la aplicación práctica de la información y utilidades contenidas en este repositorio.

---

## ✉️ Contacto e Interacción

Si quieres conocer más sobre mis proyectos de ciberseguridad, consultar servicios profesionales de pentesting o interactuar con la comunidad:

- **LinkedIn**: [jesuspromero](https://www.linkedin.com/in/jesuspromero/)
- **GitHub**: [pwnvader](https://github.com/pwnvader)
- **E-Mail**: [contacto@pwnvader.com](mailto:contacto@pwnvader.com)
