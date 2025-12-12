/**
 * YGGDRASIL Admin Dashboard
 *
 * Monitor the health and performance of all YGGDRASIL components.
 * Uses Bifrost components for consistent styling.
 */

"use client"

import {
  IconTree,
  IconShield,
  IconRoute,
  IconBook,
  IconFlask,
  IconWorld,
  IconUsers,
  IconScale,
  IconBrain,
  IconRefresh,
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconLogin,
  IconLogout,
  IconUser
} from "@tabler/icons-react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { usePipelineHealth, useMuninMemory } from "@/lib/yggdrasil/hooks"
import { MuninGraph, MuninStats, DaemonControl } from "@/components/yggdrasil"
import { useContext } from "react"
import { BifrostContext } from "@/context/context"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { User, Session } from "@supabase/supabase-js"

// Bifrost Components
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

const componentConfig = {
  heimdall: {
    label: "HEIMDALL",
    description: "Gateway",
    icon: IconShield,
    color: "text-blue-500"
  },
  ratatosk: {
    label: "RATATOSK",
    description: "Router",
    icon: IconRoute,
    color: "text-amber-500"
  },
  mimir: {
    label: "MIMIR",
    description: "Validated Knowledge",
    icon: IconBook,
    color: "text-emerald-500"
  },
  volva: {
    label: "VOLVA",
    description: "Research",
    icon: IconFlask,
    color: "text-yellow-500"
  },
  hugin: {
    label: "HUGIN",
    description: "Web Sources",
    icon: IconWorld,
    color: "text-red-500"
  },
  thing: {
    label: "THING",
    description: "Council",
    icon: IconUsers,
    color: "text-purple-500"
  },
  odin: {
    label: "ODIN",
    description: "Maestro",
    icon: IconScale,
    color: "text-cyan-500"
  },
  munin: {
    label: "MUNIN",
    description: "Memory",
    icon: IconBrain,
    color: "text-pink-500"
  }
}

function StatusBadge({ status }: { status: string }) {
  const isHealthy = status === "ok" || status === "healthy"
  const isDegraded = status === "degraded"

  return (
    <Badge
      variant={isHealthy ? "default" : isDegraded ? "secondary" : "destructive"}
      className="gap-1"
    >
      {isHealthy ? <IconCheck size={12} /> : <IconAlertTriangle size={12} />}
      {status.toUpperCase()}
    </Badge>
  )
}

function ComponentCard({
  name,
  status
}: {
  name: keyof typeof componentConfig
  status: string
}) {
  const config = componentConfig[name]
  const Icon = config.icon

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg bg-secondary",
                config.color
              )}
            >
              <Icon size={20} />
            </div>
            <div>
              <div className="font-medium">{config.label}</div>
              <div className="text-sm text-muted-foreground">
                {config.description}
              </div>
            </div>
          </div>
          <StatusBadge status={status} />
        </div>
      </CardContent>
    </Card>
  )
}

function ComponentSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdminDashboard() {
  const { health, loading, error, refresh } = usePipelineHealth(30000)
  const [userId] = useState("admin-dashboard")
  const {
    graph: memoryGraph,
    loading: graphLoading,
    refresh: refreshGraph
  } = useMuninMemory(userId, { limit: 100 })

  // Auth state
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const handleLogin = () => {
    router.push("/login")
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
  }

  // User info for daemon control
  const user = session?.user
  const userEmail = user?.email
  const userToken = session?.access_token

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/20">
                <IconTree size={28} className="text-emerald-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">YGGDRASIL Admin</h1>
                <p className="text-sm text-muted-foreground">
                  System Health & Monitoring
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {health && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <IconClock size={14} />
                  {new Date(health.timestamp).toLocaleTimeString()}
                </div>
              )}
              <Button
                onClick={() => {
                  refresh()
                  refreshGraph()
                }}
                disabled={loading}
                size="sm"
                variant="outline"
              >
                <IconRefresh
                  size={16}
                  className={cn("mr-2", loading && "animate-spin")}
                />
                Refresh
              </Button>
              {/* Auth buttons */}
              {authLoading ? (
                <Skeleton className="h-9 w-24" />
              ) : user ? (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-1 py-1">
                    <IconUser size={14} />
                    {user.email}
                  </Badge>
                  <Button onClick={handleLogout} size="sm" variant="ghost">
                    <IconLogout size={16} className="mr-1" />
                    Logout
                  </Button>
                </div>
              ) : (
                <Button onClick={handleLogin} size="sm">
                  <IconLogin size={16} className="mr-1" />
                  Login
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-8">
        {/* Error Alert */}
        {error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-destructive">
                <IconAlertTriangle size={18} />
                <span className="font-medium">
                  Failed to connect to YGGDRASIL
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {error.message}. Make sure HEIMDALL is running on port 3000.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Overall Status Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Pipeline Status</CardTitle>
            <CardDescription>Overall system health</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge
              variant={
                health?.status === "healthy"
                  ? "default"
                  : health?.status === "degraded"
                    ? "secondary"
                    : "destructive"
              }
              className="text-base px-4 py-2"
            >
              {health?.status === "healthy" ? (
                <IconCheck size={18} className="mr-2" />
              ) : (
                <IconAlertTriangle size={18} className="mr-2" />
              )}
              {health?.status?.toUpperCase() || "UNKNOWN"}
            </Badge>
          </CardContent>
        </Card>

        {/* Components Grid */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Components</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {loading
              ? Object.keys(componentConfig).map(name => (
                  <ComponentSkeleton key={name} />
                ))
              : health
                ? Object.entries(health.components).map(([name, status]) => (
                    <ComponentCard
                      key={name}
                      name={name as keyof typeof componentConfig}
                      status={status}
                    />
                  ))
                : Object.keys(componentConfig).map(name => (
                    <ComponentCard
                      key={name}
                      name={name as keyof typeof componentConfig}
                      status="unknown"
                    />
                  ))}
          </div>
        </div>

        <Separator />

        {/* Cognitive Daemon */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Daemon Cognitif</h2>
          <DaemonControl userEmail={userEmail} userToken={userToken} />
        </div>

        <Separator />

        {/* Memory Graph */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">MUNIN Memory Graph</CardTitle>
            <CardDescription>
              Visualization of interactions, decisions, and corrections
            </CardDescription>
          </CardHeader>
          <CardContent>
            {graphLoading ? (
              <div className="h-[400px] flex items-center justify-center">
                <Skeleton className="h-full w-full rounded-lg" />
              </div>
            ) : memoryGraph ? (
              <>
                <MuninStats graph={memoryGraph} />
                <MuninGraph graph={memoryGraph} height={400} className="mt-4" />
              </>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                No memory data available. Start interacting with YGGDRASIL.
              </div>
            )}
          </CardContent>
        </Card>

        <Separator />

        {/* Seven Pillars */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Seven Pillars</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[
              { name: "Absolute Veracity", icon: IconCheck },
              { name: "Total Traceability", icon: IconRoute },
              { name: "Epistemic Separation", icon: IconBook },
              { name: "Living Memory", icon: IconBrain },
              { name: "Reversibility", icon: IconRefresh },
              { name: "Sovereignty", icon: IconShield },
              { name: "Sustainability", icon: IconTree }
            ].map((pillar, index) => (
              <Card key={pillar.name}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
                      <pillar.icon size={18} />
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        Pillar {index + 1}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {pillar.name}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
