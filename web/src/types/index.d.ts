export interface DateRange {
    startDate: string;
    endDate: string;
}

export interface DatePlansUpdate {
    [dateStr: string]: string[] | undefined;
}