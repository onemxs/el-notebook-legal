// Minimal types for mammoth's prebuilt browser bundle (no Node deps), which has
// no shipped declarations. We only use extractRawText for .docx text extraction.
declare module "mammoth/mammoth.browser.js" {
  export function extractRawText(input: {
    arrayBuffer: ArrayBuffer;
  }): Promise<{ value: string; messages: unknown[] }>;
}
