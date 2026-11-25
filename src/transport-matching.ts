// Distinct whole-unit passengers. An earlier vehicle can move to another eligible
// passenger if its first choice is the only option for a later vehicle.
export function canFillTransports<T,P>(vehicles:readonly T[],passengers:readonly P[],fits:(vehicle:T,passenger:P)=>boolean):boolean{
 const assigned=new Map<number,T>();
 function fill(vehicle:T,visited:Set<number>):boolean{
  for(let i=0;i<passengers.length;i++){
   if(visited.has(i)||!fits(vehicle,passengers[i]))continue;
   visited.add(i);
   const previous=assigned.get(i);
   if(previous===undefined||fill(previous,visited)){
    assigned.set(i,vehicle);
    return true;
   }
  }
  return false;
 }
 return vehicles.length<=passengers.length&&vehicles.every(v=>fill(v,new Set()));
}
