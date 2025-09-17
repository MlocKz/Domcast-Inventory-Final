import { useState, useCallback, useMemo } from 'react';

// Custom hook for optimized state management
export function useOptimizedState<T>(initialValue: T) {
  const [state, setState] = useState<T>(initialValue);
  
  const optimizedSetState = useCallback((newState: T | ((prevState: T) => T)) => {
    setState(newState);
  }, []);
  
  return [state, optimizedSetState] as const;
}

// Hook for memoized computed values
export function useMemoizedValue<T>(factory: () => T, deps: React.DependencyList): T {
  return useMemo(factory, deps);
}

// Hook for optimized event handlers
export function useOptimizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  return useCallback(callback, deps);
}