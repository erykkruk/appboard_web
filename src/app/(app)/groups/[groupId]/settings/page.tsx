"use client";

import { useParams } from "next/navigation";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useAppGroups, useUpdateAppGroup } from "@/hooks/use-app-groups";

export default function GroupSettingsPage() {
  const params = useParams<{ groupId: string }>();
  const groupId = params.groupId;
  const groups = useAppGroups();
  const updateGroup = useUpdateAppGroup();

  const group = groups.data?.find((g) => g.id === groupId);

  if (groups.isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4 p-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-36 w-full rounded-xl" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Group not found.</p>
      </div>
    );
  }

  const handleNameChange = async (name: string) => {
    if (!name.trim()) return;
    try {
      await updateGroup.mutateAsync({ groupId, data: { name: name.trim() } });
    } catch {
      toast.error("Failed to update group name");
    }
  };

  const handleIconUrlChange = async (iconUrl: string) => {
    try {
      await updateGroup.mutateAsync({
        groupId,
        data: { iconUrl: iconUrl || null },
      });
    } catch {
      toast.error("Failed to update icon URL");
    }
  };

  const handleToggleSharedProfile = async (enabled: boolean) => {
    try {
      await updateGroup.mutateAsync({
        groupId,
        data: { useSharedProfile: enabled },
      });
      toast.success(
        enabled ? "Shared ASO profile enabled" : "Shared ASO profile disabled",
      );
    } catch {
      toast.error("Failed to update setting");
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <h1 className="text-xl font-bold tracking-tight">Group Settings</h1>

      <div className="grid items-start gap-6 lg:grid-cols-2">
      {/* General settings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm">Group Name</Label>
            <Input
              defaultValue={group.name}
              onBlur={(e) => handleNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleNameChange(e.currentTarget.value);
                  e.currentTarget.blur();
                }
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Icon URL</Label>
            <Input
              defaultValue={group.iconUrl ?? ""}
              placeholder="https://example.com/icon.png"
              onBlur={(e) => handleIconUrlChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleIconUrlChange(e.currentTarget.value);
                  e.currentTarget.blur();
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Shared ASO Profile toggle */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            ASO Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">
                Use shared ASO profile
              </Label>
              <p className="text-xs text-muted-foreground">
                When enabled, all apps in this group share a single ASO profile.
                Individual app profiles become read-only.
              </p>
            </div>
            <Switch
              checked={group.useSharedProfile}
              onCheckedChange={handleToggleSharedProfile}
              disabled={updateGroup.isPending}
            />
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
