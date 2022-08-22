import { toInteger } from "lodash";
import {
  missionMapI,
  missionMapDisplayI,
} from "../../../poker.ui/src/shared/Interfaces";
import { MissionReport } from "../../../poker.ui/src/shared/MissionReport";

const missionMapDisplay: missionMapDisplayI[] = [
  {
    position: 0,
    progressbar: "0%",
    name: "Hands Played",
    target: 100,
    current: 0,
    xp: 100,
  },
  {
    position: 0,
    progressbar: "0%",
    name: "Seen the flop",
    target: 25,
    current: 0,
    xp: 250,
  },
  {
    position: 0,
    progressbar: "0%",
    name: "Seen the turn",
    target: 20,
    current: 0,
    xp: 300,
  },
  {
    position: 0,
    progressbar: "0%",
    name: "Seen the river",
    target: 15,
    current: 0,
    xp: 350,
  },
  {
    position: 0,
    progressbar: "0%",
    name: "Seen Showdown",
    target: 10,
    current: 0,
    xp: 400,
  },
];

const missionMap: missionMapI[] = [
  {
    name: "Hands played",
    field: "playedHands",
    target: 100,
    current: 0,
    xp: 100,
  },
  {
    name: "Seen the flop",
    field: "seeFlop",
    target: 25,
    current: 0,
    xp: 250,
  },
  {
    name: "Seen the turn",
    field: "seeTurn",
    target: 20,
    current: 0,
    xp: 300,
  },
  {
    name: "Seen the river",
    field: "seeRiver",
    target: 15,
    current: 0,
    xp: 350,
  },
  {
    name: "Seen showdown",
    field: "seeShowdown",
    target: 10,
    current: 0,
    xp: 400,
  },
  {
    name: "Win (BTN)",
    field: "wonBTN",
    target: 5,
    current: 0,
    xp: 250,
  },
  {
    name: "Win showdown (One pair)",
    field: "wonOnePair",
    target: 3,
    current: 0,
    xp: 500,
  },
  {
    name: "Lost hand after seen flop",
    field: "lostSeeFlop",
    target: 10,
    current: 0,
    xp: 250,
  },
  {
    name: "Win hand after seen flop",
    field: "wonSeeFlop",
    target: 10,
    current: 0,
    xp: 300,
  },
  {
    name: "Win 3+ on flop",
    field: "wonThreePlusOnFlop",
    target: 3,
    current: 0,
    xp: 500,
  },
  {
    name: "Win from CO",
    field: "wonCO",
    target: 4,
    current: 0,
    xp: 250,
  },
  {
    name: "Win from SB",
    field: "wonSB",
    target: 3,
    current: 0,
    xp: 250,
  },
  {
    name: "Win from BB",
    field: "wonBB",
    target: 3,
    current: 0,
    xp: 250,  
  },
  {
    name: "Win w/o showdown",
    field: "wonWoShow",
    target: 20,
    current: 0,
    xp: 500,
  },
  {
    name: "Fold Flop",
    field: "foldFlop",
    target: 5,
    current: 0,
    xp: 100,
  },
  {
    name: "Fold Turn",
    field: "foldTurn",
    target: 3,
    current: 0,
    xp: 100,
  },
  {
    name: "Win River w/o SD",
    field: "wonRiverWoShow",
    target: 3,
    current: 0,
    xp: 500,
  },
  {
    name: "Play from CO (VPIP)",
    field: "vpipCO",
    target: 7,
    current: 0,
    xp: 250,
  },
  {
    name: "Play from BTN (VPIP)",
    field: "vpipBTN",
    target: 0,
    current: 0,
    xp: 250,
  },
  {
    name: "Play from SB (VPIP)",
    field: "vpipSB",
    target: 5,
    current: 0,
    xp: 250,
  },
  {
    name: "Play from BB (VPIP)",
    field: "vpipBB",
    target: 10,
    current: 0,
    xp: 250,
  },
];

if (false) { //debug 
for (let missi of missionMap) {
  missi.target = toInteger(missi.target/10)+1;
}
}

const rewardsInitializer = {
  guid: "INIT",
  date: Date.now(),
  profitLoss: 0,
  handOnePair: 0, // rank = 2
  handTwoPairs: 0, // rank = 3
  seeFlop: 0,
  seeTurn: 0,
  seeRiver: 0,
  winHand: 0,
  fireWinning: 0,
  handsPlayed: 0,
  currentWinStreak: 0,
  winStreak: 0,
  position: 0,
  percentile: 0,
  missions: missionMap,
};

export { missionMap, rewardsInitializer, missionMapDisplay };
