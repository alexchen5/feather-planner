import { DocumentEventListener, DocumentEventListeners } from ".";

export type DocumentListenerReducer<K extends keyof DocumentEventMap> = (
    state: DocumentEventListeners, 
    action: DocumentListenerAction<K>
) => DocumentEventListeners;

export type DocumentListenerAction<K extends keyof DocumentEventMap> = RegisterFocus | DeregisterFocus | TriggerListeners<K> | AddDocumentEventListener<K> | RemoveDocumentEventListener<K>;

export interface RegisterFocus {
    type: 'register-focus';
    focusId: string;
    listeners?: Array<DocumentEventListener<keyof DocumentEventMap>>
}

export interface DeregisterFocus {
    type: 'deregister-focus';
    focusId: string;
    removeListeners: boolean;
}

/**
 * Fire event if the given focusId is the focused component, else is ignored
 */
export interface TriggerListeners<K extends keyof DocumentEventMap> {
    type: 'trigger-event-listeners';
    focusId: string;
    eventType: K;
    event: DocumentEventMap[K];
}

export interface AddDocumentEventListener<K extends keyof DocumentEventMap> {
    type: 'add-document-event-listener';
    listener: DocumentEventListener<K>;
}

export interface RemoveDocumentEventListener<K extends keyof DocumentEventMap> {
    type: 'remove-document-event-listener';
    listener: DocumentEventListener<K>;
}
