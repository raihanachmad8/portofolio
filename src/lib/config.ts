export interface NotionConfig {
  token: string;
  parentPageId: string;
  dbProfile: string;
  dbProjects: string;
  dbSkills: string;
  dbExperience: string;
  dbBlog: string;
  dbTicker: string;
  dataSource: 'notion' | 'local';
}

export function resolveConfig(env: Record<string, string | undefined> = {}): NotionConfig {
  const raw = env.PUBLIC_DATA_SOURCE || 'local';
  const dataSource = raw === 'notion' ? 'notion' : 'local';
  return {
    token: env.NOTION_TOKEN || '',
    parentPageId: env.NOTION_PARENT_PAGE_ID || '',
    dbProfile: env.NOTION_DB_PROFILE || '',
    dbProjects: env.NOTION_DB_PROJECTS || '',
    dbSkills: env.NOTION_DB_SKILLS || '',
    dbExperience: env.NOTION_DB_EXPERIENCE || '',
    dbBlog: env.NOTION_DB_BLOG || '',
    dbTicker: env.NOTION_DB_TICKER || '',
    dataSource,
  };
}

export function isNotionAvailable(config: NotionConfig): boolean {
  return config.dataSource === 'notion' && !!config.token;
}
