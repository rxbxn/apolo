import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { ActivityTable } from "@/components/activities/activity-table"
import { ActivityForm } from "@/components/activities/activity-form"
import { getActivities } from "@/lib/actions/activities"

export const metadata = {
  title: "Actividades - APOLO",
  description: "Gestiona actividades de campaña",
}

export default async function ActivitiesPage() {
  const activities = await getActivities()

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Actividades</h1>
            <p className="text-muted-foreground">
              Gestiona las actividades y su estado de vigencia.
            </p>
          </div>
          <ActivityForm />
        </div>
        <ActivityTable activities={activities} />
      </div>
    </DashboardLayout>
  )
}
