// Type definitions for the calendar component

import { RawDraftContentState } from "draft-js";

///////////////////////////////////////////////////////////////////////////////
// Calendar state export interfaces 

/**
 * Interface for the object containing the calendar's general state
 */
interface Calendar {
    /**
     * Contains the data of all dates which have been loaded from db. This 
     * is rarely (or never?) deleted
     */
    datesAll: { [dateStr: string]: ?CalendarDate }; 

    /**
     * Contains the detachment listeners for week ranges of date data. Call 
     * these when we want to stop listening to updates on a range of dates  
     */
    weekRanges: Array<WeekRange>; 

    /**
     * dateStr[] of dates which should be rendered on the screen. 
     * 
     * When render range is updated, we will automatically update Calendar.dates based on new values. 
     * 
     * When datesAll is updated, we will sync updates on screen if the date is contained within
     * this renderRange. 
     */
    renderRange: Array<string>; 

    /**
     * The dates passed down to our children components 
     */
    dates: Array<CalendarDate>; 

    /**
     * Contains the custom styling for plans 
     */
    planStyles: { [styleId: string] : ?CalendarPlanStyle }; // undefined because id='default' may not exist
}

interface WeekRange {
    startDate: string;
    endDate: string;
}

/**
 * Interface for objects describing data for each calendar date
 */
interface CalendarDate {
    dateStr: string; // the dateStr of the date e.g. 20210719 for 2021 Aug 19th
    label?: CalendarDateLabel; // the text label of the date
    plans: Array<CalendarPlan>; // the plans belonging to the current date
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
    planId: string;
    dateStr: string;
    isDone: boolean;
    content: RawDraftContentState | string; 
    styleId: string;
    prv: string; // empty string if no previous
}

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
 * Dispatch a new range of dates to be rendered.
 * 
 * Will update Calendar.dates based on Calendar.datesAll, with no consideration
 * whether datesAll has real data. 
 * 
 * Opt to update weekRanges automatically, so that week ranges will always cover the render range
 * 
 * Note to always use MoveRenderRange, if continuity is important.
 */
interface SetRenderRange {
    type: 'set-render-range';
    updateWeekRange: boolean; 
    renderRange: string[]; // dateStr[]
}

/**
 * Move the current render range in a scroll direction
 */
interface MoveRenderRange {
    type: 'move-render-range';
    dir: 'up' | 'down';
}
interface SetStyles {
    type: 'set-styles';
    planStyles: { [styleId: string] : CalendarPlanStyle };
}

interface SetLabels {
    type: 'set-labels';
    labels: { [dateStr: string]: CalendarDateLabel | {} | undefined};
}

interface SetPlans {
    type: 'set-plans';
    plans: { [dateStr: string] : CalendarPlan[] };
}
