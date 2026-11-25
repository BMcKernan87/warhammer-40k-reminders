import {describe,it,expect} from 'vitest';
import {newSelection} from '../src/catalog';
import {generate11thReminders,eligibleScoutReminders} from '../src/reminders-11th';
import type {RosterInstance} from '../src/roster-instances';

// Necrons v1.2 datasheets, official Necrons faction FAQ v1.3 (Monolith and Wraiths),
// and 11e core 02.05.01 (mixed keywords) and 24.31–32 (Scouts).
const roster=(...instances:RosterInstance[])=>({...newSelection('Necrons'),instances});
const unit=(id:string,name:string):RosterInstance=>({id,unit:name});
const cues=(army:ReturnType<typeof roster>,rule:string)=>generate11thReminders(army).filter(r=>r.title.includes('· '+rule));

describe('printed Scout grants in the full army sheet',()=>{
  it.each([['Tomb Blades',9],['Triarch Stalker',8],['Canoptek Macrocytes',8]] as const)('%s gets its printed distance without a detachment or upgrade',(name,distance)=>{
    const a=roster(unit('first',name),unit('second',name));
    const scout=eligibleScoutReminders(a);
    expect(scout.map(r=>r.units)).toEqual([['first'],['second']]);
    expect(scout.every(r=>r.summary.includes(distance+'″')&&r.summary.includes('more than 8″')&&r.summary.includes('Strategic Reserves'))).toBe(true);
    expect(generate11thReminders(a).filter(r=>r.id.startsWith('11e-scout-'))).toEqual(scout);
  });
  it('checks every member, including the conditional Geomancer and a joined retinue',()=>{
    const body=unit('macrocytes','Canoptek Macrocytes'),geo={...unit('geo','Geomancer'),attachedTo:body.id};
    expect(eligibleScoutReminders(roster(geo,body)).map(r=>r.units)).toEqual([[body.id]]);
    expect(eligibleScoutReminders(roster(geo,body,{...unit('crawlers','Canoptek Tomb Crawlers'),retinueTo:body.id}))).toEqual([]);
    expect(eligibleScoutReminders(roster(unit('solo','Geomancer')))).toEqual([]);
  });
});

describe('datasheet rules target the formation that has the keyword',()=>{
  it('applies the official faction-pack replacement for Relentless March to C’tan, preserving the other Triarch abilities’ printed restrictions',()=>{
    const a=roster(unit('szarekh','The Silent King'),unit('shard','C’tan Shard of the Nightbringer'));
    const march=cues(a,'Relentless March')[0];
    expect(march).toMatchObject({units:['szarekh','shard'],window:'Movement',source:expect.stringContaining('eng_30-09')});
    expect(march.summary).toContain('including friendly Monsters');
    expect(cues(a,'Phaeron of the Stars').every(r=>r.summary.includes('non-Monster'))).toBe(true);
  });
  it('names a Technomancer’s Wraith formation once for infantry-unit rules, and excludes a second unsupported Wraith squad',()=>{
    const a=roster(unit('barge','Catacomb Command Barge'),unit('convergence','Convergence Of Dominion'),unit('gate','Monolith'),
      unit('scythe','Night Scythe'),unit('led','Canoptek Wraiths'),unit('unled','Canoptek Wraiths'),{...unit('tech','Technomancer'),attachedTo:'led'});
    for(const rule of ['Reanimation Nodes','Eternity Gate','Invasion Beams']){
      const rules=cues(a,rule);
      expect(rules.length).toBeGreaterThan(0);
      expect(rules.every(r=>r.units?.join()==='led'&&r.summary.includes('led')&&!r.summary.includes('unled'))).toBe(true);
    }
    expect(cues(a,'Eternity Gate').find(r=>r.window==='Charge')).toMatchObject({turn:'own',summary:expect.stringContaining('cannot make a Charge move')});
    const ingress=cues(a,'Eternity Gate').find(r=>r.window==='Movement')!;
    expect(ingress.summary).toMatch(/wholly within 6″.*without needing a battlefield edge/);
    expect(cues(a,'Eternity Gate · shooting')[0].summary).toContain('may shoot');
  });
  it('applies Weapon Sentinels to models of the combined unit but keeps equipped weapon abilities with the Crawlers',()=>{
    const a=roster(unit('body','Immortals'),{...unit('tech','Plasmancer'),attachedTo:'body'},
      {...unit('retinue','Canoptek Tomb Crawlers'),retinueTo:'body'},unit('other','Immortals'));
    const sentinels=cues(a,'Weapon Sentinels')[0];
    expect(sentinels.title).toContain('retinue · Weapon Sentinels → body');
    expect(sentinels.summary).toMatch(/12″.*Ballistic Skill, Hit and Wound modifiers/);
    expect([...(sentinels.units??[])].sort()).toEqual(['body','retinue','tech']);
    const weapons=cues(a,'Ranged weapon abilities').filter(r=>r.title.startsWith('retinue'));
    expect(weapons.length).toBeGreaterThan(0);
    expect(weapons.every(r=>r.units?.join()==='retinue')).toBe(true);
  });
  it('uses model eligibility for Surrogate Hosts, including an attached support, excluding Epic Heroes and Skorpekh Lords',()=>{
    const a=roster(unit('trazyn','Trazyn the Infinite'),unit('skorpekh','Skorpekh Lord'),unit('epic','Imotekh the Stormlord'),
      unit('body','Immortals'),{...unit('cryptek','Plasmancer'),attachedTo:'body'});
    expect(cues(a,'Surrogate Hosts')[0].units).toEqual(['cryptek']);
    expect(cues(roster(unit('trazyn','Trazyn the Infinite'),unit('lord','Skorpekh Lord')),'Surrogate Hosts')).toEqual([]);
  });
  it('grants Destroyer Cult to the Ankh bearer for Nekrosor’s other-unit effects only in Cursed Legion',()=>{
    const a=roster(unit('nekrosor','Nekrosor Ammentar'),unit('body','Immortals'),{...unit('noble','Overlord'),attachedTo:'body'});
    const enhanced={...a,detachments2026:['Cursed Legion'],upgrades2026:{noble:'Destroyer Ankh'}};
    expect(cues(enhanced,'Protective Disciples')).toHaveLength(1);
    expect(cues(enhanced,'Prophet of Destruction').every(r=>r.units?.join()==='body')).toBe(true);
    expect(cues({...enhanced,detachments2026:[]},'Prophet of Destruction')).toEqual([]);
  });
  it('identifies the Spyder as a possible recipient and applies Battleline aura to each actual unit',()=>{
    const a=roster({...unit('spyder','Canoptek Spyders'),wargear:{'Fabricator claw array':1}},unit('ark','Doomsday Ark'),unit('szeras','Illuminor Szeras'),
      unit('first','Immortals'),unit('second','Immortals'),{...unit('support','Chronomancer'),attachedTo:'first'});
    expect(cues(a,'Fabricator Claw Array').every(r=>r.units?.join()==='spyder,ark')).toBe(true);
    expect(cues(a,'Mechanical Augmentation').every(r=>r.units?.join()==='first,second'&&r.summary.includes('first, second'))).toBe(true);
  });
  it('surfaces Wraith Form from Reactive Subroutines only for the Court',()=>{
    const a=roster(unit('wraith','Canoptek Wraiths'));
    expect(cues({...a,detachments2026:['Canoptek Court']},'Wraith Form · Reactive Subroutines')[0]).toMatchObject({window:'Movement',units:['wraith'],summary:expect.stringMatching(/opponent.*Normal move over an enemy.*4\+/)});
    expect(cues(a,'Wraith Form · Reactive Subroutines')).toEqual([]);
  });
});
