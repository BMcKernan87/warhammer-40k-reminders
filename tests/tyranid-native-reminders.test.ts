// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {TYRANID_SHEETS} from '../src/tyranid-data.generated';
import {tyranidLoadout,validTyranidGear,tyranidModelLoadouts} from '../src/tyranid-loadouts';
import {tyranidIntrinsicReminders} from '../src/tyranid-intrinsic';
import {tyranidProfileReminders,tyranidFormationScoutRange,tyranidFormationHasDeepStrike} from '../src/tyranid-datasheet-core';
import {tyranidFormations,tyranidTransportReminders} from '../src/tyranid-transports';
import type {RosterInstance} from '../src/roster-instances';

const id=(unit:string)=>unit+'#1';
function army(names:string[],detachments:string[]=[]):ArmySelection{
 const units:Record<string,number>={},instances:RosterInstance[]=[];
 for(const unit of names){units[unit]=(units[unit]??0)+1;instances.push({unit,id:unit+'#'+units[unit],models:TYRANID_SHEETS.find(s=>s.unit===unit)?.sizes[0]??1});}
 return {...newSelection('Tyranids'),units,instances,detachments2026:detachments};
}
const join=(a:ArmySelection,leader:string,body:string)=>({...a,instances:a.instances!.map(s=>s.id===id(leader)?{...s,attachedTo:id(body)}:s)});
const get=(a:ArmySelection,title:string,roster?:RosterInstance[])=>tyranidIntrinsicReminders(a,roster).filter(r=>r.title===title);
const profile=(a:ArmySelection,title:string,roster?:RosterInstance[])=>tyranidProfileReminders(a,roster).filter(r=>r.title.endsWith(' · '+title));
function equip(a:ArmySelection,unit:string,prefix:string,items:string[]){
 const s=a.instances!.find(s=>s.id===id(unit))!,key=(items:readonly string[])=>items.map(i=>i.toLowerCase()).sort().join('|');
 const slot=tyranidLoadout(unit,s.models)!.slots.find(f=>f.name.startsWith(prefix)&&f.choices.some(c=>key(c.items)===key(items)));
 if(!slot)throw Error('No legal equipment '+unit+' / '+prefix+' / '+items.join(', '));
 const knightGear={...s.knightGear,[slot.name]:slot.choices.find(c=>key(c.items)===key(items))!.name};expect(validTyranidGear(unit,knightGear,s.models)).toBe(true);
 return {...a,instances:a.instances!.map(x=>x.id===s.id?{...x,knightGear}:x)};
}
// Current native ability names are independently enumerated from the November
// source snapshot. Hunter Organism is validated by the shared muster path;
// Tyrannocyte Aerial Seeding is owned by the transport generator.
const expected:Record<string,string[]>={
 "Hive Tyrant": [
  "Will of the Hive Mind",
  "Onslaught"
 ],
 "The Swarmlord": [
  "Hive Commander",
  "Malign Presence",
  "Domination of the Hive Mind"
 ],
 "Old One Eye": [
  "Alpha Leader",
  "Unstoppable Monster"
 ],
 "Broodlord": [
  "Vicious Insight",
  "Hypnotic Gaze"
 ],
 "Tervigon": [
  "Spawn Termagants",
  "Brood Progenitor"
 ],
 "Genestealers": [
  "Vanguard Predator"
 ],
 "Termagants": [
  "Skulking Horrors"
 ],
 "Hormagaunts": [
  "Bounding Leap"
 ],
 "Ripper Swarms": [
  "Chitinous Horrors"
 ],
 "Tyrant Guard": [
  "Guardian Organism"
 ],
 "Hive Guard": [
  "Defensive Stance"
 ],
 "Lictor": [
  "Feeder Tendrils",
  "Pheromone Trail"
 ],
 "Maleceptor": [
  "Encephalic Diffusion"
 ],
 "Zoanthropes": [
  "Spirit Leech",
  "Warp Field"
 ],
 "Venomthropes": [
  "Foul Spores"
 ],
 "Pyrovores": [
  "Burning Spray"
 ],
 "Haruspex": [
  "Grisly Spectacle"
 ],
 "Deathleaper": [
  "Feeder Tendrils",
  "Fear of the Unseen"
 ],
 "Raveners": [
  "Death From Below"
 ],
 "Gargoyles": [
  "Winged Swarm"
 ],
 "Harpy": [
  "Spore Mine Cysts"
 ],
 "Hive Crone": [
  "Airborne Predator"
 ],
 "Mucolid Spores": [
  "Bio-minefield",
  "Floating Death"
 ],
 "Spore Mines": [
  "Bio-minefield",
  "Floating Death"
 ],
 "Tyrannocyte": [
  "Aerial Seeding arrival"
 ],
 "Carnifexes": [
  "Blistering Assault"
 ],
 "Biovores": [
  "Seed Spore Mines"
 ],
 "Trygon": [
  "Subterranean Tunnels"
 ],
 "Mawloc": [
  "Terror From The Deep"
 ],
 "Exocrine": [
  "Symbiotic Targeting"
 ],
 "Tyrannofex": [
  "Resilient Organism"
 ],
 "Toxicrene": [
  "Grasping Tendrils",
  "Hypertoxic Miasma"
 ],
 "Sporocyst": [
  "Seed Mucolids",
  "Hive Defences"
 ],
 "Harridan": [
  "Frenzied Metabolism"
 ],
 "Hierophant": [
  "Apex-beast",
  "Stalking Forward"
 ],
 "Winged Hive Tyrant": [
  "Will of the Hive Mind",
  "Paroxysm"
 ],
 "Parasite Of Mortrex": [
  "Parasitic Infection",
  "It Itches!"
 ],
 "Barbgaunts": [
  "Disruption Bombardment"
 ],
 "Neurogaunts": [
  "Neurocytes"
 ],
 "Neurotyrant": [
  "Node Lash",
  "Psychic Terror",
  "Neuroloids"
 ],
 "Psychophage": [
  "Bio-stimulus",
  "Feeding Frenzy"
 ],
 "Screamer-killer": [
  "Death Scream"
 ],
 "Tyranid Warriors With Melee Bio-weapons": [
  "Adaptive Instincts"
 ],
 "Tyranid Warriors With Ranged Bio-weapons": [
  "Adaptable Predators"
 ],
 "Von Ryan’s Leapers": [
  "Pouncing Leap"
 ],
 "Winged Tyranid Prime": [
  "Alpha Warrior",
  "Death Blow"
 ],
 "Norn Emissary": [
  "Singular Purpose",
  "Unnatural Resilience"
 ],
 "Norn Assimilator": [
  "Singular Purpose",
  "Harpoon Barbs",
  "Harpooned"
 ],
 "Neurolictor": [
  "Feeder Tendrils",
  "Neural Disruption",
  "Psychological Saboteur"
 ],
 "Hyperadapted Raveners": [
  "Alpha Invader",
  "Hypersensory Array"
 ],
 "Tyranid Prime with Lash Whip": [
  "Alpha Warrior",
  "Aggressive Leader-beast"
 ],
 "The Red Terror": [
  "Swallow Whole",
  "Subterranean Hunter"
 ]
};
it.each(Object.entries(expected))('%s emits every current native ability with source and correct subjects',(unit,titles)=>{
 let a=army([...new Set([unit,'Termagants','Hive Tyrant','Tyrant Guard','Genestealers','Carnifexes','Gargoyles','Zoanthropes'])]);
 for(const [leader,body] of [[unit==='Tyrant Guard'?'Hive Tyrant':'','Tyrant Guard'],[unit==='Broodlord'?unit:'','Genestealers'],[unit==='Old One Eye'?unit:'','Carnifexes'],[unit==='Neurotyrant'?unit:'','Zoanthropes'],[unit==='Winged Tyranid Prime'?unit:'','Gargoyles']])if(leader)a=join(a,leader,body);
 const rows=[...tyranidIntrinsicReminders(a),...tyranidTransportReminders(a)];
 for(const title of titles){const matching=rows.filter(r=>(r.title===title||r.title===id(unit)+' · '+title)&&r.units?.includes(id(unit)));expect(matching.length,title).toBeGreaterThan(0);expect(matching.every(r=>r.source.includes('wh40k11ed')||r.source.includes('assets.warhammer-community.com'))).toBe(true);}
 expect(new Set(rows.map(r=>r.id)).size).toBe(rows.length);
});
it('covers all52 native cards including current Imperial Armour and excludes Legends',()=>{
 expect(Object.keys(expected).sort()).toEqual(TYRANID_SHEETS.map(s=>s.unit).sort());
 expect(Object.values(expected).flat().length).toBe(80);
});
it('keeps leading benefits on one actual formation and retains a surviving originally attached Leader',()=>{
 let a=army(['Old One Eye','Carnifexes','Carnifexes']);expect(get(a,'Alpha Leader')).toEqual([]);
 a=join(a,'Old One Eye','Carnifexes');
 expect(get(a,'Alpha Leader').every(r=>r.units?.includes(id('Carnifexes'))&&!r.units?.includes('Carnifexes#2'))).toBe(true);
 const survivors=a.instances!.filter(s=>s.id!==id('Carnifexes'));
 expect(get(a,'Alpha Leader',survivors).find(r=>r.window==='Fight')?.units).toEqual([id('Old One Eye')]);
 expect(get(a,'Alpha Leader',a.instances!.filter(s=>s.unit!=='Old One Eye'))).toEqual([]);
 expect(get(a,'Alpha Leader').some(r=>r.window==='Movement')).toBe(false);
});
it('grants Guardian Organism to the actual attached Character and expires it with the Guard source',()=>{
 let a=army(['Tyrant Guard','Hive Tyrant','Neurotyrant']);expect(get(a,'Guardian Organism')).toEqual([]);
 a=join(a,'Hive Tyrant','Tyrant Guard');
 const rows=get(a,'Guardian Organism');expect(rows).toHaveLength(5);expect(rows.every(r=>r.units?.includes(id('Hive Tyrant'))&&!r.units?.includes(id('Neurotyrant')))).toBe(true);
 expect(rows[0].summary).toContain('not every Tyrant Guard');expect(rows[0].summary).toContain('attacking unit finishes');
 expect(get(a,'Guardian Organism',a.instances!.filter(s=>s.unit!=='Tyrant Guard'))).toEqual([]);
});
it('uses publisher Malign Presence once per turn without a Warlord requirement',()=>{
 const a={...army(['The Swarmlord','Hive Tyrant']),warlordId:id('Hive Tyrant')};
 const rows=get(a,'Malign Presence');expect(rows).toHaveLength(5);
 expect(rows.every(r=>r.summary.includes('Once per turn')&&r.summary.includes('within 12″')&&r.source.endsWith('an12izciwp-np2hnkcsje.pdf'))).toBe(true);
 expect(rows[0].summary).toContain('does not require');expect(get(a,'Hive Commander')[0]).toMatchObject({window:'Command',turn:'own',timing:'start'});
});
it('uses current Foul Spores on Monster-containing formations and current Stealth cover',()=>{
 const a=join(army(['Venomthropes','Hive Tyrant','Tyrant Guard','Tyrannofex']),'Hive Tyrant','Tyrant Guard');
 const rows=get(a,'Foul Spores');expect(rows).toHaveLength(3);expect(rows[0].units).toEqual(expect.arrayContaining([id('Hive Tyrant'),id('Tyrant Guard'),id('Tyrannofex')]));
 expect(rows[0].summary).toContain('Benefit of Cover');expect(rows[0].source).toContain('an12izciwp-np2hnkcsje.pdf');
 expect(get(a,'Foul Spores',a.instances!.filter(s=>s.unit!=='Venomthropes'))).toEqual([]);
});
it('separates normal attack bonuses from snap shots and keeps applicable Wound effects',()=>{
 const a=join(army(['Neurotyrant','Zoanthropes','Neurolictor','Norn Assimilator','Hive Crone','Hive Tyrant']),'Neurotyrant','Zoanthropes');
 const snap=(title:string)=>get(a,title).filter(r=>r.window==='Movement'&&r.turn==='opponent');
 for(const title of ['Onslaught','Airborne Predator','Alpha Warrior','Malign Presence'])expect(snap(title)).toEqual([]);
 expect(snap('Node Lash')[0].summary).toContain('add 1 to Wound rolls');expect(snap('Node Lash')[0].summary).toContain('does not alter snap-shot accuracy');
 expect(snap('Singular Purpose · Enemy quarry')[0].summary).toContain('Hit rolls cannot be re-rolled');
 expect(snap('Psychological Saboteur')[0].summary).toContain('add 1 to Wound rolls');
});
it('keeps every own-Shooting trigger locked to that phase and emits no normal return-fire permission',()=>{
 const a=army(['Pyrovores','Exocrine','Psychophage','Biovores','Sporocyst','Barbgaunts','Screamer-killer']);
 for(const title of ['Burning Spray','Symbiotic Targeting','Bio-stimulus','Seed Spore Mines','Seed Mucolids','Disruption Bombardment','Death Scream']){
  const rows=get(a,title);expect(rows.length).toBeGreaterThan(0);expect(rows.every(r=>r.window==='Shooting'&&r.turn==='own')).toBe(true);
 }
 expect(tyranidProfileReminders(a).some(r=>r.title.includes('Reaction shooting'))).toBe(false);
});
it('spawns the correct mine unit once per army per turn with current distances and Hidden FAQ',()=>{
 const a=army(['Biovores','Sporocyst','Harpy']);
 expect(get(a,'Seed Spore Mines')[0].summary).toMatch(/one Biovores unit.*instead of firing.*one model per surviving Biovore.*wholly within 48″.*more than 8″.*does not remove Hidden/);
 expect(get(a,'Seed Mucolids')[0].summary).toMatch(/one Sporocyst.*instead of firing.*one model.*wholly within 18″.*more than 8″/);
 const cysts=get(a,'Spore Mine Cysts')[0];expect(cysts).toMatchObject({window:'Fight',turn:'opponent',timing:'end'});expect(cysts.summary).toContain('six D6');expect(cysts.summary).toContain('per 3+');expect(cysts.summary).toContain('D3-model');expect(cysts.summary).toContain('Only one model');
});
it('keeps surge wound-loss and casualty triggers distinct and uses current reactive movement',()=>{
 const a=join(army(['Carnifexes','Termagants','Tyranid Prime with Lash Whip']),'Tyranid Prime with Lash Whip','Termagants');
 const carn=get(a,'Blistering Assault')[0],prime=get(a,'Aggressive Leader-beast')[0];
 expect(carn).toMatchObject({window:'Shooting',turn:'opponent'});expect(carn.summary).toContain('lost a wound');expect(carn.summary).toContain('D6+2″');expect(carn.summary).toContain('no casualty is required');
 expect(prime.summary).toContain('destroyed a model');expect(prime.summary).toContain('up to D6″');expect(prime.units).toContain(id('Termagants'));
 expect(get(a,'Skulking Horrors')[0]).toMatchObject({window:'Movement',turn:'opponent',summary:expect.stringContaining('within 8″')});
});
it('limits deep-strike attacks, closer arrivals and return-to-reserves to their exact windows',()=>{
 const a=army(['Mawloc','Trygon','Raveners','The Red Terror']);
 const maw=get(a,'Terror From The Deep');expect(maw).toHaveLength(2);expect(maw[1]).toMatchObject({window:'Movement',turn:'opponent',timing:'end'});expect(maw[0].summary).toContain('Results below 5 do not');expect(maw[0].summary).toContain('does not trigger when arriving through');
 expect(get(a,'Subterranean Tunnels').some(r=>r.turn==='opponent')).toBe(false);expect(get(a,'Subterranean Tunnels')[0].summary).toContain('more than 6″');
 expect(get(a,'Death From Below')[0]).toMatchObject({window:'End of opponent turn',turn:'opponent'});
 expect(get(a,'Subterranean Hunter')[0]).toMatchObject({window:'Fight',turn:'either',timing:'end'});
});
it('applies native Overwatch exceptions without turning them into normal shooting',()=>{
 const a=army(['Hive Guard','Sporocyst']);
 expect(get(a,'Defensive Stance')[0]).toMatchObject({window:'Movement',turn:'opponent',timing:'end'});expect(get(a,'Defensive Stance')[0].summary).toMatch(/unmodified 5\+.*unmodified 4\+.*objective you control/);
 expect(get(a,'Hive Defences')[0].summary).toMatch(/0CP.*different unit already.*only once per turn.*snap shots/);
});
it('shows actual mixed weapons and omits unequipped profile modes',()=>{
 let a=army(['Hive Guard','Termagants','Carnifexes']);
 a=equip(a,'Hive Guard','Hive Guard 1 ·',['Impaler cannon']);
 const guard=profile(a,'Ranged weapon profiles').find(r=>r.window==='Shooting'&&r.units?.includes(id('Hive Guard')))!;
 expect(guard.summary).toContain('2 × Shockcannon');expect(guard.summary).toContain('1 × Impaler cannon');expect(guard.summary).toContain('BS ');expect(guard.summary).toContain('A ');
 const snap=profile(a,'Ranged weapon profiles').find(r=>r.window==='Movement'&&r.units?.includes(id('Hive Guard')))!;expect(snap.summary).not.toContain('BS ');
 expect(tyranidModelLoadouts(a.instances!.find(s=>s.unit==='Hive Guard')!)).toHaveLength(3);
});
it('keeps personal invulnerable and Feel No Pain effects on their real source models',()=>{
 const a=join(army(['Old One Eye','Carnifexes','Norn Emissary','Zoanthropes']),'Old One Eye','Carnifexes');
 const fnp=profile(a,'Feel No Pain 5+').filter(r=>r.units?.includes(id('Old One Eye')));expect(fnp).toHaveLength(5);expect(fnp.every(r=>!r.units?.includes(id('Carnifexes')))).toBe(true);
 expect(get(a,'Unnatural Resilience')).toHaveLength(5);expect(get(a,'Unnatural Resilience')[0].summary).toContain('mortal wounds');expect(get(a,'Singular Purpose · Chosen objective')[0].summary).toContain('Objective Control 15');
 expect(profile(a,'Invulnerable save').filter(r=>r.units?.includes(id('Zoanthropes')))).toHaveLength(5);
});
it('uses whole formations for Scouts and Deep Strike, including the multi-model Ravener leader',()=>{
 let a=join(army(['Broodlord','Genestealers','Hyperadapted Raveners','Raveners','Winged Tyranid Prime','Tyranid Warriors With Melee Bio-weapons']),'Broodlord','Genestealers');
 a=join(join(a,'Hyperadapted Raveners','Raveners'),'Winged Tyranid Prime','Tyranid Warriors With Melee Bio-weapons');
 const forms=tyranidFormations(a);expect(tyranidFormationScoutRange(a,forms.find(g=>g.root.unit==='Genestealers')!.members)).toBe(8);
 expect(tyranidFormationHasDeepStrike(a,forms.find(g=>g.root.unit==='Raveners')!.members)).toBe(true);
 expect(tyranidFormationHasDeepStrike(a,forms.find(g=>g.root.unit==='Tyranid Warriors With Melee Bio-weapons')!.members)).toBe(false);
 const deep=profile(a,'Deep Strike').filter(r=>r.window==='Pre-battle');expect(deep).toHaveLength(1);expect(deep[0].units).toEqual([id('Raveners'),id('Hyperadapted Raveners')]);
});
it('applies Ambush Predators to actual Deep Strike placement and retains the Rapid Ingress round limit',()=>{
 const names=['Lictor','Deathleaper','Neurolictor','Von Ryan’s Leapers'];
 expect(profile(army(names),'Deep Strike')).toEqual([]);
 const a=army(names,['Ambush Predators']);
 expect(profile(a,'Deep Strike').filter(r=>r.window==='Pre-battle').map(r=>r.units?.[0]).sort()).toEqual(names.slice(0,3).map(id).sort());
 expect(profile(a,'Deep Strike').filter(r=>r.window==='Movement')).toHaveLength(3);
 expect(profile(a,'Deep Strike · Rapid Ingress')).toHaveLength(3);
 expect(profile(a,'Deep Strike · Rapid Ingress').every(r=>r.summary.includes('battle round two or later'))).toBe(true);
});
it('uses current Aircraft keywords and leaves Harridan’s printed Hover separate',()=>{
 const a=army(['Harpy','Hive Crone','Harridan','Hierophant']);
 const aircraft=tyranidProfileReminders(a).find(r=>r.title==='Aircraft · compulsory reserves')!;
 expect(aircraft.units?.sort()).toEqual([id('Harpy'),id('Hive Crone')].sort());
 expect(profile(a,'Hover').map(r=>r.units)).toEqual([[id('Harridan')]]);
 for(const unit of ['Harridan','Hierophant'])expect(profile(a,'Ranged weapon profiles').some(r=>r.window==='Movement'&&r.units?.includes(id(unit)))).toBe(false);
});
it('keeps current weapon-specific healing and charge riders tied to their named weapon',()=>{
 const a=army(['The Red Terror','Norn Assimilator','Parasite Of Mortrex']);
 expect(get(a,'Swallow Whole')[0].summary).toMatch(/gaping maw.*successful unmodified Wound roll.*D3\+2.*scything talons do not/);
 expect(get(a,'Harpooned')[0].summary).toMatch(/Monster or Vehicle within 12″.*this turn.*\+2.*finish engaged/);
 expect(get(a,'Parasitic Infection')[0].summary).toMatch(/barbed ovipositor.*new D3-model Ripper.*Other melee weapons do not/);
});
it('does not grant a shared Hypersensory discount twice or mistake unit abilities for leading-only rules',()=>{
 const a=army(['Hyperadapted Raveners','Tyranid Prime with Lash Whip','Winged Tyranid Prime']);
 expect(get(a,'Alpha Invader').filter(r=>r.window==='Fight')).toHaveLength(1);
 expect(get(a,'Alpha Warrior').filter(r=>r.window==='Fight').map(r=>r.units)).toEqual([[id('Tyranid Prime with Lash Whip')]]);
 const discounts=get(a,'Hypersensory Array');expect(discounts).toHaveLength(2);expect(discounts[0].summary).toContain('share this ability’s one-use limit');
 expect(get(a,'Alpha Invader').some(r=>r.window==='Shooting')).toBe(false);
});
it('returns no unrelated faction output or duplicate rule IDs',()=>{
 const a=army(TYRANID_SHEETS.map(s=>s.unit));
 const rows=[...tyranidIntrinsicReminders(a),...tyranidProfileReminders(a)];expect(new Set(rows.map(r=>r.id)).size).toBe(rows.length);
 expect(tyranidIntrinsicReminders({...a,faction:'Necrons'})).toEqual([]);expect(tyranidProfileReminders({...a,faction:'Necrons'})).toEqual([]);
});
