// The Defence Platform is equipment on the single Shieldline model. The
// relational extractor mistakes the MFM +20-point add-on for a second model.
export function tauCompositions(rows){
 return rows.map(original=>{
  if(['strike-team','breacher-team'].includes(original.unit_id)){
   const c=structuredClone(original),turret=c.loadout.stock.filter(s=>!s.model);
   if(turret.length!==1||turret[0].models!==0||turret[0].items.length!==1||turret[0].items[0].id!=='support-turret')throw Error('Review conditional DS8 support turret');
   c.loadout.stock=c.loadout.stock.filter(s=>s.model);
   c.loadout.templates=c.loadout.templates.filter(s=>s.model);
   c.loadout.slots=c.loadout.slots.filter(s=>s.model);
   return c;
  }
  if(original.unit_id!=='tidewall-shieldline')return original;
  const c=structuredClone(original);
  if(c.models.length!==2||c.models[0].name!=='Tidewall Shieldline'||c.models[1].name!=='Tidewall Defence Platform'||c.models[1].min!==0||c.models[1].max!==1||c.loadout.slots.some(s=>s.choices.length!==1||s.choices[0].length))throw Error('Review Tidewall platform composition');
  c.models=c.models.filter(m=>m.name==='Tidewall Shieldline');
  c.tiers=[{models:[{name:'Tidewall Shieldline',min:1,max:1}]}];
  c.loadout.stock=[{model:'Tidewall Shieldline',models:1,items:[]}];
  c.loadout.templates=[];
  c.loadout.slots=[{model:'Tidewall Shieldline',picks:1,repeats:false,alternate:false,choices:[[],[{id:'tidewall-defence-platform',count:1}]]}];
  return c;
 });
}
