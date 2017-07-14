"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bytes = require("bytes");
const client_config_1 = require("./client.config");
const WebSocket = require("ws");
function print(message) {
    // tslint:disable-next-line:no-console
    console.log(message);
}
print(`Connecting to ${client_config_1.config.url} with ${client_config_1.config.connectionCount} times.`);
const wsArray = [];
let errorCount = 0;
let messageCount = 0;
let messageTotalLength = 0;
function connect(times) {
    for (let i = 0; i < times; i++) {
        const ws = new WebSocket(client_config_1.config.url);
        wsArray.push(ws);
        ws.on("message", (data) => {
            messageTotalLength += data.length;
            messageCount++;
        }).on("error", error => {
            if (error) {
                errorCount++;
            }
        });
    }
}
connect(client_config_1.config.connectionCount);
let timer;
if (client_config_1.config.connectionCountIncrease > 0 && client_config_1.config.increasePerSecond > 0) {
    print(`Connection increase ${client_config_1.config.connectionCountIncrease} times per ${client_config_1.config.increasePerSecond} second.`);
    timer = setInterval(() => {
        connect(client_config_1.config.connectionCountIncrease);
    }, 1000 * client_config_1.config.increasePerSecond);
}
setInterval(() => {
    if (timer && errorCount > 0) {
        clearInterval(timer);
    }
    const memory = bytes.format(process.memoryUsage().rss);
    print(`errors: ${errorCount} connections: ${wsArray.length} messages: ${bytes.format(messageTotalLength)} ${messageCount} memory: ${memory}`);
}, 1000);
