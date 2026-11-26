import type {Faction} from './catalog';
import {CHAOS_KNIGHT_SHEETS} from './chaos-knights-data.generated';

const dreadblades=CHAOS_KNIGHT_SHEETS.filter(s=>s.keywords?.includes('CHAOS KNIGHTS')&&(s.keywords.includes('TITANIC')||s.keywords.includes('WAR DOG')));
const names=new Set(dreadblades.map(s=>s.unit));
export const isDreadblade=(unit:string)=>names.has(unit);
export const dreadbladesFor=(faction:Faction)=>dreadblades.map(s=>({...s,faction}));
