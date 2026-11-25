import {expect,it} from 'vitest';
import {addSelectionUnit,newSelection,type ArmySelection} from '../src/catalog';
import {individualArmy,setInstanceAttachment} from '../src/roster-instances';
import {setKnightGear} from '../src/knight-loadouts';
import {votannEnhancementReminders} from '../src/votann-enhancements';
import {selectUpgrade2026} from '../src/upgrades-2026';
import {generate11thReminders} from '../src/reminders-11th';

const iron='Brôkhyr Iron-master',mem='Memnyr Strategist',kahl='Kâhl',warriors='Hearthkyn Warriors';
const id=(unit:string)=>unit+'#1';
const force=(units:string[],detachment:string):ArmySelection=>individualArmy(units.reduce((a,u)=>addSelectionUnit(a,u),{...newSelection('Leagues of Votann'),detachments2026:[detachment]} as ArmySelection));
const enhance=(a:ArmySelection,u:string,name:string)=>selectUpgrade2026(a,id(u),name);
type Example=[string,string,string,string,string,RegExp,string[]?,string?];
const checks:Example[]=[
 ['Hearthfyre Arsenal','Fârstrydr Node',iron,'Pre-battle','either',/Every model.*Deep Strike/],
 ['Hearthband','Bastion Shield',kahl,'Movement','either',/within 12″.*AP by 1.*18″/],
 ['Mercenary Oathband','Mercenary Prospector',kahl,'Fight','either',/2 Yield Points.*destroys an enemy/],
 ['Needgaârd Oathband','Oathbound Speculator',kahl,'Fight','either',/Wound rolls of 1.*3 YP.*add 1/],
 ['Dêlve Assault Shift','Dêlvewerke Navigator',kahl,'Movement','own',/Move Units step.*including zero.*one destroyed non-Character.*per 2 YP/,['Cthonian Beserks']],
 ['Brandfast Oathband','Tactical Alchemy',kahl,'Command','own',/controlled objective outside.*1 YP.*4\+.*1CP/],
 ['Persecution Prospect','Eye for Weakness',kahl,'Shooting','own',/1 to.*Wound rolls.*assailed/],
 ['Armoured Trailblazers','Saturation Rounds','Sagitaur','Movement','either',/ignore the Benefit of Cover/],
 ['Farseekers','Pan-Spectral Lockons','Hernkyn Pioneers','Shooting','own',/visible enemy unit within 12″.*spotted.*detection range increases by 3″/],
 ['Hearthguard Covenant','High Kâhl',kahl,'Fight','either',/destroyed before.*4\+.*after this formation has fought or at phase end/],
 ['Mercenary Oathband','Metaphysical Brokerage',mem,'End of your turn','own',/battlefield.*fewer than 3 YP.*gains to 3/],
 ['Brandfast Oathband','Trivärg Cyber Implant',kahl,'Shooting','own',/Sustained Hits 2.*disembarked.*2 YP/],
 ['Dêlve Assault Shift','Multiwave System Jammer',kahl,'Movement','own',/Once per battle.*Cthonian formation in reserves.*round as one higher/,['Cthonian Earthshakers']],
 ['Hearthfyre Arsenal','Calculated Tenacity',iron,'End of opponent turn','opponent',/leading.*1 to each model’s Objective Control/,[warriors],warriors],
 ['Hearthband','Quake Multigenerator',kahl,'Shooting','own',/non-Titanic.*bearer hit.*−1 to Hit/],
 ['Armoured Trailblazers','Optimised Attack Lines','Sagitaur','Charge','own',/horizontal movement through dense terrain/],
 ['Persecution Prospect','Writ of Acquisition',kahl,'Shooting','own',/1 YP for each different assailed.*up to 3/],
 ['Farseekers','Shroudwërke Talismans','Hernkyn Yaegirs','Shooting','opponent',/detection range by 3″.*within 12″/],
 ['Hearthguard Covenant','Ironskein',kahl,'Pre-battle','either',/2 to the bearer’s Wounds/],
 ['Needgaârd Oathband','Dead Reckoning',kahl,'End of opponent turn','opponent',/battlefield.*no YP this turn.*gain 1 YP/],
 ['Hearthband','Ironskein',iron,'Fight','either',/Other models.*their own Wounds/],
 ['Needgaârd Oathband','Iron Ambassador',kahl,'Movement','either',/Once per battle.*3 YP.*Damage.*combi-bolter/],
 ['Persecution Prospect','Surgical Saboteur',kahl,'Shooting','own',/Monster or Vehicle hit.*next Shooting phase.*2″ from its Move.*2 from its Charge/],
 ['Dêlve Assault Shift','Quake Supervisor',kahl,'Shooting','either',/3″.*Lone Operative.*1 to Hit.*visible/,['Cthonian Earthshakers']],
 ['Hearthfyre Arsenal','Mantle of Elders',mem,'Shooting','own',/Optimal Application.*2\+.*1 YP/,['Ironkin Steeljacks with Melee Weapons'],'Ironkin Steeljacks with Melee Weapons'],
 ['Brandfast Oathband','Precursive Judgement',kahl,'Movement','opponent',/wholly within 6″.*0CP.*within 24″.*5\+/,['Sagitaur']],
 ['Mercenary Oathband','Etacarn SB9 Targeting Implant',kahl,'Movement','either',/3 YP.*Sustained Hits 1.*Snap shots cannot re-roll/],
 ['Hearthfyre Arsenal','Graviton Vault',iron,'Fight','either',/Graviton hammer.*Monster or Vehicle.*−1 to Hit/],
 ['Mercenary Oathband','Asset Manipulator',kahl,'Command','either',/start of either Command phase.*3 YP.*3″.*−1 Objective Control/],
 ['Persecution Prospect','Nomad Strategist',kahl,'Fight','opponent',/Once per battle.*4 YP.*per.*2 YP|Once per battle.*for each 2 YP/,['Hernkyn Yaegirs']],
 ['Needgaârd Oathband','Ancestral Crest',kahl,'Charge','either',/Once per turn.*1 YP.*1CP/],
 ['Brandfast Oathband','Signature Restoration',iron,'Movement','own',/within 3″.*D3\+1.*4 if the Ironkin Assistant.*once per turn/,['Hekaton Land Fortress']],
 ['Dêlve Assault Shift','Piledriver',iron,'Fight','either',/2 YP.*Graviton hammer.*Other models/],
 ['Hearthband','High Kâhl',kahl,'Fight','either',/melee attack.*has not fought.*4\+.*attacking unit finishes/],
];
it.each(checks)('%s resolves %s on its actual bearer and timing', (det,name,bearer,window,turn,effect,others=[],body)=>{
 let a=force([bearer,...others],det);
 if(body)a=setInstanceAttachment(a,id(bearer),id(body));
 a=enhance(a,bearer,name);
 const output=generate11thReminders(a).filter(r=>r.id.startsWith('11e-votann-enh-'));
 expect(output.find(r=>r.window===window&&r.turn===turn)?.summary).toMatch(effect);
 expect(new Set(output.map(r=>r.id)).size).toBe(output.length);
 expect(votannEnhancementReminders({...a,detachments2026:[]})).toEqual([]);
});

it('gates the bolter, potential repair and resurrection targets, legal leadership and Mantle spending',()=>{
 const bolter=enhance(force([kahl],'Needgaârd Oathband'),kahl,'Iron Ambassador');
 expect(()=>setKnightGear(bolter,id(kahl),'Firearm','Volkanite disintegrator')).toThrow('Remove Iron Ambassador');
 const swapped=setKnightGear({...bolter,upgrades2026:{}},id(kahl),'Firearm','Volkanite disintegrator');
 // Retained older saved data cannot reactivate a bolter-only ability on another weapon.
 expect(votannEnhancementReminders({...swapped,upgrades2026:bolter.upgrades2026})).toEqual([]);
 for(const [det,rule,unit] of [['Dêlve Assault Shift','Dêlvewerke Navigator',kahl],['Hearthfyre Arsenal','Calculated Tenacity',iron],['Hearthfyre Arsenal','Mantle of Elders',mem],['Brandfast Oathband','Signature Restoration',iron],['Brandfast Oathband','Precursive Judgement',kahl],['Persecution Prospect','Nomad Strategist',kahl]]){
  expect(votannEnhancementReminders(enhance(force([unit],det),unit,rule))).toEqual([]);
 }
});
it('scopes model, unit and external targets independently and separates both High Kâhl texts',()=>{
 let a=force([kahl,warriors,'Sagitaur'],'Persecution Prospect');
 a=setInstanceAttachment(a,id(kahl),id(warriors));
 const group=votannEnhancementReminders(enhance(a,kahl,'Eye for Weakness'));
 expect(group[0].units).toEqual([id(warriors)]);
 expect(group[0].summary).toContain('bearer’s half');
 const other=force([iron,'Brôkhyr Thunderkyn'],'Hearthfyre Arsenal');
 const shot=votannEnhancementReminders(enhance(setInstanceAttachment(other,id(iron),id('Brôkhyr Thunderkyn')),iron,'Graviton Vault')).find(r=>r.window==='Shooting');
 expect(shot?.units).toEqual([id(iron)]);
 expect(shot?.summary).toContain('Graviton rifle');
 expect(shot?.summary).not.toMatch(/E-COG|Las-beam|Thunderkyn/);
 const cov=votannEnhancementReminders(enhance(force([kahl],'Hearthguard Covenant'),kahl,'High Kâhl'))[0];
 const band=votannEnhancementReminders(enhance(force([kahl],'Hearthband'),kahl,'High Kâhl'))[0];
 expect(cov.id).not.toBe(band.id);
 expect(cov.summary).not.toContain('melee attack');expect(band.summary).toContain('melee attack');
});
