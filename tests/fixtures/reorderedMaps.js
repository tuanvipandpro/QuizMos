// Firestore maps have no meaningful property order; arrays retain their order.
export const reorderedMaps = (value) =>
  Array.isArray(value)
    ? value.map(reorderedMaps)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.keys(value)
            .reverse()
            .map((key) => [key, reorderedMaps(value[key])])
        )
      : value;
