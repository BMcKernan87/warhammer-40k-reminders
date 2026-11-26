// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {deathGuardContagionRange} from '../src/death-guard-contagion';
import {generate11thReminders} from '../src/reminders-11th';
import type {RosterInstance} from '../src/roster-instances';

const row=(unit:string,fields:Partial<RosterInstance>={}):RosterInstance=>({unit,id:unit+'#1',...fields});
const army=(detachments2026:string[],...instances:RosterInstance[]):ArmySelection=>({...newSelection('Death Guard'),detachments2026,instances});
const rule=(army:ArmySelection,key:string)=>generate11thReminders(army).find(c=>c.id==='11e-dg-gift-'+key);

it('chooses one plague at formation declaration and applies its print-correct effects in the relevant phases',()=>{
 const a=army(['Virulent Vectorium'],row('Chaos Rhino'));
 expect(rule(a,'choice')).toMatchObject({window:'Pre-battle',units:['Chaos Rhino#1'],summary:expect.stringMatching(/Declare Battle Formations.*one plague.*loses 1 Toughness.*Skullsquirm Blight.*Benefit of Cover.*melee Hit rolls.*Rattlejoint Ague.*Save characteristic.*Scabrous Soulrot.*minimum of 1/)});
 expect(rule(a,'shoot')).toMatchObject({window:'Shooting',turn:'either',summary:expect.stringMatching(/enemy’s own ranged attacks receive Benefit of Cover/)});
 expect(rule(a,'fight')).toMatchObject({window:'Fight',turn:'either',summary:expect.stringMatching(/afflicted enemy subtracts 1 from its melee Hit rolls/)});
 expect(rule(a,'move')?.summary).toContain('−1 Move');
 expect(rule(a,'command')?.summary).toContain('minimum OC 1');
});
it('caps the projected aura across rounds after adding independent modifiers',()=>{
 expect([1,2,3,4,5].map(n=>deathGuardContagionRange(n))).toEqual([3,6,9,9,9]);
 expect([1,2,3,5].map(n=>deathGuardContagionRange(n,6))).toEqual([9,12,12,12]);
 expect([1,2,3].map(n=>deathGuardContagionRange(n,9))).toEqual([12,12,12]);
});
// Nurgle's Gift is a continuous effect. Core 07.02.01 preserves such effects
// outside their normal phase, including Fire Overwatch in core 15.09.
it('keeps both outgoing and incoming plague effects on the Movement sheet for Overwatch',()=>{
 const marines=row('Plague Marines'),lord=row('Lord of Poxes',{attachedTo:marines.id});
 const a=army(['Virulent Vectorium'],marines,lord,row('War Dog Brigand'));
 const card=rule(a,'overwatch');
 expect(card).toMatchObject({window:'Movement',turn:'either',timing:'end',units:[marines.id]});
 expect(card?.summary).toMatch(/−1 Toughness.*either player’s Movement phase.*Rattlejoint Ague.*Save characteristic.*Skullsquirm Blight.*enemy’s Overwatch.*Benefit of Cover/);
 expect(card?.units).not.toContain('War Dog Brigand#1');
 expect(rule(army(['Virulent Vectorium'],row('War Dog Brigand')),'overwatch')).toBeUndefined();
});
it('measures Gift of Poxes from its single bearer while Paragons applies to the entire legal formation',()=>{
 const marines=row('Plague Marines',{models:10}),lord=row('Lord of Poxes',{attachedTo:marines.id}),surgeon=row('Plague Surgeon',{attachedTo:marines.id}),tank=row('Chaos Rhino');
 const a=army(['Paragons of Putrescence'],marines,lord,surgeon,tank);
 const card=rule(a,'range');
 expect(card?.units).toEqual([marines.id,tank.id]);
 expect(card?.summary).toMatch(/Plague Marines#1 uses 6″ \/ 9″ \/ 12″.*From Lord of Poxes#1 itself, use 9″ \/ 12″ \/ 12″.*other models in Plague Marines#1 use 6″ \/ 9″ \/ 12″/);
 expect(card?.summary).not.toContain(tank.id+' uses 6″');
 const plain=rule(army(['Virulent Vectorium'],marines,lord),'range');
 expect(plain?.summary).toMatch(/itself, use 6″ \/ 9″ \/ 12″.*other models.*3″ \/ 6″ \/ 9″/);
});
it('shows both directions of Tallyband proximity and excludes knights, illegal allied selections and unsupported auras',()=>{
 const rhino=row('Chaos Rhino'),beast=row('Beasts of Nurgle'),dog=row('War Dog Brigand');
 const a=army(['Tallyband Summoners'],rhino,beast,dog);
 const card=rule(a,'range');
 expect(card?.units).toEqual([rhino.id,beast.id]);
 expect(card?.summary).toMatch(/Chaos Rhino#1 uses 3″ \/ 6″ \/ 9″ \(within 7″.*6″ \/ 9″ \/ 12″.*Beasts of Nurgle#1 gain Nurgle’s Gift only while within 7″.*3″ \/ 6″ \/ 9″/);
 expect(generate11thReminders(a).some(r=>r.id.startsWith('11e-chaos-knight-card')&&r.units?.includes(dog.id))).toBe(true);
 expect(rule(army(['Virulent Vectorium'],rhino,beast),'range')?.units).toEqual([rhino.id]);
 expect(rule(army(['Tallyband Summoners'],beast,dog),'range')).toBeUndefined();
});
it('names future Shamblerot reinforcements without making them a starting unit',()=>{
 const a=army(['Shamblerot Vectorium'],row('Chaos Rhino'));
 expect(rule(a,'range')?.summary).toContain('Poxwalkers (Numberless Horde reinforcements) projects the normal aura after it is set up');
 expect(a.instances?.map(s=>s.unit)).toEqual(['Chaos Rhino']);
});
