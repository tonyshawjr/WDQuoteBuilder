import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Path to the file
const filePath = join(process.cwd(), 'client/src/pages/QuoteDetailsPage.tsx');

// Read the content of the file
let content = readFileSync(filePath, 'utf8');

// Replace all instances of light backgrounds with dark ones
content = content.replace(/className="bg-gray-50 p-3 rounded-md"/g, 'className="bg-[#1F1F1F] border border-gray-800 p-3 rounded-md"');
content = content.replace(/className="bg-gray-50 p-4 rounded-md min-h-\[100px\]"/g, 'className="bg-[#1F1F1F] border border-gray-800 p-4 rounded-md min-h-[100px]"');
content = content.replace(/hover:bg-gray-50/g, 'hover:bg-[#282828]');

// Write the updated content back to the file
writeFileSync(filePath, content);

console.log('File updated successfully');
