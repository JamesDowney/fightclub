import { equip, print } from "kolmafia";
import { $item, $slot, $slots } from "libram";
import { bestGear, bestHands, displayTopItems } from "./lib";

export function main(): void {
  print("pvp-script is a TS continuation of UberPvPOptimizer");
  $slots``.forEach((slot) => equip($item`none`, slot));
  displayTopItems();
  bestGear($slot`hat`);
  bestGear($slot`back`);
  bestGear($slot`shirt`);
  bestHands();
  bestGear($slot`pants`);
  bestGear($slot`acc1`);
  bestGear($slot`acc2`);
  bestGear($slot`acc3`);
  bestGear($slot`familiar`);
}
