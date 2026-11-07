import { expect, it } from 'vitest';
import { planMetadataMigration } from '../scripts/migrate-sheet-metadata.mjs';
import config from '../src/lib/server/sheetMetadata.json';
const workbook = () => ({ sheets: Object.entries(config.widths).map(([title, width], sheetId) => ({ properties: { title, sheetId, gridProperties: { columnCount: width } }, data: [{ rowData: [{ values: Array.from({ length: width }, () => ({ userEnteredValue: { stringValue: 'Existing operational header' } })) }] }] })) });
it('plans only trailing headers/capacity and refuses header collisions', () => {
 const data = workbook(); const before = JSON.stringify(data); const plan = planMetadataMigration(data);
 expect(plan).toHaveLength(8); expect(JSON.stringify(data)).toBe(before);
 expect(plan.filter(r => r.updateCells).map(r => r.updateCells.start.columnIndex)).toEqual([21, 21, 84, 23]);
 data.sheets[0].data[0].rowData[0].values.push({ userEnteredValue: { stringValue: 'Unknown existing header' } });
 expect(() => planMetadataMigration(data)).toThrow('Unexpected trailing');
});
it('is a no-op after all four headers and capacities are migrated', () => {
 const data = workbook();
 data.sheets.forEach(sheet => {
  sheet.properties.gridProperties.columnCount += 4;
  sheet.data[0].rowData[0].values.push(...config.headers.map(stringValue => ({ userEnteredValue: { stringValue } })));
 });
 expect(planMetadataMigration(data)).toEqual([]);
});
