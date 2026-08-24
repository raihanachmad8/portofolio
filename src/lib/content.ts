import snapshot from '../content/notion-snapshot.json';
import { ProjectSchema, SkillSchema, ExperienceSchema, BlogSchema } from './schemas';

export async function getAllProjects() {
  return (snapshot.projects || [])
    .map(p => ProjectSchema.parse(p))
    .sort((a, b) => a.order - b.order);
}

export async function getFeaturedProjects() {
  return getAllProjects().then(projects => projects.filter(p => p.featured));
}

export async function getProjectBySlug(slug: string) {
  const projects = await getAllProjects();
  return projects.find(p => p.slug === slug);
}

export async function getAllPosts() {
  return (snapshot.blog || [])
    .map(b => BlogSchema.parse(b))
    .sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime());
}

export async function getRecentPosts(limit = 3) {
  return getAllPosts().then(posts => posts.slice(0, limit));
}

export async function getPostBySlug(slug: string) {
  const posts = await getAllPosts();
  return posts.find(p => p.slug === slug);
}

export async function getSkillsByCategory() {
  const skills = (snapshot.skills || []).map(s => SkillSchema.parse(s));
  return skills.reduce((acc, skill) => {
    if (!acc[skill.category]) acc[skill.category] = [];
    acc[skill.category].push(skill);
    return acc;
  }, {} as Record<string, typeof skills>);
}

export async function getExperience() {
  return (snapshot.experience || [])
    .map(e => ExperienceSchema.parse(e))
    .sort((a, b) => a.order - b.order);
}

export async function getSettings() {
  return snapshot.settings || {};
}
