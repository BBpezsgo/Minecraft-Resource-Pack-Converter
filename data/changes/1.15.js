/** @type {import('../../src/changes').PackChangesNullable} */
({
    models: {
        item: {
            Added: [
                "beehive",
                "bee_nest",
                "bee_spawn_egg",
                "honeycomb",
                "honeycomb_block",
                "honey_block",
                "honey_bottle",
            ],
        },
        block: {
            Added: [
                "beehive",
                "beehive_honey",
                "bee_nest",
                "bee_nest_honey",
                "honeycomb_block",
                "honey_block",
            ],
        },
    },
    textures: {
        item: {
            Added: [
                "honeycomb",
                "honey_bottle",
            ],
        },
        block: {
            Added: [
                "beehive_end",
                "beehive_front",
                "beehive_front_honey",
                "beehive_side",
                "bee_nest_bottom",
                "bee_nest_front",
                "bee_nest_front_honey",
                "bee_nest_side",
                "bee_nest_top",
                "honeycomb_block",
                "honey_block_bottom",
                "honey_block_side",
                "honey_block_top",
            ],
        },
        entity: {
            Added: [
                "bee/bee",
                "bee/bee_angry",
                "bee/bee_angry_nectar",
                "bee/bee_nectar",
                "bee/bee_stinger",
                "chest/christmas_left",
                "chest/christmas_right",
                "chest/normal_left",
                "chest/normal_right",
                "chest/trapped_left",
                "chest/trapped_right",
                "iron_golem/iron_golem",
                "iron_golem/iron_golem_crackiness_high",
                "iron_golem/iron_golem_crackiness_low",
                "iron_golem/iron_golem_crackiness_medium",
            ],
            Deleted: [
                "chest/christmas_double",
                "chest/normal_double",
                "chest/trapped_double",
                "iron_golem",
            ],
        },
        gui: {
            Deleted: [
                "presets/chaos",
                "presets/delight",
                "presets/drought",
                "presets/luck",
                "presets/madness",
                "presets/water",
            ]
        },
    },
    uv: {
        entity: {
            "chest/normal": "chest",
            "chest/ender": "chest",
            "chest/trapped": "chest",
        },
    },
    blockstates: {
        Added: [
            "beehive",
            "bee_nest",
            "honeycomb_block",
            "honey_block",
        ]
    }
})