import React from "react";

export const UndoRedoContext = React.createContext<{
    stack: { 
        undo: UndoRedoAction[],
        redo: UndoRedoAction[],
    };
    addUndo: (action: UndoRedoAction) => void;
    undo: () => void;
    redo: () => void;
}>({
    stack: { undo: [], redo: [] },
    addUndo: () => console.error('Unexpected use of default UndoRedoContext'),
    undo: () => console.error('Unexpected use of default UndoRedoContext'),
    redo: () => console.error('Unexpected use of default UndoRedoContext'),
});

export type UndoRedoAction = { 
    undo: () => void;
    redo: () => void;
};

/**
 * Custom hook to use the undo redo stack
 * @param saveUndoRedo a global variable whos .current attribute represents the saved stack
 * @returns undo redo methods
 */
export function useUndoRedo(saveUndoRedo: { current: { undo: UndoRedoAction[], redo: UndoRedoAction[] } | null}) {
    const [stack, setStack] = React.useState<{
        undo: UndoRedoAction[];
        redo: UndoRedoAction[];
    }>(saveUndoRedo.current ? {...saveUndoRedo.current} : { undo: [], redo: [] });

    React.useEffect(() => {
        saveUndoRedo.current = stack;
        const t = setTimeout(() => {
            saveUndoRedo.current = null;
        }, 1800000) // 30 minute timeout to clear undo/redo stack
        return () => clearInterval(t) // clear timeout on update
    }, [saveUndoRedo, stack])

    const addUndo = React.useCallback((action: UndoRedoAction) => {
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

    return { stack, addUndo, undo, redo };
}