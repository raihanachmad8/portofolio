import { getCollection } from 'astro:content';
import { ExperienceSchema, type Experience } from '../schemas';
import { fetchExperience } from '../notion';
import { fromNotionOrLocal } from './helpers';

function getLocalExperience(): Experience[] {
  return getCollection('experience')
    .map((e) => ({ ...e.data, id: e.id }))
    .map((e) => ExperienceSchema.parse(e))
    .sort((a, b) => a.order - b.order);
}

export async function getExperience(
  runtimeEnv?: Record<string, string | undefined>
): Promise<Experience[]> {
  return fromNotionOrLocal(
    runtimeEnv,
    'experience',
    async (cfg) => fetchExperience(cfg),
    getLocalExperience,
  );
}
