// @vitest-environment node
import {expect,it} from 'vitest';
import {astraDatasheetReminders} from '../src/astra-datasheets';
import {astraMilitarumLoadout} from '../src/astra-militarum-loadouts';
import {broodBrotherIntrinsicReminders} from '../src/brood-brother-reminders';
import {newSelection,type ArmySelection} from '../src/catalog';
import {setKnightGear} from '../src/knight-loadouts';
import type {RosterInstance} from '../src/roster-instances';

const squad=(unit:string,extra:Partial<RosterInstance>={}):RosterInstance=>({id:unit+'#1',unit,...extra});
function build(...instances:RosterInstance[]):ArmySelection{
 const units:Record<string,number>={};
 for(const s of instances)units[s.unit]=(units[s.unit]??0)+1;
 return {...newSelection('Astra Militarum'),detachments2026:['Combined Arms'],battleSize2026:'Strike Force',units,instances};
}
const find=(a:ArmySelection,name:string)=>astraDatasheetReminders(a).filter(r=>r.title===name);
const named=(a:ArmySelection,name:string)=>astraDatasheetReminders(a).filter(r=>r.title.includes(name));
function equip(a:ArmySelection,s:RosterInstance,choice:string,label?:string){
 const slot=astraMilitarumLoadout(s.unit,s.models)!.slots.find(slot=>(!label||slot.name.includes(label))&&slot.choices.some(c=>c.name===choice));
 if(!slot)throw Error(s.unit+' lacks '+choice);
 return setKnightGear(a,s.id,slot.name,choice);
}

it('retains the 52 shared Guard card effects under either host and confines native Kasrkin stacking and heroic recipients to Guard',()=>{
 const kas=squad('Kasrkin'),tank=squad('Basilisk'),creed=squad('Ursula Creed',{attachedTo:kas.id}),native=build(kas,tank,creed);
 const cult:ArmySelection={...native,faction:'Genestealer Cults',detachments2026:['Brood Brothers Auxilia']};
 expect(named(native,'Earthshaker Rounds')[0]).toMatchObject({window:'Shooting',turn:'own',units:[tank.id],summary:expect.stringContaining('2″ Move')});
 expect(broodBrotherIntrinsicReminders(cult).find(r=>r.title.includes('Earthshaker Rounds'))?.units).toEqual([tank.id]);
 expect(named(native,'Warrior Elite')[0].summary).toMatch(/coexist.*Officer.*do not stack/);
 expect(broodBrotherIntrinsicReminders(cult).find(r=>r.title.includes('Warrior Elite'))?.summary).toMatch(/Cult FAQ/);
 expect(find(native,'Tactical Genius')[0].units).toEqual([creed.id,kas.id]);
 expect(astraDatasheetReminders(cult)).toEqual([]);expect(broodBrotherIntrinsicReminders(native)).toEqual([]);
 expect(new Set(astraDatasheetReminders(native).map(r=>r.id)).size).toBe(astraDatasheetReminders(native).length);
});
it('resolves protective Ogryn and Commissar effects for actual Officer models in a nested Command Squad, with no orphan benefits',()=>{
 const body=squad('Cadian Shock Troops'),command=squad('Cadian Command Squad',{attachedTo:body.id}),comm=squad('Commissar',{attachedTo:body.id}),nork=squad('Nork Deddog',{retinueTo:command.id});
 const list=build(body,command,comm,nork);
 const fnp=find(list,'Ogryn Bodyguard');
 expect(fnp[0].units).toEqual([nork.id,command.id,comm.id]);
 expect(fnp[0].summary).toMatch(/only its Officer models.*4\+.*Cadian Commander/);
 expect(find(list,'Thunderous Head-butt')[0]).toMatchObject({window:'Fight',units:[nork.id],summary:expect.stringMatching(/engaged with Nork himself.*2–5.*D3\+3/)});
 expect(find(list,'Political Overwatch')[0].units).toEqual([comm.id,body.id]);
 expect(find(list,'Summary Execution').every(r=>r.timing==='start'&&r.summary.includes('Once per battle round'))).toBe(true);
 const ordinary=squad('Ogryn Bodyguard',{retinueTo:command.id});
 expect(find(build(body,command,ordinary),'Ogryn Bodyguard')[0].units).toEqual([ordinary.id,command.id]);
 const orphan=squad('Nork Deddog');
 expect(astraDatasheetReminders(build(orphan)).filter(r=>r.units?.includes(orphan.id))).toEqual([]);
 expect(find(build(body,comm),'Political Overwatch')).toEqual([]);
});
it('keeps Tempestus arrival permissions, sentry equipment and full-formation weapon effects distinct',()=>{
 const aquilons=squad('Tempestus Aquilons'),scions=squad('Tempestus Scions'),cmd=squad('Militarum Tempestus Command Squad',{attachedTo:scions.id});
 let a=build(aquilons,scions,cmd);
 expect(find(a,'Precision Drop').map(r=>[r.window,r.turn])).toEqual([['Movement','own'],['Charge','own']]);
 expect(find(a,'Precision Drop')[0].summary).toMatch(/6″.*cannot declare a charge/);
 expect(find(a,'Servo-sentry').map(r=>[r.turn,r.timing])).toEqual([['own','during'],['opponent','end']]);
 expect(find(a,'Servo-sentry')[0].summary).toContain('Sentry flamer');
 a=equip(a,aquilons,'Sentry grenade launcher');
 expect(find(a,'Servo-sentry')[1].summary).toMatch(/Rapid Ingress.*Tempestor Aquilon.*Sentry grenade launcher/);
 expect(find(a,'Tempestor Prime')[0].units).toEqual([cmd.id,scions.id]);
 expect(find(a,'Storm Troopers').map(r=>r.window)).toEqual(['Shooting','Movement','Fight']);
 expect(find(a,'Storm Troopers')[0].summary).toMatch(/Wound rolls of 1.*objective marker.*whole Wound roll/);
});
it('activates only the fitted Ratling gear, limits close-range buffs to their recipients and gives Sly Marbo a single reactive shot',()=>{
 const rat=squad('Ratlings',{models:10}),marbo=squad('Sly Marbo'),ogryn=squad('Ogryn Squad'),bull=squad('Bullgryn Squad');
 let a=build(rat,marbo,ogryn,bull);
 expect(find(a,'Ratling Battlemutt')).toEqual([]);expect(find(a,'Demolition Gear')).toEqual([]);
 a=equip(a,rat,'Ratling Battlemutt');a=equip(a,rat,'Demolition gear');
 expect(find(a,'Ratling Battlemutt').map(r=>r.window)).toEqual(['Shooting']);
 expect(find(a,'Demolition Gear')[0].summary).toContain('While its demolition-gear bearer survives');
 expect(find(a,'Shoot Sharp and Scarper')).toMatchObject([{window:'Shooting',turn:'own'},{window:'Charge',turn:'own'}]);
 expect(find(a,'One-man Army')[0]).toMatchObject({window:'Shooting',turn:'opponent',summary:expect.stringMatching(/Once per turn.*3″.*only target/)});
 expect(find(a,'Point-blank Barrage')[1]).toMatchObject({window:'Movement',turn:'opponent',summary:expect.stringMatching(/closest eligible target.*AP.*1/)});
 expect(find(a,'Wall of Muscle')[0].summary).toMatch(/Subtract 1.*Damage.*allocated/);
});
it('preserves printed Yarrick modes, Graves variant distance, model-count exclusions, and actual 2+ return wounds',()=>{
 const y=squad('Commissar Yarrick'),g=squad('Commissar Graves'),foot=squad('Commissar Graves on Foot'),r=squad('Cadian Shock Troops'),tank=squad('Leman Russ Battle Tank'),solo=squad('Sly Marbo');
 const a=build(y,g,r,tank,solo,squad('Lord Marshal Dreir'));
 const reaction=find(a,'Counterstrategist')[0];
 expect(reaction).toMatchObject({window:'Movement',turn:'opponent',timing:'end',source:expect.stringMatching(/#page=14$/),summary:expect.stringMatching(/8″.*6″.*Fire Overwatch.*surge up to D6″.*closest non-Aircraft.*v1\.2 app/)});
 expect(reaction.units).toContain(r.id);expect(reaction.units).not.toContain(tank.id);
 expect(find(a,'Will of Iron')[0].summary).toMatch(/2\+.*3 wounds/);
 expect(find(a,'Tough to Kill')[0].summary).toMatch(/2\+.*D3 wounds/);
 expect(find(a,'Leading the Charge')[0].summary).toMatch(/charge move.*melee weapons.*Devastating Wounds/);
 expect(find(a,'Inspiring Hero')[0].units).toContain(tank.id);
 expect(find(a,'Brutal Disciplinarian')[0]).toMatchObject({units:[g.id,r.id],summary:expect.stringMatching(/Once per turn.*two surviving models.*visible.*24″/)});
 expect(find(a,'Aquiline Prow')[0].summary).toMatch(/D3 mortal wounds.*4–5.*3.*D3\+3/);
 expect(find(build(foot,r,solo),'Brutal Disciplinarian')[0].summary).toMatch(/two surviving models within 12″/);
 expect(find(build(foot,r),'Aquiline Prow')).toEqual([]);
 expect(find(build(foot,r),'Icon of Discipline').map(x=>x.window)).toEqual(['Movement','Shooting','Charge']);
});
it('checks actual target identity for support priests, Solar redeployments, Gaunt’s reserve deadline, and once-per-turn Avenger retaliation',()=>{
 const eng=squad('Tech-Priest Enginseer'),tank=squad('Leman Russ Battle Tank'),leontus=squad('Lord Solar Leontus'),ghosts=squad('Gaunt’s Ghosts'),av=squad('Avenger Strike Fighter'),av2=squad('Avenger Strike Fighter',{id:'Avenger Strike Fighter#2'});
 const troops=squad('Cadian Shock Troops'),priest=squad('Ministorum Priest',{attachedTo:troops.id});
 const a=build(eng,tank,leontus,ghosts,av,av2,troops,priest);
 expect(find(build(eng),'Omnissiah’s Blessing')).toEqual([]);
 expect(find(a,'Omnissiah’s Blessing')[0]).toMatchObject({window:'Command',turn:'own',units:[eng.id,tank.id,av.id,av2.id],summary:expect.stringMatching(/model within 3″.*D3.*4\+.*once per turn/)});
 expect(find(a,'Enginseer')[0].summary).toMatch(/every surviving model has Lone Operative/);
 expect(find(a,'Vengeance for the Omnissiah')[0].summary).toMatch(/destroyed within 12″.*axe has 6 Attacks/);
 expect(find(a,'War Hymns')[0].units).toEqual([priest.id,troops.id]);
 expect(find(a,'Holy Piety')[0].units).toEqual([priest.id]);
 expect(find(a,'Fiery Vengeance')).toHaveLength(1);
 expect(find(a,'Fiery Vengeance')[0]).toMatchObject({window:'Shooting',turn:'opponent',summary:expect.stringMatching(/Once per turn across all Avengers.*can Fly.*another.*6″/)});
 expect(find(build(av),'Fiery Vengeance')).toEqual([]);
 expect(find(a,'The Lord Solar')[0]).toMatchObject({window:'Command',turn:'own',timing:'start',summary:expect.stringContaining('gain 1CP')});
 expect(find(a,'The Collegiate Astrolex')[0].summary).toMatch(/After both armies deploy.*three.*Strategic Reserves/);
 expect(find(a,'Covert Stealth Team')).toMatchObject([{window:'End of opponent turn',turn:'opponent'},{window:'Movement',turn:'own',summary:expect.stringMatching(/must arrive.*first turn.*8″/)}]);
});
