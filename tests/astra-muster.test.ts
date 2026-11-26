// @vitest-environment node
import {expect,it} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection,type ArmySelection} from '../src/catalog';
import {astraMusterUnits,astraMilitarumKeywords,astraWarlordCandidates,resolvedAstraWarlord} from '../src/astra-muster-data';
import {astraUnitLimit,selectAstraWarlord,setAstraCharacter} from '../src/astra-muster';
import {astraProtectorHosts,setAstraProtector} from '../src/astra-protectors';
import {astraFormationGroups,astraCargoFormations,astraEmbarkationReminders} from '../src/astra-transports';
import {ASTRA_SHEETS} from '../src/astra-militarum-data';
import {rosterCost2026,verifiedUnitSizes2026} from '../src/datasheets-2026';
import {knightJoinedBodyguard} from '../src/leader-eligibility';
import {autoAttachUnambiguousInstances,individualArmy,removeRosterInstance,setInstanceAttachment,setInstanceModelCount} from '../src/roster-instances';
import {rosterFindings} from '../src/roster-findings';
import {availableUpgrades2026,selectUpgrade2026} from '../src/upgrades-2026';

const build=(units:string[],detachment='Combined Arms',size:ArmySelection['battleSize2026']='Strike Force')=>{
 let army=individualArmy({...newSelection('Astra Militarum'),battleSize2026:size,detachments2026:[detachment]});
 for(const unit of units)army=addSelectionUnit(army,unit);
 return army;
};
const id=(unit:string)=>unit+'#1';
const find=(a:ArmySelection,unit:string)=>a.instances!.find(s=>s.unit===unit)!;
const errors=(a:ArmySelection)=>rosterFindings(a).filter(r=>r.severity==='error').map(r=>r.code);
const eligible=(a:ArmySelection,carrier:string)=>astraCargoFormations(a,find(a,carrier)).map(g=>g.root.unit);

it('musters and calculates every verified size at the printed next points bracket for each of the 72 current sheets',()=>{
 expect(ASTRA_SHEETS).toHaveLength(72);
 for(const sheet of ASTRA_SHEETS){
  const a=build([sheet.unit]),sizes=verifiedUnitSizes2026(a,sheet.unit)!;
  for(const size of sizes){
   const configured=setInstanceModelCount(a,id(sheet.unit),size);
   expect(validateSelection(configured)).toBe(true);
   const entry=rosterCost2026(configured).entries[0],bracket=sheet.sizes.find(n=>n>=size)!;
   expect(entry.points).toBe(sheet.pointsBySize![bracket]+(entry.wargearPoints??0));
  }
 }
});
it('permits two Leaders on the four specified bodyguards, never two command squads or a second Leader on Kasrkin',()=>{
 for(const [body,command] of [['Cadian Shock Troops','Cadian Command Squad'],['Death Korps Of Krieg','Krieg Command Squad'],['Catachan Jungle Fighters','Catachan Command Squad'],['Tempestus Scions','Militarum Tempestus Command Squad']]){
  let a=build([body,command,command,'Commissar','Primaris Psyker']);
  a=setInstanceAttachment(a,id(command),id(body));a=setInstanceAttachment(a,id('Commissar'),id(body));
  expect(knightJoinedBodyguard(a,find(a,command))?.unit).toBe(body);
  expect(()=>setInstanceAttachment(a,id('Primaris Psyker'),id(body))).toThrow();
  a=setInstanceAttachment(a,id('Commissar'),null);
  expect(()=>setInstanceAttachment(a,command+'#2',id(body))).toThrow();
  a=setInstanceAttachment(a,id(command),null);a=setInstanceAttachment(a,id('Primaris Psyker'),id(body));a=setInstanceAttachment(a,id('Commissar'),id(body));
  expect(astraFormationGroups(a).find(g=>g.root.unit===body)?.members).toHaveLength(3);
 }
 let kas=build(['Kasrkin','Commissar','Cadian Castellan']);
 kas=setInstanceAttachment(kas,id('Commissar'),id('Kasrkin'));
 expect(()=>setInstanceAttachment(kas,id('Cadian Castellan'),id('Kasrkin'))).toThrow();
});
it('joins one Loyal Protector to the Command Squad, retains it after separating from a bodyguard, and detects missing hosts',()=>{
 let a=build(['Ogryn Bodyguard','Nork Deddog','Cadian Command Squad','Cadian Shock Troops','Ursula Creed']);
 expect(errors(a)).toContain('loyal-protector-required');
 a=setAstraProtector(a,id('Nork Deddog'),id('Cadian Command Squad'));
 expect(astraProtectorHosts(a,id('Ogryn Bodyguard'))).toEqual([]);
 a=setInstanceAttachment(a,id('Cadian Command Squad'),id('Cadian Shock Troops'));a=setInstanceAttachment(a,id('Ursula Creed'),id('Cadian Shock Troops'));
 expect(astraFormationGroups(a).find(g=>g.root.unit==='Cadian Shock Troops')?.members.map(s=>s.unit).sort()).toEqual(['Cadian Shock Troops','Cadian Command Squad','Nork Deddog','Ursula Creed'].sort());
 expect(validateSelection(JSON.parse(JSON.stringify(a)))).toBe(true);
 a=removeRosterInstance(a,id('Cadian Shock Troops'));
 expect(find(a,'Nork Deddog').retinueTo).toBe(id('Cadian Command Squad'));
 a=removeRosterInstance(a,id('Cadian Command Squad'));
 expect(find(a,'Nork Deddog').retinueTo).toBeUndefined();
 expect(astraWarlordCandidates(a).map(s=>s.unit)).toEqual(['Ursula Creed']);
 const only=autoAttachUnambiguousInstances(build(['Nork Deddog','Krieg Command Squad']));
 expect(find(only,'Nork Deddog').retinueTo).toBe(id('Krieg Command Squad'));
});
it('requires the correct seats and model faction for every passenger and transfers the Protector transport exception',()=>{
 let a=build(['Taurox Prime','Chimera','Stormlord','Militarum Tempestus Command Squad','Tempestus Scions','Ogryn Bodyguard','Ogryn Squad','Cyclops Demolition Vehicle','Cadian Command Squad','Commissar']);
 a=setAstraProtector(a,id('Ogryn Bodyguard'),id('Militarum Tempestus Command Squad'));
 expect(eligible(a,'Taurox Prime')).toEqual(expect.arrayContaining(['Militarum Tempestus Command Squad','Tempestus Scions','Commissar']));
 expect(eligible(a,'Taurox Prime')).not.toEqual(expect.arrayContaining(['Cadian Command Squad']));
 expect(eligible(a,'Chimera')).toContain('Cyclops Demolition Vehicle');
 a=setInstanceAttachment(a,id('Militarum Tempestus Command Squad'),id('Tempestus Scions'));
 expect(eligible(a,'Taurox Prime')).not.toContain('Tempestus Scions');
 expect(eligible(a,'Stormlord')).toContain('Tempestus Scions');
 a=setInstanceModelCount(a,id('Ogryn Squad'),6);
 expect(eligible(a,'Chimera')).not.toContain('Ogryn Squad');
 expect(eligible(a,'Stormlord')).toContain('Ogryn Squad');
 expect(astraEmbarkationReminders(a).find(r=>r.title==='Taurox Prime#1 · Declare passengers')?.summary).not.toContain('Tempestus Scions#1');
});
it('limits copies by current Warlord, conditional faction keywords and both Graves forms',()=>{
 let a=build(['Militarum Tempestus Command Squad','Ursula Creed','Tempestus Scions'],'Bridgehead Strike','Incursion');
 a=selectAstraWarlord(a,id('Militarum Tempestus Command Squad'));
 expect(astraUnitLimit(a,'Tempestus Scions')).toBe(4);
 a=selectAstraWarlord(a,id('Ursula Creed'));expect(astraUnitLimit(a,'Tempestus Scions')).toBe(2);
 a=addSelectionUnit(a,'Lord Solar Leontus');expect(resolvedAstraWarlord(a)?.unit).toBe('Lord Solar Leontus');
 a=addSelectionUnit(a,'Commissar Graves');expect(astraUnitLimit(a,'Commissar Graves on Foot')).toBe(0);
 a=addSelectionUnit(a,'Commissar Graves on Foot');expect(errors(a)).toContain('graves-forms');
 const b=build(['Scout Sentinels','Rogal Dorn Battle Tank'],'Armoured Infantry');
 expect(astraMilitarumKeywords(b,find(b,'Scout Sentinels')).has('ARMOURED SKIRMISHER')).toBe(true);
 expect(astraMilitarumKeywords(b,find(b,'Rogal Dorn Battle Tank')).has('ARMOURED SKIRMISHER')).toBe(false);
});
it('only promotes Guard Titanic units and charges the selected Character, restoring the legal state when unchecked',()=>{
 let a=build(['Baneblade','Knight Castellan'],'Steel Hammer');
 expect(astraWarlordCandidates(a)).toEqual([]);
 expect(()=>setAstraCharacter(a,id('Knight Castellan'),true)).toThrow();
 a=setAstraCharacter(a,id('Baneblade'),true);
 expect(resolvedAstraWarlord(a)?.id).toBe(id('Baneblade'));
 a=selectUpgrade2026(a,id('Baneblade'),'Battalion Commander');
 expect(rosterCost2026(a).entries[0].enhancementPoints).toBe(30);
 expect(astraMilitarumKeywords(a,find(a,'Baneblade')).has('OFFICER')).toBe(true);
 a=setAstraCharacter(a,id('Baneblade'),false);
 expect(availableUpgrades2026(a,find(a,'Baneblade'))).toEqual([]);
 expect(validateSelection(a)).toBe(true);
});
it('separates the two Priest cards, validates allied caps, permits an Inquisitor in the Guard bodyguard transport, and enforces Commissar upgrade routes',()=>{
 let a=build(['Ministorum Priest','Ministorum Priest (Imperial Agents)','Commissar','Bullgryn Squad','Inquisitor','Cadian Shock Troops','Chimera'],'Abhuman Auxiliaries','Incursion');
 expect(errors(a)).toContain('assigned-agents-character');
 expect(astraWarlordCandidates(a).map(s=>s.unit)).toContain('Ministorum Priest');
 expect(astraWarlordCandidates(a).map(s=>s.unit)).not.toContain('Ministorum Priest (Imperial Agents)');
 expect(astraMusterUnits(a)).not.toContain('Warhound Titan');
 expect(()=>setInstanceAttachment(a,id('Commissar'),id('Bullgryn Squad'))).toThrow();
 a=selectUpgrade2026(a,id('Commissar'),'Exemplar of Duty');
 a=setInstanceAttachment(a,id('Commissar'),id('Bullgryn Squad'));a=setInstanceAttachment(a,id('Inquisitor'),id('Cadian Shock Troops'));
 expect(eligible(a,'Chimera')).toEqual(expect.arrayContaining(['Bullgryn Squad','Cadian Shock Troops']));
 expect(astraMilitarumKeywords(a,find(a,'Bullgryn Squad')).has('ABHUMAN')).toBe(true);
 a=selectUpgrade2026(a,id('Commissar'),null);expect(find(a,'Commissar').attachedTo).toBeUndefined();
});
it('requires distinct formations for all dedicated transports and excludes embarked mounted and artillery models',()=>{
 let a=build(['Cadian Shock Troops','Lord Solar Leontus','Chimera','Chimera','Artillery Team']);
 expect(errors(a)).toContain('dedicated-transport-passengers');
 a=setInstanceAttachment(a,id('Lord Solar Leontus'),id('Cadian Shock Troops'));
 expect(eligible(a,'Chimera')).toEqual([]);
});
it('reopens a legal 1000-point Bridgehead army with an over-capacity command formation and a second Scions section that fits',()=>{
 let a=build(['Militarum Tempestus Command Squad','Tempestus Scions','Tempestus Scions','Nork Deddog','Taurox Prime','Chimera','Kasrkin','Cadian Castellan','Catachan Jungle Fighters','Leman Russ Battle Tank','Ratlings','Death Riders'],'Bridgehead Strike','Incursion');
 a=setInstanceModelCount(a,id('Ratlings'),10);
 a=setInstanceAttachment(a,id('Militarum Tempestus Command Squad'),id('Tempestus Scions'));
 a=setInstanceAttachment(a,id('Cadian Castellan'),id('Kasrkin'));
 a=setAstraProtector(a,id('Nork Deddog'),id('Militarum Tempestus Command Squad'));
 a=selectAstraWarlord(a,id('Militarum Tempestus Command Squad'));
 const saved=JSON.parse(JSON.stringify(a));expect(validateSelection(saved)).toBe(true);
 expect(rosterCost2026(saved).total).toBe(1000);expect(errors(saved)).toEqual([]);
 expect(astraCargoFormations(saved,find(saved,'Taurox Prime')).map(g=>g.root.id)).toEqual(['Tempestus Scions#2']);
});
it('reopens a legal 2000-point armoured army with two command elements, an Ogryn, an agent and a Freeblade',()=>{
 let a=build(['Ursula Creed','Cadian Command Squad','Ogryn Bodyguard','Cadian Shock Troops','Stormlord','Leman Russ Commander','Armiger Warglaive','Inquisitor','Rogal Dorn Battle Tank','Basilisk','Hellhound','Leman Russ Battle Tank','Scout Sentinels','Catachan Jungle Fighters','Bullgryn Squad'],'Hammer of the Emperor');
 a=setInstanceModelCount(a,id('Cadian Shock Troops'),20);
 a=setInstanceAttachment(a,id('Cadian Command Squad'),id('Cadian Shock Troops'));
 a=setInstanceAttachment(a,id('Ursula Creed'),id('Cadian Shock Troops'));
 a=setAstraProtector(a,id('Ogryn Bodyguard'),id('Cadian Command Squad'));
 a=setInstanceAttachment(a,id('Inquisitor'),id('Catachan Jungle Fighters'));
 a=selectAstraWarlord(a,id('Ursula Creed'));
 const saved=JSON.parse(JSON.stringify(a));expect(validateSelection(saved)).toBe(true);
 expect(eligible(saved,'Stormlord')).toEqual(expect.arrayContaining(['Cadian Shock Troops','Catachan Jungle Fighters','Bullgryn Squad']));
 expect(rosterCost2026(saved).total).toBe(2000);expect(errors(saved)).toEqual([]);
});
