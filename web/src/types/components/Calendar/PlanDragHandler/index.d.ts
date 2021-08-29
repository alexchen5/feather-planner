/**
 * Holds the initial data of a plan before it goes drag
 */
export interface DraggingPlan {
    planId: string,
    dateStr: string,
    prv: string,
    clientX: number,
    clientY: number,
}