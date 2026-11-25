import type {ArmyFormation} from './core-stratagems-11th';
import type {GeneratedReminder} from './generated-reminders';
import type {RosterInstance} from './roster-instances';

export function formationShootingReminders(formations:ArmyFormation[],keywords:(unit:string)=>readonly string[],hasGun:(s:RosterInstance)=>boolean):GeneratedReminder[]{
  const out:GeneratedReminder[]=[];
  function add(id:string,title:string,summary:string,applies:(tags:readonly string[])=>boolean){
    const units=formations.filter(f=>f.members.some(s=>hasGun(s)&&applies(keywords(s.unit)))).map(f=>f.id);
    if(units.length)out.push({id:'11e-formation-'+id,title,window:'Shooting',timing:'during',turn:'own',units,
      summary,source:'https://wahapedia.ru/wh40k11ed/the-rules/core-rules/',origin:'army'});
  }
  add('towering-fire','Plunging Fire · Towering models',
    'A Towering model firing at a visible unit within 12″ improves its Ballistic Skill by 1 if the target contains a model on ground level. Aircraft attacks and targets are exempt.',
    tags=>tags.includes('TOWERING')&&!tags.includes('AIRCRAFT'));
  add('engaged-shooting','Close-quarters shooting · Monsters and Vehicles',
    'When engaged, a unit that did not Advance can select close-quarters shooting. Its Monster and Vehicle models normally subtract 1 to hit, including when firing outside the engagement. Ignore that penalty for a Close-quarters weapon aimed at an enemy engaging the unit. Blast cannot target an enemy engaging the firing unit. After shooting, the unit cannot start an action this phase.',
    tags=>tags.includes('MONSTER')||tags.includes('VEHICLE'));
  return out;
}
