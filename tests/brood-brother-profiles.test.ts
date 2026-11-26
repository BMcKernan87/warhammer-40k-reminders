// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {GUARD_CARDS} from '../src/brood-brother-cards.generated';
import {broodBrotherProfileReminders} from '../src/brood-brother-profiles';
import {broodBrotherLoadout} from '../src/astra-militarum-loadouts';
import type {RosterInstance} from '../src/roster-instances';
const squad=(unit:string,models?:number):RosterInstance=>({unit,id:unit+'#1',models});
const army=(members:RosterInstance[],detachment='Brood Brothers Auxilia'):ArmySelection=>({...newSelection('Genestealer Cults'),detachments2026:[detachment],instances:members,units:Object.fromEntries(members.map(s=>[s.unit,1]))});
const sheet=(...members:RosterInstance[])=>broodBrotherProfileReminders(army(members),members);
const change=(s:RosterInstance,item:string)=>{
 const options=broodBrotherLoadout(s.unit,s.models)!.slots.find(slot=>slot.choices.some(c=>c.name===item));
 if(!options)throw Error(s.unit+' has no choice '+item);
 return {...s,knightGear:{...s.knightGear,[options.name]:item}};
};
it('gates Guard duties to the enabling detachment and produces distinct phase-instance IDs',()=>{
 const roster=Object.keys(GUARD_CARDS).map(n=>squad(n)),a=army(roster);
 const result=broodBrotherProfileReminders(a,roster);
 expect(new Set(result.map(r=>r.id)).size).toBe(result.length);
 expect(broodBrotherProfileReminders(army(roster,'Final Day'),roster)).toEqual([]);
 expect(broodBrotherProfileReminders({...a,faction:'Necrons'},roster)).toEqual([]);
});
it('explodes each Cyclops on 4+ unless it detonates using Demolition Charges, and uses printed damage for multi-model squads',()=>{
 const result=sheet(squad('Cyclops Demolition Vehicle'),squad('Scout Sentinels',2),squad('Baneblade'));
 const demise=result.filter(r=>r.title.includes('Deadly Demise'));
 expect(demise.filter(r=>r.title.includes('Cyclops'))).toHaveLength(5);
 expect(demise.filter(r=>r.title.includes('Cyclops')).every(r=>r.turn==='either'&&r.summary.includes('4+')&&r.summary.includes('Demolition Charges'))).toBe(true);
 expect(demise.find(r=>r.title.includes('Sentinels'))?.summary).toMatch(/a model in this unit.*On a 6.*1 mortal wound/);
 expect(demise.find(r=>r.title.includes('Baneblade'))?.summary).toMatch(/D6\+2 mortal wounds.*separately/);
});
it('uses the original native damage bracket without applying hit changes to Overwatch; only superheavies lose OC',()=>{
 const results=sheet(squad('Baneblade'),squad('Basilisk')).filter(r=>r.title.includes('Damaged'));
 expect(results.find(r=>r.title.startsWith('Basilisk')&&r.window==='Shooting')?.summary).toMatch(/1–4 wounds.*subtract 1/);
 expect(results.some(r=>r.title.startsWith('Basilisk')&&r.summary.includes('Objective Control'))).toBe(false);
 expect(results.find(r=>r.title.startsWith('Baneblade')&&r.window==='Command')?.summary).toMatch(/1–8 wounds.*subtract 4/);
 expect(results.some(r=>r.window==='Movement'&&r.summary.includes('Hit rolls'))).toBe(false);
});
it('uses only selected guns and suppresses ordinary missile and Titanic Overwatch profiles',()=>{
 const shell=squad('Deathstrike'),flame=change(shell,'Heavy flamer'),bane=squad('Baneblade');
 expect(sheet(shell).filter(r=>r.window==='Shooting'&&r.title.includes('Ranged')).map(r=>r.summary).join(' ')).toContain('Heavy bolter');
 const results=sheet(flame,bane).filter(r=>r.title.includes('Ranged weapon profiles'));
 for(const r of results.filter(r=>r.units?.includes(flame.id))){
  expect(r.summary).toContain('Heavy flamer');expect(r.summary).toContain('Torrent');
  expect(r.summary).not.toMatch(/Deathstrike missile|Plasma warhead|Heavy bolter/i);
 }
 expect(results.find(r=>r.units?.includes(flame.id)&&r.window==='Movement')?.turn).toBe('opponent');
 expect(results.some(r=>r.units?.includes(bane.id)&&r.window==='Shooting')).toBe(true);
 expect(results.some(r=>r.units?.includes(bane.id)&&r.window==='Movement')).toBe(false);
 expect(GUARD_CARDS.Kasrkin.weapons.some(w=>w.name.toLowerCase()==='power weapon')).toBe(false);
});
it('uses the whole attached unit for Scouting but keeps the Castellan save on the allocated bearer',()=>{
 const kasrkin=squad('Kasrkin'),officer={...squad('Cadian Castellan'),attachedTo:kasrkin.id},chimera=squad('Chimera');
 expect(sheet(kasrkin,chimera).filter(r=>r.title.includes('Scouts')).map(r=>r.units)).toEqual([[kasrkin.id],[chimera.id,kasrkin.id]]);
 const joined=sheet(kasrkin,officer,chimera);
 expect(joined.some(r=>r.title.includes('Scouts'))).toBe(false);
 const saves=joined.filter(r=>r.title.includes('Invulnerable save'));
 expect(saves.map(r=>r.window)).toEqual(['Shooting','Movement','Fight','Shooting','Movement']);
 expect(saves.every(r=>r.summary.includes('allocated to the Cadian Castellan model')&&r.summary.includes('5+')&&r.units?.length===1&&r.units[0]===officer.id)).toBe(true);
});
it('shows the troop’s legal pre-battle deployment, defensive cover and current non-Aircraft Hover',()=>{
 const troops=squad('Cadian Recon Squad'),results=sheet(troops,squad('Valkyrie'));
 expect(results.find(r=>r.title.includes('Infiltrators'))).toMatchObject({window:'Pre-battle',summary:expect.stringMatching(/more than 8″.*enemy models.*enemy deployment zone/)});
 expect(results.filter(r=>r.title.includes('Stealth')).map(r=>[r.window,r.turn])).toEqual([['Shooting','opponent'],['Movement','own'],['Shooting','own'],['Movement','opponent']]);
 expect(results.find(r=>r.title.includes('Hover'))).toMatchObject({window:'Movement',turn:'own',summary:expect.stringMatching(/takes to the skies.*2″ reduction/)});
});
it('selects individual embarked guns and counts only Krieg gunners as two Firing Deck slots',()=>{
 const krieg=change(squad('Krieg Heavy Weapons Squad'),'Krieg heavy flamer'),chimera=squad('Chimera'),native=squad('Neophyte Hybrids',10);
 const deck=sheet(krieg,chimera,native).filter(r=>r.title.includes('Firing Deck'));
 expect(deck).toHaveLength(1);expect(deck[0]).toMatchObject({turn:'own',window:'Shooting',units:[chimera.id,krieg.id]});
 expect(deck[0].summary).toMatch(/2 embarked model slots/);
 expect(deck[0].summary).toMatch(/1 × Heavy Weapons Gunner \(2 slots\)[^.]*Krieg heavy flamer/);
 expect(deck[0].summary).toMatch(/2 × Heavy Weapons Gunner \(2 slots\)[^.]*Lascannon/);
 expect(deck[0].summary).toMatch(/1 × Fire Coordinator — Laspistol/);
 expect(deck[0].summary).not.toContain('Neophyte');
 expect(sheet(native,chimera).some(r=>r.title.includes('Firing Deck'))).toBe(false);
 expect(sheet(squad('Cyclops Demolition Vehicle'),chimera).some(r=>r.title.includes('Firing Deck'))).toBe(false);
});
it('keeps a single gunner on the two-model Recon missile team and both weapon modes in the same model slot',()=>{
 const recon={...squad('Cadian Recon Squad'),knightGear:{'Two remaining specialists':'2 × Laspistol + Missile launcher'}},chimera=squad('Chimera');
 const choice=broodBrotherLoadout(recon.unit)!.slots.find(s=>s.name==='Two remaining specialists')!.choices.find(c=>c.items.includes('Missile launcher'))!;
 recon.knightGear['Two remaining specialists']=choice.name;
 const deck=sheet(recon,chimera).find(r=>r.title.includes('Firing Deck'))!.summary;
 expect(deck).toMatch(/1 × Recon Trooper — Laspistol \[pistol\] \/ Missile launcher – frag.*Missile launcher – krak/);
 expect(deck).toMatch(/1 × Recon Trooper — Laspistol \[pistol\][.)]/);
 expect(deck).not.toMatch(/Long-las|Meltagun/);
});

it('prints the Death Rider mounts’ Extra Attacks in the Fight phase for every selected rider',()=>{
 const riders={...squad('Death Riders'),models:7};
 const melee=sheet(riders).find(r=>r.title.includes('Melee weapon profiles')&&r.window==='Fight');
 expect(melee?.summary).toMatch(/7 × Steed's savage claws[^.]*Extra Attacks/i);
});
