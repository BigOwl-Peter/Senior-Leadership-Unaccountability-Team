import seedrandom from 'seedrandom';
// Independent streams mean adding a new system cannot consume another system's random draws.
export function randomFor(seed: string, stream: string) {
  const random = seedrandom(`${seed}:${stream}`);
  return {
    value: () => random(),
    int: (min: number, max: number) =>
      Math.floor(random() * (max - min + 1)) + min,
  };
}
