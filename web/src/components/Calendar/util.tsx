export const DAY_START: 'MON' | 'SUN' = 'MON';
export const NUM_WEEKS_START = 5;
export const PAGINATE_WEEKS_NXT = 4;
export const PAGINATE_WEEKS_PRV = 3;

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
  for (let curDate = dateStart; curDate !== dateEnd; curDate = adjustDays(curDate, 1)) {
    ret.push(curDate);
  }
  return ret;
}

export function getRange(dateStart, dateEnd) {
  const ret = [];
  for (let curDate = dateStart; curDate !== dateEnd; curDate = adjustDays(curDate, 1)) {
    ret.push({
      date_str: curDate,
      plans: [],
    });
  }
  return ret;
}

export function getUpdateRange(dateStart, dateEnd) {
  const ret = {};
  for (let curDate = dateStart; curDate !== dateEnd; curDate = adjustDays(curDate, 1)) {
    ret[curDate] = [];
  }
  return ret;
}

export function newDateRange(plans, dir="INIT") {
  if (dir === "INIT") {
    const start = adjustDays(dateToStr(), -7 - (strToDate().getDay() + 7 - getDayStart()) % 7);
    const end = adjustDays(start, 7 * NUM_WEEKS_START);
    return [getRange(start, end), start, end];
  } 
  else if (dir === "END") {
    const start = adjustDays(plans[plans.length - 1].date_str, 1);
    const end = adjustDays(start, 7 * PAGINATE_WEEKS_NXT);
    return [getRange(start, end), start, end];
  }
  else if (dir === "FRONT") {
    const end = plans[0].date_str;
    const start = adjustDays(end, -7 * PAGINATE_WEEKS_PRV);
    return [getRange(start, end), start, end];
  }
  else {
    console.log('Unknown dir:', dir);
  }
}

export function getPlanIds(dates, dateStr) {
  return dates.find(e => e.date_str === dateStr).plans.reduce((acc, cur) => {return [...acc, cur.plan_id]}, [])
}

export function getPlan(dates, planId) {
  for (let i = 0; i < dates.length; i++) {
    for (let j = 0; j < dates[i].plans.length; j++) {
      if (dates[i].plans[j].plan_id === planId) {
        return {...dates[i].plans[j]}
      }
    }
  }

  return null;
}

/**
 * @precondition a range of dates are startDate <= date < endDate. The number of dates can be separated into weeks
 * @param {DateStr} startDate 
 * @param {DateStr} endDate 
 * @returns an array of objects containing start and end
 */
export function getWeeklyRanges(startDate, endDate) {
  const ret = []
  const cur = {}
  let curRange = 0;
  for (let i = startDate; i <= endDate; i = adjustDays(i, 1)) {
    if (curRange === 0) {
      cur.start = i;
    }
    if (curRange === 7) {
      cur.end = i;
      ret.push({...cur});
      cur.start = i;
      curRange = 0;
    }
    curRange++;
  }
  return ret;
}

/**
 * Return the indices to keep upon a reset 
 * @param {Array<Range>} range 
 */
export function getResetIndices(range) {
  let curWeek = 0;
  for (let i = 0; i < range.length; i++) {
    if (getRangeDates(range[i].start, range[i].end).includes(dateToStr())) {
      curWeek = i;
      break;
    }
  }
  return {
    floor: curWeek - 1,
    roof: curWeek - 1 + NUM_WEEKS_START,
  }
}