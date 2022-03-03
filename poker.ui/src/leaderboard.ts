import { autoinject } from "aurelia-framework";
import { EventAggregator } from 'aurelia-event-aggregator';
import { Util } from "./lib/util";
import { ApiService } from "./lib/api-service";
import { ClientMessage } from "./shared/ClientMessage";
import { LeaderboardResult, LeaderboardUser, ExchangeRateResult, RewardsReportResult } from "./shared/DataContainer";
import * as $ from 'jquery';
import { numberWithCommas } from "./shared/CommonHelpers";

@autoinject()
export class Leaderboard {
  subscriptions: { dispose: () => void }[] = [];
  results: LeaderboardUser[] = [];
  rates: IExchangeRateView[] = [];
  rewards: IRewardsReportView[] = [];
  constructor(private ea: EventAggregator, private util: Util, private apiService: ApiService) {

    this.subscriptions.push(ea.subscribe(LeaderboardResult, (msg: LeaderboardResult) => { this.handleLeaderboardResult(msg) }));
    this.subscriptions.push(ea.subscribe(ExchangeRateResult, (msg: ExchangeRateResult) => { this.handleExchangeRateResult(msg) }));
    this.subscriptions.push(ea.subscribe(RewardsReportResult, (msg: RewardsReportResult) => { this.handleRewardsReportResult(msg) }));

  }

  handleRewardsReportResult(data: RewardsReportResult) {
    // this.rewards.length=0;
    this.rewards = [];
    for (let result of data.rewards || []) {
      // this.rewards.length=0
      
      console.log(data.rewards);
      console.log(result);
      let view: IRewardsReportView = {
        guid: "anon" + result.guid.substring(0,4),
        profitLoss: result.profitLoss,
        currentMission: result.currentMission,
        seeFlop: result.seeFlop,
        seeTurn: result.seeTurn,
        seeRiver: result.seeRiver,
        winHand: result.winHand,
        handTwoPairs: result.handTwoPairs,
        handOnePair: result.handOnePair,
        missionProgress: result.missionProgress,
        percentile: result.percentile,
        handsPlayed: result.handsPlayed
     };
 
      
      // view.profitLoss = result.profitLoss;
      // view.guid = result.guid;
      console.log("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" + view);
      this.rewards.push(view);
    }
    console.log("=======================================================================");
    console.log("============================REWARDS==========================================");
    console.log(this.rewards);

    // for (let result of data.rewards || []) {
    //   let view: IRewardsReportView = {
    //     profitLoss: result.profitLoss,
    //     seeTurn: result.seeTurn

    //   };
    //   if (result.profitLoss) {
    //     view.profitLoss = result.profitLoss;
    //   }


    //   let existingView = this.rates.find(r => r.currency === view.currency);
    //   if (existingView) {
    //     existingView.percentChange = view.percentChange;
    //     existingView.price = view.price;
    //     existingView.changed = true;

    //   } else {
    //     this.rates.push(view);
    //   }
    // }



    //   let existingView = this.rates.find(r=>r.currency===view.currency);      
    //   if(existingView){
    //     existingView.percentChange = view.percentChange;
    //     existingView.price = view.price;        
    //     existingView.changed = true;

    //   }else{          
    //     this.rates.push(view);
    //   }
    // }

    // setTimeout(()=>{
    //   for(let u of this.rates)
    //     u.changed = false;
    // },2000);

  }

  handleExchangeRateResult(data: ExchangeRateResult) {

    
    for (let result of data.rates || []) {
      let view: IExchangeRateView = {
        currency: result.base,
        changed: false,
      };
      if (result.price) {
        let numDecimalPlaces = result.price >= 1 ? 2 : 3;
        view.price = '$xx' + numberWithCommas(result.price.toFixed(numDecimalPlaces));
        view.percentChange = parseFloat((result.change / result.price * 100).toFixed(2));
        view.volume = numberWithCommas(Math.round(result.volume));
      }


      let existingView = this.rates.find(r => r.currency === view.currency);
      if (existingView) {
        existingView.percentChange = view.percentChange;
        existingView.price = view.price;
        existingView.changed = true;

      } else {
        this.rates.push(view);
      }
    }

    setTimeout(() => {
      for (let u of this.rates)
        u.changed = false;
    }, 2000);

  }

  handleLeaderboardResult(data: LeaderboardResult) {


    for (let result of data.users) {
      let existingUser = this.results.find(r => r.screenName === result.screenName && r.currency === result.currency);
      if (existingUser) {
        (<any>existingUser).movement = result.profitLoss - existingUser.profitLoss;
        existingUser.profitLoss = result.profitLoss;
        existingUser.handsPlayed = result.handsPlayed;
        (<any>existingUser).changed = true;

      } else {
        this.results.push(result);
      }
    }

    this.results.sort((p1: LeaderboardUser, p2: LeaderboardUser) => { return p2.profitLoss - p1.profitLoss });
    setTimeout(() => {
      for (let u of this.results)
        (<any>u).changed = false;
    }, 2000);
  }

  attached() {
  }

  detached() {
    for (let sub of this.subscriptions)
      sub.dispose();
  }

}

interface IExchangeRateView {
  currency: string;
  volume?: string;
  price?: string;
  percentChange?: number;
  changed: boolean;
}
interface IRewardsReportView {
  profitLoss: number;
  guid: string;
  currentMission: number;
  seeFlop: number;
  seeTurn: number;
  seeRiver: number;
  winHand: number;
  handTwoPairs: number;
  handOnePair: number;
  missionProgress: number;
  percentile: number;
  handsPlayed: number;
}
