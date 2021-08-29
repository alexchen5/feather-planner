import { DateRange } from "types";
import { AllCalendarDates } from "types/pages/HomePage";
import { Calendar } from ".";
import { DragPlan } from "./PlanDragHandler";

export type CalendarReducer = (state: Calendar, action: CalendarAction) => Calendar

/**
 * Types of CalendarContext dispatches
 */
export type CalendarAction = 
    StateCallback
    | AcceptAllDatesUpdate | SetRenderRange | MoveRenderRange 
    | PauseDataSync | ResumeDataSync
    | MovePlans
    | AddUndo | UseUndo | UseRedo;

///////////////////////////////////////////////////////////////////////////////
// Data manipulation CalendarAction dispatch

export interface StateCallback {
    type: 'state-callback';
    callback: (state: Calendar) => void;
}

export interface AcceptAllDatesUpdate {
    type: 'accept-all-dates-update';
    dates: AllCalendarDates;
}

/**
* Set the range of dates which are being rendered.
* 
* Note that if looking to move the render range in an incremental way, use MoveRenderRange.
*/
export interface SetRenderRange {
    type: 'set-render-range';
    renderRange: DateRange; 
}

/**
* Move the current render range in a scroll direction. 
* 
* Calendar dateRanges are expanded based on the new renderRange, but none are destroyed.
*/
export interface MoveRenderRange {
    type: 'move-render-range';
    dir: 'up' | 'down';
    speed: 1 | 2 | 3; // higher number for faster scroll
}

/**
* Pause the syncing of data with allPlans to avoid disruption
*/
export interface PauseDataSync {
    type: 'pause-data-sync';
}

/**
* Resume the syncing of data. Opt in to update all data now, or 
* wait for a full batch update.
*/
export interface ResumeDataSync {
    type: 'resume-data-sync';
    syncNow: boolean;
}

export interface MovePlans {
    type: 'move-plans';
    dragPlans: DragPlan[];
}

///////////////////////////////////////////////////////////////////////////////
// Calendar data dispatch items 

/**
* Add an undo function, alongside its redo action
*/
export interface AddUndo {
    type: 'add-undo';
    undo: { undo: () => void, redo: () => void };
}

/**
* Use the undo function at the top of the stack, and add the 
* associated redo to the redo stack
*/
export interface UseUndo {
    type: 'use-undo';
}

/**
* Use the redo function at the top of the stack, and add the 
* associated undo to the undo stack
*/
export interface UseRedo {
    type: 'use-redo';
}