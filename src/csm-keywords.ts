import type {ArmySelection} from './catalog';
import type {RosterInstance} from './roster-instances';
import {expandRoster} from './roster-instances';
import {csmFormations} from './csm-formations';
import {csmBaseKeywords,csmChosenMark,csmHasDetachment,csmHasUpgrade} from './csm-muster-data';

/** Pass surviving roster members separately to retain original attachment evidence. */
export function csmKeywords(army:ArmySelection,squad:RosterInstance,model?:string,roster:readonly RosterInstance[]=expandRoster(army)):Set<string>{
 if(army.faction!=='Chaos Space Marines')return new Set();
 const tags=csmBaseKeywords(squad,model),mark=csmChosenMark(army,squad);
 if(!tags.size)return tags;
 if(mark)tags.add(mark.toUpperCase());
 // Core 02.05: singular and plural spellings refer to the same keyword.
 for(const [plural,singular] of [['OBLITERATORS','OBLITERATOR'],['MUTILATORS','MUTILATOR'],['JUMP PACKS','JUMP PACK']])if(tags.has(plural)||tags.has(singular)){tags.add(plural);tags.add(singular);}
 if(csmHasDetachment(army,'Chaos Cult')&&squad.unit==='Traitor Guardsmen Squad')tags.add('BATTLELINE');
 const personal=tags.has('CHARACTER')&&!tags.has('EPIC HERO')&&tags.has('HERETIC ASTARTES');
 if(personal&&mark!=='Khorne'&&csmHasUpgrade(army,squad,'Cabal of Chaos','Touched by the Warp'))tags.add('PSYKER');
 if(personal&&squad.unit==='Chaos Lord with Jump Pack'&&csmHasUpgrade(army,squad,'Murdertalon Raiders','Pact of Cursed Pinions'))tags.add('DAEMON');
 if(csmHasDetachment(army,'Cult of the Arkifane')){
  if(tags.has('HERETIC ASTARTES')&&tags.has('VEHICLE'))tags.add('DAEMON');
  if(tags.has('HERETIC ASTARTES')&&(tags.has('VEHICLE')||squad.unit==='Lord Discordant On Helstalker'||squad.unit==='Vashtorr The Arkifane'))tags.add('SOUL FORGE');
  const members=csmFormations(army,roster).find(g=>g.members.some(s=>s.id===squad.id))?.members??[squad];
  const font=members.some(bearer=>{
   const base=csmBaseKeywords(bearer);
   return base.has('CHARACTER')&&!base.has('EPIC HERO')&&!base.has('DAMNED')&&base.has('HERETIC ASTARTES')&&csmHasUpgrade(army,bearer,'Cult of the Arkifane','Cybinfernal Font');
  });
  if(font)tags.add('SOUL FORGE');
 }
 return tags;
}
