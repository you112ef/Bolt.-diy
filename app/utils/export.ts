/**
 * Triggers a browser download for the given data.
 *
 * @param data The string data to download.
 * @param filename The desired filename for the downloaded file (e.g., "data.json").
 * @param mimeType The MIME type of the file (e.g., "application/json", "text/plain").
 */
export function downloadFile(
  data: string,
  filename: string,
  mimeType: string,
): void {
  try {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading file:', error);
    // Optionally, provide user feedback here, e.g., using a toast notification
    alert(`Failed to download ${filename}. Please try again or check console for errors.`);
  }
}

/**
 * Exports data as a JSON file.
 *
 * @param dataObject The JavaScript object to export.
 * @param filename The base filename (e.g., "system-info"). ".json" will be appended.
 */
export function exportAsJson(dataObject: unknown, filenameBase: string): void {
  try {
    const jsonData = JSON.stringify(dataObject, null, 2);
    downloadFile(jsonData, `${filenameBase}.json`, 'application/json');
  } catch (error) {
    console.error(`Error preparing JSON for ${filenameBase}:`, error);
    alert(`Failed to prepare ${filenameBase}.json for download. Please check console for errors.`);
  }
}

/**
 * Exports text data as a TXT file.
 *
 * @param textData The string data to export.
 * @param filename The base filename (e.g., "git-info"). ".txt" will be appended.
 */
export function exportAsText(textData: string, filenameBase: string): void {
  downloadFile(textData, `${filenameBase}.txt`, 'text/plain');
}
