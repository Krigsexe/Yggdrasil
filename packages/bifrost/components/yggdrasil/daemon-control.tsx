/**
 * Daemon Control Component
 *
 * UI for controlling the Cognitive Daemon.
 * Only superadmin can use control buttons.
 *
 * "Le pouvoir exige la responsabilite."
 */

"use client"

import { useState } from "react"
import {
  IconPlayerPlay,
  IconPlayerPause,
  IconPlayerStop,
  IconRefresh,
  IconBrain,
  IconCpu,
  IconDatabase,
  IconClock,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconActivity
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { useDaemon } from "@/lib/yggdrasil/hooks"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"

interface DaemonControlProps {
  userEmail?: string
  userToken?: string // Kept for future JWT auth
}

export function DaemonControl({ userEmail }: DaemonControlProps) {
  const {
    status,
    events,
    loading,
    error,
    commandLoading,
    refresh,
    executeCommand,
    isRunning,
    isPaused,
    isStopped
  } = useDaemon(10000) // Poll every 10 seconds

  const [commandError, setCommandError] = useState<string | null>(null)

  // Check if current user is superadmin
  const isSuperadmin = userEmail === status?.config?.superadminEmail

  const handleCommand = async (
    action: "start" | "stop" | "pause" | "resume"
  ) => {
    if (!userEmail) {
      setCommandError("Non authentifie - veuillez vous connecter")
      return
    }

    setCommandError(null)
    try {
      // Dev mode: pass email for authorization
      const result = await executeCommand(action, userEmail)
      if (!result.success) {
        setCommandError(result.message)
      }
    } catch (err) {
      setCommandError((err as Error).message)
    }
  }

  const formatUptime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${mins}m`
  }

  const formatTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    })
  }

  if (loading && !status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconBrain size={20} />
            Daemon Cognitif
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error && !status) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <IconAlertTriangle size={20} />
            Daemon Cognitif
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Impossible de contacter le daemon: {error.message}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Main Status Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconBrain
                size={20}
                className={cn(
                  isRunning
                    ? "text-emerald-500"
                    : isPaused
                      ? "text-amber-500"
                      : "text-muted-foreground"
                )}
              />
              <CardTitle className="text-lg">Daemon Cognitif</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  isRunning
                    ? "default"
                    : isPaused
                      ? "secondary"
                      : "destructive"
                }
                className="gap-1"
              >
                {isRunning ? (
                  <IconActivity size={12} className="animate-pulse" />
                ) : isPaused ? (
                  <IconPlayerPause size={12} />
                ) : (
                  <IconPlayerStop size={12} />
                )}
                {status?.status?.toUpperCase()}
              </Badge>
              <Button variant="ghost" size="icon" onClick={() => refresh()}>
                <IconRefresh
                  size={16}
                  className={cn(loading && "animate-spin")}
                />
              </Button>
            </div>
          </div>
          <CardDescription>
            Traitement autonome local avec {status?.ollamaModel || "Ollama"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Uptime</div>
              <div className="font-medium">
                {isRunning ? formatUptime(status?.uptime || 0) : "-"}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">
                Taches completees
              </div>
              <div className="font-medium text-emerald-500">
                {status?.tasksCompleted || 0}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Taches en queue</div>
              <div className="font-medium">{status?.tasksQueued || 0}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Taux erreur</div>
              <div
                className={cn(
                  "font-medium",
                  (status?.errorRate || 0) > 10 && "text-destructive"
                )}
              >
                {(status?.errorRate || 0).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Ollama Status */}
          <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50">
            <IconCpu size={20} className="text-muted-foreground" />
            <div className="flex-1">
              <div className="text-sm font-medium">Ollama (LLM Local)</div>
              <div className="text-xs text-muted-foreground">
                {status?.ollamaModel}
              </div>
            </div>
            <Badge
              variant={status?.ollamaAvailable ? "default" : "destructive"}
              className="gap-1"
            >
              {status?.ollamaAvailable ? (
                <IconCheck size={12} />
              ) : (
                <IconX size={12} />
              )}
              {status?.ollamaAvailable ? "Disponible" : "Indisponible"}
            </Badge>
          </div>

          {/* Memory Usage */}
          <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50">
            <IconDatabase size={20} className="text-muted-foreground" />
            <div className="flex-1">
              <div className="text-sm font-medium">Memoire utilisee</div>
            </div>
            <span className="text-sm font-medium">
              {status?.memoryUsageMb || 0} MB
            </span>
          </div>

          {/* Control Buttons (superadmin only) */}
          {isSuperadmin ? (
            <div className="flex flex-wrap gap-2 pt-2">
              {isStopped && (
                <Button
                  onClick={() => handleCommand("start")}
                  disabled={commandLoading || !status?.ollamaAvailable}
                  className="gap-2"
                >
                  <IconPlayerPlay size={16} />
                  Demarrer
                </Button>
              )}
              {isRunning && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => handleCommand("pause")}
                    disabled={commandLoading}
                    className="gap-2"
                  >
                    <IconPlayerPause size={16} />
                    Pause
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleCommand("stop")}
                    disabled={commandLoading}
                    className="gap-2"
                  >
                    <IconPlayerStop size={16} />
                    Arreter
                  </Button>
                </>
              )}
              {isPaused && (
                <>
                  <Button
                    onClick={() => handleCommand("resume")}
                    disabled={commandLoading}
                    className="gap-2"
                  >
                    <IconPlayerPlay size={16} />
                    Reprendre
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleCommand("stop")}
                    disabled={commandLoading}
                    className="gap-2"
                  >
                    <IconPlayerStop size={16} />
                    Arreter
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground pt-2">
              Seul {status?.config?.superadminEmail} peut controler le daemon.
            </div>
          )}

          {/* Command Error */}
          {commandError && (
            <div className="text-sm text-destructive flex items-center gap-2">
              <IconAlertTriangle size={14} />
              {commandError}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Events Log */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <IconClock size={16} />
            Evenements recents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-48">
            {events.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                Aucun evenement
              </div>
            ) : (
              <div className="space-y-2">
                {events
                  .slice()
                  .reverse()
                  .slice(0, 20)
                  .map(event => (
                    <div
                      key={event.id}
                      className="flex items-start gap-2 text-sm py-1 border-b last:border-0"
                    >
                      <span className="text-xs text-muted-foreground w-16 shrink-0">
                        {formatTime(event.timestamp)}
                      </span>
                      <Badge
                        variant={
                          event.type === "error" || event.type === "task_failed"
                            ? "destructive"
                            : event.type === "start" ||
                                event.type === "task_complete"
                              ? "default"
                              : "secondary"
                        }
                        className="text-xs shrink-0"
                      >
                        {event.type.replace("_", " ")}
                      </Badge>
                      <span className="text-muted-foreground truncate">
                        {event.message}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
