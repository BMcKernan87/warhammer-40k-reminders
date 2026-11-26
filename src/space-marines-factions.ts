import type {Faction} from './catalog';

export const SPACE_MARINE_FACTIONS=['Space Marines','Blood Angels','Dark Angels','Black Templars','Space Wolves'] as const;
export type SpaceMarineFaction=typeof SPACE_MARINE_FACTIONS[number];
export const isSpaceMarineFaction=(faction:unknown):faction is SpaceMarineFaction=>(SPACE_MARINE_FACTIONS as readonly string[]).includes(faction as string);
export const SPACE_MARINE_CHAPTER_FACTIONS:Partial<Record<Faction,string>>={'Blood Angels':'BLOOD ANGELS','Dark Angels':'DARK ANGELS','Black Templars':'BLACK TEMPLARS','Space Wolves':'SPACE WOLVES'};
