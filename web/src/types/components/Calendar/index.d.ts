// Type definitions for the calendar component

import { RawDraftContentState } from "draft-js";
import { AllCalendarDates } from "types/pages/HomePage";

///////////////////////////////////////////////////////////////////////////////
// Calendar state interfaces 

/**
 * Interface for the object containing the calendar's general state
 */
export interface Calendar {
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

/**
 * Interface for objects describing data for each calendar date
 */
export interface CalendarDate {
    dateStr: string; // the dateStr of the date e.g. 20210719 for 2021 Aug 19th
    label: CalendarDateLabel | null; // the text label of the date
    plans: CalendarPlan[]; // the plans belonging to the current date
}

/**
 * CalendarDateLabel structure
 */
export interface CalendarDateLabel {
    labelId: string; // from document id
    content: RawDraftContentState | string; // label should be deleted if content doesnt exist
}

/**
 * Calendar Plan structure
 */
export interface CalendarPlan {
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
export interface CalendarPlanStyle {
    label: string, // label of the style e.g. "Normal Plan", "Deadline", ... 
    color: string, // css color string
    colorDone: string, // css color string
}
