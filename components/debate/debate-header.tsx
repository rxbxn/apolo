import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export function DebateHeader() {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Alistamiento de Debate</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Organiza y prepara eventos, debates y reuniones</p>
      </div>
      <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 w-full sm:w-auto">
        <Plus className="w-4 h-4" />
        Nuevo Evento
      </Button>
    </div>
  )
}
