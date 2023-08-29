import os from 'os';
import * as puppeteer from 'puppeteer';
import { EventEmitter } from 'events';
import { GGBOptions } from './GGBOptions';
import * as path from 'path';

let window: any;
const DEBUG = false;

export class GGBPlotter {
    releasedEmitter: EventEmitter;
    id: string;
    poolOpts: GGBOptions;
    pagePromise: Promise<puppeteer.Page>;
    browser: puppeteer.Browser;

    constructor(options?: GGBOptions, page?: puppeteer.Page, releasedEmitter?: EventEmitter) {
        if (options) {
            this.poolOpts = { plotters: 3, ...options };
            if (options.id) {
                this.id = options.id;
            }
        } else {
            this.poolOpts = { plotters: 3 };
            this.id = Math.random().toString(32).substring(2);
        }
        this.pagePromise = this.createPage(page);

        this.releasedEmitter = releasedEmitter;
    }
    private async createPage(page: puppeteer.Page): Promise<puppeteer.Page> {
        if (page) {
            return page;
        } else {
            // const opts: puppeteer.LaunchOptions = {
            //     devtools: false,
            //     args: ["--allow-file-access-from-files", "--non-secure",
            //         "--allow-running-insecure-content", "--no-sandbox",
            //         "--no-startup-window"]
            // };

            this.browser = await puppeteer.launch(/Windows/.test(os.type()) ? {} : {
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
            // await newPage.evaluate('window.ggbApplet.evalCommand(\'SetPerspective("G")\\nShowGrid(true)\')');
            // DEBUG && console.log("SetPerspective->G, showGrid->true");
            return newPage;
        }
    }
    async ready() {
        return this.pagePromise;
    }
    async evalGGBScript(ggbScript: string[], width?: number, height?: number) {
        const page = await this.pagePromise;
        DEBUG && page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        // 53 px accounts for the toolbar which cannot be removed in geogebra app mode

        await page.setViewport({ width: width || 600, height: (height || 400) + 53 });

        if (ggbScript && ggbScript.length) {
            await page.evaluate((x) => window.ggbApplet.evalCommand(x), ggbScript.join("\n"));
        }
    }
    async setFileJSON(fileJSON: Record<"archive", Record<"fileName" | "fileContent", string>[]>): Promise<void> {
        const page = await this.pagePromise;
        DEBUG && page.on('console', msg => console.log('PAGE LOG:', msg.text()));

        await page.evaluate((x) => {
            window.ggbApplet.setFileJSON(x);
        }, fileJSON);
        // TODO:find optimal way to solve the setFileJSON delay problem
        await new Promise(r => setTimeout(r, 100));
    }
    async addFileJSON(fileJSON: Record<"fileName" | "fileContent", string>[]): Promise<void> {
        DEBUG && console.log("addFileJSON", fileJSON.length);
        const page = await this.pagePromise;
        DEBUG && page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        await page.evaluate((x) => {
            let originalJsonFile = window.ggbApplet.getFileJSON();
            originalJsonFile.archive = [...originalJsonFile.archive, ...x];
            window.ggbApplet.setFileJSON(originalJsonFile);
        }, fileJSON);
        // TODO:find optimal way to solve the setFileJSON delay problem
        await new Promise(r => setTimeout(r, 100));
    }
    async getFileJSON(): Promise<Record<"archive", Record<"fileName" | "fileContent", string>[]>> {
        const page = await this.pagePromise;
        DEBUG && page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        const out = await page.evaluate(() => window.ggbApplet.getFileJSON());

        return out;
    }
    async setXML(xml: string): Promise<void> {
        DEBUG && console.log("setXML", xml.length);
        const page = await this.pagePromise;
        DEBUG && page.on('console', msg => console.log('PAGE LOG:', msg.text()));

        await page.evaluate((x) => {
            window.ggbApplet.setXML(x);
        }, xml);
    }
    async exportXML(): Promise<string> {
        const page = await this.pagePromise;
        DEBUG && page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        const out = await page.evaluate(() => window.ggbApplet.getXML());

        return out;
    }
    async exportPNG(alpha?: boolean, dpi?: number): Promise<Buffer> {
        DEBUG && console.log("exportPNG", alpha, dpi);
        const pdf64 = await this.exportPNG64(alpha, dpi);
        const raw = pdf64.replace("data:image/png;base64,", "");
        return Buffer.from(raw, 'base64');
    }
    async exportPNG64(alpha?: boolean, dpi?: number): Promise<string> {
        DEBUG && console.log("exportPNG64", alpha, dpi);
        const page = await this.pagePromise;
        const out = await page.evaluate((alpha, dpi) => window.ggbApplet.getPNGBase64(1, alpha, dpi || 300), alpha, dpi);
        return "data:image/png;base64," + out;
    }
    async exportSVG(): Promise<string> {
        const page = await this.pagePromise;
        DEBUG && page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        return page.evaluate(() => window.ggbApplet.exportSVG());
    }
    async exportSVG64(): Promise<string> {
        const svg = await this.exportSVG();
        return "data:image/svg+xml;base64," + Buffer.from(svg).toString('base64');
    }
    async exportPDF(): Promise<Buffer> {
        const pdf64 = await this.exportPDF64();
        const raw = pdf64.replace("data:application/pdf;base64,", "");
        return Buffer.from(raw, 'base64');
    }
    async exportPDF64(): Promise<string> {
        const page = await this.pagePromise;
        DEBUG && page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        return page.evaluate(() => window.ggbApplet.exportPDF());
    }
    async exportGGB(): Promise<Buffer> {
        const raw = await this.exportGGB64();
        return Buffer.from(raw, 'base64');
    }
    async exportGGB64(): Promise<string> {
        const page = await this.pagePromise;
        DEBUG && page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        return page.evaluate(() => window.ggbApplet.getBase64());
    }
    async export(format: string): Promise<string | Buffer> {
        switch (format) {
            case ("pngalpha"): return this.exportPNG(true);
            case ("pdf"): return this.exportPDF();
            case ("svg"): return this.exportSVG();
            case ("ggb"): return this.exportGGB();
            default: return this.exportPNG();
        }
    }
    async export64(format: string): Promise<string> {
        switch (format) {
            case ("pngalpha"): return this.exportPNG64(true);
            case ("pdf"): return this.exportPDF64();
            case ("svg"): return this.exportSVG64();
            case ("ggb"): return this.exportGGB64();
            default: return this.exportPNG64();
        }
    }
    async reset() {
        const page = await this.pagePromise;
        DEBUG && page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        await page.evaluate(() => window.ggbApplet.reset());
    }
    async exec(ggbAppletProperty: string, args?: any[]) {
        const page = await this.pagePromise;
        DEBUG && page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        await page.evaluate((prop, argz) => {
            const property = window.ggbApplet[prop];
            if (typeof (property) === "function") {
                return property.apply(window.ggbApplet, argz);
            } else {
                return property;
            }
        }, ggbAppletProperty, args);
    }
    async release() {
        const page = await this.pagePromise;
        DEBUG && page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        await page.evaluate(() => window.ggbApplet.reset());
        if (this.releasedEmitter) {
            // notify to the cue that a worker has been released and must be returned to the pool
            this.releasedEmitter.emit("released", this);
        }
        if (this.browser) {
            await page.close();
            await this.browser.close();
        }
    }
}
