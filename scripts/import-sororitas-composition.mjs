// The two Missionaries have different compulsory weapons (October pack p. 10).
// Keep them as distinct physical bearers instead of giving either model both
// models' optional equipment or dividing a single plasma gun between them.
export const missionaryGunner='Missionary gunner';
export const missionaryFlamer='Missionary with Ministorum flamer';
export function sororitasCompositions(rows){
 return rows.map(original=>{
  if(original.unit_id!=='sanctifiers')return original;
  const c=structuredClone(original),stock=c.loadout.stock.find(s=>s.model==='Missionary');
  const items=Object.fromEntries(stock?.items.map(i=>[i.id,i.count])??[]);
  if(stock?.models!==2||Object.keys(items).length!==3||items['plasma-gun']!==1||items['ministorum-flamer']!==1||items['sanctifier-melee-weapon']!==2||c.loadout.templates.length)throw Error('Review distinct Sanctifier Missionaries');
  const split=rows=>rows.flatMap(m=>{
   if(m.name!=='Missionary')return [m];
   if(m.min!==2||m.max!==2)throw Error('Review Sanctifier Missionary composition');
   return [{...m,name:missionaryGunner,min:1,max:1},{...m,name:missionaryFlamer,min:1,max:1}];
  });
  c.models=split(c.models);c.tiers=c.tiers.map(t=>({...t,models:split(t.models)}));
  const item=id=>({id,count:1}),melee=item('sanctifier-melee-weapon');
  c.loadout.stock=c.loadout.stock.flatMap(s=>s!==stock?[s]:[
   {model:missionaryGunner,models:1,items:[item('plasma-gun'),melee]},
   {model:missionaryFlamer,models:1,items:[item('ministorum-flamer'),melee]},
  ]);
  const slots=c.loadout.slots.filter(s=>s.model==='Missionary');
  if(slots.length!==1||slots[0].choices.length!==4)throw Error('Review Sanctifier Missionary alternatives');
  c.loadout.slots=c.loadout.slots.flatMap(s=>s.model!=='Missionary'?[s]:[
   {...s,model:missionaryGunner,choices:s.choices.filter(items=>!items.some(i=>i.id==='ministorum-flamer'))},
   {...s,model:missionaryFlamer,choices:s.choices.filter(items=>items.some(i=>i.id==='ministorum-flamer'))},
  ]);
  return c;
 });
}
