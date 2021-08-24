// A set of helper functions for date manipulation and initialisation

import { RangeListener } from "types";
import { CalendarDate, DateRange } from "types/calendar";

export const DAY_START: 'MON' | 'SUN' = 'MON';
const NUM_WEEKS_START = 5;

export function getDayStart() {
  switch (DAY_START) {
    case 'SUN':
      return 0;
    case 'MON':
      return 1;
    default:
      console.log(`Unrecognised dayStart: ${DAY_START}`);
      return 0;
  }
}

///////////////////////////////////////////////////////////////////////////////
// Date String manipulation helpers

/**
 * Given a Date object, returns a string in the form 'YYYYMMDD' (note MM is from 00 - 11)
 * @param date the date object, defaulting to the Date of today
 * @returns the associated dateStr
 */
export function dateToStr(date = new Date()) {
  return `${date.getFullYear()}` + `${date.getMonth()}`.padStart(2, '0') + `${date.getDate()}`.padStart(2, '0');
}

/**
 * Given a dateStr, returns a date object, at 00:00:00
 * @param dateStr the given dateStr, defaulting to the dateStr of today
 * @returns the associated Date object
 */
export function strToDate(dateStr = dateToStr()) {
  return new Date(parseInt(dateStr.substring(0, 4)), parseInt(dateStr.substring(4, 6)), parseInt(dateStr.substring(6)));
}

/**
 * Adjust the days on a dateStr
 * @param dateStr the dateStr, defaulting tothe dateStr of today
 * @param numDays number of days to move, negative to move backwards
 * @returns a new dateStr with adjusted days
 */
export function adjustDays(dateStr = dateToStr(), numDays = 0) {
  let d = strToDate(dateStr);
  d.setDate(d.getDate() + numDays);
  return dateToStr(d);
}

/**
 * Get the number of days included in a date range
 * @param dateStart starting date
 * @param dateEnd ending date
 * @returns number of days
 */
export function getRangeLength(dateStart: string, dateEnd: string) {
  let dStart = strToDate(dateStart);
  let dEnd   = strToDate(dateEnd);
  
  return ((dEnd.getTime() - dStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Return an array of DateStr within the given range
 * @param dateStart inclusive start dateStr
 * @param dateEnd inclusive end dateStr
 * @returns array of date strings
 */
export function getRangeDates(dateStart: string, dateEnd: string) {
  const ret = [];
  for (let curDate = dateStart; curDate !== adjustDays(dateEnd, 1); curDate = adjustDays(curDate, 1)) {
    ret.push(curDate);
  }
  return ret;
}

///////////////////////////////////////////////////////////////////////////////
// General helper functions 

/**
 * Get the plan ids of a given date, in order of appearance 
 * @param dates dates array to be searched
 * @param dateStr given date string
 * @returns array of the plan ids
 */
export function getPlanIds(dates: Array<CalendarDate>, dateStr: string) {
  const datePlans = dates.find(e => e.dateStr === dateStr)?.plans || [];
  return datePlans.reduce((acc, cur) => {return [...acc, cur.planId]}, [] as Array<string>)
}

/**
 * Get the render range from a range of calendar dates
 * @param dates the dates
 * @returns the range
 */
export function getRenderRange(dates: Array<CalendarDate>): DateRange  {
  return {
    startDate: dates[0].dateStr,
    endDate: dates[dates.length - 1].dateStr,
  }
}

/**
 * Find the CalendarDate object in an array of CalendarDates 
 * @param dates given calendar dates
 * @param dateStr date string of the calendarDate to return
 * @returns the CalendarDate, or null if not found
 */
export function getDateByStr(dates: Array<CalendarDate>, dateStr: string): CalendarDate | null {
  return dates.find(e => e.dateStr === dateStr) || null;
}

/**
 * Get the date range rendered on the screen
 * @returns the Daterange of dates actually on the screen at the current moment
 */
export function getRenderedDates(): DateRange | null {
  const nodes = document.querySelectorAll(`[fp-role="calendar-date-root"]`);
  
  const start = nodes[0].getAttribute(`data-date`);
  const end = nodes[nodes.length - 1].getAttribute(`data-date`);

  if (start && end) return { startDate: start, endDate: end }
  return null;
}

/**
 * Helper function for getting the initial date range
 * @returns DateRange which should be seen initially 
 */
 export function getInitDateRange(): DateRange {
  const startDate = adjustDays(dateToStr(), -7 - (strToDate().getDay() + 7 - getDayStart()) % 7);
  const endDate = adjustDays(startDate, 7 * NUM_WEEKS_START - 1);

  return {startDate, endDate};
}

/**
 * Helper function useful for db listener functions. 
 * 
 * @param dateStart inclusive start dateStr
 * @param dateEnd inclusive end dateStr
 * @param type the type to be used for an empty date, 'array' or 'object' 
 * @return new object with dateStr as keys, and the associated value is dependant on the type argument. 
 * An empty array is used if type==='array', and null is used if type==='object'
 */
export function getUpdateRange(dateStart: string, dateEnd: string, type: 'object'): { [dateStr: string]: null };
export function getUpdateRange(dateStart: string, dateEnd: string, type: 'array'): { [dateStr: string]: [] };
export function getUpdateRange(dateStart: string, dateEnd: string, type: 'array' | 'object'): { [dateStr: string]: [] | null } {
  const ret = {} as { [dateStr: string]: [] | null };
  for (let curDate = dateStart; curDate !== adjustDays(dateEnd, 1); curDate = adjustDays(curDate, 1)) {
    if (type === 'object')
      ret[curDate] = null;
    else 
      ret[curDate] = [];
  }
  return ret;
}

/**
 * Given a start date and end date, return an array of DateRange representing 
 * each week in the given range. 
 * 
 * @precondition a range of dates are startDate <= date <= endDate. The number of dates can be separated into weeks
 * @param {DateStr} startDate 
 * @param {DateStr} endDate 
 * @returns DateRange[] of ranges 7 days
 */
export function getWeekRanges(startDate: string, endDate: string): DateRange[] {
  const ret: DateRange[] = [];
  const cur = {} as { startDate: string, endDate: string };
  let curRange = 0;
  for (let i = startDate; i <= endDate; i = adjustDays(i, 1)) {
    if (curRange === 0) {
      cur.startDate = i;
    }
    if (curRange === 6) {
      cur.endDate = i;
      ret.push({...cur});
      curRange = -1;
    }
    curRange++;
  }
  
  return ret;
}

///////////////////////////////////////////////////////////////////////////////
// Other helper functions 

/**
 * Helper function for Calendar init, to extract dates from a potentially broken localDates argument
 * 
 * TODO: may break if localDates[curDate]['plans'] is broken, but this needs to be tested
 * @param localDates hopefully in the form datesAll, i.e. { [dateStr: string]: ?CalendarDate }
 * @param dateStart inclusive start dateStr
 * @param dateEnd inclusive end dateStr
 * @returns array to be used directly in Calendar.dates
 */
export function getInitCalendarDates(localDates: any, dateStart: string, dateEnd: string): CalendarDate[] {
  const ret: CalendarDate[] = [];
  for (let curDate = dateStart; curDate !== adjustDays(dateEnd, 1); curDate = adjustDays(curDate, 1)) {
    let plans, label;
    try {
      plans = localDates[curDate]['plans'];
    } catch (error) {
      plans = [];
    }
    try {
      label = localDates[curDate]['label'] || null;
    } catch (error) {
      label = null;
    }
    if (!Array.isArray(plans)) plans = [];

    ret.push({
      dateStr: curDate,
      label,
      plans,
    });
  }
  return ret;
}

/**
 * Positive number of dates over the optimum amount to be diplayed
 * @param dates dates to be rendered
 * @returns 
 */
function getNumDaysOverflow(dates: DateRange) {
  const num = getRangeLength(dates.startDate, dates.endDate);
  
  return Math.max(num - (NUM_WEEKS_START * 7), 0);
}

/**
 * Helper function for adding more dates onto a given range of dates. 
 * @param dates current range of dateStr
 * @param dir direction of scroll
 * @returns a updated range of dateStr reflecting the scroll direction
 */
export function getScrollRange(dates: DateRange, dir: 'up' | 'down', speed: 1 | 2 | 3): DateRange {
  if (dir === 'up') {
    if (speed === 3) {
      return {
        startDate: adjustDays(dates.startDate, -21),
        endDate: adjustDays(dates.endDate, -7 - getNumDaysOverflow(dates))
      }
    }
    if (speed === 2) {
      return {
        startDate: adjustDays(dates.startDate, -14),
        endDate: adjustDays(dates.endDate, -7 - getNumDaysOverflow(dates))
      }
    } 
    return {
      startDate: adjustDays(dates.startDate, -7),
      endDate: adjustDays(dates.endDate, -7 - getNumDaysOverflow(dates))
    }
  } else {
    if (speed === 3) {
      return {
        startDate: adjustDays(dates.startDate, 7 + getNumDaysOverflow(dates)),
        endDate: adjustDays(dates.endDate, 21)
      }
    }
    if (speed === 2) {
      return {
        startDate: adjustDays(dates.startDate, 7 + getNumDaysOverflow(dates)),
        endDate: adjustDays(dates.endDate, 14)
      }
    }
    return {
      startDate: adjustDays(dates.startDate, 7 + getNumDaysOverflow(dates)),
      endDate: adjustDays(dates.endDate, 7)
    }
  }
}

/**
 * Helper function to determine the next DateRanges, given the current 
 * DateRanges and the new renderRange. 
 * @param currentRanges current DateRanges 
 * @param renderRange the range of dates to be rendered
 * @returns a new array of DateRanges
 */
export function addRangeListeners(currentRanges: RangeListener[], renderRange: DateRange): RangeListener[] {
  const newRanges = getWeekRanges(renderRange.startDate, renderRange.endDate);
  const ret = newRanges.map(r => {return { ...r, onScreen: true }});

  currentRanges.forEach(range => {
    if (!ret.some(r => r.startDate === range.startDate)) 
      ret.push({ ...range, onScreen: false });
  })

  return ret;
}
