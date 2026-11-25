// @vitest-environment node
import {expect,it} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection,type ArmySelection} from '../src/catalog';
import {rosterCost2026} from '../src/datasheets-2026';
import {individualArmy,setInstanceAttachment,setInstanceModelCount} from '../src/roster-instances';
import {setKnightGear} from '../src/knight-loadouts';
import {drukhariLoadout,drukhariModelLoadouts,drukhariWeaponCount,validDrukhariGear} from '../src/drukhari-loadouts';
import {selectDrukhariWarlord,resolvedDrukhariWarlord} from '../src/drukhari-muster';
import {drukhariAllyAllowance,isDrukhariAlly} from '../src/drukhari-muster-data';
import {drukhariCargoFormations,drukhariCargoFits,drukhariSplitCargoFormations,drukhariDedicatedSatisfied,drukhariFormations} from '../src/drukhari-transports';
import {drukhariKeywords} from '../src/drukhari-keywords';
import {drukhariHasInfiltrators} from '../src/drukhari-upgrades';
import {drukhariFullWeaponProfiles} from '../src/drukhari-weapons';
import {selectUpgrade2026} from '../src/upgrades-2026';
import {rosterFindings} from '../src/roster-findings';
import {generate11thReminders} from '../src/reminders-11th';
import {initialStore} from '../src/profiles';
import {openSavedArmies} from '../src/saved-armies';
import {DRUKHARI_SKYSPLINTER_ARMY,DRUKHARI_REAPERS_ARMY,type DrukhariAcceptanceArmy} from './fixtures/drukhari-armies';

const id=(unit:string,n=1)=>unit+'#'+n;
const instance=(army:ArmySelection,unit:string,n=1)=>army.instances!.find(s=>s.id===id(unit,n))!;
const key=(items:readonly string[])=>items.map(s=>s.toLowerCase()).sort().join('|');
function build(plan:DrukhariAcceptanceArmy){
 let army=individualArmy({...newSelection('Drukhari'),battleSize2026:plan.battleSize,detachments2026:[plan.detachment]});
 const copies=new Map<string,number>();
 for(const row of plan.units){
  const n=(copies.get(row.unit)??0)+1;copies.set(row.unit,n);army=addSelectionUnit(army,row.unit);
  if(row.models!==undefined)army=setInstanceModelCount(army,id(row.unit,n),row.models);
 }
 army=selectDrukhariWarlord(army,plan.warlord);
 for(const [leader,body] of plan.attachments)army=setInstanceAttachment(army,leader,body);
 for(const [bearer,upgrade] of plan.upgrades)army=selectUpgrade2026(army,bearer,upgrade);
 for(const change of plan.gear){
  const squad=instance(army,change.unit,change.copy),matches=drukhariLoadout(change.unit,squad.models)!.slots.flatMap(field=>
   field.name.startsWith(change.owner)?field.choices.filter(choice=>change.choice?choice.name===change.choice:key(choice.items)===key(change.items!)).map(choice=>({field,choice})):[]);
  expect(matches,'Exact equipment choice for '+squad.id+' / '+change.owner).toHaveLength(1);
  army=setKnightGear(army,squad.id,matches[0].field.name,matches[0].choice.name);
 }
 return army;
}
function reopen(plan:DrukhariAcceptanceArmy){
 const army=build(plan),opened=openSavedArmies(JSON.parse(JSON.stringify(initialStore(army))));
 expect(opened.retained).toEqual([]);
 const saved=opened.store.profiles[0].army;
 expect(saved.instances).toEqual(army.instances);expect(saved.upgrades2026).toEqual(army.upgrades2026);expect(saved.warlordId).toEqual(army.warlordId);
 expect(validateSelection(saved)).toBe(true);
 expect(rosterFindings(saved).filter(f=>f.severity!=='info')).toEqual([]);
 expect(rosterFindings(saved).map(f=>[f.code,f.severity])).toEqual([['detachment-points','info']]);
 const cost=rosterCost2026(saved);
 expect(cost.total).toBe(plan.points);expect(cost.entries.map(e=>e.points)).toEqual(plan.units.map(u=>u.points));
 expect(cost.entries.filter(e=>isDrukhariAlly(e.unit)).reduce((sum,e)=>sum+e.points!,0)).toBe(plan.alliedPoints);
 expect(resolvedDrukhariWarlord(saved)?.id).toBe(plan.warlord);
 for(const squad of saved.instances!)expect(validDrukhariGear(squad.unit,squad.knightGear??{},squad.models),squad.id).toBe(true);
 expect(drukhariDedicatedSatisfied(saved)).toBe(true);
 return saved;
}

it('saves and reopens exactly 1,000 Skysplinter points with the 11-model split, eight actual Corsairs and all paid weapons',()=>{
 const army=reopen(DRUKHARI_SKYSPLINTER_ARMY);
 expect(drukhariAllyAllowance(army)).toBe(250);
 const kabalites=drukhariFormations(army).find(f=>f.root.id===id('Kabalite Warriors'))!;
 expect(kabalites.members.map(s=>s.unit)).toEqual(['Kabalite Warriors','Archon']);expect(kabalites.models).toBe(11);
 for(const n of [1,2]){
  const venom=instance(army,'Venom',n);
  expect(drukhariSplitCargoFormations(army,venom).find(f=>f.root.id===kabalites.root.id)).toMatchObject({models:11,spaces:11,halves:[5,6]});
  expect(drukhariCargoFits(army,venom,[kabalites.root.id])).toBe(false);
  expect(drukhariCargoFormations(army,venom).map(f=>f.root.unit)).not.toContain('Archon');
 }
 expect(drukhariCargoFits(army,instance(army,'Raider'),[id('Incubi')])).toBe(true);
 const corsairs=instance(army,'Corsair Voidscarred'),models=drukhariModelLoadouts(corsairs);
 expect(models).toHaveLength(8);
 expect(models.map(m=>m.model).sort()).toEqual(['Corsair Voidscarred','Corsair Voidscarred','Corsair Voidscarred','Corsair Voidscarred','Shade Runner','Soul Weaver','Voidscarred Felarch','Way Seeker'].sort());
 expect(drukhariKeywords(army,corsairs).has('PSYKER')).toBe(true);
 for(const model of models)expect(drukhariKeywords(army,corsairs,model.model).has('PSYKER')).toBe(model.model==='Way Seeker');
 expect(drukhariKeywords(army,corsairs).has('DRUKHARI')).toBe(false);
 for(const name of ['Executioner','Channeller Stones','Faolchú','Mistshield','Paired Hekatarii blades'])expect(drukhariWeaponCount(corsairs,name)).toBe(1);
 expect(drukhariWeaponCount(instance(army,'Kabalite Warriors'),'Kabalite icon')).toBe(1);
 expect(drukhariWeaponCount(instance(army,'Kabalite Warriors'),'Splinter rifle')).toBe(6);
 expect(drukhariWeaponCount(instance(army,'Archon'),'Soul trap')).toBe(1);
 expect(drukhariWeaponCount(instance(army,'Incubi'),'Incubi Shrine token')).toBe(1);
 expect(drukhariModelLoadouts(instance(army,'Incubi'))).toHaveLength(5);
 expect(drukhariWeaponCount(instance(army,'Venom'),'Splinter cannon')).toBe(2);
 expect(drukhariWeaponCount(instance(army,'Venom',2),'Twin splinter rifle')).toBe(1);
 expect(drukhariWeaponCount(instance(army,'Ravager'),'Dark lance')).toBe(0);
 expect(drukhariWeaponCount(instance(army,'Ravager'),'Disintegrator cannon')).toBe(3);
 expect(drukhariWeaponCount(instance(army,'Scourges with Heavy Weapons'),'Dark lance')).toBe(2);
 expect(drukhariWeaponCount(instance(army,'Scourges with Heavy Weapons'),'Haywire blaster')).toBe(1);
 expect(drukhariWeaponCount(instance(army,'Scourges with Heavy Weapons'),'Heat lance')).toBe(1);
 expect(drukhariWeaponCount(instance(army,'Talos'),'Twin haywire blaster')).toBe(1);
 const rows=generate11thReminders(army),cargo=rows.find(r=>r.title==='Venom#1 · Declare passengers')!;
 expect(cargo.summary).toContain('Kabalite Warriors#1 (5 + 6 models)');expect(cargo.summary).toContain('each physical model and its equipment');
 expect(cargo.summary).not.toContain('Corsair Voidscarred');
 const aerialists=rows.find(r=>r.title==='Venom#1 · Aerialists')!;
 expect(aerialists.summary).toContain('cannot be a unit that can Fly');expect(aerialists.summary).toContain('disembarked from a transport');
 const rain=rows.find(r=>r.title==='Rain of Cruelty · shooting')!;
 expect(rain.units).toContain(id('Kabalite Warriors'));expect(rain.units).not.toContain(id('Corsair Voidscarred'));
 expect(rows.find(r=>r.title==='Spiteful Raider · Archon#1')?.units).toEqual([id('Kabalite Warriors')]);
 expect(rows.find(r=>r.title==='Corsairs and Travelling Players')?.summary).toContain('140 of 250 points');
 expect(rows.find(r=>r.title==='Soul Trap')?.units).toEqual([id('Archon')]);
 expect(rows.find(r=>r.title==='Incubi Shrine Token')?.units).toEqual([id('Incubi')]);
 expect(rows.find(r=>r.title==='Channeller Stones')?.summary).toContain('actual Soul Weaver');
 expect(rows.find(r=>r.title==='Faolchú')?.source).toBe('https://wahapedia.ru/wh40k11ed/factions/aeldari/Corsair-Voidscarred');
 const waySeeker=drukhariFullWeaponProfiles(army,corsairs,'Way Seeker');
 expect(waySeeker.find(w=>w.name==='Executioner')).toMatchObject({count:1,range:'18',attacks:'3',skill:'3',strength:6,ap:-2,damage:'D3'});
 for(const role of ['Voidscarred Felarch','Corsair Voidscarred','Shade Runner','Soul Weaver'])expect(drukhariFullWeaponProfiles(army,corsairs,role).some(w=>w.name==='Executioner')).toBe(false);
 const guns=rows.find(r=>r.title===id('Corsair Voidscarred')+' · Ranged weapon profiles'&&r.turn==='own')!;
 expect(guns.summary).toContain('1 × Executioner');expect(guns.summary).toContain('A 3; BS 3+; D D3');
});

it('saves and reopens exactly 2,000 Reaper’s Wager points with 745 Harlequin points, two six-model allied cargoes and mixed native gear',()=>{
 const army=reopen(DRUKHARI_REAPERS_ARMY);
 expect(drukhariAllyAllowance(army)).toBe(1000);
 expect(Object.keys(army.upgrades2026!)).toHaveLength(3);
 const formations=drukhariFormations(army);
 for(const [body,leader,models] of [['Hand of the Archon','Archon',11],['Wyches','Lelith Hesperax',11],['Incubi','Drazhar',6]] as const){
  const formation=formations.find(f=>f.root.unit===body)!;
  expect(formation.members.map(s=>s.unit)).toEqual([body,leader]);expect(formation.models).toBe(models);
 }
 for(const n of [1,2]){
  const carrier=instance(army,'Starweaver',n),cargo=drukhariCargoFormations(army,carrier);
  expect(cargo.find(f=>f.root.id===id('Troupe'))).toMatchObject({models:6,spaces:6});
  expect(cargo.find(f=>f.root.id===id('Troupe',2))).toMatchObject({models:6,spaces:6});
  expect(drukhariCargoFits(army,carrier,[id('Troupe',n)])).toBe(true);
  expect(drukhariCargoFits(army,carrier,[id('Troupe'),id('Troupe',2)])).toBe(false);
  for(const name of ['Troupe Master','Shadowseer','Hand of the Archon','Wyches','Incubi'])expect(cargo.map(f=>f.root.unit)).not.toContain(name);
 }
 for(const [carrier,body] of [['Raider','Hand of the Archon'],['Raider','Wyches'],['Venom','Incubi']])expect(drukhariCargoFits(army,instance(army,carrier),[id(body)])).toBe(true);
 expect(drukhariHasInfiltrators(army,instance(army,'Troupe',2))).toBe(true);
 expect(drukhariHasInfiltrators(army,instance(army,'Troupe'))).toBe(false);
 for(const n of [1,2])expect(drukhariWeaponCount(instance(army,'Troupe',n),'Fusion pistol')).toBe(2);
 expect(drukhariWeaponCount(instance(army,'Troupe'),'Neuro disruptor')).toBe(2);
 const talos=instance(army,'Talos'),talosModels=drukhariModelLoadouts(talos);
 expect(talosModels).toHaveLength(2);expect(talosModels[0].items.filter(i=>i==='Macro-scalpel')).toHaveLength(2);
 expect(talosModels[1].items).toEqual(['Talos gauntlet','Twin liquifier gun','Twin haywire blaster']);
 expect(drukhariWeaponCount(talos,'Twin haywire blaster')).toBe(2);
 expect(drukhariModelLoadouts(instance(army,'Wracks'))).toHaveLength(8);
 expect(drukhariModelLoadouts(instance(army,'Hand of the Archon')).filter(m=>m.items.includes('Stimm-needler'))).toHaveLength(1);
 expect(drukhariModelLoadouts(instance(army,'Reavers')).find(m=>m.items.includes('Grav-talon'))?.model).toBe('Arena Champion');
 const rows=generate11thReminders(army),rapid=rows.find(r=>r.title==='Starweaver#1 · Rapid Embarkation')!;
 expect(rapid.summary).toContain('Harlequins');expect(rapid.summary).toContain('disembarked from this transport');
 expect(rapid.summary).not.toContain('cannot be a unit that can Fly');
 const cargo=rows.find(r=>r.title==='Starweaver#1 · Declare passengers')!;
 expect(cargo.summary).toContain('Troupe#1 (6 models)');expect(cargo.summary).toContain('Troupe#2 (6 models)');
 expect(cargo.summary).not.toContain('Hand of the Archon');
 expect(rows.find(r=>r.title==='Reaper’s Wager · Harlequin allies')?.summary).toContain('745 of 1000 points');
 expect(rows.find(r=>r.title==='Archraider · Troupe Master#1')?.units).toEqual([id('Troupe')]);
 expect(rows.find(r=>r.title==='Archraider · Troupe Master#1')?.summary).toContain('Starweaver#1');
 expect(rows.find(r=>r.title==='Archraider · Troupe Master#1')?.summary).not.toContain('Raider#1');
 expect(rows.find(r=>r.title==='Reaper’s Cowl · Shadowseer#1')?.units).toEqual([id('Troupe',2)]);
 expect(rows.find(r=>r.title==='Conductor of Torment · Archon#1')?.units).toEqual([id('Archon')]);
 expect(rows.find(r=>r.title==='Callous Competition')?.summary).toContain('Drukhari are winning');
 expect(rows.find(r=>r.title==='Stimm-needler')?.units).toEqual([id('Hand of the Archon'),id('Archon')]);
 expect(rows.find(r=>r.title==='Grav-talon')?.summary).toContain('Arena Champion');
 expect(rows.find(r=>r.title==='Starweaver#1 · Rapid Embarkation')?.source).toBe('https://wahapedia.ru/wh40k11ed/factions/aeldari/Starweaver');
 expect(rows.find(r=>r.title==='Venom#1 · Aerialists')?.source).toBe('https://wahapedia.ru/wh40k11ed/factions/drukhari/Venom');
});
