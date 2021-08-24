import { Calendar, CalendarDate, CalendarPlanStyle, DateRange } from "./calendar";

interface FeatherPlanner {
    /**
     * Contains the data of all dates which have been loaded from db. Data is also 
     * loaded in initially from localStorage. 
     * 
     * TODO: error checking for data integrity, particularly when loading from localStorage
     */
    calendarDates: AllCalendarDates; 
    
    /**
     * Contains the custom styling for plans. This is loaded from db, and also 
     * initially loaded from localStorage.
     */
    calendarPlanStyles: { [styleId: string] : ?CalendarPlanStyle }; 

    /**
     * The ranges of date listeners which we have attached to the db.
     */
    dateRanges: RangeListener[]; 
}

type AllCalendarDates = {
    [dateStr: string]: CalendarDate | undefined;
}

interface RangeListener extends DateRange {
    onScreen: boolean;
}

type FeatherPlannerAction = UpdateDateRanges | CleanDateRanges | SetLabels | SetStyles | SetPlans;

/**
 * Given a new render range which the calendar component is loading at the moment, 
 * update the db listeners in FeatherPlanner.dateRanges
 */
interface UpdateDateRanges {
    type: 'update-date-ranges';
    newRenderRange: DateRange;
}

interface CleanDateRanges {
    type: 'clean-date-ranges';
}

/**
 * Update all planStyles
 * 
 * The method updates FeatherPlanner.calendarPlanStyles and the cached planStyles.
 */
 interface SetStyles {
    type: 'set-styles';
    planStyles: { [styleId: string] : CalendarPlanStyle };
}

/**
 * Update labels in the range of dates in SetLabels.labels. 
 * 
 * The method updates FeatherPlanner.calendarDates and the cached datesAll.
 */
interface SetLabels {
    type: 'set-labels';
    labels: { [dateStr: string]: CalendarDateLabel | null };
}

/**
 * Update plans in the range of dates in SetPlans.plans. 
 * 
 * The method updates FeatherPlanner.calendarDates and the cached datesAll.
 */
interface SetPlans {
    type: 'set-plans';
    plans: { [dateStr: string] : CalendarPlan[] };
}