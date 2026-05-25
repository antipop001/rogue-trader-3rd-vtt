export function criticalDamage() {
    return {
        "Nonpenetrating": {
            "Weapon": {
                1: 'Mount Hit: one of the weapon mounts/tubes/gun towers was hit. If a weapon has explosive ammunition, roll [[d10]] again. It detonates on 0, dealing 1 damage to Hull and triggering roll on the severe crit table for this Weapon. In any case, reduce Strength of the weapon by 1 until extensive repair after the battle.',
                2: 'Mount Hit: one of the weapon mounts/tubes/gun towers was hit. If a weapon has explosive ammunition, roll [[d10]] again. It detonates on 0, dealing 1 damage to Hull and triggering roll on the severe crit table for this Weapon. In any case, reduce Strength of the weapon by 1 until extensive repair after the battle.',
                3: 'Mount Hit: one of the weapon mounts/tubes/gun towers was hit. If a weapon has explosive ammunition, roll [[d10]] again. It detonates on 0, dealing 1 damage to Hull and triggering roll on the severe crit table for this Weapon. In any case, reduce Strength of the weapon by 1 until extensive repair after the battle.',
                4: 'Targeter Hit: weapon could only be aimed manually, dividing Crew Rating by 2.',
                5: 'Targeter Hit: weapon could only be aimed manually, dividing Crew Rating by 2.',
                6: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.',
                7: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.',
                8: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.',
                9: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.',
                10: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.'
            },
            "Augur Array": {
                1: 'Shortout: Reduce Detection Range to 1.',
                2: 'Shortout: Reduce Detection Range to 1.',
                3: 'Shortout: Reduce Detection Range to 1.',
                4: 'Glitched: Reduce Detection by 30.',
                5: 'Glitched: Reduce Detection by 30.',
                6: 'Glitched: Reduce Detection by 30.',
                7: 'Glitched: Reduce Detection by 30.',
                8: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.',
                9: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.',
                10: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.'
            },
            "Gravitic Array": {
                1: 'Shortout: Reduce Detection Range to 1.',
                2: 'Shortout: Reduce Detection Range to 1.',
                3: 'Shortout: Reduce Detection Range to 1.',
                4: 'Glitched: Reduce Detection by 30.',
                5: 'Glitched: Reduce Detection by 30.',
                6: 'Glitched: Reduce Detection by 30.',
                7: 'Glitched: Reduce Detection by 30.',
                8: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.',
                9: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.',
                10: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.'
            },
            "Main Thrusters": {
                1: 'Reduce Speed by 1.',
                2: 'Reduce Speed by 1.',
                3: 'Reduce Speed by 1.',
                4: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.',
                5: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.',
                6: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.',
                7: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.',
                8: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.',
                9: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.',
                10: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.'
            },
            "Maneuvering Thrusters": {
                1: 'Increase Turn Radius by 1.',
                2: 'Increase Turn Radius by 1.',
                3: 'Increase Turn Radius by 1.',
                4: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.',
                5: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.',
                6: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.',
                7: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.',
                8: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.',
                9: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.',
                10: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.'
            },
            "Other": {
                1: 'Reduce component HP by 1.',
                2: 'Reduce component HP by 1.',
                3: 'Reduce component HP by 1.',
                4: 'Reduce component HP by 1.',
                5: 'Reduce component HP by 1.',
                6: 'Reduce component HP by 1.',
                7: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.',
                8: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.',
                9: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.',
                10: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.'
            }
        },
        "Penetrating": {
            "Weapon": {
                1: 'Director hit: link with CIC is severed and weapon could only target closest visible target and loses Operator Bonus.',
                2: 'Mount hit: one of the weapon mounts/tubes/gun towers was hit. If a weapon has explosive ammunition, roll [[d10]] again. It detonates on 0, dealing damage from 1 Strength of the Weapon directly into the SP, possibly triggering further Critical Hits. In any case, reduce Strength of the weapon by 1 until extensive repair after the battle.',
                3: 'Mount hit: one of the weapon mounts/tubes/gun towers was hit. If a weapon has explosive ammunition, roll [[d10]] again. It detonates on 0, dealing damage from 1 Strength of the Weapon directly into the SP, possibly triggering further Critical Hits. In any case, reduce Strength of the weapon by 1 until extensive repair after the battle.',
                4: 'Mount hit: one of the weapon mounts/tubes/gun towers was hit. If a weapon has explosive ammunition, roll [[d10]] again. It detonates on 0, dealing damage from 1 Strength of the Weapon directly into the SP, possibly triggering further Critical Hits. In any case, reduce Strength of the weapon by 1 until extensive repair after the battle.',
                5: 'Mount hit: one of the weapon mounts/tubes/gun towers was hit. If a weapon has explosive ammunition, roll [[d10]] again. It detonates on 0, dealing damage from 1 Strength of the Weapon directly into the SP, possibly triggering further Critical Hits. In any case, reduce Strength of the weapon by 1 until extensive repair after the battle.',
                6: 'Targeter Hit: could only be aimed manually, dividing Crew Rating by 2.',
                7: 'Fire! Component receives On Fire! Condition.',
                8: 'Depressurised: Component receives Depressurised Condition.',
                9: 'Unpowered: Component receives Unpowered Condition.',
                10: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.'
            },
            "Plasma Drive": {
                1: 'Energy Fluctuation: reduce Speed by 1 and Increase Turn Radius by 1.',
                2: 'Energy Fluctuation: reduce Speed by 1 and Increase Turn Radius by 1.',
                3: 'Energy Fluctuation: reduce Speed by 1 and Increase Turn Radius by 1.',
                4: 'Power Spike: due to power overload, roll [[d10]] for another random Component on the ship, on 1-4 they receive On Fire! Condition, on 5-9 they receive Unpowered Condition.',
                5: 'Power Spike: due to power overload, roll [[d10]] for another random Component on the ship, on 1-4 they receive On Fire! Condition, on 5-9 they receive Unpowered Condition.',
                6: 'Power Spike: due to power overload, roll [[d10]] for another random Component on the ship, on 1-4 they receive On Fire! Condition, on 5-9 they receive Unpowered Condition.',
                7: 'Fire! Component receives On Fire! Condition.',
                8: 'Fire! Component receives On Fire! Condition.',
                9: 'Depressurised: Component receives Depressurised Condition.',
                10: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.'
            },
            "Main Thrusters": {
                1: 'Thruster hit: Reduce Speed by 1.',
                2: 'Thruster hit: Reduce Speed by 1.',
                3: 'Thruster hit: Reduce Speed by 1.',
                4: 'Fire! Component receives On Fire! Condition.',
                5: 'Fire! Component receives On Fire! Condition.',
                6: 'Unpowered: Component receives Unpowered Condition.',
                7: 'Unpowered: Component receives Unpowered Condition.',
                8: 'Damaged: Reduce component HP by another 1.',
                9: 'Damaged: Reduce component HP by another 1.',
                10: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.'
            },
            "Maneuvering Thrusters": {
                1: 'Thruster hit: Increase Turn Radius by 1.',
                2: 'Thruster hit: Increase Turn Radius by 1.',
                3: 'Thruster hit: Increase Turn Radius by 1.',
                4: 'Fire! Component receives On Fire! Condition.',
                5: 'Fire! Component receives On Fire! Condition.',
                6: 'Unpowered: Component receives Unpowered Condition.',
                7: 'Unpowered: Component receives Unpowered Condition.',
                8: 'Damaged: Reduce component HP by another 1.',
                9: 'Damaged: Reduce component HP by another 1.',
                10: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.'
            },
            "Warp Engine": {
                1: 'Warp Matrix hit: complicated arcane machines responsible for translation into Immaterium are struck by hit. The ship cannot translate into Warp.',
                2: 'Warp Matrix hit: complicated arcane machines responsible for translation into Immaterium are struck by hit. The ship cannot translate into Warp.',
                3: 'Warp Matrix hit: complicated arcane machines responsible for translation into Immaterium are struck by hit. The ship cannot translate into Warp.',
                4: 'Fire! Component receives On Fire! Condition.',
                5: 'Fire! Component receives On Fire! Condition.',
                6: 'Depressurised: Component receives Depressurised Condition.',
                7: 'Depressurised: Component receives Depressurised Condition.',
                8: 'Unpowered: Component receives Unpowered Condition.',
                9: 'Damaged: Reduce component HP by another 1.',
                10: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.'
            },
            "Void Shields": {
                1: 'Shield Projectors hit: one of the ship\'s Void Shield projectors is struck by a hit.',
                2: 'Shield Projectors hit: one of the ship\'s Void Shield projectors is struck by a hit.',
                3: 'Shield Projectors hit: one of the ship\'s Void Shield projectors is struck by a hit.',
                4: 'Fire! Component receives On Fire! Condition.',
                5: 'Fire! Component receives On Fire! Condition.',
                6: 'Depressurised: Component receives Depressurised Condition.',
                7: 'Depressurised: Component receives Depressurised Condition.',
                8: 'Unpowered: Component receives Unpowered Condition.',
                9: 'Damaged: Reduce component HP by another 1.',
                10: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.'
            },
            "Bridge": {
                1: 'CIC is hit: The ship’s command space has been hit. All Weapons could only target the closest visible target and lose Operator Bonus. Guided Weapons couldn’t be operated. Reduce Detection Range to 1. Reduce Detection by 30.',
                2: 'CIC is hit: The ship’s command space has been hit. All Weapons could only target the closest visible target and lose Operator Bonus. Guided Weapons couldn’t be operated. Reduce Detection Range to 1. Reduce Detection by 30.',
                3: 'Bridge is hit: The main conning station has suffered a hit. The ship couldn’t use any Maneuvers.',
                4: 'Bridge is hit: The main conning station has suffered a hit. The ship couldn’t use any Maneuvers.',
                5: 'Bridge is hit: The main conning station has suffered a hit. The ship couldn’t use any Maneuvers.',
                6: 'Fire! Component receives On Fire! Condition.',
                7: 'Fire! Component receives On Fire! Condition.',
                8: 'Unpowered: Component receives Unpowered Condition.',
                9: 'Damaged: Reduce component HP by another 1.',
                10: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.'
            },
            "Augur Array": {
                1: 'Shortout: Reduce Detection Range to 1.',
                2: 'Shortout: Reduce Detection Range to 1.',
                3: 'Glitched: Reduce Detection by 30.',
                4: 'Glitched: Reduce Detection by 30.',
                5: 'Data Bus is hit: main data link between CIC and Augur is severed. Augur is not operable.',
                6: 'Data Bus is hit: main data link between CIC and Augur is severed. Augur is not operable.',
                7: 'Unpowered: Component receives Unpowered Condition',
                8: 'Unpowered: Component receives Unpowered Condition.',
                9: 'Damaged: Reduce component HP by another 1.',
                10: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.'
            },
            "Gravitic Array": {
                1: 'Shortout: Reduce Detection Range to 1.',
                2: 'Shortout: Reduce Detection Range to 1.',
                3: 'Glitched: Reduce Detection by 30.',
                4: 'Glitched: Reduce Detection by 30.',
                5: 'Data Bus is hit: main data link between CIC and Augur is severed. Augur is not operable.',
                6: 'Data Bus is hit: main data link between CIC and Augur is severed. Augur is not operable.',
                7: 'Unpowered: Component receives Unpowered Condition',
                8: 'Unpowered: Component receives Unpowered Condition.',
                9: 'Damaged: Reduce component HP by another 1.',
                10: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.'
            },
            "Other": {
                1: 'Fire! Component receives On Fire! Condition.',
                2: 'Fire! Component receives On Fire! Condition.',
                3: 'Depressurised: Component receives Depressurised Condition.',
                4: 'Depressurised: Component receives Depressurised Condition.',
                5: 'Unpowered: Component receives Unpowered Condition.',
                6: 'Unpowered: Component receives Unpowered Condition.',
                7: 'Damaged: Reduce component HP by another 1.',
                8: 'Damaged: Reduce component HP by another 1.',
                9: 'Damaged: Reduce component HP by another 1.',
                10: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.'
            },
        },
        "Critical": {
            "Weapon": {
                1: 'Director destroyed: link with CIC is severed and weapon can’t target anything until replaced completely.',
                2: 'Director destroyed: link with CIC is severed and weapon can’t target anything until replaced completely.',
                3: 'Director destroyed: link with CIC is severed and weapon can’t target anything until replaced completely.',
                4: 'Ammo Detonation: Reduce Hull by (Weapon Strength) Points and Deal (Weapon Strength/2) Critical Hits in the location with this Weapon. Weapon is Destroyed completely.',
                5: 'Ammo Detonation: Reduce Hull by (Weapon Strength) Points and Deal (Weapon Strength/2) Critical Hits in the location with this Weapon. Weapon is Destroyed completely.',
                6: 'Ammo Detonation: Reduce Hull by (Weapon Strength) Points and Deal (Weapon Strength/2) Critical Hits in the location with this Weapon. Weapon is Destroyed completely.',
                7: 'Targeter Hit: could only be aimed manually, dividing Crew Rating by 2. Last’s until replacement.',
                8: 'Targeter Hit: could only be aimed manually, dividing Crew Rating by 2. Last’s until replacement.',
                9: 'Targeter Hit: could only be aimed manually, dividing Crew Rating by 2. Last’s until replacement.',
                10: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.'
            },
            "Plasma Drive": {
                1: 'Containment Breach: reactor active zone magnetic containment fields are under threat of failing. Automatic system trying to activate Shutdown protocols. Need (-20) Repairing Shipboard Action to engage manual override. If protocols are not stopped, the reactor is Shut Down by d5 Strategic Turns. If they are overruled, the ship can continue to operate, but every turn roll d10, adding an amount of turns after receiving this Critical Hit. On 8+, this module receives On Fire! Condition and reduce its HP by 1.',
                2: 'Containment Breach: reactor active zone magnetic containment fields are under threat of failing. Automatic system trying to activate Shutdown protocols. Need (-20) Repairing Shipboard Action to engage manual override. If protocols are not stopped, the reactor is Shut Down by d5 Strategic Turns. If they are overruled, the ship can continue to operate, but every turn roll d10, adding an amount of turns after receiving this Critical Hit. On 8+, this module receives On Fire! Condition and reduce its HP by 1.',
                3: 'Containment Breach: reactor active zone magnetic containment fields are under threat of failing. Automatic system trying to activate Shutdown protocols. Need (-20) Repairing Shipboard Action to engage manual override. If protocols are not stopped, the reactor is Shut Down by d5 Strategic Turns. If they are overruled, the ship can continue to operate, but every turn roll d10, adding an amount of turns after receiving this Critical Hit. On 8+, this module receives On Fire! Condition and reduce its HP by 1.',
                4: 'Catastrophic Power Spike: due to catastrophic power overload, roll d10 for [[d5]] another Components on the ship, on 1-4 they receive On Fire! Condition, on 5-9 they receive Unpowered Condition.',
                5: 'Catastrophic Power Spike: due to catastrophic power overload, roll d10 for [[d5]] another Components on the ship, on 1-4 they receive On Fire! Condition, on 5-9 they receive Unpowered Condition.',
                6: 'Catastrophic Power Spike: due to catastrophic power overload, roll d10 for [[d5]] another Components on the ship, on 1-4 they receive On Fire! Condition, on 5-9 they receive Unpowered Condition.',
                7: 'Reactor Overload: reactor active zone magnetic containment fields are under threat of failing. Automatic system trying to activate Shutdown protocols. Roll [[d10]]. On 1-7 They are successful and the Reactor is Shut Down until extensive repair. On 8-0, the ship suffers Plasma Drive Explosion from 2.2.4 Catastrophic Damage.',
                8: 'Reactor Overload: reactor active zone magnetic containment fields are under threat of failing. Automatic system trying to activate Shutdown protocols. Roll [[d10]]. On 1-7 They are successful and the Reactor is Shut Down until extensive repair. On 8-0, the ship suffers Plasma Drive Explosion from 2.2.4 Catastrophic Damage.',
                9: 'Reactor Overload: reactor active zone magnetic containment fields are under threat of failing. Automatic system trying to activate Shutdown protocols. Roll [[d10]]. On 1-7 They are successful and the Reactor is Shut Down until extensive repair. On 8-0, the ship suffers Plasma Drive Explosion from 2.2.4 Catastrophic Damage.',
                10: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.'
            },
            "Main Thrusters": {
                1: 'Thruster destroyed: Reduce Speed by 2 until replacement.',
                2: 'Thruster destroyed: Reduce Speed by 2 until replacement.',
                3: 'Thruster destroyed: Reduce Speed by 2 until replacement.',
                4: 'Fuel Combustion: this component and Reactor both receive On Fire! Condition and reduce their HP for 1 both.',
                5: 'Fuel Combustion: this component and Reactor both receive On Fire! Condition and reduce their HP for 1 both.',
                6: 'Fuel Combustion: this component and Reactor both receive On Fire! Condition and reduce their HP for 1 both.',
                7: 'Controlling line destroyed: Can’t change Speed until replacement.',
                8: 'Controlling line destroyed: Can’t change Speed until replacement.',
                9: 'Controlling line destroyed: Can’t change Speed until replacement.',
                10: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.'
            },
            "Maneuvering Thrusters": {
                1: 'Thruster destroyed: Increase Turn Radius by 2 until replacement.',
                2: 'Thruster destroyed: Increase Turn Radius by 2 until replacement.',
                3: 'Thruster destroyed: Increase Turn Radius by 2 until replacement.',
                4: 'Fuel Combustion: this component and Reactor both receive On Fire! Condition and reduce their HP for 1 both.',
                5: 'Fuel Combustion: this component and Reactor both receive On Fire! Condition and reduce their HP for 1 both.',
                6: 'Fuel Combustion: this component and Reactor both receive On Fire! Condition and reduce their HP for 1 both.',
                7: 'Rudder destroyed: Can’t Turn until replacement.',
                8: 'Rudder destroyed: Can’t Turn until replacement.',
                9: 'Rudder destroyed: Can’t Turn until replacement.',
                10: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.'
            },
            "Warp Engine": {
                1: 'Warp Field Distortion: Ships Flickers into Warp for a moment, receiving [[2d5]] Crew Loss. Any character should Roll Willpower (-40) test or receive [[2d5]] Corruption and [[2d5]] Insanity Points. Navigator Characters should Roll Willpower (-20) test or die.',
                2: 'Warp Field Distortion: Ships Flickers into Warp for a moment, receiving [[2d5]] Crew Loss. Any character should Roll Willpower (-40) test or receive [[2d5]] Corruption and [[2d5]] Insanity Points. Navigator Characters should Roll Willpower (-20) test or die.',
                3: 'Warp Field Distortion: Ships Flickers into Warp for a moment, receiving [[2d5]] Crew Loss. Any character should Roll Willpower (-40) test or receive [[2d5]] Corruption and [[2d5]] Insanity Points. Navigator Characters should Roll Willpower (-20) test or die.',
                4: 'Warp Core Overload: Ships warp drive overloads, rending seething holes in space, a maelstrom into the realm of the Chaos. Any starship within [[3d6]] VU is struck by energies of warp, roll [[d10]]. They must pass (-20) Movement Test or be dragged into the warp. The ship that is subject to this Critical Hit is dragged here automatically.',
                5: 'Warp Core Overload: Ships warp drive overloads, rending seething holes in space, a maelstrom into the realm of the Chaos. Any starship within [[3d6]] VU is struck by energies of warp, roll [[d10]]. They must pass (-20) Movement Test or be dragged into the warp. The ship that is subject to this Critical Hit is dragged here automatically.',
                6: 'Warp Core Overload: Ships warp drive overloads, rending seething holes in space, a maelstrom into the realm of the Chaos. Any starship within [[3d6]] VU is struck by energies of warp, roll [[d10]]. They must pass (-20) Movement Test or be dragged into the warp. The ship that is subject to this Critical Hit is dragged here automatically.',
                7: 'Warp Matrix hit: complicated arcane machines responsible for translation into Immaterium are struck by hit. The ship cannot translate into Warp until extensive repair after the battle.',
                8: 'Warp Matrix hit: complicated arcane machines responsible for translation into Immaterium are struck by hit. The ship cannot translate into Warp until extensive repair after the battle.',
                9: 'Warp Matrix hit: complicated arcane machines responsible for translation into Immaterium are struck by hit. The ship cannot translate into Warp until extensive repair after the battle.',
                10: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.'
            },
            "Void Shields": {
                1: 'Energy Backslash: Energy capacitors are damaged by hit and are violently releasing stored energy. [[d3]] Components in the same Location receive On Fire! Condition.',
                2: 'Energy Backslash: Energy capacitors are damaged by hit and are violently releasing stored energy. [[d3]] Components in the same Location receive On Fire! Condition.',
                3: 'Energy Backslash: Energy capacitors are damaged by hit and are violently releasing stored energy. [[d3]] Components in the same Location receive On Fire! Condition.',
                4: 'Shield Projector destroyed: one of the ship\'s Void Shield projectors is destroyed. Reduce shield layers quantity by 1 up to 0 until replacement.',
                5: 'Shield Projector destroyed: one of the ship\'s Void Shield projectors is destroyed. Reduce shield layers quantity by 1 up to 0 until replacement.',
                6: 'Shield Projector destroyed: one of the ship\'s Void Shield projectors is destroyed. Reduce shield layers quantity by 1 up to 0 until replacement.',
                7: 'Electromagnetic Resonance: Until the end of the ship’s next Round, it has no active shields and receives -30 Evasion.',
                8: 'Electromagnetic Resonance: Until the end of the ship’s next Round, it has no active shields and receives -30 Evasion.',
                9: 'Electromagnetic Resonance: Until the end of the ship’s next Round, it has no active shields and receives -30 Evasion.',
                10: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.'
            },
            "Bridge": {
                1: 'CIC is destroyed: The ship’s command space has been destroyed. All Weapons could only target the closest visible target and lose Operator Bonus. Guided Weapons couldn’t be operated. Reduce Detection Range to 1. Reduce Detection by 30. Last’s until replacement.',
                2: 'CIC is destroyed: The ship’s command space has been destroyed. All Weapons could only target the closest visible target and lose Operator Bonus. Guided Weapons couldn’t be operated. Reduce Detection Range to 1. Reduce Detection by 30. Last’s until replacement.',
                3: 'CIC is destroyed: The ship’s command space has been destroyed. All Weapons could only target the closest visible target and lose Operator Bonus. Guided Weapons couldn’t be operated. Reduce Detection Range to 1. Reduce Detection by 30. Last’s until replacement.',
                4: 'Bridge is destroyed: The main conning station has been destroyed. The ship couldn’t use any Maneuvers until replacement.',
                5: 'Bridge is destroyed: The main conning station has been destroyed. The ship couldn’t use any Maneuvers until replacement.',
                6: 'Bridge is destroyed: The main conning station has been destroyed. The ship couldn’t use any Maneuvers until replacement.',
                7: 'Electric Suffering: Ships Machine Spirit received catastrophic blow, [[2d5]] Components on the ship receive a roll on Penetration hits table each.',
                8: 'Electric Suffering: Ships Machine Spirit received catastrophic blow, [[2d5]] Components on the ship receive a roll on Penetration hits table each.',
                9: 'Electric Suffering: Ships Machine Spirit received catastrophic blow, [[2d5]] Components on the ship receive a roll on Penetration hits table each.',
                10: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.'
            },
            "Augur Array": {
                1: 'Burnout: Reduce Detection Range to 1, until replacement.',
                2: 'Burnout: Reduce Detection Range to 1, until replacement.',
                3: 'Burnout: Reduce Detection Range to 1, until replacement.',
                4: 'Ghost Visions: Reduce Detection by 30. All weapons suffer -20 until replacement.',
                5: 'Ghost Visions: Reduce Detection by 30. All weapons suffer -20 until replacement.',
                6: 'Ghost Visions: Reduce Detection by 30. All weapons suffer -20 until replacement.',
                7: 'Data Bus is destroyed: main data link between CIC and Augur is severed. Augur is not operable until Bus replacement.',
                8: 'Data Bus is destroyed: main data link between CIC and Augur is severed. Augur is not operable until Bus replacement.',
                9: 'Data Bus is destroyed: main data link between CIC and Augur is severed. Augur is not operable until Bus replacement.',
                10: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.'
            },
            "Gravitic Array": {
                1: 'Burnout: Reduce Detection Range to 1, until replacement.',
                2: 'Burnout: Reduce Detection Range to 1, until replacement.',
                3: 'Burnout: Reduce Detection Range to 1, until replacement.',
                4: 'Ghost Visions: Reduce Detection by 30. All weapons suffer -20 until replacement.',
                5: 'Ghost Visions: Reduce Detection by 30. All weapons suffer -20 until replacement.',
                6: 'Ghost Visions: Reduce Detection by 30. All weapons suffer -20 until replacement.',
                7: 'Data Bus is destroyed: main data link between CIC and Augur is severed. Augur is not operable until Bus replacement.',
                8: 'Data Bus is destroyed: main data link between CIC and Augur is severed. Augur is not operable until Bus replacement.',
                9: 'Data Bus is destroyed: main data link between CIC and Augur is severed. Augur is not operable until Bus replacement.',
                10: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.'
            },
            "Other": {
                1: 'Shortouts! Component receives On Fire! and Unpowered Condition.',
                2: 'Shortouts! Component receives On Fire! and Unpowered Condition.',
                3: 'Shortouts! Component receives On Fire! and Unpowered Condition.',
                4: 'Depressurised: Component receives Depressurised and Unpowered  Condition.',
                5: 'Depressurised: Component receives Depressurised and Unpowered  Condition.',
                6: 'Depressurised: Component receives Depressurised and Unpowered  Condition.',
                7: 'Damaged: Reduce component HP by another 2.',
                8: 'Damaged: Reduce component HP by another 2.',
                9: 'Damaged: Reduce component HP by another 2.',
                10: 'Nothing: Through miraculous luck, nothing critical was struck. Component continue to operate on full capacity.'
            },
        }
    }
}

export function getFuzzy(obj, term) {
    if(obj[term]) return obj[term];
    for(const [name, entry] of Object.entries(obj)) {
        if(term.toUpperCase() === name.toUpperCase()) {
            return entry;
        }
    }

}

export function getVoidshipCriticalDamage(type, location) {
    const criticalDamageMap = criticalDamage();
    const damageMap = getFuzzy(criticalDamageMap, type);
    if(!damageMap) {
        return null;
    }
    let locationMap = getFuzzy(damageMap, location);
    if(!locationMap) {
        locationMap = getFuzzy(damageMap, "Other");
    }
    const critical = Math.floor(Math.random() * 10) + 1;
    return locationMap[critical];
}
