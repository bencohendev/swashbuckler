/**
 * Example pirate campaign data for guest mode.
 *
 * Every entry uses a local `key` for cross-referencing. During seeding the
 * keys are resolved to real UUIDs after all entries are created, then content
 * is patched with proper @mention nodes.
 */

import type { CreateObjectTypeInput, FieldDefinition } from '@/shared/lib/data/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

function field(name: string, type: FieldDefinition['type'], extra?: Partial<FieldDefinition>): Omit<FieldDefinition, 'id'> {
  return { name, type, sort_order: 0, ...extra }
}

export interface CampaignType extends CreateObjectTypeInput {
  /** Stable key used to look up the type id after creation */
  key: string
}

export const CAMPAIGN_TYPES: CampaignType[] = [
  {
    key: 'page',
    name: 'Page',
    plural_name: 'Pages',
    slug: 'page',
    icon: '📄',
    fields: [],
  },
  {
    key: 'npc',
    name: 'NPC',
    plural_name: 'NPCs',
    slug: 'npc',
    icon: '🧑',
    fields: [
      { ...field('Role', 'select', { options: ['Ally', 'Neutral', 'Enemy', 'Unknown'] }), sort_order: 0 },
      { ...field('Location', 'text'), sort_order: 1 },
    ] as FieldDefinition[],
  },
  {
    key: 'location',
    name: 'Location',
    plural_name: 'Locations',
    slug: 'location',
    icon: '📍',
    fields: [
      { ...field('Region', 'select', { options: ['The Shattered Isles', 'The Mainland', 'The Deep'] }), sort_order: 0 },
      { ...field('Type', 'select', { options: ['City', 'Port', 'Island', 'Dungeon', 'Wilderness', 'Ship'] }), sort_order: 1 },
    ] as FieldDefinition[],
  },
  {
    key: 'faction',
    name: 'Faction',
    plural_name: 'Factions',
    slug: 'faction',
    icon: '⚔️',
    fields: [
      { ...field('Alignment', 'select', { options: ['Ally', 'Neutral', 'Enemy', 'Unknown'] }), sort_order: 0 },
      { ...field('Influence', 'select', { options: ['Local', 'Regional', 'Global'] }), sort_order: 1 },
    ] as FieldDefinition[],
  },
  {
    key: 'session-log',
    name: 'Session Log',
    plural_name: 'Session Logs',
    slug: 'session-log',
    icon: '📜',
    fields: [
      { ...field('Session Number', 'number', { required: true }), sort_order: 0 },
      { ...field('Date', 'date'), sort_order: 1 },
    ] as FieldDefinition[],
  },
  {
    key: 'item',
    name: 'Item',
    plural_name: 'Items',
    slug: 'item',
    icon: '💎',
    fields: [
      { ...field('Rarity', 'select', { options: ['Common', 'Uncommon', 'Rare', 'Legendary'] }), sort_order: 0 },
      { ...field('Type', 'select', { options: ['Weapon', 'Armor', 'Potion', 'Artifact', 'Treasure', 'Other'] }), sort_order: 1 },
    ] as FieldDefinition[],
  },
  {
    key: 'quest',
    name: 'Quest',
    plural_name: 'Quests',
    slug: 'quest',
    icon: '🧭',
    fields: [
      { ...field('Status', 'select', { options: ['Active', 'Completed', 'Failed', 'Rumor'] }), sort_order: 0 },
      { ...field('Priority', 'select', { options: ['Main', 'Side', 'Personal'] }), sort_order: 1 },
    ] as FieldDefinition[],
  },
]

// ---------------------------------------------------------------------------
// Mention helper — produces a Plate mention inline node (placeholder)
// ---------------------------------------------------------------------------

function mention(key: string, label: string) {
  return {
    type: 'mention',
    objectId: key, // replaced with real UUID during seeding
    children: [{ text: '' }],
    value: label,
  }
}

function p(...children: unknown[]) {
  return { type: 'p', children: children.map(c => (typeof c === 'string' ? { text: c } : c)) }
}

function h2(text: string) {
  return { type: 'h2', children: [{ text }] }
}

function li(...children: unknown[]) {
  return {
    type: 'li',
    children: [{
      type: 'lic',
      children: children.map(c => (typeof c === 'string' ? { text: c } : c)),
    }],
  }
}

function ul(...items: unknown[]) {
  return { type: 'ul', children: items }
}

function callout(text: string) {
  return {
    type: 'callout',
    children: [{ text }],
  }
}

function bold(text: string) {
  return { text, bold: true }
}

// ---------------------------------------------------------------------------
// Entries
// ---------------------------------------------------------------------------

export interface CampaignEntry {
  /** Stable key for cross-referencing */
  key: string
  title: string
  /** Key of the type (matches CampaignType.key) */
  typeKey: string
  properties?: Record<string, unknown>
  content: unknown[]
  icon?: string
}

export const CAMPAIGN_ENTRIES: CampaignEntry[] = [
  // ── Campaign Overview (Page) ──────────────────────────────────────────
  {
    key: 'overview',
    title: 'Campaign Overview',
    typeKey: 'page',
    content: [
      { type: 'h1', children: [{ text: 'The Crimson Tide' }] },
      p('A seafaring campaign of pirate captains, buried secrets, and an artifact that could change the tides of power across the Shattered Isles.'),

      h2('The Story So Far'),
      p(
        'The party has been recruited by ',
        mention('marlowe', 'Captain Marlowe Vane'),
        ' to hunt down the ',
        mention('quest-compass', 'Tidecaller\'s Compass'),
        ' — a legendary artifact said to point its bearer toward whatever they desire most. Operating out of ',
        mention('port-sable', 'Port Sable'),
        ', the crew has already delved into the ',
        mention('drowned-sanctum', 'Drowned Sanctum'),
        ' and survived an ambush by the ',
        mention('iron-armada', 'Iron Armada'),
        '.',
      ),

      h2('Key Players'),
      ul(
        li(mention('marlowe', 'Captain Marlowe Vane'), ' — the party\'s employer, captain of the Crimson Tide'),
        li(mention('greybeard', 'Silas "Greybeard" Thorne'), ' — retired pirate, tavern keeper, quest giver'),
        li(mention('voss', 'Admiral Isara Voss'), ' — commander of the Iron Armada, primary antagonist'),
        li(mention('nyx', 'Nyx'), ' — sea witch and information broker'),
      ),

      h2('Factions'),
      ul(
        li(mention('crimson-tide', 'The Crimson Tide'), ' — the party\'s pirate crew'),
        li(mention('iron-armada', 'The Iron Armada'), ' — imperial navy hunting pirates'),
        li(mention('tide-singers', 'The Tide Singers'), ' — secretive sea-magic cult'),
      ),

      h2('Active Quests'),
      ul(
        li(mention('quest-compass', 'The Tidecaller\'s Compass'), ' — find the legendary artifact (Main)'),
        li(mention('quest-debt', 'Greybeard\'s Debt'), ' — help Silas settle an old score (Side)'),
      ),

      h2('Locations'),
      ul(
        li(mention('port-sable', 'Port Sable'), ' — lawless free port, home base'),
        li(mention('drowned-sanctum', 'The Drowned Sanctum'), ' — underwater temple'),
        li(mention('ironhaven', 'Ironhaven'), ' — fortified naval city'),
        li(mention('sirens-cradle', 'The Siren\'s Cradle'), ' — enchanted island'),
      ),
    ],
  },

  // ── NPCs ──────────────────────────────────────────────────────────────

  {
    key: 'marlowe',
    title: 'Captain Marlowe Vane',
    typeKey: 'npc',
    properties: { Role: 'Ally', Location: 'Port Sable' },
    content: [
      h2('Description'),
      p('Tall, sun-weathered, with a silver streak running through otherwise dark hair. Speaks softly but carries absolute authority on deck. Missing the ring finger on her left hand — she never explains why.'),

      h2('Background'),
      p(
        'Marlowe captains the flagship of ',
        mention('crimson-tide', 'The Crimson Tide'),
        '. Once a navigator for the Imperial Navy, she deserted after discovering the admiralty\'s plan to weaponize the ',
        mention('quest-compass', 'Tidecaller\'s Compass'),
        '. Now she races ',
        mention('voss', 'Admiral Voss'),
        ' to find it first.',
      ),

      h2('Relationships'),
      ul(
        li('Former colleague of ', mention('voss', 'Admiral Voss'), ' — they served together before Marlowe deserted'),
        li('Owes a debt to ', mention('greybeard', 'Silas Thorne'), ' from her early pirating days'),
        li('Distrusts ', mention('nyx', 'Nyx'), ' but needs her information network'),
      ),

      h2('Notes'),
      p('Carries a locked brass compass that doesn\'t point north. She checks it when she thinks nobody is looking.'),
    ],
  },
  {
    key: 'greybeard',
    title: 'Silas "Greybeard" Thorne',
    typeKey: 'npc',
    properties: { Role: 'Ally', Location: 'Port Sable' },
    content: [
      h2('Description'),
      p('Stocky, barrel-chested, with an enormous grey beard kept in three braids. Voice like gravel in a barrel. Runs The Leaky Anchor, the most popular tavern in ', mention('port-sable', 'Port Sable'), '.'),

      h2('Background'),
      p('Retired after thirty years of piracy. Knows every smuggler, fence, and spy in the Shattered Isles. He was once first mate to the legendary Captain Dredge, who went looking for the ', mention('quest-compass', 'Tidecaller\'s Compass'), ' and never returned.'),

      h2('Current Situation'),
      p(
        'Silas owes a blood debt to a Mainland merchant lord named Harwick — the subject of ',
        mention('quest-debt', 'Greybeard\'s Debt'),
        '. He\'s been calling in favors to make it go away, but time is running out.',
      ),

      h2('Notes'),
      p('Keeps a charred ship\'s log behind the bar. Says it belonged to Captain Dredge. Could be a clue to the Compass.'),
    ],
  },
  {
    key: 'voss',
    title: 'Admiral Isara Voss',
    typeKey: 'npc',
    properties: { Role: 'Enemy', Location: 'Ironhaven' },
    content: [
      h2('Description'),
      p('Impeccably uniformed, sharp-featured, with ice-grey eyes. Speaks in clipped, precise sentences. Never raises her voice — never needs to.'),

      h2('Background'),
      p(
        'Commander of the ',
        mention('iron-armada', 'Iron Armada'),
        ', stationed at ',
        mention('ironhaven', 'Ironhaven'),
        '. Voss has spent five years consolidating naval power across the Shattered Isles, systematically eliminating pirate havens. She wants the ',
        mention('quest-compass', 'Tidecaller\'s Compass'),
        ' to secure imperial dominance over all sea trade.',
      ),

      h2('Relationships'),
      ul(
        li('Former colleague of ', mention('marlowe', 'Captain Marlowe'), ' — considers her desertion a personal betrayal'),
        li('Has placed a bounty on every captain of ', mention('crimson-tide', 'The Crimson Tide')),
        li('Secretly funding research into the ', mention('tide-singers', 'Tide Singers'), '\' magic'),
      ),

      h2('Notes'),
      callout('The party encountered Voss\'s fleet in Session 3. She offered Marlowe a pardon in exchange for the Compass. Marlowe refused.'),
    ],
  },
  {
    key: 'nyx',
    title: 'Nyx',
    typeKey: 'npc',
    properties: { Role: 'Neutral', Location: 'The Siren\'s Cradle' },
    content: [
      h2('Description'),
      p('Ageless, dark-skinned, with luminous green eyes. Her hair moves like kelp in water even on dry land. Wears coral jewelry that seems to pulse with faint light.'),

      h2('Background'),
      p(
        'A sea witch who lives on ',
        mention('sirens-cradle', 'The Siren\'s Cradle'),
        '. She barters in secrets and favors, never coin. Claims to be the last of the original ',
        mention('tide-singers', 'Tide Singers'),
        ', though the current cult denies this.',
      ),

      h2('What She Knows'),
      ul(
        li('The ', mention('quest-compass', 'Tidecaller\'s Compass'), ' was last held by Captain Dredge — she says he\'s not dead, just "between tides"'),
        li('The ', mention('drowned-sanctum', 'Drowned Sanctum'), ' is only one of several temples built by the ancient Tide Singers'),
        li(mention('voss', 'Admiral Voss'), ' has been sending agents to the Siren\'s Cradle in secret'),
      ),

      h2('Notes'),
      p('Nyx helped the party navigate to the Drowned Sanctum. Her price: "A favor, to be named when the tide turns." The party agreed.'),
    ],
  },

  // ── Locations ─────────────────────────────────────────────────────────

  {
    key: 'port-sable',
    title: 'Port Sable',
    typeKey: 'location',
    properties: { Region: 'The Shattered Isles', Type: 'Port' },
    content: [
      h2('Overview'),
      p('A sprawling free port built into the cliffs of Sable Rock. No single authority governs here — disputes are settled by blade, bribe, or the occasional vote. The air smells of salt, rum, and trouble.'),

      h2('Key Locations'),
      ul(
        li(bold('The Leaky Anchor'), ' — ', mention('greybeard', 'Silas Thorne'), '\'s tavern, the party\'s usual meeting spot'),
        li(bold('The Boneyard Docks'), ' — where ships are repaired (or quietly scuttled)'),
        li(bold('Tide Market'), ' — open-air market selling everything from spices to stolen maps'),
        li(bold('The Roost'), ' — elevated lookout point with a signal fire'),
      ),

      h2('Factions Present'),
      ul(
        li(mention('crimson-tide', 'The Crimson Tide'), ' — the dominant pirate fleet, docked here regularly'),
        li('Independent smugglers and fences'),
        li('Rumored ', mention('tide-singers', 'Tide Singer'), ' presence in the caves below the port'),
      ),

      h2('Notes'),
      p(mention('voss', 'Admiral Voss'), ' has threatened to blockade Port Sable if the pirate captains don\'t surrender. So far, nobody\'s blinking.'),
    ],
  },
  {
    key: 'drowned-sanctum',
    title: 'The Drowned Sanctum',
    typeKey: 'location',
    properties: { Region: 'The Deep', Type: 'Dungeon' },
    content: [
      h2('Overview'),
      p('An ancient temple submerged beneath the waves, accessible only at low tide through a sea cave. Built by the original ', mention('tide-singers', 'Tide Singers'), ' centuries ago. The walls are covered in bioluminescent coral that pulses in patterns — possibly a language.'),

      h2('What the Party Found'),
      p(
        'In ',
        mention('session-2', 'Session 2'),
        ', the party explored the upper chambers of the Sanctum. They recovered the ',
        mention('deepwater-breath', 'Vial of Deepwater Breath'),
        ' and a stone tablet with a riddle pointing to the ',
        mention('quest-compass', 'Tidecaller\'s Compass'),
        '\'s resting place.',
      ),

      h2('Unexplored Areas'),
      ul(
        li('The lower sanctum — flooded even at low tide, requires magic or the Deepwater Breath to access'),
        li('A sealed chamber behind a door with three coral keyholes'),
        li('A current-swept tunnel that seems to lead deeper into the seabed'),
      ),

      h2('Notes'),
      callout('The riddle on the tablet: "Where the tide meets the sky, and the compass meets the eye, the singer\'s last breath points the way to what was kept from death."'),
    ],
  },
  {
    key: 'ironhaven',
    title: 'Ironhaven',
    typeKey: 'location',
    properties: { Region: 'The Mainland', Type: 'City' },
    content: [
      h2('Overview'),
      p(
        'A heavily fortified naval city on the Mainland coast. Home port of the ',
        mention('iron-armada', 'Iron Armada'),
        ' and seat of ',
        mention('voss', 'Admiral Voss'),
        '\'s power. The harbor bristles with warships, and the city walls are lined with cannons.',
      ),

      h2('Key Locations'),
      ul(
        li(bold('The Admiralty'), ' — Voss\'s headquarters, a stone fortress overlooking the harbor'),
        li(bold('The Chain Gate'), ' — massive harbor chain that can seal the port in minutes'),
        li(bold('Merchant\'s Quarter'), ' — where mainland traders buy and sell, heavily taxed'),
      ),

      h2('Notes'),
      p('The party has not yet visited Ironhaven. ', mention('marlowe', 'Marlowe'), ' warns it would be suicide to dock there openly. But ', mention('nyx', 'Nyx'), ' mentioned a contact who could smuggle them in through the sewers.'),
    ],
  },
  {
    key: 'sirens-cradle',
    title: 'The Siren\'s Cradle',
    typeKey: 'location',
    properties: { Region: 'The Shattered Isles', Type: 'Island' },
    content: [
      h2('Overview'),
      p(
        'A small island perpetually wreathed in mist. The waters around it are unnaturally calm. ',
        mention('nyx', 'Nyx'),
        ' is its sole known resident, though the island itself seems almost alive — paths shift, trees lean toward visitors, and the tide pools reflect things that aren\'t there.',
      ),

      h2('Features'),
      ul(
        li(bold('Nyx\'s Grotto'), ' — a cave dwelling filled with collected oddities from across the seas'),
        li(bold('The Whispering Tide Pools'), ' — said to show visions of the past'),
        li(bold('The Coral Throne'), ' — an ancient seat carved from living coral at the island\'s center'),
      ),

      h2('Notes'),
      p('The party visited in preparation for the Drowned Sanctum dive. ', mention('nyx', 'Nyx'), ' showed them a vision in the tide pools of Captain Dredge sailing into a storm and vanishing.'),
    ],
  },

  // ── Factions ──────────────────────────────────────────────────────────

  {
    key: 'crimson-tide',
    title: 'The Crimson Tide',
    typeKey: 'faction',
    properties: { Alignment: 'Ally', Influence: 'Regional' },
    content: [
      h2('Overview'),
      p(
        'A pirate fleet of seven ships, led by ',
        mention('marlowe', 'Captain Marlowe Vane'),
        '. Based out of ',
        mention('port-sable', 'Port Sable'),
        '. The Tide operates on a code: no slave trade, no attacking fishing vessels, and all plunder is split fairly. This makes them popular with common folk and despised by the empire.',
      ),

      h2('Key Members'),
      ul(
        li(mention('marlowe', 'Captain Marlowe Vane'), ' — fleet captain'),
        li(bold('Brass'), ' — Marlowe\'s first mate, an enormous half-orc'),
        li(bold('Keel'), ' — the fleet\'s shipwright, can repair anything that floats'),
      ),

      h2('Current Status'),
      p(
        'The Tide took losses in the ',
        mention('session-3', 'ambush at Blackwater Strait'),
        '. Two ships are in drydock for repairs. Morale is shaky — some crews want to lay low, but Marlowe is pushing forward with the hunt for the ',
        mention('quest-compass', 'Tidecaller\'s Compass'),
        '.',
      ),
    ],
  },
  {
    key: 'iron-armada',
    title: 'The Iron Armada',
    typeKey: 'faction',
    properties: { Alignment: 'Enemy', Influence: 'Global' },
    content: [
      h2('Overview'),
      p(
        'The imperial navy, commanded by ',
        mention('voss', 'Admiral Isara Voss'),
        ' from ',
        mention('ironhaven', 'Ironhaven'),
        '. Forty warships patrol the trade routes, enforcing imperial law and collecting taxes. To the empire, pirates are vermin. To the Armada, the ',
        mention('quest-compass', 'Tidecaller\'s Compass'),
        ' is a strategic weapon.',
      ),

      h2('Tactics'),
      ul(
        li('Blockade pirate-friendly ports'),
        li('Bounties on known pirate captains'),
        li('Intelligence network of paid informants in every port'),
      ),

      h2('Notes'),
      p(
        mention('voss', 'Voss'),
        ' is rumored to have a spy inside ',
        mention('port-sable', 'Port Sable'),
        '. ',
        mention('marlowe', 'Marlowe'),
        ' suspects it\'s someone at the Tide Market but hasn\'t found proof.',
      ),
    ],
  },
  {
    key: 'tide-singers',
    title: 'The Tide Singers',
    typeKey: 'faction',
    properties: { Alignment: 'Neutral', Influence: 'Regional' },
    content: [
      h2('Overview'),
      p('A secretive cult devoted to the old sea magic. They built the ', mention('drowned-sanctum', 'Drowned Sanctum'), ' and the other submerged temples scattered across the ocean floor. Their current membership and goals are unclear.'),

      h2('What\'s Known'),
      ul(
        li('They seek to "restore the balance of the tides" — whatever that means'),
        li(mention('nyx', 'Nyx'), ' claims to be the last of the originals, but the modern cult rejects her'),
        li('They\'ve been seen in the caves beneath ', mention('port-sable', 'Port Sable')),
        li(mention('voss', 'Admiral Voss'), ' is secretly funding research into their magic'),
      ),

      h2('Notes'),
      callout('Are the Tide Singers allies or enemies? They haven\'t acted against the party yet, but their interest in the Compass suggests they have their own agenda.'),
    ],
  },

  // ── Session Logs ──────────────────────────────────────────────────────

  {
    key: 'session-1',
    title: 'Session 1: A Deal in Port Sable',
    typeKey: 'session-log',
    properties: { 'Session Number': 1 },
    content: [
      h2('Summary'),
      p(
        'The party arrived in ',
        mention('port-sable', 'Port Sable'),
        ' looking for work. At ',
        mention('greybeard', 'Silas Thorne'),
        '\'s tavern, The Leaky Anchor, they were approached by ',
        mention('marlowe', 'Captain Marlowe Vane'),
        ' with a proposition: join the hunt for the ',
        mention('quest-compass', 'Tidecaller\'s Compass'),
        ' in exchange for a full crew share of whatever treasure they find along the way.',
      ),

      h2('Key Events'),
      ul(
        li('Party arrived at ', mention('port-sable', 'Port Sable'), ' by merchant vessel'),
        li('Met ', mention('greybeard', 'Silas'), ' at The Leaky Anchor — he pointed them toward Marlowe'),
        li(mention('marlowe', 'Marlowe'), ' explained the Compass and her rivalry with ', mention('voss', 'Admiral Voss')),
        li('Party accepted the job and boarded the flagship'),
        li(mention('greybeard', 'Silas'), ' quietly asked the party to look into ', mention('quest-debt', 'his debt situation'), ' on the side'),
      ),

      h2('Loot'),
      p('None — this was a roleplay-heavy session.'),

      h2('Next Session'),
      p('Marlowe wants to visit ', mention('nyx', 'Nyx'), ' at ', mention('sirens-cradle', 'The Siren\'s Cradle'), ' for information about the Compass\'s location.'),
    ],
  },
  {
    key: 'session-2',
    title: 'Session 2: Into the Drowned Sanctum',
    typeKey: 'session-log',
    properties: { 'Session Number': 2 },
    content: [
      h2('Summary'),
      p(
        'After consulting with ',
        mention('nyx', 'Nyx'),
        ' at ',
        mention('sirens-cradle', 'The Siren\'s Cradle'),
        ', the party sailed to the ',
        mention('drowned-sanctum', 'Drowned Sanctum'),
        '. They explored the upper chambers, fought guardians made of animated coral, and recovered a stone tablet with a riddle about the ',
        mention('quest-compass', 'Compass'),
        '\'s location.',
      ),

      h2('Key Events'),
      ul(
        li('Visited ', mention('nyx', 'Nyx'), ' — she showed a vision of Captain Dredge in the tide pools'),
        li('Nyx gave directions to the ', mention('drowned-sanctum', 'Drowned Sanctum'), ' and warned about its guardians'),
        li('The party negotiated entry past a sentient coral door by offering a memory'),
        li('Battle with coral golems in the Hall of Tides'),
        li('Found the ', mention('deepwater-breath', 'Vial of Deepwater Breath'), ' in a trapped chest'),
        li('Recovered the riddle tablet pointing to the Compass'),
      ),

      h2('Loot'),
      ul(
        li(mention('deepwater-breath', 'Vial of Deepwater Breath')),
        li('Stone riddle tablet'),
        li('Handful of luminous coral fragments (50 gp equivalent)'),
      ),

      h2('Next Session'),
      p('Return to ', mention('port-sable', 'Port Sable'), ' to resupply and decode the riddle. ', mention('greybeard', 'Silas'), ' may know something about Captain Dredge\'s old routes.'),
    ],
  },
  {
    key: 'session-3',
    title: 'Session 3: Ambush at Blackwater Strait',
    typeKey: 'session-log',
    properties: { 'Session Number': 3 },
    content: [
      h2('Summary'),
      p(
        'On the return voyage from the ',
        mention('drowned-sanctum', 'Drowned Sanctum'),
        ', the ',
        mention('crimson-tide', 'Crimson Tide'),
        ' fleet was ambushed by three ',
        mention('iron-armada', 'Iron Armada'),
        ' warships in Blackwater Strait. ',
        mention('voss', 'Admiral Voss'),
        ' offered ',
        mention('marlowe', 'Marlowe'),
        ' a pardon in exchange for the Compass. Marlowe refused. A brutal naval battle ensued.',
      ),

      h2('Key Events'),
      ul(
        li('Three Armada frigates emerged from fog in Blackwater Strait'),
        li(mention('voss', 'Voss'), ' hailed Marlowe via speaking trumpet — offered terms'),
        li('Marlowe refused: "The Compass isn\'t yours to claim, Isara. It never was."'),
        li('The party led a boarding action against the lead frigate'),
        li('Two Crimson Tide ships badly damaged; one Armada frigate captured'),
        li('Voss retreated — she\'ll be back'),
      ),

      h2('Loot'),
      ul(
        li(mention('marlowe-cutlass', 'Marlowe\'s Cutlass'), ' — recovered from the captured frigate\'s armory (Marlowe had lost it years ago)'),
        li('Naval charts showing Armada patrol routes'),
        li('150 gp in imperial coin'),
      ),

      h2('Open Questions'),
      ul(
        li('How did Voss know the fleet\'s exact route? There may be a spy in ', mention('port-sable', 'Port Sable')),
        li('What does the riddle tablet mean? Need to consult ', mention('greybeard', 'Silas')),
      ),

      h2('Next Session'),
      p('Repairs at ', mention('port-sable', 'Port Sable'), '. Investigate the possible spy. Decode the riddle.'),
    ],
  },

  // ── Items ─────────────────────────────────────────────────────────────

  {
    key: 'compass',
    title: 'Tidecaller\'s Compass',
    typeKey: 'item',
    properties: { Rarity: 'Legendary', Type: 'Artifact' },
    content: [
      h2('Description'),
      p('A compass made from deep-sea materials — the housing is dark mother-of-pearl, the needle is a sliver of whale bone. According to legend, it doesn\'t point north. It points toward whatever its bearer desires most.'),

      h2('History'),
      p(
        'Created by the original ',
        mention('tide-singers', 'Tide Singers'),
        '. Last known owner was Captain Dredge, ',
        mention('greybeard', 'Silas Thorne'),
        '\'s former captain, who vanished at sea twenty years ago.',
      ),

      h2('Current Status'),
      p(
        'Unknown location. Both ',
        mention('marlowe', 'Captain Marlowe'),
        ' and ',
        mention('voss', 'Admiral Voss'),
        ' are racing to find it. The riddle tablet from the ',
        mention('drowned-sanctum', 'Drowned Sanctum'),
        ' may hold the key.',
      ),

      h2('Notes'),
      callout('Marlowe\'s locked brass compass — is it related? She checks it obsessively but won\'t talk about it.'),
    ],
  },
  {
    key: 'marlowe-cutlass',
    title: 'Marlowe\'s Cutlass',
    typeKey: 'item',
    properties: { Rarity: 'Uncommon', Type: 'Weapon' },
    content: [
      h2('Description'),
      p('A well-balanced cutlass with a guard shaped like a cresting wave. The blade is etched with flowing script in an old maritime language. Faintly hums near salt water.'),

      h2('History'),
      p(
        'Originally ',
        mention('marlowe', 'Marlowe'),
        '\'s personal weapon, lost when she deserted the Imperial Navy. It was recovered from a captured ',
        mention('iron-armada', 'Iron Armada'),
        ' frigate during ',
        mention('session-3', 'Session 3'),
        '.',
      ),

      h2('Properties'),
      ul(
        li('+1 cutlass'),
        li('Grants advantage on checks made to navigate or steer a ship'),
        li('Once per day, can calm a 30-foot area of water for 1 minute'),
      ),
    ],
  },
  {
    key: 'deepwater-breath',
    title: 'Vial of Deepwater Breath',
    typeKey: 'item',
    properties: { Rarity: 'Rare', Type: 'Potion' },
    content: [
      h2('Description'),
      p('A small vial of swirling blue-black liquid that seems to contain an impossibly deep current. When uncorked, it smells like the open ocean during a storm.'),

      h2('Effect'),
      p('When consumed, grants the ability to breathe underwater and swim at full speed for 8 hours. Also provides darkvision to 60 feet while submerged.'),

      h2('Found'),
      p(
        'Recovered from a trapped chest in the ',
        mention('drowned-sanctum', 'Drowned Sanctum'),
        ' during ',
        mention('session-2', 'Session 2'),
        '.',
      ),

      h2('Notes'),
      p('The party has one vial. It will likely be needed to access the lower chambers of the Sanctum — but using it means it\'s gone. Worth looking for more, or another way down.'),
    ],
  },

  // ── Quests ────────────────────────────────────────────────────────────

  {
    key: 'quest-compass',
    title: 'The Tidecaller\'s Compass',
    typeKey: 'quest',
    properties: { Status: 'Active', Priority: 'Main' },
    content: [
      h2('Objective'),
      p(
        'Find the ',
        mention('compass', 'Tidecaller\'s Compass'),
        ' before the ',
        mention('iron-armada', 'Iron Armada'),
        ' does.',
      ),

      h2('Quest Giver'),
      p(mention('marlowe', 'Captain Marlowe Vane')),

      h2('Progress'),
      ul(
        li({ text: 'Meet Marlowe and agree to the job', strikethrough: true }, ' (', mention('session-1', 'Session 1'), ')'),
        li({ text: 'Consult Nyx about the Compass\'s location', strikethrough: true }, ' (', mention('session-2', 'Session 2'), ')'),
        li({ text: 'Explore the Drowned Sanctum for clues', strikethrough: true }, ' (', mention('session-2', 'Session 2'), ')'),
        li('Decode the riddle tablet'),
        li('Find the Compass\'s resting place'),
        li('Retrieve the Compass'),
      ),

      h2('Leads'),
      ul(
        li('The riddle tablet from the ', mention('drowned-sanctum', 'Drowned Sanctum')),
        li(mention('greybeard', 'Silas'), ' may have Captain Dredge\'s old ship log'),
        li(mention('nyx', 'Nyx'), ' said Dredge is "between tides" — what does that mean?'),
      ),
    ],
  },
  {
    key: 'quest-debt',
    title: 'Greybeard\'s Debt',
    typeKey: 'quest',
    properties: { Status: 'Active', Priority: 'Side' },
    content: [
      h2('Objective'),
      p(
        'Help ',
        mention('greybeard', 'Silas "Greybeard" Thorne'),
        ' settle his blood debt to the Mainland merchant lord Harwick.',
      ),

      h2('Quest Giver'),
      p(mention('greybeard', 'Silas "Greybeard" Thorne')),

      h2('Background'),
      p('Years ago, Silas robbed one of Harwick\'s trade ships and killed Harwick\'s brother in the process. Harwick has been sending increasingly aggressive debt collectors. The latest ultimatum: pay 5,000 gp or Harwick will hire the ', mention('iron-armada', 'Iron Armada'), ' to burn ', mention('port-sable', 'Port Sable'), ' to the waterline.'),

      h2('Options'),
      ul(
        li('Pay the debt (the party doesn\'t have 5,000 gp)'),
        li('Negotiate with Harwick directly (risky — he\'s on the Mainland, near ', mention('ironhaven', 'Ironhaven'), ')'),
        li('Find leverage against Harwick'),
        li('Eliminate Harwick (Silas doesn\'t want this — "I\'ve shed enough blood")'),
      ),

      h2('Notes'),
      p('This quest could tie into the main story — Harwick may have connections to ', mention('voss', 'Admiral Voss'), '. Could be a way to learn more about the Armada\'s plans.'),
    ],
  },
]
