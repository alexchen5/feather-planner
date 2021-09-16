// Key commands mean different things on different operating systems. Here we provide methods for different key commands between apple and windows

import React from "react"

/**
 * We calculate the operating system once, and expect that it won't change.
 */
export const isApple: boolean =  (
    navigator.userAgent.indexOf("Mac") !== -1 // Macintosh
    || navigator.userAgent.indexOf("like Mac") !== -1 // iOS
)

/**
 * Methods for determining special keys across all os's
 */
export const key = {
    /**
     * Is the key the meta key - command key for mac, or ctrl key otherwise ?
     * @param e the key event
     * @returns true if yes
     */
    isMeta: (e: KeyboardEvent | React.KeyboardEvent) => isApple 
        ? e.metaKey 
        : e.ctrlKey,
    
    /**
     * Is the key the delete key? Accept backspace for mac, as they don't have delete key.
     * @param e the key event
     * @returns true if yes
     */
    isDelete: (e: KeyboardEvent | React.KeyboardEvent) => isApple 
        ? e.key === 'Backspace' || e.key === 'Delete' 
        : e.key === 'Delete',

    /**
     * Is the key linked with any command? 
     * @param e the key event
     * @returns true if yes
     */
    isCommand: (e: KeyboardEvent | React.KeyboardEvent) => (
        !e.altKey 
        && !e.ctrlKey
        && !e.metaKey
    ) 
}