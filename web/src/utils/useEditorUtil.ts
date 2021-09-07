// Custom hooks for working with the draft-js Editor component

import { ContentState, convertFromRaw, EditorState, RawDraftContentState } from "draft-js";
import React from "react";
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
    (listeners?: {
        type: keyof DocumentEventMap;
        action: (ev: DocumentEventMap[keyof DocumentEventMap]) => void;
    }[]) => void, 
    () => void,
] => {
    const [isFocused, setFocus] = React.useState(false);

    const declareFocus = (listeners = [] as { type: keyof DocumentEventMap, action: (ev: DocumentEventMap[keyof DocumentEventMap]) => void; }[] ) => {
        dispatchListeners({ 
            type: 'register-focus', 
            focusId,
            listeners: listeners.map(l => ({ focusId, type: l.type, callback: l.action })),
        });
        setFocus(true);
    }

    const declareBlur = () => {
        dispatchListeners({ type: 'deregister-focus', focusId, removeListeners: true });
        setFocus(false);
    }

    return [isFocused, declareFocus, declareBlur];
}

/**
 * Provides updates to the editorState each time that the argument content is changed
 * @param content the initial content, use empty string for re-initialisation
 * @returns [ editorState, setEditorState ] as usual
 */
export const useEditorUpdater = (content: RawDraftContentState | string): [ EditorState, React.Dispatch<React.SetStateAction<EditorState>> ] => {
    const [editorState, setEditorState] = React.useState(() => EditorState.createWithContent(
        typeof content === 'string' ? ContentState.createFromText(content) : convertFromRaw(content)
    ));

    // updating editorState when content changes
    React.useEffect(() => {
        setEditorState(
            EditorState.createWithContent(
              typeof content === 'string' ? ContentState.createFromText(content) : convertFromRaw(content)
            )
        );
    }, [content]);

    return [editorState, setEditorState];
}

/**
 * Gives information about whether the editor content has actually been updated,
 * in order to save db writes.
 * 
 * @param initState the initial editor state
 * @returns [ didChange, logChange, reset ]
 * 
 * didChange - whether the state changed from when it was last reset
 * 
 * logChange - should be called each time the editor state changes 
 * 
 * reset - called to reset the editor logger
 */
export const useEditorChangeLogger = (initState: EditorState): [ boolean, (newState: EditorState) => void, (reset: EditorState) => void ] => {
    const originalState = React.useRef<EditorState>(initState);
    const [didChange, setDidChange] = React.useState(false);

    const logChange = (newState: EditorState) => {
        const currentContentState = originalState.current.getCurrentContent()
        const newContentState = newState.getCurrentContent()
    
        // note that this comparison of variables is incomplete
        if (currentContentState !== newContentState) {
            // There was a change in the content  
            setDidChange(true);
        } else {
            // No change from original / the change was triggered by a change in focus/selection
            setDidChange(false);
        }
    }

    const reset = (reset: EditorState) => {
        setDidChange(false);
        originalState.current = reset;
    }

    return [didChange, logChange, reset];
}