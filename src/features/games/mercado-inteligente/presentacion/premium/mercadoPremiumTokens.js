export const mercadoPremiumTokens = Object.freeze({
  color: Object.freeze({
    mission: '#28784a',
    missionLight: '#68c85e',
    buy: '#35b84a',
    buyDark: '#197a32',
    woodDark: '#70401f',
    wood: '#a66532',
    woodLight: '#f2c487',
    parchment: '#fff4d8',
    parchmentStrong: '#ffe4a3',
    coin: '#ffd34d',
    coinEdge: '#d58a16',
    ink: '#422713',
    inkSoft: '#76502f',
    white: '#ffffff',
    danger: '#e95646',
    exact: '#35b84a',
    neutral: '#ed9c32',
    shadow: 'rgba(54, 30, 12, 0.3)',
    glass: 'rgba(255, 248, 225, 0.94)',
  }),
  radius: Object.freeze({
    small: '12px',
    medium: '18px',
    large: '26px',
    pill: '999px',
  }),
  shadow: Object.freeze({
    panel: '0 7px 0 rgba(91, 49, 20, 0.24), 0 13px 24px rgba(54, 30, 12, 0.22)',
    raised: '0 6px 0 rgba(35, 94, 43, 0.34), 0 11px 20px rgba(54, 30, 12, 0.22)',
  }),
  typography: Object.freeze({
    family: '"Trebuchet MS", "Arial Rounded MT Bold", sans-serif',
    weightStrong: '900',
  }),
});

const aNombreVariable = (grupo, nombre) =>
  `--mercado-${grupo}-${nombre.replace(/[A-Z]/g, (letra) => `-${letra.toLowerCase()}`)}`;

export function crearVariablesCssPremium(tokens = mercadoPremiumTokens) {
  return Object.entries(tokens)
    .filter(([, valores]) => valores && typeof valores === 'object')
    .flatMap(([grupo, valores]) =>
      Object.entries(valores).map(
        ([nombre, valor]) => `${aNombreVariable(grupo, nombre)}:${valor};`,
      ),
    )
    .join('');
}
