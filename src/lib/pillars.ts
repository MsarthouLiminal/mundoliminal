export type PillarCode = 'P1' | 'P2' | 'P3' | 'P4' | 'P5';

export interface Pillar {
  code: PillarCode;
  slug: string;
  label: string;
  description: string;
}

export const PILLARS: readonly Pillar[] = [
  {
    code: 'P1',
    slug: 'geopolitica',
    label: 'Geopolítica',
    description: '[PLACEHOLDER: descripción del pilar P1 Geopolítica]',
  },
  {
    code: 'P2',
    slug: 'tecnologia',
    label: 'Tecnología',
    description: '[PLACEHOLDER: descripción del pilar P2 Tecnología]',
  },
  {
    code: 'P3',
    slug: 'economia',
    label: 'Economía',
    description: '[PLACEHOLDER: descripción del pilar P3 Economía]',
  },
  {
    code: 'P4',
    slug: 'cultura',
    label: 'Cultura',
    description: '[PLACEHOLDER: descripción del pilar P4 Cultura]',
  },
  {
    code: 'P5',
    slug: 'uruguay-latam',
    label: 'Uruguay / LatAm',
    description: '[PLACEHOLDER: descripción del pilar P5 Uruguay / LatAm]',
  },
] as const;

export const PILLAR_BY_SLUG: Record<string, Pillar> = Object.fromEntries(
  PILLARS.map((p) => [p.slug, p]),
);

export const PILLAR_BY_CODE: Record<PillarCode, Pillar> = Object.fromEntries(
  PILLARS.map((p) => [p.code, p]),
) as Record<PillarCode, Pillar>;
