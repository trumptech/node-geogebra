"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriorityQueue = void 0;
const QueueTak_1 = require("./QueueTak");
class PriorityQueue {
    constructor(releasedEmitter) {
        this.releasedEmitter = releasedEmitter;
        this.tasks = [];
    }
    async wait() {
        PriorityQueue.counter += 1;
        const cueTask = new QueueTak_1.QueueTask(PriorityQueue.counter, this);
        this.tasks.push(cueTask);
        return cueTask.subscribe();
    }
}
exports.PriorityQueue = PriorityQueue;
PriorityQueue.counter = 0;
//# sourceMappingURL=PriorityQueue.js.map