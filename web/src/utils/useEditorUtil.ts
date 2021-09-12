// Custom hooks for working with the draft-js Editor component

import { ContentState, convertFromRaw, EditorState, RawDraftContentState } from "draft-js";
import React from "react";
import { DocumentEventListener } from "types/components/DocumentEventListener";
import { DocumentListenerAction } from "types/components/DocumentEventListener/reducer";

/**
 * Helper to declare the editor's focus to the document event listener
 * @param dispatchListeners the dispatch function 
 * @returns [ isFocused, declareFocus, declareBlur ]
 * 
 * isFocused - whether the focus is declared at the moment 
 * 
 * declareFocus - call to declare focus 
 * 
 * declareBlur - call to declare blur i.e. remove focus declaration
 */
export const useEditorFocus = (
    dispatchListeners: (value: DocumentListenerAction<keyof DocumentEventMap>) => void, 
    focusId = 'editor-focus'
): 
[
    boolean, 
    (listeners?: Omit<DocumentEventListener<keyof DocumentEventMap>, 'focusId'>[]) => void, 
    () => void,
] => {
    const [isFocused, setFocus] = React.useState(false);

    const declareFocus = React.useCallback<(listeners?: Omit<DocumentEventListener<keyof DocumentEventMap>, 'focusId'>[]) => void>((listeners = []) => {
        dispatchListeners({ 
            type: 'register-focus', 
            focusId,
            // @ts-ignore
            listeners: listeners.map(l => ({ focusId, ...l })),
        });
        setFocus(true);
    }, [dispatchListeners, focusId])

    const declareBlur = React.useCallback(() => {
        dispatchListeners({ type: 'deregister-focus', focusId, removeListeners: true });
        setFocus(false);
    }, [dispatchListeners, focusId]);

    return [isFocused, declareFocus, declareBlur];
}

/**
 * Provides updates to the editorState each time that the argument content is changed
 * @param content the initial content, use empty string for re-initialisation
 * @param onUpdate callback when content is changed. Ensure onUpdate has no important dependants
 * @returns [ editorState, setEditorState ] as usual
 */
export const useEditorUpdater = (content: RawDraftContentState | string, onUpdate?: (newState: EditorState) => void): [ EditorState, React.Dispatch<React.SetStateAction<EditorState>> ] => {
    const [editorState, setEditorState] = React.useState(() => EditorState.createWithContent(
        typeof content === 'string' ? ContentState.createFromText(content) : convertFromRaw(content)
    ));

    // updating editorState when content changes
    React.useEffect(() => {
        const newState = content 
            ? EditorState.acceptSelection(
                EditorState.createWithContent(
                    typeof content === 'string' ? ContentState.createFromText(content) : convertFromRaw(content)
                ),
                editorState.getSelection() // we try to keep our previous selection state
            ) 
            : EditorState.createEmpty()
        
        setEditorState(newState)
        if (onUpdate) onUpdate(newState)
        // eslint-disable-next-line
    }, [content]);

    return [editorState, setEditorState];
}

/**
 * Hook to log when the text editor has been edited. Calls the dbWrite callback at 
 * intervals where saving is necessary - that is, 10 seconds after any changes
 * or immediately after edit has ended.
 */
export const useEditorChangeLogger = (dbWrite: (editorState: EditorState) => void): {
    editStart: (initState: EditorState) => void, 
    editChange: (newState: EditorState) => void, 
    editEnd: () => void,
} => {
    const savedState = React.useRef<EditorState | null>(null);
    const timeout = React.useRef<NodeJS.Timeout | null>(null);
    const toSave = React.useRef<EditorState | null>(null);

    const editStart = React.useCallback((init: EditorState) => {
        // saved state is what we will be using to compare with future changes
        // this is safe to be changed however much we want
        savedState.current = init;
    }, [])

    const editChange = React.useCallback((newState: EditorState) => {
        if (!savedState.current) return; // sometimes edit change will be called before edit start - focus firing before click
        
        const currentContentState = savedState.current.getCurrentContent()
        const newContentState = newState.getCurrentContent()
    
        // we do a shallow compare with the previous db saved state
        if (currentContentState !== newContentState) {
            toSave.current = newState;

            // There was a change in the content
            if (timeout.current) clearTimeout(timeout.current);
            timeout.current = setTimeout(() => {
                // note we update savedState here, but savedState MUST be updated 
                // again if the editor state is being flushed with the new db written
                // state
                savedState.current = newState
                timeout.current = null
                toSave.current = null
                dbWrite(newState)
            }, 10000) 
        } 
    }, [dbWrite]);

    const editEnd = React.useCallback(() => {        
        if (toSave.current) {
            if (timeout.current) clearTimeout(timeout.current);
            // save the current state
            dbWrite(toSave.current)
            toSave.current = null
        } 
        // reset all refs
        savedState.current = null;
        timeout.current = null
    }, [dbWrite])

    return { editStart, editChange, editEnd };
}