# Example Campaign (Guest Mode)

**Status:** Not started

## Summary

When users enter guest mode, they choose between a blank workspace or a pre-populated example campaign. The example campaign is a pirate-themed adventure ("The Crimson Tide") that demonstrates types, entries with rich content, and @mention links between entries — giving new users a real feel for how Swashbuckler works with an interconnected knowledge base.

## User Flow

1. User clicks "try as guest" on the landing page
2. A dialog appears with two options:
   - **Start blank** — current behavior (empty space + Getting Started page)
   - **Explore an example campaign** — seeds a fully populated pirate campaign
3. Either choice sets the guest cookie and redirects to the app
4. If "example campaign" is chosen, the user lands on a "Campaign Overview" entry that links to everything else

## Data Seeded

### Space

- Name: "The Crimson Tide"
- Icon: (pirate flag or ship)

### Types (7)

| Type | Slug | Icon | Fields |
|------|------|------|--------|
| Page | page | file-text | — |
| NPC | npc | user | Role (select: Ally/Neutral/Enemy/Unknown), Location (text) |
| Location | location | map-pin | Region (select: The Shattered Isles/The Mainland/The Deep), Type (select: City/Port/Island/Dungeon/Wilderness/Ship) |
| Faction | faction | shield | Alignment (select: Ally/Neutral/Enemy/Unknown), Influence (select: Local/Regional/Global) |
| Session Log | session-log | scroll | Session Number (number, required), Date (date) |
| Item | item | gem | Rarity (select: Common/Uncommon/Rare/Legendary), Type (select: Weapon/Armor/Potion/Artifact/Treasure/Other) |
| Quest | quest | compass | Status (select: Active/Completed/Failed/Rumor), Priority (select: Main/Side/Personal) |

### Entries (~20)

**Pages (1)**
- Campaign Overview — hub page summarizing the campaign, mentioning key NPCs, locations, and quests

**NPCs (4)**
- Captain Marlowe Vane — captain of the Crimson Tide, the party's employer
- Silas "Greybeard" Thorne — retired pirate turned tavern keeper, quest giver
- Admiral Isara Voss — antagonist, commander of the Iron Armada
- Nyx — mysterious sea witch, morally ambiguous information broker

**Locations (4)**
- Port Sable — lawless free port, the party's home base
- The Drowned Sanctum — underwater temple dungeon
- Ironhaven — fortified naval city, enemy territory
- The Siren's Cradle — enchanted island, home of Nyx

**Factions (3)**
- The Crimson Tide — the party's pirate crew (Ally, Regional)
- The Iron Armada — imperial navy hunting pirates (Enemy, Global)
- The Tide Singers — secretive sea-magic cult (Neutral, Regional)

**Session Logs (3)**
- Session 1: "A Deal in Port Sable" — party meets Marlowe, gets the job
- Session 2: "Into the Drowned Sanctum" — dungeon delve for the Tidecaller's Compass
- Session 3: "Ambush at Blackwater Strait" — naval battle with the Iron Armada

**Items (3)**
- Tidecaller's Compass — legendary artifact, points to what you desire most
- Marlowe's Cutlass — uncommon weapon with a storied past
- Vial of Deepwater Breath — rare potion for underwater exploration

**Quests (2)**
- The Tidecaller's Compass — main quest to find the legendary artifact
- Greybeard's Debt — side quest to help Silas settle an old score

### Relations

Entries are linked via @mentions in their content. For example:
- Campaign Overview mentions all major NPCs, locations, factions, and active quests
- Session logs mention NPCs, locations, items, and quests involved
- NPC entries mention their faction and location
- Location entries mention notable NPCs present there
- Quest entries mention relevant NPCs and locations

After all entries are created, `syncMentions` is called for each entry to create the mention relations from the @mention nodes in the content.

## Implementation

### New Files
- `apps/web/src/features/onboarding/lib/exampleCampaign.ts` — campaign data definition (types, entries with content, mention mappings)
- `apps/web/src/features/onboarding/lib/seedExampleCampaign.ts` — function to seed the campaign into a space via DataClient
- `apps/web/src/features/onboarding/components/GuestModeDialog.tsx` — choice dialog (blank vs example)

### Modified Files
- `apps/web/src/app/(public)/landing/GuestButton.tsx` — opens the dialog instead of directly entering guest mode
- `apps/web/src/shared/lib/data/SpaceProvider.tsx` — check for `swashbuckler-guest-example` cookie/flag and seed example campaign instead of welcome page
- `apps/web/src/app/(public)/landing/page.tsx` — render the dialog

### Seeding Flow

1. GuestButton click opens GuestModeDialog
2. User picks "blank" or "example"
3. Dialog sets cookies: `swashbuckler-guest=1` and optionally `swashbuckler-guest-example=1`
4. Redirect to `/dashboard`
5. SpaceProvider detects no spaces exist (new guest) and checks for the example flag
6. If example flag: create space "The Crimson Tide", import types, create all entries with @mention content, call `syncMentions` for each, navigate to Campaign Overview
7. If no example flag: current behavior (My Space + Getting Started page)
8. Clear the `swashbuckler-guest-example` cookie after seeding so it doesn't re-trigger

### Content Approach

Each entry has Plate.js JSON content with:
- Headings, paragraphs, lists, callouts where appropriate
- `@mention` inline nodes linking to other entries (using the entry's ID after creation)
- Content is written to feel like real campaign notes — not tutorial text

Since entry IDs are generated at creation time, the seeding function:
1. Creates all types first (collects type ID map)
2. Creates all entries with placeholder content (collects entry ID map by a local key)
3. Patches each entry's content, replacing placeholder mention IDs with real IDs
4. Calls `syncMentions` for each entry to create relation records

## Out of Scope

- Authenticated user example campaigns (guest only for now)
- Multiple campaign themes (just pirate for v1)
- Ability to reset/re-seed the example campaign
