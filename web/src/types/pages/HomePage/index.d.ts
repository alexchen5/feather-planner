import { Calendar, CalendarDate, CalendarPlan, CalendarPlanStyle, DateRange } from "../../components/Calendar";
import { ListenerDateRange } from "./DateRangeListener";

export interface FeatherPlanner {
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
    dateRanges: ListenerDateRange[]; 
}

export type AllCalendarDates = {
    [dateStr: string]: CalendarDate | undefined;
}
