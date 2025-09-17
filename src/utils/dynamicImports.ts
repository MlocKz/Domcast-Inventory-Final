// Dynamic imports for heavy libraries to improve initial load time

// Lazy load Tesseract.js
export const loadTesseract = async () => {
  const { createWorker } = await import('tesseract.js');
  return createWorker;
};

// Lazy load XLSX
export const loadXLSX = async () => {
  const XLSX = await import('xlsx');
  return XLSX;
};

// Lazy load date-fns functions
export const loadDateFns = async () => {
  const [{ format }, { parseISO }, { isValid }] = await Promise.all([
    import('date-fns/format'),
    import('date-fns/parseISO'),
    import('date-fns/isValid')
  ]);
  
  return { format, parseISO, isValid };
};

// Preload critical libraries
export const preloadCriticalLibraries = () => {
  // Preload in idle time
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      loadDateFns();
    });
  } else {
    setTimeout(() => {
      loadDateFns();
    }, 100);
  }
};