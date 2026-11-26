const remaining=(stock,choice)=>{
 const rest=[...stock];
 for(const item of choice){const index=rest.indexOf(item);if(index<0)return;rest.splice(index,1);}
 return rest;
};
function defaults(slots,stock){
 const solutions=[];
 function visit(n,rest,indices){
  if(n===slots.length){if(!rest.length)solutions.push(indices);return;}
  slots[n].forEach((choice,index)=>{const next=remaining(rest,choice);if(next)visit(n+1,next,[...indices,index]);});
 }
 visit(0,stock,[]);
 if(solutions.length!==1)throw Error('Cannot uniquely recover stock equipment from its printed alternatives: '+JSON.stringify({stock,slots}));
 return solutions[0];
}
function slotLabels(choices) {
 const [base,...others]=choices;
 if(!base.length)return others.length===1?others[0].join(' + '):others[0].length===1?others.map(x=>x.join(' + ')).join(' or '):'Additional weapons';
 if(base.length===1)return base[0]+' alternatives';
 return base.length>3?'Hull and sponson weapons':base.join(' + ')+' alternatives';
}
export function compileModelEquipment(profile,layers,expanded){
 const model=profile.model;
 const entries=layers.filter(s=>s.model===model);
 if(entries.some(s=>s.picks!==1||s.repeats||s.alternate))throw Error('Unreviewed slot for '+model);
 const groups=entries.map(s=>s.choices.map(expanded));
 const selected=defaults(groups,expanded(profile.items));
 const fixed=[],slots=[];
 groups.forEach((group,index)=>{
  if(group.length===1)fixed.push(...group[0]);
  else{const chosen=group[selected[index]],choices=[chosen,...group.filter((_,i)=>i!==selected[index])];
   slots.push({label:slotLabels(choices),choices});}
 });
 if(new Set(slots.map(s=>s.label)).size!==slots.length)throw Error('Duplicate slot label for '+model);
 return {role:model,fixed,slots};
}
