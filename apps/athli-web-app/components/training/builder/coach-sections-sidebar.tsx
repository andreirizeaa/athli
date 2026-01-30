'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useTrainingData } from '@/app/training/training-data-context';
import { cn } from '@/lib/general/utils';
import type { Section } from '@/api/coach/coach-section-service';

// Draggable Section Card
const DraggableSectionCard = ({
    section,
    onDragStart,
    onDragEnd
}: {
    section: Section;
    onDragStart: (section: Section) => void;
    onDragEnd?: () => void;
}) => {
    return (
        <Card
            draggable
            onDragStart={(e) => {
                // Set drag data for native DnD
                e.dataTransfer.setData('application/json', JSON.stringify({ type: 'coach-section', section }));
                // Also call parent handler to set React state if needed
                onDragStart(section);
            }}
            onDragEnd={onDragEnd}
            className={cn(
                "cursor-grab active:cursor-grabbing hover:border-primary transition-colors select-none"
            )}
        >
            <CardContent className="p-2 flex items-center gap-2">
                <span className="font-medium text-sm truncate" title={section.program}>
                    {section.program}
                </span>
                <span className="text-xs text-muted-foreground ml-auto shrink-0">
                    {section.totalExercises} exercises
                </span>
                <Badge variant="outline" className="px-2 py-0.5 text-[10px] font-medium capitalize bg-transparent text-primary border-primary rounded-full shadow-none shrink-0">
                    {section.sectionType}
                </Badge>
            </CardContent>
        </Card>
    );
};

type CoachSectionsSidebarProps = {
    onDragStart: (section: Section) => void;
    onDragEnd?: () => void;
    onNavigateRequest?: (path: string) => void;
};

export const CoachSectionsSidebar = ({ onDragStart, onDragEnd, onNavigateRequest }: CoachSectionsSidebarProps) => {
    const { sections } = useTrainingData();
    const [searchQuery, setSearchQuery] = useState('');

    const filteredSections = sections.filter((section) =>
        section.program.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const hasNoSections = sections.length === 0;
    const hasNoFilterResults = !hasNoSections && filteredSections.length === 0;

    const handleSectionsLinkClick = (e: React.MouseEvent) => {
        if (onNavigateRequest) {
            e.preventDefault();
            onNavigateRequest('/training/sections');
        }
    };

    return (
        <div className="flex flex-col h-full min-h-0">
            <div className="flex-shrink-0">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                        placeholder="Search for sections.."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 w-full"
                    />
                </div>
                <div className="mt-3 flex items-center">
                    <span className="text-sm text-muted-foreground">
                        {sections.length} {sections.length === 1 ? 'section' : 'sections'}
                    </span>
                </div>
            </div>

            <ScrollArea className="flex-1 -mr-3 pr-3 mt-4">
                {hasNoSections ? (
                    <div className="text-center text-sm text-muted-foreground py-4">
                        Create a section{' '}
                        <Link
                            href="/training/sections"
                            onClick={handleSectionsLinkClick}
                            className="text-primary underline hover:text-primary/80"
                        >
                            here
                        </Link>
                    </div>
                ) : hasNoFilterResults ? (
                    <div className="text-center text-sm text-muted-foreground py-4">
                        No sections found
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-2 pb-2">
                        {filteredSections.map((section) => (
                            <DraggableSectionCard
                                key={section.id}
                                section={section}
                                onDragStart={onDragStart}
                                onDragEnd={onDragEnd}
                            />
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
};
