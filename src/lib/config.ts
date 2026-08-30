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
  
  const config: NotionConfig = {
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
  
  // Validate Notion config when notion is the data source
  if (dataSource === 'notion') {
    const missing: string[] = [];
    if (!config.token) missing.push('NOTION_TOKEN');
    if (!config.parentPageId) missing.push('NOTION_PARENT_PAGE_ID');
    if (!config.dbProfile) missing.push('NOTION_DB_PROFILE');
    
    if (missing.length > 0) {
      console.error('[Config] Notion data source selected but missing required env vars:', missing);
      console.error('[Config] Either set these variables or change PUBLIC_DATA_SOURCE to "local"');
    }
  }
  
  return config;
}

export function isNotionAvailable(config: NotionConfig): boolean {
  return config.dataSource === 'notion' && !!config.token;
}
