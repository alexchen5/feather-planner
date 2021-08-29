export interface DocumentEventListeners {
    focusIdStack: string[];
    documentEventListeners: Array<DocumentEventListener<keyof DocumentEventMap>>;
}

export type DocumentEventListener<K extends keyof DocumentEventMap> = {
    focusId: string;
    type: K;
    callback: (ev: DocumentEventMap[K]) => void;
}
