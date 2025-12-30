import React, { memo } from 'react';
import { useTranslations } from 'next-intl';
import { Checkbox } from '@/components/ui/checkbox';
import { Copy, User, Star } from 'lucide-react';
import type { Program } from '@/components/app/app-shell';

interface ProgramNameCellProps {
    program: Program;
    isSelected: boolean;
    isStarred: boolean;
    onToggleProgram: (programId: string) => void;
    onAssign: (program: Program) => void;
    onToggleStar: (programId: string, e: React.MouseEvent | React.KeyboardEvent) => void;
    onStarKeyDown: (programId: string, e: React.KeyboardEvent) => void;
}

export const ProgramNameCell = memo(function ProgramNameCell({
    program,
    isSelected,
    isStarred,
    onToggleProgram,
    onAssign,
    onToggleStar,
    onStarKeyDown,
}: ProgramNameCellProps) {
    const t = useTranslations();

    return (
        <div className="flex items-center gap-3 h-full w-full">
            <div className="flex items-center justify-center h-full" data-no-row-link="true">
                <Checkbox checked={isSelected} onCheckedChange={() => onToggleProgram(program.id)} />
            </div>
            <span className="text-sm truncate flex-1 min-w-0">{program.program}</span>
            <div className="flex items-center justify-end flex-shrink-0 gap-1" data-no-row-link="true">
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onAssign(program);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            onAssign(program);
                        }
                    }}
                    className="p-1 rounded text-foreground hover:text-primary hover:bg-accent transition-colors"
                    aria-label={t('programs.actions.assignProgramToClient')}
                    title={t('programs.actions.assignProgramToClient')}
                >
                    <User className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    onClick={(e) => onToggleStar(program.id, e)}
                    onKeyDown={(e) => onStarKeyDown(program.id, e)}
                    className="p-1 rounded text-foreground hover:text-primary hover:bg-accent transition-colors"
                    aria-label={t('programs.actions.starProgram')}
                    title={t('programs.actions.starProgram')}
                >
                    {isStarred ? (
                        <Star className="h-4 w-4 fill-primary text-primary" />
                    ) : (
                        <Star className="h-4 w-4" />
                    )}
                </button>
            </div>
        </div>
    );
});
