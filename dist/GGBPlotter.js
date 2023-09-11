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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
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
            this.poolOpts = Object.assign({ plotters: 3 }, options);
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
    createPage(page) {
        return __awaiter(this, void 0, void 0, function* () {
            if (page) {
                return page;
            }
            else {
                this.browser = yield puppeteer.launch(/Windows/.test(os_1.default.type()) ? {} : {
                    headless: true,
                    executablePath: `/usr/bin/google-chrome`,
                    args: [`--no-sandbox`, `--headless`, `--disable-gpu`, `--disable-dev-shm-usage`],
                });
                const newPage = yield this.browser.newPage();
                let url = path.resolve(__dirname, "../geogebra-math-apps-bundle/GeoGebra/HTML5/5.0/simple.html");
                url = "file://" + url;
                yield newPage.goto(url, { waitUntil: 'networkidle2' });
                DEBUG && console.log(url + " has been loaded");
                yield newPage.waitForFunction("window.ggbApplet!=null");
                DEBUG && console.log("ggbApplet is ready");
                return newPage;
            }
        });
    }
    ready() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.pagePromise;
        });
    }
    evalGGBScript(ggbScript, width, height) {
        return __awaiter(this, void 0, void 0, function* () {
            const page = yield this.pagePromise;
            DEBUG && page.on('console', msg => console.log('PAGE LOG:', msg.text()));
            yield page.setViewport({ width: width || 1280, height: (height || 700) + 53 });
            if (ggbScript && ggbScript.length) {
                yield page.evaluate((x) => window.ggbApplet.evalCommand(x), ggbScript.join("\n"));
            }
        });
    }
    setFileJSON(fileJSON) {
        return __awaiter(this, void 0, void 0, function* () {
            const page = yield this.pagePromise;
            DEBUG && page.on('console', msg => console.log('PAGE LOG:', msg.text()));
            yield page.evaluate((x) => {
                window.ggbApplet.setFileJSON(x);
            }, fileJSON);
            yield new Promise(r => setTimeout(r, 1500));
        });
    }
    addFileJSON(fileJSON) {
        return __awaiter(this, void 0, void 0, function* () {
            DEBUG && console.log("addFileJSON", fileJSON.length);
            const page = yield this.pagePromise;
            DEBUG && page.on('console', msg => console.log('PAGE LOG:', msg.text()));
            yield page.evaluate((x) => {
                let originalJsonFile = window.ggbApplet.getFileJSON();
                originalJsonFile.archive = [...originalJsonFile.archive, ...x];
                window.ggbApplet.setFileJSON(originalJsonFile);
            }, fileJSON);
            yield new Promise(r => setTimeout(r, 1500));
        });
    }
    getFileJSON() {
        return __awaiter(this, void 0, void 0, function* () {
            const page = yield this.pagePromise;
            DEBUG && page.on('console', msg => console.log('PAGE LOG:', msg.text()));
            const out = yield page.evaluate(() => window.ggbApplet.getFileJSON());
            return out;
        });
    }
    setXML(xml) {
        return __awaiter(this, void 0, void 0, function* () {
            DEBUG && console.log("setXML", xml.length);
            const page = yield this.pagePromise;
            DEBUG && page.on('console', msg => console.log('PAGE LOG:', msg.text()));
            yield page.evaluate((x) => {
                window.ggbApplet.setXML(x);
            }, xml);
        });
    }
    exportXML() {
        return __awaiter(this, void 0, void 0, function* () {
            const page = yield this.pagePromise;
            DEBUG && page.on('console', msg => console.log('PAGE LOG:', msg.text()));
            const out = yield page.evaluate(() => window.ggbApplet.getXML());
            return out;
        });
    }
    exportPNG(alpha, dpi) {
        return __awaiter(this, void 0, void 0, function* () {
            DEBUG && console.log("exportPNG", alpha, dpi);
            const pdf64 = yield this.exportPNG64(alpha, dpi);
            const raw = pdf64.replace("data:image/png;base64,", "");
            return Buffer.from(raw, 'base64');
        });
    }
    exportPNG64(alpha, dpi) {
        return __awaiter(this, void 0, void 0, function* () {
            DEBUG && console.log("exportPNG64", alpha, dpi);
            const page = yield this.pagePromise;
            const out = yield page.evaluate((alpha, dpi) => window.ggbApplet.getPNGBase64(1, alpha, dpi || 300), alpha, dpi);
            return "data:image/png;base64," + out;
        });
    }
    exportSVG() {
        return __awaiter(this, void 0, void 0, function* () {
            const page = yield this.pagePromise;
            DEBUG && page.on('console', msg => console.log('PAGE LOG:', msg.text()));
            return page.evaluate(() => window.ggbApplet.exportSVG());
        });
    }
    exportSVG64() {
        return __awaiter(this, void 0, void 0, function* () {
            const svg = yield this.exportSVG();
            return "data:image/svg+xml;base64," + Buffer.from(svg).toString('base64');
        });
    }
    exportPDF() {
        return __awaiter(this, void 0, void 0, function* () {
            const pdf64 = yield this.exportPDF64();
            const raw = pdf64.replace("data:application/pdf;base64,", "");
            return Buffer.from(raw, 'base64');
        });
    }
    exportPDF64() {
        return __awaiter(this, void 0, void 0, function* () {
            const page = yield this.pagePromise;
            DEBUG && page.on('console', msg => console.log('PAGE LOG:', msg.text()));
            return page.evaluate(() => window.ggbApplet.exportPDF());
        });
    }
    exportGGB() {
        return __awaiter(this, void 0, void 0, function* () {
            const raw = yield this.exportGGB64();
            return Buffer.from(raw, 'base64');
        });
    }
    exportGGB64() {
        return __awaiter(this, void 0, void 0, function* () {
            const page = yield this.pagePromise;
            DEBUG && page.on('console', msg => console.log('PAGE LOG:', msg.text()));
            return page.evaluate(() => window.ggbApplet.getBase64());
        });
    }
    export(format) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (format) {
                case ("pngalpha"): return this.exportPNG(true);
                case ("pdf"): return this.exportPDF();
                case ("svg"): return this.exportSVG();
                case ("ggb"): return this.exportGGB();
                default: return this.exportPNG();
            }
        });
    }
    export64(format) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (format) {
                case ("pngalpha"): return this.exportPNG64(true);
                case ("pdf"): return this.exportPDF64();
                case ("svg"): return this.exportSVG64();
                case ("ggb"): return this.exportGGB64();
                default: return this.exportPNG64();
            }
        });
    }
    setVisible(name, value) {
        return __awaiter(this, void 0, void 0, function* () {
            DEBUG && console.log("setVisible", name, value);
            const page = yield this.pagePromise;
            yield page.evaluate((alpha, dpi) => window.ggbApplet.setVisible(name, value), name, value);
        });
    }
    reset() {
        return __awaiter(this, void 0, void 0, function* () {
            const page = yield this.pagePromise;
            DEBUG && page.on('console', msg => console.log('PAGE LOG:', msg.text()));
            yield page.evaluate(() => window.ggbApplet.reset());
        });
    }
    exec(ggbAppletProperty, args) {
        return __awaiter(this, void 0, void 0, function* () {
            const page = yield this.pagePromise;
            DEBUG && page.on('console', msg => console.log('PAGE LOG:', msg.text()));
            yield page.evaluate((prop, argz) => {
                const property = window.ggbApplet[prop];
                if (typeof (property) === "function") {
                    return property.apply(window.ggbApplet, argz);
                }
                else {
                    return property;
                }
            }, ggbAppletProperty, args);
        });
    }
    release() {
        return __awaiter(this, void 0, void 0, function* () {
            const page = yield this.pagePromise;
            DEBUG && page.on('console', msg => console.log('PAGE LOG:', msg.text()));
            yield page.evaluate(() => window.ggbApplet.reset());
            if (this.releasedEmitter) {
                this.releasedEmitter.emit("released", this);
            }
            if (this.browser) {
                yield page.close();
                yield this.browser.close();
            }
        });
    }
}
exports.GGBPlotter = GGBPlotter;
//# sourceMappingURL=GGBPlotter.js.map