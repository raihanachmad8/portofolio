import { TickerItemSchema, type TickerItem } from '../schemas';
import { fetchTicker } from '../notion';
import { fromNotionOrLocal } from './helpers';
import localData from '../../data/content.json';

function getLocalTicker(): TickerItem[] {
  return (localData.tickerItems || []).map((text: string, index: number) =>
    TickerItemSchema.parse({ icon: '', text, order: index })
  );
}

export async function getTicker(
  runtimeEnv?: Record<string, string | undefined>
): Promise<TickerItem[]> {
  return fromNotionOrLocal(
    runtimeEnv,
    'ticker',
    fetchTicker,
    getLocalTicker,
  );
}
