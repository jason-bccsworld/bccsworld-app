import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useLicense } from "@/hooks/useLicense";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, Check, ChevronsUpDown, Loader2 } from "lucide-react";

interface TenantMembership {
  organizationId: string;
  orgRole: string;
  organizationName: string;
}

interface TenantSession {
  multiTenant: boolean;
  activeOrganizationId: string | null;
  isPlatformStaff: boolean;
  organizations: TenantMembership[];
}

interface OrgListItem {
  id: string;
  organizationName: string;
  isActive: boolean;
}

/**
 * Organization switcher shown in the sidebar. Renders nothing at all in
 * single-workspace mode. In multi-tenant mode it shows the active org name and
 * license plan; users with multiple memberships (and platform staff) can
 * switch the active organization.
 */
export default function OrgSwitcher() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { planLabel } = useLicense();

  const { data: tenant } = useQuery<TenantSession>({
    queryKey: ["/api/session/tenant"],
    staleTime: 30_000,
  });

  const isStaff = !!tenant?.isPlatformStaff;

  // Platform staff can enter any organization, so they pick from the full list
  const { data: allOrgs = [] } = useQuery<OrgListItem[]>({
    queryKey: ["/api/organizations"],
    enabled: !!tenant?.multiTenant && isStaff,
  });

  const switchMutation = useMutation({
    mutationFn: async (organizationId: string) => {
      const res = await apiRequest("POST", "/api/session/active-org", { organizationId });
      return res.json();
    },
    onSuccess: () => {
      // Drop every cached query so no data from the previous org lingers
      queryClient.clear();
      setLocation("/dashboard");
    },
    onError: (err: any) => {
      toast({ title: "Could not switch organization", description: err.message, variant: "destructive" });
    },
  });

  // Single-workspace mode (or not loaded yet): no multi-tenant chrome at all
  if (!tenant?.multiTenant) return null;

  const memberships = tenant.organizations ?? [];
  const options: { id: string; name: string }[] = isStaff
    ? allOrgs.filter((o) => o.isActive).map((o) => ({ id: o.id, name: o.organizationName }))
    : memberships.map((m) => ({ id: m.organizationId, name: m.organizationName }));

  const activeName =
    options.find((o) => o.id === tenant.activeOrganizationId)?.name ??
    memberships.find((m) => m.organizationId === tenant.activeOrganizationId)?.organizationName ??
    (isStaff ? "No organization selected" : "Your organization");

  const canSwitch = isStaff || memberships.length > 1;

  const content = (
    <div className="flex items-center gap-2.5 w-full min-w-0">
      <div className="p-1.5 bg-slate-700 rounded-md shrink-0">
        <Building2 size={16} className="text-blue-300" />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-medium text-white truncate">{activeName}</p>
        <p className="text-[11px] text-slate-400 truncate">
          {planLabel} plan{isStaff ? " · Staff view" : ""}
        </p>
      </div>
      {switchMutation.isPending ? (
        <Loader2 size={15} className="text-slate-400 animate-spin shrink-0" />
      ) : canSwitch ? (
        <ChevronsUpDown size={15} className="text-slate-400 shrink-0" />
      ) : null}
    </div>
  );

  if (!canSwitch) {
    return (
      <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/60">
        {content}
      </div>
    );
  }

  return (
    <div className="border-b border-slate-700 bg-slate-800/60">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="w-full px-4 py-3 hover:bg-slate-800 transition-colors focus:outline-none"
            disabled={switchMutation.isPending}
          >
            {content}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 max-h-80 overflow-y-auto">
          <DropdownMenuLabel>
            {isStaff ? "All organizations" : "Switch organization"}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {options.length === 0 && (
            <div className="px-2 py-3 text-sm text-muted-foreground text-center">No organizations found</div>
          )}
          {options.map((o) => (
            <DropdownMenuItem
              key={o.id}
              onClick={() => {
                if (o.id !== tenant.activeOrganizationId) switchMutation.mutate(o.id);
              }}
              className="cursor-pointer"
            >
              <span className="truncate flex-1">{o.name}</span>
              {o.id === tenant.activeOrganizationId && <Check className="h-4 w-4 ml-2 shrink-0" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
