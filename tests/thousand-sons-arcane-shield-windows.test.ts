// @vitest-environment node
import {expect,it} from 'vitest';
import {addSelectionUnit,newSelection,type ArmySelection} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
import {individualArmy,setInstanceAttachment} from '../src/roster-instances';

// November 23 export: Datasheets_abilities, datasheet 000001033,
// Arcane Shield (Psychic) grants a 4+ invulnerable save to models in the led unit.
// https://wahapedia.ru/wh40k11ed/factions/thousand-sons/Exalted-Sorcerer
// Core 05.03–05.04 and 15.08–15.09: saves also apply to reactive attacks,
// including snap shooting; they are not restricted to the enemy Shooting phase.
// https://assets.warhammer-community.com/eng_01-06_warhammer40k_new40k_core_rules-was6fbu1ix-hfewhmxyiy.pdf
// Normal reactions can occur before Movement ends (Hyperspace Hunters) and
// in our Shooting phase (Multi-threat Eliminator).
// https://wahapedia.ru/wh40k11ed/factions/necrons/Deathmarks
// https://wahapedia.ru/wh40k11ed/factions/necrons/Hexmark-Destroyer
// Servo-sentry permits incoming arrival attacks in the opponent's Movement too:
// https://assets.warhammer-community.com/eng_30-09_wh40k_faction_pack_astra_militarum-1hevkhdpmv-stfkch2tsz.pdf#page=24

const sorcerer='Exalted Sorcerer#1',rubrics='Rubric Marines#1',robots='Sekhetar Robots#1';
function army():ArmySelection{
 let a=individualArmy({...newSelection('Thousand Sons'),detachments2026:['Rubricae Phalanx']});
 for(const unit of ['Exalted Sorcerer','Rubric Marines','Rubric Marines','Sekhetar Robots'])a=addSelectionUnit(a,unit);
 return a;
}
const named=(a:ArmySelection,title:string)=>generate11thReminders(a).filter(r=>r.title===title);

it('covers incoming attacks in either Movement phase, end-phase Overwatch and own-Shooting return fire while preserving Arcane Shield IDs',()=>{
 const a=setInstanceAttachment(army(),sorcerer,rubrics),rows=named(a,'Arcane Shield');
 expect(rows.map(r=>[r.window,r.turn,r.timing])).toEqual([
  ['Shooting','opponent','during'],['Movement','own','during'],['Fight','either','during'],['Shooting','own','during'],['Movement','opponent','during'],
 ]);
 expect(rows.map(r=>r.id)).toEqual([
  '11e-ts-card:Exalted Sorcerer#1:Arcane Shield:Shooting:opponent:during',
  '11e-ts-card:Exalted Sorcerer#1:Arcane Shield:Movement:own:end',
  '11e-ts-card:Exalted Sorcerer#1:Arcane Shield:Fight:either:during',
  '11e-ts-card:Exalted Sorcerer#1:Arcane Shield:Shooting:own:during',
  '11e-ts-card:Exalted Sorcerer#1:Arcane Shield:Movement:opponent:during',
 ]);
 for(const row of rows)expect(row).toMatchObject({
  units:[sorcerer,rubrics],origin:'unit',
  summary:'While this Exalted Sorcerer leads the formation, every model in it has a 4+ invulnerable save.',
  source:'https://wahapedia.ru/wh40k11ed/factions/thousand-sons/Exalted-Sorcerer',
 });
 const all=generate11thReminders(a);
 expect(new Set(all.map(r=>r.id)).size).toBe(all.length);
});

it('keeps the leading formation’s 4+ shield distinct from personal saves and other formations',()=>{
 const a=setInstanceAttachment(army(),sorcerer,rubrics);
 for(const row of named(a,'Arcane Shield')){
  expect(row.units).toEqual([sorcerer,rubrics]);
  expect(row.units).not.toContain('Rubric Marines#2');
  expect(row.units).not.toContain(robots);
 }
 for(const [unit,save] of [[sorcerer,4],[rubrics,5],[robots,5]] as const){
  const personal=named(a,unit+' · Invulnerable save');
  expect(personal).toHaveLength(5);
  expect(personal.every(r=>r.units?.join()===unit&&r.summary.includes(save+'+ invulnerable save'))).toBe(true);
 }
});

it.each([undefined,robots])('does not grant a formation shield when the Sorcerer has no legal led unit (%s)',attachedTo=>{
 const a=army();
 a.instances=a.instances!.map(s=>s.id===sorcerer?{...s,attachedTo}:s);
 expect(named(a,'Arcane Shield')).toEqual([]);
 expect(named(a,sorcerer+' · Invulnerable save')).toHaveLength(5);
});
