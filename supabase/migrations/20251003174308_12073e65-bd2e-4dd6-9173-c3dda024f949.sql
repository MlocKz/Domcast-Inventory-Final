-- Add classification column to inventory table
ALTER TABLE public.inventory 
ADD COLUMN classification text NOT NULL DEFAULT 'stocking';

-- Add a check constraint to ensure only valid classifications
ALTER TABLE public.inventory
ADD CONSTRAINT inventory_classification_check 
CHECK (classification IN ('stocking', 'non-stocking'));

-- Update the specific SKUs to be non-stocking items
UPDATE public.inventory
SET classification = 'non-stocking'
WHERE sku IN (
  '2112.010L', '2112.020L', '2112.020T', '400.010C', '400.010F', '400.01TBLP  DO NOT USE',
  '400.020F', '400.020LPFR', '400.030C', '400.030F', '400.070C', '400.070F',
  '400.081C', '400.081DEC', '400.081F', '400.081G', '400.082C', '400.082F',
  '400.082G', '400.100C', '400.100F', '400.100LP', '400.110C', '401.010BC',
  '401.010BSTMC', '401.010C', '401.010EC', '401.010F', '401.010LPFR', '401.010SANC',
  '401.010STMC', '401.010WC', '401.030C', '401.030GAS', '402.030C', '403.010',
  '403.010B', '702534709', '703734164', '703740159', 'AN702534709', 'ANDCNASS',
  'DBBA23CI24', 'DBCI23DC', 'DBCI23HF', 'DBCI23SS', 'DBCI2436BA', 'DBCI2436F',
  'DBRG/F12D', 'DBRG/F12PS'
);

-- Add index for faster filtering by classification
CREATE INDEX idx_inventory_classification ON public.inventory(classification);