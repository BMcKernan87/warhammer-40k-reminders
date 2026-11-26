import {describe,expect,it} from 'vitest';
import {newSelection} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
import type {RosterInstance} from '../src/roster-instances';
const s=(unit:string,id=unit):RosterInstance=>({id,unit});
const army=(...instances:RosterInstance[])=>({...newSelection('Chaos Knights'),instances});
const rules=(...instances:RosterInstance[])=>generate11thReminders(army(...instances)).filter(r=>r.id.startsWith('11e-daemon-card:'));
const named=(r:ReturnType<typeof rules>,title:string)=>r.filter(x=>x.title.endsWith(' · '+title));

describe('Tzeentch, Nurgle and undivided datasheet effects',()=>{
 const cases=[
  ['Kairos Fateweaver','One Head Looks Forward','Command','own','end','Leadership test'],
  ['Kairos Fateweaver','One Head Looks Back','Charge','either','during','increase its cost by 1 CP'],
  ['The Changeling','Formless Horror','Fight','either','during','cannot target this model'],
  ['The Changeling','Mischief and Confusion','Shooting','opponent','start','On a 6 it cannot shoot'],
  ['The Blue Scribes','P’tarix’s Sorcerous Syphon (Aura)','Shooting','opponent','during','Wound rolls for psychic attacks'],
  ['The Blue Scribes','Xirat’p’s Sorcerous Barrages (Psychic)','Movement','own','end','on 6 it suffers D6'],
  ['Lord of Change','Master of Magicks (Psychic)','Shooting','own','during','Bolt of Change one option'],
  ['Flamers','Bounding Leaps','Movement','own','during','shoot in a turn in which it Fell Back'],
  ['Exalted Flamer','Flames of Change (Psychic)','Shooting','own','during','On a 4+ subtract 2″'],
  ['Screamers','Slashing Dive','Movement','own','during','one die per model'],
  ['Burning Chariot','Eldritch Flames (Psychic)','Shooting','own','during','loses the Benefit of Cover'],
  ['Changecaster','Storm of Mutating Sorcery (Psychic)','Shooting','own','during','enemy Infantry'],
  ['Fateskimmer','Rider of the Immaterial Winds','End of opponent turn','opponent','end','unengaged'],
  ['Fluxmaster','Fluxmaster','Fight','either','during','melee attacks targeting it take −1'],
  ['Fluxmaster','Altered Reality (Psychic)','Movement','opponent','end','unmodified 6'],
  ['Great Unclean One','Nurgle’s Rot (Psychic)','Movement','own','end','−1 Toughness'],
  ['Plaguebearers','Infected Outbreak','Command','own','end','opponent’s Level of Control'],
  ['Nurglings','Mischief Makers','Fight','either','during','Titanic enemies are exempt'],
  ['Beasts Of Nurgle','Grotesque Regeneration','Charge','either','end','heals all its lost wounds'],
  ['Epidemius','Tally of Pestilence','Command','own','start','at least seven enemy models'],
  ['Rotigus','Deluge of Nurgle (Aura)','Movement','either','during','subtract 2 from Move and 1 from OC'],
  ['Horticulous Slimux','Beast Handler · Heroic Intervention','Charge','opponent','end','1 CP less'],
  ['Poxbringer','Feculent Despair (Aura, Psychic)','Command','either','during','subtracts 1'],
  ['Sloppity Bilepiper','Disease of Mirth (Aura)','Fight','either','start','other than Monsters and Vehicles'],
  ['Feculent Gnarlmaw','Diseased Cover','Shooting','either','during','blocks full visibility'],
  ['Feculent Gnarlmaw','Fortification','Movement','either','during','moving over enemy models'],
  ['Daemon Prince of Chaos','Unholy Vigour','Shooting','either','start','3+ invulnerable save'],
  ['Daemon Prince Of Chaos With Wings','Malefic Destruction','Fight','either','start','gain 3 Attacks'],
  ['Daemon Prince Of Chaos With Wings','Harbinger of Death','Fight','either','during','Sustained Hits 1'],
  ['Soul Grinder','Scuttling Walker','Movement','own','during','terrain features up to 4″'],
  ['Be’lakor','Shadow Form Abilities','Start of battle round','either','start','Only the selected form'],
 ];
 it.each(cases)('%s resolves %s in the actual turn, phase and timing',(unit,title,window,turn,timing,summary)=>{
   const cue=named(rules(s(unit)),title).find(r=>r.window===window&&r.turn===turn);
   expect(cue?.timing).toBe(timing);
   expect(cue?.summary).toContain(summary);
 });
 const joined=[
  ['Exalted Flamer','Flamers','Blazing Warpfire (Psychic)','Assault'],
  ['Fateskimmer','Screamers','Fateskimmer','Lethal Hits'],
  ['Changecaster','Pink Horrors','Changecaster','Sustained Hits 1'],
  ['Epidemius','Plaguebearers','Blessed by the Plague God','4+ invulnerable save'],
  ['Horticulous Slimux','Beasts Of Nurgle','Beast Handler','re-roll Charge rolls'],
  ['Poxbringer','Plaguebearers','Poxbringer','5+ is critical'],
  ['Sloppity Bilepiper','Plaguebearers','Jolly Gutpipes','re-roll its Advance rolls'],
  ['Spoilpox Scrivener','Plaguebearers','Keep Counting!','Sustained Hits 1'],
  ['Spoilpox Scrivener','Plaguebearers','Meet Your Quota!','+1 OC'],
 ];
 it.each(joined)('%s grants %s its leading-only %s effect',(unit,body,title,summary)=>{
   expect(named(rules(s(unit),s(body)),title)).toEqual([]);
   const r=named(rules({...s(unit,'leader'),attachedTo:'squad'},s(body,'squad'),s('War Dog Brigand','dog')),title);
   expect(r.length).toBeGreaterThan(0);
   expect(r.every(x=>x.units?.join()==='squad'&&x.summary.includes(summary))).toBe(true);
   expect(named(rules({...s(unit,'leader'),attachedTo:'wrong'},s('Bloodletters','wrong')),title)).toEqual([]);
 });
 it('respects the selected allegiance and the actual weapons of recipients, including Soul Grinders and both Princes',()=>{
   const n={...s('Soul Grinder','n'),knightGear:{'Daemonic allegiance':'Nurgle'}},t={...s('Daemon Prince Of Chaos With Wings','t'),knightGear:{'Daemonic allegiance':'Tzeentch'}},k=s('War Dog Stalker','k');
   const r=rules(n,t,k,s('Lord of Change','l'),s('Rotigus','r'),s('Plague Drones','d'),s('Great Unclean One','g'));
   expect(named(r,'Daemon Lord of Tzeentch (Aura)')[0].units).toEqual(['t','l']);
   expect(named(r,'Virulent Blessing (Psychic)')[0].units).toEqual(['n','r','d','g']);
   expect(named(r,'Death’s Heads').find(x=>x.window==='Fight')?.turn).toBe('own');
   expect(named(r,'Daemon Lord of Nurgle (Aura)')[0].units).toEqual(['n','r','d','g']);
   expect(named(r,'Daemon Prince of Tzeentch').find(x=>x.window==='Movement')?.summary).toContain('3 to the Attacks');
   expect(named(r,'Daemon Prince of Khorne')).toEqual([]);
   expect(named(r,'Daemonic Allegiance')[0].summary).toContain('phlegm bombardment');
   expect(named(r,'Ranged weapon profiles').find(x=>x.title.startsWith('n ·')&&x.window==='Shooting')?.summary).not.toContain('scream of despair');
 });
 it('gates Reverberating Summons on the bell and a restorable allied Plaguebearer',()=>{
   const guo=s('Great Unclean One'),p=s('Plaguebearers','pb'),bell={...guo,knightGear:{'Bilesword arm':'Doomsday bell'}};
   expect(named(rules(guo,p),'Reverberating Summons')).toEqual([]);
   expect(named(rules(bell),'Reverberating Summons')).toEqual([]);
   expect(named(rules(bell,p),'Reverberating Summons')[0]).toMatchObject({window:'Fight',units:['pb']});
 });
 it('differentiates attack/Hazardous-only Split, non-returnable Pinks, Brimstone-only explosions and starting profiles',()=>{
   const pink=rules(s('Pink Horrors')),blue=rules(s('Blue Horrors'));
   expect(named(pink,'Split')[0].summary).toMatch(/dead Pink adds two Blue.*dead Blue adds one Brimstone.*Hazardous.*non-attack damage cannot/);
   expect(named(pink,'Switch to Blue Horrors')[0].summary).toMatch(/original starting strength.*return no Pinks/);
   expect(named(pink,'Exploding Horrors')[0].summary).toContain('Only after the last Pink Horror is gone');
   expect(named(blue,'Exploding Horrors')[0].summary).not.toContain('Pink');
   expect(named(pink,'Split models · weapons')[0].summary).toContain('Pistol and Psychic');
   const starting=named(pink,'Ranged weapon profiles').find(x=>x.window==='Shooting')?.summary;
   expect(starting).toContain('Coruscating Pink Flames');
   expect(starting).not.toContain('Coruscating Blue Flames');
 });
 it('suppresses the Shadow army rules for Pact, retains Be’lakor’s selectable forms, and requires actual daemon Infantry for the Prince',()=>{
   const models=[s('Great Unclean One'),s('Skarbrand'),s('Be’lakor'),s('Horticulous Slimux'),s('Daemon Prince of Chaos'),s('Knight Abominant')];
   const pact=rules(...models);
   expect(pact.filter(r=>/Greater Daemon of|Dark Master|Seed the Garden|Daemonic Terror|Daemonic Manifestation/.test(r.title))).toEqual([]);
   expect(named(pact,'Daemonic Lord')).toEqual([]);
   expect(named(rules(...models,s('Plaguebearers','pb')),'Daemonic Lord')[0].summary).toContain('pb');
   expect(named(pact,'Wreathed in Shadows (Aura, Psychic)')[0].units).not.toContain('Knight Abominant');
   const native=generate11thReminders({...newSelection('Chaos Daemons'),instances:models});
   expect(named(native,'Greater Daemon of Nurgle (Aura)')[0].summary).toContain('within 6″');
   expect(named(native,'Seed the Garden of Nurgle')[0].timing).toBe('end');
 });
});
