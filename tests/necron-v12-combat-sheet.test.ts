import {describe, expect, it} from 'vitest';
import {newSelection} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
import type {RosterInstance} from '../src/roster-instances';

// October v1.2 matched-play cards at https://wahapedia.ru/wh40k11ed/factions/necrons/datasheets.html
// Snap shooting 15.09, aura range 22.01, weapon abilities 24 at https://wahapedia.ru/wh40k11ed/the-rules/core-rules/
const phases=['Command','Movement','Shooting','Charge','Fight'];
function sheet(...instances:RosterInstance[]){
  return generate11thReminders({...newSelection('Necrons'),instances});
}
const named=(cues:ReturnType<typeof sheet>,name:string)=>cues.filter(r=>r.title.includes('· '+name));
const squad=(unit:string,id=unit):RosterInstance=>({id,unit});

describe('October Necron character and fortification datasheets',()=>{
  it('restores the printed personal invulnerable save to four characters without granting it to their bodyguard',()=>{
    const cards=['Nekrosor Ammentar','Trazyn the Infinite','Chronomancer','Overlord with translocation shroud'];
    for(const card of cards){
      const cues=sheet({...squad(card),attachedTo:'body'},squad('Immortals','body'));
      const saves=named(cues,'4+ invulnerable save');
      expect(saves.map(r=>r.window)).toEqual(['Shooting','Fight','Movement']);
      expect(saves.every(r=>r.units?.join()===card)).toBe(true);
    }
    expect(named(sheet(squad('Plasmancer')),'4+ invulnerable save')).toEqual([]);
  });
  it('distinguishes the Psychomancer’s opponent Battle-shock step from its own any-phase power',()=>{
    const cues=sheet(squad('Psychomancer'));
    const aura=named(cues,'Nightmare Shroud');
    expect(aura).toHaveLength(1);
    expect(aura[0]).toMatchObject({window:'Command',timing:'during'});
    expect(aura[0].summary).toMatch(/opponent.*below Starting Strength.*6″.*−1/);
    expect(named(cues,'Harbinger of Despair').every(r=>r.summary.includes('18″'))).toBe(true);
  });
  it('keeps Warden fallback rights when solo and targets only the formation actually attached',()=>{
    const solo=sheet(squad('Royal Warden'));
    expect(named(solo,'Adaptive Strategy').map(r=>r.window)).toEqual(['Movement','Shooting','Charge']);
    const joined=sheet({...squad('Royal Warden','leader'),attachedTo:'body'},squad('Immortals','body'),squad('Immortals','other'));
    expect(named(joined,'Adaptive Strategy').every(r=>r.units?.join()==='leader,body')).toBe(true);
    const logic=named(joined,'Engrammatic Logic');
    expect(logic.map(r=>r.window)).toEqual(phases);
    expect(logic.every(r=>r.timing==='start'&&/Once per battle.*either player.*Battle-shock.*12″/.test(r.summary))).toBe(true);
    expect(named(sheet(squad('Immortals')),'Engrammatic Logic')).toEqual([]);
  });
  it('makes the shroud apply through Normal and Fall Back moves, and enforces the shared Orb resurrection limit',()=>{
    const cues=sheet({...squad('Overlord with translocation shroud','lord'),attachedTo:'body'},squad('Lychguard','body'));
    const shroud=named(cues,'Translocation Shroud')[0];
    expect(shroud).toMatchObject({window:'Movement',units:['lord','body']});
    expect(shroud.summary).toMatch(/add 6″.*Normal, Advance or Fall Back/);
    expect(named(cues,'Resurrection Orb').every(r=>r.timing==='end'&&r.units?.includes('body')&&r.summary.includes('at most one unit each turn'))).toBe(true);
    expect(named(sheet({...squad('Catacomb Command Barge'),wargear:{'Resurrection orb':1}}),'Resurrection Orb')).toEqual([]);
  });
  it('calls out the three Starstele deployment rule only for multiple models and both Fortification exceptions',()=>{
    const unit=squad('Convergence Of Dominion');
    expect(named(sheet({...unit,models:1}),'Starsteles')).toEqual([]);
    const cues=sheet({...unit,models:3});
    expect(named(cues,'Starsteles')[0]).toMatchObject({window:'Pre-battle',summary:expect.stringMatching(/wholly within 12″.*separate unit/)});
    const fort=named(cues,'Fortification');
    expect(fort.map(r=>r.window)).toEqual(['Movement','Shooting']);
    expect(fort[0].summary).toMatch(/Desperate Escape.*moving over enemies/);
    expect(fort[1].summary).toMatch(/Fortifications.*1.*Pistol/);
  });
});
describe('printed weapon effects depend on the equipped weapon and shooting type',()=>{
  it('omits Critical Hit and Heavy effects in snap shooting while keeping wound and attack-count effects',()=>{
    const ranged=named(sheet({...squad('Lokhust Heavy Destroyers'),weaponCounts:{'Enmitic exterminator':1,'Gauss destructor':1},models:2}),'Ranged weapon abilities');
    expect(ranged.map(r=>r.window)).toEqual(['Shooting','Movement']);
    expect(ranged[0].summary).toMatch(/Heavy.*3″.*set up this turn/);
    expect(ranged[0].summary).toMatch(/Sustained Hits 1.*1 extra hit/);
    expect(ranged[1].summary).toMatch(/Rapid Fire 6.*6 attacks within half range/);
    expect(ranged[1].summary).not.toMatch(/Sustained Hits|Lethal Hits|Heavy \(|Gauss destructor/);
    expect(named(sheet(squad('Deathmarks')),'Ranged weapon abilities').find(r=>r.window==='Movement')?.summary).toMatch(/Precision.*visible enemy Character/);
  });
  it('distinguishes the optional Lethal choice, prevented wound roll, and exact blaster bearer count',()=>{
    const crawlers=squad('Canoptek Tomb Crawlers');
    const cue=(equipment:string)=>named(sheet({...crawlers,equipment}),'Ranged weapon abilities')[0];
    expect(cue('Two twin gauss reapers').summary).toContain('2 originally equipped models');
    const one=cue('One twin gauss reaper and one transdimensional isolator');
    expect(one.summary).toMatch(/1 originally equipped model.*Lethal Hits.*may skip the Wound roll/);
    expect(one.summary).toContain('Twin-Linked (may re-roll the Wound roll)');
  });
});
