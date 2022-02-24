// import { GameResultPlayer } from "./GameResultPlayer";
// import { DbPotResult } from "./DbPotResult";
// import { TableAuditEvent } from "./TableAuditEvent";

export class RewardsDetails {
    date: Date;
    guid: string;
    profitLoss: number;
    handRank: number;
    handRankEnglish: string;
    seeFlop: boolean;
    seeTurn: boolean;
    seeRiver: boolean;
    winHand: boolean;
}
