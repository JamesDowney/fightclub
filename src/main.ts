import {
  autosellPrice,
  availableAmount,
  booleanModifier,
  canEquip,
  canInteract,
  equip,
  equippedAmount,
  familiarEquipment,
  getPower,
  historicalPrice,
  Item,
  itemType,
  myClass,
  npcPrice,
  numericModifier,
  print,
  printHtml,
  retrieveItem,
  Slot,
  stringModifier,
  toClass,
  toSlot,
  useFamiliar,
  visitUrl,
  weaponType,
} from "kolmafia";
import { $class, $familiars, $item, $items, $skill, $slot, $slots, get, have } from "libram";

// Booleans for each pvp mini
let laconic = false;
let verbosity = false;
let egghunt = false;
let meatlover = false;
let weaponDamage = false;
let moarbooze = false;
let showingInitiative = false;
let peaceonearth = false;
let broadResistance = false;
let coldResistance = false;
const hotResistance = false;
const sleazeResistance = false;
let stenchResistance = false;
const spookyResistance = false;
let lightestLoad = false;
let letterCheck = false;
const coldDamage = false;
let hotDamage = false;
let sleazeDamage = false;
const stenchDamage = false;
const spookyDamage = false;
let leastGear = false;
let deface = false;
let nines = false;
let fooddrop = false;
let familiarWeight = false;
let autosell = false;

//other variables
let currentLetter: string;
let nextLetter: string;
let dualWield = false;
let primaryWeapon: Item; //mainhand
let secondaryWeapon: Item; //offhand
//let tertiaryWeapon: Item; //hand
let bestOffhand: Item;

const pvpRules = visitUrl("peevpee.php?place=rules");

const famList = $familiars``.filter((fam) => have(fam));

const famEquipList = famList.map((fam) => familiarEquipment(fam));

const gearList = $items``.filter(
  (gear) =>
    ensureCanEquip(gear) &&
    $slot`none` !== toSlot(gear) &&
    !stringModifier(gear, "Modifiers").includes("Unarmed")
);

const buyGear = get("PvP_buyGear", false); // Will auto-buy from mall if below threshold price and better than what you have
const maxBuyPrice = get("PvP_maxBuyPrice", get("autoBuyPriceLimit")); // Max price that will be considered to auto buy gear if you don't have it
const topItems = get("PvP_topItems", 10); // Number of items to display in the output lists
const limitExpensiveDisplay = get("PvP_limitExpensiveDisplay", false); // Set to false to prevent the item outputs from showing items worth [defineExpensive) defineExpensive = get("PvP_defineExpensive") // define amount for value limiter to show 10,000,000 default
const defineExpensive = get("PvP_defineExpensive", 10000000);
let letterMomentWeight = get("PvP_letterMomentWeight", 6.0); // Example: An "S" is worth 3 letters in laconic/verbosity
const hexLetterWeight = get("PvP_hexLetterWeight", 4.0);
const numeralWeight = get("PvP_numeralWeight", 4.0);
let nextLetterWeight = get("PvP_nextLetterWeight", 0.1); // Example: allow a future letter to be a tie-breaker
const itemDropWeight = get("PvP_itemDropWeight", 4.0 / 5.0); // 4 per 5% drop Example: +8% items is worth 10 letters in laconic/verbosity
const meatDropWeight = get("PvP_meatDropWeight", 3.0 / 5.0); // 3 per 5% drop Example: +25% meat is worth 15 letters in laconic/verbosity
const boozeDropWeight = get("PvP_boozeDropWeight", 3.0 / 5.0); // 3 per 5% drop Example: +20% booze is worth 12 letters in laconic/verbosity
const foodDropWeight = get("PvP_foodDropWeight", 3.0 / 5.0); // 3 per 5% drop Example: +20% booze is worth 12 letters in laconic/verbosity
const initiativeWeight = get("PvP_initiativeWeight", 4.0 / 10.0); // 4 per 10% initiative Example: +20% initiative is worth 8 letters in laconic/verbosity
let combatWeight = get("PvP_combatWeight", 15.0 / 5.0); // 4 per 10% combat Example: +20% combat is worth 8 letters in laconic/verbosity
const resistanceWeight = get("PvP_resistanceWeight", 4.9);
let powerWeight = get("PvP_powerWeight", 5.0 / 10.0); // Example: 5 points for -10 points of power towards Lightest Load vs average(110) power in slot.
const damageWeight = get("PvP_damageWeight", 4.0 / 10.0); // Example: 4 points for 10 points of damage.
const negativeClassWeight = get("PvP_negativeClassWeight", -5); // Off class items are given a 0, adjust as you see fit.
const weaponDmgWeight = get("PvP_weaponDmgWeight", 0.5);
const nakedWeight = get("PvP_nakedWeight", 7.4); //WORK IN PROGRESS
const verbosityWeight = get("PvP_verbosityWeight", 1.0);
const familiarWeightWeight = get("PvP_familiarWeightWeight", 1.0); // WIP
const autosellWeight = get("PvP_autosellWeight", 1.0); // WIP

function getClass(item: Item) {
  return toClass(stringModifier(item, "Class"));
}

function letterCount(gear: Item, letter: string) {
  if (gear === $item`none`) return 0;
  return (gear.toString().toLowerCase().match(new RegExp(letter, "g")) || []).length;
}

function hexCount(gear: Item) {
  if (gear === $item`none`) return 0;
  return (
    gear
      .toString()
      .toLowerCase()
      .match(/([a-f]|[0-9])/g) || []
  ).length;
}

function numCount(gear: Item) {
  if (gear === $item`none`) return 0;
  return (gear.toString().match(/([0-9])/g) || []).length;
}

function nameLength(gear: Item) {
  if (gear === $item`none` && laconic) return 23;
  if (gear === $item`none`) return 0;
  return gear.toString().length;
}

function canAcquire(gear: Item) {
  return (
    (canInteract() &&
      buyGear &&
      maxBuyPrice >= historicalPrice(gear) &&
      historicalPrice(gear) !== 0) ||
    availableAmount(gear) - equippedAmount(gear) > 0
  );
}

function isChefStaff(gear: Item) {
  return itemType(gear) === "chefstaff";
}

function ensureCanEquip(gear: Item) {
  return (
    canEquip(gear) &&
    (!isChefStaff(gear) ||
      myClass() === $class`Avatar of Jarlsberg` ||
      have($skill`Spirit of Rigatoni`))
  );
}

function wikiLink(name: string) {
  return `<a href="http://kol.coldfront.net/thekolwiki/index.php/${name
    .split(" ")
    .join("_")
    .split("&quot;")
    .join("%5C%22")}">${name}</a>`;
}

function numericModifier2(gear: Item, modifier: string) {
  if (getClass(gear) !== $class`none` && getClass(gear) !== myClass()) {
    return negativeClassWeight;
  }
  stringModifier(gear, "Modifiers")
    .split(",")
    .forEach((itemModifier) => {
      if (
        itemModifier.includes("The Sea") ||
        itemModifier.includes("Unarmed") ||
        itemModifier.includes("sporadic")
      ) {
        return 0;
      } else {
        return numericModifier(gear, modifier);
      }
    });
  return numericModifier(gear, modifier);
}

/** function for calculating the value of a item based off the mini-game weighting */
function valuation(gear: Item) {
  let value = 0;

  if (laconic) value = (23 - nameLength(gear)) * verbosityWeight;
  else if (verbosity) value = nameLength(gear) * verbosityWeight;

  if (letterCheck) {
    value += letterCount(gear, currentLetter) * letterMomentWeight;
    value += letterCount(gear, nextLetter) * nextLetterWeight;
  }

  if (deface) value += hexCount(gear) * hexLetterWeight;

  if (nines) value += numCount(gear) * numeralWeight;

  if (egghunt) value += numericModifier2(gear, "Item Drop") * itemDropWeight;

  if (meatlover) value += numericModifier2(gear, "Meat Drop") * meatDropWeight;

  if (weaponDamage) value += numericModifier2(gear, "Weapon Damage") * weaponDmgWeight;

  if (moarbooze) value += numericModifier2(gear, "Booze Drop") * boozeDropWeight;

  if (fooddrop) value += numericModifier2(gear, "Food Drop") * foodDropWeight;

  if (showingInitiative) value += numericModifier2(gear, "Initiative") * initiativeWeight;

  if (peaceonearth) value += numericModifier2(gear, "Combat Rate") * combatWeight;

  if (broadResistance)
    value +=
      Math.min(
        numericModifier2(gear, "Cold Resistance"),
        Math.min(
          numericModifier2(gear, "Hot Resistance"),
          Math.min(
            numericModifier2(gear, "Spooky Resistance"),
            Math.min(
              numericModifier2(gear, "Sleaze Resistance"),
              numericModifier2(gear, "Stench Resistance")
            )
          )
        )
      ) * resistanceWeight;

  if (coldResistance) value += numericModifier2(gear, "Cold Resistance") * resistanceWeight;

  if (hotResistance) value += numericModifier2(gear, "Hot Resistance") * resistanceWeight;

  if (sleazeResistance) value += numericModifier2(gear, "Sleaze Resistance") * resistanceWeight;

  if (stenchResistance) value += numericModifier2(gear, "Stench Resistance") * resistanceWeight;

  if (spookyResistance) value += numericModifier2(gear, "Spooky Resistance") * resistanceWeight;

  if (coldDamage) {
    value +=
      numericModifier2(gear, "Cold Damage") * damageWeight +
      numericModifier2(gear, "Cold Spell Damage") * damageWeight;
  }

  if (hotDamage) {
    value +=
      numericModifier2(gear, "Hot Damage") * damageWeight +
      numericModifier2(gear, "Hot Spell Damage") * damageWeight;
  }

  if (sleazeDamage) {
    value +=
      numericModifier2(gear, "Sleaze Damage") * damageWeight +
      numericModifier2(gear, "Sleaze Spell Damage") * damageWeight;
  }

  if (stenchDamage) {
    value +=
      numericModifier2(gear, "Stench Damage") * damageWeight +
      numericModifier2(gear, "Stench Spell Damage") * damageWeight;
  }

  if (spookyDamage) {
    value +=
      numericModifier2(gear, "Spooky Damage") * damageWeight +
      numericModifier2(gear, "Spooky Spell Damage") * damageWeight;
  }

  if (lightestLoad) {
    switch (toSlot(gear)) {
      case $slot`hat`:
      case $slot`shirt`:
      case $slot`pants`:
        value += (110 - getPower(gear)) * powerWeight;
    }
  }

  if (familiarWeight) value += numericModifier2(gear, "Familiar Weight") * familiarWeightWeight;

  if (autosell) value += autosellPrice(gear) * autosellWeight;
  /******
   *
   *Snipped Bjornify and Enthroning here
   *
   *****/
  return value;
}

/** version that combines 2 items for 2hand compared to 1hand + offhand or dual 1hand.
Not used atm, 2hand gets -23 penality in Laconic for empty offhand, need to test Verbose */
function valuation2(gear1: Item, gear2: Item) {
  let value = 0;
  if (laconic) value = 23 - nameLength(gear1) - nameLength(gear2);
  else if (verbosity) value = nameLength(gear1) + nameLength(gear2);

  if (letterCheck)
    value +=
      (letterCount(gear1, currentLetter) + letterCount(gear2, currentLetter)) * letterMomentWeight;

  if (egghunt)
    value +=
      (numericModifier2(gear1, "Item Drop") + numericModifier2(gear2, "Item Drop")) *
      itemDropWeight;

  if (weaponDamage)
    value +=
      (numericModifier2(gear1, "Weapon Damage") + numericModifier2(gear2, "Weapon Damage")) *
      weaponDmgWeight;

  if (meatlover)
    value +=
      (numericModifier2(gear1, "Meat Drop") + numericModifier2(gear2, "Meat Drop")) *
      meatDropWeight;

  if (moarbooze)
    value +=
      (numericModifier2(gear1, "Booze Drop") + numericModifier2(gear2, "Booze Drop")) *
      boozeDropWeight;

  if (fooddrop)
    value +=
      (numericModifier2(gear1, "Food Drop") + numericModifier2(gear2, "Booze Drop")) *
      boozeDropWeight;

  if (showingInitiative)
    value +=
      (numericModifier2(gear1, "Initiative") + numericModifier2(gear2, "Initiative")) *
      initiativeWeight;

  if (peaceonearth)
    value +=
      (numericModifier2(gear1, "Combat Rate") + numericModifier2(gear2, "Combat Rate")) *
      combatWeight;

  if (broadResistance) {
    value +=
      Math.min(
        numericModifier2(gear1, "Cold Resistance"),
        Math.min(
          numericModifier2(gear1, "Hot Resistance"),
          Math.min(
            numericModifier2(gear1, "Spooky Resistance"),
            Math.min(
              numericModifier2(gear1, "Sleaze Resistance"),
              numericModifier2(gear1, "Stench Resistance")
            )
          )
        )
      ) *
        resistanceWeight +
      Math.min(
        numericModifier2(gear2, "Cold Resistance"),
        Math.min(
          numericModifier2(gear2, "Hot Resistance"),
          Math.min(
            numericModifier2(gear2, "Spooky Resistance"),
            Math.min(
              numericModifier2(gear2, "Sleaze Resistance"),
              numericModifier2(gear2, "Stench Resistance")
            )
          )
        )
      ) *
        resistanceWeight;
  }

  if (coldResistance) value += numericModifier2(gear1, "Cold Resistance") * resistanceWeight;

  if (hotResistance) value += numericModifier2(gear1, "Hot Resistance") * resistanceWeight;

  if (sleazeResistance) value += numericModifier2(gear1, "Sleaze Resistance") * resistanceWeight;

  if (stenchResistance) value += numericModifier2(gear1, "Stench Resistance") * resistanceWeight;

  if (spookyResistance) value += numericModifier2(gear1, "Spooky Resistance") * resistanceWeight;

  if (coldDamage) {
    value +=
      numericModifier2(gear1, "Cold Damage") * damageWeight +
      numericModifier2(gear1, "Cold Spell Damage") * damageWeight;
    value +=
      numericModifier2(gear2, "Cold Damage") * damageWeight +
      numericModifier2(gear2, "Cold Spell Damage") * damageWeight;
  }

  if (hotDamage) {
    value +=
      numericModifier2(gear1, "Hot Damage") * damageWeight +
      numericModifier2(gear1, "Hot Spell Damage") * damageWeight;
    value +=
      numericModifier2(gear2, "Hot Damage") * damageWeight +
      numericModifier2(gear2, "Hot Spell Damage") * damageWeight;
  }

  if (sleazeDamage) {
    value +=
      numericModifier2(gear1, "Sleaze Damage") * damageWeight +
      numericModifier2(gear1, "Sleaze Spell Damage") * damageWeight;
    value +=
      numericModifier2(gear2, "Sleaze Damage") * damageWeight +
      numericModifier2(gear2, "Sleaze Spell Damage") * damageWeight;
  }

  if (stenchDamage) {
    value +=
      numericModifier2(gear1, "Stench Damage") * damageWeight +
      numericModifier2(gear1, "Stench Spell Damage") * damageWeight;
    value +=
      numericModifier2(gear2, "Stench Damage") * damageWeight +
      numericModifier2(gear2, "Stench Spell Damage") * damageWeight;
  }

  if (spookyDamage) {
    value +=
      numericModifier2(gear1, "Spooky Damage") * damageWeight +
      numericModifier2(gear1, "Spooky Spell Damage") * damageWeight;
    value +=
      numericModifier2(gear2, "Spooky Damage") * damageWeight +
      numericModifier2(gear2, "Spooky Spell Damage") * damageWeight;
  }

  return value;
}

/** equips gear, but also acquires it from the mall if it is under budget */
function gearUp(slot: Slot, gear: Item) {
  if (
    availableAmount(gear) - equippedAmount(gear) <= 0 &&
    canInteract() &&
    buyGear &&
    maxBuyPrice >= historicalPrice(gear) &&
    historicalPrice(gear) !== 0
  )
    retrieveItem(1, gear);

  if (availableAmount(gear) - equippedAmount(gear) > 0) {
    return equip(slot, gear); //this is where the actual equipping happens
  } else return false;
}

/** pretty print item details related to the active minigames */
function gearString(gear: Item) {
  let gearString = `${wikiLink(gear.name)} `;
  if (laconic || verbosity) gearString += `, ${nameLength(gear)} chars`;
  if (letterCheck && letterCount(gear, currentLetter) > 0)
    gearString += `, ${letterCount(gear, currentLetter)} letter ${currentLetter}`;
  if (egghunt && numericModifier2(gear, "Item Drop") > 0)
    gearString += `, +${numericModifier2(gear, "Item Drop")}% Item Drop`;
  if (meatlover && numericModifier2(gear, "Meat Drop") > 0)
    gearString += `, +${numericModifier2(gear, "Meat Drop")}% Meat Drop`;
  if (moarbooze && numericModifier2(gear, "Booze Drop") > 0)
    gearString += `, +${numericModifier2(gear, "Booze Drop")}% Booze Drop`;
  if (fooddrop && numericModifier2(gear, "Food Drop") > 0)
    gearString += `, +${numericModifier2(gear, "Food Drop")}% Food Drop`;
  if (weaponDamage && numericModifier2(gear, "Weapon Damage") > 0)
    gearString += `, +${numericModifier2(gear, "Weapon Damage")} Weapon Damage`;
  if (showingInitiative && numericModifier2(gear, "Initiative") > 0)
    gearString += `, +${numericModifier2(gear, "Initiative")}% Initiative`;
  if (peaceonearth && numericModifier2(gear, "Combat Rate") > 0)
    gearString += `, +${numericModifier2(gear, "Combat Rate")}% Combat`;
  if (broadResistance) {
    const resist = Math.min(
      numericModifier2(gear, "Cold Resistance"),
      Math.min(
        numericModifier2(gear, "Hot Resistance"),
        Math.min(
          numericModifier2(gear, "Spooky Resistance"),
          Math.min(
            numericModifier2(gear, "Sleaze Resistance"),
            numericModifier2(gear, "Stench Resistance")
          )
        )
      )
    );

    if (resist > 0) gearString += `, +${resist} Elemental Resistance`;
  }
  if (coldResistance) {
    const resist = numericModifier2(gear, "Cold Resistance");
    if (resist > 0) gearString += `, +${resist} Elemental Resistance`;
  }
  if (hotResistance) {
    const resist = numericModifier2(gear, "Hot Resistance");
    if (resist > 0) gearString += `, +${resist} Elemental Resistance`;
  }
  if (sleazeResistance) {
    const resist = numericModifier2(gear, "Sleaze Resistance");
    if (resist > 0) gearString += `, +${resist} Elemental Resistance`;
  }
  if (stenchResistance) {
    const resist = numericModifier2(gear, "Stench Resistance");
    if (resist > 0) gearString += `, +${resist} Elemental Resistance`;
  }
  if (spookyResistance) {
    const resist = numericModifier2(gear, "Spooky Resistance");
    if (resist > 0) gearString += `, +${resist} Elemental Resistance`;
  }
  if (coldDamage) {
    const damage =
      numericModifier2(gear, "Cold Damage") + numericModifier2(gear, "Cold Spell Damage");
    if (damage > 0) gearString += `, +${damage} Cold Damage`;
  }
  if (hotDamage) {
    const damage =
      numericModifier2(gear, "Hot Damage") + numericModifier2(gear, "Hot Spell Damage");
    if (damage > 0) gearString += `, +${damage} Hot Damage`;
  }
  if (sleazeDamage) {
    const damage =
      numericModifier2(gear, "Sleaze Damage") + numericModifier2(gear, "Sleaze Spell Damage");
    if (damage > 0) gearString += `, +${damage} Sleaze Damage`;
  }
  if (stenchDamage) {
    const damage =
      numericModifier2(gear, "Stench Damage") + numericModifier2(gear, "Stench Spell Damage");
    if (damage > 0) gearString += `, +${damage} Stench Damage`;
  }
  if (spookyDamage) {
    const damage =
      numericModifier2(gear, "Spooky Damage") + numericModifier2(gear, "Spooky Spell Damage");
    if (damage > 0) gearString += `, +${damage} Spooky Damage`;
  }
  if (autosell) {
    const price = autosellPrice(gear);
    gearString += `, autosells for ${price} meat`;
  }
  if (autosell) {
    const famWeight = numericModifier2(gear, "Familiar Weight");
    gearString += `, +${famWeight} Familiar Weight`;
  }
  if (lightestLoad && $slots`hat, pants, shirt`.includes(toSlot(gear)))
    gearString += `, Power: ${getPower(gear)}`;
  if (availableAmount(gear) > 0) gearString += ", owned by player";
  else if (npcPrice(gear) > 0) gearString += `, for sale by npc for ${npcPrice(gear)}`;
  else if (historicalPrice(gear) > 0)
    gearString += `, for sale in  the mall for ${historicalPrice(gear)}`;
  gearString += `, value: ${valuation(gear)}`;
  return gearString;
}

/*******
	Snipped familiars
********/

/** loop through gear to find the best one you can get and equip */
function bestGear(slot: Slot) {
  const adjustedSlot = $slots`acc2, acc3`.includes(slot) ? $slot`acc1` : slot;
  const slotGear = gearList
    .filter((gear) => toSlot(gear) === adjustedSlot)
    .sort((gearA, gearB) => {
      if (valuation(gearA) > valuation(gearB)) return -1;
      if (valuation(gearA) < valuation(gearB)) return 1;
      else return 0;
    });
  for (const gear of slotGear) {
    if (booleanModifier(gear, "Single Equip") && equippedAmount(gear) > 0) {
      continue;
    }
    //try to handle Barely Dressed mini
    if (leastGear && valuation(gear) < nakedWeight) {
      printHtml(`<b>Best Available ${slot.toString()}:</b> ` + `None, value: ${nakedWeight}`);
      break;
    }
    //this simultaneously checks if a piece can be equipped and tries to do so
    if (
      valuation(gear) > 0 &&
      ((ensureCanEquip(gear) && gearUp(slot, gear)) ||
        (slot === $slot`familiar` &&
          canAcquire(gear) &&
          (famEquipList.includes(gear) ? useFamiliar(famList[famEquipList.indexOf(gear)]) : true) &&
          ensureCanEquip(gear) &&
          gearUp(slot, gear)))
    ) {
      printHtml(`<b>Best Available ${slot.toString()}:</b> ${gearString(gear)}`);
      printHtml(stringModifier(gear, "Modifiers"));
      break;
    }
  }
}

export function main(): void {
  print("pvp-script is a TS continuation of UberPvPOptimizer");
  if (pvpRules.includes("Verbosity")) {
    verbosity = true;
    printHtml("<li>Verbosity Demonstration</li>");
  }
  if (pvpRules.includes("It's a Mystery, Also!")) {
    verbosity = true;
    printHtml("<li>It's a Mystery, Also!</li>");
  }
  if (pvpRules.includes("Laconic")) {
    if (verbosity) {
      verbosity = false; // Ignore them.
    } else {
      laconic = true;
      printHtml("<li>Laconic Dresser</li>");
    }
  }
  if (pvpRules.includes("Dressed in Rrrags")) {
    if (verbosity) {
      verbosity = false; // Ignore them.
    } else {
      laconic = true;
      printHtml("<li>Laconic Dresser</li>");
    }
  }
  if (pvpRules.includes("Outfit Compression")) {
    if (verbosity) {
      verbosity = false; // Ignore them.
    } else {
      laconic = true;
      printHtml("<li>Outfit Compression</li>");
    }
  }
  if (pvpRules.includes("Showing Initiative")) {
    showingInitiative = true;
    printHtml("<li>Showing Initiative</li>");
  }
  if (pvpRules.includes("Early Shopper")) {
    showingInitiative = true;
    printHtml("<li>Early Shopper</li>");
  }
  if (pvpRules.includes("Peace on Earth")) {
    peaceonearth = true;
    combatWeight = -combatWeight;
    printHtml("<li>Peace on Earth</li>");
  }
  if (pvpRules.includes("Sooooper Sneaky")) {
    peaceonearth = true;
    combatWeight = -combatWeight;
    printHtml("<li>Sooooper Sneaky</li>");
  }
  if (pvpRules.includes("Smellin' Like a Stinkin' Rose")) {
    peaceonearth = true;
    combatWeight = -combatWeight;
    printHtml("<li>Smellin' Like a Stinkin' Rose</li>");
  }
  if (pvpRules.includes("The Egg Hunt")) {
    egghunt = true;
    printHtml("<li>The Egg Hunt</li>");
  }
  if (pvpRules.includes("The Optimal Stat")) {
    egghunt = true;
    printHtml("<li>The Optimal Stat</li>");
  }
  if (pvpRules.includes("Meat Lover")) {
    meatlover = true;
    printHtml("<li>Meat Lover</li>");
  }
  if (pvpRules.includes("Maul Power")) {
    weaponDamage = true;
    printHtml("<li>Maul Power</li>");
  }
  if (pvpRules.includes("Moarrrrrr Booze!")) {
    moarbooze = true;
    printHtml("<li>Moarrrrrr Booze!</li>");
  }
  if (pvpRules.includes("New Tastes")) {
    fooddrop = true;
    printHtml("<li>New Tastes</li>");
  }
  if (pvpRules.includes("A Nice Cold One")) {
    moarbooze = true;
    printHtml("<li>A Nice Cold One</li>");
  }
  if (pvpRules.includes("Holiday Spirit(s)!")) {
    moarbooze = true;
    printHtml("<li>Moarrr Booze!</li>");
  }
  if (pvpRules.includes("Thirrrsty forrr Booze")) {
    moarbooze = true;
    printHtml("<li>Thirrrsty forrr Booze</li>");
  }
  if (pvpRules.includes("Broad Resistance Contest")) {
    broadResistance = true;
    printHtml("<li>Broad Resistance Contest</li>");
  }
  if (pvpRules.includes("All Bundled Up")) {
    coldResistance = true;
    printHtml("<li>All Bundled Up</li>");
  }
  if (pvpRules.includes("Hibernation Ready")) {
    coldResistance = true;
    printHtml("<li>Hibernation Ready</li>");
  }
  /*******	Future proofed
	if (pvpRules.includes("TBD")) {
		hotResistance = true;
		printHtml("<li>TBD</li>");
	}
	if (pvpRules.includes("TBD")) {
		sleazeResistance = true;
		printHtml("<li>TBD</li>");
	}
********/
  if (pvpRules.includes("Hold Your Nose")) {
    stenchResistance = true;
    printHtml("<li>Hold Your Nose</li>");
  }
  /*******	Future proofed
	if (pvpRules.includes("TBD")) {
		spookyResistance = true;
		printHtml("<li>TBD</li>");
	}
	if (pvpRules.includes("TBD")) {
		coldDamage = true;
		printHtml("<li>TBD</li>");
	}
******/
  if (pvpRules.includes("Ready to Melt")) {
    hotDamage = true;
    printHtml("<li>Ready to Melt</li>");
  }
  if (pvpRules.includes("Fahrenheit 451")) {
    hotDamage = true;
    printHtml("<li>Fahrenheit 451</li>");
  }
  if (pvpRules.includes("Hot for Teacher")) {
    hotDamage = true;
    printHtml("<li>Hot for Teacher</li>");
  }
  if (pvpRules.includes("Innuendo Master")) {
    sleazeDamage = true;
    printHtml("<li>Innuendo Master</li>");
  }
  /*******	Future proofed
	if (pvpRules.includes("TBD")) {
		stenchDamage = true;
		printHtml("<li>TBD</li>");
	}
	if (pvpRules.includes("TBD")) {
		spookyDamage = true;
		printHtml("<li>TBD</li>");
	}
******/
  if (pvpRules.includes("Lightest Load")) {
    lightestLoad = true;
    printHtml("<li>Lightest Load</li>");
  }
  if (pvpRules.includes("Optimal Dresser")) {
    lightestLoad = true;
    printHtml("<li>Optimal Dresser</li>");
  }
  if (pvpRules.includes("Barely Dressed")) {
    leastGear = true;
    printHtml("<li>Barely Dressed</li>");
  }
  if (pvpRules.includes("Fashion Show")) {
    lightestLoad = true;
    powerWeight = -powerWeight;
    printHtml("<li>Fashion Show</li>");
  }
  if (pvpRules.includes("School Pride")) {
    lightestLoad = true;
    powerWeight = -powerWeight;
    printHtml("<li>School Pride</li>");
  }
  if (pvpRules.includes("Spirit of Noel")) {
    letterCheck = true;
    currentLetter = "L";
    nextLetter = "L";
    letterMomentWeight = -letterMomentWeight;
    nextLetterWeight = 0;
    printHtml("<li>Spirit of Noel</li>");
  }
  if (pvpRules.includes("Spirit Day")) {
    letterCheck = true;
    let start = pvpRules.indexOf(
      "It's one of those crazy school spirit days where everyone wears clothes with the letter <b>"
    );
    currentLetter = pvpRules.substring(start + 91, start + 92);
    //		currentLetter="X";			//hacky way to force optimizing a letter
    start = pvpRules.indexOf("Changing to <b>");
    nextLetter = pvpRules.substring(start + 15, start + 16);
    printHtml(`<li>Spirit Day: ${currentLetter}, next ${nextLetter} </li>`);
  }
  if (pvpRules.includes("Letter of the Moment")) {
    letterCheck = true;
    let start = pvpRules.indexOf("Who has the most <b>");
    currentLetter = pvpRules.substring(start + 20, start + 21);
    //		currentLetter="X";			//hacky way to force optimizing a letter
    start = pvpRules.indexOf("Changing to <b>");
    nextLetter = pvpRules.substring(start + 15, start + 16);
    printHtml(`<li>Letter of the Moment: ${currentLetter}, next ${nextLetter} </li>`);
  }
  if (pvpRules.includes("ASCII-7 of the moment")) {
    letterCheck = true;
    let start = pvpRules.indexOf("Who has the most <b>");
    currentLetter = pvpRules.substring(start + 20, start + 21);
    //		currentLetter="X";			//hacky way to force optimizing a letter
    start = pvpRules.indexOf("Changing to <b>");
    nextLetter = pvpRules.substring(start + 15, start + 16);
    printHtml(`<li>ASCII-7 of the moment: ${currentLetter}, next ${nextLetter} </li>`);
  }

  if (pvpRules.includes("DEFACE")) {
    deface = true;
    printHtml("<li>DEFACE</li>");
  }
  if (pvpRules.includes("Dressed to the 9s")) {
    nines = true;
    printHtml("<li>Dressed to the 9s</li>");
  }
  if (pvpRules.includes("Beast Master")) {
    familiarWeight = true;
    printHtml("<li>Beast Master</li>");
  }
  if (pvpRules.includes("Loot Hunter")) {
    egghunt = true;
    printHtml("<li>Loot Hunter</li>");
  }
  if (pvpRules.includes("Safari Chic")) {
    autosell = true;
    printHtml("<li>Safari Chic</li>");
  }
  printHtml("</ul>");
  $slots``.forEach((slot) => equip($item`none`, slot));
  printHtml("<br/>");

  $slots`hat, back, shirt, weapon, off-hand, pants, acc1, familiar`.forEach((slot) => {
    const slotGear = gearList
      .filter((gear) => toSlot(gear) === slot)
      .sort((gearA, gearB) => {
        if (valuation(gearA) > valuation(gearB)) return -1;
        if (valuation(gearA) < valuation(gearB)) return 1;
        else return 0;
      });
    printHtml(
      `<b>Slot <i>${slot.toString()}</i> items considered: ${
        slotGear.length
      } printing top items in slot:</b>`
    );

    if (limitExpensiveDisplay) {
      for (let i = 0; i < topItems - 1; i++) {
        printHtml(`${i + 1}.) ${gearString(slotGear[i])}`);
      }
    } else {
      let dumbCounter = 0;
      let dumbCounterToo = 0;
      while (dumbCounter <= topItems - 1) {
        if (historicalPrice(slotGear[dumbCounterToo]) <= defineExpensive) {
          printHtml(`${dumbCounter + 1}.) ${gearString(slotGear[dumbCounterToo])}`);
          dumbCounterToo = dumbCounterToo + 1;
          dumbCounter = dumbCounter + 1;
        } else {
          dumbCounterToo = dumbCounterToo + 1;
        }
      }
      printHtml("<br/>");
    }
  });

  bestGear($slot`hat`);
  bestGear($slot`back`);
  bestGear($slot`shirt`);

  if (have($skill`Double-Fisted Skull Smashing`)) {
    dualWield = true;
    printHtml("<b>Player can dual wield 1-hand weapons.</b>");
  }

  const weaponList = gearList
    .filter((item) => toSlot(item) === $slot`weapon`)
    .sort((gearA, gearB) => {
      if (valuation(gearA) > valuation(gearB)) return -1;
      if (valuation(gearA) < valuation(gearB)) return 1;
      else return 0;
    });

  let weaponIndex = 0;

  for (const weapon of weaponList) {
    if (canAcquire(weapon)) {
      primaryWeapon = weapon;
      weaponIndex = weaponList.indexOf(weapon);
      break;
    }
  }

  bestGear($slot`weapon`);

  if (
    availableAmount(primaryWeapon) - equippedAmount(primaryWeapon) > 1 ||
    (historicalPrice(primaryWeapon) < maxBuyPrice &&
      historicalPrice(primaryWeapon) > 0 &&
      !isChefStaff(primaryWeapon))
  )
    secondaryWeapon = primaryWeapon;
  else {
    for (const weapon of weaponList.slice(weaponIndex)) {
      if (
        canAcquire(weapon) &&
        weaponType(weapon) === weaponType(primaryWeapon) &&
        !isChefStaff(primaryWeapon)
      ) {
        secondaryWeapon = weapon;
        break;
      }
    }
  }
  const offhandList = gearList
    .filter((item) => toSlot(item) === $slot`off-hand`)
    .sort((gearA, gearB) => {
      if (valuation(gearA) > valuation(gearB)) return -1;
      if (valuation(gearA) < valuation(gearB)) return 1;
      else return 0;
    });
  for (let i = 0; i < offhandList.length; i++) {
    if (canAcquire(offhandList[i])) {
      bestOffhand = offhandList[i];
      break;
    }
  }

  if (
    !dualWield ||
    valuation2(primaryWeapon, bestOffhand) > valuation2(primaryWeapon, secondaryWeapon)
  ) {
    gearUp($slot`off-hand`, bestOffhand);
    printHtml(`<b>Best Available off-hand:</b> ${gearString(bestOffhand)}`);
    printHtml(stringModifier(bestOffhand, "Modifiers"));
  } else {
    gearUp; //p($slot[off - hand], secondaryWeapon);
    printHtml(`<b>Best 2nd weapon:</b> ${gearString(secondaryWeapon)}`);
    printHtml(stringModifier(secondaryWeapon, "Modifiers"));
  }
  bestGear($slot`pants`);
  bestGear($slot`acc1`);
  bestGear($slot`acc2`);
  bestGear($slot`acc3`);
  bestGear($slot`familiar`);

  /*******
	Snipped familiars********/
}
