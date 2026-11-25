// October faction pack: the two Gun Servitors have compulsory different guns.
// Retain those physical bearers instead of granting two selectable heavy guns
// to each model through the relational source's aggregate Gun Servitor row.
export const arcGunServitor='Gun Servitor with heavy arc rifle';
export const bolterGunServitor='Gun Servitor with heavy bolter';
export function mechanicusCompositions(rows){
 return rows.map(original=>{
  if(original.unit_id!=='servitor-battleclade')return original;
  const c=structuredClone(original),stock=c.loadout.stock.find(s=>s.model==='Gun Servitor');
  const items=Object.fromEntries(stock?.items.map(i=>[i.id,i.count])??[]);
  if(stock?.models!==2||Object.keys(items).length!==3||items['heavy-arc-rifle']!==1||items['heavy-bolter']!==1||items['servo-claw']!==2)throw Error('Review distinct Servitor Battleclade heavy weapons');
  const split=rows=>rows.flatMap(m=>{
   if(m.name!=='Gun Servitor')return [m];
   if(m.min!==2||m.max!==2)throw Error('Review Gun Servitor composition');
   return [{...m,name:arcGunServitor,min:1,max:1},{...m,name:bolterGunServitor,min:1,max:1}];
  });
  c.models=split(c.models);c.tiers=c.tiers.map(t=>({...t,models:split(t.models)}));
  const item=id=>({id,count:1});
  const gun=weapon=>[item(weapon),item('servo-claw')];
  c.loadout.stock=c.loadout.stock.flatMap(s=>s!==stock?[s]:[
   {model:arcGunServitor,models:1,items:gun('heavy-arc-rifle')},
   {model:bolterGunServitor,models:1,items:gun('heavy-bolter')},
  ]);
  c.loadout.templates=c.loadout.templates.flatMap(s=>s.model!=='Gun Servitor'?[s]:[
   {model:arcGunServitor,items:gun('heavy-arc-rifle')},{model:bolterGunServitor,items:gun('heavy-bolter')},
  ]);
  const slots=c.loadout.slots.filter(s=>s.model==='Gun Servitor');
  if(slots.length!==1||slots[0].choices.length!==2)throw Error('Review Gun Servitor alternatives');
  c.loadout.slots=c.loadout.slots.flatMap(s=>s.model!=='Gun Servitor'?[s]:[
   {...s,model:arcGunServitor,choices:[gun('heavy-arc-rifle')]},
   {...s,model:bolterGunServitor,choices:[gun('heavy-bolter')]},
  ]);
  return c;
 });
}
