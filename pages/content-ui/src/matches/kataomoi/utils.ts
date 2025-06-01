export const debounce = function <T extends (...args: unknown[]) => void>(
  func: T,
  wait: number,
  immediate: boolean = false,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null;

  return function executedFunction(...args: Parameters<T>) {
    // @ts-expect-error 'this' implicitly has type 'any'
    const context = this; // eslint-disable-line @typescript-eslint/no-this-alias

    const later = function () {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };

    const callNow = immediate && !timeout;
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    if (callNow) func.apply(context, args);
  };
};
