import type { BomPart, ParseIssue } from '../types';

export type CadNativeFormat =
  | 'dxf'
  | 'dwg'
  | 'sldprt'
  | 'sldasm'
  | 'ipt'
  | 'iam'
  | 'catpart'
  | 'catproduct'
  | 'prt'
  | 'asm'
  | 'unknown-cad';

export interface CadConversionHint {
  needed: boolean;
  recommend: string;
  /** Preferred interchange formats for this family. */
  preferredExports: string[];
}

export interface CadImportResult {
  format: CadNativeFormat | string;
  parts: BomPart[];
  issues: ParseIssue[];
  conversion?: CadConversionHint;
  /** True when this path handled a native CAD part/assembly (vs BOM). */
  nativeCad: boolean;
}

export interface CadImporter {
  id: CadNativeFormat;
  extensions: string[];
  label: string;
  /** ASCII/text path when available. */
  importText?: (text: string, fileName: string) => CadImportResult;
  /** Binary path — may only detect + guide. */
  importBinary?: (buffer: ArrayBuffer, fileName: string) => CadImportResult;
}
