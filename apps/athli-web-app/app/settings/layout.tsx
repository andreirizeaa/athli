'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/general/utils';
import { User, Building2, Search, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { UnsavedChangesProvider, useUnsavedChanges } from './context/unsaved-changes-context';
import { DiscardChangesDialog } from './components/discard-changes-dialog';

interface SectionConfig {
  id: string;
  href: string;
  subSections?: SectionConfig[];
}

interface GroupConfig {
  id: 'personal' | 'appSettings' | 'business';
  icon: React.ComponentType<{ className?: string }>;
  sections: SectionConfig[];
}

type SettingsLayoutProps = {
  children: React.ReactNode;
};

const SettingsLayoutContent = ({ children }: SettingsLayoutProps) => {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const { hasUnsavedChanges, setHasUnsavedChanges } = useUnsavedChanges();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateSidebarHeight = () => {
      if (contentRef.current && sidebarRef.current) {
        const contentHeight = contentRef.current.scrollHeight;
        sidebarRef.current.style.minHeight = `${contentHeight}px`;
      }
    };

    updateSidebarHeight();
    const resizeObserver = new ResizeObserver(updateSidebarHeight);
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [children]);

  const groups: GroupConfig[] = [
    {
      id: 'personal',
      icon: User,
      sections: [
        {
          id: 'account',
          href: '/settings/account/profile',
          subSections: [
            { id: 'accountProfile', href: '/settings/account/profile' },
            { id: 'accountSecurity', href: '/settings/account/security' },
            { id: 'accountInformation', href: '/settings/account/information' },
            { id: 'accountDanger', href: '/settings/account/danger' },
          ],
        },
        { id: 'notifications', href: '/settings/profile/notifications' },
      ],
    },
    {
      id: 'appSettings',
      icon: Settings,
      sections: [
        { id: 'customisations', href: '/settings/app/customisations' },
      ],
    },
    {
      id: 'business',
      icon: Building2,
      sections: [
        {
          id: 'company',
          href: '/settings/business/company/information',
          subSections: [
            { id: 'companyInformation', href: '/settings/business/company/information' },
            { id: 'companyBranding', href: '/settings/business/company/branding' },
            { id: 'companyTeam', href: '/settings/business/company/team' },
          ],
        },
        { id: 'billing', href: '/settings/business/billing' },
      ],
    },
  ];

  const toggleExpand = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const handleExpandKeyDown = (event: React.KeyboardEvent, sectionId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleExpand(sectionId);
    }
  };

  // Filter groups and sections based on search query
  const filteredGroups = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const sectionsToExpand = new Set<string>();
    
    if (!query) {
      return { groups, sectionsToExpand };
    }

    const filtered = groups
      .map((group) => {
        const matchingSections: SectionConfig[] = [];
        
        group.sections.forEach((section) => {
          const sectionName = t(`settings.sections.${section.id}`).toLowerCase();
          const matchesMain = sectionName.includes(query);
          
          if (section.subSections) {
            const matchingSubSections = section.subSections.filter((subSection) => {
              const subSectionName = t(`settings.sections.${subSection.id}`).toLowerCase();
              return subSectionName.includes(query);
            });
            
            if (matchesMain || matchingSubSections.length > 0) {
              if (matchingSubSections.length > 0) {
                sectionsToExpand.add(section.id);
              }
              matchingSections.push({
                ...section,
                subSections: matchesMain ? section.subSections : matchingSubSections,
              });
            }
          } else if (matchesMain) {
            matchingSections.push(section);
          }
        });

        if (matchingSections.length > 0) {
          return {
            ...group,
            sections: matchingSections,
          };
        }
        return null;
      })
      .filter((group): group is GroupConfig => group !== null);
    
    return { groups: filtered, sectionsToExpand };
  }, [searchQuery, groups, t]);

  // Check if a path is active
  const isPathActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  // Check if company section should be expanded based on pathname
  const isCompanyPath = pathname.startsWith('/settings/business/company');
  // Check if account section should be expanded based on pathname
  const isAccountPath = pathname.startsWith('/settings/account');

  // Update expanded sections when search results change or when on company/account path
  const effectiveExpandedSections = useMemo(() => {
    const base = new Set(expandedSections);
    if (searchQuery.trim()) {
      filteredGroups.sectionsToExpand.forEach((id) => base.add(id));
    }
    if (isCompanyPath) {
      base.add('company');
    }
    if (isAccountPath) {
      base.add('account');
    }
    return base;
  }, [searchQuery, expandedSections, filteredGroups.sectionsToExpand, isCompanyPath, isAccountPath]);

  const shouldExpandCompany = effectiveExpandedSections.has('company');
  const shouldExpandAccount = effectiveExpandedSections.has('account');

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (hasUnsavedChanges && pathname !== href) {
      e.preventDefault();
      setPendingNavigation(href);
      setIsDiscardDialogOpen(true);
    }
  };

  const handleConfirmDiscard = () => {
    setIsDiscardDialogOpen(false);
    setHasUnsavedChanges(false);
    if (pendingNavigation) {
      router.push(pendingNavigation);
      setPendingNavigation(null);
    }
  };

  const handleCancelDiscard = () => {
    setIsDiscardDialogOpen(false);
    setPendingNavigation(null);
  };

  return (
    <div className="h-full w-full flex flex-col">
      {/* Two Column Layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar - 1/7 width */}
        <div ref={sidebarRef} className="w-[14.285714%] flex flex-col border-r bg-background">
          <div className="flex flex-col py-2">
            {/* Search Bar */}
            <div className="px-2 mb-2">
              <div className="relative flex items-center">
                <Search className="absolute left-2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                <Input
                  type="search"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>
            {filteredGroups.groups.map((group, groupIndex) => {
              const GroupIcon = group.icon;
              return (
                <div key={group.id} className={cn('flex flex-col', groupIndex > 0 && 'mt-4')}>
                  {/* Group Title */}
                  <div className="text-foreground/70 flex h-8 shrink-0 items-center px-4 text-xs font-medium">
                    <GroupIcon className="size-4 shrink-0 mr-2" />
                    <span>{t(`settings.groups.${group.id}`)}</span>
                  </div>
                  {/* Group Sections */}
                  <div className="flex flex-col gap-0.5 px-2">
                    {group.sections.map((section) => {
                      const isActive = section.subSections
                        ? section.subSections.some((sub) => isPathActive(sub.href))
                        : isPathActive(section.href);
                      const isExpanded = section.id === 'company' 
                        ? shouldExpandCompany 
                        : section.id === 'account'
                        ? shouldExpandAccount
                        : effectiveExpandedSections.has(section.id);
                      const hasSubSections = section.subSections && section.subSections.length > 0;
                      
                      if (hasSubSections) {
                        return (
                          <div key={section.id} className="flex flex-col">
                            <button
                              type="button"
                              onClick={() => toggleExpand(section.id)}
                              onKeyDown={(e) => handleExpandKeyDown(e, section.id)}
                              className={cn(
                                'w-full text-left rounded-md p-2 h-8 text-xs transition-colors font-semibold flex items-center justify-between',
                                'hover:bg-accent hover:text-accent-foreground',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                !isActive && 'text-foreground'
                              )}
                              aria-label={t(`settings.sections.${section.id}`)}
                              aria-expanded={isExpanded}
                            >
                              <span>{t(`settings.sections.${section.id}`)}</span>
                              {isExpanded ? (
                                <ChevronUp className="size-4 shrink-0" />
                              ) : (
                                <ChevronDown className="size-4 shrink-0" />
                              )}
                            </button>
                            {isExpanded && (
                              <div className="flex flex-col gap-0.5 pl-4 relative mt-1">
                                <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
                                {section.subSections?.map((subSection) => {
                                  const isSubActive = isPathActive(subSection.href);
                                  return (
                                    <Link
                                      key={subSection.id}
                                      href={subSection.href}
                                      onClick={(e) => handleLinkClick(e, subSection.href)}
                                      className={cn(
                                        'w-full text-left rounded-md p-2 h-8 text-xs transition-colors font-semibold',
                                        'hover:bg-accent hover:text-accent-foreground',
                                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                        'data-[active=true]:bg-accent data-[active=true]:text-accent-foreground',
                                        isSubActive && 'bg-accent text-accent-foreground',
                                        !isSubActive && 'text-foreground'
                                      )}
                                      data-active={isSubActive}
                                      aria-label={t(`settings.sections.${subSection.id}`)}
                                      aria-current={isSubActive ? 'page' : undefined}
                                    >
                                      {t(`settings.sections.${subSection.id}`)}
                                    </Link>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      }
                      
                      return (
                        <Link
                          key={section.id}
                          href={section.href}
                          onClick={(e) => handleLinkClick(e, section.href)}
                          className={cn(
                            'w-full text-left rounded-md p-2 h-8 text-xs transition-colors font-semibold',
                            'hover:bg-accent hover:text-accent-foreground',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            'data-[active=true]:bg-accent data-[active=true]:text-accent-foreground',
                            isActive && 'bg-accent text-accent-foreground',
                            !isActive && 'text-foreground'
                          )}
                          data-active={isActive}
                          aria-label={t(`settings.sections.${section.id}`)}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          {t(`settings.sections.${section.id}`)}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Content - 6/7 width */}
        <div ref={contentRef} className="flex-1 flex flex-col">
          {children}
        </div>
      </div>
      <DiscardChangesDialog
        open={isDiscardDialogOpen}
        onCancel={handleCancelDiscard}
        onConfirm={handleConfirmDiscard}
      />
    </div>
  );
};

const SettingsLayout = ({ children }: SettingsLayoutProps) => {
  // UnsavedChangesProvider is now in AppShell, so we just render the content
  return <SettingsLayoutContent>{children}</SettingsLayoutContent>;
};

export default SettingsLayout;

