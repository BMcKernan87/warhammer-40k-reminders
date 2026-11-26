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

/** Minimum cost of a complete distinct whole-formation assignment. Reverse
 * edges let an earlier transport change passengers when a later constraint or
 * a cheaper complete assignment requires it. The result never declares cargo. */
export function minimumTransportAssignmentCost<T,P>(vehicles:readonly T[],passengers:readonly P[],fits:(vehicle:T,passenger:P)=>boolean,cost:(vehicle:T,passenger:P)=>number):number|null{
 if(vehicles.length>passengers.length)return null;
 interface Edge {to:number;reverse:number;capacity:number;cost:number}
 const firstPassenger=1+vehicles.length,sink=firstPassenger+passengers.length,graph:Edge[][]=Array.from({length:sink+1},()=>[]);
 function connect(from:number,to:number,value:number){
  if(!Number.isFinite(value))throw Error('Transport assignment costs must be finite.');
  graph[from].push({to,reverse:graph[to].length,capacity:1,cost:value});
  graph[to].push({to:from,reverse:graph[from].length-1,capacity:0,cost:-value});
 }
 vehicles.forEach((vehicle,i)=>{
  connect(0,i+1,0);
  passengers.forEach((passenger,j)=>{if(fits(vehicle,passenger))connect(i+1,firstPassenger+j,cost(vehicle,passenger));});
 });
 passengers.forEach((_,j)=>connect(firstPassenger+j,sink,0));
 let total=0;
 for(let assigned=0;assigned<vehicles.length;assigned++){
  const distance=Array<number>(graph.length).fill(Infinity),previous=Array<number>(graph.length).fill(-1),edgeIndex=Array<number>(graph.length).fill(-1);
  distance[0]=0;
  // Bellman–Ford also handles the negative costs of reversing a paid edge.
  for(let pass=1;pass<graph.length;pass++){
   let changed=false;
   graph.forEach((edges,from)=>edges.forEach((edge,index)=>{
    if(edge.capacity&&distance[from]+edge.cost<distance[edge.to]){
     distance[edge.to]=distance[from]+edge.cost;previous[edge.to]=from;edgeIndex[edge.to]=index;changed=true;
    }
   }));
   if(!changed)break;
  }
  if(!Number.isFinite(distance[sink]))return null;
  for(let to=sink;to!==0;to=previous[to]){
   const edge=graph[previous[to]][edgeIndex[to]];edge.capacity--;graph[to][edge.reverse].capacity++;
  }
  total+=distance[sink];
 }
 return total;
}
