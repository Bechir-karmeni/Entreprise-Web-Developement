-- Optional barcode (EAN/UPC digits) on a shopping item. Used to look up prices in Open Prices.
-- Items typed by hand have no barcode and therefore no automatic price lookup.
ALTER TABLE shopping_items ADD COLUMN barcode VARCHAR(14) NULL;
