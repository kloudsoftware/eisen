export interface Comparable <T> {
    equals (o: T): boolean;
}


export function arraysEquals <T extends Comparable<T>> (arrayA: T[], arrayB: T[]): boolean {
    if(arrayA.length != arrayB.length) {
        return false;
    }

    for(let i = 0; i < arrayA.length; i++) {
        if(!arrayA[i].equals(arrayB[i])) {
            return false;
        }
    }

    return true;
}
