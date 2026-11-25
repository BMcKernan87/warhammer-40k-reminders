import {deathGuardKeywords,deathGuardMusterUnits,isPlagueLegions} from './death-guard-data';
import {deathGuardCargoFormations} from './death-guard-transports';
import {legionMuster} from './legion-muster';

export const {
 unitLimit:deathGuardUnitLimit,warlordCandidates:deathGuardWarlordCandidates,
 resolvedWarlord:resolvedDeathGuardWarlord,selectWarlord:selectDeathGuardWarlord,findings:deathGuardMusterFindings,
}=legionMuster({
 faction:'Death Guard',primarch:'Mortarion',groupName:'Plague Legions',detachment:'Tallyband Summoners',idPrefix:'dg',allowanceCode:'plague-legions-allowance',
 musterUnits:deathGuardMusterUnits,keywords:deathGuardKeywords,isSummoned:isPlagueLegions,cargo:deathGuardCargoFormations,
});
