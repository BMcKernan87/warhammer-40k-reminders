// @vitest-environment node
import {expect,it} from 'vitest';
import {addSelectionUnit,CATALOG,newSelection,validateSelection,type ArmySelection,type Faction} from '../src/catalog';
import {CHAPTER_NATIVE_SHEETS,CHAPTER_MEMBERSHIP} from '../src/space-marine-chapters-native.generated';
import {spaceMarineCard} from '../src/space-marines-card-data';
import {spaceMarineMusterUnits,spaceMarineChapter} from '../src/space-marines-muster-data';
import {spaceMarineUnitLimit,spaceMarineWarlordCandidates} from '../src/space-marines-muster';
import {spaceMarineKeywords} from '../src/space-marines-keywords';
import {spaceMarineModelLoadouts,spaceMarineLoadout} from '../src/space-marines-loadouts';
import {spaceMarineCargoFormations,spaceMarineDedicatedSatisfied,spaceMarineTransportReminders} from '../src/space-marines-transports';
import {spaceMarineDatasheetCoreReminders,spaceMarineFormationScoutRange} from '../src/space-marines-datasheet-core';
import {spaceMarineFullWeaponProfiles,spaceMarineWeaponReminders} from '../src/space-marines-weapons';
import {spaceMarineDoctrineReminders} from '../src/space-marines-doctrines';
import {spaceMarineIntrinsicReminders} from '../src/space-marines-intrinsic';
import {spaceMarineFormations} from '../src/space-marines-formations';
import {DATASHEETS_2026,rosterCost2026,verifiedUnitSizes2026} from '../src/datasheets-2026';
import {DETACHMENTS_2026,detachmentBudget} from '../src/edition-2026';
import {expandRoster,individualArmy,setInstanceAttachment,setInstanceModelCount} from '../src/roster-instances';
import {eligibleUpgrades2026,selectUpgrade2026} from '../src/upgrades-2026';
import {instanceBodyguards,rosterAttachmentRole} from '../src/leader-eligibility';
import {setKnightGear,knightLoadoutFor} from '../src/knight-loadouts';
import {generate11thReminders} from '../src/reminders-11th';
import {migrateSavedArmy} from '../src/migrate-saved-army';

const id=(u:string,n=1)=>u+'#'+n;
function build(faction:Faction,units:string[],detachments=['Ironstorm Spearhead'],size:ArmySelection['battleSize2026']='Strike Force'){
 let a=individualArmy({...newSelection(faction),detachments2026:detachments,battleSize2026:size});
 for(const u of units)a=addSelectionUnit(a,u);return a;
}
const squad=(a:ArmySelection,u:string,n=1)=>expandRoster(a).find(s=>s.id===id(u,n))!;
const join=(a:ArmySelection,l:string,b:string)=>setInstanceAttachment(a,id(l),id(b));

it.each(CHAPTER_NATIVE_SHEETS)('$faction: $unit reaches the shared editor, points and equipment paths',sheet=>{
 const a=build(sheet.faction,[sheet.unit]);
 expect(CATALOG[sheet.faction].units).toContain(sheet.unit);
 for(const count of verifiedUnitSizes2026(a,sheet.unit)!){
  const changed=setInstanceModelCount(a,id(sheet.unit),count),s=squad(changed,sheet.unit);
  expect(validateSelection(changed),sheet.unit+' '+count).toBe(true);
  expect(spaceMarineModelLoadouts(s,sheet.faction)).toHaveLength(count);
  expect(knightLoadoutFor(sheet.faction,sheet.unit,count,s.knightGear)).toBeDefined();
  expect(rosterCost2026(changed).total).not.toBeNull();
  expect(spaceMarineFullWeaponProfiles(changed,s).length).toBeGreaterThan(0);
 }
});
it.each(['Blood Angels','Dark Angels','Black Templars','Space Wolves'] as const)('%s has current chapter membership, shared detachments and allies',faction=>{
 const a=build(faction,['Captain']);
 expect(spaceMarineChapter(a)).toBe(faction.toUpperCase());
 for(const u of CHAPTER_MEMBERSHIP[faction])expect(spaceMarineMusterUnits(a)).toContain(u);
 expect(spaceMarineMusterUnits(a)).not.toContain('Marneus Calgar');
 expect(spaceMarineMusterUnits(a)).not.toContain('Deathwatch Veterans');
 expect(spaceMarineMusterUnits({...a,detachments2026:['Deathwatch Support']})).toContain('Deathwatch Veterans');
 expect(spaceMarineMusterUnits(a)).toContain('Inquisitor');
 expect(spaceMarineMusterUnits(a)).toContain('Armiger Warglaive');
 expect(DETACHMENTS_2026[faction]).toHaveLength(faction==='Black Templars'?18:19);
 expect(DETACHMENTS_2026[faction]?.some(d=>d.name==='Gladius Task Force')).toBe(faction!=='Black Templars');
 const sheets=DATASHEETS_2026.filter(s=>s.faction===faction);
 expect(new Set(sheets.map(s=>s.unit)).size).toBe(sheets.length);
});
it('uses current Terminator uniqueness and preserves 3DP Incursion exceptions',()=>{
 expect(detachmentBudget('Dark Angels',['Wrath of the Rock','Terminator Storm Force'],'Strike Force').valid).toBe(false);
 expect(detachmentBudget('Space Wolves',['Champions of Fenris','Terminator Storm Force'],'Strike Force').valid).toBe(false);
 expect(detachmentBudget('Blood Angels',['Angelic Inheritors'],'Incursion').valid).toBe(true);
 expect(detachmentBudget('Black Templars',['Gladius Task Force'],'Strike Force').valid).toBe(false);
});
it('keeps Templar vehicle cards, physical weapons and paid inventory distinct',()=>{
 const templar=build('Black Templars',['Gladiator Valiant','Repulsor Executioner']);
 expect(rosterCost2026(templar).entries.map(e=>e.points)).toEqual([165,265]);
 expect(rosterCost2026(templar).entries[0].wargearPoints).toBe(20);
 const generic=build('Space Marines',['Gladiator Valiant','Repulsor Executioner']);
 expect(spaceMarineCard('Gladiator Valiant','Black Templars')?.source).not.toBe(spaceMarineCard('Gladiator Valiant','Space Marines')?.source);
 expect(spaceMarineFullWeaponProfiles(templar,squad(templar,'Gladiator Valiant')).find(w=>w.name==='Multi-melta')?.count).toBe(2);
 expect(spaceMarineFullWeaponProfiles(generic,squad(generic,'Gladiator Valiant')).find(w=>w.name==='Multi-melta')?.count).toBe(2);
});
it('rejects native Templar Psykers but retains eligible Assigned Agents',()=>{
 const a=build('Black Templars',['Marshal','Inquisitor']);
 expect(spaceMarineMusterUnits(a)).not.toContain('Librarian');
 expect(spaceMarineMusterUnits(a)).toContain('Inquisitor');
 expect(spaceMarineWarlordCandidates(a).map(s=>s.unit)).toEqual(['Marshal']);
 expect(spaceMarineUnitLimit(a,'Emperor’s Champion')).toBe(1);
});
it('requires the Lion as Warlord and never permits Murderfang',()=>{
 expect(spaceMarineWarlordCandidates(build('Dark Angels',['Lion El’jonson','Azrael'])).map(s=>s.unit)).toEqual(['Lion El’jonson']);
 expect(spaceMarineWarlordCandidates(build('Space Wolves',['Murderfang','Ragnar Blackmane'])).map(s=>s.unit)).toEqual(['Ragnar Blackmane']);
});
it('grants actual Deathwing and Ravenwing model eligibility without inventing Chapter identity',()=>{
 const a=build('Dark Angels',['Captain In Terminator Armour','Chaplain On Bike','Bladeguard Ancient','Outrider Squad'],['Wrath of the Rock','Darkflight Pursuit']);
 const captain=squad(a,'Captain In Terminator Armour'),bike=squad(a,'Chaplain On Bike');
 expect(spaceMarineKeywords(a,captain,'Captain In Terminator Armour')).toContain('DEATHWING');
 expect(spaceMarineKeywords(a,bike,'Chaplain On Bike')).toContain('RAVENWING');
 expect(spaceMarineKeywords(a,captain)).not.toContain('DARK ANGELS');
 expect(spaceMarineUnitLimit(a,'Outrider Squad')).toBe(6);
 expect(eligibleUpgrades2026(a,captain.unit,captain.id).some(u=>u.name==='Deathwing Assault')).toBe(true);
 expect(eligibleUpgrades2026(a,'Bladeguard Ancient',id('Bladeguard Ancient')).some(u=>u.name==='Deathwing Assault')).toBe(false);
});
it('keeps native attachments faction aware and applies explicit unit keyword grants to the actual joined models',()=>{
 const a=join(build('Dark Angels',['Captain','Sternguard Veteran Squad']), 'Captain','Sternguard Veteran Squad');
 expect(rosterAttachmentRole('Dark Angels','Captain')).toBe('leader');
 expect(spaceMarineKeywords(a,squad(a,'Captain'),'Captain')).toContain('DEATHWING');
 expect(spaceMarineKeywords(a,squad(a,'Captain'),'Captain')).not.toContain('DARK ANGELS');
 expect(instanceBodyguards(build('Blood Angels',['Blood Angels Captain']),{id:id('Blood Angels Captain'),unit:'Blood Angels Captain'})).toContain('Assault Intercessor Squad');
});
it('makes Wolf-Touched instance specific and retains printed Leader/Support roles',()=>{
 let a=build('Space Wolves',['Captain','Captain','Wulfen','Lieutenant'],['Saga of the Beastslayer']);
 a=selectUpgrade2026(a,id('Captain'),'Wolf-Touched');
 expect(instanceBodyguards(a,squad(a,'Captain'))).toContain('Wulfen');
 expect(instanceBodyguards(a,squad(a,'Captain',2))).not.toContain('Wulfen');
 a=join(a,'Captain','Wulfen');
 expect(spaceMarineKeywords(a,squad(a,'Captain'),'Captain')).toContain('WULFEN');
 expect(spaceMarineKeywords(a,squad(a,'Captain',2),'Captain')).not.toContain('WULFEN');
 expect(rosterAttachmentRole('Space Wolves','Lieutenant',a)).toBe('support');
});
it('charges no transport spaces for Cenobyte Servitors while retaining their physical models',()=>{
 let a=build('Black Templars',['Chaplain Grimaldus','Castellan','Crusader Squad','Rhino']);
 a=join(join(a,'Chaplain Grimaldus','Crusader Squad'),'Castellan','Crusader Squad');
 const g=spaceMarineCargoFormations(a,squad(a,'Rhino')).find(g=>g.root.unit==='Crusader Squad');
 expect(g?.models).toBe(15);expect(g?.spaces).toBe(12);expect(spaceMarineDedicatedSatisfied(a)).toBe(true);
});
it('counts Wulfen transport spaces per actual model and supports the Templar Jump Pack transport exception',()=>{
 const wolves=build('Space Wolves',['Wulfen','Impulsor','Land Raider']);
 expect(spaceMarineCargoFormations(wolves,squad(wolves,'Impulsor')).some(g=>g.root.unit==='Wulfen')).toBe(false);
 expect(spaceMarineCargoFormations(wolves,squad(wolves,'Land Raider')).find(g=>g.root.unit==='Wulfen')?.spaces).toBe(10);
 const a=build('Black Templars',['Assault Intercessors With Jump Packs','Repulsor']);
 expect(spaceMarineCargoFormations(a,squad(a,'Repulsor')).find(g=>g.root.unit==='Assault Intercessors With Jump Packs')?.spaces).toBe(10);
});
it('preserves Darkshroud 15-inch Lone Operative and equipped shield effects',()=>{
 const a=build('Dark Angels',['Ravenwing Darkshroud']);
 const rows=spaceMarineDatasheetCoreReminders(a).filter(r=>r.title.endsWith('Lone Operative'));
 expect(rows.length).toBeGreaterThan(0);expect(rows.every(r=>r.summary.includes('15″'))).toBe(true);
 const w=build('Space Wolves',['Venerable Dreadnought']);
 const kit=spaceMarineLoadout('Venerable Dreadnought',1,'Space Wolves')!;
 const slot=kit.slots.find(s=>s.choices.some(c=>/blizzard shield/i.test(c.name)))!;
 const equipped=setKnightGear(w,id('Venerable Dreadnought'),slot.name,slot.choices.find(c=>/blizzard shield/i.test(c.name))!.name);
 expect(spaceMarineDatasheetCoreReminders(equipped).some(r=>r.title.includes('Blizzard Shield')&&r.summary.includes('4+ invulnerable'))).toBe(true);
});
it('applies Death Company Scouts and blocks forbidden doctrine prompts',()=>{
 const a=join(build('Blood Angels',['Death Company Captain','Death Company Marines','Intercessor Squad'],['Wrath of the Doomed']),'Death Company Captain','Death Company Marines');
 const group=spaceMarineFormations(a).find(g=>g.root.unit==='Death Company Marines')!;
 expect(spaceMarineFormationScoutRange(a,group)).toBe(6);
 const rows=spaceMarineDoctrineReminders(a);
 expect(rows.find(r=>r.id==='11e-sm-combat-doctrines')?.units).toEqual([id('Intercessor Squad')]);
 expect(rows.filter(r=>r.summary.includes('Tactical')).every(r=>!r.units?.includes(id('Death Company Marines')))).toBe(true);
});
it('recognizes named chapter psyker budgets, BA Captain cooperation and normal reactive weapons',()=>{
 for(const [faction,unit] of [['Blood Angels','Chief Librarian Mephiston'],['Dark Angels','Ezekiel'],['Space Wolves','Njal Stormcaller']] as const){
  const a=build(faction,[unit]);expect(spaceMarineDoctrineReminders(a).some(r=>r.id==='11e-sm-librarius-budget'&&r.units?.includes(id(unit)))).toBe(true);
 }
 const a=build('Blood Angels',['Blood Angels Captain','Lieutenant','Intercessor Squad']);
 expect(spaceMarineIntrinsicReminders(a).some(r=>r.title.includes('Demi-company Commander'))).toBe(true);
 const da=build('Dark Angels',['Land Speeder Vengeance']);
 expect(spaceMarineWeaponReminders(da).some(r=>r.turn==='opponent'&&r.window==='Shooting'&&r.summary.includes('Storm of Vengeance'))).toBe(true);
});
it('keeps current card names and composition selections through saving and migration',()=>{
 let a=build('Black Templars',['Marshal','Crusader Squad'],['Marshal’s Household']);
 a=setInstanceModelCount(a,id('Crusader Squad'),14);
 const slot=knightLoadoutFor(a.faction,'Crusader Squad',14)?.slots.find(s=>s.name==='Unit composition')!;
 a=setKnightGear(a,id('Crusader Squad'),'Unit composition',slot.choices.at(-1)!.name);
 const saved=migrateSavedArmy(JSON.parse(JSON.stringify(a))) as ArmySelection;
 expect(validateSelection(saved)).toBe(true);expect(saved).toEqual(a);
 expect(spaceMarineModelLoadouts(squad(saved,'Crusader Squad'),saved.faction)).toHaveLength(14);
 expect(generate11thReminders(saved).length).toBeGreaterThan(20);
 expect(spaceMarineTransportReminders(saved)).toEqual([]);
});
