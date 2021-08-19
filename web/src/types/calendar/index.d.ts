// Type definitions for the calendar component

import { RawDraftContentState } from "draft-js";

/**
 * Interface for calendar context and mutating its state
 */
interface CalendarContext {
    calendar: Calendar; // calendar state object
    dispatch: (action: CalendarAction) => Promise<void>;
}

///////////////////////////////////////////////////////////////////////////////
// Calendar state export interfaces 

/**
 * Interface for the object containing the calendar's general state
 */
interface Calendar {
    dates: Array<CalendarDate>; // each loaded date of the calendar
    activeRange: Array<string>; // the current range of rendered dates
    planStyles: { [styleId: string] : CalendarPlanStyle }; // plan styles
}

/**
 * Interface for objects describing data for each calendar date
 */
interface CalendarDate {
    dateStr: string; // the dateStr of the date e.g. 20210719 for 2021 Aug 19th
    label: CalendarDateLabel; // the text label of the date
    plans: Array<CalendarPlan>; // the plans belonging to the current date
}

interface CalendarDateLabel {
    labelId: string;
    content: RawDraftContentState;
}

interface CalendarPlan {
    planId: string;
    content: RawDraftContentState;
    styleId: string;
    prv: string;
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
type CalendarAction = ReplaceDispatch | LoadDispatch | UpdateDispatch | UpdateLabel;

interface ReplaceDispatch {
    type: 'replace';
    dates: Array<CalendarDate>;
}

interface LoadDispatch {
    type: 'load';
    dir: 'END' | 'START';
    dates: Array<CalendarDate>;
}

interface UpdateDispatch {
    type: 'update';
    plans: { [planId: string] : CalendarPlan };
}

interface UpdateLabel {
    type: 'update-label';
    labels: { [labelId: string] : CalendarDateLabel };
}
