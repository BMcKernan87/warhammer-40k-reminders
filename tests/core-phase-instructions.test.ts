// @vitest-environment node
import {describe,expect,it} from 'vitest';
import {addSelectionUnit,newSelection} from '../src/catalog';
import {generate11thReminders,grouped11thReminders} from '../src/reminders-11th';

// Independent source contract: publisher's June 2026 Core Rules, sections
// 01.06–01.07, 08, 09.02–09.07, 10.02–10.07, 11.02–11.04,
// 12.02–12.08 and 16.01. August Universal Rules Updates v1.1 do not change these.
// https://assets.warhammer-community.com/eng_01-06_warhammer40k_new40k_core_rules-was6fbu1ix-hfewhmxyiy.pdf
const army=addSelectionUnit(newSelection('Necrons'),'Immortals');
const rule=(id:string)=>generate11thReminders(army).find(r=>r.id===id)!;

describe('current core phase instructions',()=>{
 it('keeps the active player’s recovery distinct from both players gaining CP',()=>{
  expect(rule('11e-core-cp')).toMatchObject({window:'Command',turn:'either'});
  const shock=rule('11e-battle-shock');
  expect(shock).toMatchObject({window:'Command',turn:'own'});
  expect(shock.summary).toContain('already battle-shocked or at or below half-strength');
  expect(shock.summary).toContain('meet or exceed a Leadership');
  expect(shock.summary).toContain('A pass in this step clears existing battle-shock');
  expect(shock.summary).toContain('cannot start or complete an action');
 });

 it('requires selecting stationary and off-board units without inventing movement triggers',()=>{
  const move=rule('11e-move-every-unit');
  expect(move).toMatchObject({window:'Movement',turn:'own'});
  expect(move.summary).toContain('Strategic Reserves or embarked');
  expect(move.summary).toContain('do not move or rotate any model');
  expect(move.summary).toContain('do not trigger rules for starting or ending a move');
 });

 it('places charge targets after the roll and retains both target-distance bounds',()=>{
  const charge=rule('11e-charge');
  expect(charge).toMatchObject({window:'Charge',turn:'own'});
  expect(charge.summary).toContain('Roll 2D6 before choosing charge targets');
  expect(charge.summary).toContain('within both 12″ and the modified charge distance');
  expect(charge.summary).toContain('engaging every target and no other enemy unit');
  expect(charge.summary).toContain('has not declared a charge this phase');
  expect(charge.summary).toContain('grants every model Fights First until turn end');
 });

 it('does not restart remaining Fight activations with the opposing player',()=>{
  expect(rule('11e-fight')).toMatchObject({window:'Fight',turn:'either'});
  const order=rule('11e-fight-selection');
  expect(order.summary).toContain('starting with the active player');
  expect(order.summary).toContain('the player whose selection is next starts the remaining combats');
  expect(order.summary).toContain('return to Fights First');
  expect(order.summary).toContain('was engaged when the Fight step began');
 });

 it('retains overrun eligibility and the immediate enemy response to engaging consolidation',()=>{
  expect(rule('11e-fight-overrun').summary).toContain('Being unengaged alone does not make an otherwise ineligible unit eligible');
  expect(rule('11e-fight-overrun').summary).toContain('one additional pile-in');
  const consolidate=rule('11e-fight-consolidation');
  expect(consolidate).toMatchObject({window:'Fight',timing:'during',turn:'either'});
  expect(consolidate.summary).toContain('ongoing consolidation if engaged');
  expect(consolidate.summary).toContain('otherwise use engaging consolidation');
  expect(consolidate.summary).toContain('otherwise use objective consolidation');
  expect(consolidate.summary).toContain('resolves a fight immediately, one at a time');
  expect(consolidate.summary).toContain('not yet selected to fight this phase');
 });

 it('allows the source-defined pass when no eligible unit has a reachable enemy',()=>{
  const pass=rule('11e-fight-pass');
  expect(pass).toMatchObject({window:'Fight',turn:'either'});
  expect(pass.summary).toContain('all your units that are eligible to fight are more than 5″');
  expect(pass.summary).toContain('Two consecutive passes end the Fight step');
  expect(pass.summary).toContain('opponent has no remaining eligible units');
 });

 it('defers action timing and permitted actions to the actual mission',()=>{
  const requirements=rule('11e-actions-requirements');
  expect(requirements).toMatchObject({window:'Pre-battle',turn:'either'});
  expect(requirements.summary).toContain('at their stated start time');
  expect(requirements.summary).toContain('not be Aircraft or Fortification');
  expect(requirements.summary).toContain('not have Advanced, Fallen Back or started another action');
  expect(requirements.summary).toContain('engaged unit is ineligible unless it is Titanic');
  expect(requirements.summary).not.toContain('Deploy Device'); // The core example is explicitly unusable.
 });

 it('preserves action locks after early completion and distinguishes the Titanic exceptions',()=>{
  const shooting=rule('11e-actions-shooting'),charge=rule('11e-actions-charge');
  expect(shooting).toMatchObject({window:'Shooting',turn:'either'});
  expect(shooting.summary).toContain('except for Titanic units');
  expect(shooting.summary).toContain('completing it early does not remove');
  expect(charge).toMatchObject({window:'Charge',turn:'either'});
  expect(charge.summary).toContain('even if the action completed or failed');
  expect(charge.summary).toContain('Titanic units do not get an exception');
  expect(rule('11e-actions-movement').summary).toContain('other than a pile-in or consolidation');
 });

 it.each([
  ['Necrons','Immortals'],['Orks','Boyz'],['Astra Militarum','Cadian Shock Troops'],
  ['Space Marines','Intercessor Squad'],['Imperial Knights','Armiger Warglaive'],
 ] as const)('includes the shared instructions once in the correct windows for %s',(faction,unit)=>{
  const groups=grouped11thReminders(addSelectionUnit(newSelection(faction),unit));
  for(const [id,window] of [
   ['11e-actions-requirements','Pre-battle'],['11e-actions-movement','Movement'],
   ['11e-actions-shooting','Shooting'],['11e-actions-charge','Charge'],
   ['11e-fight-selection','Fight'],['11e-fight-overrun','Fight'],['11e-fight-consolidation','Fight'],
  ]){
   const matches=groups.flatMap(g=>g.reminders).filter(r=>r.id===id);
   expect(matches).toHaveLength(1);
   expect(matches[0]).toMatchObject({window,turn:'either',source:'https://wahapedia.ru/wh40k11ed/the-rules/core-rules/'});
  }
 });
});
