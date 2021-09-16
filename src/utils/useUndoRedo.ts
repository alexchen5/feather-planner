import React from "react";

export const UndoRedoContext = React.createContext<UndoRedoData>({
    addAction: () => console.error('Unexpected use of default UndoRedoContext'),
    undo: () => console.error('Unexpected use of default UndoRedoContext'),
    redo: () => console.error('Unexpected use of default UndoRedoContext'),
    undoLength: 0,
    redoLength: 0,
});

export interface UndoRedoData {
    addAction: (action: UndoRedoAction) => void;
    undo: () => void;
    redo: () => void;
    undoLength: number;
    redoLength: number;
}

export type UndoRedoAction = { 
    undo: () => void;
    redo: () => void;
};

/**
 * Custom hook to use the undo redo stack
 * @param saveUndoRedo a global variable whos .current attribute represents the saved stack
 * @returns memoised UndoRedoData
 */
export function useUndoRedo(saveUndoRedo: { undo: UndoRedoAction[], redo: UndoRedoAction[], time: number }): UndoRedoData {
    const [stack, setStack] = React.useState<{
        undo: UndoRedoAction[];
        redo: UndoRedoAction[];
    }>(() => (Date.now() - saveUndoRedo.time) < 1800000 ? {...saveUndoRedo} : { undo: [], redo: [] });

    React.useEffect(() => {
        // save the stack every time it changes
        if (saveUndoRedo.undo !== stack.undo || saveUndoRedo.redo !== stack.redo) {
            saveUndoRedo.undo = stack.undo;
            saveUndoRedo.redo = stack.redo;
            saveUndoRedo.time = Date.now(); // notice we only update time if stack has changed
        }

        // update 30 minute timeout to clear undo/redo stack if it has content
        if (stack.undo.length || stack.redo.length) {
            const t = setInterval(() => {
                // compare current time with the last saved time
                if (Date.now() - saveUndoRedo.time > 1800000) {
                    clearInterval(t)
                    setStack({ undo: [], redo: [] })
                }
            }, 10000) // check time every 10 seconds
            return () => clearInterval(t) // clean up timeout
        }
        return () => {}
    }, [saveUndoRedo, stack])

    const addAction = React.useCallback((action: UndoRedoAction) => {
        setStack(stack => ({
            undo: [ ...stack.undo, action ],
            redo: [],
        }))
    }, [])

    const undo = React.useCallback(() => {
        setStack(stack => {
            const undoStack = [...stack.undo];
            const redoStack = [...stack.redo];
    
            const curUndo = undoStack.pop();
            if (curUndo) {
                curUndo.undo();
                redoStack.push(curUndo);
            }

            return {
                undo: undoStack,
                redo: redoStack,
            }
        })
    }, [])

    const redo = React.useCallback(() => [
        setStack(stack => {
            const undoStack = [...stack.undo];
            const redoStack = [...stack.redo];
    
            const curRedo = redoStack.pop();
            if (curRedo) {
                curRedo.redo();
                undoStack.push(curRedo);
            }

            return {
                undo: undoStack,
                redo: redoStack,
            }
        })
    ], [])

    const ret = React.useMemo<UndoRedoData>(
        () => ({ addAction, undo, redo, undoLength: stack.undo.length, redoLength: stack.redo.length }), 
        [addAction, undo, redo, stack.undo.length, stack.redo.length]
    );

    return ret;
}