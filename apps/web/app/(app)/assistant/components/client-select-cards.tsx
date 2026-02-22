'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/general/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ClientSelectOption } from '@/api/ai/ai-service';

interface ClientSelectCardsProps {
  clients: ClientSelectOption[];
  onSelect: (client: { id: string; name: string }) => void;
  selectedClientId?: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function ClientSelectCards({ clients, onSelect, selectedClientId }: ClientSelectCardsProps) {
  const [selectedId, setSelectedId] = useState<string | null>(selectedClientId ?? null);

  const handleSelect = (client: ClientSelectOption) => {
    if (selectedId) return;
    setSelectedId(client.id);
    onSelect({ id: client.id, name: client.name });
  };

  return (
    <div className="space-y-2 p-px">
      <p className="text-xs font-medium text-muted-foreground">Select a client:</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {clients.map((client) => {
          const isSelected = selectedId === client.id;
          const isDisabled = selectedId !== null && !isSelected;

          return (
            <button
              key={client.id}
              onClick={() => handleSelect(client)}
              disabled={isDisabled}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-3 text-left transition-all',
                'hover:bg-accent/50 hover:border-border',
                isSelected && 'ring-1 ring-primary border-primary bg-primary/5',
                isDisabled && 'opacity-40 cursor-not-allowed hover:bg-transparent',
                !selectedId && 'cursor-pointer',
              )}
            >
              <Avatar className="size-9 shrink-0">
                {client.avatarUrl && <AvatarImage src={client.avatarUrl} alt={client.name} />}
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {getInitials(client.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{client.name}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
