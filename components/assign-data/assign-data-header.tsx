import { ExcelUpload } from "./excel-upload"

export function AssignDataHeader() {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Asignar Datos</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Gestiona la tabla persona y sincroniza con usuarios</p>
      </div>
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <ExcelUpload />
      </div>
    </div>
  )
}
