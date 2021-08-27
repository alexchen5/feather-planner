export const isApple =  (
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
    isMeta: (e: KeyboardEvent) => isApple 
        ? e.metaKey 
        : e.ctrlKey,
    
    /**
     * Is the key the delete key? Accept backspace for mac, as they don't have delete key.
     * @param e the key event
     * @returns true if yes
     */
    isDelete: (e: KeyboardEvent) => isApple 
        ? e.key === 'Backspace' || e.key === 'Delete' 
        : e.key === 'Delete',

}