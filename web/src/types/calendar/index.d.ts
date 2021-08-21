// Type definitions for the calendar component

import { RawDraftContentState } from "draft-js";

///////////////////////////////////////////////////////////////////////////////
// Calendar state export interfaces 

/**
 * Interface for the object containing the calendar's general state
 */
interface Calendar {
    dates: Array<CalendarDate>; // each loaded date of the calendar
    weekRanges: Array<WeekRange>; // the current range of rendered dates
    planStyles: { [styleId: string] : ?CalendarPlanStyle }; // undefined because id='default' may not exist
}

interface WeekRange {
    startDate: string;
    endDate: string;
    detachLabelsListener: () => void;
    detachPlansListener: () => void;
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
type CalendarAction = InitDispatch | LoadRawDates | LoadDates | SetDates | SetWeekRanges | SetLabels | SetStyles | SetPlans;

interface InitDispatch { 
    type: 'init'; 
}

interface LoadDates {
    type: 'load-dates';
    dir: 'start' | 'end';
    startDate: string;
    endDate: string;
}

interface LoadRawDates extends LoadDates {
    type: 'load-raw-dates';
}

interface SetDates {
    type: 'set-dates';
    dates: CalendarDate[];
}

interface SetWeekRanges {
    type: 'set-week-ranges';
    weekRanges: WeekRange[];
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
