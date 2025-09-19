"use client";

import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserSection } from "@/components/user-section";
import { OrganizationProjectSwitcher } from "@/components/organization-project-switcher";
import { useOrganization } from "@/context/organization-context";
import { 
  BarChart3, 
  ChevronRight, 
  FileText, 
  Home, 
  Search, 
  Settings, 
  Upload,
  Users,
  AlertCircle,
  HelpCircle,
  User,
  Zap,
  Building2,
  FolderOpen,
  Receipt,
  CheckSquare,
  Plus,
  MessageSquare,
  BookOpen
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

function AppSidebar() {
  const pathname = usePathname();
  const { currentProject, currentOrganization } = useOrganization();

  // Determine current context based on URL and context
  const getRouteContext = () => {
    // Check if we're in a project-specific route
    if (pathname.includes('/projects/') && currentProject) {
      return {
        type: 'project',
        id: currentProject.id,
        name: currentProject.name
      };
    }
    
    
    // Check if we're in an organization-specific route
    if ((pathname.includes('/org/') || pathname.includes('/organizations/')) && currentOrganization) {
      return {
        type: 'organization', 
        id: currentOrganization.id,
        name: currentOrganization.name,
        slug: currentOrganization.slug
      };
    }
    
    return { type: 'global' };
  };

  const routeContext = getRouteContext();

  // Extract orgId from URL if we're in org routes
  const getOrgIdFromPath = () => {
    const orgMatch = pathname.match(/\/org\/([^\/]+)/);
    if (orgMatch) return orgMatch[1];
    
    const slugMatch = pathname.match(/\/organizations\/([^\/]+)/);
    if (slugMatch) return slugMatch[1];
    
    return null;
  };


  // Organization-level navigation items
  const getOrganizationNavigationItems = (orgId: string) => [
    {
      title: "Organization",
      items: [
        {
          title: "Projects",
          url: `/organizations/${orgId}`,
          icon: FolderOpen,
        },
        {
          title: "Knowledge Base",
          url: `/organizations/${orgId}/knowledge-base`,
          icon: BookOpen,
        },
        {
          title: "Team",
          url: `/organizations/${orgId}/team`,
          icon: Users,
        },
        {
          title: "Settings",
          url: `/organizations/${orgId}/settings`,
          icon: Settings,
        },
      ],
    },
  ];

  // Project-scoped navigation items  
  const getProjectNavigationItems = (projectId: string) => [
    {
      title: "Project",
      items: [
        {
          title: "Dashboard",
          url: `/projects/${projectId}`,
          icon: Home,
        },
        {
          title: "Questions",
          url: `/projects/${projectId}/questions`,
          icon: MessageSquare,
        },
        {
          title: "Documents",
          url: `/projects/${projectId}/documents`,
          icon: FileText,
        },
        {
          title: "Documents_deprecated",
          url: `/projects/${projectId}/documents-deprecated`,
          icon: FileText,
        },
      ],
    },
  ];

  // Get navigation items based on current context
  const getNavigationItems = () => {
    if (routeContext.type === 'project' && currentProject) {
      return getProjectNavigationItems(currentProject.id);
    } else if (routeContext.type === 'organization') {
      const orgId = getOrgIdFromPath();
      if (orgId) {
        return getOrganizationNavigationItems(orgId);
      }
    }
    return [];
  };

  const contextNavigationItems = getNavigationItems();

  return (
    <Sidebar variant="inset" collapsible="icon" className="border-r h-full">
      <SidebarHeader>
        <OrganizationProjectSwitcher />
      </SidebarHeader>

      <SidebarContent className="overflow-y-auto">
        <SidebarMenu>
          {/* Context-specific navigation (organization or project) */}
          {contextNavigationItems.map((group) => (
            <div key={group.title}>
              <SidebarMenuSub>
                {group.items.map((item) => (
                  <SidebarMenuSubItem key={item.title}>
                    <SidebarMenuSubButton 
                      asChild 
                      isActive={
                        pathname === item.url ||
                        (item.url.includes('?') && pathname === item.url.split('?')[0] && 
                         typeof window !== 'undefined' && window.location.search.includes(item.url.split('?')[1]))
                      }
                    >
                      <Link href={item.url}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
              <SidebarSeparator className="my-2" />
            </div>
          ))}

          
          {/* Context indicator */}
          {routeContext.type === 'global' && (
            <div className="px-4 py-2">
              <div className="text-center text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                <Building2 className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p className="font-medium mb-1">No Context Selected</p>
                <p className="text-xs">Choose an organization or project to access specific tools</p>
              </div>
            </div>
          )}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <UserSection />
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/help">
                <HelpCircle className="size-4" />
                <span>Help & Support</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

interface SidebarLayoutProps {
  children: ReactNode;
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        
        <AppSidebar />
        
        {/* Main content area with independent scrolling */}
        <SidebarInset className="flex-1 flex flex-col overflow-hidden">
          {/* Fixed header */}
          <header className="flex h-16 shrink-0 items-center border-b bg-background transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
            </div>
          </header>
          
          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </SidebarInset>
        
      </SidebarProvider>
    </TooltipProvider>
  );
} 