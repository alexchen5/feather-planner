const dayStart = 'MON';
const numWeeksStart = 5;
const paginateWeeksNext = 4;
const paginateWeeksPrv = 3;

export function getDayStart() {
  switch (dayStart) {
    case 'SUN':
      return 0;
    case 'MON':
      return 1;
    default:
      console.log(`Unrecognised dayStart: ${dayStart}`);
      return 0;
  }
}

export function dateToStr(date = new Date()) {
  // Given a Date object, returns a string in the form 'YYYYMMDD' (where MM is from 00 - 11)
  // Defaults to the Date of today
  return `${date.getFullYear()}` + `${date.getMonth()}`.padStart(2, 0) + `${date.getDate()}`.padStart(2, 0);
}

export function strToDate(dateStr = dateToStr()) {
  // Given a dateStr, returns a date object
  // Defaults to a date object of today, at 00:00:00
  return new Date(dateStr.substring(0, 4), dateStr.substring(4, 6), dateStr.substring(6));
}

export function adjustDays(dateStr = dateToStr(), numDays = 0) {
  let d = strToDate(dateStr);
  d.setDate(d.getDate() + numDays);
  return dateToStr(d);
}

export function getRange(dateStart, dateEnd) {
  const ret = [];
  for (let curDate = dateStart; curDate !== dateEnd; curDate = adjustDays(curDate, 1)) {
    ret.push(curDate);
  }
  return ret;
}

export function newDateRange(plans, dir="INIT") {
  if (dir === "INIT") {
    const start = adjustDays(dateToStr(), getDayStart() - strToDate().getDay() - 7);
    const end = adjustDays(start, 7 * numWeeksStart);
    return [getRange(start, end), "END"];
  } 
  else if (dir === "END") {
    const start = adjustDays(plans[plans.length - 1].date_str, 1);
    const end = adjustDays(start, 7 * paginateWeeksNext);
    return [getRange(start, end), "END"];
  }
  else if (dir === "FRONT") {
    const end = plans[0].date_str;
    const start = adjustDays(end, -7 * paginateWeeksPrv);
    return [getRange(start, end), "FRONT"];
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
