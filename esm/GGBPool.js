"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GGBPool = void 0;
const puppeteer = __importStar(require("puppeteer"));
const events_1 = require("events");
const GGBPlotter_1 = require("./GGBPlotter");
const PriorityQueue_1 = require("./PriorityQueue");
const path = __importStar(require("path"));
const os_1 = __importDefault(require("os"));
let window;
const DEBUG = false;
class GGBPool {
    constructor(options) {
        this.usedWorkers = [];
        this.opts = { plotters: 3, ...options };
        this.releasedEmitter = new events_1.EventEmitter();
        this.priorityCue = new PriorityQueue_1.PriorityQueue(this.releasedEmitter);
        this.releasedEmitter.on("released", (worker) => {
            const indx = this.usedWorkers.indexOf(worker);
            this.usedWorkers.splice(indx, 1);
            this.availableWorkers.push(worker);
        });
    }
    async ready() {
        if (this.isCreated) {
            return this;
        }
        this.browser = await puppeteer.launch(/Windows/.test(os_1.default.type()) ? {} : {
            headless: true,
            executablePath: `/usr/bin/google-chrome`,
            args: [`--no-sandbox`, `--headless`, `--disable-gpu`, `--disable-dev-shm-usage`],
        });
        const promises = new Array(this.opts.plotters);
        for (var i = 0; i < this.opts.plotters; i++) {
            promises[i] = this.browser.createIncognitoBrowserContext();
        }
        const browserContexts = await Promise.all(promises);
        DEBUG && console.log("browsers created");
        const promises2 = new Array(this.opts.plotters);
        for (var i = 0; i < this.opts.plotters; i++) {
            promises2[i] = browserContexts[i].newPage();
        }
        this.availablePages = await Promise.all(promises2);
        DEBUG && console.log("pages have been created");
        let url = path.resolve(__dirname, "../geogebra-math-apps-bundle/GeoGebra/HTML5/5.0/simple.html");
        url = "file://" + url;
        let promises3 = new Array(this.opts.plotters);
        for (var i = 0; i < this.opts.plotters; i++) {
            promises3[i] = this.availablePages[i].goto(url, { waitUntil: 'networkidle2' });
        }
        await Promise.all(promises3);
        DEBUG && console.log("https://www.geogebra.org/classic have loaded in all pages");
        promises3 = new Array(this.opts.plotters);
        for (var i = 0; i < this.opts.plotters; i++) {
            promises3[i] = this.availablePages[i].waitForFunction("window.ggbApplet!=null");
        }
        await Promise.all(promises3);
        DEBUG && console.log("ggbApplet is ready in all pages");
        promises3 = new Array(this.opts.plotters);
        for (var i = 0; i < this.opts.plotters; i++) {
            promises3[i] = await this.availablePages[i].evaluate('window.ggbApplet.setWidth(1280)');
            promises3[i] = await this.availablePages[i].evaluate('window.ggbApplet.setHeight(850)');
            promises3[i] = await this.availablePages[i].evaluate('window.ggbApplet.showAlgebraInput("bottom")');
            promises3[i] = await this.availablePages[i].evaluate('window.ggbApplet.showMenuBar(true)');
        }
        await Promise.all(promises3);
        DEBUG && console.log("All pages have been initialized");
        this.availableWorkers = this.availablePages.map((p, i) => new GGBPlotter_1.GGBPlotter(null, p, this.releasedEmitter));
        DEBUG && console.log("WORKERS HAVE BEEN CREATED");
        return this;
    }
    pickaWorker() {
        const worker = this.availableWorkers[0];
        this.availableWorkers.splice(0, 1);
        this.usedWorkers.push(worker);
        return worker;
    }
    async getGGBPlotter() {
        if (this.availableWorkers.length) {
            DEBUG && console.log('getGGBPlotter', this.availableWorkers.length);
            return this.pickaWorker();
        }
        else {
            const watcher = this.priorityCue.wait();
            watcher.then((worker) => {
                const idx = this.availableWorkers.indexOf(worker);
                this.availableWorkers.splice(idx, 1);
                this.usedWorkers.push(worker);
            });
            return watcher;
        }
    }
    async release() {
        const promises = [];
        for (var i = 0; i < this.opts.plotters; i++) {
            promises.push(this.availablePages[i].close());
        }
        await Promise.all(promises);
        await this.browser.close();
    }
}
exports.GGBPool = GGBPool;
//# sourceMappingURL=GGBPool.js.map