import { redirect } from "next/navigation"
import { EnvironmentDebug } from "@/components/debug/environment-debug"

export default function Home() {
  redirect("/login")
}

// Página temporal para debugging
export function DebugHome() {
  return (
    <div>
      <EnvironmentDebug />
      <div>Debug page</div>
    </div>
  )
}
