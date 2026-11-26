import {describe,expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';

// Publisher Core Rules 15.04/15.06 (p.56) and 15.11 (p.57):
// https://assets.warhammer-community.com/eng_01-06_warhammer40k_new40k_core_rules-was6fbu1ix-hfewhmxyiy.pdf
// Current indexed rules, including the already-battle-shocked restriction:
// https://wahapedia.ru/wh40k11ed/the-rules/core-rules/#Core-Stratagems
// These are static source-derived output requirements: the sheet must retain
// the step, selected-model relationship and pre-roll choice without asserting
// that a battlefield condition has actually occurred.
const cases=[
 {faction:'Necrons',units:['Overlord','Immortals','Doomsday Ark','Canoptek Doomstalker','Doom Scythe'],
  impact:['Doomsday Ark','Canoptek Doomstalker'],heroic:['Overlord','Immortals','Canoptek Doomstalker']},
 {faction:'Space Marines',units:['Captain','Intercessor Squad','Redemptor Dreadnought','Rhino','Stormraven Gunship'],
  impact:['Redemptor Dreadnought','Rhino'],heroic:['Captain','Intercessor Squad','Redemptor Dreadnought']},
 {faction:'Orks',units:['Warboss','Boyz','Deff Dread','Trukk','Wazbom Blastajet'],
  impact:['Deff Dread','Trukk'],heroic:['Warboss','Boyz','Deff Dread']},
] as const;

describe('core Stratagem source conditions on faction phase sheets',()=>{
 for(const example of cases)it(example.faction+' retains the specific step, charge model and pre-roll mode choice',()=>{
  const army:ArmySelection={...newSelection(example.faction),
   units:Object.fromEntries(example.units.map(unit=>[unit,1])),
   instances:example.units.map(unit=>({id:unit+'#1',unit})),
  };
  const rows=generate11thReminders(army);
  const rule=(id:string)=>rows.find(row=>row.id==='11e-core-'+id)!;
  const bravery=rule('insane-bravery');
  expect(bravery).toMatchObject({window:'Command',turn:'own',timing:'during',sourceRuleId:'000010810004'});
  expect(bravery.summary).toMatch(/During the Battle-shock step of your Command phase, just before rolling battle-shock/);
  expect(bravery.summary).toContain('not already battle-shocked');
  expect(bravery.summary).toContain('Once per battle');

  const impact=rule('crushing-impact');
  expect(impact).toMatchObject({window:'Charge',turn:'own',timing:'during',sourceRuleId:'000010810006'});
  expect(impact.units?.slice().sort()).toEqual(example.impact.map(unit=>unit+'#1').sort());
  expect(impact.summary).toMatch(/just after a Monster or Vehicle unit ends its charge move.*enemy engaged with that charging unit/);
  expect(impact.summary).toMatch(/one model in the charging unit that is engaged with that enemy.*that model’s Toughness/);
  expect(impact.summary).toMatch(/each 1 deals your unit a mortal wound.*each 5\+ deals the enemy one.*six mortal wounds to either unit/);

  const heroic=rule('heroic-intervention');
  expect(heroic).toMatchObject({window:'Charge',turn:'opponent',timing:'end',sourceRuleId:'000010810011'});
  expect(heroic.units?.slice().sort()).toEqual(example.heroic.map(unit=>unit+'#1').sort());
  expect(heroic.summary).toContain('Choose the mode before making the charge roll');
  expect(heroic.summary).toMatch(/Leap to Defend.*enemies that charged this phase and are within the charge’s maximum distance/);
  expect(heroic.summary).toMatch(/1 additional CP for Into the Fray.*cap the modified charge roll at 6.*within both 6″ and the charge’s maximum distance/);
 });
});
