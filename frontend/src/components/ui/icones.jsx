/* Ícones de linha usados nos formulários. Herdam a cor do elemento pai. */

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  'aria-hidden': 'true',
}

export function IconeUsuario() {
  return (
    <svg {...base}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20c.9-3.8 3.9-5.8 7.5-5.8s6.6 2 7.5 5.8" strokeLinecap="round" />
    </svg>
  )
}

export function IconeEmail() {
  return (
    <svg {...base}>
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
      <path d="m3 7 8.1 5.4a2 2 0 0 0 2.2 0L21.5 7" strokeLinecap="round" />
    </svg>
  )
}

export function IconeSenha() {
  return (
    <svg {...base}>
      <rect x="4" y="10.5" width="16" height="10.5" rx="2.5" />
      <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" strokeLinecap="round" />
    </svg>
  )
}

export function IconeOlho({ aberto }) {
  return (
    <svg {...base}>
      <path d="M2.2 12S6 5.5 12 5.5 21.8 12 21.8 12 18 18.5 12 18.5 2.2 12 2.2 12Z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3.2" />
      {!aberto && <path d="m4 20 16-16" strokeLinecap="round" />}
    </svg>
  )
}
