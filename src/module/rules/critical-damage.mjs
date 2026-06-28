// Personal Critical Effect tables — RT 1e RAW (RT Core Tables 9-11..9-26), re-authored from
// the Rogue Trader Core Rulebook to replace the Dark Heresy 2e text. Keyed by damage type
// (Energy/Explosive/Impact/Rending) × hit location (Arm/Body/Head/Leg) × Critical Damage 1-10
// (10 covers "10 or higher"). Dice are inline-roll `[[XdY]]`. Extracted from RT-DOCS and
// cross-verified against the corebook via NotebookLM (incl. the book's own "noise" typo at
// Impact/Head 8, kept faithful). Authored/extracted content — logged for RT-rules review. (QA-073.)
export function criticalDamage() {
    return {
        "Energy": {
            "Arm": {
                1: 'A blast to the arm leaves it all numb and tingly. Tests made involving the arm are at –30 for 1 Round.',
                2: 'The attack smashes the arm, sending currents of energy crackling down to the fingers and up to the shoulder. The arm is useless for [[1d5]] Rounds and the character takes 1 level of Fatigue.',
                3: 'The attack burns the target\'s arm leaving him Stunned for 1 Round and inflicts 2 levels of Fatigue. The arm is useless for [[1d5]] Rounds.',
                4: 'The shock of the attack makes the target vomit. He is Stunned for 1 Round and takes 3 levels of Fatigue. The arm is useless for [[1d10]] Rounds.',
                5: 'The arm suffers superficial burns inflicting no small amount of pain on the target. The target\'s WS and BS are halved (round down) for 1 Round and the target takes [[1d5]] levels of Fatigue.',
                6: 'The attack wreathes the arm in flame, scorching clothing and armour, and temporarily fusing together the target\'s fingers. The target halves WS and BS for [[1d10]] Rounds, takes [[1d5]] levels of Fatigue, and must successfully Test Toughness or lose the use of the hand permanently.',
                7: 'With a terrible snapping sound, the heat of the attack boils the marrow in the target\'s arm, causing it to shatter. The target\'s arm is broken and until it is repaired the target counts as only having one arm. The target is Stunned for 1 Round and also takes [[1d5]] levels of Fatigue.',
                8: 'Energy sears through the arm at the shoulder, causing the limb to be severed from the body. The target must take a Toughness Test or become Stunned for 1 Round. In addition the target takes [[1d10]] levels of Fatigue and is suffering from Blood Loss. The target now only has one arm.',
                9: 'Fire consumes the target\'s arm, burning the flesh to a crisp right down to the bone. The target must make an immediate Toughness Test or die from shock. If he survives, however, the target takes [[1d10]] levels of Fatigue and is Stunned for 1 Round. The target now only has one arm.',
                10: 'The attack reduces the arm to a cloud of ash and sends the target crumbling to the ground where he immediately dies from shock, clutching his smoking stump.'
            },
            "Body": {
                1: 'A blow to the target\'s body steals a breath from his lungs. The target can take only a Half Action on his next Turn.',
                2: 'The blast punches the air from the target\'s body, inflicting 1 level of Fatigue upon him.',
                3: 'The attack cooks the flesh on the chest and abdomen, inflicting 2 levels of Fatigue and leaving the target Stunned for 1 Round.',
                4: 'The energy ripples all over the character, scorching his body and inflicting [[1d10]] levels of Fatigue.',
                5: 'The fury of the attack forces the target to the ground, helplessly covering his face and keening in agony. The target is knocked to the ground and must make an Agility Test or catch fire (see Special Damage). The target takes [[1d5]] levels of Fatigue and must take the Stand Action to regain his feet.',
                6: 'Struck by the full force of the attack, the target is sent reeling to the ground, smoke spiralling out of the wound. The target is knocked to the ground, Stunned for [[1d10]] Rounds, and takes [[1d5]] levels of Fatigue. In addition, he must make an Agility Test or catch fire (see Special Damage on page 210).',
                7: 'The intense power of the energy attack cooks the target\'s organs, burning his lungs and heart with intense heat. The target is Stunned for [[2d10]] Rounds and reduces his Toughness by half (round down).',
                8: 'As the attack washes over the target, his skin turns black and peels off while body fat seeps out of his clothing and armour. The target is Stunned for [[2d10]] Rounds and the attack halves his Strength, Toughness and Agility. The extensive scarring permanently halves the target\'s Fellowship characteristic.',
                9: 'The target is completely encased in fire, melting his skin and popping his eyes like superheated eggs. He falls to the ground a blackened corpse.',
                10: 'As above, except in addition, if the target is carrying any ammunition, there is a 50% chance it explodes. Unless they can make a successful Dodge Test, all creatures within [[1d5]] metres take [[1d10+5]] Explosive Damage. If the target carried any grenades or missiles, one round after the Damage was dealt they detonate where the target\'s body lies with the normal effects.'
            },
            "Head": {
                1: 'A grazing blow to the head frazzles the target\'s senses, imposing a –10 penalty to all Tests (except Toughness) for 1 Round.',
                2: 'The blast of energy dazzles the target, leaving him blinded for 1 Round.',
                3: 'The attack cooks off the target\'s ear, leaving him Stunned for 1 Round and inflicting 1 level of Fatigue.',
                4: 'The energy attack burns away all of the hairs on the target\'s head as well as leaving him reeling from the injury. The attack deals 2 levels of Fatigue and the target is blinded for [[1d5]] Rounds.',
                5: 'A blast of energy envelopes the target\'s head, burning his face and hair, and causing him to scream like a stuck Grox. In addition to losing his hair, he is blinded for [[1d10]] Rounds and takes 3 levels of Fatigue.',
                6: 'The attack cooks the target\'s face, melting his features and damaging his eyes. The target is blinded for the next [[1d10]] hours and permanently reduces his Fellowship characteristic by [[1d10]] points. The target also takes [[1d5]] levels of Fatigue.',
                7: 'In a gruesome display, the flesh is burned from the target\'s head, exposing charred bone and muscle underneath. The target is blinded permanently and takes [[1d10]] levels of Fatigue. Also, roll [[1d10]]. This is the target\'s new Fellowship, unless their Fellowship is already 10 or less, in which case nobody really notices the difference.',
                8: 'The target\'s head is destroyed in a convocation of fiery death. He does not survive.',
                9: 'Superheated by the attack, the target\'s brain explodes, tearing apart his skull and sending flaming chunks of meat flying at those nearby. The target is no more.',
                10: 'As above, except the target\'s entire body catches fire and runs off headless [[2d10]] metres in a random direction (use the Scatter Diagram on page 248). Anything flammable it passes, including characters, must make an Agility Test or catch fire (see Special Damage, page 260).'
            },
            "Leg": {
                1: 'A blow to the leg leaves the target gasping for air. The target gains 1 level of Fatigue.',
                2: 'A grazing strike against the leg slows the target for a bit. The target halves all movement for 1 Round.',
                3: 'The blast breaks the target\'s leg leaving him Stunned for 1 Round and halving all movement for [[1d5]] Rounds.',
                4: 'A solid blow to the leg sends electric currents of agony coursing through the target. The target takes [[1d5]] levels of Fatigue and halves all movement for [[1d5]] Rounds.',
                5: 'The target\'s leg endures horrific burn Damage, fusing clothing and armour with flesh and bone. The target takes 1 level of Fatigue and moves at half speed for [[2d10]] Rounds.',
                6: 'The attack burns the target\'s foot, charring the flesh and emitting a foul aroma. The target must successfully Test Toughness or lose the foot. On a success, the target\'s movement rates are halved until he receives medical attention. In addition, the target takes 2 levels of Fatigue.',
                7: 'The energy attack fries the leg, leaving it a mess of blackened flesh. The leg is broken and until repaired, the target counts as having lost the leg. The target must take a Toughness Test or become Stunned for 1 Round. In addition the target gains [[1d5]] levels of Fatigue. The target now only has one leg.',
                8: 'Energy sears through the bone, causing the leg to be severed. The target must take a Toughness Test or become Stunned for 1 Round. In addition the target gains [[1d10]] levels of Fatigue and is suffering from Blood Loss. The target now only has one leg.',
                9: 'The force of the attack reduces the leg to little more than a chunk of sizzling gristle. The target make a Challenging (+0) Toughness Test or die from shock. The leg is utterly lost.',
                10: 'In a terrifying display of power, the leg immolates and fire consumes the target completely. The target dies in a matter of agonising seconds'
            }
        },
        "Explosive": {
            "Arm": {
                1: 'The attack throws the limb backwards, painfully jerking it away from the body, inflicting 1 level of Fatigue.',
                2: 'The attack sends a fracture through the limb. The target drops anything held in the hand and takes 2 levels of Fatigue.',
                3: 'The explosion takes [[1d5]] fingers from the target\'s hand. The target takes 3 levels of Fatigue and anything carried in the hand is destroyed. If this is an explosive, it goes off. Messy.',
                4: 'The blast causes the target to howl in agony. He takes [[1d5]] levels of Fatigue, is Stunned for 1 Round, and the limb is useless until medical attention is received.',
                5: 'Fragments from the explosion tear into the target\'s hand, ripping away flesh and muscle alike. He must immediately Test Toughness or lose the hand. Even on a success, the hand is useless until medical attention is received. The target takes [[1d5]] levels of Fatigue.',
                6: 'The explosive attack shatters the bone and mangles the flesh turning the target\'s arm into a red ruin, inflicting [[1d5]] levels of Fatigue. The target\'s arm is broken and, until repaired, the target counts as having only one arm. In addition, the horrendous nature of the wound means that he now suffers from Blood Loss.',
                7: 'In a violent hail of flesh, the arm is blown apart. The target must immediately make a Challenging (+0) Toughness Test or die from shock. On a success, the target is Stunned for [[1d10]] rounds, takes [[1d10]] levels of Fatigue, and suffers Blood Loss. He now only has one arm.',
                8: 'The arm disintegrates under the force of the explosion taking a good portion of the shoulder and chest with it. The target is sent screaming to the ground, where he dies in a pool of his own blood and organs.',
                9: 'With a mighty bang the arm is blasted from the target\'s body, killing the target instantly in a rain of blood droplets. In addition, if the target was carrying a weapon with a power source in his hand (such as a power sword or chainsword) then it explodes, dealing [[1d10+5]] Impact Damage to anyone within two metres.',
                10: 'As above, except if the target is carrying any ammunition it explodes dealing [[1d10+5]] Impact Damage to anyone within [[1d10]] metres (this is in addition to Damage caused by exploding power weapons noted above). If the target is carrying any grenades or missiles, these too detonate on his person.'
            },
            "Body": {
                1: 'The target is blown backwards [[1d5]] metres and takes 1 level of Fatigue per metre travelled. He is Prone when he lands.',
                2: 'The target is blown backwards [[1d10]] metres, taking 1 level of Fatigue per metre travelled. If he strikes a solid object, he takes [[1d5]] additional levels of Fatigue.',
                3: 'The explosion destroys whatever armour protected the body. If the target wore none, the target is blown backwards [[1d10]] metres, as above but the target takes 2 levels of Fatigue for every metre travelled.',
                4: 'The explosion sends the target sprawling to the ground. He takes [[1d5]] levels of Fatigue, is Stunned for 1 Round, and must spend a Full Action to regain his feet.',
                5: 'Concussion from the explosion knocks the target to the ground and tenderises his innards. The target falls down Stunned for 1 Round and takes [[1d10]] levels of Fatigue.',
                6: 'Chunks of the target\'s flesh are ripped free by the force of the attack leaving large, weeping wounds. The target is Stunned for 1 Round, takes [[1d10]] levels of Fatigue and is now suffering Blood Loss.',
                7: 'The explosive force of the attack ruptures the target\'s flesh and scrambles his nervous system, knocking him to the ground. The target falls down, is Stunned for [[1d10]] Rounds and takes [[1d10]] levels of Fatigue. In addition, he now suffers Blood Loss and can only take Half Actions for the next [[1d10]] hours as he tries to regain control of his body.',
                8: 'The target\'s chest explodes outward, disgorging a river of partially cooked organs onto the ground, killing him instantly.',
                9: 'Pieces of the target\'s body fly in all directions as he is torn into bloody gobbets by the attack. In addition, if the target is carrying any ammunition, it explodes dealing [[1d10+5]] Impact Damage to anyone within [[1d10]] metres. If the target is carrying any grenades or missiles, these too detonate on the target\'s person.',
                10: 'As above, except anyone within [[1d10]] metres of the target is drenched in gore and must make a Challenging (+0) Agility Test or suffer a –10 penalty to Weapon Skill and Ballistic Skill Tests for 1 Round as blood fouls their sight.'
            },
            "Head": {
                1: 'The explosion leaves the target confused. He can take only a Half Action on his next Turn and takes 1 level of Fatigue.',
                2: 'The flash and noise leaves the target blind and deaf for 1 Round. The target takes 2 levels of Fatigue.',
                3: 'The detonation leaves the target\'s face a bloody ruin from scores of small cuts. The target takes 2 levels of Fatigue.',
                4: 'The force of the burst knocks the target to the ground and Stuns him for 1 Round. The target takes 2 levels of Fatigue.',
                5: 'The explosion flays the flesh from the target\'s face and bursts his eardrums with its force. The target is Stunned for [[1d10]] Rounds and is permanently deafened. The target takes [[1d5]] levels of Fatigue and can only take Half Actions for [[1d5]] hours. Finally, the target\'s Fellowship drops by [[1d10]] due to hideous scarring.',
                6: 'The target\'s head explodes under the force of the attack, leaving his headless corpse to spurt blood from the neck for the next few minutes. Needless to say this is instantly fatal.',
                7: 'Both head and body are blown into a mangled mess, instantly killing the target. In addition, if the target is carrying any ammunition it explodes dealing [[1d10+5]] Impact Damage to any creatures within [[1d5]] metres. If the target was carrying grenades or missiles, these too explode on the target\'s person.',
                8: 'In a series of unpleasant explosions the target\'s head and torso peel apart, leaving a gory mess on the ground. For the rest of the fight, anyone moving over this spot must make a Challenging (+0) Agility Test or fall prone.',
                9: 'The target ceases to exist in any tangible way, entirely turning into a kind of crimson mist. You don\'t get much deader than this, except...',
                10: 'As above, except such is the unspeakably appalling manner in which the target was killed, that any of the target\'s allies who are within two metres of where the target stood, must make an immediate Challenging (+0) Willpower Test or spend their next Turn fleeing from the attacker.'
            },
            "Leg": {
                1: 'A glancing blast sends the character backwards one metre.',
                2: 'The force of the explosion takes the target\'s feet out from under him. He lands Prone and takes 1 level of Fatigue.',
                3: 'The concussion cracks the target\'s leg, leaving him Stunned for 1 Round and halving all movement for [[1d5]] Rounds. The target takes 1 level of Fatigue.',
                4: 'The explosion sends the target spinning through the air. The target travels [[1d5]] metres away from the explosion and takes 1 level of Fatigue per metre travelled. It takes the target a Full Action to regain his feet and he halves all movement for [[1d10]] Rounds.',
                5: 'Explosive force removes part of the target\'s foot and scatters it over a wide area. The target must make an immediate Challenging (+0) Toughness Test or permanently lose the use of his foot, inflicting [[1d5]] levels of Fatigue. On a success, the target takes [[1d5]] levels of Fatigue and halves his movement until he receives medical attention.',
                6: 'The concussive force of the blast shatters the target\'s leg bones and splits apart his flesh, inflicting [[1d10]] levels of Fatigue. The leg is broken and, until repaired, the target counts as having only one leg. In addition, the horrendous nature of the wound means that he now suffers from Blood Loss.',
                7: 'The explosion reduces the target\'s leg into a hunk of smoking meat. The target must immediately make a Challenging (+0) Toughness Test or die from shock. On a successful Test, the target is still Stunned for [[1d10]] Rounds, takes [[1d10]] levels of Fatigue and suffers Blood Loss. He now has only one leg.',
                8: 'The blast tears the leg from the body in a geyser of gore, sending him crashing to the ground, blood pumping from the ragged stump: instantly fatal.',
                9: 'The leg explodes in an eruption of blood, killing the target immediately and sending tiny fragments of bone, clothing, and armour hurtling off in all directions. Anyone within two metres of the target takes [[1d10+2]] Impact Damage.',
                10: 'As above, except in addition, if the target is carrying any ammunition, it explodes dealing [[1d10+5]] Impact Damage to anyone within [[1d10]] metres. If the target is carrying any grenades or missiles, these too detonate on the target\'s person.'
            }
        },
        "Impact": {
            "Arm": {
                1: 'The attack numbs the target\'s limb causing him to drop anything held in that hand.',
                2: 'The strike leaves a deep bruise. The target takes 1 level of Fatigue.',
                3: 'The impact inflicts crushing pain and the target takes 1 level of Fatigue and drops whatever was held in that hand.',
                4: 'The impact leaves the target reeling from pain. The target is Stunned for 1 Round. The limb is useless for [[1d5]] Rounds and the target takes 1 level of Fatigue.',
                5: 'Muscle and bone take a pounding as the attack rips into the arm. The target\'s Weapon Skill and Ballistic Skill are both halved (round down) for [[1d10]] Rounds. In addition, the target takes 1 level of Fatigue and must make an Agility Test or drop anything held in that hand.',
                6: 'The attack pulverises the target\'s hand, crushing and breaking [[1d5]] fingers (for the purposes of this Critical, a thumb counts a finger). The target takes 1 level of Fatigue and must immediately make a Challenging (+0) Toughness Test or lose the use of his hand.',
                7: 'With a loud snap, the arm bone is shattered and left hanging limply at the target\'s side, dribbling blood onto the ground. The arm is broken and, until repaired, the target counts as having only one arm and takes 2 levels of Fatigue.',
                8: 'The force of the attack takes the arm off just below the shoulder, showering blood and gore across the ground. The target must immediately make a Challenging (+0) Toughness Test or die from shock. If he passes the Test, he is still Stunned for [[1d10]] rounds, takes [[1d5]] levels of Fatigue and is suffers from Blood Loss. He now only has one arm.',
                9: 'In a rain of blood, gore and meat, the target\'s arm is removed from his body. Screaming incoherently, he twists about in agony for a few seconds before collapsing to the ground and dying.',
                10: 'As above, except as the arm is removed it is smashed apart by the force of the attack, and bone, clothing and armour fragments fly about like shrapnel. Anyone within 2 metres of the target suffers [[1d5-3]] Impact Damage to a random location (see Table 9-8: Hit Locations).'
            },
            "Body": {
                1: 'A blow to the target\'s body steals the breath from his lungs. The target can take only a Half Action on his next Turn.',
                2: 'The impact punches the air from the target\'s body, inflicting 1 level of Fatigue.',
                3: 'The attack breaks a rib and inflicts 2 levels of Fatigue. The target is also Stunned for 1 Round.',
                4: 'The blow batters the target, shattering ribs. The target takes [[1d5]] levels of Fatigue and is Stunned for 1 Round.',
                5: 'A solid blow to the chest winds the target and he momentary doubles over in pain, clutching himself and crying in agony. The target takes [[1d5]] levels of Fatigue and is Stunned for 2 Rounds.',
                6: 'The attack knocks the target sprawling on the ground. The target flies [[1d5]] metres away from the attacker and falls prone (if the target strikes a wall of other solid object, he stops). The target takes [[1d5]] levels of Fatigue and is Stunned for 2 Rounds.',
                7: 'With an audible crack, [[1d5]] of the target\'s ribs break. The target can either lay down and stay still awaiting medical attention (a successful Medicae Test sets the ribs) or continue to take Actions, though each Round there is a 20% chance that a jagged rib pierces a vital organ and kills the character instantly. The target takes [[1d5]] levels of Fatigue.',
                8: 'The force of the attack ruptures several of the target\'s organs and knocks him down, gasping in wretched pain. The target suffers Blood Loss and takes [[1d10]] levels of Fatigue.',
                9: 'The target jerks back from the force of the attack, throwing back his head and spewing out a jet of blood before crumpling to the ground dead.',
                10: 'As above, except the target is thrown [[1d10]] metres away from the attack. Anyone in the target\'s path must make a Challenging (+0) Agility Test or be Knocked Down.'
            },
            "Head": {
                1: 'The impact fills the target\'s head with a terrible ringing noise. The target must make a Challenging (+0) Toughness Test or suffer 1 level of Fatigue.',
                2: 'The attack causes the target to see stars. The target takes 1 level of Fatigue and suffers a –10 penalty to Weapon Skill and Ballistic Skill Tests for 1 Round.',
                3: 'The target\'s nose explodes in a torrent of blood, blinding him for 1 Round and dealing 2 levels of Fatigue.',
                4: 'The concussive strike staggers the target, dealing [[1d5]] levels of Fatigue.',
                5: 'The force of the blow sends the target reeling in pain. The target is Stunned for 1 Round.',
                6: 'The target\'s head is snapped back by the attack leaving him staggering around trying to control mind-numbing pain. The target is Stunned for [[1d5]] Rounds and takes 2 levels of Fatigue.',
                7: 'The attack slams into the target\'s head, fracturing his skull and opening a long tear in his scalp. The target is Stunned for [[1d10]] Rounds and halves all movement for [[1d10]] hours.',
                8: 'Blood pours from the target\'s noise, mouth, ears and eyes as the attack pulverises his brain. He does not survive the experience.',
                9: 'The target\'s head bursts like an overripe fruit and sprays blood, bone and brains in all directions. Anyone within 4 metres of the target must make an Agility Test or suffer a –10 penalty to their WS and BS on their next Turn as gore gets in their eyes or on their visors.',
                10: 'As above, except that the attack was so powerful that it passes through the target and may hit another target nearby. If the hit was from a melee weapon, the attacker may immediately make another attack (with the same weapon) against any other target they can reach without moving. If the hit was from a ranged weapon they may immediately make another attack (with the same weapon) against any target standing directly behind the original target and still within range of their weapon.'
            },
            "Leg": {
                1: 'A light blow to the leg leaves the target gasping for air. The target takes 1 level of Fatigue.',
                2: 'A grazing strike against the leg slows the target. The target halves all movement for 1 Round and takes 1 level of Fatigue.',
                3: 'The blow breaks the target\'s leg leaving him Stunned for 1 Round and halving all movement for [[1d5]] Rounds. The target takes 1 level of Fatigue.',
                4: 'A solid blow to the leg sends lightning agony coursing through the target. The target takes [[1d5]] levels of Fatigue and halves all movement for [[1d5]] Rounds.',
                5: 'A powerful impact causes micro fractures in the target\'s bones, inflicting considerable agony. The target\'s Agility is reduced by –20 for [[1d10]] Rounds and he takes [[1d5]] levels of Fatigue.',
                6: 'Several of the tiny bones in the target\'s foot snap like twigs with cracking noises. The target must make an immediate Toughness Test or permanently lose the use of his foot. On a success, halve all movement until medical attention is received. The target takes 2 levels of Fatigue.',
                7: 'With a nasty crunch, the leg is broken and the target is knocked down mewling in pain. The target falls to the ground with a broken leg and, until it is repaired, he counts as only having one leg. The target takes 2 levels of Fatigue.',
                8: 'The force of the attack rips the lower half of the leg away in a stream of blood. The target must immediately make a Challenging (+0) Toughness Test or die from shock. On a success, the target is Stunned for [[1d10]] rounds, takes [[1d5]] levels of Fatigue and suffers Blood Loss. He now only has one leg.',
                9: 'The hit rips apart the flesh of the leg, causing blood to spray out in all directions. Even as the target tries futilely to stop the sudden flood of vital fluid, he falls to ground and dies in a spreading pool of gore.',
                10: 'As above, but such is the agony of the target\'s death that his piteous screams drowns out all conversation within [[2d10]] metres for the rest of the Round.'
            }
        },
        "Rending": {
            "Arm": {
                1: 'The slashing attack tears anything free that was held in this arm.',
                2: 'Deep cuts cause the target to drop whatever was held and inflicts 1 level of Fatigue.',
                3: 'The shredding attack sends the target screaming in pain. He takes 2 levels of Fatigue and drops whatever was held in that hand.',
                4: 'The attack flays the skin from the limb, filling the air with blood and the sounds of his screaming. The target falls prone from the agony and takes 2 levels of Fatigue. The limb is useless for [[1d10]] Rounds.',
                5: 'A bloody and very painful looking furrow is opened up in the target\'s arm. The target takes [[1d5]] levels of Fatigue and vomits all over the place in agony. He drops whatever was held and the limb is useless until medical attention is received. The target also suffers Blood Loss.',
                6: 'The blow mangles flesh and muscle as it hacks into the target\'s hand, liberating [[1d5]] fingers in the process (a roll of a 5 means that the thumb has been sheared off). The target takes 3 levels of Fatigue and must immediately make a Challenging (+0) Toughness Test or lose the use of his hand.',
                7: 'The attack rips apart skin, muscle, bone and sinew with ease, turning the target\'s arm into a dangling ruin and inflicting [[1d5]] levels of Fatigue. The arm is broken and, until repaired, the target counts as having only one arm. In addition, numerous veins have been severed and the target is now suffering from Blood Loss.',
                8: 'With an assortment of unnatural, wet ripping sounds, the arm flies free of the body trailing blood behind it in a crimson arc. The target must immediately make a Challenging (+0) Toughness Test or die from shock. If he passes the Test, he is Stunned for [[1d10]] Turns and suffers Blood Loss. He also takes [[1d10]] levels of Fatigue and now has only one arm.',
                9: 'The attack slices clean through the arm and into the torso, drenching the ground in blood and gore and killing the target instantly.',
                10: 'As above. However, as the arm falls to the ground its fingers spasm uncontrollably, pumping the trigger of any held weapon. If the target was carrying a ranged weapon there is a 5% chance that a single randomly determined target within [[2d10]] metres will be hit by these shots, in which case resolve a single hit from the target\'s weapon as normal.'
            },
            "Body": {
                1: 'If the target is not wearing armour on this location, he takes 1 level of Fatigue from a painful laceration. If he is wearing armour, there is no effect. Phew!',
                2: 'The attack Damages the target\'s armour, reducing its Armour Points by 1. In addition, the target takes 1 level of Fatigue. If not armoured, the target is also Stunned for 1 Round.',
                3: 'The attack rips a large patch of skin from the target\'s torso, leaving him gasping in pain. The target is Stunned for 1 Round and takes 2 levels of Fatigue.',
                4: 'A torrent of blood spills from the deep cuts, making the ground slick with gore. All characters attempting to move through this pool of blood must succeed on an Agility Test or fall Prone. The target takes [[1d5]] levels of Fatigue.',
                5: 'The blow opens up a long wound in the target\'s torso, causing him to double over in terrible pain. The target takes [[1d5]] levels of Fatigue.',
                6: 'The mighty attack takes a sizeable chunk out of the target and knocks him to the ground as he clutches the oozing wound, shrieking in pain. The target is Prone and takes [[1d10]] levels of Fatigue.',
                7: 'The attack cuts open the target\'s abdomen. The target can either choose to use one arm to hold his guts in (until a medic can bind them in place with a successful Medicae Test), or fight on regardless and risk a 20% chance each turn that his middle splits open, spilling his intestines all over the ground, causing an additional [[2d10]] Damage. In either case, the target takes [[1d5]] levels of Fatigue and is now suffering Blood Loss.',
                8: 'With a vile tearing noise, the skin on the target\'s chest comes away revealing a red ruin of muscle. The target must make a Challenging (+0) Toughness Test or die. If he passes, he permanently loses [[1d10]] from his Toughness, takes [[1d10]] levels of Fatigue, and now suffers Blood Loss.',
                9: 'The powerful blow cleaves the target from gullet to groin, revealing his internal organs and spilling them on to the ground before him. The target is now quite dead.',
                10: 'As above, except that the area and the target are awash with gore. For the rest of the fight, anyone moving within four metres of the target\'s corpse must make a Challenging (+0) Agility Test or fall prone.'
            },
            "Head": {
                1: 'The attack tears skin from the target\'s face dealing 1 level of Fatigue. If the target is wearing a helmet, there is no effect.',
                2: 'The attack slices open the target\'s scalp which immediately begins to bleed profusely. Due to blood pouring into the target\'s eyes, he suffers a -10 penalty to both Weapon Skill and Ballistic Skill for the next [[1d10]] Turns. The target takes 1 level of Fatigue.',
                3: 'The attack tears the target\'s helmet from his head. If wearing no helmet, the target loses an ear instead and inflicts 2 levels of Fatigue.',
                4: 'The attack scoops out one of the target\'s eyes, inflicting [[1d5]] levels of Fatigue and leaving the target Stunned for 1 Round.',
                5: 'The attack opens up the target\'s face, leaving him Stunned for [[1d5]] Rounds and inflicting [[1d5]] levels of Fatigue. If the target is wearing a helmet, the helmet comes off.',
                6: 'As the blow rips violently across the target\'s face—it takes with it an important feature. Roll [[1d10]] to see what the target has lost. 1-3: Eye (see Permanent Effects on page 201), 4-7: Nose (permanently halve Fellowship), 8-10: Ear (permanently reduce Fellowship by [[1d10]]; the wound can always be hidden with hair.) In addition, the target is now suffering Blood Loss and takes [[1d5]] levels of Fatigue.',
                7: 'In a splatter of skin and teeth, the attack removes most of the target\'s face. He is permanently blinded and has his Fellowship permanently reduced to [[1d10]], and also now has trouble speaking without slurring his words. In addition, the target is suffering from Blood Loss and takes [[1d10]] levels of Fatigue.',
                8: 'The blow slices into the side of the target\'s head causing his eyes to pop out and his brain to ooze down his cheek like spilled jelly. He\'s dead before he hits the ground.',
                9: 'With a sound not unlike a wet sponge being torn in half, the target\'s head flies free of its body and sails through the air, landing harmlessly [[2d10]] metres away with a soggy thud. The target is instantly slain.',
                10: 'As above, except the target\'s neck spews blood in a torrent, drenching all those nearby and forcing them to make a Challenging (+0) Agility Test. Anyone who fails the Test, suffers a -10 penalty to his Weapon Skill and Ballistic Skill Tests for 1 Round as gore fills his eyes or fouls his visor.'
            },
            "Leg": {
                1: 'The attack knocks the limb backwards, painfully jerking it away from the body. The target takes 1 level of Fatigue.',
                2: 'The target\'s kneecap splits open. He must make a Challenging (+0) Agility Test or fall prone. Regardless, he takes 1 level of Fatigue.',
                3: 'The attack rips a length of flesh from the leg, causing blood to gush from the wound. The target takes 1 level of Fatigue and suffers Blood Loss.',
                4: 'The attack rips the kneecap free from the target\'s leg, causing it to collapse out from under him. The target moves at half speed until medical attention is received. In addition, he takes 2 levels of Fatigue.',
                5: 'In a spray of blood, the target\'s leg is opened up, exposing bone, sinew and muscle. The target takes [[1d5]] levels of Fatigue and halves his movement for [[1d10]] hours.',
                6: 'The blow slices a couple of centimetres off the end of the target\'s foot. The target must make an immediate Challenging (+0) Toughness Test or permanently lose the use of his foot. On a success, movement is halved until he receives medical attention. In either case, the target takes [[1d5]] levels of Fatigue.',
                7: 'The force of the blow cuts deep into the leg, grinding against bone and tearing ligaments apart. The leg is broken and, until repaired, the target counts as having only one leg. In addition, the level of maiming is such that the target is now suffering from Blood Loss. He also takes [[1d10]] levels of Fatigue.',
                8: 'In a single bloody hack the leg is lopped off the target, spurting its vital fluids across the ground. The target must immediately make a Toughness Test or die from shock. On a success, the target is Stunned for [[1d10]] Rounds, takes [[1d10]] Fatigue and suffers Blood Loss. He now has only one leg.',
                9: 'With a meaty chop, the leg comes away at the hip. The target pitches to the ground howling in agony, before dying moments later.',
                10: 'As above, except that the tide of blood is so intense that, for the remainder of the battle, anyone making a Run or Charge Action within six metres of the target this Turn must make a Challenging (+0) Agility Test or fall over.'
            }
        }
    };
}

export function getFuzzy(obj, term) {

    if(obj[term]) return obj[term];
    for(const [name, entry] of Object.entries(obj)) {
        if(term.toUpperCase() === name.toUpperCase()) {
            return entry;
        }
    }

}

export function getCriticalDamage(type, location, amount) {
    const criticalDamageMap = criticalDamage();
    const damageMap = getFuzzy(criticalDamageMap, type);
    if(!damageMap) return null;
    // Hit locations are "Right Arm"/"Left Leg"/… but the crit tables are keyed by limb only
    // (Arm/Leg/Head/Body); strip the side so limb hits resolve to a table. (QA-074.)
    const limb = String(location ?? '').replace(/^\s*(right|left)\s+/i, '');
    const locationMap = getFuzzy(damageMap, limb);
    if(!locationMap) return null;
    return locationMap[amount > 10 ? 10 : amount];
}
