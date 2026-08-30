import { SkillsByCategorySchema, type SkillsByCategory } from '../schemas';
import { fetchSkills } from '../notion';
import { fromNotionOrLocal } from './helpers';
import localData from '../../data/content.json';

const DEFAULT_SKILLS: SkillsByCategory = {
  backend: [],
  frontend: [],
  database: [],
  devops: [],
  tools: { backend: [], frontend: [], devops: [] },
};

function getLocalSkills(): SkillsByCategory {
  return SkillsByCategorySchema.parse(localData.skills || DEFAULT_SKILLS);
}

export async function getSkillsByCategory(
  runtimeEnv?: Record<string, string | undefined>
): Promise<SkillsByCategory> {
  return fromNotionOrLocal(
    runtimeEnv,
    'skills',
    fetchSkills,
    getLocalSkills,
  );
}
