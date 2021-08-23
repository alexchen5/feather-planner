// Type definitions for the calendar component

import { RawDraftContentState } from "draft-js";

///////////////////////////////////////////////////////////////////////////////
// Calendar state interfaces 

/**
 * Interface for the object containing the calendar's general state
 */
interface Calendar {
    /**
     * Contains the data of all dates which have been loaded from db. Data is also 
     * loaded in initially from localStorage. 
     */
    datesAll: { [dateStr: string]: ?CalendarDate }; 

    /**
     * Contains the custom styling for plans. This is loaded from db, and also 
     * initially loaded from localStorage.
     */
    planStyles: { [styleId: string] : ?CalendarPlanStyle }; 

    /**
     * The ranges of date listeners which we have attached to the db.
     */
    dateRanges: DateRange[]; 

    /**
     * The dateStr[] of dates which we want in Calendar.dates 
     * 
     * This property is changed via CalendarAction.SetRenderRange and CalendarAction.MoveRenderRange,
     * whose side effects include updating Calendar.dates and expanding Calendar.dateRanges based on 
     * the new value of renderRange.
     */
    renderRange: string[]; 

    /**
     * Our dates passed down to our children components and rendered on the screen. It 
     * is currently assumed that all data here is correct.
     */
    dates: CalendarDate[]; 

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
type CalendarAction = SetRenderRange | MoveRenderRange | SetLabels | SetStyles | SetPlans;

/**
 * Replace the calendar renderRange
 * 
 * Will update Calendar.dates with values from Calendar.datesAll. Note that no error checking is 
 * done here. 
 * 
 * Opt to also replace dateRanges based on the new renderRange.
 * 
 * Note that if looking to move the renderRange in an incremental way, use MoveRenderRange.
 */
interface SetRenderRange {
    type: 'set-render-range';
    updateDateRanges: boolean; 
    renderRange: string[]; // dateStr[]
}

/**
 * Move the current render range in a scroll direction. 
 * 
 * Calendar dateRanges are expanded based on the new renderRange, but none are destroyed.
 */
interface MoveRenderRange {
    type: 'move-render-range';
    dir: 'up' | 'down';
}

/**
 * Update all planStyles
 */
interface SetStyles {
    type: 'set-styles';
    planStyles: { [styleId: string] : CalendarPlanStyle };
}

/**
 * Update labels in the range of dates in SetLabels.labels. 
 * 
 * The method updates Calendar.datesAll, updates the cached datesAll, 
 * and updates Calendar.dates if relevant. 
 */
interface SetLabels {
    type: 'set-labels';
    labels: { [dateStr: string]: CalendarDateLabel | null };
}

/**
 * Update plans in the range of dates in SetPlans.plans. 
 * 
 * The method updates Calendar.datesAll, updates the cached datesAll, 
 * and updates Calendar.dates if relevant. 
 */
interface SetPlans {
    type: 'set-plans';
    plans: { [dateStr: string] : CalendarPlan[] };
}
