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
exports.GGBPlotter = void 0;
const os_1 = __importDefault(require("os"));
const puppeteer = __importStar(require("puppeteer"));
const path = __importStar(require("path"));
let window;
const DEBUG = false;
class GGBPlotter {
    constructor(options, page, releasedEmitter) {
        if (options) {
            this.poolOpts = { plotters: 3, ...options };
            if (options.id) {
                this.id = options.id;
            }
        }
        else {
            this.poolOpts = { plotters: 3 };
            this.id = Math.random().toString(32).substring(2);
        }
        this.pagePromise = this.createPage(page);
        this.releasedEmitter = releasedEmitter;
    }
    async createPage(page) {
        if (page) {
            return page;
        }
        else {
            this.browser = await puppeteer.launch(/Windows/.test(os_1.default.type()) ? {} : {
                headless: true,
                executablePath: `/usr/bin/google-chrome`,
                args: [`--no-sandbox`, `--headless`, `--disable-gpu`, `--disable-dev-shm-usage`],
            });
            const newPage = await this.browser.newPage();
            let url = path.resolve(__dirname, "../geogebra-math-apps-bundle/GeoGebra/HTML5/5.0/simple.html");
            url = "file://" + url;
            await newPage.goto(url, { waitUntil: 'networkidle2' });
            DEBUG && console.log(url + " has been loaded");
            await newPage.waitForFunction("window.ggbApplet!=null");
            DEBUG && console.log("ggbApplet is ready");
            return newPage;
        }
    }
    async ready() {
        return this.pagePromise;
    }
    async evalGGBScript(ggbScript, width, height) {
        const page = await this.pagePromise;
        DEBUG && page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        await page.setViewport({ width: width || 1280, height: (height || 700) + 53 });
        if (ggbScript && ggbScript.length) {
            await page.evaluate((x) => window.ggbApplet.evalCommand(x), ggbScript.join("\n"));
        }
    }
    async setFileJSON(fileJSON) {
        const page = await this.pagePromise;
        DEBUG && page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        await page.evaluate((x) => {
            window.ggbApplet.setFileJSON(x);
        }, fileJSON);
        await new Promise(r => setTimeout(r, 1500));
    }
    async addFileJSON(fileJSON) {
        DEBUG && console.log("addFileJSON", fileJSON.length);
        const page = await this.pagePromise;
        DEBUG && page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        await page.evaluate((x) => {
            let originalJsonFile = window.ggbApplet.getFileJSON();
            originalJsonFile.archive = [...originalJsonFile.archive, ...x];
            window.ggbApplet.setFileJSON(originalJsonFile);
        }, fileJSON);
        await new Promise(r => setTimeout(r, 1500));
    }
    async getFileJSON() {
        const page = await this.pagePromise;
        DEBUG && page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        const out = await page.evaluate(() => window.ggbApplet.getFileJSON());
        return out;
    }
    async setXML(xml) {
        DEBUG && console.log("setXML", xml.length);
        const page = await this.pagePromise;
        DEBUG && page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        await page.evaluate((x) => {
            window.ggbApplet.setXML(x);
        }, xml);
    }
    async exportXML() {
        const page = await this.pagePromise;
        DEBUG && page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        const out = await page.evaluate(() => window.ggbApplet.getXML());
        return out;
    }
    async exportPNG(alpha, dpi) {
        DEBUG && console.log("exportPNG", alpha, dpi);
        const pdf64 = await this.exportPNG64(alpha, dpi);
        const raw = pdf64.replace("data:image/png;base64,", "");
        return Buffer.from(raw, 'base64');
    }
    async exportPNG64(alpha, dpi) {
        DEBUG && console.log("exportPNG64", alpha, dpi);
        const page = await this.pagePromise;
        const out = await page.evaluate((alpha, dpi) => window.ggbApplet.getPNGBase64(1, alpha, dpi || 300), alpha, dpi);
        return "data:image/png;base64," + out;
    }
    async exportSVG() {
        const page = await this.pagePromise;
        DEBUG && page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        return page.evaluate(() => window.ggbApplet.exportSVG());
    }
    async exportSVG64() {
        const svg = await this.exportSVG();
        return "data:image/svg+xml;base64," + Buffer.from(svg).toString('base64');
    }
    async exportPDF() {
        const pdf64 = await this.exportPDF64();
        const raw = pdf64.replace("data:application/pdf;base64,", "");
        return Buffer.from(raw, 'base64');
    }
    async exportPDF64() {
        const page = await this.pagePromise;
        DEBUG && page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        return page.evaluate(() => window.ggbApplet.exportPDF());
    }
    async exportGGB() {
        const raw = await this.exportGGB64();
        return Buffer.from(raw, 'base64');
    }
    async exportGGB64() {
        const page = await this.pagePromise;
        DEBUG && page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        return page.evaluate(() => window.ggbApplet.getBase64());
    }
    async export(format) {
        switch (format) {
            case ("pngalpha"): return this.exportPNG(true);
            case ("pdf"): return this.exportPDF();
            case ("svg"): return this.exportSVG();
            case ("ggb"): return this.exportGGB();
            default: return this.exportPNG();
        }
    }
    async export64(format) {
        switch (format) {
            case ("pngalpha"): return this.exportPNG64(true);
            case ("pdf"): return this.exportPDF64();
            case ("svg"): return this.exportSVG64();
            case ("ggb"): return this.exportGGB64();
            default: return this.exportPNG64();
        }
    }
    async setVisible(name, value) {
        DEBUG && console.log("setVisible", name, value);
        const page = await this.pagePromise;
        await page.evaluate((name, value) => window.ggbApplet.setVisible(name, value), name, value);
    }
    async reset() {
        const page = await this.pagePromise;
        DEBUG && page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        await page.evaluate(() => window.ggbApplet.reset());
    }
    async exec(ggbAppletProperty, args) {
        const page = await this.pagePromise;
        DEBUG && page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        await page.evaluate((prop, argz) => {
            const property = window.ggbApplet[prop];
            if (typeof (property) === "function") {
                return property.apply(window.ggbApplet, argz);
            }
            else {
                return property;
            }
        }, ggbAppletProperty, args);
    }
    async release() {
        const page = await this.pagePromise;
        DEBUG && page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        await page.evaluate(() => window.ggbApplet.reset());
        if (this.releasedEmitter) {
            this.releasedEmitter.emit("released", this);
        }
        if (this.browser) {
            await page.close();
            await this.browser.close();
        }
    }
}
exports.GGBPlotter = GGBPlotter;
//# sourceMappingURL=GGBPlotter.js.map