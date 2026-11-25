import {newSelection,validateSelection,type ArmySelection} from './catalog';
import {createBattle,validateBattleState,type BattleState} from './engine';
export const PROFILE_KEY='w40k-reminders-profiles-v1';
export interface ArmyProfile{id:string;name:string;army:ArmySelection;battle:BattleState;completed:string[]}
export interface ProfileStore{activeId:string;profiles:ArmyProfile[]}
export function initialStore(army:ArmySelection=newSelection(),battle:BattleState=createBattle(),completed:string[]=[]):ProfileStore{return {activeId:'default',profiles:[{id:'default',name:'My army',army,battle,completed}]};}
export function validateStore(value:unknown):value is ProfileStore{
 if(!value||typeof value!=='object')return false;
 const s=value as Partial<ProfileStore>;
 return typeof s.activeId==='string'&&Array.isArray(s.profiles)&&s.profiles.length>0&&s.profiles.length<=100&&s.profiles.every(p=>!!p&&typeof p.id==='string'&&p.id.length>0&&typeof p.name==='string'&&p.name.length>0&&p.name.length<=100&&validateSelection(p.army)&&validateBattleState(p.battle)&&Array.isArray(p.completed)&&p.completed.every(x=>typeof x==='string'))&&new Set(s.profiles.map(p=>p.id)).size===s.profiles.length&&s.profiles.some(p=>p.id===s.activeId);
}
export function updateProfile(store:ProfileStore,id:string,patch:Partial<Pick<ArmyProfile,'army'|'battle'|'completed'|'name'>>):ProfileStore{return {...store,profiles:store.profiles.map(p=>p.id===id?{...p,...patch}:p)};}
export function createProfile(store:ProfileStore,id:string,name:string):ProfileStore{
 if(!id||store.profiles.some(p=>p.id===id)||!name.trim()||store.profiles.length>=100)throw Error('Invalid army profile');
 return {activeId:id,profiles:[...store.profiles,{id,name:name.trim().slice(0,100),army:newSelection(),battle:createBattle(),completed:[]}]};
}
export function deleteProfile(store:ProfileStore,id:string):ProfileStore{
 if(store.profiles.length===1)throw Error('Keep at least one army');
 const profiles=store.profiles.filter(p=>p.id!==id);
 return {profiles,activeId:store.activeId===id?profiles[0].id:store.activeId};
}
