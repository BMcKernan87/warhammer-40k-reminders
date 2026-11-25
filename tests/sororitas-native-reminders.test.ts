// @vitest-environment node
import {expect,it} from 'vitest';
import {addSelectionUnit,newSelection,type ArmySelection} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
import {individualArmy,setInstanceAttachment,setInstanceModelCount} from '../src/roster-instances';
import {sororitasLoadout} from '../src/sororitas-loadouts';
import {setKnightGear} from '../src/knight-loadouts';
import {SORORITAS_SHEETS} from '../src/sororitas-data.generated';
import {sororitasProfileReminders} from '../src/sororitas-datasheet-core';
import {sororitasReactionShooting} from '../src/sororitas-reactions';

const id=(name:string)=>name+'#1';
function army(names:string[],detachments:string[]=[]){let a=individualArmy({...newSelection('Adepta Sororitas'),detachments2026:detachments});for(const name of names)a=addSelectionUnit(a,name);return a;}
const join=(a:ArmySelection,leader:string,body:string)=>setInstanceAttachment(a,id(leader),id(body));
const get=(a:ArmySelection,title:string)=>generate11thReminders(a).filter(r=>r.id.startsWith('11e-sororitas-native:')&&r.title===title);
const profiles=(a:ArmySelection,title:string)=>sororitasProfileReminders(a).filter(r=>r.title.endsWith(' · '+title));
function equip(a:ArmySelection,unit:string,prefix:string,items:string[]){
 const s=a.instances!.find(s=>s.unit===unit)!,key=(items:readonly string[])=>items.map(i=>i.toLowerCase()).sort().join('|');
 const slot=sororitasLoadout(unit,s.models)!.slots.find(f=>f.name.startsWith(prefix)&&f.choices.some(c=>key(c.items)===key(items)))!;
 if(!slot)throw Error('Missing test kit '+unit+' / '+prefix);
 return setKnightGear(a,s.id,slot.name,slot.choices.find(c=>key(c.items)===key(items))!.name);
}
const expected:Record<string,string>={
 'Aestred Thurga And Agathae Dolan':'Recount the Deeds of the Saints · Agathae is destroyed','Arco-flagellants':'Extremis Trigger Word','Battle Sisters Squad':'Defenders of the Faith',
 Canoness:'The Emperor’s Grace','Canoness with Jump Pack':'Divine Deliverance',Castigator:'Rites of Castigation','Celestian Insidiants':'Virtue of Intolerance','Celestian Sacresants':'Sworn Protectors',
 Daemonifuge:'Holy Judgement',Dialogus:'Laud Hailer',Dogmata:'Executioner of Heretics','Dominion Squad':'Righteous Awareness',Exorcist:'Devastating Refrain',Hospitaller:'Sacred Healing',Imagifier:'Litany of Deeds',
 Immolator:'Purge and Cleanse','Intranzia Fraye':'Righteous Denunciation','Junith Eruita':'Fiery Conviction','Ministorum Priest':'Zealot',Mortifiers:'Anguish of the Unredeemed','Morvenn Vahl':'Righteous Repugnance',
 Palatine:'Rapturous Blows','Paragon Warsuits':'Righteous Paragons','Penitent Engines':'Endless Suffering','Repentia Squad':'Overseer of Redemption','Retributor Squad':'Storm of Retribution','Saint Celestine':'Healing Tears',
 Sanctifiers:'Ministorum Sermon','Seraphim Squad':'Angelic Ascent','Sisters Novitiate Squad':'Impetuous Fervour','Sororitas Rhino':'Self Repair','Triumph Of Saint Katherine':'Relics of the Matriarchs','Zephyrim Squad':'Embodied Prophecy'
};
it.each(Object.entries(expected))('%s reaches the normal phase sheet through its actual current native ability',(unit,title)=>{
 let a=army([unit,...(unit==='Battle Sisters Squad'?[]:['Battle Sisters Squad']),...(unit==='Ministorum Priest'?[]:['Ministorum Priest'])]);
 if(unit==='Celestian Sacresants'||unit==='Sanctifiers'){
  if(unit==='Celestian Sacresants'){a=addSelectionUnit(a,'Canoness');a=join(a,'Canoness',unit);}else a=join(a,'Ministorum Priest',unit);
 }else if(['Hospitaller'].includes(unit))a=join(a,unit,'Battle Sisters Squad');
 const rows=get(a,title);expect(rows.length).toBeGreaterThan(0);expect(rows.some(r=>r.units?.includes(id(unit)))).toBe(true);
 expect(rows.every(r=>r.source.includes('wh40k11ed'))).toBe(true);
 const all=generate11thReminders(a).filter(r=>r.id.startsWith('11e-sororitas-native:'));
 expect(new Set(all.map(r=>r.id)).size).toBe(all.length);
});
it('covers exactly the 33 current native cards without dormant Legends rules',()=>expect(Object.keys(expected).sort()).toEqual(SORORITAS_SHEETS.map(s=>s.unit).sort()));
it('combines real Leader and Support effects without lending them to an identically named second bodyguard',()=>{
 let a=army(['Battle Sisters Squad','Battle Sisters Squad','Canoness','Hospitaller','Imagifier']);
 expect(get(a,'Medicus Ministorum')).toEqual([]);expect(get(a,'Stanchion of Holy Martyrs')).toEqual([]);
 a=join(a,'Canoness','Battle Sisters Squad');a=join(a,'Hospitaller','Battle Sisters Squad');
 const healing=get(a,'Sacred Healing')[0];expect(healing.units).toEqual([id('Hospitaller'),id('Battle Sisters Squad'),id('Canoness')]);
 expect(healing.units).not.toContain('Battle Sisters Squad#2');expect(healing.summary).toContain('non-Character');expect(healing.summary).toContain('D3+1');
 expect(healing.summary).toContain('not an Act of Faith');
});
it('shares Sacred Command across both Canoness cards and activates relic wargear only on the equipped bearer',()=>{
 let a=army(['Canoness','Canoness with Jump Pack','Battle Sisters Squad']);a=join(a,'Canoness','Battle Sisters Squad');
 expect(get(a,'Sacred Command')).toHaveLength(5);expect(get(a,'Sacred Command')[0].summary).toContain('across all units with Sacred Command');
 expect(get(a,'Null Rod')).toEqual([]);expect(get(a,'Rod of Office')).toEqual([]);
 a=equip(a,'Canoness','',['Bolt pistol','Hallowed Chainsword','Null rod']);
 expect(get(a,'Null Rod')).toHaveLength(5);expect(get(a,'Null Rod')[0].units).toContain(id('Battle Sisters Squad'));
 a=equip(a,'Canoness','',['Plasma pistol','Power weapon','Rod of Office']);
 expect(get(a,'Null Rod')).toEqual([]);expect(get(a,'Rod of Office').map(r=>r.window)).toEqual(['Fight','Shooting']);
});
it('keeps named model, escort, Superior and Anchorite benefits on their physical recipients',()=>{
 let a=army(['Saint Celestine','Seraphim Squad','Repentia Squad','Mortifiers']);a=join(a,'Saint Celestine','Seraphim Squad');
 expect(get(a,'Healing Tears')[0].summary).toContain('one destroyed Geminae Superia');
 expect(get(a,'Lifewards')[0].summary).toContain('only Celestine herself');expect(get(a,'Lifewards')[0].summary).toContain('at least one Geminae');
 expect(get(a,'Miraculous Intervention')).toHaveLength(5);expect(get(a,'Miraculous Intervention')[0]).toMatchObject({timing:'end',summary:expect.stringContaining('first time')});
 expect(get(a,'Overseer of Redemption')[0].summary).toContain('only its Sisters Repentia');
 expect(get(a,'Anchorite Sarcophagus')).toEqual([]);
 a=equip(a,'Mortifiers','Mortifier 1 ·',['Anchorite sarcophagus']);
 expect(get(a,'Anchorite Sarcophagus').every(r=>r.summary.includes('Only the Mortifier model equipped'))).toBe(true);
});
it('respects separate Aestred and Agathae survival conditions, with the explicit Agathae model-death dice even while unjoined',()=>{
 let a=army(['Aestred Thurga And Agathae Dolan','Battle Sisters Squad']);
 expect(get(a,'Auto-Tapestry of the Emperor’s Judgement')).toEqual([]);
 expect(get(a,'Recount the Deeds of the Saints · Agathae is destroyed')).toHaveLength(5);
 a=join(a,'Aestred Thurga And Agathae Dolan','Battle Sisters Squad');
 expect(get(a,'Auto-Tapestry of the Emperor’s Judgement')[0].summary).toContain('Aestred Thurga herself survives');
 expect(get(a,'Recount the Deeds of the Saints')[0].summary).toContain('Agathae Dolan survives');
 expect(get(a,'Recount the Deeds of the Saints · Agathae is destroyed')[0].summary).toContain('D3 Miracle dice');
});
it('removes Hit rerolls, Hit bonuses and critical-Hit benefits from snap shooting but keeps valid Wound effects',()=>{
 let a=army(['Morvenn Vahl','Paragon Warsuits','Retributor Squad','Sisters Novitiate Squad','Palatine','Battle Sisters Squad','Celestian Insidiants']);
 a=join(a,'Morvenn Vahl','Paragon Warsuits');a=join(a,'Palatine','Battle Sisters Squad');
 const snap=(title:string)=>get(a,title).filter(r=>r.window==='Movement'&&r.turn==='opponent');
 expect(snap('Impetuous Fervour')).toEqual([]);expect(snap('Fury of the Righteous')).toEqual([]);
 expect(snap('Abbess Sanctorum')[0].summary).toContain('re-roll Wound rolls');expect(snap('Abbess Sanctorum')[0].summary).toContain('cannot re-roll Hit rolls');
 expect(snap('Righteous Paragons')[0].summary).toContain('add 1 to Wound rolls');
 expect(snap('Storm of Retribution')[0].summary).toContain('re-roll ranged Wound rolls of 1');
 expect(snap('Virtue of Intolerance')[0].summary).toContain('Precision');expect(snap('Virtue of Intolerance')[0].summary).toContain('cannot re-roll Hit rolls');
});
it('restores normal ranged passives for eligible Praise the Fallen shots without reusing own-Shooting-only actions',()=>{
 let a=army(['Morvenn Vahl','Paragon Warsuits','Sisters Novitiate Squad','Retributor Squad','Seraphim Squad','Exorcist'],['Hallowed Martyrs']);a=join(a,'Morvenn Vahl','Paragon Warsuits');
 const reaction=(title:string)=>get(a,title).filter(r=>r.window==='Shooting'&&r.turn==='opponent');
 for(const title of ['Abbess Sanctorum','Righteous Repugnance','Righteous Paragons','Impetuous Fervour','Storm of Retribution']){
  expect(reaction(title)).toHaveLength(1);expect(reaction(title)[0].summary).toContain('Praise the Fallen');
 }
 expect(reaction('Abbess Sanctorum')[0].summary).toContain('re-roll Hit and Wound');
 expect(reaction('Angelic Ascent')).toEqual([]);expect(reaction('Devastating Refrain')).toEqual([]);
 const noReaction={...a,detachments2026:[]};expect(profiles(noReaction,'Reaction shooting · equipped models')).toEqual([]);
});
it('expires bodyguard-sourced passive effects when the last source model dies while preserving the original Leader’s own ability',()=>{
 let a=army(['Morvenn Vahl','Paragon Warsuits','Canoness','Celestian Sacresants']);
 a=join(a,'Morvenn Vahl','Paragon Warsuits');a=join(a,'Canoness','Celestian Sacresants');
 expect(get(a,'Righteous Paragons')[0].summary).toContain('only while an original Paragon Warsuits model remains');
 expect(get(a,'Sworn Protectors')[0].summary).toContain('only while an original Celestian Sacresants model remains');
 expect(get(a,'Sworn Protectors')[0].summary).toContain('until that attacking unit finishes');
 expect(get(a,'Abbess Sanctorum')[0].summary).toContain('originally attached Morvenn Vahl survives');
 expect(get(a,'Abbess Sanctorum')[0].summary).not.toContain('original Paragon Warsuits model');
});
it('keeps source model effects within their actual split half and lists only physical passenger weapons for Blazing Ire',()=>{
 let a=army(['Battle Sisters Squad','Canoness','Dialogus','Immolator'],['Bringers of Flame']);a=join(a,'Canoness','Battle Sisters Squad');a=join(a,'Dialogus','Battle Sisters Squad');
 a=equip(a,'Canoness','',['Plasma pistol','Power weapon','Rod of Office']);
 a=equip(a,'Battle Sisters Squad','Battle Sister 1 ·',['Meltagun']);
 const rod=get(a,'Rod of Office');expect(rod[0].summary).toContain('half containing its living source');
 expect(rod.find(r=>r.window==='Shooting'&&r.turn==='opponent')?.summary).toContain('required Canoness#1 model or ability bearer must be in that same half');
 const shots=profiles(a,'Reaction shooting · equipped models').find(r=>r.units?.includes(id('Battle Sisters Squad')))!;
 expect(shots.summary).toContain('half of Battle Sisters Squad#1 actually embarked');expect(shots.summary).toContain('Battle Sister 1 —');
 expect(shots.summary).toContain('1 × Meltagun');expect(shots.summary).toContain('bearer in the other half grants nothing');
 expect(shots.summary).not.toContain('10 ×');
});
it('does not allow a single-model unit to return fire after its only model was destroyed',()=>{
 let a=army(['Canoness','Castigator','Mortifiers','Saint Celestine'],['Hallowed Martyrs']);
 for(const name of ['Canoness','Castigator','Mortifiers'])expect(sororitasReactionShooting(a,a.instances!.find(s=>s.unit===name)!)).toEqual([]);
 expect(sororitasReactionShooting(a,a.instances!.find(s=>s.unit==='Saint Celestine')!)).toHaveLength(1);
 a=setInstanceModelCount(a,id('Mortifiers'),2);
 expect(sororitasReactionShooting(a,a.instances!.find(s=>s.unit==='Mortifiers')!)).toHaveLength(1);
});
it('uses the Triumph special degradation on its own attacks in normal, snap and conditional reaction windows',()=>{
 let a=army(['Triumph Of Saint Katherine','Battle Sisters Squad'],['Hallowed Martyrs']);a=join(a,'Triumph Of Saint Katherine','Battle Sisters Squad');
 const damage=profiles(a,'Damaged · weapon Attacks');expect(damage).toHaveLength(4);
 expect(damage.every(r=>r.summary.includes('3 Attacks')&&r.summary.includes('9 Attacks'))).toBe(true);
 expect(profiles(a,'Damaged').filter(r=>r.units?.includes(id('Triumph Of Saint Katherine')))).toEqual([]);
 expect(get(a,'Relics of the Matriarchs')[0].summary).toContain('choose only one');
});
it('prints only the actual weapons with full numeric profiles and keeps distinct Sanctifier specialist models',()=>{
 let a=army(['Sanctifiers','Intranzia Fraye']);a=equip(a,'Sanctifiers','Missionary gunner ·',['Meltagun','Sanctifier melee weapon']);
 const normal=profiles(a,'Ranged weapon profiles').find(r=>r.units?.includes(id('Sanctifiers'))&&r.window==='Shooting')!;
 expect(normal.summary).toContain('1 × Meltagun');expect(normal.summary).not.toContain('Plasma gun');
 expect(normal.summary).toContain('1 × Ministorum flamer');expect(normal.summary).toContain('12″; A 1; BS 4+; D D6; S9');
 const fraye=profiles(a,'Ranged weapon profiles').find(r=>r.units?.includes(id('Intranzia Fraye'))&&r.window==='Shooting')!;
 expect(fraye.summary).toContain('2 × Heavy bolter');expect(fraye.summary).toContain('2 × Ministorum heavy flamer');
});
it('uses all-model Deep Strike and native Holy Mission for actual joined deployment abilities',()=>{
 let a=army(['Saint Celestine','Seraphim Squad','Sisters Novitiate Squad','Ministorum Priest']);a=join(a,'Saint Celestine','Seraphim Squad');a=join(a,'Ministorum Priest','Sisters Novitiate Squad');
 const deep=profiles(a,'Deep Strike').filter(r=>r.window==='Pre-battle');expect(deep).toHaveLength(1);
 expect(deep[0].units).toEqual([id('Seraphim Squad'),id('Saint Celestine')]);
 expect(profiles(a,'Infiltrators')[0].units).toEqual([id('Sisters Novitiate Squad'),id('Ministorum Priest')]);
 let b=army(['Sisters Novitiate Squad','Palatine']);b=join(b,'Palatine','Sisters Novitiate Squad');expect(profiles(b,'Infiltrators')).toEqual([]);
});
it('grants conditional Holy Vanguard only for actual transport options and keeps Support models from gaining borrowed Scouts',()=>{
 let a=army(['Dominion Squad','Canoness']);a=join(a,'Canoness','Dominion Squad');
 expect(profiles(a,'Scouts 6″')).toEqual([]);expect(profiles(a,'Holy Vanguard · conditional Scouts 6″')).toEqual([]);
 a=addSelectionUnit(a,'Sororitas Rhino');expect(profiles(a,'Holy Vanguard · conditional Scouts 6″')).toHaveLength(1);
 expect(profiles(a,'Scouts 6″ · passengers')).toHaveLength(1);
 a=addSelectionUnit(a,'Dialogus');a=join(a,'Dialogus','Dominion Squad');
 expect(profiles(a,'Holy Vanguard · conditional Scouts 6″')).toEqual([]);expect(profiles(a,'Scouts 6″ · passengers')).toEqual([]);
 a=addSelectionUnit(a,'Immolator');
 expect(profiles(a,'Holy Vanguard · split Scouts 6″')).toHaveLength(1);
 expect(profiles(a,'Holy Vanguard · split Scouts 6″')[0].summary).toContain('Support without its own Scouts blocks its half');
 expect(profiles(a,'Scouts 6″ · passengers')[0].summary).toContain('every model assigned to that embarked half');
});
it('prints only actual compatible Rhino Firing Deck models, including an attached Inquisitor and excluding One Shot guns',()=>{
 let a=army(['Battle Sisters Squad','Inquisitor','Sororitas Rhino','Sanctifiers']);a=join(a,'Inquisitor','Battle Sisters Squad');
 const deck=profiles(a,'Firing Deck 2');expect(deck).toHaveLength(1);
 expect(deck[0].summary).toContain('Inquisitor#1 (1 × Inquisitor');expect(deck[0].summary).toContain('Battle Sisters Squad#1');
 expect(deck[0].summary).toContain('Sanctifiers#1');expect(deck[0].summary).not.toContain('Holy fire');
 expect(deck[0].summary).toContain('one ranged weapon other than One Shot');
});
it('allows the other half of a thirteen-model split formation to supply Rhino Firing Deck without loaning all thirteen models',()=>{
 let a=army(['Battle Sisters Squad','Aestred Thurga And Agathae Dolan','Dialogus','Sororitas Rhino','Immolator']);
 a=join(a,'Aestred Thurga And Agathae Dolan','Battle Sisters Squad');a=join(a,'Dialogus','Battle Sisters Squad');
 expect(profiles(a,'Firing Deck 2')).toEqual([]);
 const split=profiles(a,'Firing Deck 2 · split passengers');expect(split).toHaveLength(1);
 expect(split[0].summary).toContain('split 6 + 7');expect(split[0].summary).toContain('actually allocated to that embarked half');
 expect(split[0].summary).toContain('Aestred Thurga 1');expect(split[0].summary).toContain('Agathae Dolan 1');
 expect(split[0].summary).toContain('Battle Sister 9');expect(split[0].summary).not.toContain('13 ×');
 expect(split[0].summary).toContain('Never use a model or ability bearer assigned to the other half');
});

it('keeps native defenses active against permitted enemy return fire during the Sisters own Shooting phase',()=>{
 let a=army(['Canoness','Celestian Sacresants','Imagifier','Battle Sisters Squad','Junith Eruita','Mortifiers','Daemonifuge']);
 a=join(a,'Canoness','Celestian Sacresants');a=join(a,'Imagifier','Battle Sisters Squad');
 a=equip(a,'Mortifiers','Mortifier 1 ·',['Anchorite sarcophagus']);
 const ownShooting=(r:{window:string;turn?:string})=>r.window==='Shooting'&&r.turn==='own';
 for(const title of ['Sworn Protectors','Stanchion of Holy Martyrs','The Pulpit of Saint Holline’s Basilica','Anchorite Sarcophagus'])expect(get(a,title).filter(ownShooting)).toHaveLength(1);
 const invulnerable=profiles(a,'Invulnerable save').filter(ownShooting);
 expect(invulnerable).toHaveLength(a.instances!.length);
 expect(invulnerable.every(r=>r.summary.includes('enemy reaction fire'))).toBe(true);
 expect(profiles(a,'Lone Operative').filter(ownShooting)).toHaveLength(1);
});
