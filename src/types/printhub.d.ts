declare module 'printhub' {
  interface PrintHubOptions {
    paperSize?: '58' | '80' | string;
    printerType?: 'usb' | 'bluetooth' | 'network';
  }

  interface PrintInstance {
    writeText(text: string, options?: { bold?: boolean; align?: 'center' | 'left' | 'right' }): Promise<void>;
    feed(lines: number): Promise<void>;
    cutPaper(): Promise<void>;
  }

  class PrintHub {
    constructor(options?: PrintHubOptions);
    connectToPrint(callbacks: {
      onReady: (print: PrintInstance) => void;
      onFailed: (message: string) => void;
    }): Promise<void>;
  }

  export default PrintHub;
}