import {describe,it,expect} from 'vitest';
import {newSelection} from '../src/catalog';
import type {RosterInstance} from '../src/roster-instances';
import {generate11thReminders} from '../src/reminders-11th';
import {IMPERIAL_KNIGHT_LOADOUTS,knightWeaponCount,validKnightGear} from '../src/imperial-knight-loadouts';
import {KNIGHT_CARD_STATS} from '../src/imperial-knight-weapon-data.generated';
import {knightHasRangedWeapon} from '../src/imperial-knight-datasheets';

// Independently transcribed effect checks from https://wahapedia.ru/wh40k11ed/factions/imperial-knights/datasheets.html
const armiger='Armiger Warglaive';
const squad=(unit:string,id=unit):RosterInstance=>({id,unit});
const army=(...instances:RosterInstance[])=>({...newSelection('Imperial Knights'),instances,detachments2026:['Questor Forgepact']});
const rules=(...s:RosterInstance[])=>generate11thReminders(army(...s)).filter(r=>r.id.startsWith('11e-knight-card:'));
const effect=(r:ReturnType<typeof rules>,name:string)=>r.filter(x=>x.title.endsWith(' · '+name));

describe('Bondsman recipients and effects on the released card sheet',()=>{
  const cases=[
    ['Knight Paladin','Paladin’s Duty','Fight','Lance'],['Knight Errant','Errant’s Duty','Movement','re-roll its Advance roll'],
    ['Knight Warden','Warden’s Duty','Shooting','Ignores Cover'],['Knight Gallant','Gallant’s Duty','Fight','melee Hit rolls'],
    ['Knight Crusader','Crusader’s Duty','Shooting','1 to Hit'],['Knight Preceptor','Mentor','Shooting','current quarry'],
    ['Knight Defender','Defender’s Duty','Movement','1 from the Damage'],['Cerastus Knight Acheron','Acheron’s Duty','Fight','Battle-shock test with −1'],
    ['Cerastus Knight Atrapos','Atrapos’ Duty','Fight','Titanic or Towering'],['Cerastus Knight Castigator','Castigator’s Duty','Shooting','AP by 1'],
    ['Cerastus Knight Lancer','Lancer’s Duty','Charge','Advanced'],['Questoris Knight Magaera','Magaera’s Duty','Shooting','closest eligible target'],
    ['Questoris Knight Styrix','Styrix’s Duty','Fight','enemy unit it hit'],
  ];
  it.each(cases)('%s gives the selected Armiger %s in %s',(unit,title,phase,expected)=>{
    const name=title+' (Bondsman)',provider=squad(unit,'mentor');
    expect(effect(rules(provider),name)).toEqual([]);
    const r=effect(rules(provider,squad(armiger,'warglaive'),squad('Armiger Helverin','helverin'),squad('Knight Castellan','dominus')),name);
    expect(r.find(x=>x.window===phase)?.summary).toContain(expected);
    expect(r.every(x=>x.units?.join()==='warglaive,helverin'&&x.title.startsWith('mentor · '))).toBe(true);
  });
});

describe('individual profile choice, reaction timing and conditional damage',()=>{
  it('separates a pilot’s conditional rules from the unbroken Canis Rex, and never creates a standalone Sir Hekhtur unit',()=>{
    const r=rules(squad('Canis Rex','rex'));
    const pilot=effect(r,'Sir Hekhtur · emergency disembarkation');
    expect(pilot).toHaveLength(5);
    expect(pilot.every(x=>x.units?.join()==='rex'&&/only when Sir Hekhtur.*only your Core Stratagems/.test(x.summary))).toBe(true);
    expect(effect(r,'Invulnerable save').every(x=>x.window!=='Fight'&&x.summary.includes('5+'))).toBe(true);
    expect(effect(r,'Chainbreaker').every(x=>x.timing==='start')).toBe(true);
    expect(rules(squad('Sir Hekhtur'))).toEqual([]);
  });
  it('uses 3 separate conversion thresholds, with neither conversion nor additional critical hits on Moirax snap shooting',()=>{
    const field=squad('Armiger Moirax');
    const sl=IMPERIAL_KNIGHT_LOADOUTS[field.unit].slots[0];
    const armed={...field,knightGear:{[sl.name]:'Conversion beam cannon'}};
    for(const [s,expected] of [[armed,12],[squad('Knight Defender'),18],[squad('Acastus Knight Asterius'),24]] as const){
      const p=effect(rules(s),'Ranged weapon profiles');
      expect(p.find(x=>x.window==='Shooting')?.summary).toContain('at more than '+expected+'″');
      expect(p.filter(x=>x.window==='Movement').every(x=>!x.summary.includes('a successful unmodified 4+'))).toBe(true);
    }
  });
  it('distinguishes Lancer melee invulnerability and Acastus damage brackets from a ranged-only Armiger save',()=>{
    const lanc=rules(squad('Cerastus Knight Lancer'));
    expect(effect(lanc,'Invulnerable save').find(r=>r.window==='Fight')?.summary).toContain('4+');
    const small=rules(squad(armiger));
    expect(effect(small,'Invulnerable save').find(r=>r.window==='Fight')).toBeUndefined();
    expect(effect(small,'Damaged')[0].summary).toMatch(/1–5 wounds.*subtract 3.*subtract 1/);
    const big=rules(squad('Acastus Knight Porphyrion'));
    expect(effect(big,'Damaged')[0].summary).toMatch(/1–10 wounds.*subtract 5/);
    expect(effect(big,'Deadly Demise 2D6')).toHaveLength(5);
  });
  it('emits Thundercharge only with the paired melee loadout and preserves optional arm identities on the sheet',()=>{
    const base=squad('Knight Destrier'),fitted={...base,knightGear:{'Gatling arm':'Bellatus reaper chainsword','Bombard arm':'Thundershock spear'}};
    expect(effect(rules(base),'Thundercharge')).toEqual([]);
    expect(effect(rules(fitted),'Thundercharge')[0]?.summary).toContain('add 2');
    const combat=effect(rules(fitted),'Melee weapon profiles')[0];
    expect(combat.summary).toMatch(/Thundershock spear.*Lance/);
    const missiles=effect(rules(fitted),'Ranged weapon profiles')[0];
    expect(missiles.summary).toContain('Questoris heavy stubber');
    expect(missiles.summary).not.toContain('Frag bombard');
  });
  it('only assigns Ion Aegis and Selfless Protector to eligible other model instances',()=>{
    expect(effect(rules(squad('Knight Valiant')),'Ion Aegis (Aura)')).toEqual([]);
    const r=rules(squad('Knight Defender','d'),squad(armiger,'a'),squad('Knight Valiant','v'),squad('Skitarii Vanguard','sk'));
    expect(effect(r,'Ion Aegis (Aura)').every(x=>x.units?.join()==='a')).toBe(true);
    expect(effect(r,'Selfless Protector').every(x=>x.units?.join()==='a,v'&&x.summary.includes('4+ invulnerable'))).toBe(true);
  });
  it('uses the actual Forgepact formation and equipment for each ally, including an optional unled Tech-priest',()=>{
    const ranger=squad('Skitarii Rangers','ranger'),other=squad('Skitarii Rangers','other');
    const marshal={...squad('Skitarii Marshal','marshal'),attachedTo:'ranger'};
    const dominus={...squad('Tech-priest Dominus','domin'),attachedTo:'ranger'};
    const r=rules({...ranger,knightGear:{'Standard rifle bearer equipment':'Omnispex'}},other,marshal,dominus,squad('Tech-priest Manipulus'));
    expect(effect(r,'Scouts 6″').map(x=>x.units)).toEqual([['other']]);
    expect(effect(r,'Lord of the Machine Cult').map(x=>x.units)).toEqual(Array(5).fill(['ranger']));
    expect(effect(r,'Control Edict').every(x=>x.units?.join()==='ranger')).toBe(true);
    expect(effect(r,'Galvanic Field')).toEqual([]);
    expect(effect(r,'Defend the Divine Work')).toHaveLength(5);
    expect(effect(r,'Omnispex').every(x=>x.units?.join()==='ranger,marshal,domin')).toBe(true);
    expect(effect(r,'Enhanced data-tether')).toEqual([]);
    const noAllies=generate11thReminders({...army(ranger,marshal),detachments2026:[]});
    expect(noAllies.some(x=>x.id.startsWith('11e-knight-card:'))).toBe(false);
  });
});

describe('every printed profile matches a legal weapon selection',()=>{
  it.each(Object.keys(KNIGHT_CARD_STATS))('%s resolves each printed weapon to an equipped bearer and produces applicable phase cues',name=>{
    let configurations:RosterInstance[]=[squad(name)];
    for(const slot of IMPERIAL_KNIGHT_LOADOUTS[name].slots){
      configurations=configurations.flatMap(s=>slot.choices.map(({name:choice})=>({...s,knightGear:{...s.knightGear,[slot.name]:choice}})));
    }
    configurations=configurations.filter(validKnightGear);
    for(const w of KNIGHT_CARD_STATS[name].weapons){
      const equipped=configurations.find(s=>knightWeaponCount(s,w.name)>0);
      expect(equipped,'unreachable printed profile '+w.name).toBeDefined();
      if(w.phase==='Shooting')expect(knightHasRangedWeapon(equipped!)).toBe(true);
      if(name==='Sir Hekhtur'||(!w.abilities.length&&!w.mode))continue;
      const phaseText=(s:RosterInstance)=>effect(rules(s),w.phase==='Fight'?'Melee weapon profiles':'Ranged weapon profiles').find(x=>x.window===w.phase)?.summary??'';
      expect(phaseText(equipped!)).toContain('× '+w.name);
      const absent=configurations.find(s=>!knightWeaponCount(s,w.name));
      if(absent)expect(phaseText(absent)).not.toContain('× '+w.name);
    }
  });
});
