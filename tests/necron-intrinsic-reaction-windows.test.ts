import {describe,expect,it} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {individualArmy,expandRoster,setInstanceAttachment,setInstanceModelLoadouts} from '../src/roster-instances';
import {setRetinue} from '../src/necron-retinues';
import {necronDatasheetReminders2026} from '../src/necron-datasheet-reminders-2026';
import {generate11thReminders} from '../src/reminders-11th';
import {battlefieldReminders} from '../src/necron-battlefield';
import {createBattle} from '../src/engine';

// Primary Core Rules 05.03, 15.08–09, 19.04, 24.24 and 24.33:
// https://assets.warhammer-community.com/eng_01-06_warhammer40k_new40k_core_rules-was6fbu1ix-hfewhmxyiy.pdf
// Current core 15.09 expressly excludes Critical Hits from snap shooting:
// https://wahapedia.ru/wh40k11ed/the-rules/core-rules/#SNAP-SHOOTING
// Stealth: "each time a ranged attack targets that unit" (p85).
// Necrons Faction Pack v1.3 p30: Timesplinter Mantle gives "This unit has Stealth."
// Retinue cards pp14/16 make their models part of the Bodyguard until battle end;
// core 19.04 p67 ends Bodyguard abilities only at the last Bodyguard model's loss.
// https://assets.warhammer-community.com/eng_30-09_wh40k_faction_pack_necrons-1urphgbmpy-wbhocjbaba.pdf
// Current app transcriptions, checked against the November 23 export:
// https://wahapedia.ru/wh40k11ed/factions/necrons/Tomb-Blades
// https://wahapedia.ru/wh40k11ed/factions/necrons/Canoptek-Wraiths
// https://wahapedia.ru/wh40k11ed/factions/necrons/The-Silent-King
// https://wahapedia.ru/wh40k11ed/factions/necrons/Tesseract-Vault

const army=(...units:string[])=>individualArmy(units.reduce((a,u)=>addSelectionUnit(a,u),newSelection('Necrons')));
const named=(a:ReturnType<typeof army>,name:string)=>generate11thReminders(a).filter(r=>r.title.includes(' · '+name));
const movement=(a:ReturnType<typeof army>,name:string)=>named(a,name).filter(r=>r.window==='Movement');

describe('Necron attack effects during Movement reactions',()=>{
 it('preserves personal invulnerable saves against incoming Overwatch without lending them to attached models',()=>{
  const a=setInstanceAttachment(army('Canoptek Wraiths','Technomancer','Seraptek Heavy Construct'),'Technomancer#1','Canoptek Wraiths#1');
  expect(movement(a,'4+ invulnerable save')).toMatchObject([{units:['Canoptek Wraiths#1'],summary:expect.stringContaining('Fire Overwatch')}]);
  expect(movement(a,'5+ invulnerable save')).toMatchObject([{units:['Seraptek Heavy Construct#1']}]);
  expect(movement(a,'Rites of Reanimation')[0].units).toEqual(expect.arrayContaining(['Technomancer#1','Canoptek Wraiths#1']));
  expect(movement(army('Immortals'),'4+ invulnerable save')).toEqual([]);
 });

 it('gives only the actual Chronomancer formation its Stealth against Movement attacks',()=>{
  const a=setInstanceAttachment(army('Chronomancer','Immortals','Immortals'),'Chronomancer#1','Immortals#1');
  const rows=movement(a,'Timesplinter Mantle');
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({turn:'either',timing:'during',units:['Chronomancer#1','Immortals#1']});
  expect(rows[0].summary).toMatch(/Fire Overwatch.*Stealth.*Benefit of Cover/);
  expect(movement(army('Immortals'),'Timesplinter Mantle')).toEqual([]);
 });

 it('keeps mixed Tomb Blade optics on their actual bearers during Overwatch and incoming fire',()=>{
  const a=setInstanceModelLoadouts(army('Tomb Blades','Tomb Blades'),'Tomb Blades#1',[
   {primary:'Twin gauss blaster',gear:['Nebuloscope']},
   {primary:'Twin tesla carbine',gear:['Shadowloom']},
   {primary:'Particle beamer',gear:['Shadowloom']},
  ]);
  const scopes=movement(a,'Nebuloscope');
  expect(scopes).toHaveLength(1);
  expect(scopes[0]).toMatchObject({turn:'opponent',timing:'end',units:['Tomb Blades#1']});
  expect(scopes[0].summary).toMatch(/when using Fire Overwatch.*surviving Nebuloscope bearers.*Ignores Cover.*1 originally equipped.*Twin gauss blaster/);
  expect(scopes[0].summary).not.toMatch(/Twin tesla carbine|Particle beamer/);
  expect(movement(a,'Shadowloom')).toMatchObject([{turn:'either',units:['Tomb Blades#1'],summary:expect.stringMatching(/surviving shadowloom bearers|Surviving shadowloom bearers/)}]);
  expect(movement(a,'Shadowloom')[0].summary).toContain('only if every model in the unit has Stealth');
  const battle={...createBattle(),phase:'Movement' as const,player:'B' as const};
  expect(battlefieldReminders(a,battle,'overwatch',{action:'overwatch',squadId:'Tomb Blades#1'}).some(r=>r.ruleId==='nebuloscope')).toBe(true);
  expect(battlefieldReminders(a,{...battle,player:'A'},'targeted',{action:'targeted',squadId:'Tomb Blades#1'}).some(r=>r.ruleId==='tomb-shadowloom')).toBe(true);
  expect(movement(army('Tomb Blades'),'Nebuloscope')).toEqual([]);
  expect(movement(army('Tomb Blades'),'Shadowloom')).toEqual([]);
 });

 it('keeps printed Stealth and conditional Lone Operative defenses available against Movement shooting',()=>{
  const a=army('C’tan Shard of the Deceiver','Flayed Ones','Hexmark Destroyer','Illuminor Szeras','Nekrosor Ammentar');
  expect(movement(a,'Stealth').map(r=>r.units?.[0])).toEqual(['C’tan Shard of the Deceiver#1','Flayed Ones#1']);
  expect(movement(a,'Lone Operative')[0].summary).toMatch(/outside 12″.*Fire Overwatch/);
  expect(movement(a,'Illuminor')[0].summary).toMatch(/within 3″ of another friendly Necron unit.*Fire Overwatch/);
  expect(movement(a,'Protective Disciples')[0].summary).toMatch(/within 3″ of another friendly Destroyer Cult unit.*Fire Overwatch/);
  expect(movement(army('Illuminor Szeras'),'Illuminor')).toEqual([]);
  expect(movement(army('Nekrosor Ammentar','Immortals'),'Protective Disciples')).toEqual([]);
 });

 it('retains the selected Phaeron aura for legal normal reactions and only the permitted Wound rerolls for snap shots',()=>{
  const a=army('The Silent King','Deathmarks','C’tan Shard of the Deceiver');
  const rows=movement(a,'Phaeron of the Stars');
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({timing:'during',units:['The Silent King#1','Deathmarks#1']});
  expect(rows[0].summary).toMatch(/If selected this battle round.*within 6″ of the surviving Szarekh model.*permitted attacks.*re-roll Wound rolls of 1/);
  expect(rows[0].summary).toMatch(/Hit rolls of 1 can also be re-rolled except when using snap shooting/);
  expect(rows[0].summary).toMatch(/Snap shooting.*cannot re-roll Hit rolls or score Critical Hits/);
  expect(named(a,'Phaeron of the Stars').find(r=>r.window==='Shooting')?.summary).toContain('cannot re-roll Hit rolls');
  expect(movement(army('Deathmarks'),'Phaeron of the Stars')).toEqual([]);
 });

 it('offers Prophet only after Nekrosor destroys a unit, including a permitted Movement attack',()=>{
  // Publisher v1.3 p27: "Each time this model destroys an enemy unit".
  // A second Hexmark may subsequently use its own Inescapable Death exception;
  // Prophet itself neither permits shooting nor waives snap-shooting restrictions.
  const a=army('Nekrosor Ammentar','Hexmark Destroyer','Immortals');
  const rows=movement(a,'Prophet of Destruction');
  expect(rows).toMatchObject([{timing:'during',units:['Hexmark Destroyer#1']}]);
  expect(rows[0].summary).toMatch(/When Nekrosor destroys an enemy unit.*another friendly Destroyer Cult unit within 9″.*re-roll Wound rolls of 1 for the rest of this phase/);
  expect(rows[0].summary).not.toMatch(/may shoot|Hit roll|Critical Hit/);
  expect(movement(army('Nekrosor Ammentar','Immortals'),'Prophet of Destruction')).toEqual([]);
 });

 it('restricts temporary Vault power selection and its damaged limit to the own Shooting phase',()=>{
  // Current card: "In your Shooting phase, when this model is selected to shoot".
  const a={...army('Tesseract Vault'),detachments2026:['Awakened Dynasty']};
  const rows=named(a,'Powers of the C’tan');
  expect(rows).toMatchObject([{window:'Shooting',turn:'own',timing:'during'}]);
  expect(rows[0].summary).toMatch(/selected to shoot in your Shooting phase.*until this phase ends/);
  expect(named(a,'Damaged profile').find(r=>r.window==='Shooting')).toMatchObject({turn:'own',summary:expect.stringContaining('in your Shooting phase')});
  const opponentRows=generate11thReminders(a).filter(r=>r.window==='Shooting'&&r.turn!=='own');
  expect(opponentRows.some(r=>r.title.includes('Powers of the C’tan'))).toBe(false);
  expect(opponentRows.some(r=>r.summary.includes('select at most one C’tan Powers weapon'))).toBe(false);
 });
});

describe('original Necron formation sources in intrinsic reminders',()=>{
 it('retains a surviving Support’s while-leading effect after the original Bodyguard dies and ends it at source loss',()=>{
  const a=setInstanceAttachment(setInstanceAttachment(army('Immortals','Overlord','Technomancer'),'Overlord#1','Immortals#1'),'Technomancer#1','Immortals#1');
  const live=expandRoster(a).filter(s=>s.unit!=='Immortals');
  const rows=necronDatasheetReminders2026(a,live).filter(r=>r.title.includes('Rites of Reanimation'));
  expect(rows).toHaveLength(5);
  expect(rows.every(r=>r.units?.slice().sort().join()===['Overlord#1','Technomancer#1'].sort().join())).toBe(true);
  expect(rows[0].summary).toMatch(/continues after the original Bodyguard is destroyed.*until the attacking unit finishes its attacks/);
  expect(necronDatasheetReminders2026(a,live.filter(s=>s.unit!=='Technomancer')).some(r=>r.title.includes('Rites of Reanimation'))).toBe(false);
  expect(necronDatasheetReminders2026(army('Technomancer')).some(r=>r.title.includes('Rites of Reanimation'))).toBe(false);
 });

 it.each([
  ['Immortals','Implacable Eradication'],
  ['Necron Warriors','Their Number is Legion'],
  ['Canoptek Wraiths','Wraith Form'],
 ])('keeps %s unit abilities while its joined retinue remains, without inheriting personal profiles', (body,ability)=>{
  let a=setInstanceAttachment(army(body,'Technomancer','Canoptek Tomb Crawlers'),'Technomancer#1',body+'#1');
  a=setRetinue(a,'Canoptek Tomb Crawlers#1',body+'#1');
  const live=expandRoster(a).filter(s=>s.unit==='Canoptek Tomb Crawlers');
  const rows=necronDatasheetReminders2026(a,live);
  const retained=rows.filter(r=>r.title.includes(ability));
  expect(retained.length).toBeGreaterThan(0);
  expect(retained.every(r=>r.units?.join()==='Canoptek Tomb Crawlers#1')).toBe(true);
  expect(retained[0].summary).toContain('retinue is still part of the original '+body+' Bodyguard unit');
  expect(rows.some(r=>r.title.includes('4+ invulnerable save'))).toBe(false);
  expect(rows.some(r=>r.title.startsWith(body+'#1')&&r.title.includes('weapon abilities'))).toBe(false);
  const onlySupport=expandRoster(a).filter(s=>s.unit==='Technomancer');
  expect(necronDatasheetReminders2026(a,onlySupport).some(r=>r.title.includes(ability))).toBe(false);
 });

 it('keeps only surviving Crypteks as Bound Creation recipients',()=>{
  let a=setInstanceAttachment(army('Immortals','Technomancer','Cryptothralls'),'Technomancer#1','Immortals#1');
  a=setRetinue(a,'Cryptothralls#1','Immortals#1');
  const live=expandRoster(a).filter(s=>s.unit!=='Immortals');
  const bound=necronDatasheetReminders2026(a,live).filter(r=>r.title.includes('Bound Creation'));
  expect(bound).toHaveLength(5);
  expect(bound.every(r=>r.units?.join()==='Technomancer#1')).toBe(true);
  expect(necronDatasheetReminders2026(a,live.filter(s=>s.unit!=='Technomancer')).some(r=>r.title.includes('Bound Creation'))).toBe(false);
 });

 it('rejects a retinue moved to a different originally legal formation in the supplied live roster',()=>{
  let a=army('Immortals','Immortals','Technomancer','Plasmancer','Cryptothralls');
  a=setInstanceAttachment(setInstanceAttachment(a,'Technomancer#1','Immortals#1'),'Plasmancer#1','Immortals#2');
  a=setRetinue(a,'Cryptothralls#1','Immortals#1');
  const live=expandRoster(a).map(s=>s.unit==='Cryptothralls'?{...s,retinueTo:'Immortals#2'}:s);
  const rows=necronDatasheetReminders2026(a,live);
  expect(rows.some(r=>r.title.includes('Bound Creation'))).toBe(false);
  expect(rows.some(r=>r.title.includes('Cryptek Retinue'))).toBe(false);
 });

 it('does not use a surviving ID with a changed model identity as the original Cryptek source',()=>{
  let a=setInstanceAttachment(army('Immortals','Technomancer','Cryptothralls'),'Technomancer#1','Immortals#1');
  a=setRetinue(a,'Cryptothralls#1','Immortals#1');
  const live=expandRoster(a).map(s=>s.unit==='Technomancer'?{...s,unit:'Royal Warden'}:s);
  expect(necronDatasheetReminders2026(a,live).some(r=>r.title.includes('Bound Creation'))).toBe(false);
 });

 it('keeps originally attached Trazyn’s objective rule after his Bodyguard is destroyed',()=>{
  const a=setInstanceAttachment(army('Trazyn the Infinite','Immortals'),'Trazyn the Infinite#1','Immortals#1');
  const live=expandRoster(a).filter(s=>s.unit==='Trazyn the Infinite');
  expect(necronDatasheetReminders2026(a,live).filter(r=>r.title.includes('Ancient Collector'))).toMatchObject([{window:'Command',timing:'end',units:['Trazyn the Infinite#1']}]);
  expect(necronDatasheetReminders2026(army('Trazyn the Infinite')).some(r=>r.title.includes('Ancient Collector'))).toBe(false);
 });
});
