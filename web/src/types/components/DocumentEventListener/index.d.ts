import { Type } from "typescript"

export interface DocumentEventListeners {
    focusIdStack: string[];
    documentEventListeners: Array<DocumentEventListener<keyof DocumentEventMap>>;
}

export type DocumentEventListener<K extends keyof DocumentEventMap> = K extends any ? {
    focusId: string;
    type: K;
    callback: (ev: DocumentEventMap[K]) => void;
} : never