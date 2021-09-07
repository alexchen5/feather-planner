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

export function useUndoRedo() {
    const [stack, setStack] = React.useState<{
        undo: UndoRedoAction[];
        redo: UndoRedoAction[];
    }>({ undo: [], redo: [] });

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