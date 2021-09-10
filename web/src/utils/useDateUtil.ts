// Util file for custom hooks related to calculating the date

import React from "react";
import { dateToStr, longWeekdayArray } from "./dateUtil";

/**
 * Custom hook to determine if a dateStr corresponds to today. The potential value 
 * is updated every second
 * @param dateStr the date in dateStr form - 'YYYYMMDD', where month starts from 00
 * @returns true, if is today
 */
export const useIsToday = (dateStr: string) => {
    const [isToday, setIsToday] = React.useState(dateStr === dateToStr());

    React.useEffect(() => {
        if (dateStr < dateToStr()) return;
        const timer = setInterval(() => {
            setIsToday(dateStr === dateToStr());
        }, 1000);
        return () => clearInterval(timer);
    }, [dateStr]);

    return isToday;
}

export const useDateDisplay = (): string => {
    const [dateDisplay, setDateDisplay] = React.useState(getDisplay);

    React.useEffect(() => {
        const timer = setInterval(() => {
            setDateDisplay(getDisplay);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    return dateDisplay;
}

const getDisplay = () => {
    const d = new Date();
    return longWeekdayArray[d.getDay()] 
        + ' ' + d.getDate() + '/' + (d.getMonth() + 1) + '/' + `${d.getFullYear()}`.substring(2)
        + ' ' + d.getHours() % 12 + ':' + `${d.getMinutes()}`.padStart(2, '0') 
        + ' ' + (d.getHours() >= 12 ? 'pm' : 'am')
}