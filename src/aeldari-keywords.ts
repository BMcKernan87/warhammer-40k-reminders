import type {ArmySelection} from './catalog';
import {expandRoster,type RosterInstance} from './roster-instances';
import {AELDARI_SHEETS} from './aeldari-data';
import {aeldariModelLoadouts} from './aeldari-loadouts';

const sheets=new Map(AELDARI_SHEETS.map(s=>[s.unit,s]));
const normal=(s:string)=>s.trim().replaceAll('’',"'").toLowerCase();
export const aeldariHasDetachment=(army:ArmySelection,name:string)=>army.faction==='Aeldari'&&!!army.detachments2026?.some(d=>normal(d)===normal(name));
export const aeldariHarlequinHost=(army:ArmySelection)=>aeldariHasDetachment(army,'Ghosts of the Webway')||aeldariHasDetachment(army,'Serpent’s Brood');
/** Keywords belong to the actual surviving models, not synthetic export aliases. */
export function aeldariKeywords(army:ArmySelection,squad:RosterInstance,model?:string,_roster:readonly RosterInstance[]=expandRoster(army)):Set<string>{
 if(army.faction!=='Aeldari')return new Set();
 const sheet=sheets.get(squad.unit);if(!sheet)return new Set();
 const physical=aeldariModelLoadouts(squad),models=model?[model]:physical.map(m=>m.model);
 const tags=new Set([...sheet.keywords??[],...models.flatMap(name=>sheet.modelKeywords?.[name]??[])]);
 if(!model)tags.add(sheet.unit.toUpperCase());
 if(squad.unit==='Ynnari Kabalite Warriors'&&physical.some(m=>m.items.some(i=>i.toLowerCase()==='phantasm grenade launcher')))tags.add('GRENADES');
 if(aeldariHasDetachment(army,'Devoted of Ynnead')&&tags.has('ASURYANI')&&!tags.has('EPIC HERO'))tags.add('YNNARI');
 if(aeldariHarlequinHost(army)&&squad.unit==='Troupe'||aeldariHasDetachment(army,'Windrider Host')&&squad.unit==='Windriders'||aeldariHasDetachment(army,'Spirit Conclave')&&['Wraithguard','Wraithblades'].includes(squad.unit))tags.add('BATTLELINE');
 for(const [singular,plural] of [['JUMP PACK','JUMP PACKS'],['HARLEQUIN','HARLEQUINS'],['VYPER','VYPERS'],['WARLOCK','WARLOCKS']])if(tags.has(singular)||tags.has(plural)){tags.add(singular);tags.add(plural);}
 return tags;
}
