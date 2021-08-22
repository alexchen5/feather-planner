import { CalendarDate, CalendarPlan, WeekRange } from "types/calendar";

export const DAY_START: 'MON' | 'SUN' = 'MON';
export const NUM_WEEKS_START = 5;
export const PAGINATE_WEEKS_NXT = 4;
export const PAGINATE_WEEKS_PRV = 3;
export const NUM_WEEKS_ON_SCREEN = 7;

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

export function dateToStr(date = new Date()) {
  // Given a Date object, returns a string in the form 'YYYYMMDD' (where MM is from 01 - 12)
  // Defaults to the Date of today
  return `${date.getFullYear()}` + `${date.getMonth()}`.padStart(2, '0') + `${date.getDate()}`.padStart(2, '0');
}

export function strToDate(dateStr = dateToStr()) {
  // Given a dateStr, returns a date object
  // Defaults to a date object of today, at 00:00:00
  return new Date(parseInt(dateStr.substring(0, 4)), parseInt(dateStr.substring(4, 6)), parseInt(dateStr.substring(6)));
}

export function adjustDays(dateStr = dateToStr(), numDays = 0) {
  let d = strToDate(dateStr);
  d.setDate(d.getDate() + numDays);
  return dateToStr(d);
}

/**
 * Return an array of DateStr within the given range, from dateStart
 * to not including dateEnd
 * @param dateStart 
 * @param dateEnd 
 * @returns array of date strings
 */
export function getRangeDates(dateStart: string, dateEnd: string) {
  const ret = [];
  for (let curDate = dateStart; curDate !== adjustDays(dateEnd, 1); curDate = adjustDays(curDate, 1)) {
    ret.push(curDate);
  }
  return ret;
}

export function getEmptyCalendarDates(dateStart: string, dateEnd: string) {
  const ret: CalendarDate[] = [];
  for (let curDate = dateStart; curDate !== adjustDays(dateEnd, 1); curDate = adjustDays(curDate, 1)) {
    ret.push({
      dateStr: curDate,
      plans: [] as CalendarPlan[],
    });
  }
  return ret;
}

export function getInitCalendarDates(localDates: any, dateStart: string, dateEnd: string) {
  const ret: CalendarDate[] = [];
  for (let curDate = dateStart; curDate !== adjustDays(dateEnd, 1); curDate = adjustDays(curDate, 1)) {
    let plans;
    try {
      plans = localDates[curDate]['plans'];
    } catch (error) {
      plans = [];
    }
    if (!Array.isArray(plans)) plans = [];

    ret.push({
      dateStr: curDate,
      plans: plans,
    });
  }
  return ret;
}

export function getUpdateRange(dateStart: string, dateEnd: string, type: 'object'): { [dateStr: string]: {} };
export function getUpdateRange(dateStart: string, dateEnd: string, type: 'array'): { [dateStr: string]: [] };
export function getUpdateRange(dateStart: string, dateEnd: string, type: 'array' | 'object'): { [dateStr: string]: [] | {} } {
  const ret = {} as { [dateStr: string]: {} };
  for (let curDate = dateStart; curDate !== adjustDays(dateEnd, 1); curDate = adjustDays(curDate, 1)) {
    if (type === 'object')
      ret[curDate] = {};
    else 
      ret[curDate] = [];
  }
  return ret;
}

export function newDateRange(dates: Array<CalendarDate>, dir: 'init' | 'start' | 'end'): [startDate: string, endDate: string] {
  if (dir === "init") {
    const start = adjustDays(dateToStr(), -7 - (strToDate().getDay() + 7 - getDayStart()) % 7);
    const end = adjustDays(start, 7 * NUM_WEEKS_START - 1);
    return [start, end];
  } 
  else if (dir === "end") {
    const start = adjustDays(dates[dates.length - 1].dateStr, 1);
    const end = adjustDays(start, 7 * PAGINATE_WEEKS_NXT);
    return [start, end];
  }
  else if (dir === "start") {
    const end = dates[0].dateStr;
    const start = adjustDays(end, -7 * PAGINATE_WEEKS_PRV);
    return [start, end];
  }
  else {
    const _exhaustiveCheck: never = dir;
    return _exhaustiveCheck;
  }
}

export function getScrollRange(dates: string[], dir: 'up' | 'down'): string[] {
  const shouldExpand = dates.length < (NUM_WEEKS_ON_SCREEN * 7);
  
  if (dir === 'up') {
    return getRangeDates(
      adjustDays(dates[0], shouldExpand ? -14 : -7),
      adjustDays(dates[dates.length - 1],  -7)
    )
  } else {
    return getRangeDates(
      adjustDays(dates[0], shouldExpand ? 0 : 7),
      adjustDays(dates[dates.length - 1], 7)
    )
  }
}

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

export function getPlan(dates: Array<CalendarDate>, planId: string): CalendarPlan | null {
  for (let i = 0; i < dates.length; i++) {
    for (let j = 0; j < dates[i].plans.length; j++) {
      if (dates[i].plans[j].planId === planId) {
        return {...dates[i].plans[j]}
      }
    }
  }
  return null;
}

/**
 * @precondition a range of dates are startDate <= date <= endDate. The number of dates can be separated into weeks
 * @param {DateStr} startDate 
 * @param {DateStr} endDate 
 * @returns an array of objects containing start and end
 */
export function getWeekRanges(startDate: string, endDate: string) {
  const ret: Array<{ startDate: string, endDate: string }> = [];
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

/**
 * Return the indices to keep upon a reset 
 * @param {Array<Range>} range 
 */
export function getResetIndices(range: WeekRange[]) {
  let curWeek = 0;
  for (let i = 0; i < range.length; i++) {
    if (getRangeDates(range[i].startDate, range[i].endDate).includes(dateToStr())) {
      curWeek = i;
      break;
    }
  }
  return {
    floor: curWeek - 1,
    roof: curWeek - 1 + NUM_WEEKS_START,
  }
}

/**
 * Helper function to determine the next weekranges to load. Will add week ranges 
 * for all extra render ranges.
 * @param currentRange current weekrange 
 * @param renderRange the range of dates to be rendered
 * @returns the new week ranges
 */
export function addWeekRanges(currentRange: WeekRange[], renderRange: string[]) {
  const ret = [...currentRange];

  renderRange.forEach((dateStr, i) => {
    // guaranteed that every 7th index should be start of a date 
    if ((i % 7) === 0) {
      // check if dateStr is in weekrange 
      if (!ret.some(e => e.startDate === dateStr)) {
        // dateStr is not in week range 
        ret.push({ startDate: dateStr, endDate: adjustDays(dateStr, 6) })
      }
    }
  })

  return ret;
}
