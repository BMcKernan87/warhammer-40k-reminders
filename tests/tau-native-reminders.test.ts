// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {TAU_SHEETS} from '../src/tau-data.generated';
import {tauLoadout,validTauGear,tauModelLoadouts} from '../src/tau-loadouts';
import {tauIntrinsicReminders} from '../src/tau-intrinsic';
import {tauProfileReminders,tauFormationScoutRange} from '../src/tau-datasheet-core';
import {tauReactionShooting} from '../src/tau-reactions';
import {tauFormations} from '../src/tau-transports';
import type {RosterInstance} from '../src/roster-instances';

const id=(unit:string)=>unit+'#1';
function army(names:string[],detachments:string[]=[]):ArmySelection{
 const units:Record<string,number>={},instances:RosterInstance[]=[];
 for(const unit of names){units[unit]=(units[unit]??0)+1;instances.push({unit,id:unit+'#'+units[unit],models:TAU_SHEETS.find(s=>s.unit===unit)?.sizes[0]??1});}
 return {...newSelection('T’au Empire'),units,instances,detachments2026:detachments};
}
const join=(a:ArmySelection,leader:string,body:string)=>({...a,instances:a.instances!.map(s=>s.id===id(leader)?{...s,attachedTo:id(body)}:s)});
const get=(a:ArmySelection,title:string,roster?:RosterInstance[])=>tauIntrinsicReminders(a,roster).filter(r=>r.title===title);
const profile=(a:ArmySelection,title:string,roster?:RosterInstance[])=>tauProfileReminders(a,roster).filter(r=>r.title.endsWith(' · '+title));
function equip(a:ArmySelection,unit:string,prefix:string,items:string[]){
 const s=a.instances!.find(s=>s.id===id(unit))!,key=(items:readonly string[])=>items.map(i=>i.toLowerCase()).sort().join('|');
 const slot=tauLoadout(unit,s.models)!.slots.find(f=>f.name.startsWith(prefix)&&f.choices.some(c=>key(c.items)===key(items)));
 if(!slot)throw Error('No legal equipment '+unit+' / '+prefix+' / '+items.join(', '));
 const knightGear={...s.knightGear,[slot.name]:slot.choices.find(c=>key(c.items)===key(items))!.name};expect(validTauGear(unit,knightGear,s.models)).toBe(true);
 return {...a,instances:a.instances!.map(x=>x.id===s.id?{...x,knightGear}:x)};
}
const expected:Record<string,string>={
 'Commander In Coldstar Battlesuit':'Coldstar Commander','Ethereal':'Coordinated Leadership','Cadre Fireblade':'Crack Shot','Commander Farsight':'Puretide’s Teachings','Commander Shadowsun':'Hero of the Empire','Darkstrider':'Jammer Array',
 'Strike Team':'Suppression Volley','Breacher Team':'Breach and Clear','Kroot Carnivores':'Fieldcraft','Krootox Riders':'Kroot Packmates','Kroot Hounds':'Loping Pounce','Stealth Battlesuits':'Forward Observers','Ghostkeel Battlesuit':'Stealth Drones','Riptide Battlesuit':'Nova Charge','Pathfinder Team':'Target Uploaded','Piranhas':'Drone Harassment Tactics','Devilfish':'Rapid Deployment','Razorshark Strike Fighter':'Ground Strike Fighter','Sun Shark Bomber':'Pulse Bombs','Vespid Stingwings':'Airborne Agility','Firesight Team':'Precise Targeting','Sky Ray Gunship':'Velocity Tracker','Hammerhead Gunship':'Armour Hunter','Broadside Battlesuits':'Advanced Armour','Stormsurge':'Titan-killer','Tidewall Droneport':'Droneport','Tidewall Shieldline':'Fortification','Tidewall Gunrig':'Fortification','Ta’unar Supremacy Armour':'Coordinated Strike','Tiger Shark':'Strafing Run','AX-1-0 Tiger Shark':'Titan Hunter','Manta':'Air Caste Colossus','Commander In Enforcer Battlesuit':'Enforcer Commander','Kroot Farstalkers':'Bounty Hunters','Crisis Sunforge Battlesuits':'Sunforge','Crisis Fireknife Battlesuits':'Fireknife','Crisis Starscythe Battlesuits':'Starscythe','Kroot Trail Shaper':'Trail Finding','Kroot War Shaper':'War Leader','Kroot Flesh Shaper':'Rites of Feasting','Kroot Lone-Spear':'Fire and Fade','Krootox Rampagers':'Kroot Linebreakers','The Twin Lance':'Exemplars of Mont’ka'
};
it.each(Object.entries(expected))('%s emits its current native rule in a source-linked formation',(unit,title)=>{
 let a=army([...new Set([unit,'Strike Team','Crisis Sunforge Battlesuits','Kroot Carnivores','Krootox Riders'])]);
 if(unit==='Commander In Coldstar Battlesuit'||unit==='Commander In Enforcer Battlesuit')a=join(a,unit,'Crisis Sunforge Battlesuits');
 if(unit==='Kroot Flesh Shaper')a=join(a,unit,'Kroot Carnivores');
 const rows=get(a,title);expect(rows.length).toBeGreaterThan(0);expect(rows.some(r=>r.units?.includes(id(unit)))).toBe(true);expect(rows.every(r=>r.source.includes('wh40k11ed'))).toBe(true);
 const all=tauIntrinsicReminders(a);expect(new Set(all.map(r=>r.id)).size).toBe(all.length);
});
it('covers all43 current sheets including Imperial Armour but no Legends',()=>expect(Object.keys(expected).sort()).toEqual(TAU_SHEETS.map(s=>s.unit).sort()));
it('keeps leading effects on one actual formation and preserves the original living leader after the bodyguard dies',()=>{
 let a=army(['Strike Team','Strike Team','Cadre Fireblade']);expect(get(a,'Volley Fire')).toEqual([]);
 a=join(a,'Cadre Fireblade','Strike Team');
 const rows=get(a,'Volley Fire');expect(rows).toHaveLength(2);expect(rows.every(r=>r.units?.includes(id('Strike Team'))&&!r.units?.includes('Strike Team#2'))).toBe(true);
 const active=a.instances!.filter(s=>s.id!==id('Strike Team'));
 expect(get(a,'Volley Fire',active)).toHaveLength(2);expect(get(a,'Volley Fire',active).every(r=>r.units?.includes(id('Cadre Fireblade'))&&!r.units?.includes(id('Strike Team')))).toBe(true);
 expect(get(a,'Volley Fire',a.instances!.filter(s=>s.unit!=='Cadre Fireblade'))).toEqual([]);
});
it('keeps two Shapers together after their original20-model Carnivore bodyguard dies and retains source-specific leading rules',()=>{
 let a=army(['Kroot Carnivores','Kroot War Shaper','Kroot Flesh Shaper']);a={...a,instances:a.instances!.map(s=>s.unit==='Kroot Carnivores'?{...s,models:20}:s)};
 a=join(join(a,'Kroot War Shaper','Kroot Carnivores'),'Kroot Flesh Shaper','Kroot Carnivores');
 const wounded=a.instances!.map(s=>s.unit==='Kroot Carnivores'?{...s,models:10}:s);expect(tauFormations(a,wounded)).toHaveLength(1);
 const active=a.instances!.filter(s=>s.unit!=='Kroot Carnivores');expect(tauFormations(a,active)).toHaveLength(1);
 const rows=get(a,'Rites of Feasting',active);expect(rows).toHaveLength(5);expect(rows[0].units).toEqual(expect.arrayContaining([id('Kroot War Shaper'),id('Kroot Flesh Shaper')]));
 expect(get(a,'Rites of Feasting',active.filter(s=>s.unit!=='Kroot Flesh Shaper'))).toEqual([]);
});
it('allows Ethereal CP while embarked at ownCommand end and keeps Hover Drone on its bearer',()=>{
 let a=join(army(['Ethereal','Strike Team','Devilfish']),'Ethereal','Strike Team');
 const cp=get(a,'Coordinated Leadership')[0];expect(cp).toMatchObject({window:'Command',turn:'own',timing:'end'});expect(cp.summary).toContain('even while the Ethereal is embarked');
 expect(get(a,'Failure Is Not an Option')).toHaveLength(5);expect(get(a,'Hover Drone')).toEqual([]);
 a=equip(a,'Ethereal','',['Hover Drone']);expect(get(a,'Hover Drone')[0].summary).toContain('Only this equipped Ethereal');expect(get(a,'Hover Drone')[0].summary).toContain('Move 10″');
});
it('retains wound, damage, AP and Precision effects in snap shooting but rejects Hit and Critical Hit bonuses',()=>{
 const a=army(['Crisis Sunforge Battlesuits','Crisis Fireknife Battlesuits','Crisis Starscythe Battlesuits','Kroot Farstalkers','The Twin Lance','Sky Ray Gunship','Hammerhead Gunship','Commander Shadowsun']);
 const snap=(title:string)=>get(a,title).filter(r=>r.window==='Movement'&&r.turn==='opponent');
 for(const title of ['Fireknife','Weapon Support System','Velocity Tracker','Armour Hunter','Hero of the Empire'])expect(snap(title)).toEqual([]);
 expect(snap('Sunforge')[0].summary).toContain('Wound rolls and Damage rolls');expect(snap('Starscythe')[0].summary).toContain('AP by 1');
 expect(snap('Bounty Hunters')[0].summary).toContain('retain Precision');expect(snap('Bounty Hunters')[0].summary).toContain('Lethal Hits provides no benefit');
 expect(snap('Exemplars of Mont’ka')[0].summary).toContain('Ignores Cover');expect(snap('Exemplars of Mont’ka')[0].summary).toContain('cannot score Critical Hits');
 expect(snap('Targeting Array')).toHaveLength(2);expect(snap('Targeting Array').every(r=>r.summary.includes('one Wound roll'))).toBe(true);
});
it('prints normal Kroot Packmates return fire only when an actual friendly Kroot Infantry formation exists',()=>{
 let a=army(['Krootox Riders','Commander Shadowsun']);expect(get(a,'Kroot Packmates')).toEqual([]);expect(profile(a,'Reaction shooting · equipped models')).toEqual([]);
 a=army(['Krootox Riders','Kroot Carnivores','Commander Shadowsun']);
 const row=get(a,'Kroot Packmates')[0];expect(row).toMatchObject({window:'Shooting',turn:'opponent'});expect(row.summary).toContain('one Krootox Riders unit');expect(row.summary).toContain('normal shooting, not snap');expect(row.summary).toContain('Hidden Hunters');
 const guns=profile(a,'Reaction shooting · equipped models')[0];expect(guns.summary).toContain('actual surviving models');expect(guns.summary).toContain('BS ');expect(guns.summary).toContain('Krootox Rider 1');
 expect(get(a,'Hero of the Empire').find(r=>r.turn==='opponent')?.units).toContain(id('Krootox Riders'));
 const active=a.instances!.filter(s=>s.unit!=='Kroot Carnivores');expect(tauReactionShooting(a,active[0],active)).toEqual([]);
});
it('gates guardian, marker and invulnerable effects on their actual fitted equipment and keeps gun-drone attacks with the bearer',()=>{
 let a=join(army(['Breacher Team','Cadre Fireblade','Commander In Coldstar Battlesuit']),'Cadre Fireblade','Breacher Team');
 expect(get(a,'Guardian Drone')).toEqual([]);expect(get(a,'Shield Generator')).toEqual([]);
 a=equip(a,'Breacher Team','Breacher Fire Warrior Shas’ui ·',['Guardian Drone','Gun drone','Twin pulse carbine']);
 a=equip(a,'Cadre Fireblade','',['Gun drone','Shield Drone','Twin pulse carbine']);
 a=equip(a,'Commander In Coldstar Battlesuit','Additional weapon or system 1',['Shield generator']);
 expect(get(a,'Guardian Drone')).toHaveLength(3);expect(get(a,'Guardian Drone')[0].summary).toContain('Breacher Fire Warrior Shas’ui 1');
 const inv=get(a,'Shield Generator');expect(inv).toHaveLength(4);expect(inv.every(r=>r.units?.includes(id('Commander In Coldstar Battlesuit'))&&!r.units?.includes(id('Breacher Team')))).toBe(true);
 const volley=get(a,'Volley Fire')[0];expect(volley.summary).toContain('guns granted to their bearers by drones');expect(get(a,'Crack Shot')[0].summary).toContain('Gun Drone');
 const fb=profile(a,'Ranged weapon profiles').find(r=>r.units?.includes(id('Cadre Fireblade'))&&r.window==='Shooting')!;expect(fb.summary).toContain('1 × Twin pulse carbine');
});
it('distinguishes a Commander support-system-only permission from the entire Starscythe formation’s fallback shooting',()=>{
 let a=join(army(['Crisis Starscythe Battlesuits','Commander In Coldstar Battlesuit']),'Commander In Coldstar Battlesuit','Crisis Starscythe Battlesuits');
 expect(get(a,'Battlesuit Support System')[0].summary).toContain('including an attached Commander');
 a=equip(a,'Commander In Coldstar Battlesuit','Additional weapon or system 1',['Battlesuit support system']);
 const rows=get(a,'Battlesuit Support System');expect(rows.some(r=>r.summary.includes('only models actually equipped'))).toBe(true);expect(rows.some(r=>r.summary.includes('unit-wide datasheet ability'))).toBe(true);
});
it('keeps the DS8 turret conditional on a surviving Shas’ui and never adds a permanent gun or passenger',()=>{
 const a=army(['Strike Team','Breacher Team','Tidewall Shieldline']);
 for(const unit of ['Strike Team','Breacher Team']){
  const normal=profile(a,'Ranged weapon profiles').find(r=>r.window==='Shooting'&&r.units?.includes(id(unit)))!;expect(normal.summary).not.toContain('Support turret');
  const turret=profile(a,'DS8 Support Turret · conditional profile').filter(r=>r.units?.includes(id(unit)));expect(turret).toHaveLength(2);
  expect(turret.every(r=>r.summary.includes('original Shas’ui survives')&&r.summary.includes('until the start of your next turn')&&r.summary.includes('1 × Support turret'))).toBe(true);
 }
 const deck=profile(a,'Firing Deck 20')[0];expect(deck.summary).not.toContain('Support turret');
});
it('uses the current Pathfinder self-Observer benefit, actual drone selection and full formation Infiltrators',()=>{
 let a=join(army(['Pathfinder Team','Darkstrider','Devilfish']),'Darkstrider','Pathfinder Team');
 const uploaded=get(a,'Target Uploaded');expect(uploaded).toHaveLength(1);expect(uploaded[0].summary).toContain('its own Spotted unit');expect(uploaded[0].summary).toContain('does not require them to be Guided');
 expect(profile(a,'Infiltrators')).toEqual([]);expect(profile(a,'Scouts 7″')).toHaveLength(1);expect(profile(a,'Scouts · passengers')).toHaveLength(1);
 a=equip(a,'Pathfinder Team','Pathfinder Shas’ui ·',['Recon drone','Drone burst cannon']);expect(profile(a,'Infiltrators')).toHaveLength(1);expect(profile(a,'Infiltrators')[0].units).toContain(id('Darkstrider'));
 a=equip(a,'Pathfinder Team','Pathfinder Shas’ui ·',['Grav-inhibitor Drone']);expect(profile(a,'Infiltrators')).toEqual([]);expect(get(a,'Grav-inhibitor Drone')[0].summary).toContain('not cumulative');
 a=equip(a,'Pathfinder Team','Pathfinder Shas’ui ·',['Pulse Accelerator Drone']);expect(get(a,'Grav-inhibitor Drone')).toEqual([]);expect(get(a,'Pulse Accelerator Drone')[0].summary).toContain('Range of pulse carbines');
});
it('routes Homing Beacon to legal non-Aircraft whole formations and retains normal first-round restrictions',()=>{
 let a=army(['Stealth Battlesuits','Crisis Sunforge Battlesuits','Commander In Coldstar Battlesuit','Manta','Tidewall Shieldline']);a=join(a,'Commander In Coldstar Battlesuit','Crisis Sunforge Battlesuits');
 a=equip(a,'Stealth Battlesuits','Stealth Shas’ui 1 ·',['Homing beacon']);
 const row=get(a,'Homing Beacon')[0];expect(row).toMatchObject({window:'Movement',turn:'opponent',timing:'end'});
 expect(row.summary).toContain('within 3″');expect(row.summary).toContain('more than 8″');expect(row.summary).toContain('no first-round arrival');expect(row.units).toContain(id('Commander In Coldstar Battlesuit'));expect(row.units).not.toContain(id('Manta'));expect(row.units).not.toContain(id('Tidewall Shieldline'));
});
it('keeps the current own-Shooting and end-of-turn locks instead of turning every ability into a reaction',()=>{
 const a=army(['Strike Team','Riptide Battlesuit','Kroot Lone-Spear','Tiger Shark','Sun Shark Bomber','Vespid Stingwings','The Twin Lance']);
 for(const title of ['Nova Charge','Fire and Fade','Strafing Run'])expect(get(a,title).some(r=>r.window==='Shooting'&&r.turn==='opponent')).toBe(false);
 expect(get(a,'Nova Charge')[0].summary).toContain('Only that selected weapon');expect(get(a,'Nova Charge')[0].summary).toContain('cannot be activated during Overwatch');
 expect(get(a,'Pulse Bombs')[0]).toMatchObject({window:'Fight',turn:'opponent',timing:'end',summary:expect.stringContaining('excluding Lone Operative')});
 expect(get(a,'Airborne Agility')[0]).toMatchObject({window:'End of opponent turn',turn:'opponent',timing:'end'});
 expect(get(a,'Neocapacitor Shields')[0]).toMatchObject({window:'Charge',turn:'opponent',timing:'start'});
 expect(get(a,'Retro-thrusters')[0].summary).toContain('was eligible to fight');
});
it('keeps Kroot character and nearby-Infantry conditions separate and marks Lone-Spear quarry only for other Kroot models',()=>{
 let a=army(['Kroot Hounds','Kroot Carnivores']);expect(get(a,'Loping Pounce').some(r=>r.window==='Command'&&r.timing==='start')).toBe(true);expect(get(a,'Hunting Hounds')).toEqual([]);
 a=army(['Kroot Hounds','Kroot Carnivores','Kroot War Shaper','Kroot Lone-Spear','Krootox Riders']);
 expect(get(a,'Hunting Hounds')[0].summary).toContain('within 12″');expect(get(a,'Hunting Hounds')[0].summary).toContain('actual Character model');
 expect(get(a,'Advanced Scouting')[0].summary).toContain('does not grant itself');
 const reaction=get(a,'Advanced Scouting · Marked quarry').find(r=>r.window==='Shooting')!;expect(reaction.units).toContain(id('Krootox Riders'));expect(reaction.summary).toContain('Overwatch earlier');
});
it('prints only actual fitting Firing Deck passengers, including equipped drone guns but no extra drone models',()=>{
 let a=join(army(['Strike Team','Cadre Fireblade','Kroot Carnivores','Broadside Battlesuits','Tidewall Shieldline']),'Cadre Fireblade','Strike Team');
 a=equip(a,'Cadre Fireblade','',['Gun drone','Gun drone','Twin pulse carbine','Twin pulse carbine']);
 const row=profile(a,'Firing Deck 20')[0];expect(row.summary).toContain('one ranged weapon other than One Shot per selected model');expect(row.summary).toContain('1 × Cadre Fireblade');expect(row.summary).toContain('Twin pulse carbine');
 expect(row.units).toContain(id('Cadre Fireblade'));expect(row.units).not.toContain(id('Kroot Carnivores'));expect(row.units).not.toContain(id('Broadside Battlesuits'));
 expect(tauModelLoadouts(a.instances!.find(s=>s.unit==='Cadre Fireblade')!)).toHaveLength(1);
 expect(profile(a,'Ranged weapon profiles').some(r=>r.window==='Movement'&&r.units?.includes(id('Tidewall Shieldline')))).toBe(false);
});
it('allows Shadowsun’s shooting aura on a gunless Shieldline only when legal Firing Deck cargo supplies a weapon',()=>{
 const empty=army(['Commander Shadowsun','Tidewall Shieldline']);
 expect(get(empty,'Hero of the Empire')[0].units).not.toContain(id('Tidewall Shieldline'));
 const loaded=army(['Commander Shadowsun','Tidewall Shieldline','Strike Team']);
 expect(get(loaded,'Hero of the Empire')[0].units).toContain(id('Tidewall Shieldline'));
 expect(get(loaded,'Hero of the Empire').some(r=>r.window==='Movement')).toBe(false);
 const illegal=army(['Commander Shadowsun','Tidewall Shieldline','Kroot Carnivores']);
 expect(get(illegal,'Hero of the Empire')[0].units).not.toContain(id('Tidewall Shieldline'));
});
it('keeps Manta’s Hover and all five Aircraft in the current aircraft rules and limits Titanic Overwatch',()=>{
 const names=['Manta','AX-1-0 Tiger Shark','Tiger Shark','Razorshark Strike Fighter','Sun Shark Bomber','Ta’unar Supremacy Armour','Stormsurge'];
 const a=army(names),rows=tauProfileReminders(a),aircraft=rows.find(r=>r.title==='Aircraft · compulsory reserves')!;
 expect(aircraft.units?.sort()).toEqual(names.slice(0,5).map(id).sort());expect(profile(a,'Hover')[0].summary).toContain('without the usual 2″ reduction');
 for(const unit of ['Manta','Ta’unar Supremacy Armour','Stormsurge'])expect(profile(a,'Ranged weapon profiles').some(r=>r.window==='Movement'&&r.units?.includes(id(unit)))).toBe(false);
 expect(get(a,'Air Caste Colossus')).toHaveLength(5);expect(get(a,'Air Caste Colossus')[0].summary).toContain('three times');
 const walker=get(a,'Super-heavy Walker')[0].summary;expect(walker).toContain('Mobile');expect(walker).toContain('on 1');
});
it('prints complete physical weapon profiles and all incoming native save and Stealth windows',()=>{
 const a=army(['The Twin Lance','Ghostkeel Battlesuit','Kroot Carnivores','Commander In Enforcer Battlesuit']);
 const normal=profile(a,'Ranged weapon profiles').find(r=>r.window==='Shooting'&&r.units?.includes(id('The Twin Lance')))!;
 expect(normal.summary).toContain('2 × Twin pulse blaster');expect(normal.summary).toContain('1 × Fusion eliminator');expect(normal.summary).toContain('BS ');expect(normal.summary).toContain('A ');
 const snap=profile(a,'Ranged weapon profiles').find(r=>r.window==='Movement'&&r.units?.includes(id('The Twin Lance')))!;expect(snap.summary).not.toContain('BS ');
 expect(profile(a,'Invulnerable save').filter(r=>r.units?.includes(id('The Twin Lance')))).toHaveLength(5);expect(profile(a,'Invulnerable save').some(r=>r.units?.includes(id('Commander In Enforcer Battlesuit')))).toBe(false);
 expect(profile(a,'Stealth').filter(r=>r.units?.includes(id('Ghostkeel Battlesuit')))).toHaveLength(4);expect(profile(a,'Lone Operative')).toHaveLength(4);
 const rows=tauProfileReminders(a);expect(new Set(rows.map(r=>r.id)).size).toBe(rows.length);expect(tauIntrinsicReminders({...a,faction:'Necrons'})).toEqual([]);
 expect(tauFormationScoutRange(a,tauFormations(a).find(g=>g.root.id===id('The Twin Lance'))!.members)).toBe(8);
});
