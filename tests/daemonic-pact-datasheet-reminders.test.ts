import {describe,it,expect} from 'vitest';
import {newSelection} from '../src/catalog';
import type {RosterInstance} from '../src/roster-instances';
import {generate11thReminders} from '../src/reminders-11th';
import {daemonHasRangedWeapon} from '../src/daemon-datasheets';
import {KNIGHT_CARD_STATS as cards} from '../src/daemon-card-data.generated';
import {knightLoadoutFor,knightWeaponCount,validKnightGear} from '../src/knight-loadouts';

const squad=(unit:string,id=unit):RosterInstance=>({id,unit});
const rules=(...instances:RosterInstance[])=>generate11thReminders({...newSelection('Chaos Knights'),instances}).filter(r=>r.id.startsWith('11e-daemon-card:'));
const named=(r:ReturnType<typeof rules>,n:string)=>r.filter(x=>x.title.endsWith(' · '+n));
describe('conditional daemon profiles and formation-wide core rules',()=>{
 it.each(Object.keys(cards))('%s emits only fitted keyword and mode profiles in the correct attack phase',unit=>{
    let configs=[squad(unit)];
    for(const slot of knightLoadoutFor('Chaos Knights',unit)!.slots)configs=configs.flatMap(s=>slot.choices.map(opt=>({...s,knightGear:{...s.knightGear,[slot.name]:opt.name}})));
    configs=configs.filter(s=>validKnightGear(s,'Chaos Knights'));
    for(const w of cards[unit].weapons){
      if((unit==='Pink Horrors'&&/Blue|Yellow/i.test(w.name))||(unit==='Blue Horrors'&&/Yellow/i.test(w.name)))continue;
      const equipped=configs.find(s=>knightWeaponCount(s,w.name)>0);
      expect(equipped,'A printed profile should match a real starting weapon: '+w.name).toBeDefined();
      if(w.phase==='Shooting')expect(daemonHasRangedWeapon(equipped!)).toBe(true);
      if(!w.mode&&!w.abilities.length)continue;
      const summary=(s:RosterInstance)=>named(rules(s),w.phase==='Fight'?'Melee weapon profiles':'Ranged weapon profiles').find(r=>r.window===w.phase)?.summary??'';
      expect(summary(equipped!)).toContain('× '+w.name);
      const absent=configs.find(s=>!knightWeaponCount(s,w.name));
      if(absent)expect(summary(absent)).not.toContain('× '+w.name);
    }
 });
 it('withholds model-unanimous abilities from mixed formations and offers one shared ingress declaration',()=>{
    const horrors=squad('Blue Horrors','h'),leader={...squad('Changecaster','c'),attachedTo:'h'};
    expect(named(rules(horrors),'Infiltrators')).toHaveLength(1);
    const attached=rules(horrors,leader);
    expect(named(attached,'Infiltrators')).toEqual([]);
    const deploy=named(attached,'Deep Strike').filter(r=>r.window==='Pre-battle');
    expect(deploy).toHaveLength(1);
    expect(deploy[0].units).toEqual(['h']);
    expect(named(attached,'Deep Strike').find(r=>r.window==='Movement')?.summary).toContain('8″ horizontally');
    expect(named(rules(squad('Feculent Gnarlmaw')),'Deep Strike')).toEqual([]);
    expect(daemonHasRangedWeapon(squad('Skull Altar'))).toBe(false);
 });
 it('resolves bearer-only Feel No Pain and snap shooting weapons, equipped instruments, and Skarbrand’s positive damage bracket',()=>{
    const body={...squad('Plaguebearers','pb'),knightGear:{'Instrument bearer':'Instrument of Chaos','Separate icon bearer':'Daemonic icon'}};
    const r=rules(body,{...squad('Poxbringer','px'),attachedTo:'pb'});
    expect(named(r,'Daemonic Icon')[0].units).toEqual(['pb']);
    expect(named(r,'Instrument of Chaos')[0].units).toEqual(['pb']);
    expect(named(r,'Feel No Pain 5+')[0].units).toEqual(['px']);
    expect(named(rules(squad('Plaguebearers')),'Instrument of Chaos')).toEqual([]);
    const x=named(rules(squad('Skarbrand')),'Damaged');
    expect(x).toHaveLength(1);
    expect(x[0]).toMatchObject({window:'Fight',turn:'either'});
    expect(x[0].summary).toMatch(/1–7.*add 2.*Slaughter and Carnage/);
    const ranged=named(rules(squad('Flamers')),'Ranged weapon profiles');
    expect(ranged.find(r=>r.window==='Movement')).toMatchObject({turn:'opponent',timing:'end'});
    expect(ranged.find(r=>r.window==='Movement')?.summary).toContain('Torrent');
 });
});
