/** Persistent, battle-scoped usage keys for expendable abilities. */
export const resurrectionOrbUsageKey=(overlordId:string):string=>'once-per-battle:resurrection-orb:'+overlordId;
export function resurrectionOrbUsed(completed:readonly string[],overlordId:string):boolean{
 return completed.includes(resurrectionOrbUsageKey(overlordId));
}
export function setResurrectionOrbUsed(completed:readonly string[],overlordId:string,used:boolean):string[]{
 const key=resurrectionOrbUsageKey(overlordId);
 return used?[...new Set([...completed,key])]:completed.filter(x=>x!==key);
}
/** Filter the phase reminder only after this exact Overlord has expended its orb. */
export function isExpendedOrbReminder(reminderId:string,completed:readonly string[],equippedOverlordIds:readonly string[]):boolean{
 return equippedOverlordIds.some(id=>resurrectionOrbUsed(completed,id)&&reminderId.startsWith('overlord-resurrection-orb-'+id+'-'));
}
