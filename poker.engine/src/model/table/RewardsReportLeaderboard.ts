export class RewardsReportLeaderboard {
    date: Date;
    guid: string;
    profitLoss: number;
    seeFlop: number;
    seeTurn: number;
    seeRiver: number;
    winHand: number;
    handOnePair: number; // rank = 2
    handTwoPairs: number; // rank = 3
    position: number; 
    percentile: number;
    currentMission: number;
    missionProgress: number;
    handsPlayed: number;
}