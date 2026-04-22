function pipeline(seed: number): number {
    let current = seed;
    current = current + 2;
    current = current * 3;
    current = current - 4;
    return current;
}

console.log(pipeline(5));
