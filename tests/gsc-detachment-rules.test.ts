import {describe,expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {detachmentBudget} from '../src/edition-2026';
import {GSC_SHEETS} from '../src/gsc-data';
import {eligibleGscUpgrades,gscDetachmentReminders as generate} from '../src/gsc-detachments';
import type {RosterInstance} from '../src/roster-instances';
const allies='Brood Brothers Auxilia',cult='Neophyte Hybrids',beasts='Purestrain Genestealers';
const rifle='Sanctus',boss='Patriarch',tanks='Goliath Truck',guard='Cadian Shock Troops',nid='Winged Hive Tyrant';
function force(detachments:string[],...units:string[]):ArmySelection{
 const counts:Record<string,number>={};
 return {...newSelection('Genestealer Cults'),units:counts,detachments2026:detachments,
  instances:units.map(unit=>({unit,id:unit+'#'+(counts[unit]=(counts[unit]??0)+1)}))};
}
const configure=(a:ArmySelection,unit:string,values:Partial<RosterInstance>):ArmySelection=>({...a,instances:a.instances?.map(s=>s.unit===unit?{...s,...values}:s)});
const enhance=(a:ArmySelection,unit:string,upgrade:string)=>({...a,upgrades2026:{[unit+'#1']:upgrade}});
const cards=(a:ArmySelection,id:string)=>generate(a).filter(r=>r.sourceRuleId===id);
const rows=(a:ArmySelection,name:string)=>generate(a).filter(r=>r.title===name);
describe('Genestealer Cults selected detachment and Stratagem outcomes',()=>{
 it('reconciles all current dispositions and recognizes both historical Brood Brothers spellings',()=>{
  for(const alias of [allies,'Brood Brother Auxilia','Brood Brothers Auxillia']){
   expect(detachmentBudget('Genestealer Cults',[alias],'Incursion')).toMatchObject({valid:true,spent:2,dispositions:['Take and Hold']});
   expect(eligibleGscUpgrades(force([alias],rifle),rifle)).toContainEqual(expect.objectContaining({name:'Fire-point Commander',points:10}));
  }
  expect(detachmentBudget('Genestealer Cults',['Xenocult Masses'],'Incursion').dispositions).toEqual(['Reconnaissance']);
  expect(detachmentBudget('Genestealer Cults',['Heroes of the Uprising'],'Incursion').dispositions).toEqual(['Disruption']);
  expect(detachmentBudget('Genestealer Cults',['Host of Ascension'],'Incursion').dispositions).toEqual(['Take and Hold','Reconnaissance']);
  expect(detachmentBudget('Genestealer Cults',[allies,'Brood Brother Auxilia'],'Strike Force').valid).toBe(false);
 });
 it('gives the reserve arrival bonus and the revised 6-inch Tunnel Crawlers to actual Deep Strike formations',()=>{
  const a=force(['Host of Ascension'],cult,'Atalan Jackals',tanks);
  expect(cards(a,'000009068004')[0]).toMatchObject({window:'Movement',turn:'own',units:[cult+'#1','Atalan Jackals#1']});
  expect(cards(a,'000009068004')[0].summary).toContain('6″');
  expect(cards(a,'000009068004')[0].summary).toContain('without a marker');
  expect(rows(a,'A Perfect Ambush').map(r=>r.window)).toEqual(['Movement','Shooting','Fight']);
  expect(cards(a,'000009068003')[0].title).toContain('2CP');
  expect(cards(a,'000009068006')[0]).toMatchObject({window:'Fight',turn:'opponent',timing:'end',units:[cult+'#1']});
 });
 it('requires two actual attackers for each Coordinated Trap and uses the printed start of each phase',()=>{
  const one=force(['Host of Ascension'],cult);
  expect(cards(one,'000009068002')).toHaveLength(0);
  const two=force(['Host of Ascension'],cult,'Purestrain Genestealers');
  expect(cards(two,'000009068002').map(r=>[r.window,r.turn,r.timing])).toEqual([['Fight','either','start']]);
  const shooters=force(['Host of Ascension'],cult,tanks);
  expect(cards(shooters,'000009068002').map(r=>[r.window,r.turn,r.timing])).toEqual([['Shooting','own','start'],['Fight','either','start']]);
 });
 it('separates Killer-only attacks and unit-wide gear on a legally joined Locus',()=>{
  const a=configure(force(['Heroes of the Uprising'],'Locus',cult),'Locus',{attachedTo:cult+'#1'});
  expect(rows(a,'Killer Reputation').map(r=>[r.window,r.units])).toEqual([['Fight',['Locus#1']]]);
  expect(cards(a,'000010901003').map(r=>[r.window,r.units])).toEqual([['Fight',[cult+'#1']]]);
  expect(cards(a,'000010901004')[0]).toMatchObject({window:'Fight',turn:'either',units:[cult+'#1']});
  const withToxins=enhance(a,'Locus','Gene-Tailored Toxins');
  expect(cards(withToxins,'000010900002').map(r=>[r.window,r.units])).toEqual([['Fight',['Locus#1']]]);
 });
 it('checks a legally led brood before allowing Xenocreed movement re-rolls and restricts Feel No Pain to the leading model',()=>{
  const a=force(['Xenocreed Congregation'],'Magus',cult,'Acolyte Iconward');
  expect(rows(a,'Unquestioning Fanaticism')).toHaveLength(0);
  const led=configure(a,'Magus',{attachedTo:cult+'#1'});
  expect(rows(led,'Unquestioning Fanaticism').map(r=>[r.window,r.units])).toEqual([['Movement',[cult+'#1']],['Charge',[cult+'#1']]]);
  expect(rows(led,'Unquestioning Fanaticism · Character protection')[0].units).toEqual(['Magus#1']);
  expect(cards(led,'000009072002')[0].units).toEqual(['Magus#1','Acolyte Iconward#1']);
  expect(cards(force(['Xenocreed Congregation'],'Magus',cult),'000009072002')).toHaveLength(0);
 });
 it('gates cult marker movement and Ambush deployment with the appropriate real squad',()=>{
  for(const [det,id] of [['Biosanctic Broodsurge','000009076002'],['Outlander Claw','000009080002']]){
   expect(cards(force([det],boss,tanks),id)).toHaveLength(0);
   const move=cards(force([det],cult,boss),id);
   expect(move.map(r=>r.window)).toEqual(['Command','Movement','Shooting','Charge','Fight']);
   expect(move.every(r=>r.summary.includes('8″')&&r.units?.join()===cult+'#1')).toBe(true);
  }
  const a=force(['Xenocreed Congregation','Host of Ascension'],cult,'Hybrid Metamorphs',boss);
  expect(cards(a,'000009072006')[0]).toMatchObject({window:'Movement',turn:'opponent',timing:'end',units:[cult+'#1','Hybrid Metamorphs#1']});
  expect(cards(a,'000009068005')[0].units).toEqual([cult+'#1']);
 });
 it('requires legal Guard and Cult crossfire partners, acquired markers and an Infantry Regiment',()=>{
  const empty=force([allies],cult,rifle);
  expect(rows(empty,'Integrated Tactics')).toHaveLength(0);
  expect(cards(empty,'000009085006')).toHaveLength(0);
  const a=force([allies],cult,guard,'Leman Russ Battle Tank');
  expect(rows(a,'Integrated Tactics')[0].units).toContain(guard+'#1');
  expect(cards(a,'000009085006')[0].units).toEqual([cult+'#1',guard+'#1','Leman Russ Battle Tank#1']);
  expect(cards(a,'000009085003')[0]).toMatchObject({window:'Shooting',turn:'opponent',units:[guard+'#1']});
  expect(cards(a,'000009085003')[0].summary).toContain('One Shot');
  expect(cards(a,'000009085002')[0].units).toEqual(['Leman Russ Battle Tank#1']);
  expect(cards(a,'000009085007')[0].units).not.toContain('Leman Russ Battle Tank#1');
 });
 it('requires a legal Synapse catalyst, donor and Tyranids recipient for different Final Day rules',()=>{
  expect(rows(force(['Final Day'],beasts,nid),'Psionic Parasitism')).toHaveLength(0);
  const a=force(['Final Day'],beasts,'Magus',nid,'Lictor','Gargoyles');
  expect(rows(a,'Psionic Parasitism')[0]).toMatchObject({timing:'end',window:'Movement',units:[nid+'#1']});
  expect(rows(a,'Psionic Parasitism')[0].summary).toContain('Magus#1');
  expect(rows(a,'Psionic Parasitism')[0].summary).not.toContain(beasts+'#1');
  expect(cards(a,'000009828004')[0].units).toEqual([nid+'#1']);
  expect(cards(a,'000009828003')).toHaveLength(5);
  expect(cards(a,'000009828006').find(r=>r.window==='Shooting')?.units).toEqual(['Gargoyles#1']);
  expect(cards(a,'000009828006').find(r=>r.window==='Charge')?.units).toContain('Lictor#1');
  expect(cards(force(['Final Day'],cult),'000009828005')).toHaveLength(0);
 });
 it('distinguishes reserve, detection and terrain effects of the two current one-point brood detachments',()=>{
  const a=force(['Xenocult Masses','Purestrain Broodswarm'],cult,beasts,tanks);
  expect(rows(a,'Hordes of the Faithful')[0]).toMatchObject({window:'Command',turn:'own',units:[cult+'#1']});
  expect(rows(a,'Enemy Within')[0]).toMatchObject({window:'Fight',turn:'opponent',timing:'end',units:[beasts+'#1']});
  expect(cards(a,'000010905004')[0].summary).toContain('D3+3″');
  expect(cards(a,'000010909004')[0].summary).toContain('every model');
 });
 it('uses current Overwatch and Heroic Intervention windows plus actual gun and transport eligibility',()=>{
  const a=force([allies,'Biosanctic Broodsurge'],cult,boss);
  expect(cards(enhance(a,boss,'Predatory Instincts'),'000009075002').map(r=>[r.window,r.turn,r.timing])).toEqual([['Pre-battle','either','during'],['Charge','opponent','end']]);
  expect(cards(enhance(a,boss,'Fire-point Commander'),'000009084005')).toHaveLength(0);
  const shooting=enhance(force([allies],'Kelermorph'),'Kelermorph','Fire-point Commander');
  expect(cards(shooting,'000009084005')[0]).toMatchObject({window:'Movement',turn:'opponent',timing:'end'});
  const mounted=enhance(force(['Outlander Claw'],'Jackal Alphus'),'Jackal Alphus','Starfall Shells');
  expect(cards(mounted,'000009079004')[0].summary).toContain('cult sniper rifle');
  const walker=enhance(force(['Outlander Claw'],'Kelermorph'),'Kelermorph','Assault Commando');
  expect(cards(walker,'000009079005')).toHaveLength(0);
  expect(cards(enhance(force(['Outlander Claw'],'Kelermorph',tanks),'Kelermorph','Assault Commando'),'000009079005')[0].units).toEqual(['Kelermorph#1']);
 });
 it('enforces independently priced and repeatable unit upgrades separately from character-only ones',()=>{
  const a=force(['Final Day','Xenocult Masses','Purestrain Broodswarm'],nid,cult,beasts);
  expect(eligibleGscUpgrades(a,nid)).toEqual(expect.arrayContaining([expect.objectContaining({name:'Vanguard Tyrant',points:25}),expect.objectContaining({name:'Synaptic Auger',points:15})]));
  expect(eligibleGscUpgrades(a,'Deathleaper')).toHaveLength(0);
  expect(eligibleGscUpgrades(a,beasts)).toContainEqual(expect.objectContaining({name:'Mark of the Star Children',repeatable:true,points:30}));
  expect(eligibleGscUpgrades(a,cult)).toContainEqual(expect.objectContaining({name:'Devious Disguises',repeatable:true,points:15}));
  expect(eligibleGscUpgrades(force(['Outlander Claw']),'Death Rider Commissar')).toHaveLength(0);
 });
 it.each([
  ['Biosanctic Broodsurge','Abominant','Predatory Instincts','Charge','1CP'],
  ['Biosanctic Broodsurge','Abominant','Biomorph Adaptation','Fight','Damage by 1'],
  ['Biosanctic Broodsurge','Abominant','Mutagenic Regeneration','Command','1 lost wound'],
  ['Biosanctic Broodsurge','Abominant','Alien Majesty','Command','minimum of 1'],
  ['Xenocreed Congregation','Magus','Gene-sire’s Reliquant','Command','re-roll that test'],
  ['Xenocreed Congregation','Magus','Denunciator of Tyrants','Fight','+1 to Wound'],
  ['Xenocreed Congregation','Magus','Incendiary Inspiration','Charge','Advancing'],
  ['Xenocult Masses','Magus','Inspired to Greatness','Fight','Damage rolls'],
  ['Xenocult Masses',cult,'Devious Disguises','Shooting','−3″'],
  ['Purestrain Broodswarm',beasts,'Mark of the Star Children','Fight','1 Strength'],
  ['Purestrain Broodswarm',boss,'Talons of the Sire','Fight','Wound rolls of 1'],
  ['Heroes of the Uprising','Locus','Gene-Tailored Toxins','Fight','1 Damage'],
  ['Heroes of the Uprising','Kelermorph','Contraband Munitions','Shooting','2 Strength'],
  ['Host of Ascension','Primus','A Chink in Their Armour','Movement','Lethal Hits'],
  ['Host of Ascension','Primus','Prowling Agitant','Movement','within 8″'],
  ['Host of Ascension','Primus','Our Time Is Nigh','Charge','Once per battle'],
  ['Host of Ascension','Primus','Assassination Edict','Fight','+1 to Hit'],
  ['Outlander Claw','Jackal Alphus','Serpentine Tactics','Shooting','Falling Back'],
  ['Outlander Claw','Jackal Alphus','Starfall Shells','Shooting','−1 to Hit'],
  ['Outlander Claw','Kelermorph','Cartographic Data-leech','Shooting','Firing Deck'],
  ['Outlander Claw','Kelermorph','Assault Commando','Shooting','disembarks'],
  [allies,'Kelermorph','Martial Espionage','Shooting','9″'],
  [allies,'Kelermorph','Adaptive Reprisal','Charge','1CP'],
  [allies,'Kelermorph','Fire-point Commander','Movement','5+'],
  [allies,'Kelermorph','The Hero Returned','Command','Objective Control'],
  ['Final Day',nid,'Synaptic Auger','Movement','twice'],
  ['Final Day',nid,'Vanguard Tyrant','Fight','melee'],
  ['Final Day','Kelermorph','Enraptured Damnation','Movement','Fire Overwatch'],
  ['Final Day','Kelermorph','Inhuman Integration','Shooting','Sustained Hits 1'],
 ])('%s applies the selected %s upgrade to its effect and timing', (det,unit,upgrade,window,effect)=>{
  const a=force([det],...new Set([unit,cult,tanks,nid,guard]));
  const selected=enhance(a,unit,upgrade);
  const relevant=generate(selected).filter(r=>r.title===unit+'#1 · '+upgrade&&r.window===window);
  expect(relevant).toHaveLength(1);
  expect(relevant[0].summary).toContain(effect);
  expect(generate(a).some(r=>r.title===unit+'#1 · '+upgrade)).toBe(false);
 });
 it('renders all 45 current Stratagems with printable effects, actual candidates and unique phase IDs',()=>{
  const expected=[['Host of Ascension',6],['Xenocreed Congregation',6],['Biosanctic Broodsurge',6],['Outlander Claw',6],[allies,6],['Final Day',6],['Heroes of the Uprising',3],['Purestrain Broodswarm',3],['Xenocult Masses',3]] as const;
  for(const [det,count] of expected){
   const a=force([det],...GSC_SHEETS.map(s=>s.unit),guard,'Leman Russ Battle Tank',nid);
   const entries=generate(a).filter(r=>r.id.startsWith('11e-gsc-strat-'));
   expect(new Set(entries.map(r=>r.sourceRuleId)).size,det).toBe(count);
   expect(new Set(entries.map(r=>r.id)).size).toBe(entries.length);
   expect(entries.every(r=>r.units?.length&&r.summary.length>30&&r.turn!==undefined)).toBe(true);
  }
 });
});
