import React from "react";
import { dateToStr } from "./dateUtil";

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