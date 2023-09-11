/// <reference types="node" />
/// <reference types="node" />
import * as puppeteer from 'puppeteer';
import { EventEmitter } from 'events';
import { GGBOptions } from './GGBOptions';
export declare class GGBPlotter {
    releasedEmitter: EventEmitter;
    id: string;
    poolOpts: GGBOptions;
    pagePromise: Promise<puppeteer.Page>;
    browser: puppeteer.Browser;
    constructor(options?: GGBOptions, page?: puppeteer.Page, releasedEmitter?: EventEmitter);
    private createPage;
    ready(): Promise<puppeteer.Page>;
    evalGGBScript(ggbScript: string[], width?: number, height?: number): Promise<void>;
    setFileJSON(fileJSON: Record<"archive", Record<"fileName" | "fileContent", string>[]>): Promise<void>;
    addFileJSON(fileJSON: Record<"fileName" | "fileContent", string>[]): Promise<void>;
    getFileJSON(): Promise<Record<"archive", Record<"fileName" | "fileContent", string>[]>>;
    setXML(xml: string): Promise<void>;
    exportXML(): Promise<string>;
    exportPNG(alpha?: boolean, dpi?: number): Promise<Buffer>;
    exportPNG64(alpha?: boolean, dpi?: number): Promise<string>;
    exportSVG(): Promise<string>;
    exportSVG64(): Promise<string>;
    exportPDF(): Promise<Buffer>;
    exportPDF64(): Promise<string>;
    exportGGB(): Promise<Buffer>;
    exportGGB64(): Promise<string>;
    export(format: string): Promise<string | Buffer>;
    export64(format: string): Promise<string>;
    setVisible(name: string, value: boolean): Promise<void>;
    reset(): Promise<void>;
    exec(ggbAppletProperty: string, args?: any[]): Promise<void>;
    release(): Promise<void>;
}
