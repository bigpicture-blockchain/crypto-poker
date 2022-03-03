import { TableConfig } from "../TableConfig"

const configs: TableConfig[] = [
    {
        "_id": undefined,
        "name": "Palermo",
        "smallBlindUsd": 0.1,
        "bigBlindUsd": 0.2,
        "currency": "usd",
        "maxPlayers": 9,
        "timeToActSec": 30,
        "orderIndex": 1,
        "maxBuyIn": 1000,
        "rake": 0.1
    },
    {
        "_id": undefined,
        "name": "Dublin Deep",
        "smallBlindUsd": 0.5,
        "bigBlindUsd": 1,
        "currency": "usd",
        "maxPlayers": 9,
        "timeToActSec": 60,
        "orderIndex": 4,
        "maxBuyIn": 200,
        "rake": 1
    },
    {
        "_id": undefined,
        "name": "London",
        "smallBlindUsd": 5,
        "bigBlindUsd": 10,
        "currency": "usd",
        "maxPlayers": 9,
        "timeToActSec": 60,
        "orderIndex": 11,
        "maxBuyIn": 100,
        "rake": 1
    }
]

export default configs;