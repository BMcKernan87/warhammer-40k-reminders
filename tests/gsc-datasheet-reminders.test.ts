// @vitest-environment node
import {describe,expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import type {RosterInstance} from '../src/roster-instances';
import {generate11thReminders} from '../src/reminders-11th';
import {gscDatasheetReminders} from '../src/gsc-datasheets';
import {gscCargoFormations} from '../src/gsc-transports';
import {GSC_SHEETS} from '../src/gsc-data';
import {KNIGHT_CARD_STATS as cards} from '../src/gsc-card-data.generated';
import {gscLoadout} from '../src/gsc-loadouts';
import {knightWeaponCount} from '../src/knight-loadouts';
import {rosterCost2026} from '../src/datasheets-2026';

const model=(unit:string,extra:Partial<RosterInstance>={}):RosterInstance=>({unit,id:unit+'#1',...extra});
const army=(...instances:RosterInstance[]):ArmySelection=>({...newSelection('Genestealer Cults'),instances,battleSize2026:'Incursion'});
const sheet=(a:ArmySelection)=>gscDatasheetReminders(a,a.instances!);
const named=(rows:ReturnType<typeof sheet>,ability:string)=>rows.filter(r=>r.title.endsWith(' · '+ability));
const neos='Neophyte Hybrids',metas='Hybrid Metamorphs',pistols='Acolyte Hybrids With Autopistols',flamers='Acolyte Hybrids With Hand Flamers';

it('keeps the Locus bodyguard save on the other attached Character while both leaders actually benefit the formation',()=>{
 const troop=model(neos),prim=model('Primus',{attachedTo:troop.id}),locus=model('Locus',{attachedTo:troop.id});
 const joined=sheet(army(troop,locus,prim));
 expect(named(joined,'Bodyguard')[0]).toMatchObject({units:[prim.id],summary:expect.stringContaining('4+')});
 expect(named(joined,'Sudden Assault')).toMatchObject([{units:[troop.id],window:'Fight',timing:'start'}]);
 expect(named(joined,'Cult Demagogue').map(r=>r.units)).toEqual([[troop.id],[troop.id]]);
 expect(named(sheet(army(troop,model('Primus'))),'Cult Demagogue')).toHaveLength(0);
 expect(named(sheet(army(troop,locus)),'Bodyguard')).toHaveLength(0);
 expect(named(sheet(army(troop,model('Locus',{attachedTo:'missing'}),prim)),'Sudden Assault')).toHaveLength(0);
});
it('separates per-model resurrection, biological warfare and defensive effects from attached bodyguards',()=>{
 const abs=model('Aberrants'),boss=model('Abominant',{attachedTo:abs.id}),doc=model('Biophagus',{attachedTo:abs.id});
 const rows=sheet(army(abs,boss,doc));
 expect(named(rows,'The Chosen One')).toMatchObject([{window:'Fight',summary:expect.stringMatching(/destroyed by a melee attack.*before it has fought.*4\+/),units:[abs.id]}]);
 expect(named(rows,'Regenerating Gene-mass').every(r=>r.units.join()===boss.id&&r.timing==='end')).toBe(true);
 expect(named(rows,'Twisted Science')[0].units).toEqual([abs.id]);
 expect(named(rows,'Biological Warfare')[0].units).toEqual([doc.id]);
 expect(named(rows,'Alchemicus Familiar')[0].summary).toContain('against Infantry');
 expect(named(rows,'Hulking Bodyguards').map(r=>r.window)).toEqual(['Shooting','Movement','Fight']);
 expect(named(sheet(army(abs)),'Hulking Bodyguards')).toHaveLength(0);
});
it('uses the distinct resurrection values for the actual icon bearer and keeps One Shot spent',()=>{
 const neo=model(neos,{knightGear:{'Neophyte 1 equipment':'Hybrid firearm + Cult Icon'}});
 const group=model(flamers,{knightGear:{'Acolyte 1 firearm':'Cult Icon','Acolyte 2 firearm':'Demolition charges'}});
 const rows=sheet(army(neo,group,model(pistols)));
 const icons=named(rows,'Cult Icon');
 expect(icons).toHaveLength(2);
 expect(icons.find(r=>r.units.includes(neo.id))!.summary).toMatch(/up to 3 destroyed.*up to D3\+3/);
 expect(icons.find(r=>r.units.includes(group.id))!.summary).toMatch(/up to D3 destroyed.*up to 3.*Characters.*One Shot.*expended/);
 expect(named(rows,'Industrialised Destruction').map(r=>[r.window,r.turn])).toEqual([['Shooting','own'],['Movement','opponent'],['Fight','either']]);
});
it('resolves Iconward feel-no-pain, scouts, Metamorph casualties and ambush marker preservation',()=>{
 const body=model(metas),bearer=model('Acolyte Iconward',{attachedTo:body.id}),truck=model('Goliath Truck');
 const rows=sheet(army(body,bearer,truck));
 expect(named(rows,'Nexus of Devotion')[0]).toMatchObject({units:[body.id],summary:expect.stringContaining('4+')});
 expect(named(rows,'Brood Surge')[0]).toMatchObject({turn:'opponent',window:'Shooting',summary:expect.stringMatching(/killed at least one.*D6″.*unengaged.*closest enemy/)});
 expect(named(rows,'Scouts 6″').map(r=>r.units)).toEqual([[body.id]]);
 expect(named(rows,'Scouts · embarked passengers')[0].units).toEqual([truck.id,body.id]);
 expect(named(rows,'Summon the Cult')[0].summary).toMatch(/Once per battle across.*within 12″.*more than 8″.*impossible/);
 const other=model(neos);
 const changed=sheet(army(other,{...bearer,attachedTo:other.id},truck));
 expect(named(changed,'Nexus of Devotion')[0].summary).toContain('5+');
 expect(named(changed,'Scouts · embarked passengers')).toHaveLength(0);
});
it('groups army-limited activations once and tests the two different psychic familiar timings',()=>{
 const rows=sheet(army(model('Magus'),model('Magus',{id:'Magus#2'}),model('Patriarch'),model('Clamavus'),model('Clamavus',{id:'Clamavus#2'}),model(pistols),model(pistols,{id:pistols+'#2'})));
 expect(named(rows,'Mind Control (Psychic)')).toMatchObject([{turn:'opponent',window:'Shooting',timing:'start',summary:expect.stringMatching(/18″.*24″.*1.*D3.*2–5.*6.*Wound/)}]);
 expect(named(rows,'Cosmic Horror (Psychic)')).toMatchObject([{window:'Fight',turn:'either',timing:'start',summary:expect.stringMatching(/6″.*once per battle|6″.*Once per battle/)}]);
 expect(named(rows,'Spiritual Leader').filter(r=>r.window==='Charge')).toHaveLength(2);
 expect(named(rows,'Claimed for the Cult')).toHaveLength(1);
 expect(named(rows,'Voice of New Truths')).toHaveLength(1);
 expect(named(rows,'Might From Beyond')).toHaveLength(0);
});
it('links each Ridgerunner accessory to that bearer’s actual guns, then follows Crossfire into the same turn’s Fight',()=>{
 const engines=model('Achilles Ridgerunners',{models:2,knightGear:{'Ridgerunner 1 equipment':'Spotter','Ridgerunner 1 main gun':'Heavy mortar','Ridgerunner 2 equipment':'Survey Augur','Ridgerunner 2 main gun':'Achilles missile launcher'}});
 const rows=sheet(army(engines,model('Purestrain Genestealers'),model(neos)));
 const spot=named(rows,'Spotter')[0],aug=named(rows,'Survey Augur')[0];
 expect(spot.summary).toMatch(/BS 3\+.*Heavy mortar.*Twin heavy stubber/);
 expect(spot.summary).not.toContain('Achilles missile launcher');
 expect(aug.summary).toMatch(/model bearing a Survey Augur.*Achilles missile launcher.*Twin heavy stubber/);
 expect(aug.summary).not.toContain('Heavy mortar');
 expect(named(rows,'Flare Launcher')).toHaveLength(0);
 expect(named(sheet(army(model('Achilles Ridgerunners'))),'Flare Launcher')[0]).toMatchObject({window:'Shooting',turn:'opponent',timing:'start',summary:expect.stringContaining('0 CP')});
 expect(named(rows,'Crossfire')[0].units).not.toContain('Purestrain Genestealers#1');
 expect(named(rows,'Crossfire · marked enemy')[0]).toMatchObject({window:'Fight',turn:'own',units:expect.arrayContaining(['Purestrain Genestealers#1'])});
});
it('distinguishes Sanctus rifle and blade, normal reactive shooting, and shared once-per-turn Kelermorph targets',()=>{
 const knife=model('Sanctus'),rifle=model('Sanctus',{id:'Sanctus#2',knightGear:{'Assassin weapons':'Cult sniper rifle + Close combat weapon'}});
 const rows=sheet(army(knife,rifle,model('Kelermorph'),model('Kelermorph',{id:'Kelermorph#2'})));
 expect(named(rows,'Creeping Shadow')).toMatchObject([{units:[rifle.id],window:'Movement',turn:'opponent',summary:expect.stringMatching(/within 8″.*6″/)}]);
 expect(named(rows,'Psychic Spoor · prey').filter(r=>r.turn==='opponent')).toMatchObject([{units:[rifle.id],summary:expect.stringContaining('re-roll Wound rolls')}]);
 expect(named(rows,'Heroic Fusillade').filter(r=>r.window==='Movement')).toHaveLength(1);
 expect(named(rows,'Hypersensory Abilities')[0].summary).toMatch(/8″.*as in its Shooting phase.*D6″.*cannot embark/);
 expect(named(rows,'Cloaked Assassin')).toHaveLength(2);
});
it('keeps Cult Ambush restoration and available gun scores separate from redeploy and ingress',()=>{
 const rows=sheet(army(model('Nexos',{attachedTo:'Neophyte Hybrids#1'}),model(neos),model('Primus',{attachedTo:'Neophyte Hybrids#1'}),model('Atalan Jackals')));
 expect(named(rows,'Cult Infiltration')).toMatchObject([{window:'Command',turn:'either',timing:'start',summary:expect.stringMatching(/has not moved.*6″/)}]);
 expect(named(rows,'Battlefield Analysis')[0].units).toEqual(['Neophyte Hybrids#1']);
 expect(named(rows,'Decoys and Misdirection')).toMatchObject([{window:'Pre-battle',timing:'end',units:['Neophyte Hybrids#1','Atalan Jackals#1']}]);
 expect(named(rows,'Outrider Gangs')[0].summary).toMatch(/wholly within 9″.*touch a Cult Ambush marker/);
 expect(named(rows,'Demolition Run')[0].summary).toMatch(/within 6″.*excluding an attached Jackal Alphus.*maximum of six/);
});
it('resolves complete passenger formations and separates the Truck’s Fire Support from the Rockgrinder’s fall-back effect',()=>{
 const t=model('Goliath Truck'),r=model('Goliath Rockgrinder'),troop=model(neos),guard=model('Primus',{attachedTo:troop.id}),support=model('Nexos',{attachedTo:troop.id});
 const a=army(t,r,troop,guard,support,model('Purestrain Genestealers'),model('Atalan Jackals'));
 expect(gscCargoFormations(a,t).map(g=>[g.body.id,g.members.length])).toEqual([[troop.id,3],['Purestrain Genestealers#1',1]]);
 expect(gscCargoFormations(a,r).map(g=>g.body.id)).toEqual(['Purestrain Genestealers#1']);
 expect(gscCargoFormations(army(t,troop,{...guard,unit:'Patriarch'}),t)).toEqual([]);
 const rows=sheet(a);
 expect(named(rows,'Fire Support')).toMatchObject([{turn:'own',window:'Shooting',units:[troop.id],summary:expect.stringContaining('specific Truck')}]);
 expect(named(rows,'Firing Deck 6').find(x=>x.units.includes(t.id))?.summary).toMatch(/six embarked models.*excluding One Shot.*own rules/);
 expect(named(rows,'Grinding Line-breaker')[0].summary).toMatch(/non-Monster, non-Vehicle.*hazard roll per model.*Battle-shock/);
});
it('produces one live reminder per effect for a 1,000-point mixed Cult from its normal generator',()=>{
 const a=army(model('Patriarch',{attachedTo:'Purestrain Genestealers#1'}),model('Purestrain Genestealers'),model('Primus',{attachedTo:neos+'#1'}),model(neos),model('Abominant',{attachedTo:'Aberrants#1'}),model('Aberrants'),model('Acolyte Iconward',{attachedTo:metas+'#1'}),model(metas),model('Goliath Truck'),model('Achilles Ridgerunners'),model('Goliath Rockgrinder'),model(flamers));
 a.warlordId='Patriarch#1';a.detachments2026=['Biosanctic Broodsurge'];
 expect(rosterCost2026(a).total).toBe(1000);
 const rows=generate11thReminders(a);
 expect(rows.filter(r=>r.title==='Cult Ambush · Resurgence points')).toHaveLength(1);
 expect(named(rows,'Might From Beyond')).toMatchObject([{units:['Purestrain Genestealers#1']}]);
 expect(named(rows,'Nexus of Devotion')[0].summary).toContain('4+');
 expect(named(rows,'Crossfire').map(r=>r.units)).toEqual([expect.arrayContaining(['Goliath Rockgrinder#1','Neophyte Hybrids#1'])]);
 expect(named(rows,'Fire Support')[0].units).not.toContain('Aberrants#1');
});

describe('every native GSC datasheet generates only its actually fitted profiles',()=>{
 for(const s of GSC_SHEETS)it(s.unit,()=>{
  const base=model(s.unit,{models:s.sizes[0]}),kit=gscLoadout(s.unit,s.sizes[0])!,seen=new Set<string>(),profiles=cards[s.unit].weapons;
  const choices=[base,...kit.slots.flatMap(slot=>slot.choices.map(c=>({...base,knightGear:{[slot.name]:c.name}})))];
  const tested=new Set<string>();
  for(const candidate of choices){
   const signature=profiles.map(p=>knightWeaponCount(candidate,p.name)).join(',');
   if(tested.has(signature))continue;
   tested.add(signature);
   const rows=sheet(army(candidate));
   for(const profile of profiles){
    if(!profile.abilities.length&&!profile.mode)continue;
    const count=knightWeaponCount(candidate,profile.name);
    const row=named(rows,profile.phase==='Fight'?'Melee weapon profiles':'Ranged weapon profiles').find(r=>r.turn!=='opponent');
    const label=' × '+profile.name+(profile.mode?' (choose one profile per weapon)':' —');
    if(count){expect(row?.summary,profile.name).toContain(count+label);seen.add(profile.name);}
    else expect(row?.summary??'').not.toContain(label);
   }
  }
  expect([...seen].sort()).toEqual([...new Set(profiles.filter(w=>w.mode||w.abilities.length).map(w=>w.name))].sort());
 });
});
