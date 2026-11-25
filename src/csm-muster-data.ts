import type {ArmySelection} from './catalog';
import type {RosterInstance} from './roster-instances';
import {CSM_SHEETS} from './csm-data';
import {CSM_ALL_SHEETS} from './csm-army-data';

export const CSM_MARKS=['Khorne','Tzeentch','Nurgle','Slaanesh','Chaos Undivided'] as const;
export type CsmMark=typeof CSM_MARKS[number];
const sheets=new Map(CSM_ALL_SHEETS.map(s=>[s.unit,s]));
const native=new Set(CSM_SHEETS.map(s=>s.unit));
export const csmHasDetachment=(army:ArmySelection,name:string)=>army.faction==='Chaos Space Marines'&&!!army.detachments2026?.some(d=>d.toLowerCase()===name.toLowerCase());
export const csmSelectedUpgrade=(army:ArmySelection,squad:RosterInstance)=>army.upgrades2026?.[squad.id]??army.upgrades2026?.[squad.unit]??squad.enhancement;
export const csmHasUpgrade=(army:ArmySelection,squad:RosterInstance,detachment:string,name:string)=>csmHasDetachment(army,detachment)&&csmSelectedUpgrade(army,squad)===name;
export const isCsmPrince=(unit:string)=>unit==='Heretic Astartes Daemon Prince'||unit==='Heretic Astartes Daemon Prince With Wings';
export function csmBaseKeywords(squad:RosterInstance,model?:string):Set<string>{
 const sheet=sheets.get(squad.unit);if(!sheet)return new Set();
 return new Set([...sheet.keywords??[],...(model?sheet.modelKeywords?.[model]??[]:[sheet.unit.toUpperCase(),...Object.values(sheet.modelKeywords??{}).flat()])]);
}
export function csmMarkChoices(army:ArmySelection,squad:RosterInstance):readonly CsmMark[]{
 if(army.faction!=='Chaos Space Marines'||!native.has(squad.unit))return [];
 const tags=csmBaseKeywords(squad),touched=csmHasUpgrade(army,squad,'Cabal of Chaos','Touched by the Warp');
 if(isCsmPrince(squad.unit))return CSM_MARKS.filter(m=>m!=='Chaos Undivided'&&(m!=='Khorne'||!touched));
 if(!csmHasDetachment(army,'Pactbound Zealots')||tags.has('EPIC HERO')||CSM_MARKS.some(m=>tags.has(m.toUpperCase())))return [];
 return CSM_MARKS.filter(m=>m!=='Khorne'||(!tags.has('PSYKER')&&!touched));
}
export function csmChosenMark(army:ArmySelection,squad:RosterInstance):CsmMark|undefined{
 const chosen=squad.csmMark;
 if(chosen&&csmMarkChoices(army,squad).includes(chosen))return chosen;
 const tags=csmBaseKeywords(squad);
 return CSM_MARKS.find(m=>tags.has(m.toUpperCase()));
}
export function csmMarksCompatible(army:ArmySelection,a:RosterInstance,b:RosterInstance):boolean{
 if(!csmHasDetachment(army,'Pactbound Zealots'))return true;
 const ma=csmChosenMark(army,a),mb=csmChosenMark(army,b);
 return !!ma&&ma===mb;
}
export function csmAdditionalBodyguards(army:ArmySelection,leader:RosterInstance):readonly string[]{
 return leader.unit==='Chaos Lord with Jump Pack'&&csmHasUpgrade(army,leader,'Nightmare Hunt','Sorrowscent Vulture')?['Warp Talons']:[];
}
