import React, { useState, useRef } from 'react';
import { Camera as CameraIcon, Upload as UploadIcon, X as XIcon, Check as CheckIcon, AlertTriangle } from 'lucide-react';
import Tesseract from 'tesseract.js';
import heic2any from 'heic2any';

interface ExtractedItem {
  sku: string;
  name: string;
  quantity: number;
  confidence: number;
}

interface PackingSlipScannerProps {
  onItemsExtracted: (items: Array<{ itemNo: string; description: string; quantity: number }>, shipmentId?: string) => void;
  inventory: Array<{ sku: string; name: string; qty_on_hand: number }>;
  onClose: () => void;
}

export function PackingSlipScanner({ onItemsExtracted, inventory, onClose }: PackingSlipScannerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [extractedShipmentId, setExtractedShipmentId] = useState<string>('');
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_DIMENSION = 2000;

  const blobToJpegDataUrl = async (blob: Blob): Promise<string> => {
    // Draw to canvas and export as JPEG to normalize format for Tesseract
    const url = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = url;
      });

      let { width, height } = img;
      const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
      if (scale < 1) {
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      return dataUrl;
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const ensureJpegDataUrl = async (file: File): Promise<string> => {
    const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || /\.heic$/i.test(file.name);
    let workingBlob: Blob = file;

    if (isHeic) {
      try {
        const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
        workingBlob = Array.isArray(converted) ? converted[0] : (converted as Blob);
      } catch (e) {
        console.error('HEIC conversion failed:', e);
        throw new Error('Unsupported HEIC image. Please use JPG or PNG, or retake the photo as “Most Compatible” in camera settings.');
      }
    }

    // Normalize any image (including JPEG/PNG) through canvas to avoid decoder issues
    return await blobToJpegDataUrl(workingBlob);
  };

  const processImage = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      const dataUrl = await ensureJpegDataUrl(file);

      const result = await Tesseract.recognize(dataUrl, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round((m.progress || 0) * 100));
          }
        }
      });

      const extractedText = result.data.text;
      const { items, shipmentId } = parsePackingSlipText(extractedText);
      
      setExtractedShipmentId(shipmentId);
      
      if (items.length === 0) {
        setError('No items could be extracted from the image. Please try a clearer image or enter items manually.');
      } else {
        setExtractedItems(items);
        setShowResults(true);
      }
    } catch (err: any) {
      console.error('OCR Error:', err);
      setError(err?.message || 'Failed to process the image. Please try again or enter items manually.');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const parsePackingSlipText = (text: string): { items: ExtractedItem[], shipmentId: string } => {
    const lines = text.split('\n').filter(line => line.trim());
    const items: ExtractedItem[] = [];
    let shipmentId = '';
    
    // Patterns for shipment/packing slip numbers - prioritize numeric IDs
    const shipmentPatterns = [
      // Look for 6-10 digit numbers (like 20250440)
      /(?:packing\s*slip|shipment|order|invoice|po|purchase\s*order)[\s#:]*(\d{6,10})/i,
      // Standalone 8+ digit numbers that look like IDs
      /(?:^|\s)(\d{8,10})(?:\s|$)/,
      // Numbers with prefixes like PS123456, SH123456
      /(?:PS|SH|PO|INV)[\s#:]*(\d{6,10})/i,
      // General pattern for reference numbers
      /(?:ref|reference|tracking|number)[\s#:]*(\d{6,10})/i,
      // Fallback for any alphanumeric after common keywords
      /(?:packing\s*slip|shipment|order)[\s#:]*([A-Z0-9]{6,12})/i
    ];

    // Extract shipment ID first - prioritize longer numeric matches
    for (const line of lines) {
      if (shipmentId) break;
      
      for (const pattern of shipmentPatterns) {
        const match = line.match(pattern);
        if (match && match[1] && match[1].length >= 6) {
          // Prefer numeric IDs over alphanumeric
          const candidate = match[1].trim();
          if (/^\d+$/.test(candidate) && candidate.length >= 6) {
            shipmentId = candidate;
            break;
          } else if (!shipmentId && candidate.length >= 6) {
            // Keep as fallback if no numeric ID found
            shipmentId = candidate;
          }
        }
      }
    }
    
    // Common patterns for packing slips
    const itemPatterns = [
      // SKU followed by description and quantity
      /([A-Z0-9\-]+)\s+(.+?)\s+(\d+)$/,
      // Quantity followed by SKU and description  
      /^(\d+)\s+([A-Z0-9\-]+)\s+(.+)/,
      // SKU, description, quantity separated by tabs or multiple spaces
      /([A-Z0-9\-]+)\s{2,}(.+?)\s{2,}(\d+)/
    ];

    for (const line of lines) {
      const cleanLine = line.trim();
      
      // Skip headers and common non-item lines
      if (cleanLine.match(/^(item|sku|product|description|qty|quantity|total|subtotal|shipping|tax|packing|slip|order|date)/i)) {
        continue;
      }

      for (const pattern of itemPatterns) {
        const match = cleanLine.match(pattern);
        if (match) {
          let sku, name, quantity;
          
          // Determine which capture group is which based on the pattern
          if (pattern.source.includes('^(\\d+)')) {
            // Pattern starts with quantity
            quantity = parseInt(match[1]);
            sku = match[2];
            name = match[3];
          } else {
            // Pattern starts with SKU
            sku = match[1];
            name = match[2];
            quantity = parseInt(match[3] || match[2]);
          }

          if (sku && name && quantity > 0) {
            // Check if this item exists in inventory
            const inventoryItem = inventory.find(inv => 
              inv.sku.toLowerCase() === sku.toLowerCase() ||
              inv.name.toLowerCase().includes(name.toLowerCase().substring(0, 10))
            );

            items.push({
              sku: inventoryItem?.sku || sku,
              name: inventoryItem?.name || name,
              quantity,
              confidence: inventoryItem ? 0.9 : 0.6
            });
          }
          break;
        }
      }
    }

    // Remove duplicates
    const uniqueItems = items.filter((item, index, self) => 
      index === self.findIndex(t => t.sku === item.sku)
    );

    return { items: uniqueItems, shipmentId };
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processImage(file);
    }
  };

  const handleConfirmItems = () => {
    const confirmedItems = extractedItems.map(item => ({
      itemNo: item.sku,
      description: item.name,
      quantity: item.quantity
    }));
    
    onItemsExtracted(confirmedItems, extractedShipmentId);
    onClose();
  };

  const updateItemQuantity = (index: number, newQuantity: number) => {
    const updatedItems = [...extractedItems];
    updatedItems[index].quantity = Math.max(1, newQuantity);
    setExtractedItems(updatedItems);
  };

  const removeItem = (index: number) => {
    setExtractedItems(extractedItems.filter((_, i) => i !== index));
  };

  if (showResults) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-foreground">Review Extracted Items</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Show extracted shipment ID if found */}
          {extractedShipmentId && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckIcon className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-semibold text-green-800 dark:text-green-200">Shipment ID Found</p>
                  <p className="text-lg font-mono text-green-700 dark:text-green-300">{extractedShipmentId}</p>
                </div>
              </div>
            </div>
          )}

          {extractedItems.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
              <p className="text-muted-foreground">No items could be extracted from the image.</p>
              <button
                onClick={() => setShowResults(false)}
                className="mt-4 btn-secondary"
              >
                Try Another Image
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-6">
                {extractedItems.map((item, index) => (
                  <div key={index} className="border border-border rounded-lg p-4 bg-secondary/30">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-semibold">{item.sku}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.confidence > 0.8 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }`}>
                            {item.confidence > 0.8 ? 'Match Found' : 'Manual Review'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{item.name}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                          className="w-20 input text-center"
                        />
                        <button
                          onClick={() => removeItem(index)}
                          className="p-2 text-muted-foreground hover:text-destructive rounded-lg transition-colors"
                        >
                          <XIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleConfirmItems}
                  className="flex-1 btn-primary"
                >
                  <CheckIcon className="h-4 w-4 mr-2" />
                  Add {extractedItems.length} Items
                </button>
                <button
                  onClick={() => setShowResults(false)}
                  className="btn-secondary"
                >
                  Scan Again
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-foreground">Scan Packing Slip</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 border border-destructive/20 bg-destructive/10 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </div>
        )}

        {isProcessing ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground mb-2">Processing image...</p>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{progress}% complete</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Upload an image of your packing slip and we'll automatically extract the items and quantities.
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="space-y-3">
              <button
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.setAttribute('capture', 'environment');
                    fileInputRef.current.click();
                  }
                }}
                className="w-full btn-primary py-4 text-lg"
              >
                <CameraIcon className="h-6 w-6 mr-3" />
                Take Photo
              </button>
              
              <button
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.removeAttribute('capture');
                    fileInputRef.current.click();
                  }
                }}
                className="w-full btn-secondary py-4 text-lg"
              >
                <UploadIcon className="h-6 w-6 mr-3" />
                Upload Image
              </button>
            </div>

            <div className="mt-6 p-4 bg-secondary/30 rounded-lg">
              <h4 className="text-sm font-semibold text-foreground mb-2">Tips for best results:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Ensure good lighting and clear text</li>
                <li>• Include the full packing slip in frame</li>
                <li>• Avoid shadows and reflections</li>
                <li>• Make sure text is not blurry</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}