import {describe,expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import type {RosterInstance} from '../src/roster-instances';
import {spaceMarineNativeSheets,spaceMarineSheet} from '../src/space-marines-data';
import {spaceMarineMusterUnits} from '../src/space-marines-muster-data';
import {spaceMarineLoadout,spaceMarineModelLoadouts} from '../src/space-marines-loadouts';
import {spaceMarineKeywords} from '../src/space-marines-keywords';
import {spaceMarineFormations} from '../src/space-marines-formations';
import {chapterSplitPlans} from '../src/space-marine-chapters-splits';
import {selectedSpaceMarineUpgrade} from '../src/space-marines-upgrades';
import {CHAPTER_DETACHMENTS,CHAPTER_TRAITS,CHAPTER_STRATAGEMS,CHAPTER_UPGRADES} from '../src/space-marine-chapters-detachments.generated';
import {chapterDetachmentReminders,chapterUpgradeReminders} from '../src/space-marine-chapters-detachments';
import {currentChapterDetachment,chapterSelectedDetachments,eligibleChapterUpgrades,selectedChapterUpgrade,chapterUpgradeBearerModels,chapterScoutRange,chapterHasDeepStrike,chapterFirstTurnIngress,chapterFormationHasFightsFirst} from '../src/space-marine-chapters-upgrades';

const id=(name:string,n=1)=>name+'#'+n;
function force(faction:ArmySelection['faction'],detachments2026:string[],...units:string[]):ArmySelection{
 const counts:Record<string,number>={},instances=units.map(unit=>({unit,id:id(unit,counts[unit]=(counts[unit]??0)+1),models:spaceMarineSheet(unit,faction)?.sizes[0]}));
 return {...newSelection(faction),detachments2026,units:counts,instances};
}
const edit=(a:ArmySelection,name:string,changes:Partial<RosterInstance>):ArmySelection=>({...a,instances:a.instances!.map(s=>s.id===id(name)?{...s,...changes}:s)});
const join=(a:ArmySelection,leader:string,body:string)=>edit(a,leader,{attachedTo:id(body)});
const equip=(a:ArmySelection,name:string,upgrade:string):ArmySelection=>({...a,upgrades2026:{...a.upgrades2026,[id(name)]:upgrade}});
const squad=(a:ArmySelection,name:string)=>a.instances!.find(s=>s.id===id(name))!;
const rows=(a:ArmySelection,roster:readonly RosterInstance[]=a.instances!)=>[...chapterDetachmentReminders(a,roster),...chapterUpgradeReminders(a,roster)];
const by=(a:ArmySelection,rule:string,roster?:readonly RosterInstance[])=>rows(a,roster).filter(r=>r.sourceRuleId===rule);
const summary=(a:ArmySelection,rule:string,roster?:readonly RosterInstance[])=>by(a,rule,roster).map(r=>r.summary).join('\n');
const targets=(a:ArmySelection,rule:string,roster?:readonly RosterInstance[])=>new Set(by(a,rule,roster).flatMap(r=>r.units??[]));
const options=(a:ArmySelection,name:string)=>eligibleChapterUpgrades(a,name,id(name));
const allFor=(faction:ArmySelection['faction'],det:string)=>{
 const legal=new Set(spaceMarineMusterUnits(force(faction,[det])));
 return spaceMarineNativeSheets(faction).filter(s=>legal.has(s.unit)).map(s=>s.unit);
};
const windows=(a:ArmySelection,rule:string)=>by(a,rule).filter(r=>r.title.endsWith(' CP')).map(r=>[r.window,r.turn,r.timing]);
const phases=['Command','Movement','Shooting','Charge','Fight'];
const split=(a:ArmySelection,unit:string)=>edit(a,unit,{knightGear:{...squad(a,unit).knightGear,'Battle formation':'Split unit'}});

describe('current chapter-only Space Marines detachment inventories',()=>{
 it('reconciles the twelve current detachments, points, tags and repeatable upgrades',()=>{
  expect(CHAPTER_DETACHMENTS).toHaveLength(12);expect(CHAPTER_TRAITS).toHaveLength(12);expect(CHAPTER_STRATAGEMS).toHaveLength(48);expect(CHAPTER_UPGRADES).toHaveLength(32);
  for(const faction of ['Black Templars','Blood Angels','Dark Angels','Space Wolves'])expect(CHAPTER_DETACHMENTS.filter(d=>d.faction===faction)).toHaveLength(3);
  expect(CHAPTER_DETACHMENTS.find(d=>d.name==='Angelic Inheritors')?.dp).toBe(3);
  expect(CHAPTER_DETACHMENTS.filter(d=>'tag' in d).map(d=>[d.name,d.tag])).toEqual([['Wrath of the Rock','Terminator'],['Champions of Fenris','Terminator']]);
  expect(CHAPTER_UPGRADES.filter(u=>u.repeatable).map(u=>[u.name,u.points])).toEqual([['Righteous Fervour',15],['Fervent Exemplars',10],['Inheritors of Sigismund',15],['Thundercowl Turbines',15],['Nightforged Battery',10]]);
  expect(CHAPTER_UPGRADES.find(u=>u.name==='Oathbound Exemplar')?.repeatable).toBe(false);
  expect(CHAPTER_UPGRADES.find(u=>u.name==='Wolf-Touched')).toMatchObject({points:15,leaderTo:['Wulfen','Wulfen With Storm Shields']});
  expect([...CHAPTER_STRATAGEMS,...CHAPTER_UPGRADES,...CHAPTER_TRAITS].every(r=>/^[0-9a-f]{64}$/.test(r.sourceHash))).toBe(true);
 });
 it.each(CHAPTER_DETACHMENTS)('executes every current trait and Stratagem in $name',det=>{
  const a=force(det.faction,[det.name],...allFor(det.faction,det.name)),result=chapterDetachmentReminders(a);
  for(const rule of [...CHAPTER_TRAITS,...CHAPTER_STRATAGEMS].filter(r=>r.detachment===det.name))expect(result.some(r=>r.sourceRuleId===rule.id),rule.name).toBe(true);
  expect(new Set(result.map(r=>r.id)).size).toBe(result.length);
  expect(result.every(r=>r.units?.length&&r.source.startsWith('https://')&&!/not yet implemented|review.*rules/i.test(r.summary))).toBe(true);
 });
 it.each(CHAPTER_UPGRADES)('implements selected $name in $detachment',u=>{
  let a=force(u.faction,[u.detachment],...allFor(u.faction,u.detachment));
  const bearer=a.instances!.find(s=>options(a,s.unit).some(o=>o.id===u.id))?.unit;
  expect(bearer,'eligible actual bearer for '+u.name).toBeDefined();
  a=equip(a,bearer!,u.name);
  expect(selectedChapterUpgrade(a,squad(a,bearer!))?.id).toBe(u.id);
  expect(by(a,u.id).length,u.name).toBeGreaterThan(0);
  const result=rows(a);expect(new Set(result.map(r=>r.id)).size).toBe(result.length);
 });
 it('normalizes apostrophes and rejects foreign factions, detachments and missing instances',()=>{
  const a=force('Black Templars',["marshal's household",'Marshal’s Household'],'Sword Brethren Squad');
  expect(currentChapterDetachment(" MARSHAL'S HOUSEHOLD ")).toBe('Marshal’s Household');
  expect(chapterSelectedDetachments(a)).toEqual(['Marshal’s Household']);
  expect(rows(force('Blood Angels',['Marshal’s Household'],'Captain'))).toEqual([]);
  expect(rows({...a,faction:'Space Marines'})).toEqual([]);expect(rows({...a,faction:'Necrons'})).toEqual([]);
  expect(eligibleChapterUpgrades(a,'Sword Brethren Squad','missing')).toEqual([]);
 });
});

describe('actual chapter upgrade bearers and surviving formation grants',()=>{
 it('allows only the actual Company Heroes Ancient to bear ordinary enhancements',()=>{
  const a=force('Black Templars',['Vow-sworn Crusaders','Fist of the God-Emperor'],'Company Heroes','High Marshal Helbrecht','Chaplain','Judiciar','Crusader Squad');
  expect(options(a,'Company Heroes').find(u=>u.name==='Consecrating Aura')?.bearerModels).toEqual(['Ancient']);
  expect(options(a,'Company Heroes').some(u=>u.name==='Incendiary Animus')).toBe(false);
  expect(options(a,'Chaplain').some(u=>u.name==='Incendiary Animus')).toBe(true);
  expect(options(a,'Judiciar').some(u=>u.name==='Incendiary Animus')).toBe(true);
  expect(options(a,'High Marshal Helbrecht')).toEqual([]);
  expect(options(a,'Crusader Squad').map(u=>u.name)).toEqual(['Righteous Fervour']);
  expect(options(a,'Company Heroes').some(u=>u.name==='Oathbound Exemplar')).toBe(true);
 });
 it('retains a repeatable Sword Brethren unit upgrade with an attached Epic Hero',()=>{
  const a=equip(join(force('Black Templars',['Marshal’s Household'],'High Marshal Helbrecht','Sword Brethren Squad'),'High Marshal Helbrecht','Sword Brethren Squad'),'Sword Brethren Squad','Inheritors of Sigismund');
  expect(selectedChapterUpgrade(a,squad(a,'Sword Brethren Squad'))).toMatchObject({repeatable:true,bearerModels:[]});
  const f=spaceMarineFormations(a).find(g=>g.root.unit==='Sword Brethren Squad')!;
  expect(f.members.map(s=>s.unit)).toContain('High Marshal Helbrecht');
  expect(chapterFormationHasFightsFirst(a,f.members)).toBe(true);
  expect(chapterFormationHasFightsFirst(a,f.members,a.instances!.filter(s=>s.unit!=='Sword Brethren Squad'))).toBe(false);
  expect(summary(a,'000011075003')).toContain('including its attached models');
 });
 it('requires actual Jump Pack and Death Company models, not unit-keyword aggregation',()=>{
  const a=join(force('Blood Angels',['Encarmine Speartip','Wrath of the Doomed'],'Captain','Captain With Jump Pack','Death Company Captain','Chaplain','Death Company Marines'),'Chaplain','Death Company Marines');
  expect(options(a,'Captain').some(u=>u.name==='Angelic Executioner')).toBe(false);
  expect(options(a,'Captain With Jump Pack').some(u=>u.name==='Angelic Executioner')).toBe(true);
  expect(options(a,'Death Company Captain').map(u=>u.name)).toEqual(['Instinctive Interception',"On the Archtraitor's Bridge"]);
  expect(options(a,'Chaplain').some(u=>u.detachment==='Wrath of the Doomed')).toBe(false);
 });
 it('uses explicit Deathwing/Ravenwing model grants and preserves the Deep Strike bearer restriction',()=>{
  const a=force('Dark Angels',['Wrath of the Rock','Inner Circle Task Force','Darkflight Pursuit'],'Captain In Terminator Armour','Bladeguard Ancient','Chaplain On Bike','Land Speeder Vengeance','Outrider Squad','Sammael');
  expect(options(a,'Captain In Terminator Armour').some(u=>u.name==='Deathwing Assault')).toBe(true);
  expect(options(a,'Bladeguard Ancient').some(u=>u.name==='Deathwing Assault')).toBe(false);
  expect(options(a,'Bladeguard Ancient').some(u=>u.name==='Singular Will')).toBe(true);
  expect(options(a,'Chaplain On Bike').some(u=>u.name==='Lord of the Ravenwing')).toBe(true);
  expect(options(a,'Land Speeder Vengeance').map(u=>u.name)).toEqual(['Thundercowl Turbines','Nightforged Battery']);
  expect(options(a,'Outrider Squad').map(u=>u.name)).toEqual(['Thundercowl Turbines']);
  expect(options(a,'Sammael')).toEqual([]);
 });
 it('applies an explicit Deathwing unit grant to a generic attached Captain',()=>{
  const a=join(force('Dark Angels',['Inner Circle Task Force'],'Captain','Bladeguard Veteran Squad'),'Captain','Bladeguard Veteran Squad');
  expect(spaceMarineKeywords(a,squad(a,'Captain'),'Captain')).toContain('DEATHWING');
  expect(options(a,'Captain').some(u=>u.name==='Champion of the Deathwing')).toBe(true);
  const after={...a,instances:a.instances!.filter(s=>s.unit!=='Bladeguard Veteran Squad')};
  expect(options(after,'Captain').some(u=>u.name==='Champion of the Deathwing')).toBe(false);
 });
 it('checks the printed Wolf Priest, Terminator Captain and Battle Leader bearer identities',()=>{
  const a=force('Space Wolves',['Saga of the Great Wolf','Champions of Fenris'],'Wolf Priest','Wolf Guard Battle Leader','Captain In Terminator Armour','Captain','Logan Grimnar');
  expect(options(a,'Wolf Priest').some(u=>u.name==='Howlmaw')).toBe(true);
  expect(options(a,'Wolf Guard Battle Leader').some(u=>u.name==="Skjald's Foretelling")).toBe(true);
  expect(options(a,'Captain In Terminator Armour').some(u=>u.name==="Grimnar's Mark")).toBe(true);
  expect(options(a,'Captain').some(u=>u.name==="Grimnar's Mark")).toBe(false);
  expect(options(a,'Logan Grimnar')).toEqual([]);
 });
 it('prevents chapter enhancements throughout a Deathwatch Support Kill Team formation',()=>{
  const a=join(force('Dark Angels',['Wrath of the Rock','Deathwatch Support'],'Captain','Fortis Kill Team'),'Captain','Fortis Kill Team');
  expect(options(a,'Captain')).toEqual([]);expect(options(a,'Fortis Kill Team')).toEqual([]);
  expect(rows(equip(a,'Captain','Ancient Weapons')).some(r=>r.sourceRuleId==='000010155005')).toBe(false);
 });
 it('deduplicates the same-name shared and chapter Tempered in Battle selection',()=>{
  const a=equip(force('Dark Angels',['Wrath of the Rock','Tacticus Firestorm Force'],'Captain'),'Captain','Tempered in Battle');
  expect(selectedSpaceMarineUpgrade(a,squad(a,'Captain'))?.name).toBe('Tempered in Battle');
  expect(selectedChapterUpgrade(a,squad(a,'Captain'))).toBeUndefined();
  const b=equip(force('Dark Angels',['Wrath of the Rock','Tacticus Firestorm Force'],'Captain In Terminator Armour'),'Captain In Terminator Armour','Tempered in Battle');
  expect(selectedSpaceMarineUpgrade(b,squad(b,'Captain In Terminator Armour'))).toBeUndefined();
  expect(selectedChapterUpgrade(b,squad(b,'Captain In Terminator Armour'))?.id).toBe('000010155002');
 });
 it.each([['Black Templars','Vow-sworn Crusaders','Zealous Vanguard'],['Blood Angels','Angelic Inheritors','Prescient Flash']] as const)('grants Scouts from a surviving attached %s bearer', (faction,det,name)=>{
  const a=equip(join(force(faction,[det],'Captain','Intercessor Squad'),'Captain','Intercessor Squad'),'Captain',name);
  expect(chapterScoutRange(a,squad(a,'Intercessor Squad'))).toBe(6);
  expect(chapterScoutRange(a,squad(a,'Intercessor Squad'),a.instances!.filter(s=>s.unit!=='Captain'))).toBe(0);
  expect(chapterUpgradeBearerModels(a,squad(a,'Captain'))).toEqual(['Captain']);
 });
 it('permits first-turn ingress without inventing Deep Strike and loses the selected source when removed',()=>{
  const a=equip(join(force('Dark Angels',['Wrath of the Rock'],'Captain In Terminator Armour','Terminator Squad'),'Captain In Terminator Armour','Terminator Squad'),'Captain In Terminator Armour','Deathwing Assault');
  expect(chapterFirstTurnIngress(a,squad(a,'Terminator Squad'))).toBe(true);
  expect(chapterFirstTurnIngress(a,squad(a,'Terminator Squad'),a.instances!.filter(s=>s.unit!=='Captain In Terminator Armour'))).toBe(false);
  const b=equip(force('Dark Angels',['Darkflight Pursuit'],'Outrider Squad'),'Outrider Squad','Thundercowl Turbines');
  expect(chapterFirstTurnIngress(b,squad(b,'Outrider Squad'))).toBe(true);
  expect(chapterHasDeepStrike(b,squad(b,'Outrider Squad'))).toBe(false);
  expect(summary(b,'000011095002')).toContain('does not grant Deep Strike');
 });
 it('retains the actual Wolf-Touched bearer and grants Wulfen to its whole formation while it survives',()=>{
  const a=equip(join(force('Space Wolves',['Saga of the Beastslayer'],'Captain','Intercessor Squad'),'Captain','Intercessor Squad'),'Captain','Wolf-Touched');
  expect(spaceMarineKeywords(a,squad(a,'Captain'),'Captain')).toContain('WULFEN');
  expect(spaceMarineKeywords(a,squad(a,'Intercessor Squad'),'Intercessor')).toContain('WULFEN');
  expect(targets(a,'000010268')).toContain(id('Intercessor Squad'));
  const after=a.instances!.filter(s=>s.unit!=='Captain');
  expect(spaceMarineKeywords(a,squad(a,'Intercessor Squad'),'Intercessor',after)).not.toContain('WULFEN');
  expect(by(a,'000010269003',after)).toEqual([]);
  const b=equip(force('Space Wolves',['Saga of the Beastslayer'],'Company Heroes'),'Company Heroes','Wolf-Touched');
  expect(chapterUpgradeBearerModels(b,squad(b,'Company Heroes'))).toEqual(['Ancient']);
  expect(summary(b,'000010269003')).toContain('does not turn a roleless or Support-only unit into a Leader');
 });
});

describe('declared Space Wolf split parts',()=>{
 it('keeps Wolf-Touched and Wulfen-dependent detachment rules on the actual bearer’s part',()=>{
  const a=split(equip(join(force('Space Wolves',['Saga of the Beastslayer'],'Iron Priest','Grey Hunters'),'Iron Priest','Grey Hunters'),'Iron Priest','Wolf-Touched'),'Grey Hunters');
  const plan=chapterSplitPlans(a)[0];expect(plan.valid).toBe(true);
  const source=plan.parts.find(p=>p.members.some(s=>s.unit==='Iron Priest'))!,other=plan.parts.find(p=>!p.members.some(s=>s.unit==='Iron Priest'))!;
  for(const rule of ['000010269003','000010268','000010270002','000010270003','000010270004']){
   const result=by(a,rule);expect(result.length).toBeGreaterThan(0);
   expect(result.every(r=>r.title.includes(source.root.id)&&!r.title.includes(other.root.id))).toBe(true);
   expect(result.every(r=>r.units?.every(unit=>a.instances!.some(s=>s.id===unit)))).toBe(true);
  }
  expect(summary(a,'000010269003')).toContain(source.models+' actual models assigned to '+source.root.id);
  const after=a.instances!.filter(s=>s.unit!=='Iron Priest');
  expect(by(a,'000010269003',after)).toEqual([]);expect(by(a,'000010268',after)).toEqual([]);
 });
 it('gives Countercharge and a selected formation upgrade only to the part with its Character',()=>{
  const a=split(equip(join(force('Space Wolves',['Champions of Fenris'],'Iron Priest','Grey Hunters'),'Iron Priest','Grey Hunters'),'Iron Priest','Preyslayer'),'Grey Hunters');
  const plan=chapterSplitPlans(a)[0],source=plan.parts.find(p=>p.members.some(s=>s.unit==='Iron Priest'))!,other=plan.parts.find(p=>!p.members.some(s=>s.unit==='Iron Priest'))!;
  for(const rule of ['000009850','000009851002','000009852002','000009852003']){
   const result=by(a,rule);expect(result.length).toBeGreaterThan(0);
   expect(result.every(r=>r.title.includes(source.root.id)&&!r.title.includes(other.root.id))).toBe(true);
  }
  const independent=by(a,'000009852004').filter(r=>r.title.includes(' CP'));
  expect(independent.map(r=>r.title)).toEqual(expect.arrayContaining(plan.parts.map(p=>'BIRTH OF A SAGA · 1 CP · '+p.root.id)));
 });
 it('does not copy Headtaker Infantry, Character models or guns to the separate Hunting Wolves',()=>{
  let a=edit(join(force('Space Wolves',['Saga of the Great Wolf'],'Ragnar Blackmane','Wolf Guard Headtakers'),'Ragnar Blackmane','Wolf Guard Headtakers'),'Wolf Guard Headtakers',{models:6});
  const s=squad(a,'Wolf Guard Headtakers'),field=spaceMarineLoadout(s.unit,6,'Space Wolves')!.slots.find(s=>s.name==='Unit composition')!;
  const choice=field.choices.find(c=>spaceMarineModelLoadouts({...s,knightGear:{'Unit composition':c.name}},'Space Wolves').filter(m=>m.model==='Hunting Wolf').length===3)!;
  a=split(edit(a,s.unit,{knightGear:{[field.name]:choice.name}}),s.unit);
  const plan=chapterSplitPlans(a)[0];expect(plan.valid).toBe(true);
  const headtakers=plan.parts[0],wolves=plan.parts[1];expect(wolves.physical.every(m=>m.model==='Hunting Wolf')).toBe(true);
  for(const rule of ['000010661002','000010661003','000010661004','000010661007'])expect(by(a,rule).every(r=>r.title.includes(headtakers.root.id)&&!r.title.includes(wolves.root.id))).toBe(true);
  const attackRows=by(a,'000010657').filter(r=>r.window==='Shooting');
  expect(attackRows.length).toBeGreaterThan(0);expect(attackRows.every(r=>!r.title.includes(wolves.root.id))).toBe(true);
  expect(by(a,'000010657').some(r=>r.window==='Fight'&&r.title.includes(wolves.root.id))).toBe(true);
 });
 it('labels personal bearer effects with the selected part and never lists the other part as its source',()=>{
  const a=split(equip(join(force('Space Wolves',['Champions of Fenris'],'Iron Priest','Grey Hunters'),'Iron Priest','Grey Hunters'),'Iron Priest','A Giant Amongst Giants'),'Grey Hunters');
  const part=chapterSplitPlans(a)[0].parts.find(p=>p.members.some(s=>s.unit==='Iron Priest'))!,result=by(a,'000009851003');
  expect(result.map(r=>r.window)).toEqual(['Pre-battle','Fight']);
  expect(result.every(r=>r.title.includes(part.root.id)&&r.units?.join()===id('Iron Priest'))).toBe(true);
  expect(result.every(r=>r.summary.includes('other declared part does not contain that model'))).toBe(true);
 });
 it('redeploys the qualifying Wulfen part without granting its other half eligibility',()=>{
  let a=split(join(force('Space Wolves',['Saga of the Beastslayer'],'Captain','Iron Priest','Grey Hunters'),'Iron Priest','Grey Hunters'),'Grey Hunters');
  a=equip(equip(a,'Captain',"Hunter's Guile"),'Iron Priest','Wolf-Touched');
  const part=chapterSplitPlans(a)[0].parts.find(p=>p.members.some(s=>s.unit==='Iron Priest'))!,result=by(a,'000010269002');
  expect(result).toHaveLength(1);expect(result[0].title).toContain(part.root.id);
  expect(result[0].summary).toContain('Eligible formations: '+part.root.id+'.');
 });
});

describe('chapter timing, source casualties and current core mechanics',()=>{
 it('keeps the two comma-separated Eye of the Pack attack windows',()=>{
  const a=force('Space Wolves',['Saga of the Great Wolf'],'Intercessor Squad');
  expect(windows(a,'000010661002')).toEqual([['Shooting','own','during'],['Fight','either','during']]);
  expect(windows(a,'000010661003')).toEqual(phases.map(p=>[p,'either','during']));
 });
 it('uses exact end-of-opponent-phase windows and one combined Grimnar allowance',()=>{
  const a=equip(force('Space Wolves',['Saga of the Great Wolf','Champions of Fenris'],'Captain In Terminator Armour'),'Captain In Terminator Armour',"Grimnar's Mark");
  expect(by(a,'000010660003').map(r=>[r.window,r.turn,r.timing])).toEqual([['Movement','opponent','end'],['Charge','opponent','end']]);
  expect(summary(a,'000010660003')).toContain('one combined allowance');
  expect(summary(a,'000010660003')).toContain('same combined allowance');
  expect(by(a,'000009850').map(r=>[r.window,r.turn,r.timing])).toEqual([['Charge','opponent','end']]);
  expect(summary(a,'000009850')).toContain('does not permit an extra use');
 });
 it('preserves the three distinct charge mortal-wound thresholds and caps',()=>{
  const a=force('Black Templars',['Marshal’s Household'],'Sword Brethren Squad');
  expect(summary(a,'000011076004')).toContain('each 4+');expect(summary(a,'000011076004')).toContain('maximum of 6');
  const b=force('Blood Angels',['Encarmine Speartip'],'Sanguinary Guard');
  expect(summary(b,'000011084002')).toContain('each 3+');expect(summary(b,'000011084002')).toContain('no six-wound cap');
  const c=force('Dark Angels',['Inner Circle Task Force'],'Terminator Squad');
  expect(summary(c,'000008775004')).toContain('each 3+');expect(summary(c,'000008775004')).toContain('maximum of 6');
  for(const [army,rule] of [[a,'000011076004'],[b,'000011084002'],[c,'000008775004']] as const)expect(summary(army,rule)).toContain('actual model in this formation engaged with that chosen enemy');
 });
 it('does not extend attacker-limited damage reduction or interrupt with Duty Unto Death',()=>{
  const a=force('Space Wolves',['Champions of Fenris'],'Captain');
  expect(summary(a,'000009852003')).toContain('only until that attacking enemy has finished');
  const b=force('Dark Angels',['Inner Circle Task Force'],'Terminator Squad');
  expect(summary(b,'000008775002')).toContain('formation has fought or the phase ends, whichever happens first');
  expect(summary(b,'000008775002')).toContain('does not interrupt to fight immediately');
  expect(summary(b,'000008775002')).toContain('Add 1 if the formation is engaged with an enemy within range of your vowed objective');
 });
 it('separates the chosen first-round Templar Vow and its later action/secure effects',()=>{
  const a=force('Black Templars',['Vow-sworn Crusaders'],'Intercessor Squad','Land Raider');
  expect(by(a,'000011171').find(r=>r.window==='Start of battle round')?.summary).toContain('first battle round');
  const end=by(a,'000011171').find(r=>r.window==='Movement'&&r.timing==='end');
  expect(end?.units).toEqual([id('Intercessor Squad')]);expect(end?.summary).toContain('Only if Uphold the Honour');
  expect(summary(a,'000011171')).toContain('does not grant shooting while performing the action');
 });
 it('requires actual Blood Angels Character and retains Wound re-rolls during snap shooting',()=>{
  const a=force('Blood Angels',['Angelic Inheritors'],'Captain','Blood Angels Captain','Intercessor Squad');
  expect(targets(a,'000009834')).toEqual(new Set([id('Blood Angels Captain')]));
  const snap=by(a,'000009834').find(r=>r.window==='Movement');
  expect(snap?.summary).toContain('re-rolls of Wound rolls of 1');expect(snap?.summary).toContain('cannot re-roll fixed snap-shot Hit rolls');
 });
 it('applies Sanguinius’ Fury at each phase start and preserves its doctrine prohibition',()=>{
  const a=force('Blood Angels',['Wrath of the Doomed'],'Death Company Marines');
  expect(by(a,'000011086').filter(r=>r.timing==='start').map(r=>[r.window,r.turn])).toEqual(phases.map(p=>[p,'either']));
  expect(summary(a,'000011086')).toContain('Devastator and Tactical Doctrine cannot be active');
  expect(summary(a,'000011086')).toContain('selected to Advance');
 });
 it('requires Deathwing Infantry for Vowed Target attacks and permits snap Wound bonuses',()=>{
  const a=force('Dark Angels',['Inner Circle Task Force'],'Terminator Squad','Land Raider');
  const attacks=by(a,'000008773').filter(r=>r.window!=='Command');
  expect(new Set(attacks.flatMap(r=>r.units??[]))).toEqual(new Set([id('Terminator Squad')]));
  expect(attacks.find(r=>r.window==='Movement')?.summary).toContain('retains +1 to Wound during snap shooting');
  expect(summary(a,'000008775003')).toContain('more than 6″');expect(summary(a,'000008775003')).toContain('instead of more than 8″');
  expect(summary(a,'000008775003')).toContain('cannot declare a charge until the end of the turn');
 });
 it('keeps Logan activation separate from an already activated army-wide timed effect',()=>{
  const a=force('Space Wolves',['Saga of the Great Wolf'],'Logan Grimnar','Intercessor Squad','Land Raider');
  const source=by(a,'000010657').find(r=>r.title==='Howling Onslaught');
  expect(source?.units).toEqual([id('Logan Grimnar')]);expect(source?.summary).toContain('while embarked or in Strategic Reserves');
  const after=a.instances!.filter(s=>s.unit!=='Logan Grimnar'),result=by(a,'000010657',after);
  expect(result.some(r=>r.title==='Howling Onslaught')).toBe(false);
  expect(result.filter(r=>r.units?.includes(id('Land Raider'))).every(r=>r.summary.includes('Only if Howling Onslaught was used'))).toBe(true);
  expect(summary(a,'000010657',after)).toContain('timed effect persists if Logan Grimnar is later destroyed');
  expect(summary(a,'000010657')).toContain('snap shooting, which prohibits Hit-roll re-rolls');
  expect(summary(a,'000010657')).toContain('Snap shooting cannot activate Sustained Hits');
 });
 it('preserves a previously hated enemy after the triggering Death Company source dies',()=>{
  const a=force('Blood Angels',['Wrath of the Doomed'],'Death Company Captain','Death Company Marines');
  const after=a.instances!.filter(s=>s.unit!=='Death Company Captain');
  expect(windows(a,'000011088002')).toEqual(phases.map(p=>[p,'either','during']));
  expect(summary(a,'000011088002',after)).toContain('actual unit');
  expect(summary(a,'000011088002',after)).toContain('marker lasts until battle end');
  expect(by(a,'000011088002',after).some(r=>r.window==='Movement'&&r.summary.includes('Snap shots retain +1 to Wound'))).toBe(true);
 });
 it('keeps destruction-secured objectives and timed OC after the original source condition changes',()=>{
  const a=force('Dark Angels',['Wrath of the Rock'],'Terminator Squad','Intercessor Squad');
  expect(summary(a,'000010161002',[])).toContain('controlled at the end of the previous phase');
  expect(summary(a,'000010161002',[])).toContain('no enemy units other than Aircraft');
  expect(summary(a,'000010161003')).toContain('Moving away later does not cancel');
 });
 it('retains recorded temporary Character grants without assuming the Stratagem was used',()=>{
  const a=force('Blood Angels',['Angelic Inheritors'],'Intercessor Squad');
  expect(summary(a,'000009836004')).toContain('explicit unit grant applies to its models');
  expect(summary(a,'000009836004')).toContain('does not add a Chapter keyword');
  expect(targets(a,'000009834')).toEqual(new Set());
  const b=force('Space Wolves',['Champions of Fenris'],'Intercessor Squad');
  expect(summary(b,'000009852004')).toContain('Do not assume an unselected formation received it');
  expect(summary(b,'000009852004')).toContain('Countercharge');
  expect(targets(b,'000009850')).toEqual(new Set());
 });
 it('retains Unto Death and selected no-cover effects after bearer destruction but loses new activations',()=>{
  const a=equip(join(force('Blood Angels',['Angelic Inheritors'],'Captain','Intercessor Squad'),'Captain','Intercessor Squad'),'Captain','Unto Death');
  const after=a.instances!.filter(s=>s.unit!=='Captain'),result=by(a,'000009835005',after);
  expect(result.map(r=>r.window)).toEqual(['Movement','Charge']);
  expect(result.every(r=>r.units?.includes(id('Intercessor Squad'))&&r.summary.includes('until turn end'))).toBe(true);
  const b=equip(force('Black Templars',['Vow-sworn Crusaders'],'Captain','Intercessor Squad'),'Captain','Augury Servo-host');
  const remaining=b.instances!.filter(s=>s.unit!=='Captain');
  expect(by(b,'000011172002',remaining)).toHaveLength(1);
  expect(summary(b,'000011172002',remaining)).toContain('already applied effect persists');
  expect(summary(b,'000011172002',remaining)).toContain('until phase end');
 });
 it('preserves the removed resurrection bearer and returns it to its original Attached unit',()=>{
  const a=equip(join(force('Blood Angels',['Angelic Inheritors'],'Captain','Intercessor Squad'),'Captain','Intercessor Squad'),'Captain','Ordained Sacrifice');
  expect(by(a,'000009835004',[]).map(r=>[r.window,r.turn,r.timing])).toEqual(phases.map(p=>[p,'either','end']));
  expect(targets(a,'000009835004',[])).toEqual(new Set([id('Captain')]));
  const text=summary(a,'000009835004',[]);
  for(const term of ['Once per battle, per army','On 2+','3 wounds','original Attached unit','coherency'])expect(text).toContain(term);
 });
 it('retains activated Angelic Executioner attacks after the original Jump Pack bearer dies',()=>{
  const a=equip(join(force('Blood Angels',['Encarmine Speartip'],'Captain With Jump Pack','Assault Intercessors With Jump Packs'),'Captain With Jump Pack','Assault Intercessors With Jump Packs'),'Captain With Jump Pack','Angelic Executioner');
  const after=a.instances!.filter(s=>s.unit!=='Captain With Jump Pack');
  expect(summary(a,'000011083003',after)).toContain('already selected Lethal Hits or Sustained Hits 1');
  expect(summary(a,'000011083003',after)).toContain('until phase end');
  expect(summary(a,'000011083003',after)).toContain('Losing the bearer before activation grants neither option');
 });
 it('distinguishes personal attack bonuses from whole-formation grants',()=>{
  const a=equip(join(force('Blood Angels',['Encarmine Speartip'],'Captain With Jump Pack','Assault Intercessors With Jump Packs'),'Captain With Jump Pack','Assault Intercessors With Jump Packs'),'Captain With Jump Pack','Shadow of Abomination');
  expect(targets(a,'000011083002')).toEqual(new Set([id('Captain With Jump Pack')]));
  expect(summary(a,'000011083002')).toContain('until phase end');
  const b=equip(join(force('Dark Angels',['Wrath of the Rock'],'Captain','Intercessor Squad'),'Captain','Intercessor Squad'),'Captain','Ancient Weapons');
  expect(targets(b,'000010155005')).toEqual(new Set([id('Captain')]));
  expect(summary(b,'000010155005')).toContain('+2 Strength and +1 AP');
  const c=equip(force('Dark Angels',['Inner Circle Task Force'],'Captain In Terminator Armour'),'Captain In Terminator Armour','Singular Will');
  expect(summary(c,'000008774002')).toContain('does not increase its Pile In distance');
 });
 it('allows Nightforged attack-count and hazard re-rolls during legal snap shooting',()=>{
  const a=equip(force('Dark Angels',['Darkflight Pursuit'],'Land Speeder Vengeance'),'Land Speeder Vengeance','Nightforged Battery');
  expect(by(a,'000011095003').some(r=>r.window==='Movement'&&r.timing==='end'&&r.summary.includes('Attacks characteristic'))).toBe(true);
  expect(by(a,'000011095003').filter(r=>r.summary.includes('hazard rolls')).map(r=>[r.window,r.turn])).toEqual(phases.map(p=>[p,'either']));
  expect(summary(a,'000011095003')).toContain('not a Hit-roll re-roll');
  expect(summary(a,'000011095003')).toContain('Re-roll a die only once');
 });
 it('blocks every snap-shooting window while Blazing Icon survives, without blocking normal shooting',()=>{
  const a=equip(force('Blood Angels',['Angelic Inheritors'],'Captain'),'Captain','Blazing Icon');
  expect(by(a,'000009835003').map(r=>[r.window,r.turn])).toEqual(phases.map(p=>[p,'either']));
  expect(summary(a,'000009835003')).toContain('does not prevent attacks made using normal shooting');
  expect(by(a,'000009835003',[])).toEqual([]);
 });
 it('measures Howlmaw from the actual bearer and preserves redeploy limits',()=>{
  const a=equip(force('Space Wolves',['Saga of the Great Wolf'],'Wolf Priest'),'Wolf Priest','Howlmaw');
  expect(by(a,'000010660002').map(r=>[r.window,r.turn,r.timing])).toEqual([['Fight','either','start']]);
  expect(summary(a,'000010660002')).toContain('Once per turn for this unit');
  expect(summary(a,'000010660002')).toContain('actual Wolf Priest enhancement bearer');
  const b=equip(force('Space Wolves',['Saga of the Beastslayer'],'Captain','Blood Claws','Land Raider'),'Captain',"Hunter's Guile");
  expect(targets(b,'000010269002')).toEqual(new Set([id('Blood Claws')]));
  expect(summary(b,'000010269002')).toContain('retain any separate reserve points');
  const c=equip(force('Space Wolves',['Saga of the Great Wolf'],'Captain','Blood Claws','Land Raider'),'Captain','Chariots of the Storm');
  expect(targets(c,'000010660004')).toEqual(new Set([id('Captain'),id('Blood Claws'),id('Land Raider')]));
 });
 it('keeps Mobile limited to the triggering Movement or Charge phase',()=>{
  const a=force('Blood Angels',['Wrath of the Doomed'],'Death Company Dreadnought');
  expect(windows(a,'000011088003')).toEqual([['Movement','own','during'],['Charge','own','during']]);
  expect(summary(a,'000011088003')).toContain('gains Mobile until phase end');
  const b=force('Space Wolves',['Saga of the Great Wolf'],'Thunderwolf Cavalry','Redemptor Dreadnought','Intercessor Squad');
  expect(targets(b,'000010661005')).toEqual(new Set([id('Thunderwolf Cavalry'),id('Redemptor Dreadnought')]));
 });
 it('keeps Sanguinor as a separate eligible strategic-reserves alternative',()=>{
  const a=force('Blood Angels',['Angelic Inheritors'],'The Sanguinor','Captain With Jump Pack','Intercessor Squad');
  expect(windows(a,'000009836006')).toEqual([['Fight','opponent','end']]);
  expect(targets(a,'000009836006')).toEqual(new Set([id('The Sanguinor'),id('Captain With Jump Pack')]));
  expect(summary(a,'000009836006')).toContain('The Sanguinor is a separate eligible alternative and need not be unengaged');
 });
});
