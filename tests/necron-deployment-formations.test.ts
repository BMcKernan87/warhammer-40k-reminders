import {describe,it,expect} from 'vitest';
import {newSelection,validateSelection} from '../src/catalog';
import {detachmentBudget} from '../src/edition-2026';
import {rosterCost2026} from '../src/datasheets-2026';
import {generate11thReminders} from '../src/reminders-11th';
import {individualArmy,setInstanceAttachment} from '../src/roster-instances';
import {setRetinue} from '../src/necron-retinues';
import {selectWarlord} from '../src/necron-muster-legality';
import {selectUpgrade2026} from '../src/upgrades-2026';
import {rosterFindings} from '../src/roster-findings';

const army=(...units:string[])=>individualArmy({...newSelection('Necrons'),units:Object.fromEntries(units.map(name=>[name,1]))});
const id=(unit:string)=>unit+'#1';
const source='https://wahapedia.ru/wh40k11ed/the-rules/core-rules/';

// Core 09.02, 18–20, 23 and 25.04; Ghost Ark and Night Scythe transport sections.
describe('11th edition formations at deployment and on arrival',()=>{
 it('generates a 1,000-point Incursion sheet with the actual infantry formations, transport capacities, Scout and Aircraft',()=>{
  const warrior=id('Necron Warriors'),warden=id('Royal Warden'),wraiths=id('Canoptek Wraiths'),tech=id('Technomancer'),thralls=id('Cryptothralls');
  let a=army('Ghost Ark','Night Scythe','Doom Scythe','Necron Warriors','Royal Warden','Canoptek Wraiths','Technomancer','Cryptothralls','Canoptek Doomstalker','Flayed Ones');
  a={...a,battleSize2026:'Incursion',detachments2026:['Hand of the Dynasty']};
  a=setInstanceAttachment(setInstanceAttachment(a,warden,warrior),tech,wraiths);
  a=setRetinue(a,thralls,wraiths);
  a=selectUpgrade2026(selectWarlord(a,warden),warrior,'Enlivened Sentinels');
  expect(validateSelection(JSON.parse(JSON.stringify(a)))).toBe(true);
  expect(rosterCost2026(a).total).toBe(1000);
  expect(rosterFindings(a).filter(f=>f.severity==='error')).toEqual([]);
  const reminders=generate11thReminders(a);
  const cue=(key:string)=>reminders.find(r=>r.id==='11e-necron-'+key);
  expect(cue('reserve-declaration')).toMatchObject({source,window:'Pre-battle',summary:expect.stringContaining('500 points')});
  expect(cue('reserve-declaration')!.units).not.toEqual(expect.arrayContaining([tech,warden,thralls]));
  expect(cue('night-scythe-embark')!.units).toEqual([warrior,wraiths,id('Flayed Ones')]);
  expect(cue('ghost-ark-embark')!.summary).toContain(warrior);
  expect(cue('ghost-ark-embark')!.summary).not.toContain(wraiths);
  expect(cue('attached-abilities-Fight')!.units).toEqual([warrior,wraiths]);
  expect(cue('attached-defence-Shooting')!.summary).toContain('highest Toughness');
  expect(cue('emergency-disembark-Shooting')!.units).toEqual([id('Ghost Ark'),id('Night Scythe')]);
  expect(cue('aircraft-return')).toMatchObject({window:'End of opponent turn',units:[id('Doom Scythe')]});
  expect(reminders.find(r=>r.id==='11e-scout-'+warrior)!.summary).toContain('Dedicated Transport');
  expect(new Set(reminders.map(r=>r.id)).size).toBe(reminders.length);
 });
 it('distinguishes the reserve allowance, ingress step and round-three removal from the end of the opposing turn',()=>{
  const a=army('Deathmarks','Convergence Of Dominion');
  const cues=generate11thReminders(a);
  for(const key of ['reserve-declaration','reserve-arrival','reserve-deadline'])
   expect(cues.find(r=>r.id==='11e-necron-'+key)?.units).toEqual([id('Deathmarks')]);
  expect(cues.find(r=>r.id==='11e-necron-reserve-declaration')?.summary).toContain('1000 points');
  expect(cues.find(r=>r.id==='11e-necron-reserve-arrival')).toMatchObject({window:'Movement',summary:expect.stringContaining('Move Units step')});
  expect(cues.find(r=>r.id==='11e-necron-reserve-deadline')).toMatchObject({window:'End of battle round',summary:expect.stringContaining('repositioned units')});
  expect(generate11thReminders(army('Convergence Of Dominion')).some(r=>r.id.startsWith('11e-necron-reserve-'))).toBe(false);
 });
 it('applies Aircraft restrictions only to the Doom Scythe, and suppresses empty passenger instructions',()=>{
  const a=army('Night Scythe','Doom Scythe','Ghost Ark','Canoptek Wraiths','Chronomancer');
  const cues=generate11thReminders(a);
  const air=cues.filter(r=>r.id.startsWith('11e-necron-aircraft-'));
  expect(air.map(r=>r.window)).toEqual(['Pre-battle','Movement','Shooting','Charge','Fight','End of opponent turn']);
  expect(air.every(r=>r.units?.join()===id('Doom Scythe'))).toBe(true);
  expect(cues.some(r=>/night-scythe-embark|passenger-disembark|emergency-disembark/.test(r.id))).toBe(false);
  expect(cues.some(r=>r.id.startsWith('11e-necron-attached-abilities'))).toBe(false);
 });
 it('permits one three-DP detachment by itself at Incursion for every faction under core 25.04',()=>{
  const solo=detachmentBudget('Orks',['War Horde'],'Incursion');
  expect(solo).toMatchObject({valid:true,limit:3,spent:3});
  expect(detachmentBudget('Orks',['War Horde','More Dakka!'],'Incursion').valid).toBe(false);
  expect(detachmentBudget('Orks',['Bully Boyz','More Dakka!'],'Incursion').valid).toBe(false);
 });
});
