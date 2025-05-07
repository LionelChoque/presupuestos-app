import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ReportData, ReportItem } from '@/lib/types';
import { DownloadCloud, FileText, File, FileSpreadsheet } from 'lucide-react';

export default function Reports() {
  const [reportData, setReportData] = useState<ReportData>({
    type: 'summary',
    from: new Date().toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
    format: 'excel'
  });

  // Sample recent reports data
  const recentReports: ReportItem[] = [
    { title: 'Resumen General Mayo 2025', format: 'excel', date: '02/05/2025', size: '1.4 MB' },
    { title: 'Análisis por Fabricante Q1 2025', format: 'pdf', date: '15/04/2025', size: '2.8 MB' },
    { title: 'Desempeño de Presupuestos Marzo 2025', format: 'excel', date: '02/04/2025', size: '1.2 MB' },
    { title: 'Análisis por Cliente Q4 2024', format: 'csv', date: '15/01/2025', size: '948 KB' }
  ];

  const generateReport = () => {
    // In a real application, this would call an API to generate the report
    alert(`Generando reporte de tipo "${reportData.type}" en formato ${reportData.format.toUpperCase()}`);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Reportes</h1>
      
      {/* Generate Report Form */}
      <Card>
        <CardHeader className="px-5 py-4 border-b border-gray-200">
          <CardTitle className="text-lg font-medium text-gray-900">Generar Reportes</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <form className="space-y-6">
            <div>
              <Label htmlFor="report-type">Tipo de Reporte</Label>
              <Select
                value={reportData.type}
                onValueChange={(value) => setReportData({ ...reportData, type: value as ReportData['type'] })}
              >
                <SelectTrigger id="report-type" className="w-full mt-1">
                  <SelectValue placeholder="Seleccionar tipo de reporte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Resumen General</SelectItem>
                  <SelectItem value="performance">Desempeño de Presupuestos</SelectItem>
                  <SelectItem value="manufacturer">Análisis por Fabricante</SelectItem>
                  <SelectItem value="client">Análisis por Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Período</Label>
              <div className="mt-1 grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="report-date-from" className="block text-xs text-gray-500">Desde</Label>
                  <Input
                    type="date"
                    id="report-date-from"
                    value={reportData.from}
                    onChange={(e) => setReportData({ ...reportData, from: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="report-date-to" className="block text-xs text-gray-500">Hasta</Label>
                  <Input
                    type="date"
                    id="report-date-to"
                    value={reportData.to}
                    onChange={(e) => setReportData({ ...reportData, to: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="report-format">Formato de Salida</Label>
              <Select
                value={reportData.format}
                onValueChange={(value) => setReportData({ ...reportData, format: value as ReportData['format'] })}
              >
                <SelectTrigger id="report-format" className="w-full mt-1">
                  <SelectValue placeholder="Seleccionar formato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={generateReport}
                className="inline-flex items-center"
              >
                <DownloadCloud className="h-5 w-5 mr-2" />
                Generar Reporte
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      {/* Recent Reports */}
      <Card>
        <CardHeader className="px-5 py-4 border-b border-gray-200">
          <CardTitle className="text-lg font-medium text-gray-900">Reportes Recientes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-gray-200">
            {recentReports.map((report, i) => (
              <li key={i} className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`
                    flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center
                    ${report.format === 'excel' ? 'bg-green-100' : 
                    report.format === 'pdf' ? 'bg-red-100' : 'bg-blue-100'}
                  `}>
                    {report.format === 'excel' && <FileSpreadsheet className="h-4 w-4 text-green-700" />}
                    {report.format === 'pdf' && <File className="h-4 w-4 text-red-700" />}
                    {report.format === 'csv' && <FileText className="h-4 w-4 text-blue-700" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{report.title}</p>
                    <p className="text-sm text-gray-500">
                      <span>{report.date}</span> · <span>{report.size}</span>
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary hover:text-primary-900 text-sm font-medium flex items-center space-x-1"
                >
                  <DownloadCloud className="h-4 w-4 mr-1" />
                  <span>Descargar</span>
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
