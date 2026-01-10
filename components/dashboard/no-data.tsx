import { Card, CardContent } from "@/components/ui/card"
import { FileQuestion } from "lucide-react"

interface NoDataProps {
  message: string
}

export function NoData({ message }: NoDataProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-12 text-center">
        <FileQuestion className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
        <p className="text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  )
}
