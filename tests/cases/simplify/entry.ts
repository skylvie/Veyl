function render(value: number): number {
    const first = value + 1;
    const second = first + 1;

    if (second > 3) {
        return second;
    } else {
        return first;
    }
}

console.log(render(2));
