﻿import { missionMapI } from '../../../../poker.ui/src/shared/Interfaces';
import { missionMap } from '../../configfiles/missionMaps';
import { rewardsInitializer } from '../../configfiles/missionMaps';
const percentile = require('percentile');
import { UserSmall } from './../../model/UserSmall';
import { TournamentResult } from './../../model/TournamentResult';
import { Server, Db, ReplaceOneOptions,MongoClient } from 'mongodb';
const ObjectID = require('mongodb').ObjectID;

import { User } from "../../model/User";
import { GamePotResult } from "../../model/TexasHoldemGameState";
import { ExchangeRate } from "../../../../poker.ui/src/shared/ExchangeRate";
import { RewardsReport } from "../../../../poker.ui/src/shared/RewardsReport";
import { MissionReport } from "../../../../poker.ui/src/shared/MissionReport";
import { ChatMessage, Account, MissionReportR } from "../../../../poker.ui/src/shared/DataContainer";
import { Currency, CurrencyUnit } from "../../../../poker.ui/src/shared/Currency";
import { PaymentType } from "../../../../poker.ui/src/shared/PaymentType";
import { Payment } from "../../model/Payment";
import { TableBalance, UserTableAccount } from "../../model/TableBalance";
import { IDataRepository } from "./IDataRepository";
import { IReconcilliationView } from "../../../../poker.admin.ui.angular/src/app/shared/IReconcilliationView";
import { Helpers } from '../../helpers';
import { ClientMessage } from '../../../../poker.ui/src/shared/ClientMessage';
import { Tournament } from '../../model/tournament';
import { TournamentRegistration } from '../../model/TournamentRegistration';
import { TableState } from '../../model/TableState';
import { TableConfig } from '../../model/TableConfig';
import { CurrencyConfig } from '../../model/CurrencyConfig';
import { AddressInfo } from '../../model/AddressInfo';
import { resolve } from 'path';
import { ChangeSeatHistory } from '../../model/ChangeSeatHistory';
import { LoginRequest } from '../../../../poker.ui/src/shared/login-request';
import { TableProcessorMessage, DbTableProcessorMessage } from '../../admin/processor/table-processor/TableProcessor';
import { DbGameResults } from '../../model/table/DbGameResults';
import { RewardsDetails } from '../../model/table/RewardsDetails';
import { SharedHelpers } from '../../shared-helpers';
import { Decimal } from '../../../../poker.ui/src/shared/decimal';
import { QueryMeta } from './QueryMeta';
import { inspect } from 'util'
import { RewardsReportLeaderboard } from '../../model/table/RewardsReportLeaderboard';
import { SaveUserEmail } from '../../model/SaveUserEmail'
import { assign, last, max } from 'lodash';

interface dailyLeaderboardHistory {
  guid: string;
  profitLoss: number;
  position: number;
  percentile: number;
  misProgress: number;    
}
export class DataRepository implements IDataRepository {




  private server: any;
  db: Db;
  dbName: string;
  // private percentil[]: number;
  static percentil: number[];
  constructor(dbName: string) {
    this.dbName = dbName;
  }

  async init() {
    DataRepository.percentil = [10, 30, 50];
    this.db = await MongoClient.connect(process.env.mongoDBHost);
    return this.db
  }

  getTablesConfig(): Promise<TableConfig[]> {
    var collection = this.db.collection('tableConfig');
    return collection.find({}).sort({ orderIndex: 1 }).toArray();
  }
  saveTableConfig(tableConfig: TableConfig): Promise<any> {

    if (typeof tableConfig._id === 'string') {
      tableConfig._id = ObjectID.createFromHexString(tableConfig._id);
    }
    return this.db.collection('tableConfig').save(tableConfig);
  }

  deleteTableConfig(id: string): Promise<any> {
    return this.db.collection('tableConfig').remove({ _id: ObjectID(id) });
  }
  deleteUser(guid: string): Promise<any> {
    return this.db.collection('users').remove({ guid: guid });
  }



  async getCurrencyConfig(currency: string): Promise<CurrencyConfig> {
    var collection = this.db.collection('currencyConfig');
    let config = await collection.findOne({ 'name': currency });
    return config;
  };
  async getCurrencyConfigs(): Promise<CurrencyConfig[]> {
    return this.db.collection('currencyConfig').find().toArray();
  };
  saveCurrencyConfig(config: CurrencyConfig): Promise<any> {
    return this.db.collection('currencyConfig').save(config);
  };

  async saveUser(user: User): Promise<void> {
    let findArgs: any = { "guid": user.guid }
    let upsert = false;
    if (user._id == null) {
      upsert = true;
      user.updateIndex = 0;
    } else {
      findArgs.updateIndex = user.updateIndex;
      user.updateIndex++;
    }
    let result = await this.db.collection('users').replaceOne(
      findArgs,
      user,
      { upsert: upsert }
    );
    if (result.result.n !== 1) {
      throw new Error(`expecting modified count of 1 instead it is ${result.result.n}`)
    } else if (result.upsertedId) {
      user._id = result.upsertedId._id;
    }
  }
  getUser(guid: string): Promise<User> {
    return this.getUserInternal({ guid: guid });
  }

  private getUserInternal(searchArgs: any) {
    var collection = this.db.collection('users');
    return collection.findOne(searchArgs)
      .then((user: User) => {
        if (user) {
          Object.setPrototypeOf(user, User.prototype);
        }
        return user;
      });
  }

  getUserByEmail(email: string): Promise<User> {
    if (Helpers.isNullOrWhitespace(email))
      return Promise.resolve(null);
    return this.getUserInternal({ email: { '$regex': email, '$options': 'i' } });
  }
  getUserByActivationToken(token: string): Promise<User> {
    if (Helpers.isNullOrWhitespace(token))
      return Promise.resolve(null);
    return this.getUserInternal({ activationToken: token });
  }
  getUserByResetPasswordToken(token: string): Promise<User> {
    if (Helpers.isNullOrWhitespace(token))
      return Promise.resolve(null);
    return this.getUserInternal({ resetPasswordToken: token });
  }



  getPayments(args: { guid?: string, currency?: string, type?: string, screenName?: string, showOption?: string }): Promise<Payment[]> {

    let mongoArgs = SharedHelpers.getPaymentQueryArgs(args);
    let limit = parseInt(args.showOption);
    if (isNaN(limit))
      limit = args.guid === undefined ? 1000 : 1000000;

    return this.db.collection('payments').find(mongoArgs).sort({ _id: -1 }).limit(limit).toArray();
  }

  async getTournamentBuyIns(tournamentId: string): Promise<Decimal> {

    let args = {
      tournamentId: tournamentId,
      type: PaymentType.outgoing
    }
    let total = new Decimal(0);
    for (let payment of await this.db.collection('payments').find(args).toArray()) {
      total = total.add(new Decimal(payment.amount));
    }
    total = total.dividedBy(CurrencyUnit.default)
    return total;
  }

  getPaymentsSince(id: string): Promise<Payment[]> {
    let args: any = {};
    if (id) {
      args._id = { $gte: new ObjectID(id) };
    }
    return this.db.collection('payments').find(args).toArray();;
  }


  getAddressInfoSince(id: string): Promise<AddressInfo[]> {
    let args: any = {};
    if (id) {
      args._id = { $gte: new ObjectID(id) };
    }
    return this.db.collection('addressInfo').find(args).toArray();;
  }

  getUnusedSweepPayment(guid: string): Promise<Payment> {
    var collection = this.db.collection('payments');
    return collection.findOne({ guid: guid, type: PaymentType.incoming, sweepFeeUsed: false });
  };
  savePayment(payment: Payment): any {
    if (payment._id && typeof payment._id === 'string') {
      payment._id = ObjectID.createFromHexString(payment._id);
    }
    if (typeof payment.timestamp === 'string') {
      payment.timestamp = new Date(payment.timestamp)
    }
    return this.db.collection('payments').save(payment);
  }


  compRewardsDetails(rewardsDetails: RewardsDetails[]): any {
    let mission = { plFlop: 0, plTurn: 0, plRiver: 0, plShowdown: 0, bestHandPre: false, bestHandFlop: false, bestHandTurn: false };
    let maxHandRankFlop = 0;
    let maxHandScoreFlop = 0;
    let maxHandRankTurn = 0;
    let maxHandScoreTurn = 0;
    let maxHandRankRiver = 0;
    let maxHandScoreRiver = 0;
    for (let counter = 0; counter < rewardsDetails.length; counter++) {
      if (rewardsDetails[counter].flopRank >= maxHandRankFlop) {
        maxHandRankFlop = rewardsDetails[counter].flopRank;
        if (rewardsDetails[counter].flopScore >= maxHandScoreFlop) {
          maxHandScoreFlop = rewardsDetails[counter].flopScore;
        }
      }
      if (rewardsDetails[counter].turnRank >= maxHandRankTurn) {
        maxHandRankTurn = rewardsDetails[counter].turnRank;
        if (rewardsDetails[counter].turnScore >= maxHandScoreTurn) {
          maxHandScoreTurn = rewardsDetails[counter].turnScore;
        }
      }
      if (rewardsDetails[counter].handRank >= maxHandRankRiver) {
        maxHandRankRiver = rewardsDetails[counter].handRank;
        if (rewardsDetails[counter].score >= maxHandScoreRiver) {
          maxHandScoreRiver = rewardsDetails[counter].score;
        }
      }
    }
    for (let counter = 0; counter < rewardsDetails.length; counter++) {
      console.log(rewardsDetails[counter]);
      // rank players
      if (rewardsDetails[counter].lastStreet == "flop") {
        mission.plFlop++;
        if (maxHandRankFlop == rewardsDetails[counter].flopRank && maxHandScoreFlop == rewardsDetails[counter].flopScore)
        rewardsDetails[counter].bestHandFlop = true;
      }
      if (rewardsDetails[counter].lastStreet == "turn") {
        mission.plFlop++;
        mission.plTurn++;
        if (maxHandRankFlop == rewardsDetails[counter].flopRank && maxHandScoreFlop == rewardsDetails[counter].flopScore)
        rewardsDetails[counter].bestHandFlop = true;
        if (maxHandRankTurn == rewardsDetails[counter].turnRank && maxHandScoreTurn == rewardsDetails[counter].turnScore)
        rewardsDetails[counter].bestHandTurn = true;
      }
      if (rewardsDetails[counter].lastStreet == "river") {
        mission.plFlop++;
        mission.plTurn++;
        mission.plRiver++;
        if (maxHandRankFlop == rewardsDetails[counter].flopRank && maxHandScoreFlop == rewardsDetails[counter].flopScore)
        rewardsDetails[counter].bestHandFlop = true;
        if (maxHandRankTurn == rewardsDetails[counter].turnRank && maxHandScoreTurn == rewardsDetails[counter].turnScore)
        rewardsDetails[counter].bestHandTurn = true;
        if (maxHandRankRiver == rewardsDetails[counter].score && maxHandScoreRiver == rewardsDetails[counter].score)
        rewardsDetails[counter].bestHandRiver = true;
      }
      if (rewardsDetails[counter].seenShowdown) {
        mission.plShowdown++;
      }
    }
    for (let counter = 0; counter < rewardsDetails.length; counter++) {
      rewardsDetails[counter].plFlop = mission.plFlop;
      rewardsDetails[counter].plTurn = mission.plTurn;
      rewardsDetails[counter].plRiver = mission.plRiver;
      rewardsDetails[counter].plShowdown = mission.plShowdown;
    }
    return rewardsDetails;
  }
  
  async saveRewardsDetails(rewardsDetails: RewardsDetails): Promise<any> {
    var collection = this.db.collection('rewardsDetail');
    console.log(rewardsDetails);
    let x = await collection.insertOne(rewardsDetails); 
    return x;
  }
  
  async notNaN(myNumber: any) {
    return (myNumber == undefined || isNaN(myNumber)) ? 0 : myNumber;
  }

  async updateRewardsReportXPMissions(guid: string, missionsCompleted: number, xp: number) {
    let query = { guid: guid };        
    let collectionU = this.db.collection('rewardsReportLeaderboard');
    let update = {
      $set: { 
              xp: xp,
              missionsCompleted: missionsCompleted
      }
    };
    await collectionU.updateOne(query,update);
  }

  async updateRewardsReportLeaderboard(rewardsDetails: RewardsDetails, guid: string) {
    let collection = this.db.collection('rewardsReportLeaderboard');
    let collectionU = this.db.collection('rewardsReportLeaderboard');
    const query = { guid: guid };
   
    let tempReport = await collection.findOne(query);
    let winStreak, currentWinStreak;
    let addProfitLoss = rewardsDetails.profitLoss
    let addShowdown = rewardsDetails.seenShowdown ? 1 : 0;
    let addOnePair = rewardsDetails.handRank == 2 ? 1 : 0;
    let addTwoPairs = rewardsDetails.handRank == 3 ? 1 : 0;
    let addSeeFlop = (rewardsDetails.lastStreet == "flop" || rewardsDetails.lastStreet == "turn" || rewardsDetails.lastStreet == "river") ? 1 : 0;
    let addSeeTurn = (rewardsDetails.lastStreet == "turn" || rewardsDetails.lastStreet == "river") ? 1 : 0;
    let position = rewardsDetails.position;
    let addSeeRiver = rewardsDetails.lastStreet == "river" ? 1 : 0;
    let addWinHand = rewardsDetails.winHand ? 1 : 0;
    let update, lastProfitLoss = 0, lastHandOnePair = 0, lastHandTwoPairs = 0, lastSeeFlop = 0, lastSeeTurn = 0, lastSeeRiver = 0, lastWinHand = 0, currentMission = 0, lastHandsPlayed = 0, lastShowdown = 0;

    if (tempReport != null) {
      winStreak = tempReport.winStreak ? tempReport.winStreak : 0;
      currentWinStreak = rewardsDetails.winHand ? ++tempReport.currentWinStreak : 0;
      currentWinStreak > winStreak ? winStreak = currentWinStreak: winStreak;
      lastProfitLoss = await this.notNaN(tempReport.profitLoss);
      lastHandOnePair = await this.notNaN(tempReport.handOnePair);
      lastHandTwoPairs = await this.notNaN(tempReport.handTwoPairs);
      lastSeeFlop = await this.notNaN(tempReport.seeFlop);
      lastSeeTurn = await this.notNaN(tempReport.seeTurn);
      lastSeeRiver = await this.notNaN(tempReport.seeRiver);
      lastShowdown = await this.notNaN(tempReport.seenShowdown);
      lastWinHand = (tempReport.winHand == undefined || isNaN(tempReport.winHand) || tempReport.winHand == false) ? 0 : tempReport.winHand;
      lastHandsPlayed = await this.notNaN(tempReport.handsPlayed);
      let totProfitLoss = lastProfitLoss + addProfitLoss;
      for (let k = 0; k < tempReport.missions.length; k++) {
        console.log(JSON.stringify(tempReport.missions[k]));
        // let curMis = tempReport.missions[k].current;
        switch (tempReport.missions[k].field) {
          case "playedHands":
            tempReport.missions[k].current = lastHandsPlayed + 1;
            break;
          case "seeFlop":
            tempReport.missions[k].current = addSeeFlop + lastSeeFlop;
            break;
          case "seeTurn":
            tempReport.missions[k].current = addSeeTurn + lastSeeTurn;
            break;
          case "seeRiver":
            tempReport.missions[k].current = addSeeRiver + lastSeeRiver;
            break;
          case "seeShowdown":
            tempReport.missions[k].current = addShowdown + lastShowdown;
            break;
          case "wonBTN": {
            if (position === 0 && addWinHand) {
              tempReport.missions[k].current++;
            }
            break;
          }
          case "wonOnePair":
            {
              if (addOnePair && addWinHand) {
                tempReport.missions[k].current++;
              }
            }
            break;
          case "lostSeeFlop":
            if (addSeeFlop === 1 && addWinHand === 0) {
              tempReport.missions[k].current++;
            }
            break;
          case "wonSeeFlop":
            if (addSeeFlop === 1 && addWinHand === 1) {
              tempReport.missions[k].current++;
            }
            break;
          case "wonThreePlusOnFlop":
            {
            }
            break;
          case "wonCO":
            break;
          case "wonHand":
            tempReport.missions[k].current = addWinHand + lastWinHand;
            break;
          case "wonSB":
            if (position === 1 && addWinHand) {
              tempReport.missions[k].current++;
            }
            break;
          case "wonBB": {
            if (position===2 && addWinHand) {
              tempReport.missions[k].current++;
            }
            break;
          }
          case "wonWoShow":
            {
              if (addShowdown!=1 && addWinHand ===1) {
                tempReport.missions[k].current++;
              }
            }
            break;

          case "foldFlop": {
            if (rewardsDetails.lastStreet === "flop" && !addWinHand) {
              tempReport.missions[k].current++;
            }
            break;
          }
          case "foldTurn": {
            if (rewardsDetails.lastStreet === "turn" && !addWinHand) {
              tempReport.missions[k].current++;
            }
            break;
          }
          case "wonRiverWoShow":
            if (addShowdown!=1 && addWinHand ===1 && addSeeRiver) {
              tempReport.missions[k].current++;
            }
          break;
          case "vpipCO":
            {
            }
            break;
          case "vpipBTN":
            {
            }
            break;
          case "vpipSB":
            {
            }
            break;
          case "vpipBB":
            {
            }
            break;
          default:
            console.log(`Mission ${tempReport.missions[k].field} not found`);
            break;
        }
      }
      tempReport.profitLoss = totProfitLoss;
      tempReport.seeFlop = addSeeFlop + lastSeeFlop;
      tempReport.winHand = addWinHand + lastWinHand;
      tempReport.handOnePair = addOnePair + lastHandOnePair;
      tempReport.handTwoPairs = addTwoPairs + lastHandTwoPairs;
      tempReport.seeTurn = addSeeTurn + lastSeeTurn;
      tempReport.seeRiver = addSeeRiver + lastSeeRiver;
      tempReport.handsPlayed = lastHandsPlayed + 1;

      let query = { guid: guid };        
      let update = {
        $set: tempReport
      }
      await collectionU.updateOne(query,update);
    }
  }

  async fillPercentile() {
    let colRewardsReport = this.db.collection('rewardsReportLeaderboard');
    let positions = await colRewardsReport.find().toArray(async function (err, result) {
      if (err) throw err;
      let percPl = [];
      for (let counter = 0; counter < result.length; counter++) {
        // console.log(result[counter].profitLoss);
        percPl.push(result[counter].profitLoss);
      }
      DataRepository.percentil = await percentile([10, 25, 40, 60, 75, 90], percPl);
      let playerPosition: Number = 0;
      let totProfitLoss: Number;
      let percentil = DataRepository.percentil;
      let playerPercentile = 0;
      for (let counter = 0; counter < result.length; counter++) {
        totProfitLoss = result[counter].profitLoss;
        switch (true) {
          case (totProfitLoss >= percentil[5]): {
            playerPercentile = 2;
            break;
          }
          case (totProfitLoss >= percentil[4]): {
            playerPercentile = 1.5;
            break;
          }
          case (totProfitLoss >= percentil[3]): {
            playerPercentile = 1.25;
            break;
          }
          case (totProfitLoss >= percentil[2]): {
            playerPercentile = 1;
            break;
          }
          case (totProfitLoss >= percentil[1]): {
            playerPercentile = 0.5;
            break;
          }
          case (totProfitLoss >= percentil[0]): {
            playerPercentile = 0.2;
            break;
          }
          default:
            playerPercentile = 0.1;
        }
        const query = { guid: result[counter].guid };
        let update = {
          $set: {
            percentile: playerPercentile
          }
        }
        colRewardsReport.updateOne(query, update);
      }
    });
  }

  
  saveGame(game: DbGameResults): any {
    var collection = this.db.collection('games');
    return collection.save(game);
  }
  saveExchangeRate(exchangeRate: ExchangeRate): any {
    return this.db.collection('exchangeRates').replaceOne(
      { "base": exchangeRate.base, "target": exchangeRate.target },
      exchangeRate,
      { upsert: true }
    );
  }

  getExchangeRate(base: string): Promise<ExchangeRate> {
    var collection = this.db.collection('exchangeRates');
    return collection.findOne({
      "base": {
        $regex: new RegExp(base, "i")
      }
    });

  }

  getExchangeRates(): Promise<ExchangeRate[]> {
    return this.db.collection('exchangeRates').find({}).sort({ _id: 1 }).toArray();
  }

  async getRewards(guid: string): Promise<any> {
    let rewards = await this.db.collection('rewards').findOne({ guid: guid });
    return rewards;

  }

  getRewardsReport(): Promise<RewardsReport[]> {
    let x = this.db.collection('rewardsReportLeaderboard').find({}, { guid:1, profitLoss:1, position:1, xp:1, missionsCompleted:1, fireWinning: 1, missions:1 }).sort({ profitLoss: -1 }).toArray(); 
    //let x = this.db.collection('rewardsReportLeaderboard').find({}, {}).sort({ profitLoss: -1 }).toArray();
    return x;
  }
  //...
 
  async resetBalances(balance: number): Promise<any> {
    let x;
    try {
      x = await this.db.collection("tableBalance").drop();
    } catch (e) {
      console.log("tableBalance not found");
    }
    x = await this.db.collection('rewardsReportLeaderboard').find({}, { guid: 1, profitLoss: 1, position: 1, percentile: 1, xp: 1, misProgress: 1 }).toArray();
    let tmpCol = {};
    let y=[];
    let dateReset = Date.now();
    try {
    for (let counter = 0; counter < x.length; counter++)
      {
        tmpCol = { date: dateReset, guid: x[counter].guid, profitLoss: x[counter].profitLoss, position: x[counter].position, percentile: x[counter].percentile, misProgress: x[counter].misProgress };
        y.push(tmpCol);
      }  
    } catch(e) { console.log(e); };
    await this.db.collection('historicalLeaderboard').insertMany(y);
    try {
      x = await this.db.collection("rewardsReportLeaderboard").drop();
    } catch (e) {
      console.log("Error dropping table rewardsReportLeaderboard");
    }
    return this.db.collection('userAccounts').updateMany(
      {}, {$set: { balance: balance }});
  }

  saveClientMessage(message: ClientMessage, tableId: string, guid: string): Promise<any> {
    let data = message;
    if (message.loginRequest != null) {
      data = new ClientMessage();
      data.loginRequest = new LoginRequest(message.loginRequest.email, '****');
    }
    return this.db.collection('messages').save({
      guid: guid,
      tableId: tableId,
      data: data
    });
  }

  async initRewards(guid: string): Promise<any> {
    let collection = this.db.collection('rewardsReportLeaderboard');
    let init = JSON.parse(JSON.stringify(rewardsInitializer));
    init.guid = guid;
    return collection.insertOne(init);    
  }

  saveChat(chatMessage: ChatMessage): Promise<any> {
    return this.db.collection('chatMessages').save(chatMessage);
  }
  getChatMessages(tableId?: string): Promise<ChatMessage[]> {
    //let tableIdStr = typeof tableId === 'string' ? tableId : (<any>tableId).toHexString();
    let tableIdStr = tableId != null ? tableId.toString() : null;

    return this.db.collection('chatMessages').find({ tableId: tableIdStr }).sort({ _id: -1 }).limit(100).toArray();
  }

  getGames(tableId: string, userGuid: string, tournamentId: string, skip?: number, limit?: number): Promise<DbGameResults[]> {
    let searchObj: any = {};
    if (tournamentId)
      searchObj.tournamentId = tournamentId;
    if (tableId)
      searchObj["tableId"] = tableId;
    if (userGuid)
      searchObj["players.guid"] = userGuid;
    let query = this.db.collection('games').find(searchObj).sort({ _id: -1 });
    if (skip != null)
      query.skip(skip);
    if (limit != null)
      query.limit(limit);

    return query.toArray();
  }

  async updateUserAccount(guid: string, currency: string, balance: number, updateIndex?: number | undefined): Promise<any> {
    if (balance < 0 && updateIndex == undefined) {
      throw new Error(`updateIndex must be defined for decrement operations`)
    }
    let findArgs: any = { "guid": guid, "currency": currency.toLowerCase() };
    let updateArgs: any = { $inc: { "balance": balance }, }
    let options: ReplaceOneOptions = {};
    if (updateIndex != undefined) {
      findArgs.updateIndex = updateIndex;
      updateArgs.$set = { "updateIndex": ++updateIndex };
    } else {
      updateArgs.$setOnInsert = { "updateIndex": 0 };
      options.upsert = true;
    }

    let result = await this.db.collection('userAccounts').updateOne(
      findArgs,
      updateArgs,
      options
    );

    if (result.result.n !== 1) {
      throw new Error(`expecting modified count of 1 instead it is ${result.result.n}`)
    }
    return result;
  }

  getUserAccount(guid: string, currency: string): Promise<Account> {
    return this.db.collection('userAccounts').findOne({ "guid": guid, "currency": currency.toLowerCase() });
  }
  getUserAccounts(guid: string): Promise<Account[]> {
    return this.db.collection('userAccounts').find({ "guid": guid }).toArray();
  }

  ensureTableBalance(tableId: string, currency: string): Promise<TableBalance> {
    let collection = this.db.collection('tableBalance');
    return collection.find({ tableId: tableId.toString() }).toArray()
      .then((arr: any) => {
        if (arr.length === 0) {
          let tableBalance = new TableBalance(tableId.toString(), currency);
          return collection.save(tableBalance)
            .then(() => Promise.resolve(tableBalance));
        } else {
          return Promise.resolve(arr[0]);
        }
      });
  }

  updateTableBalance(tableId: string, account: UserTableAccount): Promise<any> {
    return this.db.collection('tableBalance').update(
      { tableId: tableId.toString(), 'accounts.userGuid': { $ne: account.userGuid } },
      { $push: { accounts: account } });
  }
  updateTableBalances(tableId: string, currency: string, accounts: UserTableAccount[]): Promise<any> {
    let tableBalance = new TableBalance(tableId, currency);
    tableBalance.accounts = accounts;
    return this.db.collection('tableBalance').replaceOne({ 'tableId': tableId }, tableBalance);
  }

  removeTableBalance(tableId: string, userGuid: string): Promise<any> {
    return this.db.collection('tableBalance').update(
      { tableId: tableId.toString() },
      { $pull: { 'accounts': { userGuid: userGuid } } }
    );
  }
  getTableBalance(tableId: string): Promise<any> {
    return this.db.collection('tableBalance').findOne({ tableId: tableId.toString() });
  }

  getTableBalancesByUserGuid(userGuid: string): Promise<TableBalance[]> {
    return this.db.collection('tableBalance').find({ 'accounts.userGuid': userGuid }).toArray();
  }
  getUsers(searchTerm: string, limit: number, includeAnon: boolean): Promise<UserSmall[]> {
    var collection = this.db.collection('users');
    var obj = {};
    if (!includeAnon) {
      obj = { email: { $exists: true } }
    }
    if (searchTerm && searchTerm.trim()) {
      if (searchTerm.length > 10)
        obj = { guid: searchTerm };
      else
        obj = { $or: [{ screenName: { '$regex': searchTerm, '$options': 'i' }, }, { email: { '$regex': searchTerm, '$options': 'i' }, }] };
    }

    return collection.find(obj, { screenName: 1, email: 1, guid: 1 }).sort({ _id: -1 }).limit(limit).toArray();
  }

  getGamesByUserGuid(userGuid: string, currency: string): Promise<DbGameResults[]> {
    return this.db.collection('games').find({ "players.guid": userGuid, "currency": currency }).sort({ _id: -1 }).toArray();
  }


  saveReconcilliationView(view: IReconcilliationView): Promise<any> {
    return this.db.collection('reconcilliationViews').save(view);
  }
  async getReconcilliationView(): Promise<IReconcilliationView> {
    let arr = await this.db.collection('reconcilliationViews').find().sort({ _id: -1 }).limit(1).toArray();
    if (arr.length)
      return arr[0];
    return null;
  }

  getPaymentByTxId(currency: string, txId: string): Promise<Payment | null> {
    return this.db.collection('payments').findOne({ currency: currency, txId: txId });
  }
  getPaymentIncomingByTournamentId(tournamentId: string, userGuid: string): Promise<Payment | null> {
    return this.db.collection('payments').findOne({ tournamentId: tournamentId, guid: userGuid, type: PaymentType.incoming });
  }
  getPaymentById(id: string): Promise<Payment> {
    return this.db.collection('payments').findOne({ '_id': ObjectID(id) });
  }
  getUsersByScreenName(screenName: string): Promise<User[]> {

    return this.db.collection('users').find({ screenName: { '$regex': screenName, '$options': 'i' } }).toArray()
      .then((arr: User[]) => {
        for (let user of arr)
          Object.setPrototypeOf(user, User.prototype);
        return arr;
      });
  }

  mergeGames(mergeFromGuid: string, mergeToGuid: string): Promise<any> {
    //return this.db.collection('games').updateMany(
    //  { "players.guid": mergeFromGuid },
    //  { $set: { "players.$.guid": mergeToGuid } });

    return this.db.collection('games').find({ "players.guid": mergeFromGuid }).toArray()
      .then((games: any[]) => {
        return Promise.all(games.map(g => { this.mergeGame(g, mergeFromGuid, mergeToGuid) }));
      });

  }

  mergeGame(game: DbGameResults, mergeFromGuid: string, mergeToGuid: string): Promise<any> {
    for (let player of game.players) {
      if (player.guid === mergeFromGuid)
        player.guid = mergeToGuid;
    }
    for (let auditEvent of game.auditEvents) {
      if (auditEvent.userGuid === mergeFromGuid)
        auditEvent.userGuid = mergeToGuid;
    }
    for (let potResult of game.potResults) {
      for (let allocation of potResult.allocations) {
        if (allocation.player.guid === mergeFromGuid)
          allocation.player.guid = mergeToGuid;
      }
    }
    return this.saveGame(game);
  }

  mergePayments(mergeFromGuid: string, mergeToGuid: string): Promise<any> {
    return this.db.collection('payments').updateMany(
      { "guid": mergeFromGuid },
      { $set: { "guid": mergeToGuid } });
  }
  deleteUserReconcilliation(guid: string): Promise<any> {
    return this.db.collection('userReconcilliationResults').remove({ userGuid: guid });
  }




  saveTournmanet(tournmanet: Tournament): Promise<any> {
    if (tournmanet._id && typeof tournmanet._id === 'string') {
      tournmanet._id = ObjectID.createFromHexString(tournmanet._id);
    }
    return this.db.collection('tournmanets').save(tournmanet);
  };
  async getTournaments(args?: any, limit?: number, meta?: QueryMeta): Promise<Tournament[]> {
    let query = this.db.collection('tournmanets').find(args || {}).sort({ _id: -1 });
    if (limit) {
      query.limit(limit);
    }
    if (meta) {
      meta.count = await query.count();
    }

    return query.toArray();
  };
  getTournmanetById(id: string): Promise<Tournament> {
    return this.db.collection('tournmanets').findOne({ '_id': ObjectID(id) });
  };
  deleteTournmanet(id: string): Promise<any> {
    return this.db.collection('tournmanets').remove({ _id: ObjectID(id) });
  }


  saveTournamentRegistration(registration: TournamentRegistration): Promise<any> {
    let collection = this.db.collection('tournamentRegistration');

    return collection.replaceOne({ 'tournamentId': registration.tournamentId, 'userGuid': registration.userGuid },
      registration,
      { upsert: true });
  }

  getTournamentRegistrations(args: { userGuid: string; tournamentId: string; }): Promise<TournamentRegistration[]> {
    return this.db.collection('tournamentRegistration').find(args).toArray()
  };
  getTournamentPlayerCount(tournamentId: string): Promise<number> {
    return this.db.collection('tournamentRegistration').count({ tournamentId: tournamentId });
  };


  saveTableStates(states: TableState[]): Promise<any[]> {

    return Promise.all(states.map(state => {
      if (typeof state._id === 'string') {
        state._id = ObjectID.createFromHexString(state._id);
      }
      return this.db.collection('tableState').save(state)
    }));
  }
  getTableStates(args?: any): Promise<TableState[]> {
    return this.db.collection('tableState').find(args || {}).sort({ _id: 1 }).toArray()
  };

  saveTournamentResult(results: TournamentResult[]): Promise<any> {
    return Promise.all(results.map(result => {
      return this.db.collection('tournamentResults').save(result)
    }));
  }
  getTournamentResults(tournamentId: string): Promise<TournamentResult[]> {
    return this.db.collection('tournamentResults').find({ tournamentId: tournamentId }).sort({ placing: 1 }).toArray();
  }
  deleteTournamentResult(tournamentId: string, userGuid: string): Promise<any> {
    return this.db.collection('tournamentResults').remove({ tournamentId: tournamentId, userGuid: userGuid });
  }

  updateTournamentHasAwardedPrizes(tournamentId: string): Promise<any> {
    return this.db.collection('tournmanets').update(
      { $and: [{ _id: ObjectID(tournamentId) }, { hasAwardedPrizes: false }] },
      { $set: { hasAwardedPrizes: true } })
  }

  getAddressInfo(guid: string, currency: string, processed: boolean): Promise<AddressInfo[]> {
    return this.db.collection('addressInfo').find({ userGuid: guid, currency: currency, processed: processed }).toArray();
  }

  getAddressInfoByAddress(address: string): Promise<AddressInfo[]> {
    return this.db.collection('addressInfo').find({ address: address }).toArray();
  }

  saveAddress(info: AddressInfo): any {
    return this.db.collection('addressInfo').save(info);
  }

  async getLastPaymentUpdate(): Promise<Payment | null> {

    let results = await this.db.collection('payments').find({}).sort({ updated: -1 }).limit(1).toArray();
    if (results && results.length) {
      return results[0]
    }
    return null;
  };

  saveChangeSeatHistory(history: ChangeSeatHistory): Promise<any> {
    return this.db.collection('changeSeatHistory').save(history);
  };

  saveTableProcessorMessage(message: DbTableProcessorMessage): Promise<any> {
    return this.db.collection('tableProcessorMessages').save(message);
  };

  getBlockedCountries(): Promise<{ countryCode: string }[]> {
    return this.db.collection('blockedCountry').find({}).toArray();
  };

  async createNextUserDocument(): Promise<void> {
    await this.db.collection('userIndex').updateOne({}, { "$setOnInsert": { "index": -1 }, }, { upsert: true });
  }

  async getNextUserIndex(): Promise<number> {

    let result = await this.db.collection('userIndex').findOneAndUpdate(
      {},
      { $inc: { "index": 1 } },
      { returnOriginal: false },
    );

    if (!result.ok || result.value == null) {
      throw new Error(`result != ok ${inspect(result)}`)
    }
    return result.value.index;




  };

  async getUserBalances(currency: string): Promise<{ screenName: string, joined: string, email: string, balance: number }[]> {
    let accounts = await this.db.collection('userAccounts').find({ currency }).sort({ balance: -1 }).toArray();

    let arr = []
    for (let account of accounts) {
      let user = await this.db.collection('users').findOne({ guid: account.guid });
      if (user) {
        arr.push({ screenName: user.screenName, joined: user._id.getTimestamp().toISOString(), email: user.email, balance: account.balance })
      }
    }
    return arr;

  }
  saveUserEmail(saveUserEmail: SaveUserEmail): Promise<any> {
    return this.db.collection('SaveUserEmail').save(saveUserEmail);
  }
}