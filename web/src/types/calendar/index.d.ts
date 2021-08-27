// Type definitions for the calendar component

import { RawDraftContentState } from "draft-js";
import { AllCalendarDates } from "types";

///////////////////////////////////////////////////////////////////////////////
// Calendar state interfaces 

/**
 * Interface for the object containing the calendar's general state
 */
interface Calendar {
    /**
     * Our dates passed down to our children components and rendered on the screen. 
     */
    dates: CalendarDate[]; 

    /**
     * False if Calendar.dates should not be updated when Calendar.datesAll are updated
     */
    shouldSyncDates: boolean;

    /**
     * Undo functions which can be called
     */
    undoStack: {undo: () => void, redo: () => void}[];

    /**
     * Redo functions which can be called
     */
    redoStack: {undo: () => void, redo: () => void}[];
}

interface DateRange {
    startDate: string;
    endDate: string;
}

/**
 * Interface for objects describing data for each calendar date
 */
interface CalendarDate {
    dateStr: string; // the dateStr of the date e.g. 20210719 for 2021 Aug 19th
    label: CalendarDateLabel | null; // the text label of the date
    plans: CalendarPlan[]; // the plans belonging to the current date
}

/**
 * CalendarDateLabel structure
 */
interface CalendarDateLabel {
    labelId: string; // from document id
    content: RawDraftContentState | string; // label should be deleted if content doesnt exist
}

/**
 * Calendar Plan structure
 */
interface CalendarPlan {
    planId: string; // from document id
    restoreData: any; // object used to restore plan data for undo
    dateStr: string; // plan should be deleted if dateStr is invalid
    isDone: boolean; // defaults to false
    content: RawDraftContentState | string; // plan should be deleted if content doesnt exist
    styleId: string; // defaults to empty string
    prv: string; // the planId which appears before this plan in a datenode, defaults to empty string
}

/**
 * Calendar Plan Style structure
 */
interface CalendarPlanStyle {
    label: string, // label of the style e.g. "Normal Plan", "Deadline", ... 
    color: string, // css color string
    colorDone: string, // css color string
}

///////////////////////////////////////////////////////////////////////////////
// Calendar dispatch interfaces 

/**
 * Types of CalendarContext dispatches
 */
type CalendarAction = 
    AcceptAllDatesUpdate | SetRenderRange | MoveRenderRange 
    | PauseDataSync | ResumeDataSync
    | MovePlan
    | AddUndo | UseUndo | UseRedo;

///////////////////////////////////////////////////////////////////////////////
// Data manipulation CalendarAction dispatch

interface AcceptAllDatesUpdate {
    type: 'accept-all-dates-update';
    dates: AllCalendarDates;
}

/**
 * Set the range of dates which are being rendered.
 * 
 * Note that if looking to move the render range in an incremental way, use MoveRenderRange.
 */
interface SetRenderRange {
    type: 'set-render-range';
    renderRange: DateRange; 
}

/**
 * Move the current render range in a scroll direction. 
 * 
 * Calendar dateRanges are expanded based on the new renderRange, but none are destroyed.
 */
interface MoveRenderRange {
    type: 'move-render-range';
    dir: 'up' | 'down';
    speed: 1 | 2 | 3; // higher number for faster scroll
}

/**
 * Pause the syncing of data with allPlans to avoid disruption
 */
interface PauseDataSync {
    type: 'pause-data-sync';
}

/**
 * Resume the syncing of data. Opt in to update all data now, or 
 * wait for a full batch update.
 */
interface ResumeDataSync {
    type: 'resume-data-sync';
    syncNow: boolean;
}

interface MovePlan {
    type: 'move-plan';
    planId: string; 
    dateStr: string; // new dateStr
    prv: string; // new prv
}

///////////////////////////////////////////////////////////////////////////////
// Calendar data dispatch items 

/**
 * Add an undo function, alongside its redo action
 */
interface AddUndo {
    type: 'add-undo';
    undo: { undo: () => void, redo: () => void };
}

/**
 * Use the undo function at the top of the stack, and add the 
 * associated redo to the redo stack
 */
interface UseUndo {
    type: 'use-undo';
}

/**
 * Use the redo function at the top of the stack, and add the 
 * associated undo to the undo stack
 */
interface UseRedo {
    type: 'use-redo';
}