import * as XLSX from 'xlsx';
import { buildAIPWorkbook, buildInfluenceWorkbook } from './exportWorkbooks';

const filename = value => String(value || 'export').trim().replace(/\s+/g, '_').replace(/[\\/:*?"<>|]/g, '').slice(0, 100);
export function downloadExport(kind, entries, name, options = {}) {
  const workbook = (kind === 'aip' ? buildAIPWorkbook : buildInfluenceWorkbook)(entries, options);
  if (workbook.SheetNames.length) XLSX.writeFile(workbook, `${filename(name)}.xlsx`);
}
