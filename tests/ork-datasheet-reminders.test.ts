// @vitest-environment node
import {describe,expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import type {RosterInstance} from '../src/roster-instances';
import {generate11thReminders} from '../src/reminders-11th';
import {ORK_SHEETS} from '../src/ork-data';
import {orkDatasheetReminders} from '../src/ork-datasheets';
import {KNIGHT_CARD_STATS} from '../src/ork-card-data.generated';
import {orkLoadout} from '../src/ork-loadouts';
import {knightWeaponCount} from '../src/knight-loadouts';
import {rosterCost2026} from '../src/datasheets-2026';

const squad=(unit:string,extra:Partial<RosterInstance>={}):RosterInstance=>({unit,id:unit+'#1',...extra});
const army=(...instances:RosterInstance[]):ArmySelection=>({...newSelection('Orks'),instances});
const rules=(...squads:RosterInstance[])=>orkDatasheetReminders(army(...squads),squads);
const named=(rows:ReturnType<typeof rules>,title:string)=>rows.filter(r=>r.title.endsWith(' · '+title));

it('targets bearer-only charges and specialist ammo separately from the Boyz and their joined support',()=>{
 const boss=squad('Warboss',{attachedTo:'Boyz#1'}),pain=squad('Painboy',{attachedTo:'Boyz#1'});
 const rows=rules(boss,pain,squad('Boyz'));
 for(const title of ['Boss’ Ammo Runt','Might Is Right'])for(const row of named(rows,title))expect(row.units).toEqual([boss.id]);
 expect(named(rows,'Boss’ Ammo Runt')[0]).toMatchObject({turn:'own',window:'Shooting',units:[boss.id]});
 expect(named(rows,'Might Is Right').map(r=>r.window)).toEqual(['Charge','Fight']);
 expect(named(rows,'Crude Surgery')[0]).toMatchObject({window:'Command',units:['Boyz#1'],summary:expect.stringMatching(/heals 3 wounds/)});
 expect(named(rows,'Ammo Runts')[0].units).toEqual(['Boyz#1']);
 expect(named(rows,'Tide of Muscle')[1].summary).toContain('After this formation charges');
});
it('shares once-per-army motivation across distinct givers and limits speed and beast targets',()=>{
 const rows=rules(squad('Warboss'),squad('Warboss In Mega Armour'),squad('Nazdreg'),squad('Beastboss'),squad('Beastboss on Squigosaur'),squad('Deffkilla Wartrike'),squad('Warbikers'),squad('Boyz'));
 const motivation=named(rows,'Intimidating Motivation');
 expect(motivation).toHaveLength(1);
 expect(motivation[0].summary).toMatch(/Once per battle round.*Warboss#1.*Warboss In Mega Armour#1.*Nazdreg#1/);
 expect(named(rows,'Keep Huntin’!').map(r=>r.units)).toEqual([['Beastboss#1','Beastboss on Squigosaur#1']]);
 expect(named(rows,'Get Back in da Race!')[0].units).toEqual(['Deffkilla Wartrike#1','Warbikers#1']);
 expect(named(rows,'Get Back in da Race!')[0].summary).toContain('embarked');
 expect(named(rows,'Thundering Stampede (Aura)')[0].units).not.toContain('Boyz#1');
});
it('gates healing and Lone Operative on actual eligible units and excludes Titanic models from Fire Overwatch',()=>{
 const rows=rules(squad('Mek'),squad('Stompa'),squad('Dakkajet'),squad('Deff Dread'),squad('Ghazghkull Thraka'),squad('Gretchin'));
 expect(named(rows,'Clever Know-wotz')[0]).toMatchObject({units:['Deff Dread#1'],summary:expect.stringContaining('start of your next Movement phase')});
 expect(named(rows,'Da Grand Warlord’s Ladz')[0].summary).toContain('Gretchin#1');
 expect(named(rules(squad('Ghazghkull Thraka'),squad('Dakkajet')),'Da Grand Warlord’s Ladz')).toHaveLength(0);
 expect(named(rows,'Ranged weapon profiles').some(r=>r.turn==='opponent'&&r.units.includes('Stompa#1'))).toBe(false);
 expect(named(rows,'Makari, Hoist Dat Banner!')[0].summary).toMatch(/Once per battle.*current battle round/);
});
it('evaluates mandatory Supports, shiv bearers and Mounted move bonuses through legal formation links',()=>{
 const grots=squad('Gretchin'),zod=squad('Zodgrod Wortsnagga',{attachedTo:grots.id}),herd=squad('Runtherd',{attachedTo:grots.id});
 const rows=rules(grots,zod,herd,squad('Boyz'));
 expect(named(rows,'Super Runts · shivs')).toMatchObject([{units:[grots.id],summary:expect.stringContaining('gain 1 Attack')}]);
 expect(named(rows,'That’ll Learn Ya').every(r=>r.units.join()===grots.id&&r.summary.includes('four surviving Gretchin'))).toBe(true);
 expect(named(rules(squad('Runtherd'),squad('Boyz')),'That’ll Learn Ya')).toHaveLength(0);
 const hogs=squad('Squighog Boyz'),doc=squad('Painboss',{attachedTo:hogs.id});
 const mounted=rules(hogs,doc,squad('Boyz'));
 expect(named(mounted,'Runnin’ wiv da Herd')).toMatchObject([{units:[doc.id],window:'Movement',summary:expect.stringContaining('4″ Move')}]);
 expect(named(mounted,'Push Dat Bit Back In')[0].units).toEqual([hogs.id]);
 expect(named(mounted,'Hardy Bioniks')[0].units).toEqual([hogs.id]);
 expect(named(rules(squad('Painboss'),squad('Beast Snagga Boyz')),'Runnin’ wiv da Herd')).toHaveLength(0);
});
it('suppresses equipment-dependent bonuses when absent and applies them only to the right models or unit',()=>{
 const nob=squad('Nobz',{models:6,knightGear:{'Nob 2 · Weapons':'Kustom Krumpa + Paired Krumpas'}});
 expect(named(rules(nob),'Paired Krumpas')[0]).toMatchObject({units:[nob.id],summary:expect.stringMatching(/^1 Nob model.*Only their Kustom Krumpa/)});
 expect(named(rules(squad('Nobz')),'Paired Krumpas')).toHaveLength(0);
 const tank=squad('Tankbustas',{knightGear:{'Tankbusta 2 · Special equipment':'Pulsa Rokkit'}});
 expect(named(rules(tank),'Pulsa Rokkit')[0]).toMatchObject({turn:'own',window:'Shooting',summary:expect.stringMatching(/Once per battle.*within 24″.*Lethal Hits/)});
 expect(named(rules(squad('Tankbustas')),'Pulsa Rokkit')).toHaveLength(0);
 const mek=squad('Big Mek In Mega Armour',{attachedTo:'Meganobz#1',knightGear:{'Mek equipment':'Kustom Force Field'}});
 const rows=rules(mek,squad('Meganobz'));
 expect(named(rows,'Kustom Force Field').map(r=>[r.turn,r.window,r.units])).toEqual([['opponent','Shooting',['Meganobz#1']],['own','Movement',['Meganobz#1']]]);
 expect(named(rows,'Kustom Force Field').some(r=>r.window==='Fight')).toBe(false);
});
it('shows actual passenger weapons and disembark triggers, preserving the unarmed Squiggoth',()=>{
 const beast=squad('Gargantuan Squiggoth');
 expect(named(rules(beast),'Walking Bastion').map(r=>r.window)).toEqual(['Fight']);
 const gun=squad('Gargantuan Squiggoth',{knightGear:{Gun:'Kannon'}});
 expect(named(rules(gun),'Walking Bastion').map(r=>r.window)).toEqual(['Shooting','Fight']);
 const rows=rules(beast,squad('Boyz'),squad('Trukk'),squad('Morkanaut'),squad('Warbikers'));
 expect(named(rows,'Walking Bastion').map(r=>r.window)).toEqual(['Shooting','Fight']);
 const deck=named(rows,'Firing Deck 11').find(r=>r.title.startsWith(beast.id))!;
 expect(deck.units).toEqual([beast.id,'Boyz#1']);
 expect(deck.summary).toMatch(/up to 11 embarked models.*Shoota/);
 expect(named(rows,'Pilin’ Out')).toMatchObject([{turn:'opponent',window:'Movement',units:['Boyz#1'],summary:expect.stringMatching(/within 8″.*wholly within 3″/)}]);
 expect(named(rows,'Gut Hatch')).toMatchObject([{turn:'own',window:'Movement',units:['Boyz#1'],summary:expect.stringContaining('remain eligible to charge')}]);
 expect(named(rules(squad('Hunta Rig'),squad('Boyz')),'Fully Loaded Butchery')).toHaveLength(0);
 expect(named(rules(squad('Hunta Rig'),squad('Beast Snagga Boyz')),'Fully Loaded Butchery')[0].summary).toContain('maximum bonus of 22');
});
it('puts hidden/riled/ingress effects and invulnerable saves in the correct player’s phase',()=>{
 const rows=rules(squad('Boss Snikrot',{attachedTo:'Kommandos#1'}),squad('Kommandos'),squad('Nazdreg'),squad('Meganobz'),squad('Meganobz',{id:'Meganobz#2'}));
 expect(named(rows,'Deff from the Shadows')).toMatchObject([{turn:'opponent',timing:'end',window:'Movement',units:['Kommandos#1']}]);
 expect(named(rows,'Kunnin’ Infiltrator')).toMatchObject([{turn:'opponent',timing:'end',window:'Fight',summary:expect.stringMatching(/every model.*hidden and unengaged/)}]);
 expect(named(rows,'Infiltrators').filter(r=>r.units.includes('Kommandos#1'))).toHaveLength(1);
 expect(named(rows,'Lone Operative').some(r=>r.units.includes('Kommandos#1'))).toBe(false);
 expect(named(rows,'Supreme Kunnin’')[0].summary).toMatch(/Once per phase.*8″.*D6″.*5″ if riled up/);
 expect(rows.filter(r=>r.id==='11e-orks-meganobz-krumpin')).toMatchObject([{units:['Meganobz#1','Meganobz#2'],window:'Fight',summary:expect.stringMatching(/riled up.*add 1 to Hit/)}]);
 expect(named(rows,'Taktikal Know-wotz')[0].summary).toMatch(/two starting units of five.*Bomb Squig.*Found ’Em/);
});
it('gates monster/infantry weapon abilities and snap shooting critical hits independently',()=>{
 const rows=rules(squad('Zodgrod Wortsnagga'),squad('Warbuggies',{knightGear:{'Main gun':'Rivet Kannon'}}),squad('Beastboss'));
 const ranged=named(rows,'Ranged weapon profiles'),melee=named(rows,'Melee weapon profiles');
 expect(ranged.find(r=>r.units.includes('Zodgrod Wortsnagga#1')&&r.turn==='opponent')!.summary).toContain('against a Monster or Vehicle only');
 const shoot=ranged.find(r=>r.units.includes('Warbuggies#1')&&r.turn==='own')!.summary;
 expect(shoot).toContain('against targets with neither Monster nor Vehicle');
 expect(shoot).toContain('against Infantry only');
 const snap=ranged.find(r=>r.units.includes('Warbuggies#1')&&r.turn==='opponent')!.summary;
 expect(snap).not.toContain('Lethal Hits');
 expect(snap).not.toContain('Sustained Hits');
 expect(melee.find(r=>r.units.includes('Beastboss#1'))!.summary).toContain('against a Monster or Vehicle, each critical hit scores two extra hits');
});
it('uses the phase generator for the full legal 1,000-point roster with joined leaders, paid weapons and its passengers',()=>{
 const boyz=squad('Boyz');
 const a=army(squad('Warboss',{attachedTo:boyz.id}),squad('Painboy',{attachedTo:boyz.id}),boyz,squad('Trukk'),squad('Meganobz',{models:3,knightGear:{'Meganob 1 · Weapons':'Twin Killsaws'}}),squad('Gunwagon',{knightGear:{Turret:'Zzap Gun'}}),squad('Gorkanaut'),squad('Nobz'));
 a.warlordId='Warboss#1';a.battleSize2026='Incursion';a.detachments2026=['Green Tide','Blitz Brigade'];
 expect(rosterCost2026(a).total).toBe(1000);
 const rows=generate11thReminders(a);
 expect(rows.filter(r=>r.id==='11e-orks-meganobz-krumpin')).toHaveLength(1);
 expect(named(rows,'Crude Surgery')[0].units).toEqual([boyz.id]);
 expect(named(rows,'Pilin’ Out')[0].units).toContain(boyz.id);
 expect(named(rows,'Ranged weapon profiles').find(r=>r.turn==='own'&&r.units.includes('Gunwagon#1'))!.summary).toContain('Zzap Gun');
 expect(named(rows,'Gut Hatch')[0].units).not.toContain('Gorkanaut#1');
});

describe('equipped Ork weapon reminders by published datasheet',()=>{
 for(const sheet of ORK_SHEETS)it(sheet.unit+' emits its actual selected profiles at legal starting strength',()=>{
  const stats=KNIGHT_CARD_STATS[sheet.unit];
  const n=sheet.sizes[0],base=squad(sheet.unit,{models:n}),kit=orkLoadout(sheet.unit,n)!;
  const seen=new Set<string>(),choices=[base];
  for(const slot of kit.slots)for(const option of slot.choices)choices.push({...base,knightGear:{[slot.name]:option.name}});
  const signatures=new Set<string>();
  for(const selected of choices){
   const counts=stats.weapons.map(w=>knightWeaponCount(selected,w.name));
   const signature=counts.join(',');
   if(signatures.has(signature))continue;
   signatures.add(signature);
   const rows=rules(selected);
   for(const [i,w] of stats.weapons.entries()){
    if(!w.mode&&!w.abilities.length)continue;
    const weaponRow=rows.find(r=>r.turn!=='opponent'&&r.title.endsWith(w.phase==='Fight'?' · Melee weapon profiles':' · Ranged weapon profiles'));
    const pattern=counts[i]+' × '+w.name+(w.mode?' (choose one profile per weapon)':' —');
    if(counts[i]){expect(weaponRow?.summary,w.name).toContain(pattern);seen.add(w.name);}
    else expect(weaponRow?.summary??'',w.name).not.toMatch(new RegExp(' × '+w.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+' (?=[—(])'));
   }
  }
  expect([...seen].sort()).toEqual([...new Set(stats.weapons.filter(w=>w.mode||w.abilities.length).map(w=>w.name))].sort());
 });
});
