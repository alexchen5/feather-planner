import { CalendarDateLabel, CalendarPlan, CalendarPlanStyle, DateRange } from "types/components/Calendar";
import { FeatherPlanner } from ".";

export type FeatherPlannerReducer = (state: FeatherPlanner, action: FeatherPlannerAction) => FeatherPlanner;

export type FeatherPlannerAction = UpdateDateRanges | CleanDateRanges | SetLabels | SetStyles | SetPlans;

/**
 * Given a new render range which the calendar component is loading at the moment, 
 * update the db listeners in FeatherPlanner.dateRanges
 */
export interface UpdateDateRanges {
    type: 'update-date-ranges';
    newRenderRange: DateRange;
}

export interface CleanDateRanges {
    type: 'clean-date-ranges';
}

/**
 * Update all planStyles
 * 
 * The method updates FeatherPlanner.calendarPlanStyles and the cached planStyles.
 */
 export interface SetStyles {
    type: 'set-styles';
    planStyles: { [styleId: string] : CalendarPlanStyle };
}

/**
 * Update labels in the range of dates in SetLabels.labels. 
 * 
 * The method updates FeatherPlanner.calendarDates and the cached datesAll.
 */
export interface SetLabels {
    type: 'set-labels';
    labels: { [dateStr: string]: CalendarDateLabel | null };
}

/**
 * Update plans in the range of dates in SetPlans.plans. 
 * 
 * The method updates FeatherPlanner.calendarDates and the cached datesAll.
 */
export interface SetPlans {
    type: 'set-plans';
    plans: { [dateStr: string] : CalendarPlan[] };
}

