import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const pillarCode = z.enum(['P1', 'P2', 'P3', 'P4', 'P5']);

const episodes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/episodes' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    pillar: pillarCode,
    platform: z.enum(['youtube', 'spotify']),
    url: z.string().url(),
    duration: z.string().optional(),
    guests: z.array(z.string()).optional(),
    draft: z.boolean().default(false),
  }),
});

const columns = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/columns' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    pillar: pillarCode,
    url: z.string().url(),
    publication: z.string().default('Substack'),
    draft: z.boolean().default(false),
  }),
});

export const collections = { episodes, columns };
