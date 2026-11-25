import type {Datasheet2026} from './datasheets-2026';
import {ASTRA_NATIVE_ATTACHMENTS,ASTRA_NATIVE_EXTRA,ASTRA_EXTRA_CARDS} from './astra-militarum-data.generated';
import {GSC_ALLIED_SHEETS} from './gsc-allies-data.generated';
import {GUARD_CARDS} from './brood-brother-cards.generated';

export const ASTRA_PACK='https://assets.warhammer-community.com/eng_30-09_wh40k_faction_pack_astra_militarum-1hevkhdpmv-stfkch2tsz.pdf';
const shared=GSC_ALLIED_SHEETS.filter(s=>s.keywords?.includes('ASTRA MILITARUM')).map((sheet):Datasheet2026=>({
 ...sheet,faction:'Astra Militarum',...ASTRA_NATIVE_ATTACHMENTS[sheet.unit],
}));
export const ASTRA_SHEETS:readonly Datasheet2026[]=[...shared,...ASTRA_NATIVE_EXTRA].sort((a,b)=>a.unit.localeCompare(b.unit,'en'));
export const ASTRA_CARDS={...GUARD_CARDS,...ASTRA_EXTRA_CARDS};
export const ASTRA_UNITS=ASTRA_SHEETS.map(s=>s.unit);
