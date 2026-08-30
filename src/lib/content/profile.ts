import { ProfileSchema, type Profile } from '../schemas';
import { fetchProfile } from '../notion';
import { fromNotionOrLocal } from './helpers';
import { getAllProjects } from './projects';
import { getSkillsByCategory } from './skills';
import { getExperience } from './experience';
import localData from '../../data/content.json';

const OPEN_TO_OPPORTUNITIES = 'Open to opportunities';

function getLocalProfile(): Profile {
  return ProfileSchema.parse(localData.profile || {});
}

function generateTickerItems(profile: Profile): string[] {
  const items: string[] = [];
  if (profile.location) items.push(profile.location);
  if (profile.available) items.push(OPEN_TO_OPPORTUNITIES);
  if (profile.roleTitle) items.push(profile.roleTitle);
  return items.filter(Boolean);
}

function generateFacts(projectCount: number, skillCount: number, experienceMonths: number) {
  return [
    { value: projectCount, label: 'Projects Completed' },
    { value: skillCount, label: 'Technologies' },
    { value: experienceMonths, label: 'Months Experience' },
  ].filter((f) => f.value > 0);
}

/**
 * Fetches and enriches the profile with derived statistics.
 *
 * This function intentionally calls getAllProjects(), getSkillsByCategory(),
 * and getExperience() to compute aggregated facts (project count, skill count,
 * experience months). This is profile-enrichment logic — the profile UI needs
 * these stats, and co-locating the aggregation here keeps the data layer as the
 * single source of truth rather than duplicating the logic in a presentation
 * component.
 */
export async function getProfile(
  runtimeEnv?: Record<string, string | undefined>
): Promise<Profile> {
  const profile = await fromNotionOrLocal(
    runtimeEnv,
    'profile',
    fetchProfile,
    getLocalProfile,
  );

  const projects = await getAllProjects(runtimeEnv);
  const skills = await getSkillsByCategory(runtimeEnv);
  const experience = await getExperience(runtimeEnv);

  const { tools: _tools, ...skillCategories } = skills;
  const skillCount = Object.values(skillCategories).flat().length;
  const experienceMonths = experience.reduce((sum, e) => {
    if (e.period) {
      const match = e.period.match(/(\d+)\s*month/i);
      if (match) return sum + Number(match[1]);
    }
    return sum;
  }, 0);

  return ProfileSchema.parse({
    ...profile,
    tickerItems: generateTickerItems(profile),
    facts: generateFacts(projects.length, skillCount, experienceMonths),
  });
}
