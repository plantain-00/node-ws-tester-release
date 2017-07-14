"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bytes = require("bytes");
const ProtoBuf = require("protobufjs");
const fs = require("fs");
const server_config_1 = require("./server.config");
const WebSocket = require("uws");
function print(message) {
    // tslint:disable-next-line:no-console
    console.log(message);
}
print(`Listening ${server_config_1.config.host}:${server_config_1.config.port}.`);
print(`Sending ${bytes.format(server_config_1.config.messageLength)} message * ${server_config_1.config.messageCountPerSecond} times per second.`);
function readFile() {
    return new Promise((resolve, reject) => {
        fs.readFile("./data.json", (error, data) => {
            if (error) {
                reject(error);
            }
            else {
                try {
                    const json = JSON.parse(data.toString());
                    resolve(JSON.stringify(json));
                }
                catch (jsonError) {
                    reject(jsonError);
                }
            }
        });
    });
}
function loadProtobuf(message) {
    return new Promise((resolve, reject) => {
        ProtoBuf.load("./message.proto").then(root => {
            const Message = root.lookup("messagePackage.Message");
            if (server_config_1.config.customMessage) {
                resolve(Message.encode(message).finish());
            }
            else {
                resolve(Message.encode({ data: message }).finish());
            }
        }, error => {
            reject(error);
        });
    });
}
async function start() {
    let message;
    if (server_config_1.config.customMessage) {
        print(`Using custom message.`);
        message = await readFile();
    }
    else {
        message = "a".repeat(server_config_1.config.messageLength);
    }
    if (server_config_1.config.useProtobuf) {
        print(`Using protobuf.`);
        message = await loadProtobuf(message);
    }
    print(message);
    const wss = new WebSocket.Server({ port: server_config_1.config.port, host: server_config_1.config.host, clientTracking: true });
    let errorCount = 0;
    let messageCount = 0;
    let messageTotalLength = 0;
    wss.on("connection", ws => {
        const timer = setInterval(() => {
            for (let i = 0; i < server_config_1.config.messageCountPerSecond; i++) {
                ws.send(message, { binary: server_config_1.config.useProtobuf }, error => {
                    if (error) {
                        errorCount++;
                    }
                    else {
                        messageTotalLength += server_config_1.config.messageLength;
                        messageCount++;
                    }
                });
            }
        }, 1000);
        ws.on("close", () => {
            clearInterval(timer);
        });
    }).on("error", error => {
        if (error) {
            errorCount++;
        }
    });
    let timer;
    if (server_config_1.config.increasePerSecond > 0) {
        if (server_config_1.config.messageCountIncrease > 0) {
            print(`Message increase ${server_config_1.config.messageCountIncrease} times per ${server_config_1.config.increasePerSecond} second.`);
            timer = setInterval(() => {
                server_config_1.config.messageCountPerSecond += server_config_1.config.messageCountIncrease;
            }, 1000 * server_config_1.config.increasePerSecond);
        }
        else if (server_config_1.config.messageLengthIncrease > 0) {
            print(`Message length ${server_config_1.config.messageLengthIncrease} times per ${server_config_1.config.increasePerSecond} second.`);
            timer = setInterval(() => {
                server_config_1.config.messageLength += server_config_1.config.messageLengthIncrease;
                message = "a".repeat(server_config_1.config.messageLength);
            }, 1000 * server_config_1.config.increasePerSecond);
        }
    }
    setInterval(() => {
        if (timer && errorCount > 0) {
            clearInterval(timer);
        }
        const memory = bytes.format(process.memoryUsage().rss);
        print(`errors: ${errorCount} connections: ${wss.clients.length} messages: ${bytes.format(messageTotalLength)} ${messageCount} ${server_config_1.config.messageCountPerSecond} ${server_config_1.config.messageLength} memory: ${memory}`);
    }, 1000);
}
start();
