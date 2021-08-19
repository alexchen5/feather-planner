/**
 * Interface used for global uid context
 */
interface UidContext {
    uid: string | false; // this is the uid, or false if no uid
    setUid: React.Dispatch<React.SetStateAction<string | false>>; // setter function for the uid
}