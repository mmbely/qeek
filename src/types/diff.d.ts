declare module 'diff' {
    export interface Change {
      value: string;
      added?: boolean;
      removed?: boolean;
      count?: number;
    }
  
    export function diffChars(oldStr: string, newStr: string, options?: any): Change[];
    export function diffWords(oldStr: string, newStr: string, options?: any): Change[];
    export function diffWordsWithSpace(oldStr: string, newStr: string, options?: any): Change[];
    export function diffLines(oldStr: string, newStr: string, options?: any): Change[];
    export function diffTrimmedLines(oldStr: string, newStr: string, options?: any): Change[];
    export function diffSentences(oldStr: string, newStr: string, options?: any): Change[];
    export function diffCss(oldStr: string, newStr: string, options?: any): Change[];
    export function diffJson(oldObj: any, newObj: any, options?: any): Change[];
    export function diffArrays(oldArr: any[], newArr: any[], options?: any): Change[];
    
    export function structuredPatch(
      oldFileName: string,
      newFileName: string,
      oldStr: string,
      newStr: string,
      oldHeader?: string,
      newHeader?: string,
      options?: any
    ): any;
    
    export function createTwoFilesPatch(
      oldFileName: string,
      newFileName: string,
      oldStr: string,
      newStr: string,
      oldHeader?: string,
      newHeader?: string,
      options?: any
    ): string;
    
    export function createPatch(
      fileName: string,
      oldStr: string,
      newStr: string,
      oldHeader?: string,
      newHeader?: string,
      options?: any
    ): string;
    
    export function applyPatch(source: string, patch: string | any, options?: any): string | boolean;
    export function applyPatches(patch: string | any[], options: any): void;
    export function parsePatch(diffStr: string): any[];
    export function convertChangesToXML(changes: Change[]): string;
    export function convertChangesToDMP(changes: Change[]): any[];
  }