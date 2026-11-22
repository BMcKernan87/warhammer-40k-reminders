import type {ArmySelection} from './catalog';
import type {GeneratedReminder} from './generated-reminders';
const source='https://wahapedia.ru/wh40k10ed/factions/necrons/';
type Stratagem={id:string;title:string;window:GeneratedReminder['window'];summary:string};
const awakened:Stratagem[]=[
 {id:'sudden-storm',title:'Protocol of the Sudden Storm · 1 CP',window:'Movement',summary:'Your Movement phase: target one friendly NECRONS unit. Its ranged weapons gain ASSAULT until turn end; if led by a NECRONS CHARACTER, you can also re-roll its Advance roll until phase end.'},
 {id:'conquering-tyrant',title:'Protocol of the Conquering Tyrant · 1 CP',window:'Shooting',summary:'Your Shooting phase, before the selected NECRONS unit shoots: against targets within half range, re-roll Hit rolls of 1; if led by a NECRONS CHARACTER, re-roll Hit rolls instead.'},
 {id:'hungry-void',title:'Protocol of the Hungry Void · 1 CP',window:'Fight',summary:'Fight phase, before a selected NECRONS unit fights: add 1 Strength to its melee weapons; if led by a NECRONS CHARACTER, also improve melee AP by 1 (subject to non-stacking restriction).'},
 {id:'eternal-revenant',title:'Protocol of the Eternal Revenant · 1 CP',window:'Fight',summary:'Any phase, immediately after one of your NECRONS INFANTRY CHARACTER models is destroyed: at phase end return it near where destroyed, outside Engagement Range, with half its starting wounds. Once per model per battle.'},
 {id:'vengeful-stars',title:'Protocol of the Vengeful Stars · 2 CP',window:'Shooting',summary:'Opponent’s Shooting phase, immediately after an enemy destroys your NECRONS unit: target a friendly NECRONS CHARACTER unit within 6 inches of the destroyed unit; after the attacker resolves attacks, shoot only that attacker if eligible.'}
];
export function necronStratagemReminders(army:ArmySelection):GeneratedReminder[]{
 if(army.faction!=='Necrons'||army.detachment!=='Awakened Dynasty')return [];
 return awakened.map(r=>({...r,timing:'during',source,origin:'detachment'}));
}
